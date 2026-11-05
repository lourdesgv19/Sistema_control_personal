package backend.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class GestionMateriasDTO {

    public record ResumenMetricas(
        double horasDictadas,
        double horasFijadas,
        double porcentajeCumplimiento,
        long clasesCompletas,
        long clasesDesvios,
        long clasesFaltas
    ) {}

    public record NuevaMateriaRequest(
        Long idMateria,
        Long idHorario,
        String nombre,
        String codigo,
        String departamento,
        String aula,
        List<Integer> diasSemana,
        String horaInicio,
        String horaFin,
        Long idDocenteTitular,
        Long idDocenteAuxiliar,
        String rolTitular,
        String rolAuxiliar,
        String observaciones,
        Boolean forzarGuardado,
        String tipoFrecuencia,
        Integer repeticionesPeriodo,
        String semanaAlterna,
        LocalDate fechaDesde
    ) {}

    public record MateriaCatalogoDTO(
        Long idMateria,
        String nombre,
        String codigo,
        String aulaPredeterminada,
        int totalHorarios,
        List<String> diasResumen,
        double totalHorasSemanales,
        Long idDocenteTitular,
        String docenteTitularNombre,
        Long idDocenteAuxiliar,
        String docenteAuxiliarNombre,
        boolean sinDocente,
        boolean activo,
        List<HorarioDesgloseDTO> desgloseHorarios
    ) {}

    public record HorarioDesgloseDTO(
        Long idHorario,
        int diaSemana,
        String diaNombre,
        String horaInicio,
        String horaFin,
        double horasClase,
        String turnoEtiqueta,
        String aula,
        Long idDocente,
        String nombreDocente,
        String legajoDocente,
        String tipoFrecuencia,
        Integer repeticionesPeriodo,
        String semanaAlterna
    ) {}

    public record ImpactoBajaMateriaDTO(
        Long idMateria,
        String nombreMateria,
        int totalHorariosAfectados,
        List<HorarioAfectadoDTO> horariosAfectados
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
}