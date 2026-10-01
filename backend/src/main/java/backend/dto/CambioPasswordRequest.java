package backend.dto;

public record CambioPasswordRequest(
    String passwordActual,
    String passwordNueva
) {}