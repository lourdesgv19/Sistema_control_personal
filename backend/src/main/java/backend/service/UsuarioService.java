package backend.service;

import backend.dto.CrearUsuarioRequest;
import backend.dto.UsuarioDTO;
import backend.dto.UsuarioResumenDTO;
import backend.model.Empleado;
import backend.model.Usuario;
import backend.repositories.EmpleadoRepository;
import backend.repositories.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.text.Normalizer;
import java.util.List;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepo;
    private final EmpleadoRepository empleadoRepo;
    private final BCryptPasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepo, EmpleadoRepository empleadoRepo) {
        this.usuarioRepo = usuarioRepo;
        this.empleadoRepo = empleadoRepo;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    public List<UsuarioDTO> listarUsuarios() {
        return usuarioRepo.findAll().stream().map(this::convertirADTO).toList();
    }

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

    public UsuarioDTO obtenerPorEmpleadoId(Long empleadoId) {
        return usuarioRepo.findByEmpleadoId(empleadoId)
                .map(this::convertirADTO)
                .orElse(null);
    }

    public UsuarioResumenDTO obtenerResumenMetricas() {
        return new UsuarioResumenDTO(
            usuarioRepo.countTotal(),
            usuarioRepo.countAdministradoresActivos(),
            usuarioRepo.countAuditoresActivos(),
            usuarioRepo.countInactivos()
        );
    }

    /**
     * Genera la contraseña inicial: apellido en minúscula + primeros 2 dígitos del DNI.
     * Ejemplo: Pérez con DNI 45854982 -> perez45
     */
    public String generarPasswordPredeterminada(String apellido, String dni) {
        if (apellido == null || apellido.isBlank()) apellido = "usuario";
        if (dni == null || dni.length() < 2) dni = "12345678";

        // Quitar acentos, diacríticos y caracteres no alfanuméricos
        String normalizado = Normalizer.normalize(apellido.trim().toLowerCase(), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[^a-z0-9]", "");

        // Tomar primeros 2 dígitos numéricos del DNI
        String dniDigitos = dni.replaceAll("\\D", "");
        String prefijoDni = dniDigitos.length() >= 2 ? dniDigitos.substring(0, 2) : "00";

        return normalizado + prefijoDni;
    }

    @Transactional
    public UsuarioDTO crearUsuarioParaEmpleado(CrearUsuarioRequest req) {
        Empleado emp = empleadoRepo.findById(req.empleadoId())
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + req.empleadoId()));

        if (usuarioRepo.findByEmpleadoId(emp.getId()).isPresent()) {
            throw new IllegalStateException("El colaborador ya tiene un usuario de acceso asignado.");
        }

        // Definir Username (email, o nroLegajo, o nombre.apellido)
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

        // Regla: Apellido + 2 primeros dígitos del DNI
        String passwordPlano = generarPasswordPredeterminada(emp.getApellido(), emp.getDni());
        String passwordHash = passwordEncoder.encode(passwordPlano);

        Usuario usuario = new Usuario();
        usuario.setUsername(username);
        usuario.setPasswordHash(passwordHash);
        usuario.setRol(req.rol() != null ? req.rol() : "CONSULTA");
        usuario.setActivo(true);
        usuario.setEmpleado(emp);

        Usuario guardado = usuarioRepo.save(usuario);
        return convertirADTO(guardado);
    }

    @Transactional
    public void restablecerPasswordPredeterminada(Long usuarioId) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + usuarioId));

        if (usuario.getEmpleado() == null) {
            throw new IllegalStateException("El usuario no está vinculado a un empleado para autocalcular su clave.");
        }

        Empleado emp = usuario.getEmpleado();
        String nuevaClavePlana = generarPasswordPredeterminada(emp.getApellido(), emp.getDni());
        usuario.setPasswordHash(passwordEncoder.encode(nuevaClavePlana));
        usuarioRepo.save(usuario);
    }

    @Transactional
    public void cambiarEstado(Long usuarioId, boolean activo) {
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + usuarioId));
        usuario.setActivo(activo);
        usuarioRepo.save(usuario);
    }

    private UsuarioDTO convertirADTO(Usuario u) {
        String nombreCompleto = u.getEmpleado() != null 
                ? (u.getEmpleado().getApellido() + ", " + u.getEmpleado().getNombre()) 
                : "Sin Empleado Asociado";
        Long empId = u.getEmpleado() != null ? u.getEmpleado().getId() : null;

        return new UsuarioDTO(
                u.getId(),
                u.getUsername(),
                u.getRol(),
                u.getActivo(),
                empId,
                nombreCompleto
        );
    }
}