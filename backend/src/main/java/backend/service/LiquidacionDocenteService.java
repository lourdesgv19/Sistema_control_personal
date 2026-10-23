package backend.service;

import backend.dto.LiquidacionDocenteDTO.*;
import backend.model.*;
import backend.repositories.*;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LiquidacionDocenteService {

    private final EmpleadoHorarioRepository horarioRepo;
    private final EmpleadoFichajeRepository fichajeRepo;
    private final IncidenteAsistenciaRepository incidenteRepo;
    private final EvaluadorIncidentesService evaluadorService;

    public LiquidacionDocenteService(
            EmpleadoHorarioRepository horarioRepo,
            EmpleadoFichajeRepository fichajeRepo,
            IncidenteAsistenciaRepository incidenteRepo,
            EvaluadorIncidentesService evaluadorService) {
        this.horarioRepo = horarioRepo;
        this.fichajeRepo = fichajeRepo;
        this.incidenteRepo = incidenteRepo;
        this.evaluadorService = evaluadorService;
    }

    @Transactional(readOnly = true)
    public LiquidacionGlobalDTO calcularLiquidacion(
            String modalidad,
            LocalDate fechaBase,
            LocalDate fechaDesde,
            LocalDate fechaHasta,
            Integer mes,
            Integer anio,
            Integer trimestre,
            Integer cuatrimestre,
            Long idDocenteFiltro) {

        final LocalDate hoy = LocalDate.now();
        final LocalDate base = (fechaBase != null) ? fechaBase : hoy;
        final int anioFiltro = (anio != null) ? anio : base.getYear();

        LocalDate rInicio;
        LocalDate rFin;
        String mod = (modalidad != null) ? modalidad.toUpperCase() : "SEMANAL";
        String periodoTexto;

        switch (mod) {
            case "DIARIO" -> {
                rInicio = base;
                rFin = base;
                periodoTexto = base.toString();
            }
            case "SEMANAL" -> {
                rInicio = base.minusDays(base.getDayOfWeek().getValue() - 1);
                rFin = rInicio.plusDays(5); // Lunes a Sábado institucional
                periodoTexto = "Semana del " + formatearFecha(rInicio) + " al " + formatearFecha(rFin);
            }
            case "MES", "MENSUAL" -> {
                int m = (mes != null) ? mes : base.getMonthValue();
                rInicio = LocalDate.of(anioFiltro, m, 1);
                rFin = rInicio.withDayOfMonth(rInicio.lengthOfMonth());
                String mesEsp = rInicio.getMonth().getDisplayName(TextStyle.FULL, Locale.of("es", "ES"));
                periodoTexto = "Mes de " + capitalizar(mesEsp) + " " + anioFiltro;
            }
            case "TRIMESTRE" -> {
                int trim = (trimestre != null) ? trimestre : ((base.getMonthValue() - 1) / 3 + 1);
                int mesIni = (trim - 1) * 3 + 1;
                rInicio = LocalDate.of(anioFiltro, mesIni, 1);
                rFin = rInicio.plusMonths(3).minusDays(1);
                periodoTexto = "Q" + trim + " (" + formatearFecha(rInicio) + " a " + formatearFecha(rFin) + ") " + anioFiltro;
            }
            case "CUATRIMESTRE" -> {
                int cuat = (cuatrimestre != null) ? cuatrimestre : (base.getMonthValue() <= 6 ? 1 : 2);
                if (cuat == 1) {
                    rInicio = LocalDate.of(anioFiltro, 3, 1);
                    rFin = LocalDate.of(anioFiltro, 6, 30);
                    periodoTexto = "1° Cuatrimestre (Mar-Jun) " + anioFiltro;
                } else {
                    rInicio = LocalDate.of(anioFiltro, 8, 1);
                    rFin = LocalDate.of(anioFiltro, 11, 30);
                    periodoTexto = "2° Cuatrimestre (Ago-Nov) " + anioFiltro;
                }
            }
            case "ANUAL" -> {
                rInicio = LocalDate.of(anioFiltro, 1, 1);
                rFin = LocalDate.of(anioFiltro, 12, 31);
                periodoTexto = "Ciclo Lectivo Anual " + anioFiltro;
            }
            case "RANGO", "RANGO_FECHAS" -> {
                rInicio = (fechaDesde != null) ? fechaDesde : base;
                rFin = (fechaHasta != null && !fechaHasta.isBefore(rInicio)) ? fechaHasta : rInicio;
                periodoTexto = formatearFecha(rInicio) + " al " + formatearFecha(rFin);
            }
            default -> {
                rInicio = base.minusDays(base.getDayOfWeek().getValue() - 1);
                rFin = rInicio.plusDays(5);
                periodoTexto = "Semana del " + formatearFecha(rInicio) + " al " + formatearFecha(rFin);
            }
        }

        List<EmpleadoHorario> todosHorariosCatedras = horarioRepo.findAll().stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .filter(h -> h.getMateria() != null && h.getEmpleado() != null)
                .filter(h -> Boolean.TRUE.equals(h.getEmpleado().getActivo()))
                .filter(h -> idDocenteFiltro == null || h.getEmpleado().getId().equals(idDocenteFiltro))
                .toList();

        Map<Empleado, List<EmpleadoHorario>> horariosPorDocente = todosHorariosCatedras.stream()
                .collect(Collectors.groupingBy(EmpleadoHorario::getEmpleado));

        List<EmpleadoFichaje> fichajesPeriodo = fichajeRepo.findAll().stream()
                .filter(f -> Boolean.TRUE.equals(f.getActivo()))
                .filter(f -> "valido".equalsIgnoreCase(f.getEstadoFichaje()))
                .filter(f -> f.getHoraFichaje() != null &&
                        !f.getHoraFichaje().toLocalDate().isBefore(rInicio) &&
                        !f.getHoraFichaje().toLocalDate().isAfter(rFin))
                .toList();

        List<IncidenteAsistencia> incidentesPeriodo = incidenteRepo.buscarFiltradoPaginadoRango(
                rInicio, rFin, null, null, null, null, Pageable.unpaged()
        ).getContent();

        List<DocenteLiquidacionDTO> listaDocentes = new ArrayList<>();

        double sumPagoEstimadoPeriodo = 0.0;
        double sumPagoIdealHastaHoy = 0.0;
        double sumPagoReal = 0.0;
        double sumMontoDescontado = 0.0;
        
        double sumHorasProgPeriodo = 0.0;
        double sumHorasProgHastaHoy = 0.0;
        double sumHorasDict = 0.0;
        double sumHorasDesc = 0.0;
        
        int sumClasesPeriodo = 0;
        int sumClasesHastaHoy = 0;

        double causaFaltas = 0.0;
        double causaTardanzas = 0.0;
        double causaRetiros = 0.0;
        double causaSalidas = 0.0;

        for (Map.Entry<Empleado, List<EmpleadoHorario>> entry : horariosPorDocente.entrySet()) {
            Empleado docente = entry.getKey();
            List<EmpleadoHorario> franjasDocente = entry.getValue();

            List<EmpleadoFichaje> fichajesDocente = fichajesPeriodo.stream()
                    .filter(f -> f.getEmpleado() != null && f.getEmpleado().getId().equals(docente.getId()))
                    .toList();

            List<IncidenteAsistencia> incidentesDocente = incidentesPeriodo.stream()
                    .filter(i -> i.getEmpleado() != null && i.getEmpleado().getId().equals(docente.getId()))
                    .toList();

            Map<Long, List<EmpleadoHorario>> porMateria = franjasDocente.stream()
                    .collect(Collectors.groupingBy(h -> h.getMateria().getId()));

            List<ComisionLiquidacionDTO> comisionesDTO = new ArrayList<>();
            List<DesvioDocenteDTO> desviosDocente = new ArrayList<>();

            double docHorasProgPeriodo = 0.0;
            double docHorasProgHastaHoy = 0.0;
            double docHorasDict = 0.0;
            double docPagoEstimado = 0.0;
            double docPagoIdealHastaHoy = 0.0;
            double docPagoReal = 0.0;
            int docClasesPeriodoTotal = 0;
            int docClasesHastaHoyTotal = 0;

            for (Map.Entry<Long, List<EmpleadoHorario>> matEntry : porMateria.entrySet()) {
                List<EmpleadoHorario> subFranjas = matEntry.getValue();
                EmpleadoHorario rep = subFranjas.get(0);
                Materia m = rep.getMateria();

                double tarifaHora = (m.getTarifaHoraCatedra() != null && m.getTarifaHoraCatedra().compareTo(BigDecimal.ZERO) > 0)
                        ? m.getTarifaHoraCatedra().doubleValue()
                        : 5800.0;

                Set<String> diasTexto = subFranjas.stream()
                        .map(h -> diaNumeroCorto(h.getDiaSemana()))
                        .collect(Collectors.toCollection(LinkedHashSet::new));

                String horarioTexto = (rep.getHoraEntrada() != null && rep.getHoraSalida() != null)
                        ? rep.getHoraEntrada().toString().substring(0, 5) + " - " + rep.getHoraSalida().toString().substring(0, 5) + " hs"
                        : "--:--";

                double comHorasProgPeriodo = 0.0;
                double comHorasProgHastaHoy = 0.0;
                double comHorasDict = 0.0;
                int comClasesPeriodo = 0;
                int comClasesHastaHoy = 0;
                List<DesvioDocenteDTO> desviosComision = new ArrayList<>();

                LocalDate cur = rInicio;
                while (!cur.isAfter(rFin)) {
                    if (cur.getDayOfWeek().getValue() != 7) { // Excluir domingos
                        int diaSem = cur.getDayOfWeek().getValue();
                        final LocalDate fActual = cur;
                        boolean esFuturo = cur.isAfter(hoy);

                        List<EmpleadoHorario> clasesDeHoy = subFranjas.stream()
                                .filter(h -> h.getDiaSemana() != null && h.getDiaSemana() == diaSem)
                                .toList();

                        for (EmpleadoHorario clase : clasesDeHoy) {
                            comClasesPeriodo++;
                            long minTeoricos = evaluadorService.calcularMinutosClaseTeoricos(List.of(clase));
                            double hTeoricas = redondear1Dec(minTeoricos / 60.0);
                            comHorasProgPeriodo += hTeoricas;

                            // Si la fecha es posterior a hoy, no se computa como debida ni dictada a hoy
                            if (esFuturo) {
                                continue;
                            }

                            comClasesHastaHoy++;
                            comHorasProgHastaHoy += hTeoricas;

                            List<EmpleadoFichaje> fDiaDocente = fichajesDocente.stream()
                                    .filter(f -> f.getHoraFichaje().toLocalDate().equals(fActual))
                                    .sorted(Comparator.comparing(EmpleadoFichaje::getHoraFichaje))
                                    .toList();

                            long minEfectivos = evaluadorService.calcularMinutosClaseEfectivos(List.of(clase), fDiaDocente, fActual);

                            // Tolerancia de 5 minutos
                            if (minTeoricos - minEfectivos <= 5) {
                                comHorasDict += hTeoricas;
                            } else {
                                double hEfectivas = redondear1Dec(minEfectivos / 60.0);
                                comHorasDict += hEfectivas;

                                long minPerdidos = Math.max(0, minTeoricos - minEfectivos);
                                double hDesc = redondear1Dec(minPerdidos / 60.0);
                                double pDesc = redondearDinero(hDesc * tarifaHora);

                                String tipoD;
                                String badgeStyle;
                                String detalleForense;

                                LocalTime entradaClase = clase.getHoraEntrada();
                                LocalTime salidaClase = clase.getHoraSalida();

                                if (fDiaDocente.isEmpty() || minEfectivos == 0) {
                                    tipoD = "FALTA";
                                    badgeStyle = "bg-rose-50 text-rose-600 border border-rose-200";
                                    detalleForense = "Sin registro biométrico (Falta sin aviso)";
                                    causaFaltas += hDesc;
                                } else {
                                    EmpleadoFichaje primerFichaje = fDiaDocente.get(0);
                                    EmpleadoFichaje ultimoFichaje = fDiaDocente.get(fDiaDocente.size() - 1);
                                    LocalTime horaPri = primerFichaje.getHoraFichaje().toLocalTime();
                                    LocalTime horaUlt = ultimoFichaje.getHoraFichaje().toLocalTime();

                                    boolean llegoTarde = horaPri.isAfter(entradaClase.plusMinutes(5));
                                    boolean seFueAntes = horaUlt.isBefore(salidaClase.minusMinutes(5));

                                    IncidenteAsistencia incSalidaClase = incidentesDocente.stream()
                                            .filter(i -> i.getFecha().equals(fActual) && "SALIDAS_EN_CLASE".equalsIgnoreCase(i.getCategoriaRegla()))
                                            .findFirst().orElse(null);

                                    if (incSalidaClase != null) {
                                        tipoD = "SALIDA_INTERMEDIA";
                                        badgeStyle = "bg-purple-50 text-purple-700 border border-purple-200";
                                        detalleForense = "Salida intermedia durante dictado de clase";
                                        causaSalidas += hDesc;
                                    } else if (llegoTarde && !seFueAntes) {
                                        tipoD = "LLEGADA_TARDE";
                                        badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                                        detalleForense = String.format("Llegada tardía: ingreso %s vs %s hs",
                                                horaPri.toString().substring(0, 5), entradaClase.toString().substring(0, 5));
                                        causaTardanzas += hDesc;
                                    } else if (seFueAntes && !llegoTarde) {
                                        tipoD = "RETIRO_ANTICIPADO";
                                        badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                                        detalleForense = String.format("Retiro anticipado: egreso %s vs %s hs",
                                                horaUlt.toString().substring(0, 5), salidaClase.toString().substring(0, 5));
                                        causaRetiros += hDesc;
                                    } else if (llegoTarde && seFueAntes) {
                                        tipoD = "LLEGADA_TARDE";
                                        badgeStyle = "bg-amber-50 text-amber-700 border border-amber-200";
                                        detalleForense = String.format("Llegada tardía (%s hs) y retiro anticipado (%s hs)",
                                                horaPri.toString().substring(0, 5), horaUlt.toString().substring(0, 5));
                                        causaTardanzas += hDesc;
                                    } else {
                                        tipoD = "SALIDA_INTERMEDIA";
                                        badgeStyle = "bg-purple-50 text-purple-700 border border-purple-200";
                                        detalleForense = "Salida intermedia durante dictado de clase";
                                        causaSalidas += hDesc;
                                    }
                                }

                                DesvioDocenteDTO desv = new DesvioDocenteDTO(
                                        fActual,
                                        diaSemanaCompleto(diaSem),
                                        tipoD,
                                        badgeStyle,
                                        m.getNombre(),
                                        detalleForense,
                                        minPerdidos,
                                        hDesc,
                                        pDesc
                                );
                                desviosComision.add(desv);
                                desviosDocente.add(desv);
                            }
                        }
                    }
                    cur = cur.plusDays(1);
                }

                comHorasProgPeriodo = redondear1Dec(comHorasProgPeriodo);
                comHorasProgHastaHoy = redondear1Dec(comHorasProgHastaHoy);
                comHorasDict = redondear1Dec(comHorasDict);
                double comHorasDesc = redondear1Dec(Math.max(0, comHorasProgHastaHoy - comHorasDict));
                
                double comPagoEstimado = redondearDinero(comHorasProgPeriodo * tarifaHora);
                double comPagoIdealHastaHoy = redondearDinero(comHorasProgHastaHoy * tarifaHora);
                double comPagoReal = redondearDinero(comHorasDict * tarifaHora);
                double comDescMonto = redondearDinero(Math.max(0, comPagoIdealHastaHoy - comPagoReal));
                
                int comCumpl = (comHorasProgHastaHoy > 0) 
                        ? (int) Math.min(100, Math.round((comHorasDict / comHorasProgHastaHoy) * 100.0)) 
                        : 100;

                docHorasProgPeriodo += comHorasProgPeriodo;
                docHorasProgHastaHoy += comHorasProgHastaHoy;
                docHorasDict += comHorasDict;
                docPagoEstimado += comPagoEstimado;
                docPagoIdealHastaHoy += comPagoIdealHastaHoy;
                docPagoReal += comPagoReal;
                docClasesPeriodoTotal += comClasesPeriodo;
                docClasesHastaHoyTotal += comClasesHastaHoy;

                comisionesDTO.add(new ComisionLiquidacionDTO(
                        rep.getId(),
                        m.getId(),
                        m.getNombre(),
                        rep.getAula() != null ? rep.getAula() : (m.getAulaPredeterminada() != null ? m.getAulaPredeterminada() : "Aula s/a"),
                        rep.getDiaSemana(),
                        new ArrayList<>(diasTexto),
                        horarioTexto,
                        comClasesPeriodo,
                        tarifaHora,
                        comHorasProgHastaHoy,
                        comHorasDict,
                        comHorasDesc,
                        comPagoIdealHastaHoy,
                        comPagoReal,
                        comDescMonto,
                        comCumpl,
                        desviosComision.size(),
                        desviosComision
                ));
            }

            docHorasProgPeriodo = redondear1Dec(docHorasProgPeriodo);
            docHorasProgHastaHoy = redondear1Dec(docHorasProgHastaHoy);
            docHorasDict = redondear1Dec(docHorasDict);
            double docHorasDesc = redondear1Dec(Math.max(0, docHorasProgHastaHoy - docHorasDict));
            
            docPagoEstimado = redondearDinero(docPagoEstimado);
            docPagoIdealHastaHoy = redondearDinero(docPagoIdealHastaHoy);
            docPagoReal = redondearDinero(docPagoReal);
            double docMontoDesc = redondearDinero(Math.max(0, docPagoIdealHastaHoy - docPagoReal));
            
            int docCumpl = (docHorasProgHastaHoy > 0) 
                    ? (int) Math.min(100, Math.round((docHorasDict / docHorasProgHastaHoy) * 100.0)) 
                    : 100;

            sumHorasProgPeriodo += docHorasProgPeriodo;
            sumHorasProgHastaHoy += docHorasProgHastaHoy;
            sumHorasDict += docHorasDict;
            sumHorasDesc += docHorasDesc;
            
            sumPagoEstimadoPeriodo += docPagoEstimado;
            sumPagoIdealHastaHoy += docPagoIdealHastaHoy;
            sumPagoReal += docPagoReal;
            sumMontoDescontado += docMontoDesc;
            
            sumClasesPeriodo += docClasesPeriodoTotal;
            sumClasesHastaHoy += docClasesHastaHoyTotal;

            listaDocentes.add(new DocenteLiquidacionDTO(
                    docente.getId(),
                    docente.getApellido() + " " + docente.getNombre(),
                    docente.getNroLegajo() != null ? docente.getNroLegajo() : "S/L",
                    docente.getDni() != null ? docente.getDni() : "-",
                    porMateria.size(),
                    franjasDocente.size(),
                    docClasesPeriodoTotal,
                    docHorasProgHastaHoy,
                    docHorasDict,
                    docHorasDesc,
                    docPagoIdealHastaHoy,
                    docPagoReal,
                    docMontoDesc,
                    docCumpl,
                    desviosDocente.size(),
                    desviosDocente,
                    comisionesDTO
            ));
        }

        listaDocentes.sort(Comparator.comparing(DocenteLiquidacionDTO::nombreDocente));

        sumHorasProgPeriodo = redondear1Dec(sumHorasProgPeriodo);
        sumHorasProgHastaHoy = redondear1Dec(sumHorasProgHastaHoy);
        sumHorasDict = redondear1Dec(sumHorasDict);
        sumHorasDesc = redondear1Dec(sumHorasDesc);
        
        sumPagoEstimadoPeriodo = redondearDinero(sumPagoEstimadoPeriodo);
        sumPagoIdealHastaHoy = redondearDinero(sumPagoIdealHastaHoy);
        sumPagoReal = redondearDinero(sumPagoReal);
        sumMontoDescontado = redondearDinero(sumMontoDescontado);

        double porcPerdida = (sumPagoIdealHastaHoy > 0) 
                ? redondear1Dec((sumMontoDescontado / sumPagoIdealHastaHoy) * 100.0) 
                : 0.0;
        double porcCumplGlobal = (sumHorasProgHastaHoy > 0) 
                ? redondear1Dec((sumHorasDict / sumHorasProgHastaHoy) * 100.0) 
                : 100.0;

        DesgloseCausasDTO desgloseCausas = new DesgloseCausasDTO(
                redondear1Dec(causaFaltas),
                redondear1Dec(causaTardanzas),
                redondear1Dec(causaRetiros),
                redondear1Dec(causaSalidas)
        );

        return new LiquidacionGlobalDTO(
                mod,
                periodoTexto,
                rInicio,
                rFin,
                sumPagoEstimadoPeriodo,
                sumPagoIdealHastaHoy,
                sumPagoReal,
                sumMontoDescontado,
                porcPerdida,
                porcCumplGlobal,
                sumHorasProgPeriodo,
                sumHorasProgHastaHoy,
                sumHorasDict,
                sumHorasDesc,
                sumClasesPeriodo,
                sumClasesHastaHoy,
                listaDocentes.size(),
                desgloseCausas,
                listaDocentes
        );
    }

    private double redondear1Dec(double val) {
        return Math.round(val * 10.0) / 10.0;
    }

    private double redondearDinero(double val) {
        return Math.round(val * 100.0) / 100.0;
    }

    private String capitalizar(String str) {
        if (str == null || str.isEmpty()) return "";
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }

    private String formatearFecha(LocalDate f) {
        return String.format("%02d/%02d/%d", f.getDayOfMonth(), f.getMonthValue(), f.getYear());
    }

    private String diaNumeroCorto(Integer dia) {
        return switch (dia != null ? dia : 1) {
            case 1 -> "Lun";
            case 2 -> "Mar";
            case 3 -> "Mié";
            case 4 -> "Jue";
            case 5 -> "Vie";
            case 6 -> "Sáb";
            default -> "Dom";
        };
    }

    private String diaSemanaCompleto(int dia) {
        return switch (dia) {
            case 1 -> "Lunes";
            case 2 -> "Martes";
            case 3 -> "Miércoles";
            case 4 -> "Jueves";
            case 5 -> "Viernes";
            case 6 -> "Sábado";
            default -> "Domingo";
        };
    }
}