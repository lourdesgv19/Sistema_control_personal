package backend.service;

import backend.dto.FichaComportamientoDTO;
import backend.dto.ResumenPresenciaFichajesDTO;
import backend.model.*;
import backend.repositories.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.*;

@Service
public class FichaComportamientoService {

    private static final Logger log = LoggerFactory.getLogger(FichaComportamientoService.class);

    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoHorarioRepository horarioRepo;
    private final EmpleadoFichajeRepository fichajeRepo;
    private final IncidenteAsistenciaRepository incidenteRepo;
    private final EvaluadorIncidentesService evaluadorService;
    private final HorarioService horarioService;

    public FichaComportamientoService(
            EmpleadoRepository empleadoRepo,
            EmpleadoHorarioRepository horarioRepo,
            EmpleadoFichajeRepository fichajeRepo,
            IncidenteAsistenciaRepository incidenteRepo,
            EvaluadorIncidentesService evaluadorService,
            HorarioService horarioService) {
        this.empleadoRepo = empleadoRepo;
        this.horarioRepo = horarioRepo;
        this.fichajeRepo = fichajeRepo;
        this.incidenteRepo = incidenteRepo;
        this.evaluadorService = evaluadorService;
        this.horarioService = horarioService;
    }

    @Transactional
    public FichaComportamientoDTO obtenerFicha(
            Long empleadoId,
            String modalidad,
            LocalDate fechaConsulta,
            LocalDate fechaDesdeParam,
            LocalDate fechaHastaParam) {

        Empleado emp = empleadoRepo.findById(empleadoId)
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado con ID: " + empleadoId));

        final LocalDate fechaBase = (fechaConsulta != null) ? fechaConsulta : LocalDate.now();

        LocalDate fechaInicio;
        LocalDate fechaFin;
        String periodoTexto;

        String mod = (modalidad != null) ? modalidad.toUpperCase() : "DIARIO";

        switch (mod) {
            case "RANGO", "RANGO_FECHAS" -> {
                mod = "RANGO_FECHAS";
                fechaInicio = (fechaDesdeParam != null) ? fechaDesdeParam : fechaBase;
                fechaFin = (fechaHastaParam != null && !fechaHastaParam.isBefore(fechaInicio))
                        ? fechaHastaParam
                        : fechaInicio;
                periodoTexto = fechaInicio + " → " + fechaFin;
            }
            case "SEMANAL" -> {
                fechaInicio = fechaBase.minusDays(fechaBase.getDayOfWeek().getValue() - 1);
                fechaFin = fechaInicio.plusDays(6);
                periodoTexto = fechaInicio + " → " + fechaFin;
            }
            case "MENSUAL" -> {
                fechaInicio = fechaBase.withDayOfMonth(1);
                fechaFin = fechaBase.withDayOfMonth(fechaBase.lengthOfMonth());
                String nombreMesEsp = fechaBase.getMonth().getDisplayName(TextStyle.FULL, Locale.of("es", "ES"));
                periodoTexto = nombreMesEsp.substring(0, 1).toUpperCase() + nombreMesEsp.substring(1) + " " + fechaBase.getYear();
            }
            case "TRIMESTRE" -> {
                fechaInicio = fechaBase.withDayOfMonth(1);
                fechaFin = fechaInicio.plusMonths(3).minusDays(1);
                String nombreMesEsp = fechaBase.getMonth().getDisplayName(TextStyle.FULL, Locale.of("es", "ES"));
                periodoTexto = "Trimestre desde " + nombreMesEsp.substring(0, 1).toUpperCase() + nombreMesEsp.substring(1) + " " + fechaBase.getYear();
            }
            case "CUATRIMESTRE" -> {
                fechaInicio = fechaBase.withDayOfMonth(1);
                fechaFin = fechaInicio.plusMonths(4).minusDays(1);
                String nombreMesEsp = fechaBase.getMonth().getDisplayName(TextStyle.FULL, Locale.of("es", "ES"));
                periodoTexto = "Cuatrimestre desde " + nombreMesEsp.substring(0, 1).toUpperCase() + nombreMesEsp.substring(1) + " " + fechaBase.getYear();
            }
            default -> {
                mod = "DIARIO";
                fechaInicio = fechaBase;
                fechaFin = fechaBase;
                periodoTexto = fechaBase.toString();
            }
        }

        // 1. Horarios activos del empleado
        List<EmpleadoHorario> horarios = horarioRepo.findByEmpleadoId(emp.getId()).stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .toList();

        boolean esDocente = horarios.stream().anyMatch(h -> h.getMateria() != null);

        String etiquetaTurno = "Sin turno asignado";
        if (!horarios.isEmpty()) {
            if (esDocente) {
                long totalClases = horarios.stream().filter(h -> h.getMateria() != null).count();
                etiquetaTurno = "Por Cátedra (" + totalClases + " clases)";
            } else if (horarios.get(0).getEtiqueta() != null && !horarios.get(0).getEtiqueta().isBlank()) {
                etiquetaTurno = horarios.get(0).getEtiqueta();
            } else {
                etiquetaTurno = "Jornada Regular";
            }
        }

        // 2. Fichajes válidos del período
        LocalDateTime inicioT = fechaInicio.atStartOfDay();
        LocalDateTime finT = fechaFin.atTime(LocalTime.MAX);

        List<EmpleadoFichaje> fichajesPeriodo = fichajeRepo.findAll().stream()
                .filter(f -> f.getEmpleado() != null && f.getEmpleado().getId().equals(emp.getId()))
                .filter(f -> Boolean.TRUE.equals(f.getActivo()))
                .filter(f -> "valido".equalsIgnoreCase(f.getEstadoFichaje()))
                .filter(f -> f.getHoraFichaje() != null &&
                        !f.getHoraFichaje().isBefore(inicioT) &&
                        !f.getHoraFichaje().isAfter(finT))
                .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                .toList();

        // 3. Verificación de ausencias en memoria
        try {
            evaluadorService.asegurarAusenciasEmpleadoRango(emp, horarios, fichajesPeriodo, fechaInicio, fechaFin);
        } catch (Exception e) {
            log.warn("Error al asegurar ausencias en rango para empleado {}: {}", emp.getId(), e.getMessage());
        }

        // 4. Incidentes del período
        List<IncidenteAsistencia> incsPeriodo = incidenteRepo.buscarFiltradoPaginadoRango(
                fechaInicio, fechaFin, null, null, null, emp.getNroLegajo(), org.springframework.data.domain.Pageable.unpaged()
        ).getContent().stream()
                .filter(i -> i.getEmpleado() != null && i.getEmpleado().getId().equals(emp.getId()))
                .toList();

        // 5. Línea de tiempo diaria específica
        List<FichaComportamientoDTO.IntervaloLineaTiempoDTO> planificados = new ArrayList<>();
        List<FichaComportamientoDTO.IntervaloLineaTiempoDTO> presencias = new ArrayList<>();
        List<FichaComportamientoDTO.DesgloseIntervaloDTO> desglose = new ArrayList<>();
        List<FichaComportamientoDTO.FichajeBrutoDTO> brutos = new ArrayList<>();

        String primeraEntradaStr = "--:--";
        String ultimoEgresoStr = "--:--";

        List<EmpleadoFichaje> fichajesDia = fichajesPeriodo.stream()
                .filter(f -> f.getHoraFichaje().toLocalDate().equals(fechaBase))
                .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                .toList();

        int diaSemanaConsulta = fechaBase.getDayOfWeek().getValue();
        for (EmpleadoHorario h : horarios) {
            if (h.getDiaSemana() != null && h.getDiaSemana() == diaSemanaConsulta) {
                if (h.getHoraEntrada() != null && h.getHoraSalida() != null) {
                    double ini = h.getHoraEntrada().getHour() * 60.0 + h.getHoraEntrada().getMinute();
                    double fin = h.getHoraSalida().getHour() * 60.0 + h.getHoraSalida().getMinute();
                    planificados.add(new FichaComportamientoDTO.IntervaloLineaTiempoDTO(
                            h.getMateria() != null ? h.getMateria().getNombre() : (h.getEtiqueta() != null ? h.getEtiqueta() : "Planificado"),
                            h.getHoraEntrada().toString().substring(0, 5),
                            h.getHoraSalida().toString().substring(0, 5),
                            ini,
                            fin - ini,
                            "PLANIFICADO"
                    ));
                }
            }
        }

        for (EmpleadoFichaje f : fichajesDia) {
            brutos.add(new FichaComportamientoDTO.FichajeBrutoDTO(
                    f.getId(),
                    f.getHoraFichaje().toLocalTime().toString().substring(0, 5),
                    f.getTipoEvento(),
                    f.getNombreReloj() != null ? f.getNombreReloj() : "Reloj Biométrico",
                    f.getEstadoFichaje()
            ));
        }

        int maxTiempoFuera = (emp.getTiempoMaxFueraMin() != null) ? emp.getTiempoMaxFueraMin() : 45;

        for (int i = 0; i < fichajesDia.size(); i++) {
            EmpleadoFichaje act = fichajesDia.get(i);
            if (i == 0) primeraEntradaStr = act.getHoraFichaje().toLocalTime().toString().substring(0, 5);
            if (i == fichajesDia.size() - 1) ultimoEgresoStr = act.getHoraFichaje().toLocalTime().toString().substring(0, 5);

            if (i < fichajesDia.size() - 1) {
                EmpleadoFichaje sig = fichajesDia.get(i + 1);
                long dur = Duration.between(act.getHoraFichaje(), sig.getHoraFichaje()).toMinutes();
                if (dur <= 0) continue;

                boolean esSalida = esTipoSalida(act.getTipoEvento());
                boolean esIngreso = esTipoIngreso(sig.getTipoEvento());
                double iniMinutos = act.getHoraFichaje().getHour() * 60.0 + act.getHoraFichaje().getMinute();

                if (!esSalida) {
                    presencias.add(new FichaComportamientoDTO.IntervaloLineaTiempoDTO(
                            dur + "m", act.getHoraFichaje().toLocalTime().toString().substring(0, 5),
                            sig.getHoraFichaje().toLocalTime().toString().substring(0, 5),
                            iniMinutos, (double) dur, "PRESENCIA"
                    ));
                    desglose.add(new FichaComportamientoDTO.DesgloseIntervaloDTO(
                            "Presencia", act.getHoraFichaje().toLocalTime().toString().substring(0, 5) + " hs",
                            sig.getHoraFichaje().toLocalTime().toString().substring(0, 5) + " hs",
                            formatearMinutosAHoras(dur), "Normal", false
                    ));
                } else if (esIngreso) {
                    boolean excede = dur > maxTiempoFuera;
                    presencias.add(new FichaComportamientoDTO.IntervaloLineaTiempoDTO(
                            dur + "m", act.getHoraFichaje().toLocalTime().toString().substring(0, 5),
                            sig.getHoraFichaje().toLocalTime().toString().substring(0, 5),
                            iniMinutos, (double) dur, excede ? "INFRACCION" : "SALIDA_INTERMEDIA"
                    ));
                    desglose.add(new FichaComportamientoDTO.DesgloseIntervaloDTO(
                            "Salida Intermedia", act.getHoraFichaje().toLocalTime().toString().substring(0, 5) + " hs",
                            sig.getHoraFichaje().toLocalTime().toString().substring(0, 5) + " hs",
                            dur + " min", excede ? "Excede tiempo permitido" : "Autorizado", excede
                    ));
                }
            }
        }

        List<FichaComportamientoDTO.IncidenteFichaDTO> incidentesList = incsPeriodo.stream()
                .map(i -> new FichaComportamientoDTO.IncidenteFichaDTO(
                        i.getId(), i.getFecha(),
                        i.getHora() != null ? i.getHora().toString().substring(0, 5) : "--:--",
                        i.getSeveridad(), i.getTipo(), i.getDetalle(), i.getEstado(),
                        i.getResolucionMotivo(), i.getResolucionObservaciones()
                )).toList();

        // 6. Desglose día por día
        List<FichaComportamientoDTO.DiaDesgloseDTO> diasDesglose = new ArrayList<>();
        LocalDate cur = fechaInicio;
        LocalDate hoy = LocalDate.now();

        int diasConPresencia = 0;
        int diasEvaluadosHastaHoy = 0;

        double totalHorasUtilesPeriodo = 0.0;
        double totalHorasTeoricasPeriodo = 0.0;
        long totalMinutosAFavor = 0;
        long totalMinutosEnContra = 0;
        int diasConDeficit = 0;
        int diasConHorasExtra = 0;

        // Acumuladores de docencia exclusivamente para días con materias
        long totalMinClasesTeoricasPeriodo = 0;
        long totalMinClasesEfectivasPeriodo = 0;

        while (!cur.isAfter(fechaFin)) {
            LocalDate d = cur;
            boolean esFuturo = d.isAfter(hoy);

            double horasTeoricasDia = horarioService.calcularHorasTeoricasDia(emp.getId(), d);
            long minutosTeoricosDia = Math.round(horasTeoricasDia * 60.0);

            ResumenPresenciaFichajesDTO resDia = evaluadorService.calcularHorasRealesDia(emp.getId(), d);

            List<EmpleadoFichaje> fDia = fichajesPeriodo.stream()
                    .filter(f -> f.getHoraFichaje().toLocalDate().equals(d))
                    .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                    .toList();

            boolean huboPresencia = resDia.horasNetasTrabajadas() > 0 || !fDia.isEmpty();
            if (huboPresencia) diasConPresencia++;

            long minNetosDia = (long) (resDia.horasNetasTrabajadas() * 60);

            int cumplimientoDia = 0;
            long minutosDiferencia = 0;

            int incsDia = (int) incsPeriodo.stream()
                    .filter(i -> i.getFecha().equals(d))
                    .map(i -> i.getIdEventoAgrupador() != null ? i.getIdEventoAgrupador() : ("ID_" + i.getId()))
                    .distinct()
                    .count();

            String estadoDia;

            if (esFuturo) {
                cumplimientoDia = 0;
                minutosDiferencia = 0;
                estadoDia = (minutosTeoricosDia == 0) ? "FRANCO" : "FUTURO";
            } else {
                diasEvaluadosHastaHoy++;
                totalHorasTeoricasPeriodo += horasTeoricasDia;

                if (minutosTeoricosDia > 0) {
                    if (minNetosDia >= minutosTeoricosDia) {
                        cumplimientoDia = 100;
                        totalHorasUtilesPeriodo += horasTeoricasDia;
                        long sobrante = minNetosDia - minutosTeoricosDia;
                        if (sobrante > 0) {
                            minutosDiferencia = sobrante;
                            totalMinutosAFavor += sobrante;
                            diasConHorasExtra++;
                        }
                    } else {
                        cumplimientoDia = (int) Math.round(((double) minNetosDia / minutosTeoricosDia) * 100.0);
                        totalHorasUtilesPeriodo += (minNetosDia / 60.0);
                        long faltante = minutosTeoricosDia - minNetosDia;
                        minutosDiferencia = -faltante;
                        totalMinutosEnContra += faltante;
                        diasConDeficit++;
                    }
                } else {
                    if (minNetosDia > 0) {
                        cumplimientoDia = 100;
                        minutosDiferencia = minNetosDia;
                        totalMinutosAFavor += minNetosDia;
                        diasConHorasExtra++;
                    }
                }

                if (minutosTeoricosDia == 0 && !huboPresencia) {
                    estadoDia = "FRANCO";
                } else if (minutosTeoricosDia == 0 && huboPresencia) {
                    estadoDia = "EXTRA";
                } else if (!huboPresencia) {
                    estadoDia = "SIN_REGISTRO";
                } else if (incsDia > 0 || cumplimientoDia < 100) {
                    estadoDia = "DESVIO";
                } else {
                    estadoDia = "NORMAL";
                }
            }

            String entDia = fDia.isEmpty() ? "--:--" : fDia.get(0).getHoraFichaje().toLocalTime().toString().substring(0, 5);
            String salDia = fDia.size() < 2 ? "--:--" : fDia.get(fDia.size() - 1).getHoraFichaje().toLocalTime().toString().substring(0, 5);

            // =========================================================================
            // REGLA CLAVE: COMPARAR ÚNICAMENTE DÍAS CON CLASES ASIGNADAS
            // =========================================================================
            List<EmpleadoHorario> clasesDelDia = horarios.stream()
                    .filter(h -> h.getMateria() != null && h.getDiaSemana() != null && h.getDiaSemana() == d.getDayOfWeek().getValue())
                    .toList();

            long minClaseTeoricos = 0;
            long minClaseEfectivos = 0;
            String clasesDictadasTexto = null;

            if (esDocente && !clasesDelDia.isEmpty()) {
                minClaseTeoricos = evaluadorService.calcularMinutosClaseTeoricos(clasesDelDia);
                if (!esFuturo) {
                    minClaseEfectivos = evaluadorService.calcularMinutosClaseEfectivos(clasesDelDia, fDia, d);
                    totalMinClasesTeoricasPeriodo += minClaseTeoricos;
                    totalMinClasesEfectivasPeriodo += minClaseEfectivos;
                }

                if (minClaseTeoricos > 0) {
                    int porc = (int) Math.min(100, Math.round(((double) minClaseEfectivos / minClaseTeoricos) * 100.0));
                    clasesDictadasTexto = formatearMinutosAHoras(minClaseEfectivos) + " / " + formatearMinutosAHoras(minClaseTeoricos) + " (" + porc + "%)";
                }
            }

            diasDesglose.add(new FichaComportamientoDTO.DiaDesgloseDTO(
                    d, diaSemanaTresLetras(d.getDayOfWeek().getValue()),
                    entDia, salDia, formatearMinutosAHoras(minNetosDia), minNetosDia,
                    resDia.cantidadSalidasIntermedias(), (long) (resDia.horasSalidasIntermedias() * 60),
                    incsDia, cumplimientoDia, estadoDia, minutosDiferencia,
                    clasesDictadasTexto, minClaseTeoricos, minClaseEfectivos
            ));

            cur = cur.plusDays(1);
        }

        int porcentajeCumplimiento = totalHorasTeoricasPeriodo > 0 ?
                (int) Math.min(100, Math.round((totalHorasUtilesPeriodo / totalHorasTeoricasPeriodo) * 100.0)) :
                (diasConPresencia > 0 ? 100 : 0);

        int totalDiasParaMetrica = Math.max(1, diasEvaluadosHastaHoy);
        LocalDate fechaLimiteResumen = fechaFin.isAfter(hoy) ? hoy : fechaFin;

        ResumenPresenciaFichajesDTO resumenPeriodo = ("DIARIO".equals(mod))
                ? evaluadorService.calcularHorasRealesDia(emp.getId(), fechaBase)
                : evaluadorService.calcularHorasRealesRango(emp.getId(), fechaInicio, fechaLimiteResumen);

        long totalMinutosPresencia = (long) (resumenPeriodo.horasNetasTrabajadas() * 60);
        long totalMinutosFuera = (long) (resumenPeriodo.horasSalidasIntermedias() * 60);

        String primeraEntradaResultado = primeraEntradaStr;
        String ultimoEgresoResultado = ultimoEgresoStr;

        if (!"DIARIO".equals(mod)) {
            primeraEntradaResultado = diasConPresencia + " de " + totalDiasParaMetrica + " días transcurridos";
            if (diasConPresencia > 0) {
                long promMinutos = totalMinutosPresencia / diasConPresencia;
                ultimoEgresoResultado = "Prom: " + (promMinutos / 60) + "h " + (promMinutos % 60) + "m/día";
            } else {
                ultimoEgresoResultado = "Prom: 0h 0m/día";
            }
        }

        int totalIncidentesAgrupados = (int) incsPeriodo.stream()
                .map(i -> i.getIdEventoAgrupador() != null ? i.getIdEventoAgrupador() : ("ID_" + i.getId()))
                .distinct().count();

        int incidentesProcesados = (int) incsPeriodo.stream().filter(i -> {
            String estado = i.getEstado();
            return "JUSTIFICADA".equalsIgnoreCase(estado) || "OBSERVADA".equalsIgnoreCase(estado) || "RECHAZADA".equalsIgnoreCase(estado);
        }).count();

        // Total de Clases Dictadas para la tarjeta superior
        String clasesDictadasGral;
        if (esDocente && totalMinClasesTeoricasPeriodo > 0) {
            int porcGlobal = (int) Math.min(100, Math.round(((double) totalMinClasesEfectivasPeriodo / totalMinClasesTeoricasPeriodo) * 100.0));
            clasesDictadasGral = formatearMinutosAHoras(totalMinClasesEfectivasPeriodo) + " / " + formatearMinutosAHoras(totalMinClasesTeoricasPeriodo) + " (" + porcGlobal + "%)";
        } else {
            clasesDictadasGral = "0h 0m / 0h 0m (0%)";
        }

        FichaComportamientoDTO.MetricasFichaDTO metricasDTO = new FichaComportamientoDTO.MetricasFichaDTO(
                primeraEntradaResultado, ultimoEgresoResultado,
                formatearMinutosAHoras(totalMinutosPresencia), totalMinutosPresencia,
                resumenPeriodo.cantidadSalidasIntermedias(), totalMinutosFuera,
                totalIncidentesAgrupados, incidentesProcesados, diasConPresencia, totalDiasParaMetrica,
                formatearMinutosAHoras(totalMinutosAFavor), totalMinutosAFavor,
                formatearMinutosAHoras(totalMinutosEnContra), totalMinutosEnContra,
                diasConDeficit, diasConHorasExtra, clasesDictadasGral
        );

        // Agrupación de meses para Trimestre y Cuatrimestre
        List<FichaComportamientoDTO.MesResumenDTO> mesesPeriodo = new ArrayList<>();
        if (mod.equals("TRIMESTRE") || mod.equals("CUATRIMESTRE")) {
            Map<String, List<FichaComportamientoDTO.DiaDesgloseDTO>> diasPorMes = new LinkedHashMap<>();
            for (var d : diasDesglose) {
                String mesKey = d.fecha().toString().substring(0, 7);
                diasPorMes.computeIfAbsent(mesKey, k -> new ArrayList<>()).add(d);
            }

            int orden = 1;
            for (var entry : diasPorMes.entrySet()) {
                String mesKey = entry.getKey();
                List<FichaComportamientoDTO.DiaDesgloseDTO> diasDelMes = entry.getValue();

                long minsNetosMes = diasDelMes.stream().mapToLong(FichaComportamientoDTO.DiaDesgloseDTO::presenciaNetaMinutos).sum();
                int diasSedeMes = (int) diasDelMes.stream().filter(d -> d.presenciaNetaMinutos() > 0).count();
                int incidentesMes = diasDelMes.stream().mapToInt(FichaComportamientoDTO.DiaDesgloseDTO::totalIncidentes).sum();

                long teoMes = diasDelMes.stream().mapToLong(d -> (long) d.horasClaseTeoricas()).sum();
                long efecMes = diasDelMes.stream().mapToLong(d -> (long) d.horasClaseEfectivas()).sum();
                String clasesTxt = "0h 0m / 0h 0m (0%)";
                if (esDocente && teoMes > 0) {
                    int porcMes = (int) Math.min(100, Math.round(((double) efecMes / teoMes) * 100.0));
                    clasesTxt = formatearMinutosAHoras(efecMes) + " / " + formatearMinutosAHoras(teoMes) + " (" + porcMes + "%)";
                }

                LocalDate primerDiaMes = diasDelMes.get(0).fecha();
                int offset = primerDiaMes.getDayOfWeek().getValue() - 1;
                String nombreMes = primerDiaMes.getMonth().getDisplayName(TextStyle.FULL, Locale.of("es", "ES"));
                nombreMes = nombreMes.substring(0, 1).toUpperCase() + nombreMes.substring(1) + " de " + primerDiaMes.getYear();

                mesesPeriodo.add(new FichaComportamientoDTO.MesResumenDTO(
                        mesKey, orden++, nombreMes, offset, formatearMinutosAHoras(minsNetosMes), diasSedeMes, incidentesMes, clasesTxt, diasDelMes
                ));
            }
        }

        String rolOArea = (emp.getCargos() != null && !emp.getCargos().isEmpty())
                ? emp.getCargos().get(0).getNombre() : "Personal Institucional";

        return new FichaComportamientoDTO(
                emp.getId(), emp.getApellido() + ", " + emp.getNombre(),
                emp.getNroLegajo(), emp.getDni(), rolOArea, "Departamento de Ciencias Básicas",
                Boolean.TRUE.equals(emp.getActivo()), etiquetaTurno, mod, periodoTexto,
                porcentajeCumplimiento, metricasDTO, planificados, presencias,
                desglose, incidentesList, brutos, diasDesglose, mesesPeriodo
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

    private String formatearMinutosAHoras(long minutos) {
        long h = minutos / 60;
        long m = minutos % 60;
        return h + "h " + m + "m";
    }

    private String diaSemanaTresLetras(int dia) {
        return switch (dia) {
            case 1 -> "Lun";
            case 2 -> "Mar";
            case 3 -> "Mié";
            case 4 -> "Jue";
            case 5 -> "Vie";
            case 6 -> "Sáb";
            case 7 -> "Dom";
            default -> "-";
        };
    }
}