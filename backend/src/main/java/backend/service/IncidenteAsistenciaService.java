package backend.service;

import backend.dto.ResolverIncidenteRequest;
import backend.dto.TableroIncidentesDTO;
import backend.model.IncidenteAsistencia;
import backend.repositories.EmpleadoFichajeRepository;
import backend.repositories.EmpleadoHorarioRepository;
import backend.repositories.IncidenteAsistenciaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class IncidenteAsistenciaService {

    private final IncidenteAsistenciaRepository incidenteRepo;
    private final EmpleadoHorarioRepository horarioRepo;
    private final EmpleadoFichajeRepository fichajeRepo;
    private final AuditorHelperService auditor;

    public IncidenteAsistenciaService(
            IncidenteAsistenciaRepository incidenteRepo,
            EmpleadoHorarioRepository horarioRepo,
            EmpleadoFichajeRepository fichajeRepo,
            AuditorHelperService auditor) {
        this.incidenteRepo = incidenteRepo;
        this.horarioRepo = horarioRepo;
        this.fichajeRepo = fichajeRepo;
        this.auditor = auditor;
    }

    @Transactional(readOnly = true)
    public TableroIncidentesDTO obtenerTableroRango(
            LocalDate fechaDesde,
            LocalDate fechaHasta,
            String severidad,
            String categoria,
            String estado,
            String busqueda,
            int page,
            int size) {

        if (fechaDesde == null) fechaDesde = LocalDate.now();
        if (fechaHasta == null || fechaHasta.isBefore(fechaDesde)) fechaHasta = fechaDesde;

        boolean esRango = !fechaDesde.equals(fechaHasta);

        // 1. Cálculo de presentes (significativo cuando se consulta un día en particular)
        int presentesActuales = 0;
        int totalEsperados = 0;

        if (!esRango) {
            int diaSemana = fechaDesde.getDayOfWeek().getValue();
            List<Long> idsEsperados = horarioRepo.findEmpleadosEsperadosPorDia(diaSemana);
            totalEsperados = idsEsperados != null ? idsEsperados.size() : 0;

            LocalDateTime inicioDia = fechaDesde.atStartOfDay();
            LocalDateTime finDia = fechaDesde.atTime(LocalTime.MAX);
            presentesActuales = (int) fichajeRepo.contarEmpleadosIngresados(inicioDia, finDia);
        }

        // 2. Consulta paginada
        Pageable pageable = PageRequest.of(page, size);
        Page<IncidenteAsistencia> paginaIncidentes = incidenteRepo.buscarFiltradoPaginadoRango(
            fechaDesde, fechaHasta, severidad, categoria, estado, busqueda, pageable
        );

        // 3. Métricas en el rango
        TableroIncidentesDTO.MetricasIncidentesDTO metricas = new TableroIncidentesDTO.MetricasIncidentesDTO(
            incidenteRepo.contarPorRangoYCategoria(fechaDesde, fechaHasta, "SALIDAS_EN_CLASE"),
            incidenteRepo.contarPorRangoYCategoria(fechaDesde, fechaHasta, "LLEGADAS_TARDE"),
            incidenteRepo.contarPorRangoYCategoria(fechaDesde, fechaHasta, "RETIROS_PREVIOS"),
            incidenteRepo.contarPorRangoYCategoria(fechaDesde, fechaHasta, "SALIDAS_EXCESIVAS"),
            incidenteRepo.contarPorRangoYCategoria(fechaDesde, fechaHasta, "AUSENCIAS"),
            incidenteRepo.contarPorRangoYCategoria(fechaDesde, fechaHasta, "MARCAS_ABIERTAS"),
            incidenteRepo.contarTotalPorRango(fechaDesde, fechaHasta)
        );

        return new TableroIncidentesDTO(
            fechaDesde.toString(),
            fechaHasta.toString(),
            esRango,
            presentesActuales,
            totalEsperados,
            metricas,
            paginaIncidentes
        );
    }

    @Transactional
    public IncidenteAsistencia resolverIncidente(Long id, ResolverIncidenteRequest req) {
        IncidenteAsistencia inc = incidenteRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Incidente no encontrado con ID: " + id));

        inc.setEstado(req.estado());
        inc.setResolucionMotivo(req.motivo());
        inc.setResolucionObservaciones(req.observaciones());
        IncidenteAsistencia guardado = incidenteRepo.save(inc);

        String nombreColab = inc.getEmpleado() != null 
            ? inc.getEmpleado().getNombre() + " " + inc.getEmpleado().getApellido() 
            : "Desconocido";

        auditor.registrar(
            "RESOLVER_INCIDENTE",
            "AUDITORIA_ASISTENCIA",
            "Resolución [" + req.estado() + "] incidente #" + id + " (" + inc.getTipo() + ") colaborador: " + nombreColab
        );

        return guardado;
    }
}