package backend.controller;

import backend.dto.CambioPasswordRequest;
import backend.dto.CrearUsuarioRequest;
import backend.dto.UsuarioDTO;
import backend.dto.UsuarioResumenDTO;
import backend.model.Usuario;
import backend.repositories.UsuarioRepository;
import backend.service.UsuarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "http://localhost:5173")
public class UsuarioController {

    private final UsuarioService usuarioService;
    private final UsuarioRepository usuarioRepo;

    public UsuarioController(UsuarioService usuarioService, UsuarioRepository usuarioRepo) { 
        this.usuarioService = usuarioService;
        this.usuarioRepo = usuarioRepo;
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

    @PutMapping("/{id}/primer-cambio-password")
    public ResponseEntity<?> cambiarPasswordPrimerInicio(
        @PathVariable Long id,
        @RequestBody CambioPasswordRequest req,
        Authentication auth) {
    try {
        // Validación: verificar que quien llama sea el dueño de la cuenta (o un ADMIN)
        Usuario usuario = usuarioRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        if (!usuario.getUsername().equals(auth.getName()) && !auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().contains("ADMIN"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "No tiene autorización para modificar esta cuenta."));
        }

        usuarioService.cambiarPasswordPrimerInicio(id, req.passwordActual(), req.passwordNueva());
        return ResponseEntity.ok(Map.of("message", "Contraseña actualizada exitosamente."));
    } catch (IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Void> cambiarEstado(@PathVariable Long id, @RequestParam boolean activo) {
        usuarioService.cambiarEstado(id, activo);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/mi-perfil")
    public ResponseEntity<?> obtenerMiPerfil(Authentication auth) {
    Usuario usuario = usuarioRepo.findByUsername(auth.getName())
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
    return ResponseEntity.ok(usuarioService.convertirADTO(usuario));
    }

    @PutMapping("/mi-perfil/contacto")
    public ResponseEntity<?> actualizarDatosContacto(
        @RequestBody Map<String, String> body,
        Authentication auth) {
    String email = body.get("email");
    String telefono = body.get("telefono");
    usuarioService.actualizarContacto(auth.getName(), email, telefono);
    return ResponseEntity.ok(Map.of("message", "Datos de contacto actualizados correctamente."));
    }

    @PutMapping("/mi-perfil/cambiar-password")
    public ResponseEntity<?> cambiarPasswordPerfil(
        @RequestBody CambioPasswordRequest req,
        Authentication auth) {
    try {
        usuarioService.cambiarPasswordPerfil(auth.getName(), req.passwordActual(), req.passwordNueva());
        return ResponseEntity.ok(Map.of("message", "Contraseña actualizada exitosamente."));
    } catch (IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }
    }
}