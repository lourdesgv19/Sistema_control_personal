package backend.service;

import backend.dto.ResumenPresenciaFichajesDTO;
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
    private final HorarioService horarioService;
    

    public EvaluadorIncidentesService(
            EmpleadoRepository empleadoRepo,
            EmpleadoHorarioRepository horarioRepo,
            EmpleadoFichajeRepository fichajeRepo,
            IncidenteAsistenciaRepository incidenteRepo,
            HorarioService horarioService) {
        this.empleadoRepo = empleadoRepo;
        this.horarioRepo = horarioRepo;
        this.fichajeRepo = fichajeRepo;
        this.incidenteRepo = incidenteRepo;
        this.horarioService = horarioService;
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 55 23 * * *")
    @Transactional
    public void cierreDiarioAutomatico() {
        evaluarFecha(LocalDate.now());
    }

    @Transactional
    public void evaluarFecha(LocalDate fecha) {
        int diaSemana = fecha.getDayOfWeek().getValue();

        List<EmpleadoHorario> horariosDelDia = horarioRepo.findAll().stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .filter(h -> h.getDiaSemana() != null && h.getDiaSemana() == diaSemana)
                .filter(h -> h.getEmpleado() != null && Boolean.TRUE.equals(h.getEmpleado().getActivo()))
                .toList();

        if (horariosDelDia.isEmpty()) return;

        Map<Empleado, List<EmpleadoHorario>> horariosPorEmpleado = horariosDelDia.stream()
                .collect(Collectors.groupingBy(EmpleadoHorario::getEmpleado));

        LocalDateTime inicioDia = fecha.atStartOfDay();
        LocalDateTime finDia = fecha.atTime(LocalTime.MAX);

        List<IncidenteAsistencia> incidentesAGuardar = new ArrayList<>();

        for (Map.Entry<Empleado, List<EmpleadoHorario>> entry : horariosPorEmpleado.entrySet()) {
            Empleado empleado = entry.getKey();
            List<EmpleadoHorario> franjas = entry.getValue();

            List<EmpleadoFichaje> fichajes = fichajeRepo.findAll().stream()
                    .filter(f -> f.getEmpleado() != null && f.getEmpleado().getId().equals(empleado.getId()))
                    .filter(f -> Boolean.TRUE.equals(f.getActivo()))
                    .filter(f -> "valido".equalsIgnoreCase(f.getEstadoFichaje()))
                    .filter(f -> f.getHoraFichaje() != null &&
                            !f.getHoraFichaje().isBefore(inicioDia) &&
                            !f.getHoraFichaje().isAfter(finDia))
                    .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                    .toList();

            // REGLA 1: Ausencia en Jornada Programada -> CRÍTICA
            if (fichajes.isEmpty()) {
                if (!existeIncidente(fecha, empleado.getId(), "AUSENCIAS")) {
                    IncidenteAsistencia inc = new IncidenteAsistencia();
                    inc.setFecha(fecha);
                    inc.setHora(LocalTime.MIDNIGHT);
                    inc.setEmpleado(empleado);
                    inc.setSeveridad("CRÍTICA");
                    inc.setCategoriaRegla("AUSENCIAS");
                    inc.setTipo("Inasistencia injustificada en jornada obligatoria");
                    inc.setDetalle("El empleado no registró ninguna marcación durante su día asignado.");
                    inc.setEstado("PENDIENTE");
                    inc.setIdEventoAgrupador("AUSENCIA_" + fecha + "_" + empleado.getId());
                    incidentesAGuardar.add(inc);
                }
                continue;
            }

            EmpleadoFichaje primerIngreso = fichajes.stream()
                    .filter(f -> esTipoIngreso(f.getTipoEvento()))
                    .findFirst()
                    .orElse(null);

            EmpleadoFichaje ultimoEgreso = fichajes.stream()
                    .filter(f -> esTipoSalida(f.getTipoEvento()))
                    .reduce((first, second) -> second)
                    .orElse(null);

            // Mapeo de salidas intermedias para verificar duraciones y asociar eventos comunes
            Map<LocalTime, Long> duracionPorHoraSalida = new HashMap<>();
            for (int i = 0; i < fichajes.size() - 1; i++) {
                EmpleadoFichaje act = fichajes.get(i);
                EmpleadoFichaje sig = fichajes.get(i + 1);
                if (esTipoSalida(act.getTipoEvento()) && esTipoIngreso(sig.getTipoEvento())) {
                    long dur = Duration.between(act.getHoraFichaje(), sig.getHoraFichaje()).toMinutes();
                    duracionPorHoraSalida.put(act.getHoraFichaje().toLocalTime(), dur);
                }
            }

            for (EmpleadoHorario franja : franjas) {
                LocalTime entradaEsperada = franja.getHoraEntrada();
                LocalTime salidaEsperada = franja.getHoraSalida();
                int tolIngreso = franja.getToleranciaIngresoMin() != null ? franja.getToleranciaIngresoMin() : 15;
                int tolEgreso = franja.getToleranciaEgresoMin() != null ? franja.getToleranciaEgresoMin() : 10;

                // REGLA 2: Llegada Tarde
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
                            inc.setTipo(String.format("Llegada tarde (+%d min)", minutosTarde));
                            inc.setDetalle(String.format("Horario pautado: %s hs (tolerancia: %d min). Ingresó a las %s hs.",
                                    entradaEsperada.toString().substring(0, 5), tolIngreso, horaIngresoReal.toString().substring(0, 5)));
                            inc.setEstado("PENDIENTE");
                            inc.setIdEventoAgrupador("TARDE_" + fecha + "_" + empleado.getId());
                            incidentesAGuardar.add(inc);
                        }
                    }
                }

                // REGLA 3: Retiro Anticipado
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
                            inc.setTipo(String.format("Retiro anticipado (-%d min)", minutosAntes));
                            inc.setDetalle(String.format("Salida pautada: %s hs. Fichó egreso a las %s hs.",
                                    salidaEsperada.toString().substring(0, 5), horaEgresoReal.toString().substring(0, 5)));
                            inc.setEstado("PENDIENTE");
                            inc.setIdEventoAgrupador("RETIRO_" + fecha + "_" + empleado.getId());
                            incidentesAGuardar.add(inc);
                        }
                    }
                }

                // REGLA 4: Salida durante clase (Docentes)
                if (franja.getMateria() != null) {
                    for (Map.Entry<LocalTime, Long> salidaInterm : duracionPorHoraSalida.entrySet()) {
                        LocalTime horaSalida = salidaInterm.getKey();
                        long duracionMinutos = salidaInterm.getValue();

                        if (horaSalida.isAfter(entradaEsperada) && horaSalida.isBefore(salidaEsperada.minusMinutes(tolEgreso))) {
                            String grupoUnico = "SALIDA_CLASE_" + fecha + "_" + horaSalida.toString().substring(0, 5) + "_" + empleado.getId();

                            if (!existeIncidente(fecha, empleado.getId(), "SALIDAS_EN_CLASE")) {
                                IncidenteAsistencia inc = new IncidenteAsistencia();
                                inc.setFecha(fecha);
                                inc.setHora(horaSalida);
                                inc.setEmpleado(empleado);
                                inc.setSeveridad("CRÍTICA");
                                inc.setCategoriaRegla("SALIDAS_EN_CLASE");
                                inc.setTipo(String.format("Salida no autorizada en clase (%d min fuera)", duracionMinutos));
                                inc.setDetalle(String.format("Docente salió a las %s hs durante dictado de %s (%s a %s hs), acumulando %d min fuera.",
                                        horaSalida.toString().substring(0, 5), franja.getMateria().getNombre(),
                                        entradaEsperada.toString().substring(0, 5), salidaEsperada.toString().substring(0, 5), duracionMinutos));
                                inc.setEstado("PENDIENTE");
                                inc.setIdEventoAgrupador(grupoUnico);
                                incidentesAGuardar.add(inc);
                            }

                            // Si también excedió el tiempo máximo reglamentario, se registra el incidente complementario
                            // pero COMPARTIENDO EL MISMO ID DE GRUPO para que cuente como 1 solo desvío en métricas.
                            int maxTiempoFuera = empleado.getTiempoMaxFueraMin() != null ? empleado.getTiempoMaxFueraMin() : 45;
                            if (duracionMinutos > maxTiempoFuera && !existeIncidente(fecha, empleado.getId(), "SALIDAS_EXCESIVAS")) {
                                IncidenteAsistencia incExceso = new IncidenteAsistencia();
                                incExceso.setFecha(fecha);
                                incExceso.setHora(horaSalida);
                                incExceso.setEmpleado(empleado);
                                incExceso.setSeveridad("ALTA");
                                incExceso.setCategoriaRegla("SALIDAS_EXCESIVAS");
                                incExceso.setTipo(String.format("Exceso de tiempo fuera permitido (%d min)", duracionMinutos));
                                incExceso.setDetalle(String.format("La salida intermedia de las %s hs alcanzó %d min (tolerancia máxima reglamentaria: %d min).",
                                        horaSalida.toString().substring(0, 5), duracionMinutos, maxTiempoFuera));
                                incExceso.setEstado("PENDIENTE");
                                incExceso.setIdEventoAgrupador(grupoUnico); // Mismo grupo: 1 solo acontecimiento físico
                                incidentesAGuardar.add(incExceso);
                            }
                        }
                    }
                }
            }

            // REGLA 5: Marcas Abiertas
            if (primerIngreso != null && ultimoEgreso == null) {
                if (!existeIncidente(fecha, empleado.getId(), "MARCAS_ABIERTAS")) {
                    LocalTime horaIngreso = primerIngreso.getHoraFichaje().toLocalTime();
                    IncidenteAsistencia inc = new IncidenteAsistencia();
                    inc.setFecha(fecha);
                    inc.setHora(horaIngreso);
                    inc.setEmpleado(empleado);
                    inc.setSeveridad("MEDIA");
                    inc.setCategoriaRegla("MARCAS_ABIERTAS");
                    inc.setTipo("Fichada abierta: sin egreso");
                    inc.setDetalle(String.format("Ingreso registrado a las %s hs sin fichada de salida.", horaIngreso.toString().substring(0, 5)));
                    inc.setEstado("PENDIENTE");
                    inc.setIdEventoAgrupador("ABIERTA_" + fecha + "_" + empleado.getId());
                    incidentesAGuardar.add(inc);
                }
            }
        }

        if (!incidentesAGuardar.isEmpty()) {
            incidenteRepo.saveAll(incidentesAGuardar);
            log.info(">>> Auditoría finalizada para {}: {} registros generados.", fecha, incidentesAGuardar.size());
        }
    }

    @Transactional
    public void asegurarAusenciasEmpleadoRango(Empleado emp, List<EmpleadoHorario> horariosActivos,
                                               List<EmpleadoFichaje> fichajesPeriodo,
                                               LocalDate desde, LocalDate hasta) {
        if (horariosActivos == null || horariosActivos.isEmpty()) return;

        Set<Integer> diasConHorario = horariosActivos.stream()
                .map(EmpleadoHorario::getDiaSemana)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Set<LocalDate> diasConFichaje = fichajesPeriodo.stream()
                .map(f -> f.getHoraFichaje().toLocalDate())
                .collect(Collectors.toSet());

        List<IncidenteAsistencia> nuevasAusencias = new ArrayList<>();
        LocalDate hoy = LocalDate.now();
        LocalDate limite = hasta.isAfter(hoy) ? hoy : hasta;

        LocalDate cur = desde;
        while (!cur.isAfter(limite)) {
            // Si el empleado tenía obligación de asistir ese día de la semana y no tiene ni 1 fichaje
            if (diasConHorario.contains(cur.getDayOfWeek().getValue()) && !diasConFichaje.contains(cur)) {
                if (!existeIncidente(cur, emp.getId(), "AUSENCIAS")) {
                    IncidenteAsistencia inc = new IncidenteAsistencia();
                    inc.setFecha(cur);
                    inc.setHora(LocalTime.MIDNIGHT);
                    inc.setEmpleado(emp);
                    inc.setSeveridad("CRÍTICA");
                    inc.setCategoriaRegla("AUSENCIAS");
                    inc.setTipo("Inasistencia injustificada en jornada obligatoria");
                    inc.setDetalle("El empleado no registró ninguna marcación durante su día asignado.");
                    inc.setEstado("PENDIENTE");
                    inc.setIdEventoAgrupador("AUSENCIA_" + cur + "_" + emp.getId());
                    nuevasAusencias.add(inc);
                }
            }
            cur = cur.plusDays(1);
        }

        if (!nuevasAusencias.isEmpty()) {
            incidenteRepo.saveAll(nuevasAusencias);
        }
    }

    private boolean existeIncidente(LocalDate fecha, Long idEmpleado, String categoria) {
        return incidenteRepo.existeIncidentePorFechaEmpleadoYCategoria(fecha, idEmpleado, categoria);
    }

    @Transactional(readOnly = true)
    public ResumenPresenciaFichajesDTO calcularHorasRealesDia(Long empleadoId, LocalDate fecha) {
        if (empleadoId == null || fecha == null) {
            return new ResumenPresenciaFichajesDTO(0.0, 0.0, 0, false, List.of());
        }

        Empleado emp = empleadoRepo.findById(empleadoId).orElse(null);
        int maxSalidasPermitidas = (emp != null && emp.getMaxSalidasIntermedias() != null) ? emp.getMaxSalidasIntermedias() : 2;
        int maxTiempoFueraMin = (emp != null && emp.getTiempoMaxFueraMin() != null) ? emp.getTiempoMaxFueraMin() : 45;

        LocalDateTime inicioDia = fecha.atStartOfDay();
        LocalDateTime finDia = fecha.atTime(LocalTime.MAX);

        List<EmpleadoFichaje> fichajes = fichajeRepo.findAll().stream()
                .filter(f -> f.getEmpleado() != null && f.getEmpleado().getId().equals(empleadoId))
                .filter(f -> Boolean.TRUE.equals(f.getActivo()))
                .filter(f -> "valido".equalsIgnoreCase(f.getEstadoFichaje()))
                .filter(f -> f.getHoraFichaje() != null &&
                        !f.getHoraFichaje().isBefore(inicioDia) &&
                        !f.getHoraFichaje().isAfter(finDia))
                .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                .toList();

        if (fichajes.isEmpty()) {
            return new ResumenPresenciaFichajesDTO(0.0, 0.0, 0, false, List.of("Sin marcaciones registradas en la fecha."));
        }

        long minutosPresencia = 0;
        long minutosFuera = 0;
        int cantidadSalidas = 0;
        List<String> advertencias = new ArrayList<>();

        for (int i = 0; i < fichajes.size() - 1; i++) {
            EmpleadoFichaje actual = fichajes.get(i);
            EmpleadoFichaje siguiente = fichajes.get(i + 1);

            long lapso = Duration.between(actual.getHoraFichaje(), siguiente.getHoraFichaje()).toMinutes();
            if (lapso <= 0) continue;

            if (!esTipoSalida(actual.getTipoEvento())) {
                minutosPresencia += lapso;
            } else if (esTipoIngreso(siguiente.getTipoEvento())) {
                cantidadSalidas++;
                minutosFuera += lapso;
                if (lapso > maxTiempoFueraMin) {
                    advertencias.add(String.format("Salida intermedia de %d min (%s a %s) excede el límite de %d min.",
                            lapso, actual.getHoraFichaje().toLocalTime().toString().substring(0, 5),
                            siguiente.getHoraFichaje().toLocalTime().toString().substring(0, 5), maxTiempoFueraMin));
                }
            }
        }

        boolean excedeSalidas = cantidadSalidas > maxSalidasPermitidas || minutosFuera > maxTiempoFueraMin;
        double horasNetas = Math.round((minutosPresencia / 60.0) * 100.0) / 100.0;
        double horasFuera = Math.round((minutosFuera / 60.0) * 100.0) / 100.0;

        return new ResumenPresenciaFichajesDTO(horasNetas, horasFuera, cantidadSalidas, excedeSalidas, advertencias);
    }

    @Transactional(readOnly = true)
    public ResumenPresenciaFichajesDTO calcularHorasRealesRango(Long empleadoId, LocalDate desde, LocalDate hasta) {
        if (empleadoId == null || desde == null || hasta == null || hasta.isBefore(desde)) {
            return new ResumenPresenciaFichajesDTO(0.0, 0.0, 0, false, List.of());
        }

        double totalHorasNetas = 0.0;
        double totalHorasFuera = 0.0;
        int totalSalidas = 0;
        boolean huboExceso = false;
        List<String> todasAdvertencias = new ArrayList<>();

        LocalDate actual = desde;
        while (!actual.isAfter(hasta)) {
            ResumenPresenciaFichajesDTO resDia = calcularHorasRealesDia(empleadoId, actual);
            totalHorasNetas += resDia.horasNetasTrabajadas();
            totalHorasFuera += resDia.horasSalidasIntermedias();
            totalSalidas += resDia.cantidadSalidasIntermedias();

            if (resDia.excedeSalidasIntermedias()) {
                huboExceso = true;
            }
            actual = actual.plusDays(1);
        }

        return new ResumenPresenciaFichajesDTO(
                Math.round(totalHorasNetas * 100.0) / 100.0,
                Math.round(totalHorasFuera * 100.0) / 100.0,
                totalSalidas,
                huboExceso,
                todasAdvertencias
        );
    }

    private boolean esTipoSalida(String tipo) {
        if (tipo == null) return false;
        String t = tipo.toLowerCase();
        return t.contains("checkout") || t.contains("breakout") || t.contains("overtimeout");
    }

    private boolean esTipoIngreso(String tipo) {
        if (tipo == null) return false;
        String t = tipo.toLowerCase();
        return t.contains("checkin") || t.contains("breakin") || t.contains("overtimein");
    }
}