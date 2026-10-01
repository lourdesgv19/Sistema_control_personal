package backend.service;

import backend.dto.AsignarPermisoRequest;
import backend.dto.AuditoriaMetricasDTO;
import backend.dto.UsuarioPermisoDTO;
import backend.model.AuditoriaMovimiento;
import backend.model.Usuario;
import backend.model.UsuarioPermiso;
import backend.repositories.AuditoriaMovimientoRepository;
import backend.repositories.UsuarioPermisoRepository;
import backend.repositories.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AuditoriaYPermisosService {

    private static final Logger log = LoggerFactory.getLogger(AuditoriaYPermisosService.class);

    private final UsuarioPermisoRepository usuarioPermisoRepo;
    private final UsuarioRepository usuarioRepo;
    private final AuditoriaMovimientoRepository auditoriaRepo;

    public AuditoriaYPermisosService(UsuarioPermisoRepository usuarioPermisoRepo,
                                     UsuarioRepository usuarioRepo,
                                     AuditoriaMovimientoRepository auditoriaRepo) {
        this.usuarioPermisoRepo = usuarioPermisoRepo;
        this.usuarioRepo = usuarioRepo;
        this.auditoriaRepo = auditoriaRepo;
    }

    // --- AUDITORÍA DE MOVIMIENTOS ---
    @Transactional
    public void registrarMovimiento(Long idUsuario, String username, String rol, String accion, String modulo, String descripcion, String ip) {
        AuditoriaMovimiento aud = new AuditoriaMovimiento(idUsuario, username, rol, accion, modulo, descripcion, ip);
        auditoriaRepo.save(aud);
    }

    // --- GESTIÓN DE PERMISOS GRANULARES ---
    @Transactional(readOnly = true)
    public List<UsuarioPermisoDTO> listarPermisosDeUsuario(Long usuarioId) {
        return usuarioPermisoRepo.findByUsuarioId(usuarioId).stream().map(up ->
            new UsuarioPermisoDTO(
                up.getId(),
                up.getCodigoPermiso(),
                up.getActivo(),
                up.getEsTemporal(),
                up.isVigente(),
                up.getFechaOtorgacion(),
                up.getFechaExpiracion(),
                up.getOtorgadoPor(),
                up.getMotivo()
            )
        ).toList();
    }

    /**
     * Sincroniza los permisos de un usuario:
     * - Activa o crea los que están en la lista `solicitudes`.
     * - Desactiva (activo = false) los que fueron desmarcados.
     */
    @Transactional
    public void asignarPermisosAUsuario(Long usuarioId, List<AsignarPermisoRequest> solicitudes, String administradorEjecutor) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + usuarioId));

        List<AsignarPermisoRequest> listaSolicitudes = (solicitudes != null) ? solicitudes : Collections.emptyList();

        // 1. Conjunto de códigos que se desean mantener o asignar
        Set<String> codigosNuevos = listaSolicitudes.stream()
                .map(AsignarPermisoRequest::codigoPermiso)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // 2. Permisos existentes en base de datos para este usuario
        List<UsuarioPermiso> permisosActuales = usuarioPermisoRepo.findByUsuarioId(usuarioId);

        // 3. DESACTIVAR los que fueron desmarcados (los que ya no están en codigosNuevos)
        for (UsuarioPermiso up : permisosActuales) {
            if (!codigosNuevos.contains(up.getCodigoPermiso()) && Boolean.TRUE.equals(up.getActivo())) {
                up.setActivo(false);
                usuarioPermisoRepo.save(up);

                // Auditoría de revocación
                registrarMovimiento(
                    null,
                    administradorEjecutor,
                    "ADMINISTRADOR_GENERAL",
                    "REVOCACION_PERMISO",
                    "SEGURIDAD",
                    "Se revocó el permiso " + up.getCodigoPermiso() + " al usuario " + usuario.getUsername(),
                    null
                );
            }
        }

        // 4. ACTIVAR O CREAR los que sí fueron seleccionados
        for (AsignarPermisoRequest req : listaSolicitudes) {
            UsuarioPermiso up = usuarioPermisoRepo.findByUsuarioIdAndCodigoPermiso(usuarioId, req.codigoPermiso())
                    .orElse(new UsuarioPermiso());

            boolean eraInactivo = !Boolean.TRUE.equals(up.getActivo());

            up.setUsuario(usuario);
            up.setCodigoPermiso(req.codigoPermiso());
            up.setActivo(true);
            up.setOtorgadoPor(administradorEjecutor);
            up.setMotivo(req.motivo());
            up.setFechaOtorgacion(LocalDateTime.now());

            boolean temporal = Boolean.TRUE.equals(req.esTemporal()) || (req.duracionDias() != null && req.duracionDias() > 0);
            up.setEsTemporal(temporal);

            if (temporal) {
                if (req.fechaExpiracion() != null) {
                    up.setFechaExpiracion(req.fechaExpiracion());
                } else {
                    int dias = (req.duracionDias() != null && req.duracionDias() > 0) ? req.duracionDias() : 1;
                    up.setFechaExpiracion(LocalDateTime.now().plusDays(dias));
                }
            } else {
                up.setFechaExpiracion(null);
            }

            usuarioPermisoRepo.save(up);

            // Registrar movimiento en auditoría solo si es nuevo o cambió su estado
            String detalleVigencia = up.getEsTemporal() ? "Temporal hasta: " + up.getFechaExpiracion() : "Permanente";
            registrarMovimiento(
                null,
                administradorEjecutor,
                "ADMINISTRADOR_GENERAL",
                "ASIGNACION_PERMISO",
                "SEGURIDAD",
                "Se asignó el permiso " + up.getCodigoPermiso() + " a " + usuario.getUsername() + " (" + detalleVigencia + ")",
                null
            );
        }
    }

    @Transactional
    public void revocarPermiso(Long usuarioId, String codigoPermiso, String administradorEjecutor) {
        usuarioPermisoRepo.findByUsuarioIdAndCodigoPermiso(usuarioId, codigoPermiso).ifPresent(up -> {
            up.setActivo(false);
            usuarioPermisoRepo.save(up);

            registrarMovimiento(
                null,
                administradorEjecutor,
                "ADMINISTRADOR_GENERAL",
                "REVOCACION_PERMISO",
                "SEGURIDAD",
                "Se revocó el permiso " + codigoPermiso + " a usuario ID: " + usuarioId,
                null
            );
        });
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void purgarPermisosExpiradosAutomaticamente() {
        LocalDateTime ahora = LocalDateTime.now();
        int desactivados = usuarioPermisoRepo.desactivarPermisosExpirados(ahora);
        if (desactivados > 0) {
            log.info("Tarea programada: se desactivaron automáticamente {} permisos temporales vencidos.", desactivados);
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditoriaMovimiento> listarAuditoriaFiltrada(
            String username, String accion, String fechaInicioStr, String fechaFinStr, int page, int size) {

        LocalDateTime inicio = (fechaInicioStr != null && !fechaInicioStr.isBlank())
                ? LocalDate.parse(fechaInicioStr.trim()).atStartOfDay() : null;
        LocalDateTime fin = (fechaFinStr != null && !fechaFinStr.isBlank())
                ? LocalDate.parse(fechaFinStr.trim()).atTime(LocalTime.MAX) : null;

        return auditoriaRepo.buscarPaginado(username, accion, inicio, fin, PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public AuditoriaMetricasDTO obtenerMetricasAuditoria(String fechaInicioStr, String fechaFinStr) {
        LocalDateTime inicio = (fechaInicioStr != null && !fechaInicioStr.isBlank())
                ? LocalDate.parse(fechaInicioStr.trim()).atStartOfDay() : null;
        LocalDateTime fin = (fechaFinStr != null && !fechaFinStr.isBlank())
                ? LocalDate.parse(fechaFinStr.trim()).atTime(LocalTime.MAX) : null;

        long total = auditoriaRepo.contarTotalMovimientosEnRango(inicio, fin);
        List<Object[]> porAccion = auditoriaRepo.contarMovimientosPorAccionEnRango(inicio, fin);
        List<Object[]> porUsuario = auditoriaRepo.contarMovimientosPorUsuarioEnRango(inicio, fin);
        List<String> acciones = auditoriaRepo.findDistinctAcciones();

        List<AuditoriaMetricasDTO.ItemMetrica> distAcciones = porAccion.stream().map(row -> {
            String acc = (String) row[0];
            long cant = ((Number) row[1]).longValue();
            double porc = total > 0 ? (cant * 100.0) / total : 0;
            return new AuditoriaMetricasDTO.ItemMetrica(acc, cant, Math.round(porc * 10.0) / 10.0);
        }).toList();

        List<AuditoriaMetricasDTO.ItemMetrica> distUsuarios = porUsuario.stream().map(row -> {
            String usr = (String) row[0];
            long cant = ((Number) row[1]).longValue();
            double porc = total > 0 ? (cant * 100.0) / total : 0;
            return new AuditoriaMetricasDTO.ItemMetrica(usr, cant, Math.round(porc * 10.0) / 10.0);
        }).toList();

        String accionTop = distAcciones.isEmpty() ? "Sin movimientos en período" : distAcciones.get(0).etiqueta();

        return new AuditoriaMetricasDTO(
            total,
            porUsuario.size(),
            accionTop,
            distAcciones,
            distUsuarios,
            acciones
        );
    }
}