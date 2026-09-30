package backend.dto;

import java.util.List;

public record AuditoriaMetricasDTO(
    long totalMovimientos,
    long totalUsuariosActivos,
    String accionMasFrecuente,
    List<ItemMetrica> distribucionAcciones,
    List<ItemMetrica> actividadUsuarios,
    List<String> accionesDisponibles
) {
    public record ItemMetrica(String etiqueta, long cantidad, double porcentaje) {}
}