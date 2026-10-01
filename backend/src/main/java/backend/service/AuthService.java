package backend.service;

import backend.dto.AuthResponse;
import backend.dto.LoginRequest;
import backend.model.Usuario;
import backend.model.UsuarioPermiso;
import backend.repositories.PermisoRepository;
import backend.repositories.UsuarioPermisoRepository;
import backend.repositories.UsuarioRepository;
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
    private final PermisoRepository permisoRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository usuarioRepo,
                       UsuarioPermisoRepository usuarioPermRepo,
                       PermisoRepository permisoRepo,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.usuarioRepo = usuarioRepo;
        this.usuarioPermRepo = usuarioPermRepo;
        this.permisoRepo = permisoRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
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

        Set<String> permisos = new HashSet<>();
        String rol = usuario.getRol() != null ? usuario.getRol().trim().toUpperCase() : "CONSULTA";

        // Si es ADMINISTRADOR, se le asignan TODOS los permisos existentes en la base de datos
        if (rol.contains("ADMIN")) {
            permisos.addAll(permisoRepo.findAllCodigos());
            // Comodín global para bypass en SecurityConfig
            permisos.add("PERM_ADMIN_TOTAL");
        } else {
            // Usuarios regulares: lee de usuario_permisos únicamente los que estén activos y vigentes
            List<UsuarioPermiso> vigentes = usuarioPermRepo.findPermisosVigentes(usuario.getId(), LocalDateTime.now());
            for (UsuarioPermiso up : vigentes) {
                permisos.add(up.getCodigoPermiso());
            }
        }

        String nombreCompleto = usuario.getEmpleado() != null
                ? usuario.getEmpleado().getNombre() + " " + usuario.getEmpleado().getApellido()
                : usuario.getUsername();

        boolean debeCambiar = Boolean.TRUE.equals(usuario.getDebeCambiarPassword());

        // Claims dentro del token JWT
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("idUsuario", usuario.getId());
        extraClaims.put("rol", usuario.getRol());
        extraClaims.put("permisos", new ArrayList<>(permisos));
        extraClaims.put("nombre", nombreCompleto);
        extraClaims.put("debeCambiarPassword", debeCambiar);

        String token = jwtService.generarToken(extraClaims, usuario.getUsername());

        return new AuthResponse(
                token,
                usuario.getId(),
                usuario.getUsername(),
                usuario.getRol(),
                new ArrayList<>(permisos),
                nombreCompleto,
                debeCambiar
        );
    }
}