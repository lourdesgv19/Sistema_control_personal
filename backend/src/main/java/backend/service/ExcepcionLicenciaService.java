package backend.service;

import backend.dto.ExcepcionLicenciaDTOs.*;
import backend.model.Empleado;
import backend.model.ExcepcionLicencia;
import backend.model.Usuario;
import backend.repositories.EmpleadoRepository;
import backend.repositories.ExcepcionLicenciaRepository;
import backend.repositories.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExcepcionLicenciaService {

    private final ExcepcionLicenciaRepository excepcionRepo;
    private final EmpleadoRepository empleadoRepo;
    private final UsuarioRepository usuarioRepo;

public ExcepcionLicenciaService(
            ExcepcionLicenciaRepository excepcionRepo,
            EmpleadoRepository empleadoRepo,
            UsuarioRepository usuarioRepo) {
        this.excepcionRepo = excepcionRepo;
        this.empleadoRepo = empleadoRepo;
        this.usuarioRepo = usuarioRepo;
    }

    @Transactional(readOnly = true)
    public ResumenPanelDTO obtenerPanel(String busqueda, String estado, String tipo, String categoria) {
        LocalDate hoy = LocalDate.now();
        List<ExcepcionLicencia> todas = excepcionRepo.listarConFiltros(estado, tipo, busqueda);

        // Mapear cada una calculando en tiempo real su condición temporal
        List<DetalleLicenciaDTO> listado = todas.stream()
            .map(e -> calcularDetalle(e, hoy))
            .filter(d -> {
                if (categoria == null || categoria.isBlank() || categoria.equalsIgnoreCase("TODAS")) return true;
                if (d.esInstitucional()) return categoria.equalsIgnoreCase("INSTITUCIONAL");
                return d.rolArea() != null && d.rolArea().equalsIgnoreCase(categoria);
            })
            .collect(Collectors.toList());

        // Contadores superiores de tarjetas métricas
        long enCursoHoy = listado.stream().filter(d -> "EN_CURSO".equals(d.condicionTemporal())).count();
        long proximas = listado.stream().filter(d -> "PROXIMA".equals(d.condicionTemporal())).count();
        long finalizadas = listado.stream().filter(d -> "FINALIZADA".equals(d.condicionTemporal())).count();
        long pendientesRrhh = listado.stream().filter(d -> "PENDIENTE_RRHH".equals(d.estado())).count();
        long totalRegistros = listado.size();

        // Agrupación de desglose por agente
        Map<String, List<DetalleLicenciaDTO>> agrupado = new LinkedHashMap<>();
        
        // Colocar primero a los institucionales si existen
        List<DetalleLicenciaDTO> institucionales = listado.stream().filter(DetalleLicenciaDTO::esInstitucional).toList();
        if (!institucionales.isEmpty()) {
            agrupado.put("INSTITUCIONAL", institucionales);
        }

        // Agrupar el resto por empleado
        listado.stream()
            .filter(d -> !d.esInstitucional())
            .forEach(d -> {
                String key = "EMP_" + d.idEmpleado();
                agrupado.computeIfAbsent(key, k -> new ArrayList<>()).add(d);
            });

        List<AgenteDesgloseDTO> desgloseAgentes = new ArrayList<>();

        for (Map.Entry<String, List<DetalleLicenciaDTO>> entry : agrupado.entrySet()) {
            List<DetalleLicenciaDTO> listaAgente = entry.getValue();
            DetalleLicenciaDTO primerItem = listaAgente.get(0);

            int totalDias = listaAgente.stream().mapToInt(DetalleLicenciaDTO::diasDuracion).sum();
            int enCurso = (int) listaAgente.stream().filter(d -> "EN_CURSO".equals(d.condicionTemporal())).count();
            int pendientes = (int) listaAgente.stream().filter(d -> "PENDIENTE_RRHH".equals(d.estado())).count();
            int prox = (int) listaAgente.stream().filter(d -> "PROXIMA".equals(d.condicionTemporal())).count();
            int fin = (int) listaAgente.stream().filter(d -> "FINALIZADA".equals(d.condicionTemporal())).count();

            if (primerItem.esInstitucional()) {
                desgloseAgentes.add(new AgenteDesgloseDTO(
                    null, true, "Toda la Institución (Asuetos y Feriados)", "TF", "", "Institucional",
                    "Alcance general a todo el personal docente y no docente",
                    totalDias, listaAgente.size(), enCurso, pendientes, prox, fin, listaAgente
                ));
            } else {
                String iniciales = obtenerIniciales(primerItem.nombreEmpleado());
                desgloseAgentes.add(new AgenteDesgloseDTO(
                    primerItem.idEmpleado(), false, primerItem.nombreEmpleado(), iniciales,
                    primerItem.legajoEmpleado(), primerItem.rolArea(), "",
                    totalDias, listaAgente.size(), enCurso, pendientes, prox, fin, listaAgente
                ));
            }
        }

        return new ResumenPanelDTO(
            enCursoHoy, proximas, finalizadas, pendientesRrhh, totalRegistros,
            hoy.toString(), desgloseAgentes, listado
        );
    }

    @Transactional
    public DetalleLicenciaDTO registrarLicencia(CrearExcepcionRequest req, String usuario) {
        ExcepcionLicencia e = new ExcepcionLicencia();
        e.setEsInstitucional(req.esInstitucional() || req.idEmpleado() == null);

        if (!e.getEsInstitucional()) {
            Empleado emp = empleadoRepo.findById(req.idEmpleado())
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + req.idEmpleado()));
            e.setEmpleado(emp);
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
        return calcularDetalle(guardada, LocalDate.now());
    }

    @Transactional
    public DetalleLicenciaDTO dictaminar(Long id, DictaminarRequest req) {
        ExcepcionLicencia e = excepcionRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Registro no encontrado con ID: " + id));

        e.setEstado(req.nuevoEstado());
        if (req.observaciones() != null) {
            e.setObservacionesRrhh(req.observaciones());
        }
        return calcularDetalle(excepcionRepo.save(e), LocalDate.now());
    }

    @Transactional
    public void bajaLogica(Long id) {
        excepcionRepo.deleteById(id);
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

        // OBTENCIÓN SEGURA DEL ESTAMENTO / ÁREA / ROL:
        String rolArea = "Personal";
        if (e.getEsInstitucional() || emp == null) {
            rolArea = "Institucional";
        } else {
            // 1. Si el empleado tiene categorías asociadas (Docente, Administrativo, Servicios Generales)
            if (emp.getCategorias() != null && !emp.getCategorias().isEmpty()) {
                rolArea = emp.getCategorias().get(0).getNombre(); 
            } 
            // 2. Si no tiene categoría pero sí tiene un usuario con rol asignado en la tabla 'usuarios'
            else {
                Optional<Usuario> usuarioOpt = usuarioRepo.findByEmpleadoId(emp.getId());
                if (usuarioOpt.isPresent() && usuarioOpt.get().getRol() != null) {
                    rolArea = formatearRolUsuario(usuarioOpt.get().getRol());
                } else if (emp.getNroLegajo() != null) {
                    // Fallback visual por prefijo de legajo (ej: #DOC-1021, #ADM-2015, #GEN-3035)
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
            condicion,
            textoProgreso,
            detalleVigencia,
            porcentaje,
            transcurridos,
            restantes
        );
    }

    @Transactional
    public DetalleLicenciaDTO actualizarLicencia(Long id, CrearExcepcionRequest req) {
    ExcepcionLicencia e = excepcionRepo.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Excepción no encontrada con ID: " + id));

    e.setEsInstitucional(req.esInstitucional() || req.idEmpleado() == null);
    if (!e.getEsInstitucional()) {
        Empleado emp = empleadoRepo.findById(req.idEmpleado())
            .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + req.idEmpleado()));
        e.setEmpleado(emp);
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

    return calcularDetalle(excepcionRepo.save(e), LocalDate.now());
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