package backend.service;

import backend.dto.CrearUsuarioRequest;
import backend.dto.UsuarioDTO;
import backend.dto.UsuarioResumenDTO;
import backend.model.Empleado;
import backend.model.Usuario;
import backend.model.UsuarioPermiso;
import backend.repositories.EmpleadoRepository;
import backend.repositories.PermisoRepository;
import backend.repositories.UsuarioPermisoRepository;
import backend.repositories.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepo;
    private final EmpleadoRepository empleadoRepo;
    private final AuditoriaYPermisosService auditoriaService;
    private final PermisoRepository permisoRepo;
    private final UsuarioPermisoRepository usuarioPermRepo;
    private final BCryptPasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepo,
                          EmpleadoRepository empleadoRepo,
                          AuditoriaYPermisosService auditoriaService,
                          PermisoRepository permisoRepo,
                          UsuarioPermisoRepository usuarioPermRepo) {
        this.usuarioRepo = usuarioRepo;
        this.empleadoRepo = empleadoRepo;
        this.auditoriaService = auditoriaService;
        this.permisoRepo = permisoRepo;
        this.usuarioPermRepo = usuarioPermRepo;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    private String obtenerOperadorActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getName() != null && !auth.getName().isBlank())
                ? auth.getName()
                : "SISTEMA";
    }

    @Transactional(readOnly = true)
    public List<UsuarioDTO> listarUsuarios() {
        return usuarioRepo.findAll().stream().map(this::convertirADTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<UsuarioDTO> listarPaginado(String q, String rol, String estado, int page, int size) {
        Boolean activo = null;
        if ("ACTIVOS".equalsIgnoreCase(estado)) {
            activo = true;
        } else if ("INACTIVOS".equalsIgnoreCase(estado)) {
            activo = false;
        }

        Pageable pageable = PageRequest.of(page, size);
        String rolFiltro = (rol == null || rol.isBlank()) ? "TODOS" : rol.trim();
        String queryFiltro = (q != null) ? q.trim() : "";

        return usuarioRepo.listarPaginado(queryFiltro, rolFiltro, activo, pageable)
                .map(this::convertirADTO);
    }

    @Transactional(readOnly = true)
    public UsuarioDTO obtenerPorEmpleadoId(Long empleadoId) {
        return usuarioRepo.findByEmpleadoId(empleadoId)
                .map(this::convertirADTO)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public UsuarioResumenDTO obtenerResumenMetricas() {
        return new UsuarioResumenDTO(
            usuarioRepo.countTotal(),
            usuarioRepo.countAdministradoresActivos(),
            usuarioRepo.countAuditoresActivos(),
            usuarioRepo.countInactivos()
        );
    }

    @Transactional(readOnly = true)
    public List<Empleado> listarEmpleadosDisponiblesParaUsuario() {
        return empleadoRepo.findEmpleadosSinUsuarioActivos();
    }

    /**
     * Genera la contraseña inicial: apellido en minúscula + primeros 2 dígitos del DNI.
     */
    public String generarPasswordPredeterminada(String apellido, String dni) {
        if (apellido == null || apellido.isBlank()) apellido = "usuario";
        if (dni == null || dni.length() < 2) dni = "12345678";

        String normalizado = Normalizer.normalize(apellido.trim().toLowerCase(), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[^a-z0-9]", "");

        String dniDigitos = dni.replaceAll("\\D", "");
        String prefijoDni = dniDigitos.length() >= 2 ? dniDigitos.substring(0, 2) : "00";

        return normalizado + prefijoDni;
    }

    @Transactional
    public void cambiarPasswordPrimerInicio(Long usuarioId, String passActual, String passNueva) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        if (!passwordEncoder.matches(passActual, usuario.getPasswordHash())) {
            throw new IllegalArgumentException("La contraseña actual no es correcta.");
        }

        if (passNueva == null || passNueva.trim().length() < 6) {
            throw new IllegalArgumentException("La nueva contraseña debe tener al menos 6 caracteres.");
        }

        if (passwordEncoder.matches(passNueva, usuario.getPasswordHash())) {
            throw new IllegalArgumentException("La nueva contraseña no puede ser igual a la clave actual.");
        }

        usuario.setPasswordHash(passwordEncoder.encode(passNueva.trim()));
        usuario.setDebeCambiarPassword(false);
        usuarioRepo.save(usuario);
    }

    @Transactional
    public void cambiarPasswordPerfil(String username, String passActual, String passNueva) {
        Usuario usuario = usuarioRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        if (!passwordEncoder.matches(passActual, usuario.getPasswordHash())) {
            throw new IllegalArgumentException("La contraseña actual ingresada es incorrecta.");
        }

        if (passNueva == null || passNueva.trim().length() < 6) {
            throw new IllegalArgumentException("La nueva contraseña debe tener al menos 6 caracteres.");
        }

        if (passwordEncoder.matches(passNueva, usuario.getPasswordHash())) {
            throw new IllegalArgumentException("La nueva contraseña no puede ser igual a la anterior.");
        }

        usuario.setPasswordHash(passwordEncoder.encode(passNueva.trim()));
        usuario.setDebeCambiarPassword(false);
        usuarioRepo.save(usuario);
    }

    @Transactional
    public UsuarioDTO crearUsuarioParaEmpleado(CrearUsuarioRequest req) {
        Empleado emp = empleadoRepo.findById(req.empleadoId())
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + req.empleadoId()));

        if (usuarioRepo.findByEmpleadoId(emp.getId()).isPresent()) {
            throw new IllegalStateException("El colaborador ya tiene un usuario de acceso asignado.");
        }

        String username = req.username();
        if (username == null || username.isBlank()) {
            if (emp.getEmail() != null && !emp.getEmail().isBlank()) {
                username = emp.getEmail().trim().toLowerCase();
            } else {
                username = emp.getNroLegajo() != null ? emp.getNroLegajo() : ("usr_" + emp.getId());
            }
        }

        if (usuarioRepo.existsByUsername(username)) {
            username = username + "_" + emp.getId();
        }

        String passwordPlano = generarPasswordPredeterminada(emp.getApellido(), emp.getDni());
        String passwordHash = passwordEncoder.encode(passwordPlano);
        String rolNormalizado = (req.rol() != null && !req.rol().isBlank())
                ? req.rol().trim().toUpperCase()
                : "AUDITOR";

        Usuario usuario = new Usuario();
        usuario.setUsername(username);
        usuario.setPasswordHash(passwordHash);
        usuario.setRol(rolNormalizado);
        usuario.setActivo(true);
        usuario.setDebeCambiarPassword(true);
        usuario.setEmpleado(emp);

        Usuario guardado = usuarioRepo.save(usuario);
        String operador = obtenerOperadorActual();

        // --- PLANTILLA INICIAL DE PERMISOS SEGÚN EL ROL ---
        Set<String> catalogoValido = new LinkedHashSet<>(permisoRepo.findAllCodigos());
        List<String> permisosPlantilla = new ArrayList<>();

        if (rolNormalizado.contains("ADMIN")) {
            permisosPlantilla.addAll(catalogoValido);
        } else if (rolNormalizado.equals("AUDITOR")) {
            List<String> baseAuditor = List.of(
                "PERSONAL_VER",
                "HORARIOS_VER",
                "FICHAJES_VER",
                "INCIDENTES_VER",
                "INCIDENTES_JUSTIFICAR",
                "CONFIG_VER",
                "MATERIAS_VER"
            );
            for (String cod : baseAuditor) {
                if (catalogoValido.contains(cod)) {
                    permisosPlantilla.add(cod);
                }
            }
        }
        // Si rolNormalizado es "PERSONALIZADO", permisosPlantilla queda vacío (0 permisos iniciales)
        // y se asignan inmediatamente al abrir ModalMatrizPermisos en el frontend.

        LocalDateTime ahora = LocalDateTime.now();
        for (String cod : permisosPlantilla) {
            UsuarioPermiso up = new UsuarioPermiso();
            up.setUsuario(guardado);
            up.setCodigoPermiso(cod);
            up.setActivo(true);
            up.setEsTemporal(false);
            up.setFechaOtorgacion(ahora);
            up.setOtorgadoPor(operador);
            up.setMotivo("Plantilla inicial por rol " + rolNormalizado);
            usuarioPermRepo.save(up);
        }

        auditoriaService.registrarMovimiento(
            null,
            operador,
            "ADMINISTRADOR_GENERAL",
            "CREAR_USUARIO",
            "SEGURIDAD",
            "Creación de usuario " + guardado.getUsername() + " (Rol: " + guardado.getRol() + ") con " + permisosPlantilla.size() + " permisos iniciales.",
            null
        );

        return convertirADTO(guardado);
    }

    @Transactional
    public void restablecerPasswordPredeterminada(Long usuarioId) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + usuarioId));

        if ("admin".equalsIgnoreCase(usuario.getUsername())) {
            throw new IllegalStateException("La contraseña del usuario administrador raíz no se puede restablecer por este medio. Debe gestionarse desde 'Mi Perfil'.");
        }

        if (usuario.getEmpleado() == null) {
            throw new IllegalStateException("El usuario no está vinculado a un empleado para autocalcular su clave.");
        }

        Empleado emp = usuario.getEmpleado();
        String nuevaClavePlana = generarPasswordPredeterminada(emp.getApellido(), emp.getDni());
        usuario.setPasswordHash(passwordEncoder.encode(nuevaClavePlana));
        usuario.setDebeCambiarPassword(true);
        usuarioRepo.save(usuario);

        String operador = obtenerOperadorActual();
        auditoriaService.registrarMovimiento(
            null,
            operador,
            "ADMINISTRADOR_GENERAL",
            "RESET_PASSWORD",
            "SEGURIDAD",
            "Restablecimiento de contraseña por defecto para el usuario " + usuario.getUsername(),
            null
        );
    }

    @Transactional
    public void cambiarEstado(Long usuarioId, boolean activo) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + usuarioId));

        if ("admin".equalsIgnoreCase(usuario.getUsername())) {
            throw new IllegalStateException("La cuenta de administrador principal no puede ser suspendida.");
        }

        usuario.setActivo(activo);
        usuarioRepo.save(usuario);

        String operador = obtenerOperadorActual();
        String accionAudit = activo ? "HABILITAR_USUARIO" : "SUSPENDER_USUARIO";
        String detalle = (activo ? "Se habilitó" : "Se suspendió") + " el acceso al usuario " + usuario.getUsername();

        auditoriaService.registrarMovimiento(
            null,
            operador,
            "ADMINISTRADOR_GENERAL",
            accionAudit,
            "SEGURIDAD",
            detalle,
            null
        );
    }

    public UsuarioDTO convertirADTO(Usuario u) {
        boolean esAdminRaiz = (u.getEmpleado() == null && "admin".equalsIgnoreCase(u.getUsername()));

        String nombreCompleto = u.getEmpleado() != null
                ? (u.getEmpleado().getNombre() + " " + u.getEmpleado().getApellido())
                : (esAdminRaiz ? "Administrador General del Sistema" : "Sin Empleado Asociado");

        Long empId = u.getEmpleado() != null ? u.getEmpleado().getId() : null;
        String email = u.getEmpleado() != null ? u.getEmpleado().getEmail() : null;
        String telefono = u.getEmpleado() != null ? u.getEmpleado().getTelefono() : null;
        String idBiometrico = u.getEmpleado() != null ? u.getEmpleado().getIdBiometrico() : null;

        return new UsuarioDTO(
                u.getId(),
                u.getUsername(),
                u.getRol(),
                u.getActivo(),
                empId,
                nombreCompleto,
                email,
                telefono,
                idBiometrico,
                Boolean.TRUE.equals(u.getDebeCambiarPassword())
        );
    }

    @Transactional
    public void actualizarContacto(String usernameActual, String email, String telefono) {
        Usuario usuario = usuarioRepo.findByUsername(usernameActual)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + usernameActual));

        Empleado emp = usuario.getEmpleado();

        if (emp == null) {
            auditoriaService.registrarMovimiento(
                usuario.getId(),
                usuario.getUsername(),
                usuario.getRol(),
                "ACTUALIZAR_CONTACTO_ADMIN",
                "SEGURIDAD",
                "Actualización de contacto de cuenta de sistema: " + email + " / Tel: " + telefono,
                null
            );
            return;
        }

        emp.setEmail(email != null ? email.trim().toLowerCase() : null);
        emp.setTelefono(telefono != null ? telefono.trim() : null);
        empleadoRepo.save(emp);
    }
}