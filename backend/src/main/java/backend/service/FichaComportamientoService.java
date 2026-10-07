package backend.service;

import backend.dto.FichaComportamientoDTO;
import backend.dto.ResumenPresenciaFichajesDTO;
import backend.model.*;
import backend.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
public class FichaComportamientoService {

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

    @Transactional(readOnly = true)
    public FichaComportamientoDTO obtenerFicha(Long empleadoId, String modalidad, LocalDate fechaConsulta) {
        Empleado emp = empleadoRepo.findById(empleadoId)
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado con ID: " + empleadoId));

        // Variable efectivamente final para streams y lambdas
        final LocalDate fechaBase = (fechaConsulta != null) ? fechaConsulta : LocalDate.now();

        LocalDate fechaInicio;
        LocalDate fechaFin;
        String periodoTexto;

        String mod = (modalidad != null) ? modalidad.toUpperCase() : "DIARIO";

        switch (mod) {
            case "SEMANAL" -> {
                fechaInicio = fechaBase.minusDays(fechaBase.getDayOfWeek().getValue() - 1);
                fechaFin = fechaInicio.plusDays(6);
                periodoTexto = fechaInicio + " → " + fechaFin;
            }
            case "MENSUAL" -> {
                fechaInicio = fechaBase.withDayOfMonth(1);
                fechaFin = fechaBase.withDayOfMonth(fechaBase.lengthOfMonth());
                periodoTexto = fechaBase.getMonth().name() + " " + fechaBase.getYear();
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

        String etiquetaTurno = "Sin turno asignado";
        if (!horarios.isEmpty()) {
            boolean tieneMaterias = horarios.stream().anyMatch(h -> h.getMateria() != null);
            if (tieneMaterias) {
                etiquetaTurno = "Por Cátedra (" + horarios.size() + " clases)";
            } else if (horarios.get(0).getEtiqueta() != null && !horarios.get(0).getEtiqueta().isBlank()) {
                etiquetaTurno = horarios.get(0).getEtiqueta();
            } else {
                etiquetaTurno = "Jornada Regular";
            }
        }

        // 2. Fichajes del período
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

        // 3. Incidentes del período
        List<IncidenteAsistencia> incsPeriodo = incidenteRepo.buscarFiltradoPaginadoRango(
                fechaInicio, fechaFin, null, null, null, emp.getNroLegajo(), org.springframework.data.domain.Pageable.unpaged()
        ).getContent();

        // 4. Detalle y línea de tiempo (Jornada del día consultado)
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
            if (i == 0) {
                primeraEntradaStr = act.getHoraFichaje().toLocalTime().toString().substring(0, 5);
            }
            if (i == fichajesDia.size() - 1) {
                ultimoEgresoStr = act.getHoraFichaje().toLocalTime().toString().substring(0, 5);
            }

            if (i < fichajesDia.size() - 1) {
                EmpleadoFichaje sig = fichajesDia.get(i + 1);
                long dur = Duration.between(act.getHoraFichaje(), sig.getHoraFichaje()).toMinutes();
                if (dur <= 0) continue;

                boolean esSalida = esTipoSalida(act.getTipoEvento());
                boolean esIngreso = esTipoIngreso(sig.getTipoEvento());
                double iniMinutos = act.getHoraFichaje().getHour() * 60.0 + act.getHoraFichaje().getMinute();

                if (!esSalida) {
                    presencias.add(new FichaComportamientoDTO.IntervaloLineaTiempoDTO(
                            dur + "m",
                            act.getHoraFichaje().toLocalTime().toString().substring(0, 5),
                            sig.getHoraFichaje().toLocalTime().toString().substring(0, 5),
                            iniMinutos,
                            (double) dur,
                            "PRESENCIA"
                    ));
                    desglose.add(new FichaComportamientoDTO.DesgloseIntervaloDTO(
                            "Presencia",
                            act.getHoraFichaje().toLocalTime().toString().substring(0, 5) + " hs",
                            sig.getHoraFichaje().toLocalTime().toString().substring(0, 5) + " hs",
                            formatearMinutosAHoras(dur),
                            "Normal",
                            false
                    ));
                } else if (esIngreso) {
                    boolean excede = dur > maxTiempoFuera;
                    presencias.add(new FichaComportamientoDTO.IntervaloLineaTiempoDTO(
                            dur + "m",
                            act.getHoraFichaje().toLocalTime().toString().substring(0, 5),
                            sig.getHoraFichaje().toLocalTime().toString().substring(0, 5),
                            iniMinutos,
                            (double) dur,
                            excede ? "INFRACCION" : "SALIDA_INTERMEDIA"
                    ));
                    desglose.add(new FichaComportamientoDTO.DesgloseIntervaloDTO(
                            "Salida Intermedia",
                            act.getHoraFichaje().toLocalTime().toString().substring(0, 5) + " hs",
                            sig.getHoraFichaje().toLocalTime().toString().substring(0, 5) + " hs",
                            dur + " min",
                            excede ? "Excede tiempo permitido" : "Autorizado",
                            excede
                    ));
                }
            }
        }

        List<FichaComportamientoDTO.IncidenteFichaDTO> incidentesList = incsPeriodo.stream()
                .map(i -> new FichaComportamientoDTO.IncidenteFichaDTO(
                        i.getId(),
                        i.getHora() != null ? i.getHora().toString().substring(0, 5) : "--:--",
                        i.getSeveridad(),
                        i.getTipo(),
                        i.getDetalle(),
                        i.getEstado()
                )).toList();

        // 5. Métricas globales y cumplimiento porcentual
        ResumenPresenciaFichajesDTO resumenPeriodo = ("DIARIO".equals(mod))
                ? evaluadorService.calcularHorasRealesDia(emp.getId(), fechaBase)
                : evaluadorService.calcularHorasRealesRango(emp.getId(), fechaInicio, fechaFin);

        int porcentajeCumplimiento = evaluadorService.calcularPorcentajeCumplimiento(emp.getId(), mod, fechaBase);

        // 6. Desglose día por día para Semanal y Mensual
        List<FichaComportamientoDTO.DiaDesgloseDTO> diasDesglose = new ArrayList<>();
        LocalDate cur = fechaInicio;
        int diasConPresencia = 0;

        while (!cur.isAfter(fechaFin)) {
            LocalDate d = cur;
            double horasTeoricasDia = horarioService.calcularHorasTeoricasDia(emp.getId(), d);
            ResumenPresenciaFichajesDTO resDia = evaluadorService.calcularHorasRealesDia(emp.getId(), d);

            List<EmpleadoFichaje> fDia = fichajesPeriodo.stream()
                    .filter(f -> f.getHoraFichaje().toLocalDate().equals(d))
                    .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                    .toList();

            boolean huboPresencia = resDia.horasNetasTrabajadas() > 0 || !fDia.isEmpty();
            if (huboPresencia) diasConPresencia++;

            int cumplimientoDia = 0;
            if (horasTeoricasDia > 0) {
                cumplimientoDia = (int) Math.min(100, Math.round((resDia.horasNetasTrabajadas() / horasTeoricasDia) * 100.0));
            } else if (resDia.horasNetasTrabajadas() > 0) {
                cumplimientoDia = 100;
            }

            int incsDia = (int) incsPeriodo.stream().filter(i -> i.getFecha().equals(d)).count();
            String estadoDia;
            if (horasTeoricasDia == 0 && !huboPresencia) {
                estadoDia = "FRANCO";
            } else if (!huboPresencia) {
                estadoDia = "SIN_REGISTRO";
            } else if (incsDia > 0) {
                estadoDia = "INFRACCION";
            } else {
                estadoDia = "NORMAL";
            }

            String entDia = fDia.isEmpty() ? "--:--" : fDia.get(0).getHoraFichaje().toLocalTime().toString().substring(0, 5);
            String salDia = fDia.size() < 2 ? "--:--" : fDia.get(fDia.size() - 1).getHoraFichaje().toLocalTime().toString().substring(0, 5);

            long minNetosDia = (long) (resDia.horasNetasTrabajadas() * 60);

            diasDesglose.add(new FichaComportamientoDTO.DiaDesgloseDTO(
                    d,
                    diaSemanaTresLetras(d.getDayOfWeek().getValue()),
                    entDia,
                    salDia,
                    formatearMinutosAHoras(minNetosDia),
                    minNetosDia,
                    resDia.cantidadSalidasIntermedias(),
                    (long) (resDia.horasSalidasIntermedias() * 60),
                    incsDia,
                    cumplimientoDia,
                    estadoDia
            ));

            cur = cur.plusDays(1);
        }

        int totalDiasPeriodo = (int) Duration.between(fechaInicio.atStartOfDay(), fechaFin.atStartOfDay()).toDays() + 1;
        long totalMinutosPresencia = (long) (resumenPeriodo.horasNetasTrabajadas() * 60);
        long totalMinutosFuera = (long) (resumenPeriodo.horasSalidasIntermedias() * 60);

        String primeraEntradaResultado = primeraEntradaStr;
        String ultimoEgresoResultado = ultimoEgresoStr;

        if (!"DIARIO".equals(mod)) {
            primeraEntradaResultado = diasConPresencia + " de " + totalDiasPeriodo + " días";
            if (diasConPresencia > 0) {
                long promMinutos = totalMinutosPresencia / diasConPresencia;
                ultimoEgresoResultado = "Prom: " + (promMinutos / 60) + "h " + (promMinutos % 60) + "m/día";
            } else {
                ultimoEgresoResultado = "Prom: 0h 0m/día";
            }
        }

        FichaComportamientoDTO.MetricasFichaDTO metricasDTO = new FichaComportamientoDTO.MetricasFichaDTO(
                primeraEntradaResultado,
                ultimoEgresoResultado,
                formatearMinutosAHoras(totalMinutosPresencia),
                totalMinutosPresencia,
                resumenPeriodo.cantidadSalidasIntermedias(),
                totalMinutosFuera,
                incsPeriodo.size(),
                (int) incsPeriodo.stream().filter(i -> "JUSTIFICADA".equalsIgnoreCase(i.getEstado())).count(),
                diasConPresencia,
                totalDiasPeriodo
        );

        String rolOArea = (emp.getCargos() != null && !emp.getCargos().isEmpty())
                ? emp.getCargos().get(0).getNombre()
                : "Personal Institucional";

        return new FichaComportamientoDTO(
                emp.getId(),
                emp.getApellido() + ", " + emp.getNombre(),
                emp.getNroLegajo(),
                emp.getDni(),
                rolOArea,
                "Departamento de Ciencias Básicas",
                Boolean.TRUE.equals(emp.getActivo()),
                etiquetaTurno,
                mod,
                periodoTexto,
                porcentajeCumplimiento,
                metricasDTO,
                planificados,
                presencias,
                desglose,
                incidentesList,
                brutos,
                diasDesglose
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