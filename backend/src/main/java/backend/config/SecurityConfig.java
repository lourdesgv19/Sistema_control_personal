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
                .requestMatchers("/api/auth/**", "/api/public/**").permitAll()

                // 2. Cambio de contraseña propio (Cualquier usuario autenticado)
                .requestMatchers(HttpMethod.PUT, "/api/usuarios/*/primer-cambio-password").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/usuarios/mi-perfil/cambiar-password").authenticated()

                // 3. Catálogos maestros de solo lectura (Lectura permitida para alimentar filtros y selects)
                .requestMatchers(HttpMethod.GET, "/api/configuracion/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/seguridad/catalogo-permisos").authenticated()

                // 4. Edición de tablas de configuración (Requiere permisos específicos de configuración)
                .requestMatchers(HttpMethod.POST, "/api/configuracion/categorias/**").hasAnyAuthority("CONFIG_EDITAR_CATEGORIAS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/configuracion/categorias/**").hasAnyAuthority("CONFIG_EDITAR_CATEGORIAS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/configuracion/categorias/**").hasAnyAuthority("CONFIG_EDITAR_CATEGORIAS", "PERM_ADMIN_TOTAL")

                .requestMatchers(HttpMethod.POST, "/api/configuracion/cargos/**").hasAnyAuthority("CONFIG_EDITAR_CARGOS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/configuracion/cargos/**").hasAnyAuthority("CONFIG_EDITAR_CARGOS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/configuracion/cargos/**").hasAnyAuthority("CONFIG_EDITAR_CARGOS", "PERM_ADMIN_TOTAL")

                .requestMatchers(HttpMethod.POST, "/api/configuracion/materias/**", "/api/configuracion/horarios/**").hasAnyAuthority("CONFIG_EDITAR_MATERIAS_TURNOS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/configuracion/materias/**", "/api/configuracion/horarios/**").hasAnyAuthority("CONFIG_EDITAR_MATERIAS_TURNOS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/configuracion/materias/**", "/api/configuracion/horarios/**").hasAnyAuthority("CONFIG_EDITAR_MATERIAS_TURNOS", "PERM_ADMIN_TOTAL")

                // =========================================================================
                // 5. MÓDULO HORARIOS (Endpoints dedicados /api/horarios/** y subrutas)
                // =========================================================================
                // Lectura de horarios (cronograma, paginados y métricas calculadas)
                .requestMatchers(HttpMethod.GET, "/api/horarios/**", "/api/empleados/*/horarios/**", "/api/empleados/*/horarios")
                    .hasAnyAuthority("HORARIOS_VER", "PERSONAL_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.GET, "/api/empleados/*/metricas")
                    .hasAnyAuthority("HORARIOS_VER", "PERSONAL_VER", "PERM_ADMIN_TOTAL")

                // Alta / Asignación de franjas y cátedras
                .requestMatchers(HttpMethod.POST, "/api/horarios/**", "/api/empleados/*/horarios/**", "/api/empleados/*/horarios")
                    .hasAnyAuthority("HORARIOS_GESTIONAR", "PERM_ADMIN_TOTAL")

                // Modificación de franjas
                .requestMatchers(HttpMethod.PUT, "/api/horarios/**", "/api/empleados/*/horarios/**", "/api/empleados/*/horarios")
                    .hasAnyAuthority("HORARIOS_GESTIONAR", "PERM_ADMIN_TOTAL")

                // Eliminación / Baja de franjas horarias y cátedras
                .requestMatchers(HttpMethod.DELETE, "/api/horarios/**", "/api/empleados/*/horarios/**", "/api/empleados/horarios/**")
                    .hasAnyAuthority("HORARIOS_ELIMINAR", "PERM_ADMIN_TOTAL")

                // =========================================================================
                // 6. MÓDULO PERSONAL (/api/empleados/**)
                // =========================================================================
                .requestMatchers(HttpMethod.GET, "/api/empleados/**").hasAnyAuthority("PERSONAL_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.POST, "/api/empleados/**").hasAnyAuthority("PERSONAL_CREAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/empleados/**").hasAnyAuthority("PERSONAL_EDITAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PATCH, "/api/empleados/*/reactivar", "/api/empleados/*/estado").hasAnyAuthority("PERSONAL_BAJA_REACTIVAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/empleados/**").hasAnyAuthority("PERSONAL_BAJA_REACTIVAR", "PERM_ADMIN_TOTAL")

                // 7. MÓDULO FICHAJES & BIOMETRÍA
                .requestMatchers(HttpMethod.GET, "/api/fichajes/**", "/api/importacion/**").hasAnyAuthority("FICHAJES_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.POST, "/api/fichajes/importar", "/api/importacion/subir").hasAnyAuthority("FICHAJES_IMPORTAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.POST, "/api/fichajes/vincular").hasAnyAuthority("FICHAJES_VINCULAR", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.DELETE, "/api/fichajes/lotes/**").hasAnyAuthority("FICHAJES_ELIMINAR_LOTE", "PERM_ADMIN_TOTAL")

                // 8. MÓDULO USUARIOS & SEGURIDAD
                .requestMatchers(HttpMethod.GET, "/api/usuarios/**").hasAnyAuthority("USUARIOS_VER", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.POST, "/api/usuarios/**").hasAnyAuthority("USUARIOS_GESTIONAR_ACCESOS", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PUT, "/api/usuarios/*/reset-password").hasAnyAuthority("USUARIOS_RESET_PASSWORD", "PERM_ADMIN_TOTAL")
                .requestMatchers(HttpMethod.PATCH, "/api/usuarios/*/estado").hasAnyAuthority("USUARIOS_SUSPENDER", "PERM_ADMIN_TOTAL")
                .requestMatchers("/api/seguridad/usuarios/*/permisos/**").hasAnyAuthority("USUARIOS_GESTIONAR_ACCESOS", "PERM_ADMIN_TOTAL")

                // 9. MÓDULO AUDITORÍA
                .requestMatchers("/api/seguridad/auditoria/**").hasAnyAuthority("AUDITORIA_VER", "PERM_ADMIN_TOTAL")

                // Cualquier otra solicitud requiere autenticación válida
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
        config.setAllowedOriginPatterns(List.of("*"));
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