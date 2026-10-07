package backend.dto;

import java.util.List;

public record ResumenPresenciaFichajesDTO(
    double horasNetasTrabajadas,
    double horasSalidasIntermedias,
    int cantidadSalidasIntermedias,
    boolean excedeSalidasIntermedias,
    List<String> advertencias
) {}