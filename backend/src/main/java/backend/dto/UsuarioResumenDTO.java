package backend.dto;

public record UsuarioResumenDTO(
    long total,
    long administradores,
    long auditores,
    long inactivos
) {}