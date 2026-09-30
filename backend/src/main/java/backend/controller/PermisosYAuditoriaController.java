package backend.controller;

import backend.dto.AsignarPermisoRequest;
import backend.dto.AuditoriaMetricasDTO;
import backend.dto.UsuarioPermisoDTO;
import backend.model.AuditoriaMovimiento;
import backend.repositories.AuditoriaMovimientoRepository;
import backend.service.AuditoriaYPermisosService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/seguridad")
@CrossOrigin(origins = "*")
public class PermisosYAuditoriaController {

    private final AuditoriaYPermisosService permisosService;
    private final AuditoriaMovimientoRepository auditoriaRepo;

    public PermisosYAuditoriaController(AuditoriaYPermisosService permisosService, AuditoriaMovimientoRepository auditoriaRepo) {
        this.permisosService = permisosService;
        this.auditoriaRepo = auditoriaRepo;
    }

    // Listar permisos de un usuario
    @GetMapping("/usuarios/{usuarioId}/permisos")
    public ResponseEntity<List<UsuarioPermisoDTO>> obtenerPermisosUsuario(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(permisosService.listarPermisosDeUsuario(usuarioId));
    }

    // Asignar permisos (temporales o permanentes) - Exclusivo Administrador General
    @PostMapping("/usuarios/{usuarioId}/permisos")
    public ResponseEntity<?> asignarPermisos(
            @PathVariable Long usuarioId,
            @RequestBody List<AsignarPermisoRequest> solicitudes,
            Authentication auth) {
        String adminEjecutor = auth != null ? auth.getName() : "ADMIN";
        permisosService.asignarPermisosAUsuario(usuarioId, solicitudes, adminEjecutor);
        return ResponseEntity.ok(Map.of("message", "Permisos asignados y actualizados exitosamente."));
    }

    // Revocar permiso específico
    @DeleteMapping("/usuarios/{usuarioId}/permisos/{codigoPermiso}")
    public ResponseEntity<Void> revocarPermiso(
            @PathVariable Long usuarioId,
            @PathVariable String codigoPermiso,
            Authentication auth) {
        String adminEjecutor = auth != null ? auth.getName() : "ADMIN";
        permisosService.revocarPermiso(usuarioId, codigoPermiso, adminEjecutor);
        return ResponseEntity.noContent().build();
    }

    // Consultar padrón paginado de auditoría de movimientos
    @GetMapping("/auditoria")
    public ResponseEntity<Page<AuditoriaMovimiento>> listarAuditoria(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return ResponseEntity.ok(
            permisosService.listarAuditoriaFiltrada(username, accion, fechaInicio, fechaFin, page, size)
        );
    }

@GetMapping("/auditoria/metricas")
    public ResponseEntity<AuditoriaMetricasDTO> obtenerMetricas(
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin) {
        return ResponseEntity.ok(permisosService.obtenerMetricasAuditoria(fechaInicio, fechaFin));
    }
}