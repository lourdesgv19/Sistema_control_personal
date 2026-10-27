package backend.service;

import backend.dto.ExcepcionLicenciaDTOs.*;
import backend.dto.ExcepcionMetricasDTO;
import backend.model.Empleado;
import backend.model.ExcepcionLicencia;
import backend.model.Usuario;
import backend.repositories.EmpleadoRepository;
import backend.repositories.ExcepcionLicenciaRepository;
import backend.repositories.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class ExcepcionLicenciaService {

    private final ExcepcionLicenciaRepository excepcionRepo;
    private final EmpleadoRepository empleadoRepo;
    private final UsuarioRepository usuarioRepo;
    private final AuditorHelperService auditor;

    public ExcepcionLicenciaService(
            ExcepcionLicenciaRepository excepcionRepo,
            EmpleadoRepository empleadoRepo,
            UsuarioRepository usuarioRepo,
            AuditorHelperService auditor) {
        this.excepcionRepo = excepcionRepo;
        this.empleadoRepo = empleadoRepo;
        this.usuarioRepo = usuarioRepo;
        this.auditor = auditor;
    }

    @Transactional(readOnly = true)
    public ExcepcionMetricasDTO obtenerMetricasGlobales() {
        LocalDate hoy = LocalDate.now();
        return new ExcepcionMetricasDTO(
            excepcionRepo.contarEnCursoHoy(hoy),
            excepcionRepo.contarProximas(hoy),
            excepcionRepo.contarFinalizadas(hoy),
            excepcionRepo.contarPendientesRrhh(),
            excepcionRepo.contarTotalActivos()
        );
    }

    @Transactional(readOnly = true)
    public Page<DetalleLicenciaDTO> listarPaginado(
            String busqueda,
            String estado,
            String tipo,
            String filtroKpi,
            String filtroActivo,
            int page,
            int size) {

        LocalDate hoy = LocalDate.now();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));

        String act = (filtroActivo != null && !filtroActivo.isBlank()) ? filtroActivo.toUpperCase() : "ACTIVOS";
        String est = (estado != null && !estado.isBlank()) ? estado.toUpperCase() : "TODOS";
        String tip = (tipo != null && !tipo.isBlank()) ? tipo.toUpperCase() : "TODOS";
        String kpi = (filtroKpi != null && !filtroKpi.isBlank()) ? filtroKpi.toUpperCase() : "TODOS";
        String q = (busqueda != null) ? busqueda.trim() : "";

        return excepcionRepo.listarPaginado(act, est, tip, kpi, q, hoy, pageable)
                .map(e -> calcularDetalle(e, hoy));
    }

    @Transactional
    public DetalleLicenciaDTO registrarLicencia(CrearExcepcionRequest req, String usuario) {
        ExcepcionLicencia e = new ExcepcionLicencia();
        e.setEsInstitucional(req.esInstitucional() || req.idEmpleado() == null);

        String destinatario = "Toda la Institución";
        if (!e.getEsInstitucional()) {
            Empleado emp = empleadoRepo.findById(req.idEmpleado())
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + req.idEmpleado()));
            e.setEmpleado(emp);
            destinatario = emp.getApellido() + ", " + emp.getNombre() + " (Legajo: " + emp.getNroLegajo() + ")";
        }

        e.setTipo(req.tipo());
        e.setTipoEtiqueta(formatearTipoEtiqueta(req.tipo()));
        e.setFechaInicio(req.fechaInicio());
        e.setFechaFin(req.fechaFin());

        long dias = ChronoUnit.DAYS.between(req.fechaInicio(), req.fechaFin()) + 1;
        e.setDiasDuracion((int) Math.max(1, dias));

        e.setEstado("LICENCIA_MEDICA".equals(req.tipo()) ? "PENDIENTE_RRHH" : "APROBADA");
        e.setMotivoDictamen(req.motivoDictamen());
        e.setRegistradoPor(usuario);

        ExcepcionLicencia guardada = excepcionRepo.save(e);

        auditor.registrar(
            "CREAR_EXCEPCION_LICENCIA",
            "EXCEPCIONES",
            String.format("Alta de %s para %s del %s al %s (%d días). Motivo: %s",
                guardada.getTipoEtiqueta(),
                destinatario,
                guardada.getFechaInicio(),
                guardada.getFechaFin(),
                guardada.getDiasDuracion(),
                guardada.getMotivoDictamen())
        );

        return calcularDetalle(guardada, LocalDate.now());
    }

    @Transactional
    public DetalleLicenciaDTO actualizarLicencia(Long id, CrearExcepcionRequest req) {
        ExcepcionLicencia e = excepcionRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Excepción no encontrada con ID: " + id));

        e.setEsInstitucional(req.esInstitucional() || req.idEmpleado() == null);
        String destinatario = "Toda la Institución";

        if (!e.getEsInstitucional()) {
            Empleado emp = empleadoRepo.findById(req.idEmpleado())
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + req.idEmpleado()));
            e.setEmpleado(emp);
            destinatario = emp.getApellido() + ", " + emp.getNombre() + " (Legajo: " + emp.getNroLegajo() + ")";
        } else {
            e.setEmpleado(null);
        }

        e.setTipo(req.tipo());
        e.setTipoEtiqueta(formatearTipoEtiqueta(req.tipo()));
        e.setFechaInicio(req.fechaInicio());
        e.setFechaFin(req.fechaFin());

        long dias = ChronoUnit.DAYS.between(req.fechaInicio(), req.fechaFin()) + 1;
        e.setDiasDuracion((int) Math.max(1, dias));
        e.setMotivoDictamen(req.motivoDictamen());

        ExcepcionLicencia modificada = excepcionRepo.save(e);

        auditor.registrar(
            "ACTUALIZAR_EXCEPCION_LICENCIA",
            "EXCEPCIONES",
            String.format("Modificación de %s #%d para %s (Vigencia: %s al %s). Motivo: %s",
                modificada.getTipoEtiqueta(),
                modificada.getId(),
                destinatario,
                modificada.getFechaInicio(),
                modificada.getFechaFin(),
                modificada.getMotivoDictamen())
        );

        return calcularDetalle(modificada, LocalDate.now());
    }

    @Transactional
    public DetalleLicenciaDTO dictaminar(Long id, DictaminarRequest req) {
        ExcepcionLicencia e = excepcionRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Registro no encontrado con ID: " + id));

        String estadoAnterior = e.getEstado();
        e.setEstado(req.nuevoEstado());
        if (req.observaciones() != null) {
            e.setObservacionesRrhh(req.observaciones());
        }

        ExcepcionLicencia dictaminada = excepcionRepo.save(e);

        String destinatario = dictaminada.getEmpleado() != null
            ? dictaminada.getEmpleado().getApellido() + ", " + dictaminada.getEmpleado().getNombre() + " (#" + dictaminada.getEmpleado().getNroLegajo() + ")"
            : "Toda la Institución";

        String accionAuditoria = "APROBADA".equalsIgnoreCase(req.nuevoEstado()) 
            ? "APROBAR_EXCEPCION_LICENCIA" 
            : "RECHAZAR_EXCEPCION_LICENCIA";

        auditor.registrar(
            accionAuditoria,
            "EXCEPCIONES",
            String.format("Dictamen de %s #%d de %s: cambió de '%s' a '%s'. Observaciones RRHH: %s",
                dictaminada.getTipoEtiqueta(),
                dictaminada.getId(),
                destinatario,
                estadoAnterior,
                dictaminada.getEstado(),
                dictaminada.getObservacionesRrhh() != null ? dictaminada.getObservacionesRrhh() : "Sin observaciones adicionales")
        );

        return calcularDetalle(dictaminada, LocalDate.now());
    }

    @Transactional
    public void bajaLogica(Long id) {
        ExcepcionLicencia e = excepcionRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Registro no encontrado con ID: " + id));

        String destinatario = e.getEmpleado() != null
            ? e.getEmpleado().getApellido() + ", " + e.getEmpleado().getNombre() + " (#" + e.getEmpleado().getNroLegajo() + ")"
            : "Toda la Institución";

        excepcionRepo.deleteById(id);

        auditor.registrar(
            "BAJA_EXCEPCION_LICENCIA",
            "EXCEPCIONES",
            String.format("Anulación / Baja de %s #%d para %s (%s al %s). Motivo original: %s",
                e.getTipoEtiqueta(),
                e.getId(),
                destinatario,
                e.getFechaInicio(),
                e.getFechaFin(),
                e.getMotivoDictamen())
        );
    }

    @Transactional
    public void reactivarLicencia(Long id) {
        ExcepcionLicencia e = excepcionRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Registro no encontrado con ID: " + id));

        excepcionRepo.reactivarPorId(id);

        String destinatario = e.getEmpleado() != null
            ? e.getEmpleado().getApellido() + ", " + e.getEmpleado().getNombre() + " (#" + e.getEmpleado().getNroLegajo() + ")"
            : "Toda la Institución";

        auditor.registrar(
            "REACTIVAR_EXCEPCION_LICENCIA",
            "EXCEPCIONES",
            String.format("Reactivación de %s #%d para %s (%s al %s).",
                e.getTipoEtiqueta(),
                e.getId(),
                destinatario,
                e.getFechaInicio(),
                e.getFechaFin())
        );
    }

    private DetalleLicenciaDTO calcularDetalle(ExcepcionLicencia e, LocalDate hoy) {
        LocalDate ini = e.getFechaInicio();
        LocalDate fin = e.getFechaFin();
        int totalDias = e.getDiasDuracion();

        String condicion;
        String textoProgreso;
        String detalleVigencia;
        int porcentaje;
        int transcurridos = 0;
        int restantes = 0;

        if (hoy.isBefore(ini)) {
            condicion = "PROXIMA";
            long faltan = ChronoUnit.DAYS.between(hoy, ini);
            textoProgreso = "Inicia en " + faltan + " días";
            detalleVigencia = "Próxima (Faltan " + faltan + " días para que empiece) • Comienza el " + ini + " • Duración: " + totalDias + (totalDias == 1 ? " día" : " días");
            porcentaje = 0;
            restantes = totalDias;
        } else if (hoy.isAfter(fin)) {
            condicion = "FINALIZADA";
            long concluyo = ChronoUnit.DAYS.between(fin, hoy);
            textoProgreso = concluyo == 1 ? "Finalizó ayer" : "Finalizó hace " + concluyo + " días";
            detalleVigencia = "Concluyó el " + fin + " • Duró " + totalDias + (totalDias == 1 ? " día" : " días");
            porcentaje = 100;
            transcurridos = totalDias;
        } else {
            condicion = "EN_CURSO";
            transcurridos = (int) ChronoUnit.DAYS.between(ini, hoy) + 1;
            restantes = (int) ChronoUnit.DAYS.between(hoy, fin);

            if (totalDias == 1) {
                textoProgreso = "¡Vence hoy!";
                detalleVigencia = "En curso hoy (vigencia de 1 día) • ¡Último día de vigencia! Concluye hoy a las 23:59 hs";
                porcentaje = 100;
            } else {
                textoProgreso = "Día " + transcurridos + "/" + totalDias + " (Quedan " + restantes + "d)";
                detalleVigencia = "En curso: van " + transcurridos + " de " + totalDias + " días • Restan " + restantes + " días para que finalice";
                porcentaje = (int) Math.round(((double) transcurridos / totalDias) * 100);
            }
        }

        Empleado emp = e.getEmpleado();
        String nombreEmp = emp != null ? (emp.getApellido() + ", " + emp.getNombre()) : "Toda la Institución";
        String legajo = emp != null ? emp.getNroLegajo() : "";

        String rolArea = "Personal";
        if (e.getEsInstitucional() || emp == null) {
            rolArea = "Institucional";
        } else {
            if (emp.getCategorias() != null && !emp.getCategorias().isEmpty()) {
                rolArea = emp.getCategorias().get(0).getNombre(); 
            } else {
                Optional<Usuario> usuarioOpt = usuarioRepo.findByEmpleadoId(emp.getId());
                if (usuarioOpt.isPresent() && usuarioOpt.get().getRol() != null) {
                    rolArea = formatearRolUsuario(usuarioOpt.get().getRol());
                } else if (emp.getNroLegajo() != null) {
                    String leg = emp.getNroLegajo().toUpperCase();
                    if (leg.contains("DOC")) rolArea = "Docente";
                    else if (leg.contains("ADM")) rolArea = "Administrativo";
                    else if (leg.contains("GEN")) rolArea = "Servicios Generales";
                }
            }
        }

        return new DetalleLicenciaDTO(
            e.getId(),
            emp != null ? emp.getId() : null,
            nombreEmp,
            legajo,
            rolArea,
            e.getEsInstitucional(),
            e.getTipo(),
            e.getTipoEtiqueta(),
            e.getFechaInicio(),
            e.getFechaFin(),
            e.getDiasDuracion(),
            e.getEstado(),
            e.getMotivoDictamen(),
            e.getObservacionesRrhh(),
            e.getCreadoEn(),
            Boolean.TRUE.equals(e.getActivo()),
            condicion,
            textoProgreso,
            detalleVigencia,
            porcentaje,
            transcurridos,
            restantes
        );
    }

    private String formatearRolUsuario(String rol) {
        if (rol == null) return "Personal";
        return switch (rol.toUpperCase()) {
            case "ADMINISTRADOR", "ADMIN" -> "Administrador";
            case "AUDITOR", "RECURSOS_HUMANOS", "RRHH" -> "Recursos Humanos";
            case "DOCENTE" -> "Docente";
            case "ADMINISTRATIVO" -> "Administrativo";
            default -> rol;
        };
    }

    private String obtenerIniciales(String nombreCompleto) {
        if (nombreCompleto == null || nombreCompleto.isBlank()) return "EX";
        String[] partes = nombreCompleto.replace(",", "").trim().split("\\s+");
        if (partes.length == 1) return partes[0].substring(0, Math.min(2, partes[0].length())).toUpperCase();
        return ("" + partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
    }

    private String formatearTipoEtiqueta(String tipo) {
        return switch (tipo) {
            case "LICENCIA_MEDICA" -> "Licencia Médica";
            case "VACACIONES" -> "Vacaciones Anuales";
            case "CAMBIO_HORARIO" -> "Cambio de Horario";
            case "COMISION_SERVICIO" -> "Comisión de Servicio";
            case "HORAS_EXTRA" -> "Horas extra";
            case "FERIADO_ASUETO" -> "Feriado / Asueto";
            case "OTRA_FRANQUICIA" -> "Otra / Examen / Franquicia";
            default -> tipo;
        };
    }
}