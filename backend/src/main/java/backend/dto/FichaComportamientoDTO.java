package backend.dto;

import java.time.LocalDate;
import java.time.LocalTime;
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
    String modalidad, // DIARIO, SEMANAL, MENSUAL
    String periodoTexto,
    int porcentajeCumplimiento,
    MetricasFichaDTO metricas,
    List<IntervaloLineaTiempoDTO> planificado,
    List<IntervaloLineaTiempoDTO> presenciaReal,
    List<DesgloseIntervaloDTO> intervalosDetalle,
    List<IncidenteFichaDTO> incidentes,
    List<FichajeBrutoDTO> fichajesBrutos,
    List<DiaDesgloseDTO> diasPeriodo // Para vista semanal y mensual
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
        int diasTotalesPeriodo
    ) {}

    public record IntervaloLineaTiempoDTO(
        String etiqueta,
        String horaInicio,
        String horaFin,
        double inicioMinutos, // Minutos desde las 00:00 para posición CSS
        double duracionMinutos,
        String tipo // PLANIFICADO, PRESENCIA, SALIDA_INTERMEDIA, INFRACCION
    ) {}

    public record DesgloseIntervaloDTO(
        String tipo, // Presencia, Salida Intermedia
        String horaInicio,
        String horaFin,
        String duracionTexto,
        String detalle,
        boolean esInfraccion
    ) {}

    public record IncidenteFichaDTO(
        Long id,
        String hora,
        String severidad,
        String tipo,
        String detalle,
        String estado
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
        String estadoGeneral // NORMAL, INFRACCION, DESVIO, SIN_REGISTRO, FRANCO
    ) {}
}