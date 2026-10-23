package backend.dto;

import java.time.LocalDate;
import java.util.List;

public class LiquidacionDocenteDTO {

    public record LiquidacionGlobalDTO(
        String periodoModalidad,
        String periodoTexto,
        LocalDate fechaInicio,
        LocalDate fechaFin,
        double totalPagoEstimadoPeriodo,      // Proyección al 100% del período completo
        double totalPagoIdealHastaHoy,        // Total teórico programado exigible hasta hoy
        double totalPagoReal,                 // Total real devengado a hoy con deducciones biométricas
        double totalMontoDescontado,          // Deducción acumulada hasta hoy
        double porcentajePerdida,
        double porcentajeCumplimientoGlobal,
        double totalHorasProgramadasPeriodo,  // Total horas programadas de todo el período
        double totalHorasProgramadasHastaHoy, // Horas programadas hasta hoy
        double totalHorasEfectivas,           // Horas dictadas reales hasta hoy
        double totalHorasDescontadas,         // Horas restadas hasta hoy
        int totalClasesPeriodo,               // Clases totales del período
        int totalClasesHastaHoy,              // Clases exigibles hasta hoy
        int totalDocentesEvaluados,
        DesgloseCausasDTO desgloseCausas,
        List<DocenteLiquidacionDTO> docentes
    ) {}

    public record DesgloseCausasDTO(
        double horasFaltas,
        double horasTardanzas,
        double horasRetirosPrevios,
        double horasSalidasIntermedias
    ) {}

    public record DocenteLiquidacionDTO(
        Long idDocente,
        String nombreDocente,
        String nroLegajo,
        String dni,
        int totalMaterias,
        int totalHorarios,
        int totalClases,
        double horasProgramadas,
        double horasDictadas,
        double horasDescontadas,
        double pagoIdeal,
        double pagoReal,
        double montoDescontado,
        int porcentajeCumplimiento,
        int cantidadDesvios,
        List<DesvioDocenteDTO> desvios,
        List<ComisionLiquidacionDTO> comisiones
    ) {}

    public record ComisionLiquidacionDTO(
        Long idHorario,
        Long idMateria,
        String nombreMateria,
        String aula,
        int diaSemana,
        List<String> diasNombres,
        String horarioTexto,
        int totalClases,
        double tarifaHora,
        double horasProgramadas,
        double horasDictadas,
        double horasDescontadas,
        double pagoIdeal,
        double pagoReal,
        double montoDescontado,
        int porcentajeCumplimiento,
        int cantidadDesvios,
        List<DesvioDocenteDTO> desvios
    ) {}

    public record DesvioDocenteDTO(
        LocalDate fecha,
        String diaSemanaTexto,
        String tipoDesvio, // FALTA, LLEGADA_TARDE, RETIRO_ANTICIPADO, SALIDA_INTERMEDIA
        String categoriaBadge, 
        String materiaNombre,
        String detalleForense,
        long minutosPerdidos,
        double horasDescontadas,
        double montoPerdido
    ) {}
}