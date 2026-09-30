package backend.controller;

import backend.dto.CrearUsuarioRequest;
import backend.dto.UsuarioDTO;
import backend.dto.UsuarioResumenDTO;
import backend.service.UsuarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "http://localhost:5173")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    // Listado paginado desde base de datos
    @GetMapping
    public ResponseEntity<Page<UsuarioDTO>> listar(
            @RequestParam(value = "q", required = false, defaultValue = "") String q,
            @RequestParam(value = "rol", required = false, defaultValue = "TODOS") String rol,
            @RequestParam(value = "estado", required = false, defaultValue = "TODOS") String estado,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size) {
        return ResponseEntity.ok(usuarioService.listarPaginado(q, rol, estado, page, size));
    }

    @GetMapping("/resumen-metricas")
    public ResponseEntity<UsuarioResumenDTO> obtenerResumenMetricas() {
        return ResponseEntity.ok(usuarioService.obtenerResumenMetricas());
    }

    @GetMapping("/empleado/{empleadoId}")
    public ResponseEntity<UsuarioDTO> obtenerPorEmpleado(@PathVariable Long empleadoId) {
        UsuarioDTO dto = usuarioService.obtenerPorEmpleadoId(empleadoId);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody CrearUsuarioRequest req) {
        try {
            return new ResponseEntity<>(usuarioService.crearUsuarioParaEmpleado(req), HttpStatus.CREATED);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id) {
        try {
            usuarioService.restablecerPasswordPredeterminada(id);
            return ResponseEntity.ok(Map.of("message", "Contraseña restablecida exitosamente."));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Void> cambiarEstado(@PathVariable Long id, @RequestParam boolean activo) {
        usuarioService.cambiarEstado(id, activo);
        return ResponseEntity.noContent().build();
    }
}