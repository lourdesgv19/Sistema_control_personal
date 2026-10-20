package backend.dto;

import java.time.LocalDate;
import java.util.List;

public record FichaComportamientoDTO(
    Long empleadoId,
    String nombreCompleto,
    String nroLegajo,
    String dni,
    String rolOArea,
    String departamento,
    boolean activo,
    String etiquetaTurno,
    String modalidad,
    String periodoTexto,
    int porcentajeCumplimiento,
    MetricasFichaDTO metricas,
    List<IntervaloLineaTiempoDTO> planificado,
    List<IntervaloLineaTiempoDTO> presenciaReal,
    List<DesgloseIntervaloDTO> intervalosDetalle,
    List<IncidenteFichaDTO> incidentes,
    List<FichajeBrutoDTO> fichajesBrutos,
    List<DiaDesgloseDTO> diasPeriodo,
    List<MesResumenDTO> mesesPeriodo // Agrupador Trimestral / Cuatrimestral[cite: 37]
) {
    public record MetricasFichaDTO(
        String primeraEntrada,
        String ultimoEgreso,
        String presenciaNetaTexto,
        long presenciaNetaMinutos,
        int salidasIntermediasCantidad,
        long salidasIntermediasMinutos,
        int totalIncidentes,
        int incidentesJustificados,
        int diasEnSede,
        int diasTotalesPeriodo,
        String horasAFavorTexto,
        long minutosAFavor,
        String horasEnContraTexto,
        long minutosEnContra,
        int diasConDeficit,
        int diasConHorasExtra,
        String clasesDictadasTexto
    ) {}

    public record MesResumenDTO(
        String mesKey,
        int orden,
        String nombreMes,
        int diasOffset,
        String presenciaNetaTexto,
        int diasEnSede,
        int totalIncidentes,
        String clasesDictadasTexto,
        List<DiaDesgloseDTO> diasPeriodo
    ) {}

    public record IntervaloLineaTiempoDTO(
        String etiqueta,
        String horaInicio,
        String horaFin,
        double inicioMinutos,
        double duracionMinutos,
        String tipo
    ) {}

    public record DesgloseIntervaloDTO(
        String tipo,
        String horaInicio,
        String horaFin,
        String duracionTexto,
        String detalle,
        boolean esInfraccion
    ) {}

    public record IncidenteFichaDTO(
        Long id,
        LocalDate fecha,
        String hora,
        String severidad,
        String tipo,
        String detalle,
        String estado,
        String resolucionMotivo,    
        String resolucionObservaciones
    ) {}

    public record FichajeBrutoDTO(
        Long id,
        String hora,
        String tipoEvento,
        String nombreReloj,
        String estado
    ) {}

    public record DiaDesgloseDTO(
        LocalDate fecha,
        String diaSemana,
        String primeraEntrada,
        String ultimoEgreso,
        String presenciaNetaTexto,
        long presenciaNetaMinutos,
        int salidasIntermedias,
        long minutosFuera,
        int totalIncidentes,
        int porcentajeCumplimiento,
        String estadoGeneral,
        long minutosDiferencia,
        String clasesDictadasTexto,
        double horasClaseTeoricas,
        double horasClaseEfectivas
    ) {}
}