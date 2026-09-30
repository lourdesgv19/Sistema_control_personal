package backend.service;

import backend.dto.AuthResponse;
import backend.dto.LoginRequest;
import backend.model.Usuario;
import backend.model.UsuarioPermiso;
import backend.repositories.UsuarioRepository;
import backend.repositories.UsuarioPermisoRepository;
import backend.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepo;
    private final UsuarioPermisoRepository usuarioPermRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;


    public AuthService(UsuarioRepository usuarioRepo, PasswordEncoder passwordEncoder, JwtService jwtService, UsuarioPermisoRepository usuariopermrepo ) {
        this.usuarioRepo = usuarioRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.usuarioPermRepo = usuariopermrepo;
    }

    public AuthResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepo.findByUsername(request.username().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario o contraseña incorrectos."));

        if (!Boolean.TRUE.equals(usuario.getActivo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La cuenta se encuentra suspendida.");
        }

        if (!passwordEncoder.matches(request.password(), usuario.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario o contraseña incorrectos.");
        }

        // Matriz de permisos asignados según el rol del sistema
Set<String> permisos = new HashSet<>();
String rol = usuario.getRol().toUpperCase();

if ("ADMINISTRADOR_GENERAL".equals(rol) || "ADMIN".equals(rol)) {
    // Administrador General tiene acceso total + auditoría + gestión de permisos
    permisos.add("PERM_ADMIN_TOTAL");
    permisos.add("AUDITORIA_VER");
    permisos.add("USUARIOS_GESTIONAR_ACCESOS");
    permisos.add("USUARIOS_RESET_PASSWORD");
    permisos.add("PERSONAL_VER");
    permisos.add("PERSONAL_CREAR");
    permisos.add("PERSONAL_EDITAR");
    permisos.add("PERSONAL_BAJA_REACTIVAR");
    permisos.add("FICHAJES_VER");
    permisos.add("FICHAJES_IMPORTAR");
    permisos.add("FICHAJES_VINCULAR");
    permisos.add("CONFIG_VER");
    permisos.add("CONFIG_EDITAR_CATEGORIAS");
    permisos.add("CONFIG_EDITAR_CARGOS");
    permisos.add("CONFIG_EDITAR_MATERIAS_TURNOS");
} else {
    // Consulta los permisos granulares asignados en la tabla usuario_permisos que sigan VIGENTES
    List<UsuarioPermiso> vigentes = usuarioPermRepo.findPermisosVigentes(usuario.getId(), LocalDateTime.now());
    for (UsuarioPermiso up : vigentes) {
        permisos.add(up.getCodigoPermiso());
    }
}

        String nombreCompleto = usuario.getEmpleado() != null
                ? usuario.getEmpleado().getNombre() + " " + usuario.getEmpleado().getApellido()
                : usuario.getUsername();

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("idUsuario", usuario.getId());
        extraClaims.put("rol", usuario.getRol());
        extraClaims.put("permisos", new ArrayList<>(permisos));
        extraClaims.put("nombre", nombreCompleto);

        String token = jwtService.generarToken(extraClaims, usuario.getUsername());

        return new AuthResponse(
                token,
                usuario.getId(),
                usuario.getUsername(),
                usuario.getRol(),
                new ArrayList<>(permisos),
                nombreCompleto
        );
    }
}