package backend.dto;

import java.time.LocalDateTime;

public record UsuarioPermisoDTO(
    Long id,
    String codigoPermiso,
    Boolean activo,
    Boolean esTemporal,
    Boolean estaVigente,
    LocalDateTime fechaOtorgacion,
    LocalDateTime fechaExpiracion,
    String otorgadoPor,
    String motivo
) {}