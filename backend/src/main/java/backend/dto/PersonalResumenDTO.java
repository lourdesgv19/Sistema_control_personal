package backend.dto;

public record PersonalResumenDTO(
    long totalPersonal,
    long totalDocentes,
    long totalAdministrativos,
    long totalInactivos
) {}