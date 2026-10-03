package backend.dto;

import java.time.LocalTime;
import java.util.List;

public record EmpleadoHorarioResumenDTO(
    Long id,
    Long empleadoId,
    String nombre,
    String apellido,
    String nroLegajo,
    List<String> cargos,
    String categoriaNombre,
    String materiaNombre,
    String materiaCodigo,
    String aula,
    Integer diaSemana,
    LocalTime horaEntrada,
    LocalTime horaSalida,
    String etiqueta,
    String tipoFrecuencia,
    Integer repeticionesPeriodo,
    String semanaAlterna,
    Boolean activo
) {}