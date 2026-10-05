package backend.dto;

import backend.model.IncidenteAsistencia;
import org.springframework.data.domain.Page;

public record TableroIncidentesDTO(
    String fechaDesde,
    String fechaHasta,
    boolean esRango,
    int presentesActuales,
    int presentesTotales,
    MetricasIncidentesDTO metricas,
    Page<IncidenteAsistencia> incidentesPaginados
) {
    public record MetricasIncidentesDTO(
        long salidasEnClase,
        long llegadasTarde,
        long retirosPrevios,
        long salidasExcesivas,
        long ausencias,
        long marcasAbiertas,
        long total
    ) {}
}