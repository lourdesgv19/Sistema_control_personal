package backend.dto;

public record UsuarioDTO(
    Long id,
    String username,
    String rol,
    Boolean activo,
    Long empleadoId,
    String nombreCompleto,
    String email,
    String telefono,
    String idBiometrico,
    Boolean debeCambiarPassword
) {}