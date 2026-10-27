package backend.dto;

public record ExcepcionMetricasDTO(
    long enCursoHoy,
    long proximas,
    long finalizadas,
    long pendientesRrhh,
    long totalRegistros
) {}