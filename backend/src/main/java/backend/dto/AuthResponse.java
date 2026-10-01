package backend.dto;

import java.util.List;

public record AuthResponse(
    String token,
    Long idUsuario,
    String username,
    String rol,
    List<String> permisos,
    String nombreCompleto,
    Boolean debeCambiarPassword
) {}