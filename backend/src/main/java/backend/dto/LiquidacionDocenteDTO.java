package backend.dto;

import java.time.LocalDate;
import java.util.List;

public class LiquidacionDocenteDTO {

    public record LiquidacionGlobalDTO(
        String periodoModalidad,
        String periodoTexto,
        LocalDate fechaInicio,
        LocalDate fechaFin,
        double totalPagoIdeal,
        double totalPagoReal,
        double totalMontoDescontado,
        double porcentajePerdida,
        double porcentajeCumplimientoGlobal,
        double totalHorasProgramadas,
        double totalHorasEfectivas,
        double totalHorasDescontadas,
        int totalClasesPeriodo,
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
        String categoriaBadge, // 'bg-rose-50 text-rose-600', etc.
        String materiaNombre,
        String detalleForense,
        long minutosPerdidos,
        double horasDescontadas,
        double montoPerdido
    ) {}
}