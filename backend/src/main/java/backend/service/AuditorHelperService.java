package backend.service;

import backend.model.Usuario;
import backend.repositories.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import java.util.Optional;

@Service
public class AuditorHelperService {

    private final AuditoriaYPermisosService auditoriaService;
    private final UsuarioRepository usuarioRepo;

    public AuditorHelperService(AuditoriaYPermisosService auditoriaService, UsuarioRepository usuarioRepo) {
        this.auditoriaService = auditoriaService;
        this.usuarioRepo = usuarioRepo;
    }

    /**
     * Registra un movimiento capturando automáticamente el usuario autenticado,
     * su rol verídico en el sistema y la IP de origen.
     */
    public void registrar(String accion, String modulo, String descripcion) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        String username = "SISTEMA";
        String rol = "SISTEMA";
        Long idUsuario = null;

        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            username = auth.getName();

            // 1. Consultar el usuario en base de datos para obtener su rol real asignado
            Optional<Usuario> userOpt = usuarioRepo.findByUsername(username);
            if (userOpt.isPresent()) {
                Usuario u = userOpt.get();
                idUsuario = u.getId();
                rol = u.getRol() != null ? u.getRol() : "OPERADOR";
            } else {
                // Alternativa: extraer el rol de las autoridades del token JWT
                rol = auth.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .filter(a -> a.startsWith("ROLE_") || "ADMIN".equals(a) || "ADMINISTRADOR".equals(a) || "AUDITOR".equals(a))
                        .findFirst()
                        .orElse("OPERADOR");
            }
        }

        // 2. Extraer IP del cliente HTTP
        String ip = obtenerIpCliente();

        // 3. Persistir en la tabla de auditoría inmutable
        auditoriaService.registrarMovimiento(idUsuario, username, rol, accion, modulo, descripcion, ip);
    }

    private String obtenerIpCliente() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String ipHeader = req.getHeader("X-Forwarded-For");
                if (ipHeader != null && !ipHeader.isBlank() && !"unknown".equalsIgnoreCase(ipHeader)) {
                    return ipHeader.split(",")[0].trim();
                }
                return req.getRemoteAddr();
            }
        } catch (Exception ignored) {
        }
        return "127.0.0.1";
    }
}