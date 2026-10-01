package backend.controller;

import backend.dto.AsignarPermisoRequest;
import backend.dto.AuditoriaMetricasDTO;
import backend.dto.UsuarioPermisoDTO;
import backend.model.AuditoriaMovimiento;
import backend.model.Permiso;
import backend.repositories.PermisoRepository;
import backend.service.AuditoriaYPermisosService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/seguridad")
@CrossOrigin(origins = "*")
public class PermisosYAuditoriaController {

    private final AuditoriaYPermisosService permisosService;
    private final PermisoRepository permisoRepo;

    public PermisosYAuditoriaController(AuditoriaYPermisosService permisosService,
                                        PermisoRepository permisoRepo) {
        this.permisosService = permisosService;
        this.permisoRepo = permisoRepo;
    }

    // =========================================================================
    // 1. CATÁLOGO MAESTRO DE PERMISOS (DIRECTO DESDE LA BASE DE DATOS)
    // =========================================================================

    /**
     * Devuelve el catálogo unificado de permisos ordenados por módulo y código.
     * Utilizado por el frontend para renderizar dinámicamente las casillas del modal.
     */
    @GetMapping("/catalogo-permisos")
    public ResponseEntity<List<Permiso>> obtenerCatalogoCompleto() {
        return ResponseEntity.ok(permisoRepo.findAllByOrderByModuloAscCodigoAsc());
    }

    // =========================================================================
    // 2. GESTIÓN GRANULAR DE PERMISOS POR USUARIO
    // =========================================================================

    /**
     * Lista los permisos asignados a un usuario, indicando vigencia y temporalidad.
     */
    @GetMapping("/usuarios/{usuarioId}/permisos")
    public ResponseEntity<List<UsuarioPermisoDTO>> obtenerPermisosUsuario(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(permisosService.listarPermisosDeUsuario(usuarioId));
    }

    /**
     * Otorga o actualiza permisos (permanentes o temporales por X días o fecha límite).
     */
    @PostMapping("/usuarios/{usuarioId}/permisos")
    public ResponseEntity<?> asignarPermisos(
            @PathVariable Long usuarioId,
            @RequestBody List<AsignarPermisoRequest> solicitudes,
            Authentication auth) {
        String adminEjecutor = (auth != null && auth.getName() != null) ? auth.getName() : "ADMIN";
        permisosService.asignarPermisosAUsuario(usuarioId, solicitudes, adminEjecutor);
        return ResponseEntity.ok(Map.of("message", "Permisos asignados y actualizados exitosamente."));
    }

    /**
     * Revoca un permiso específico asignado a un usuario.
     */
    @DeleteMapping("/usuarios/{usuarioId}/permisos/{codigoPermiso}")
    public ResponseEntity<Void> revocarPermiso(
            @PathVariable Long usuarioId,
            @PathVariable String codigoPermiso,
            Authentication auth) {
        String adminEjecutor = (auth != null && auth.getName() != null) ? auth.getName() : "ADMIN";
        permisosService.revocarPermiso(usuarioId, codigoPermiso, adminEjecutor);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 3. AUDITORÍA INMUTABLE Y MÉTRICAS
    // =========================================================================

    /**
     * Listado paginado y filtrado de la bitácora inmutable de auditoría.
     */
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

    /**
     * Métricas agregadas y estadísticas de movimientos (distribución por acción y operadores).
     */
    @GetMapping("/auditoria/metricas")
    public ResponseEntity<AuditoriaMetricasDTO> obtenerMetricas(
            @RequestParam(value = "fechaInicio", required = false) String fechaInicio,
            @RequestParam(value = "fechaFin", required = false) String fechaFin) {
        return ResponseEntity.ok(permisosService.obtenerMetricasAuditoria(fechaInicio, fechaFin));
    }
}