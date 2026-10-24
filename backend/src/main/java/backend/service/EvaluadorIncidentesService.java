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

    // =========================================================================
    // CÁLCULO EXCLUSIVO DE HORAS DE CLASE (DOCENTES) EN MINUTOS EXACTOS
    // =========================================================================

    public long calcularMinutosClaseTeoricos(List<EmpleadoHorario> franjasDia) {
        if (franjasDia == null || franjasDia.isEmpty()) return 0;
        long minutosTotales = 0;
        for (EmpleadoHorario h : franjasDia) {
            if (h.getMateria() != null && h.getHoraEntrada() != null && h.getHoraSalida() != null) {
                long m = Duration.between(h.getHoraEntrada(), h.getHoraSalida()).toMinutes();
                if (m > 0) minutosTotales += m;
            }
        }
        return minutosTotales;
    }

    /**
     * Cuenta los minutos exactos de presencia real solapados con el horario de cada cátedra.
     * No redondea por tolerancia: si ingresó 08:07 a una clase de 08:00, computa desde las 08:07.
     */
    public long calcularMinutosClaseEfectivos(List<EmpleadoHorario> franjasDia, List<EmpleadoFichaje> fichajesDelDia, LocalDate fecha) {
        if (franjasDia == null || franjasDia.isEmpty() || fichajesDelDia == null || fichajesDelDia.isEmpty()) return 0;

        List<EmpleadoHorario> clasesDelDia = franjasDia.stream()
                .filter(h -> h.getMateria() != null && h.getHoraEntrada() != null && h.getHoraSalida() != null)
                .toList();

        if (clasesDelDia.isEmpty()) return 0;

        List<EmpleadoFichaje> marcasDelDia = fichajesDelDia.stream()
                .filter(f -> f.getHoraFichaje() != null && f.getHoraFichaje().toLocalDate().equals(fecha))
                .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                .toList();

        if (marcasDelDia.isEmpty()) return 0;

        // Reconstrucción de intervalos reales de permanencia física
        List<IntervaloReal> intervalosPresencia = new ArrayList<>();
        LocalTime ultimaEntrada = null;

        for (EmpleadoFichaje f : marcasDelDia) {
            boolean esIngreso = esTipoIngreso(f.getTipoEvento());
            boolean esSalida = esTipoSalida(f.getTipoEvento());

            if (esIngreso) {
                ultimaEntrada = f.getHoraFichaje().toLocalTime();
            } else if (esSalida && ultimaEntrada != null) {
                intervalosPresencia.add(new IntervaloReal(ultimaEntrada, f.getHoraFichaje().toLocalTime()));
                ultimaEntrada = null;
            }
        }
        if (ultimaEntrada != null) {
            intervalosPresencia.add(new IntervaloReal(ultimaEntrada, LocalTime.of(23, 59, 59)));
        }

        long minutosEfectivos = 0;
        for (EmpleadoHorario clase : clasesDelDia) {
            LocalTime inicioClase = clase.getHoraEntrada();
            LocalTime finClase = clase.getHoraSalida();

            for (IntervaloReal pres : intervalosPresencia) {
                if (pres.inicio().isBefore(finClase) && pres.fin().isAfter(inicioClase)) {
                    // Solape exacto al minuto
                    LocalTime solapeInicio = pres.inicio().isAfter(inicioClase) ? pres.inicio() : inicioClase;
                    LocalTime solapeFin = pres.fin().isBefore(finClase) ? pres.fin() : finClase;

                    long lapso = Duration.between(solapeInicio, solapeFin).toMinutes();
                    if (lapso > 0) {
                        minutosEfectivos += lapso;
                    }
                }
            }
        }

        return minutosEfectivos;
    }

    private record IntervaloReal(LocalTime inicio, LocalTime fin) {}

    // =========================================================================
    // AUDITORÍA GENERAL DE JORNADA E INCIDENTES
    // =========================================================================

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

            // 1. Obtener fichajes del día ordenados
            List<EmpleadoFichaje> fichajes = fichajeRepo.findAll().stream()
                    .filter(f -> f.getEmpleado() != null && f.getEmpleado().getId().equals(empleado.getId()))
                    .filter(f -> Boolean.TRUE.equals(f.getActivo()))
                    .filter(f -> "valido".equalsIgnoreCase(f.getEstadoFichaje()))
                    .filter(f -> f.getHoraFichaje() != null &&
                            !f.getHoraFichaje().isBefore(inicioDia) &&
                            !f.getHoraFichaje().isAfter(finDia))
                    .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                    .toList();

            // Sumatoria de minutos teóricos pautados para el empleado
            long minutosTeoricosDia = 0;
            for (EmpleadoHorario fh : franjas) {
                if (fh.getHoraEntrada() != null && fh.getHoraSalida() != null) {
                    minutosTeoricosDia += Duration.between(fh.getHoraEntrada(), fh.getHoraSalida()).toMinutes();
                }
            }

            // =========================================================================
            // REGLA 4: INASISTENCIA REAL VS PRESENCIA
            // =========================================================================
            if (fichajes.isEmpty()) {
                if (!existeIncidente(fecha, empleado.getId(), "AUSENCIAS")) {
                    IncidenteAsistencia inc = new IncidenteAsistencia();
                    inc.setFecha(fecha);
                    inc.setHora(LocalTime.MIDNIGHT);
                    inc.setEmpleado(empleado);
                    inc.setSeveridad("CRÍTICA");
                    inc.setCategoriaRegla("AUSENCIAS");
                    inc.setTipo("Inasistencia injustificada en jornada obligatoria");
                    inc.setDetalle("El empleado tenía jornada obligatoria pero no registró marcaciones.");
                    inc.setEstado("PENDIENTE");
                    inc.setIdEventoAgrupador("AUSENCIA_" + fecha + "_" + empleado.getId());
                    incidentesAGuardar.add(inc);
                }
                continue;
            } else {
                // Auto-limpieza de inasistencias en caso de haber fichajes reales para la fecha
                eliminarFalsasInasistencias(fecha, empleado.getId());
            }

            // Construir los intervalos fuera de la institución
            long minutosPresenciaReal = 0;
            long minutosFueraAcumulados = 0;
            int cantidadSalidas = 0;
            Map<LocalTime, Long> salidasDetalle = new HashMap<>();

            for (int i = 0; i < fichajes.size() - 1; i++) {
                EmpleadoFichaje act = fichajes.get(i);
                EmpleadoFichaje sig = fichajes.get(i + 1);
                long lapso = Duration.between(act.getHoraFichaje(), sig.getHoraFichaje()).toMinutes();
                if (lapso <= 0) continue;

                if (!esTipoSalida(act.getTipoEvento())) {
                    minutosPresenciaReal += lapso;
                } else if (esTipoIngreso(sig.getTipoEvento())) {
                    cantidadSalidas++;
                    minutosFueraAcumulados += lapso;
                    salidasDetalle.put(act.getHoraFichaje().toLocalTime(), lapso);
                }
            }

            EmpleadoFichaje primerIngreso = fichajes.stream()
                    .filter(f -> esTipoIngreso(f.getTipoEvento()))
                    .findFirst()
                    .orElse(fichajes.get(0));

            EmpleadoFichaje ultimoEgreso = fichajes.stream()
                    .filter(f -> esTipoSalida(f.getTipoEvento()))
                    .reduce((first, second) -> second)
                    .orElse(null);

            LocalTime inicioTurnoGeneral = franjas.stream()
                    .map(EmpleadoHorario::getHoraEntrada)
                    .filter(Objects::nonNull)
                    .min(LocalTime::compareTo)
                    .orElse(LocalTime.of(8, 0));

            LocalTime finTurnoGeneral = franjas.stream()
                    .map(EmpleadoHorario::getHoraSalida)
                    .filter(Objects::nonNull)
                    .max(LocalTime::compareTo)
                    .orElse(LocalTime.of(17, 0));

            LocalTime horaPrimerIngreso = primerIngreso.getHoraFichaje().toLocalTime();

            // =========================================================================
            // REGLA 4 (Continuación): CUMPLIÓ SUS HORAS EN OTRO TURNO (DESVÍO DE TURNO)
            // =========================================================================
            if (minutosPresenciaReal >= (minutosTeoricosDia - 15) && horaPrimerIngreso.isAfter(finTurnoGeneral)) {
                if (!existeIncidente(fecha, empleado.getId(), "DESVIO_TURNO")) {
                    IncidenteAsistencia inc = new IncidenteAsistencia();
                    inc.setFecha(fecha);
                    inc.setHora(horaPrimerIngreso);
                    inc.setEmpleado(empleado);
                    inc.setSeveridad("MEDIA");
                    inc.setCategoriaRegla("DESVIO_TURNO");
                    inc.setTipo("Desvío de horario / Cumplimiento en otro turno");
                    inc.setDetalle(String.format("Cumplió %s de labor en turno alternativo (horario pautado: %s a %s hs).",
                            formatearMinutosAHoras(minutosPresenciaReal),
                            inicioTurnoGeneral.toString().substring(0, 5),
                            finTurnoGeneral.toString().substring(0, 5)));
                    inc.setEstado("PENDIENTE");
                    inc.setIdEventoAgrupador("DESVIO_" + fecha + "_" + empleado.getId());
                    incidentesAGuardar.add(inc);
                }
                continue;
            }

            // =========================================================================
            // REGLA 2: EVALUAR TARDANZA SEGÚN TOLERANCIA DEL EMPLEADO
            // =========================================================================
            int tolIngreso = empleado.getToleranciaIngresoMin() != null ? empleado.getToleranciaIngresoMin() : 15;
            LocalTime limiteTolerancia = inicioTurnoGeneral.plusMinutes(tolIngreso);

            if (horaPrimerIngreso.isAfter(limiteTolerancia)) {
                long minutosTarde = Duration.between(inicioTurnoGeneral, horaPrimerIngreso).toMinutes();
                if (!existeIncidente(fecha, empleado.getId(), "LLEGADAS_TARDE")) {
                    IncidenteAsistencia inc = new IncidenteAsistencia();
                    inc.setFecha(fecha);
                    inc.setHora(horaPrimerIngreso);
                    inc.setEmpleado(empleado);
                    inc.setSeveridad(minutosTarde > 30 ? "ALTA" : "MEDIA");
                    inc.setCategoriaRegla("LLEGADAS_TARDE");
                    inc.setTipo(String.format("Llegada tarde (+%d min)", minutosTarde));
                    inc.setDetalle(String.format("Horario pautado: %s hs (tolerancia: %d min). Ingresó a las %s hs.",
                            inicioTurnoGeneral.toString().substring(0, 5), tolIngreso, horaPrimerIngreso.toString().substring(0, 5)));
                    inc.setEstado("PENDIENTE");
                    inc.setIdEventoAgrupador("TARDE_" + fecha + "_" + empleado.getId());
                    incidentesAGuardar.add(inc);
                }
            }

            // =========================================================================
            // REGLA 3: SALIDAS INTERMEDIAS ACUMULADAS VS TOLERANCIA DEL EMPLEADO
            // =========================================================================
            int maxTiempoFueraMin = empleado.getTiempoMaxFueraMin() != null ? empleado.getTiempoMaxFueraMin() : 30;

            if (minutosFueraAcumulados > maxTiempoFueraMin) {
                if (!existeIncidente(fecha, empleado.getId(), "SALIDAS_EXCESIVAS")) {
                    IncidenteAsistencia incExceso = new IncidenteAsistencia();
                    incExceso.setFecha(fecha);
                    incExceso.setHora(fichajes.size() > 1 ? fichajes.get(1).getHoraFichaje().toLocalTime() : horaPrimerIngreso);
                    incExceso.setEmpleado(empleado);
                    incExceso.setSeveridad("ALTA");
                    incExceso.setCategoriaRegla("SALIDAS_EXCESIVAS");
                    incExceso.setTipo(String.format("Exceso de tiempo fuera permitido (%d min acumulados)", minutosFueraAcumulados));
                    incExceso.setDetalle(String.format("Realizó %d salidas sumando %d min fuera (tolerancia permitida: %d min).",
                            cantidadSalidas, minutosFueraAcumulados, maxTiempoFueraMin));
                    incExceso.setEstado("PENDIENTE");
                    incExceso.setIdEventoAgrupador("EXCESO_SALIDAS_" + fecha + "_" + empleado.getId());
                    incidentesAGuardar.add(incExceso);
                }
            }

            // =========================================================================
            // REGLA 2B: SALIDAS DURANTE CLASE (CRÍTICAS) & RETIROS PREVIOS
            // =========================================================================
            for (EmpleadoHorario franja : franjas) {
                LocalTime inicioFranja = franja.getHoraEntrada();
                LocalTime salidaEsperada = franja.getHoraSalida();
                int tolEgreso = empleado.getToleranciaEgresoMin() != null ? empleado.getToleranciaEgresoMin() : 10;

                // Salida dentro del dictado de clase (Docentes)
                if (franja.getMateria() != null && inicioFranja != null && salidaEsperada != null) {
                    for (Map.Entry<LocalTime, Long> sInterm : salidasDetalle.entrySet()) {
                        LocalTime horaSalida = sInterm.getKey();
                        long duracion = sInterm.getValue();

                        // Ocurre estrictamente dentro del horario de la materia
                        if (horaSalida.isAfter(inicioFranja) && horaSalida.isBefore(salidaEsperada.minusMinutes(tolEgreso))) {
                            String grupoUnico = "SALIDA_CLASE_" + fecha + "_" + horaSalida.toString().substring(0, 5) + "_" + empleado.getId();
                            if (!existeIncidente(fecha, empleado.getId(), "SALIDAS_EN_CLASE")) {
                                IncidenteAsistencia inc = new IncidenteAsistencia();
                                inc.setFecha(fecha);
                                inc.setHora(horaSalida);
                                inc.setEmpleado(empleado);
                                inc.setSeveridad("CRÍTICA");
                                inc.setCategoriaRegla("SALIDAS_EN_CLASE");
                                inc.setTipo(String.format("Salida no autorizada en clase (%d min fuera)", duracion));
                                inc.setDetalle(String.format("Docente salió a las %s hs durante dictado de %s (%s a %s hs), acumulando %d min fuera del aula.",
                                        horaSalida.toString().substring(0, 5), franja.getMateria().getNombre(),
                                        inicioFranja.toString().substring(0, 5), salidaEsperada.toString().substring(0, 5), duracion));
                                inc.setEstado("PENDIENTE");
                                inc.setIdEventoAgrupador(grupoUnico);
                                incidentesAGuardar.add(inc);
                            }
                        }
                    }
                }

                // Retiro anticipado
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
                            inc.setDetalle(String.format("Salida pautada: %s hs (tolerancia: %d min). Fichó egreso a las %s hs.",
                                    salidaEsperada.toString().substring(0, 5), tolEgreso, horaEgresoReal.toString().substring(0, 5)));
                            inc.setEstado("PENDIENTE");
                            inc.setIdEventoAgrupador("RETIRO_" + fecha + "_" + empleado.getId());
                            incidentesAGuardar.add(inc);
                        }
                    }
                }
            }

            // Fichada abierta (sin egreso)
            if (ultimoEgreso == null && fichajes.size() == 1) {
                if (!existeIncidente(fecha, empleado.getId(), "MARCAS_ABIERTAS")) {
                    IncidenteAsistencia inc = new IncidenteAsistencia();
                    inc.setFecha(fecha);
                    inc.setHora(horaPrimerIngreso);
                    inc.setEmpleado(empleado);
                    inc.setSeveridad("MEDIA");
                    inc.setCategoriaRegla("MARCAS_ABIERTAS");
                    inc.setTipo("Fichada abierta: sin egreso");
                    inc.setDetalle(String.format("Ingresó a las %s hs y no registró su salida al finalizar la jornada.",
                            horaPrimerIngreso.toString().substring(0, 5)));
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
                .filter(f -> f.getHoraFichaje() != null)
                .map(f -> f.getHoraFichaje().toLocalDate())
                .collect(Collectors.toSet());

        List<IncidenteAsistencia> nuevasAusencias = new ArrayList<>();
        LocalDate hoy = LocalDate.now();
        LocalDate limite = hasta.isAfter(hoy) ? hoy : hasta;

        LocalDate cur = desde;
        while (!cur.isAfter(limite)) {
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
            } else if (diasConFichaje.contains(cur)) {
                eliminarFalsasInasistencias(cur, emp.getId());
            }
            cur = cur.plusDays(1);
        }

        if (!nuevasAusencias.isEmpty()) {
            incidenteRepo.saveAll(nuevasAusencias);
        }
    }

    private void eliminarFalsasInasistencias(LocalDate fecha, Long idEmpleado) {
        List<IncidenteAsistencia> falsas = incidenteRepo.findAll().stream()
                .filter(i -> i.getEmpleado() != null && i.getEmpleado().getId().equals(idEmpleado))
                .filter(i -> i.getFecha() != null && i.getFecha().equals(fecha))
                .filter(i -> "AUSENCIAS".equalsIgnoreCase(i.getCategoriaRegla()) ||
                             (i.getTipo() != null && i.getTipo().toLowerCase().contains("inasistencia")))
                .toList();

        if (!falsas.isEmpty()) {
            incidenteRepo.deleteAll(falsas);
            log.info(">>> Auto-limpieza: eliminadas {} inasistencias falsas para el empleado {} en {}.",
                    falsas.size(), idEmpleado, fecha);
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
            }
        }

        boolean excedeSalidas = cantidadSalidas > maxSalidasPermitidas || minutosFuera > maxTiempoFueraMin;
        if (minutosFuera > maxTiempoFueraMin) {
            advertencias.add(String.format("Salidas intermedias acumularon %d min fuera (máximo permitido: %d min).",
                    minutosFuera, maxTiempoFueraMin));
        }

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
        return t.contains("checkout") || t.contains("breakout") || t.contains("overtimeout") || t.contains("salida") || t.contains("egreso");
    }

    private boolean esTipoIngreso(String tipo) {
        if (tipo == null) return false;
        String t = tipo.toLowerCase();
        return t.contains("checkin") || t.contains("breakin") || t.contains("overtimein") || t.contains("entrada") || t.contains("ingreso");
    }

    public static String formatearMinutosAHoras(long minutosTotales) {
        long h = Math.abs(minutosTotales) / 60;
        long m = Math.abs(minutosTotales) % 60;
        String signo = minutosTotales < 0 ? "-" : "";
        return String.format("%s%dh %02dm", signo, h, m);
    }
}