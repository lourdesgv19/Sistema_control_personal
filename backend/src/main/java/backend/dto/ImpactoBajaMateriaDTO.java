package backend.dto;

import java.util.List;

public record ImpactoBajaMateriaDTO(
    Long idMateria,
    String nombreMateria,
    int totalHorariosAfectados,
    List<HorarioAfectadoDTO> horarios
) {
    public record HorarioAfectadoDTO(
        Long idHorario,
        String diaNombre,
        String horaInicio,
        String horaFin,
        String docenteNombre,
        String legajoDocente,
        String aula
    ) {}
}