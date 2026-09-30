package backend.dto;

public record UsuarioDTO(
    Long id,
    String username,
    String rol,
    Boolean activo,
    Long empleadoId,
    String nombreCompletoEmpleado
) {}