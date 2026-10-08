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
    System.out.println(">>> [AUTH SERVICE] 1. Buscando usuario: " + request.username());

    Usuario usuario = usuarioRepo.findByUsername(request.username().trim())
            .orElseThrow(() -> {
                System.err.println(">>> [AUTH SERVICE] Falla: Usuario NO encontrado");
                return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario o contraseña incorrectos.");
            });

    System.out.println(">>> [AUTH SERVICE] 2. Usuario hallado. Validando password...");
    if (!passwordEncoder.matches(request.password(), usuario.getPasswordHash())) {
        System.err.println(">>> [AUTH SERVICE] Falla: Password no coincide");
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario o contraseña incorrectos.");
    }

    System.out.println(">>> [AUTH SERVICE] 3. Password correcta. Chequeando activo: " + usuario.getActivo());
    if (!Boolean.TRUE.equals(usuario.getActivo())) {
        System.err.println(">>> [AUTH SERVICE] Falla: Usuario NO activo (activo = " + usuario.getActivo() + ")");
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La cuenta se encuentra suspendida.");
    }

    System.out.println(">>> [AUTH SERVICE] 4. Generando token...");

        // 4. Continuar con la generación de token y permisos...
        Set<String> permisos = new HashSet<>();
        String rol = usuario.getRol() != null ? usuario.getRol().trim().toUpperCase() : "CONSULTA";

        if (rol.contains("ADMIN")) {
            permisos.addAll(permisoRepo.findAllCodigos());
            permisos.add("PERM_ADMIN_TOTAL");
        } else {
            List<UsuarioPermiso> vigentes = usuarioPermRepo.findPermisosVigentes(usuario.getId(), LocalDateTime.now());
            for (UsuarioPermiso up : vigentes) {
                permisos.add(up.getCodigoPermiso());
            }
        }

        String nombreCompleto = usuario.getEmpleado() != null
                ? usuario.getEmpleado().getNombre() + " " + usuario.getEmpleado().getApellido()
                : usuario.getUsername();

        boolean debeCambiar = Boolean.TRUE.equals(usuario.getDebeCambiarPassword());

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