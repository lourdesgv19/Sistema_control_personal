package backend.security;

import backend.model.Usuario;
import backend.repositories.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepo;

    public JwtAuthenticationFilter(JwtService jwtService, UsuarioRepository usuarioRepo) {
        this.jwtService = jwtService;
        this.usuarioRepo = usuarioRepo;
    }

    /**
     * Omite la ejecución de este filtro para endpoints públicos y de autenticación.
     */
@Override
protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getServletPath();
    boolean omitir = path.startsWith("/api/auth/") || path.startsWith("/auth/") 
                  || path.startsWith("/api/public/") || path.startsWith("/public/");
    System.out.println(">>> [FILTRO JWT] shouldNotFilter? " + omitir + " para ruta: " + path);
    return omitir;
}

@Override
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {

    System.out.println(">>> [FILTRO JWT] Procesando request: " + request.getMethod() + " " + request.getServletPath());
    final String token = getTokenFromRequest(request);
    System.out.println(">>> [FILTRO JWT] Token recibido: " + (token != null ? "PRESENTE" : "NULL"));

    if (token == null) {
        filterChain.doFilter(request, response);
        return;
    }

    try {
        String username = jwtService.getUsernameFromToken(token);
        System.out.println(">>> [FILTRO JWT] Username en token: " + username);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                Usuario usuario = usuarioRepo.findByUsername(username).orElse(null);

                if (usuario != null && Boolean.TRUE.equals(usuario.getActivo()) && jwtService.isTokenValid(token, username)) {
                    List<String> permisos = jwtService.getPermisosFromToken(token);

                    var authorities = permisos.stream()
                            .map(SimpleGrantedAuthority::new)
                            .toList();

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            authorities
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
           System.err.println(">>> [FILTRO JWT] Error procesando token: " + e.getMessage());
            SecurityContextHolder.clearContext();
            System.err.println("Error procesando JWT: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String rawToken = authHeader.substring(7).trim();
            // Evita procesar valores de token vacíos o serializaciones erróneas del frontend
            if (!rawToken.isEmpty() && !"null".equalsIgnoreCase(rawToken) && !"undefined".equalsIgnoreCase(rawToken)) {
                return rawToken;
            }
        }
        return null;
    }
}