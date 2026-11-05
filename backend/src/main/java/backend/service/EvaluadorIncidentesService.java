package backend.service;

import backend.dto.ResumenPresenciaFichajesDTO;
import backend.model.Empleado;
import backend.model.EmpleadoFichaje;
import backend.model.EmpleadoHorario;
import backend.model.ExcepcionLicencia;
import backend.model.IncidenteAsistencia;
import backend.repositories.EmpleadoFichajeRepository;
import backend.repositories.EmpleadoHorarioRepository;
import backend.repositories.EmpleadoRepository;
import backend.repositories.ExcepcionLicenciaRepository;
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
    private final ExcepcionLicenciaRepository excepcionRepo;
    private final HorarioService horarioService;

    public EvaluadorIncidentesService(
            EmpleadoRepository empleadoRepo,
            EmpleadoHorarioRepository horarioRepo,
            EmpleadoFichajeRepository fichajeRepo,
            IncidenteAsistenciaRepository incidenteRepo,
            ExcepcionLicenciaRepository excepcionRepo,
            HorarioService horarioService) {
        this.empleadoRepo = empleadoRepo;
        this.horarioRepo = horarioRepo;
        this.fichajeRepo = fichajeRepo;
        this.incidenteRepo = incidenteRepo;
        this.excepcionRepo = excepcionRepo;
        this.horarioService = horarioService;
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 55 23 * * *")
    @Transactional
    public void cierreDiarioAutomatico() {
        LocalDate hoy = LocalDate.now();
        evaluarFecha(hoy);
        evaluarCumplimientoHorariosFlexibles(hoy);
    }

    @Transactional
    public void evaluarFecha(LocalDate fecha) {
        int diaSemana = fecha.getDayOfWeek().getValue();
        LocalDateTime inicioDelDia = fecha.atStartOfDay();
        LocalDateTime finDelDia = fecha.atTime(LocalTime.MAX);
        LocalDate hoy = LocalDate.now();
        LocalTime horaActual = LocalTime.now();

        List<EmpleadoHorario> horariosDelDia = horarioRepo.findAll().stream()
                .filter(h -> h.getDiaSemana() != null && h.getDiaSemana() == diaSemana)
                .filter(h -> h.getHoraEntrada() != null && h.getHoraSalida() != null)
                .filter(h -> h.getEmpleado() != null && Boolean.TRUE.equals(h.getEmpleado().getActivo()))
                .filter(h -> {
                    LocalDateTime alta = h.getFechaAlta() != null ? h.getFechaAlta() : LocalDateTime.MIN;
                    LocalDateTime baja = h.getFechaBaja();
                    boolean yaHabiaIniciado = !alta.isAfter(finDelDia);
                    boolean noHabiaFinalizado = (baja == null) || !baja.isBefore(inicioDelDia);
                    return yaHabiaIniciado && noHabiaFinalizado;
                })
                .toList();

        if (horariosDelDia.isEmpty()) return;

        Map<Empleado, List<EmpleadoHorario>> horariosPorEmpleado = horariosDelDia.stream()
                .collect(Collectors.groupingBy(EmpleadoHorario::getEmpleado));

        List<IncidenteAsistencia> incidentesAGuardar = new ArrayList<>();

        for (Map.Entry<Empleado, List<EmpleadoHorario>> entry : horariosPorEmpleado.entrySet()) {
            Empleado empleado = entry.getKey();
            List<EmpleadoHorario> franjas = entry.getValue();

            if (excepcionRepo.tieneExcepcionOAsueto(empleado.getId(), fecha)) {
                eliminarIncidentesDeFecha(fecha, empleado.getId());
                continue;
            }

            List<EmpleadoFichaje> fichajes = fichajeRepo.findAll().stream()
                    .filter(f -> f.getEmpleado() != null && f.getEmpleado().getId().equals(empleado.getId()))
                    .filter(f -> Boolean.TRUE.equals(f.getActivo()))
                    .filter(f -> "valido".equalsIgnoreCase(f.getEstadoFichaje()))
                    .filter(f -> f.getHoraFichaje() != null &&
                            !f.getHoraFichaje().isBefore(inicioDelDia) &&
                            !f.getHoraFichaje().isAfter(finDelDia))
                    .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                    .toList();

            for (EmpleadoHorario franja : franjas) {
                String nombreFranja = franja.getMateria() != null ? franja.getMateria().getNombre()
                        : (franja.getEtiqueta() != null ? franja.getEtiqueta() : "Turno");
                String idAgrupador = "AUSENCIA_" + fecha + "_" + empleado.getId() + "_" + franja.getId();

                LocalTime inicioFranja = franja.getHoraEntrada();
                LocalTime finFranja = franja.getHoraSalida();
                int tolIngreso = empleado.getToleranciaIngresoMin() != null ? empleado.getToleranciaIngresoMin() : 15;
                int tolEgreso = empleado.getToleranciaEgresoMin() != null ? empleado.getToleranciaEgresoMin() : 10;

                List<EmpleadoFichaje> fichajesFranja = fichajes.stream()
                        .filter(f -> {
                            LocalTime hf = f.getHoraFichaje().toLocalTime();
                            return !hf.isBefore(inicioFranja.minusMinutes(45)) && !hf.isAfter(finFranja.plusMinutes(45));
                        })
                        .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                        .toList();

                if (fichajesFranja.isEmpty()) {
                    boolean concluyoEstaFranja = !fecha.isEqual(hoy) || horaActual.isAfter(finFranja);
                    if (concluyoEstaFranja) {
                        if (!existeIncidenteConAgrupador(idAgrupador)) {
                            IncidenteAsistencia inc = new IncidenteAsistencia();
                            inc.setFecha(fecha);
                            inc.setHora(finFranja);
                            inc.setEmpleado(empleado);
                            inc.setSeveridad("CRÍTICA");
                            inc.setCategoriaRegla("AUSENCIAS");
                            inc.setTipo("Inasistencia: " + nombreFranja);
                            inc.setDetalle(String.format("No registró marcaciones en su turno pautado de %s a %s hs (%s).",
                                    inicioFranja.toString().substring(0, 5),
                                    finFranja.toString().substring(0, 5),
                                    nombreFranja));
                            inc.setEstado("PENDIENTE");
                            inc.setIdEventoAgrupador(idAgrupador);
                            incidentesAGuardar.add(inc);
                        }
                    } else if (fecha.isEqual(hoy)) {
                        eliminarIncidentePorAgrupador(idAgrupador);
                    }
                } else {
                    eliminarIncidentePorAgrupador(idAgrupador);

                    EmpleadoFichaje prim = fichajesFranja.stream().filter(f -> esTipoIngreso(f.getTipoEvento())).findFirst().orElse(fichajesFranja.get(0));
                    LocalTime horaIng = prim.getHoraFichaje().toLocalTime();
                    LocalTime limEntrada = inicioFranja.plusMinutes(tolIngreso);

                    String tardAgrupador = "TARDE_" + fecha + "_" + empleado.getId() + "_" + franja.getId();
                    if (horaIng.isAfter(limEntrada) && !horaIng.isAfter(finFranja)) {
                        long minTarde = Duration.between(inicioFranja, horaIng).toMinutes();
                        if (!existeIncidenteConAgrupador(tardAgrupador)) {
                            IncidenteAsistencia inc = new IncidenteAsistencia();
                            inc.setFecha(fecha);
                            inc.setHora(horaIng);
                            inc.setEmpleado(empleado);
                            inc.setSeveridad(minTarde > 30 ? "ALTA" : "MEDIA");
                            inc.setCategoriaRegla("LLEGADAS_TARDE");
                            inc.setTipo(String.format("Llegada tarde (+%d min) en %s", minTarde, nombreFranja));
                            inc.setDetalle(String.format("Pautado: %s hs (tolerancia: %d min). Ingresó: %s hs en %s.",
                                    inicioFranja.toString().substring(0, 5), tolIngreso, horaIng.toString().substring(0, 5), nombreFranja));
                            inc.setEstado("PENDIENTE");
                            inc.setIdEventoAgrupador(tardAgrupador);
                            incidentesAGuardar.add(inc);
                        }
                    }

                    EmpleadoFichaje ult = fichajesFranja.stream().filter(f -> esTipoSalida(f.getTipoEvento())).reduce((a, b) -> b).orElse(null);
                    if (ult != null) {
                        LocalTime horaEg = ult.getHoraFichaje().toLocalTime();
                        LocalTime limSalida = finFranja.minusMinutes(tolEgreso);
                        String retAgrupador = "RETIRO_" + fecha + "_" + empleado.getId() + "_" + franja.getId();
                        if (horaEg.isBefore(limSalida) && horaEg.isAfter(inicioFranja)) {
                            long minAntes = Duration.between(horaEg, finFranja).toMinutes();
                            if (!existeIncidenteConAgrupador(retAgrupador)) {
                                IncidenteAsistencia inc = new IncidenteAsistencia();
                                inc.setFecha(fecha);
                                inc.setHora(horaEg);
                                inc.setEmpleado(empleado);
                                inc.setSeveridad("ALTA");
                                inc.setCategoriaRegla("RETIROS_PREVIOS");
                                inc.setTipo(String.format("Retiro anticipado (-%d min) en %s", minAntes, nombreFranja));
                                inc.setDetalle(String.format("Salida pautada: %s hs. Fichó egreso a las %s hs en %s.",
                                        finFranja.toString().substring(0, 5), horaEg.toString().substring(0, 5), nombreFranja));
                                inc.setEstado("PENDIENTE");
                                inc.setIdEventoAgrupador(retAgrupador);
                                incidentesAGuardar.add(inc);
                            }
                        }
                    }
                }
            }
        }

        if (!incidentesAGuardar.isEmpty()) {
            incidenteRepo.saveAll(incidentesAGuardar);
            log.info(">>> Auditoría finalizada para {}: {} registros generados.", fecha, incidentesAGuardar.size());
        }
    }

    @Transactional
    public void asegurarAusenciasEmpleadoRango(Empleado emp, List<EmpleadoHorario> horariosCandidatos,
                                               List<EmpleadoFichaje> fichajesPeriodo,
                                               LocalDate desde, LocalDate hasta) {
        log.info("--------------------------------------------------------------------------------");
        log.info(">>> [AUDITORÍA-RANGO] Evaluando ausencias para Empleado: {} ({}) desde {} hasta {}",
                emp.getApellido() + ", " + emp.getNombre(), emp.getId(), desde, hasta);

        if (horariosCandidatos == null || horariosCandidatos.isEmpty()) {
            log.warn(">>> [AUDITORÍA-RANGO] Lista de horarios candidatos vacía para empleado {}", emp.getId());
            return;
        }

        List<ExcepcionLicencia> excepcionesRango = excepcionRepo.buscarExcepcionesVigentesEnRango(emp.getId(), desde, hasta);
        List<IncidenteAsistencia> nuevasAusencias = new ArrayList<>();
        LocalDate hoy = LocalDate.now();
        LocalTime horaActual = LocalTime.now();
        LocalDate limite = hasta.isAfter(hoy) ? hoy : hasta;

        LocalDate cur = desde;
        while (!cur.isAfter(limite)) {
            final LocalDate fActual = cur;
            LocalDateTime inicioDelDia = fActual.atStartOfDay();
            LocalDateTime finDelDia = fActual.atTime(LocalTime.MAX);
            int diaSemanaNum = fActual.getDayOfWeek().getValue();

            // Filtrar horarios que estuvieran vigentes ese día en particular
            List<EmpleadoHorario> horariosVigentesEnFecha = horariosCandidatos.stream()
                    .filter(h -> h.getDiaSemana() != null && h.getDiaSemana() == diaSemanaNum)
                    .filter(h -> {
                        LocalDateTime alta = h.getFechaAlta() != null ? h.getFechaAlta() : LocalDateTime.MIN;
                        LocalDateTime baja = h.getFechaBaja();
                        boolean yaHabiaIniciado = !alta.isAfter(finDelDia);
                        // Vigente si no tiene fecha de baja O si la fecha de baja es igual o posterior al inicio del día
                        boolean noHabiaFinalizado = (baja == null) || !baja.isBefore(inicioDelDia);
                        return yaHabiaIniciado && noHabiaFinalizado;
                    })
                    .toList();

            boolean tieneLicenciaOAsueto = excepcionesRango.stream().anyMatch(e ->
                !fActual.isBefore(e.getFechaInicio()) && !fActual.isAfter(e.getFechaFin())
            );

            if (tieneLicenciaOAsueto) {
                log.info(">>> [AUDITORÍA-RANGO] Fecha {} amparada por Licencia/Asueto. Descartando faltas.", fActual);
                eliminarIncidentesDeFecha(fActual, emp.getId());
            } else if (!horariosVigentesEnFecha.isEmpty()) {
                List<EmpleadoFichaje> fichajesDia = fichajesPeriodo.stream()
                        .filter(f -> f.getHoraFichaje() != null && f.getHoraFichaje().toLocalDate().equals(fActual))
                        .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                        .toList();

                for (EmpleadoHorario franja : horariosVigentesEnFecha) {
                    LocalTime ini = franja.getHoraEntrada();
                    LocalTime fin = franja.getHoraSalida();
                    String nombreTurno = franja.getMateria() != null ? franja.getMateria().getNombre()
                            : (franja.getEtiqueta() != null ? franja.getEtiqueta() : "Turno");
                    String idAgrupador = "AUSENCIA_" + fActual + "_" + emp.getId() + "_" + franja.getId();

                    boolean tieneFichajeEnFranja = fichajesDia.stream().anyMatch(f -> {
                        LocalTime hf = f.getHoraFichaje().toLocalTime();
                        return !hf.isBefore(ini.minusMinutes(45)) && !hf.isAfter(fin.plusMinutes(45));
                    });

                    boolean correspondeMarcar;
                    if (fActual.isEqual(hoy)) {
                        correspondeMarcar = !tieneFichajeEnFranja && horaActual.isAfter(fin);
                        if (!correspondeMarcar) {
                            eliminarIncidentePorAgrupador(idAgrupador);
                        }
                    } else {
                        correspondeMarcar = !tieneFichajeEnFranja;
                    }

                    if (correspondeMarcar) {
                        if (!existeIncidenteConAgrupador(idAgrupador)) {
                            IncidenteAsistencia inc = new IncidenteAsistencia();
                            inc.setFecha(fActual);
                            inc.setHora(fin);
                            inc.setEmpleado(emp);
                            inc.setSeveridad("CRÍTICA");
                            inc.setCategoriaRegla("AUSENCIAS");
                            inc.setTipo("Inasistencia: " + nombreTurno);
                            inc.setDetalle(String.format("El colaborador no registró marcaciones en el horario pautado de %s a %s hs (%s).",
                                    ini.toString().substring(0, 5), fin.toString().substring(0, 5), nombreTurno));
                            inc.setEstado("PENDIENTE");
                            inc.setIdEventoAgrupador(idAgrupador);
                            nuevasAusencias.add(inc);

                            log.info("    -> [NUEVA AUSENCIA DETECTADA] Fecha: {}, Horario: {}-{} ({}) | Agrupador: {}",
                                    fActual, ini, fin, nombreTurno, idAgrupador);
                        }
                    } else {
                        eliminarIncidentePorAgrupador(idAgrupador);
                    }
                }
            }
            cur = cur.plusDays(1);
        }

        if (!nuevasAusencias.isEmpty()) {
            incidenteRepo.saveAll(nuevasAusencias);
            log.info(">>> [AUDITORÍA-RANGO] Se guardaron {} nuevas ausencias en la base de datos.", nuevasAusencias.size());
        } else {
            log.info(">>> [AUDITORÍA-RANGO] No se requirió insertar nuevas ausencias en este rango.");
        }
        log.info("--------------------------------------------------------------------------------");
    }

    @Transactional
    public void evaluarCumplimientoHorariosFlexibles(LocalDate fechaCierre) {
        List<EmpleadoHorario> flexibles = horarioRepo.findAll().stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .filter(h -> h.getDiaSemana() == null && h.getHorasObjetivo() != null && h.getHorasObjetivo() > 0)
                .filter(h -> h.getEmpleado() != null && Boolean.TRUE.equals(h.getEmpleado().getActivo()))
                .toList();

        for (EmpleadoHorario fh : flexibles) {
            Empleado emp = fh.getEmpleado();
            String frec = fh.getTipoFrecuencia() != null ? fh.getTipoFrecuencia().toUpperCase() : "MENSUAL";
            LocalDate fechaInicioPeriodo = null;
            LocalDate fechaFinPeriodo = null;
            boolean correspondeEvaluarCierre = false;

            switch (frec) {
                case "SEMANAL" -> {
                    if (fechaCierre.getDayOfWeek().getValue() == 7) {
                        fechaInicioPeriodo = fechaCierre.minusDays(6);
                        fechaFinPeriodo = fechaCierre;
                        correspondeEvaluarCierre = true;
                    }
                }
                case "SEMANA_POR_MEDIO" -> {
                    if (fechaCierre.getDayOfWeek().getValue() == 7) {
                        fechaInicioPeriodo = fechaCierre.minusDays(13);
                        fechaFinPeriodo = fechaCierre;
                        correspondeEvaluarCierre = true;
                    }
                }
                case "MENSUAL" -> {
                    if (fechaCierre.equals(fechaCierre.withDayOfMonth(fechaCierre.lengthOfMonth()))) {
                        fechaInicioPeriodo = fechaCierre.withDayOfMonth(1);
                        fechaFinPeriodo = fechaCierre;
                        correspondeEvaluarCierre = true;
                    }
                }
                case "ANUAL" -> {
                    if (fechaCierre.getMonthValue() == 12 && fechaCierre.getDayOfMonth() == 31) {
                        fechaInicioPeriodo = fechaCierre.withDayOfYear(1);
                        fechaFinPeriodo = fechaCierre;
                        correspondeEvaluarCierre = true;
                    }
                }
            }

            if (!correspondeEvaluarCierre) continue;

            ResumenPresenciaFichajesDTO presencia = calcularHorasRealesRango(emp.getId(), fechaInicioPeriodo, fechaFinPeriodo);
            double horasReales = presencia.horasNetasTrabajadas();
            double horasMeta = fh.getHorasObjetivo();

            if (horasReales < horasMeta) {
                double deficitHoras = Math.round((horasMeta - horasReales) * 100.0) / 100.0;
                String agrupador = "DEFICIT_FLEX_" + frec + "_" + fechaFinPeriodo + "_" + emp.getId();

                if (!existeIncidenteConAgrupador(agrupador)) {
                    IncidenteAsistencia inc = new IncidenteAsistencia();
                    inc.setFecha(fechaFinPeriodo);
                    inc.setHora(LocalTime.of(23, 59));
                    inc.setEmpleado(emp);
                    inc.setSeveridad("ALTA");
                    inc.setCategoriaRegla("DEFICIT_HORAS");
                    inc.setTipo(String.format("Incumplimiento de Carga Flexible (%s)", frec.toLowerCase()));
                    inc.setDetalle(String.format(
                        "El colaborador debía cumplir %.1f hs en el período (%s al %s) y acumuló %.1f hs netas. Déficit registrado: -%.1f hs.",
                        horasMeta, fechaInicioPeriodo, fechaFinPeriodo, horasReales, deficitHoras
                    ));
                    inc.setEstado("PENDIENTE");
                    inc.setIdEventoAgrupador(agrupador);
                    incidenteRepo.save(inc);
                }
            }
        }
    }

    private void eliminarIncidentesDeFecha(LocalDate fecha, Long idEmpleado) {
        List<IncidenteAsistencia> incs = incidenteRepo.findAll().stream()
                .filter(i -> i.getEmpleado() != null && i.getEmpleado().getId().equals(idEmpleado))
                .filter(i -> i.getFecha() != null && i.getFecha().equals(fecha))
                .toList();

        if (!incs.isEmpty()) {
            incidenteRepo.deleteAll(incs);
            log.info(">>> Eliminados {} incidentes para la fecha {}", incs.size(), fecha);
        }
    }

    private void eliminarIncidentePorAgrupador(String agrupador) {
        if (agrupador == null) return;
        List<IncidenteAsistencia> encontrados = incidenteRepo.findAll().stream()
                .filter(i -> agrupador.equals(i.getIdEventoAgrupador()))
                .toList();
        if (!encontrados.isEmpty()) {
            incidenteRepo.deleteAll(encontrados);
            log.info(">>> Eliminado incidente agrupador: {}", agrupador);
        }
    }

    private boolean existeIncidenteConAgrupador(String agrupador) {
        if (agrupador == null) return false;
        return incidenteRepo.findAll().stream()
                .anyMatch(i -> agrupador.equals(i.getIdEventoAgrupador()));
    }

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