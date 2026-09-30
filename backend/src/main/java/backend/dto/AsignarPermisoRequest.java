package backend.dto;

import java.time.LocalDateTime;

public record AsignarPermisoRequest(
    String codigoPermiso,
    Boolean esTemporal,
    Integer duracionDias,          // Ej: 1 para 24 hs, o null si es permanente
    LocalDateTime fechaExpiracion, // Fecha exacta o calculada
    String motivo
) {}