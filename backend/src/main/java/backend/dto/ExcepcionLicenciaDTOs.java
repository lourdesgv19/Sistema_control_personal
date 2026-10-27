package backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class ExcepcionLicenciaDTOs {

    public record ResumenPanelDTO(
        long enCursoHoy,
        long proximas,
        long finalizadas,
        long pendientesRrhh,
        long totalRegistros,
        String fechaReferencia,
        List<AgenteDesgloseDTO> desgloseAgentes,
        List<DetalleLicenciaDTO> listadoDetallado
    ) {}

    public record AgenteDesgloseDTO(
        Long idEmpleado,           // null si es Institucional
        boolean esInstitucional,
        String nombreCompleto,     // "Toda la Facultad (Asuetos y Feriados)" o "Apellido, Nombre"
        String iniciales,          // "PM", "LM", etc.
        String nroLegajo,
        String rolArea,            // "Servicios Generales", "Administrativo", "Docente", etc.
        String departamento,
        int totalDias,
        int totalRegistros,
        int cantEnCursoHoy,
        int cantPendientesRrhh,
        int cantProximas,
        int cantFinalizadas,
        List<DetalleLicenciaDTO> licencias
    ) {}

    public record DetalleLicenciaDTO(
        Long id,
        Long idEmpleado,
        String nombreEmpleado,
        String legajoEmpleado,
        String rolArea,
        boolean esInstitucional,
        String tipo,
        String tipoEtiqueta,
        LocalDate fechaInicio,
        LocalDate fechaFin,
        int diasDuracion,
        String estado,             // APROBADA, PENDIENTE_RRHH, RECHAZADA
        String motivoDictamen,
        String observacionesRrhh,
        LocalDateTime creadoEn,
        // Cálculos de condición temporal en tiempo real
        String condicionTemporal,   // "EN_CURSO", "PROXIMA", "FINALIZADA"
        String textoProgreso,       // Ej: "Día 1/5 (Quedan 4d)", "Inicia en 11 días", "Finalizó hace 7 días"
        String detalleVigencia,     // Ej: "En curso: van 1 de 5 días • Restan 4 días para que finalice"
        int porcentajeProgreso,     // 0 a 100
        int diasTranscurridos,
        int diasRestantes
    ) {}

    public record CrearExcepcionRequest(
        Long idEmpleado,           // null para Toda la Facultad
        boolean esInstitucional,
        String tipo,
        LocalDate fechaInicio,
        LocalDate fechaFin,
        String motivoDictamen
    ) {}

    public record DictaminarRequest(
        String nuevoEstado,        // APROBADA, RECHAZADA
        String observaciones
    ) {}
}