package backend.dto;

public record ResolverIncidenteRequest(
    String estado, // JUSTIFICADA, OBSERVADA, RECHAZADA
    String motivo,
    String observaciones
) {}