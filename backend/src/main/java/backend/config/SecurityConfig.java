package backend.config;

import backend.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth

                // 1. CORS Preflight y Endpoints Públicos
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**", "/auth/**", "/api/public/**", "/public/**", "/error").permitAll()
                .requestMatchers("/api/stream/**").permitAll()

                // 2. Perfil Propio
                .requestMatchers(HttpMethod.GET, "/api/usuarios/mi-perfil").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/usuarios/mi-perfil/**").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/usuarios/*/primer-cambio-password").authenticated()

                // 3. Catálogos maestros de solo lectura
                .requestMatchers(HttpMethod.GET, "/api/configuracion/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/seguridad/catalogo-permisos").authenticated()

                // 4. Edición de tablas de configuración
                .requestMatchers(HttpMethod.POST, "/api/configuracion/categorias/**").hasAnyAuthority("CONFIG_EDITAR_CATEGORIAS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/configuracion/categorias/**").hasAnyAuthority("CONFIG_EDITAR_CATEGORIAS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/configuracion/categorias/**").hasAnyAuthority("CONFIG_EDITAR_CATEGORIAS", "PERM_ADMIN_TOTAL")

                .requestMatchers(HttpMethod.POST, "/api/configuracion/cargos/**").hasAnyAuthority("CONFIG_EDITAR_CARGOS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/configuracion/cargos/**").hasAnyAuthority("CONFIG_EDITAR_CARGOS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/configuracion/cargos/**").hasAnyAuthority("CONFIG_EDITAR_CARGOS", "PERM_ADMIN_TOTAL")

                .requestMatchers(HttpMethod.POST, "/api/configuracion/horarios/**").hasAnyAuthority("CONFIG_EDITAR_TURNOS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/configuracion/horarios/**").hasAnyAuthority("CONFIG_EDITAR_TURNOS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/configuracion/horarios/**").hasAnyAuthority("CONFIG_EDITAR_TURNOS", "PERM_ADMIN_TOTAL")
                
                // 5. Horarios
                .requestMatchers(HttpMethod.GET, "/api/horarios/**", "/api/empleados/*/horarios/**", "/api/empleados/*/horarios")
                    .hasAnyAuthority("HORARIOS_VER", "PERSONAL_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.GET, "/api/empleados/*/metricas")
                    .hasAnyAuthority("HORARIOS_VER", "PERSONAL_VER", "FICHAS_COMPORTAMIENTO_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.POST, "/api/horarios/**", "/api/empleados/*/horarios/**", "/api/empleados/*/horarios")
                    .hasAnyAuthority("HORARIOS_GESTIONAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/horarios/**", "/api/empleados/*/horarios/**", "/api/empleados/*/horarios")
                    .hasAnyAuthority("HORARIOS_GESTIONAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/horarios/**", "/api/empleados/*/horarios/**", "/api/empleados/horarios/**")
                    .hasAnyAuthority("HORARIOS_ELIMINAR", "PERM_ADMIN_TOTAL")

                // 6. Personal & Ficha de Comportamiento
                .requestMatchers(HttpMethod.GET, "/api/ficha-comportamiento/**", "/api/empleados/*/ficha-comportamiento/**")
                    .hasAnyAuthority("FICHAS_COMPORTAMIENTO_VER", "PERSONAL_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.GET, "/api/empleados/**")
                    .hasAnyAuthority("PERSONAL_VER", "FICHAS_COMPORTAMIENTO_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.POST, "/api/empleados/**").hasAnyAuthority("PERSONAL_CREAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/empleados/**").hasAnyAuthority("PERSONAL_EDITAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PATCH, "/api/empleados/*/reactivar", "/api/empleados/*/estado").hasAnyAuthority("PERSONAL_BAJA_REACTIVAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/empleados/**").hasAnyAuthority("PERSONAL_BAJA_REACTIVAR", "PERM_ADMIN_TOTAL")

                // 7. Fichajes
                .requestMatchers(HttpMethod.GET, "/api/fichajes/**", "/api/importacion/**").hasAnyAuthority("FICHAJES_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.POST, "/api/fichajes/importar", "/api/importacion/subir").hasAnyAuthority("FICHAJES_IMPORTAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.POST, "/api/fichajes/vincular").hasAnyAuthority("FICHAJES_VINCULAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/fichajes/lotes/**").hasAnyAuthority("FICHAJES_ELIMINAR_LOTE", "PERM_ADMIN_TOTAL")

                // 8. Usuarios
                .requestMatchers(HttpMethod.GET, "/api/usuarios/**").hasAnyAuthority("USUARIOS_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.POST, "/api/usuarios/**").hasAnyAuthority("USUARIOS_GESTIONAR_ACCESOS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/usuarios/*/reset-password").hasAnyAuthority("USUARIOS_RESET_PASSWORD", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PATCH, "/api/usuarios/*/estado").hasAnyAuthority("USUARIOS_SUSPENDER", "PERM_ADMIN_TOTAL")
                .requestMatchers("/api/seguridad/usuarios/*/permisos/**").hasAnyAuthority("USUARIOS_GESTIONAR_ACCESOS", "PERM_ADMIN_TOTAL")

                // 9. Auditoría
                .requestMatchers("/api/seguridad/auditoria/**").hasAnyAuthority("AUDITORIA_VER", "PERM_ADMIN_TOTAL")

                // 10. Incidentes
                .requestMatchers(HttpMethod.GET, "/api/incidentes/**").hasAnyAuthority("INCIDENTES_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/incidentes/*/resolver").hasAnyAuthority("INCIDENTES_JUSTIFICAR", "PERM_ADMIN_TOTAL")

                // 11. Materias & Liquidación Docente
                .requestMatchers(HttpMethod.GET, "/api/materias", "/api/materias/*", "/api/materias/catalogo-agrupado", "/api/materias/calendario-semanal")
                    .hasAnyAuthority("MATERIAS_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.GET, "/api/materias/resumen")
                    .hasAnyAuthority("LIQUIDACION_DOCENTE", "MATERIAS_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.GET, "/api/materias/*/impacto-baja")
                    .hasAnyAuthority("MATERIAS_ELIMINAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.POST, "/api/materias", "/api/materias/**")
                    .hasAnyAuthority("MATERIAS_CREAR", "MATERIAS_EDITAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/materias/**")
                    .hasAnyAuthority("MATERIAS_EDITAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/materias/**")
                    .hasAnyAuthority("MATERIAS_ELIMINAR", "PERM_ADMIN_TOTAL")

                // 12. Excepciones y Licencias
                .requestMatchers(HttpMethod.GET, "/api/excepciones-licencias/**")
                    .hasAnyAuthority("EXCEPCIONES_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.POST, "/api/excepciones-licencias/**")
                    .hasAnyAuthority("EXCEPCIONES_CREAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PATCH, "/api/excepciones-licencias/*/dictaminar")
                    .hasAnyAuthority("EXCEPCIONES_DICTAMINAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/excepciones-licencias/**")
                    .hasAnyAuthority("EXCEPCIONES_ELIMINAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/excepciones-licencias/**")
                    .hasAnyAuthority("EXCEPCIONES_CREAR", "PERM_ADMIN_TOTAL")

                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173", "http://127.0.0.1:5173")); 
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Cache-Control", "Accept", "X-Requested-With", "Origin"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}