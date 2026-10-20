package backend.dto;

import java.time.LocalTime;
import java.util.List;

public class GestionMateriasDTO {

    public record ResumenMetricas(
        double horasDictadas,
        double horasFijadas,
        double porcentajeCumplimiento,
        long clasesCompletas,
        long clasesDesvios,
        long clasesFaltas,
        double totalLiquidar,
        double totalDeduccion
    ) {}

    public record BloqueMateriaSemanal(
        Long idHorario,
        Long idMateria,
        String nombreMateria,
        String aula,
        int diaSemana,
        LocalTime horaInicio,
        LocalTime horaFin,
        double horasProgramadas,
        double horasEfectivas,
        String estadoSemaforo,
        String motivoDesvio,
        Long idDocente,
        String nombreDocente,
        double tarifaHora,
        double montoLiquidado
    ) {}

    public record NuevaMateriaRequest(
        String nombre,
        String codigo,
        String departamento,
        String aula,
        List<Integer> diasSemana,
        String horaInicio,
        String horaFin,
        Long idDocenteTitular,
        Long idDocenteAuxiliar,
        Double tarifaHora,
        String observaciones,
        Boolean forzarGuardado
    ) {}
}