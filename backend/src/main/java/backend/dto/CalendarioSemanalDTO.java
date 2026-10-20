package backend.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class CalendarioSemanalDTO {

    public record BloqueClaseDTO(
        Long idHorario,
        Long idMateria,
        String nombreMateria,
        String aula,
        int diaSemana,              // 1 = Lunes ... 6 = Sábado
        LocalDate fechaClase,       // Fecha exacta del día en esa semana
        LocalTime horaInicio,
        LocalTime horaFin,
        double horasProgramadas,
        double horasEfectivas,      // Horas reales computadas por biométrico
        String estadoSemaforo,      // "VERDE", "AMBAR", "ROJO"
        String motivoDesvio,        // Ej: "0h / No dada", "2.7h / 3.0h", "Ingreso 09:22"
        Long idDocente,
        String nombreDocente,
        String apellidoDocente,
        double tarifaHora,
        double montoLiquidado
    ) {}

    public record DiaCalendarioDTO(
        int diaSemana,
        String nombreDia,
        LocalDate fecha,
        boolean esHoy,
        int totalMaterias,
        List<BloqueClaseDTO> clases
    ) {}

    public record DocenteFiltroDTO(
        Long idEmpleado,
        String nombreCompleto,
        String legajo
    ) {}

    public record RespuestaCalendarioDTO(
        LocalDate fechaInicioSemana,
        LocalDate fechaFinSemana,
        List<DiaCalendarioDTO> dias,
        List<DocenteFiltroDTO> docentesDisponibles
    ) {}
}