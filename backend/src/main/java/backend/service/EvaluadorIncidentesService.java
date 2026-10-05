package backend.service;

import backend.model.Empleado;
import backend.model.EmpleadoFichaje;
import backend.model.EmpleadoHorario;
import backend.model.IncidenteAsistencia;
import backend.repositories.EmpleadoFichajeRepository;
import backend.repositories.EmpleadoHorarioRepository;
import backend.repositories.EmpleadoRepository;
import backend.repositories.IncidenteAsistenciaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EvaluadorIncidentesService {

    private static final Logger log = LoggerFactory.getLogger(EvaluadorIncidentesService.class);

    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoHorarioRepository horarioRepo;
    private final EmpleadoFichajeRepository fichajeRepo;
    private final IncidenteAsistenciaRepository incidenteRepo;

    public EvaluadorIncidentesService(
            EmpleadoRepository empleadoRepo,
            EmpleadoHorarioRepository horarioRepo,
            EmpleadoFichajeRepository fichajeRepo,
            IncidenteAsistenciaRepository incidenteRepo) {
        this.empleadoRepo = empleadoRepo;
        this.horarioRepo = horarioRepo;
        this.fichajeRepo = fichajeRepo;
        this.incidenteRepo = incidenteRepo;
    }

    /**
     * Evalúa y genera incidentes para una fecha concreta.
     */
    @Transactional
    public void evaluarFecha(LocalDate fecha) {
        int diaSemana = fecha.getDayOfWeek().getValue(); // 1 = Lunes, ..., 7 = Domingo

        List<EmpleadoHorario> horariosDelDia = horarioRepo.findAll().stream()
                .filter(h -> h.getActivo() != null && h.getActivo())
                .filter(h -> h.getDiaSemana() != null && h.getDiaSemana() == diaSemana)
                .filter(h -> h.getEmpleado() != null && h.getEmpleado().getActivo() != null && h.getEmpleado().getActivo())
                .toList();

        if (horariosDelDia.isEmpty()) {
            return;
        }

        // Agrupar horarios por empleado
        Map<Empleado, List<EmpleadoHorario>> horariosPorEmpleado = horariosDelDia.stream()
                .collect(Collectors.groupingBy(EmpleadoHorario::getEmpleado));

        LocalDateTime inicioDia = fecha.atStartOfDay();
        LocalDateTime finDia = fecha.atTime(LocalTime.MAX);

        List<IncidenteAsistencia> incidentesAGuardar = new ArrayList<>();

        for (Map.Entry<Empleado, List<EmpleadoHorario>> entry : horariosPorEmpleado.entrySet()) {
            Empleado empleado = entry.getKey();
            List<EmpleadoHorario> franjas = entry.getValue();

            // Obtener todos los fichajes válidos del empleado en esa fecha ordenados por hora
            List<EmpleadoFichaje> fichajes = fichajeRepo.findAll().stream()
                    .filter(f -> f.getEmpleado() != null && f.getEmpleado().getId().equals(empleado.getId()))
                    .filter(f -> f.getActivo() != null && f.getActivo())
                    .filter(f -> "valido".equalsIgnoreCase(f.getEstadoFichaje()))
                    .filter(f -> f.getHoraFichaje() != null &&
                            !f.getHoraFichaje().isBefore(inicioDia) &&
                            !f.getHoraFichaje().isAfter(finDia))
                    .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                    .toList();

            // REGLA 1: Ausencia sin Registro (RF13)
            if (fichajes.isEmpty()) {
                if (!existeIncidente(fecha, empleado.getId(), "AUSENCIAS")) {
                    IncidenteAsistencia inc = new IncidenteAsistencia();
                    inc.setFecha(fecha);
                    inc.setHora(LocalTime.MIDNIGHT);
                    inc.setEmpleado(empleado);
                    inc.setSeveridad("ALTA");
                    inc.setCategoriaRegla("AUSENCIAS");
                    inc.setTipo("Sin registro de ingreso para la jornada obligatoria");
                    inc.setDetalle("El empleado no registró ninguna marcación durante su día asignado.");
                    inc.setEstado("PENDIENTE");
                    incidentesAGuardar.add(inc);
                }
                continue; // No puede tener tardanza, retiro anticipado ni salidas intermedias si no asistió
            }

            // Primer ingreso y último egreso del día
            EmpleadoFichaje primerIngreso = fichajes.stream()
                    .filter(f -> "checkIn".equalsIgnoreCase(f.getTipoEvento()) || "overtimeIn".equalsIgnoreCase(f.getTipoEvento()))
                    .findFirst()
                    .orElse(null);

            EmpleadoFichaje ultimoEgreso = fichajes.stream()
                    .filter(f -> "checkOut".equalsIgnoreCase(f.getTipoEvento()) || "overtimeOut".equalsIgnoreCase(f.getTipoEvento()))
                    .reduce((first, second) -> second)
                    .orElse(null);

            for (EmpleadoHorario franja : franjas) {
                LocalTime entradaEsperada = franja.getHoraEntrada();
                LocalTime salidaEsperada = franja.getHoraSalida();
                int tolIngreso = franja.getToleranciaIngresoMin() != null ? franja.getToleranciaIngresoMin() : 15;
                int tolEgreso = franja.getToleranciaEgresoMin() != null ? franja.getToleranciaEgresoMin() : 10;

                // REGLA 2: Llegada Tarde (RF10)
                if (primerIngreso != null && entradaEsperada != null) {
                    LocalTime horaIngresoReal = primerIngreso.getHoraFichaje().toLocalTime();
                    LocalTime limiteTolerancia = entradaEsperada.plusMinutes(tolIngreso);

                    if (horaIngresoReal.isAfter(limiteTolerancia)) {
                        long minutosTarde = Duration.between(entradaEsperada, horaIngresoReal).toMinutes();
                        if (!existeIncidente(fecha, empleado.getId(), "LLEGADAS_TARDE")) {
                            IncidenteAsistencia inc = new IncidenteAsistencia();
                            inc.setFecha(fecha);
                            inc.setHora(horaIngresoReal);
                            inc.setEmpleado(empleado);
                            inc.setSeveridad(minutosTarde > 30 ? "ALTA" : "MEDIA");
                            inc.setCategoriaRegla("LLEGADAS_TARDE");
                            inc.setTipo(String.format("Llegada tarde (+%d min) a las %s hs", minutosTarde, horaIngresoReal.toString().substring(0, 5)));
                            inc.setDetalle(String.format("Horario pautado: %s hs (tolerancia: %d min). Ingresó a las %s hs.",
                                    entradaEsperada.toString().substring(0, 5), tolIngreso, horaIngresoReal.toString().substring(0, 5)));
                            inc.setEstado("PENDIENTE");
                            incidentesAGuardar.add(inc);
                        }
                    }
                }

                // REGLA 3: Retiro Previo / Anticipado (RF10)
                if (ultimoEgreso != null && salidaEsperada != null) {
                    LocalTime horaEgresoReal = ultimoEgreso.getHoraFichaje().toLocalTime();
                    LocalTime limiteSalida = salidaEsperada.minusMinutes(tolEgreso);

                    if (horaEgresoReal.isBefore(limiteSalida)) {
                        long minutosAntes = Duration.between(horaEgresoReal, salidaEsperada).toMinutes();
                        if (!existeIncidente(fecha, empleado.getId(), "RETIROS_PREVIOS")) {
                            IncidenteAsistencia inc = new IncidenteAsistencia();
                            inc.setFecha(fecha);
                            inc.setHora(horaEgresoReal);
                            inc.setEmpleado(empleado);
                            inc.setSeveridad("ALTA");
                            inc.setCategoriaRegla("RETIROS_PREVIOS");
                            inc.setTipo(String.format("Retiro anticipado (-%d min) a las %s hs", minutosAntes, horaEgresoReal.toString().substring(0, 5)));
                            inc.setDetalle(String.format("Salida pautada: %s hs. Fichó egreso anticipado a las %s hs.",
                                    salidaEsperada.toString().substring(0, 5), horaEgresoReal.toString().substring(0, 5)));
                            inc.setEstado("PENDIENTE");
                            incidentesAGuardar.add(inc);
                        }
                    }
                }

                // REGLA 4: Salida durante horario de clase / cátedra (RF09 - CRÍTICA DOCENTE)
                if (franja.getMateria() != null) {
                    for (EmpleadoFichaje f : fichajes) {
                        if ("checkOut".equalsIgnoreCase(f.getTipoEvento()) || "breakOut".equalsIgnoreCase(f.getTipoEvento())) {
                            LocalTime horaFicha = f.getHoraFichaje().toLocalTime();
                            if (horaFicha.isAfter(entradaEsperada) && horaFicha.isBefore(salidaEsperada.minusMinutes(tolEgreso))) {
                                if (!existeIncidente(fecha, empleado.getId(), "SALIDAS_EN_CLASE")) {
                                    IncidenteAsistencia inc = new IncidenteAsistencia();
                                    inc.setFecha(fecha);
                                    inc.setHora(horaFicha);
                                    inc.setEmpleado(empleado);
                                    inc.setSeveridad("CRÍTICA");
                                    inc.setCategoriaRegla("SALIDAS_EN_CLASE");
                                    inc.setTipo("Salida no autorizada durante dictado");
                                    inc.setDetalle(String.format("Docente registró salida a las %s hs durante el dictado de %s (%s a %s hs).",
                                            horaFicha.toString().substring(0, 5),
                                            franja.getMateria().getNombre(),
                                            entradaEsperada.toString().substring(0, 5),
                                            salidaEsperada.toString().substring(0, 5)));
                                    inc.setEstado("PENDIENTE");
                                    incidentesAGuardar.add(inc);
                                }
                            }
                        }
                    }
                }
            }

            // REGLA 5: Marcas Abiertas (Ingresó pero nunca registró egreso)
            if (primerIngreso != null && ultimoEgreso == null) {
                if (!existeIncidente(fecha, empleado.getId(), "MARCAS_ABIERTAS")) {
                    LocalTime horaIngreso = primerIngreso.getHoraFichaje().toLocalTime();
                    IncidenteAsistencia inc = new IncidenteAsistencia();
                    inc.setFecha(fecha);
                    inc.setHora(horaIngreso);
                    inc.setEmpleado(empleado);
                    inc.setSeveridad("MEDIA");
                    inc.setCategoriaRegla("MARCAS_ABIERTAS");
                    inc.setTipo("Fichada abierta: falta registro de egreso al finalizar turno");
                    inc.setDetalle(String.format("El empleado registró ingreso a las %s hs pero no fichó egreso al finalizar su jornada.",
                            horaIngreso.toString().substring(0, 5)));
                    inc.setEstado("PENDIENTE");
                    incidentesAGuardar.add(inc);
                }
            }

            // REGLA 6: Exceso de Salidas Intermedias y Tiempo Fuera (RF11)
            int maxSalidasPermitidas = empleado.getMaxSalidasIntermedias() != null ? empleado.getMaxSalidasIntermedias() : 2;
            int maxMinutosFueraPermitidos = empleado.getTiempoMaxFueraMin() != null ? empleado.getTiempoMaxFueraMin() : 45;

            int conteoSalidasIntermedias = 0;
            long minutosTotalesFuera = 0;

            for (int i = 0; i < fichajes.size() - 1; i++) {
                EmpleadoFichaje actual = fichajes.get(i);
                EmpleadoFichaje siguiente = fichajes.get(i + 1);

                boolean esSalida = "checkOut".equalsIgnoreCase(actual.getTipoEvento()) || 
                                   "breakOut".equalsIgnoreCase(actual.getTipoEvento()) ||
                                   "overtimeOut".equalsIgnoreCase(actual.getTipoEvento());
                                   
                boolean esReingreso = "checkIn".equalsIgnoreCase(siguiente.getTipoEvento()) || 
                                      "breakIn".equalsIgnoreCase(siguiente.getTipoEvento()) ||
                                      "overtimeIn".equalsIgnoreCase(siguiente.getTipoEvento());

                // Detecta una salida intermedia seguida de su reingreso
                if (esSalida && esReingreso) {
                    conteoSalidasIntermedias++;
                    long lapso = Duration.between(actual.getHoraFichaje(), siguiente.getHoraFichaje()).toMinutes();
                    if (lapso > 0) {
                        minutosTotalesFuera += lapso;
                    }
                }
            }

            if (conteoSalidasIntermedias > maxSalidasPermitidas || minutosTotalesFuera > maxMinutosFueraPermitidos) {
                if (!existeIncidente(fecha, empleado.getId(), "SALIDAS_EXCESIVAS")) {
                    LocalTime horaUltimoEvento = fichajes.get(fichajes.size() - 1).getHoraFichaje().toLocalTime();
                    IncidenteAsistencia inc = new IncidenteAsistencia();
                    inc.setFecha(fecha);
                    inc.setHora(horaUltimoEvento);
                    inc.setEmpleado(empleado);
                    inc.setSeveridad("ALTA");
                    inc.setCategoriaRegla("SALIDAS_EXCESIVAS");
                    inc.setTipo("Exceso de salidas intermedias (fuera de tolerancia)");
                    inc.setDetalle(String.format(
                            "Registró %d salidas intermedias (límite: %d) con un acumulado de %d min fuera del establecimiento (máx. permitido: %d min).",
                            conteoSalidasIntermedias, maxSalidasPermitidas, minutosTotalesFuera, maxMinutosFueraPermitidos
                    ));
                    inc.setEstado("PENDIENTE");
                    incidentesAGuardar.add(inc);
                }
            }
        }

        if (!incidentesAGuardar.isEmpty()) {
            incidenteRepo.saveAll(incidentesAGuardar);
            log.info(">>> Auditoría finalizada para {}: {} nuevos incidentes registrados.", fecha, incidentesAGuardar.size());
        }
    }

    /**
     * Valida de manera directa si ya existe un incidente registrado para ese día, empleado y categoría.
     */
    private boolean existeIncidente(LocalDate fecha, Long idEmpleado, String categoria) {
        return incidenteRepo.existeIncidentePorFechaEmpleadoYCategoria(fecha, idEmpleado, categoria);
    }
}