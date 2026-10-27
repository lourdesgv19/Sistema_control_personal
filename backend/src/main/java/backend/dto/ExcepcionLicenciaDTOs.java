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
        Long idEmpleado,
        boolean esInstitucional,
        String nombreCompleto,
        String iniciales,
        String nroLegajo,
        String rolArea,
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
        boolean activo,            // Estado de baja lógica
        String condicionTemporal,  // EN_CURSO, PROXIMA, FINALIZADA
        String textoProgreso,
        String detalleVigencia,
        int porcentajeProgreso,
        int diasTranscurridos,
        int diasRestantes
    ) {}

    public record CrearExcepcionRequest(
        Long idEmpleado,
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