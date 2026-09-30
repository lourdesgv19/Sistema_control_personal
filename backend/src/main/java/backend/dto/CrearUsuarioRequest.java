package backend.dto;

public record CrearUsuarioRequest(
    Long empleadoId,
    String username, // Si viene nulo o vacío, se deduce automáticamente
    String rol       // 'ADMINISTRADOR', 'RECURSOS_HUMANOS', 'CONSULTA'
) {}