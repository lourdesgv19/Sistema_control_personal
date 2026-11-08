package backend.config;

import backend.model.Permiso;
import backend.repositories.PermisoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final PermisoRepository permisoRepo;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(PermisoRepository permisoRepo, JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
        this.permisoRepo = permisoRepo;
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        inicializarCatalogo();
        inicializarAdminSiNoExiste();
        actualizarPermisosAdmin();
    }

    private void inicializarCatalogo() {
        List<Permiso> catalogo = List.of(
            // Personal & Fichas
            new Permiso("PERSONAL_VER", "PERSONAL", "Visualizar padrón general y cronogramas semanales"),
            new Permiso("FICHAS_COMPORTAMIENTO_VER", "PERSONAL", "Visualizar ficha de comportamiento y asistencia"),
            new Permiso("PERSONAL_CREAR", "PERSONAL", "Dar de alta colaboradores y asignar legajos/biometría"),
            new Permiso("PERSONAL_EDITAR", "PERSONAL", "Modificar datos personales y jornadas fijas/cátedras"),
            new Permiso("PERSONAL_BAJA_REACTIVAR", "PERSONAL", "Baja lógica y reactivación de colaboradores"),

            // Fichajes & Reloj
            new Permiso("FICHAJES_VER", "FICHAJES", "Consultar registros consolidados y padrón de marcas"),
            new Permiso("FICHAJES_IMPORTAR", "FICHAJES", "Cargar archivos CSV/Excel y procesar lotes biométricos"),
            new Permiso("FICHAJES_VINCULAR", "FICHAJES", "Asociar IDs biométricos huérfanos con empleados"),
            new Permiso("FICHAJES_ELIMINAR_LOTE", "FICHAJES", "Dar de baja lotes cargados erróneamente"),

            // Configuración
            new Permiso("CONFIG_VER", "CONFIGURACION", "Lectura de categorías, cargos y turnos molde"),
            new Permiso("CONFIG_EDITAR_CATEGORIAS", "CONFIGURACION", "Crear, editar o dar de baja categorías"),
            new Permiso("CONFIG_EDITAR_CARGOS", "CONFIGURACION", "Gestionar puestos y áreas funcionales"),
            new Permiso("CONFIG_EDITAR_TURNOS", "CONFIGURACION", "Administrar plantillas y moldes de horario preestablecido"),
            
            // Usuarios & Seguridad
            new Permiso("USUARIOS_VER", "USUARIOS", "Listar usuarios del sistema y estados de cuenta"),
            new Permiso("USUARIOS_GESTIONAR_ACCESOS", "USUARIOS", "Otorgar o modificar permisos granulares"),
            new Permiso("USUARIOS_RESET_PASSWORD", "USUARIOS", "Restablecer claves por defecto"),
            new Permiso("USUARIOS_SUSPENDER", "USUARIOS", "Bloquear o habilitar cuentas de usuario"),

            // Auditoría
            new Permiso("AUDITORIA_VER", "AUDITORIA", "Permite consultar el padrón de auditoría inmutable y métricas"),

            // Horarios
            new Permiso("HORARIOS_VER", "HORARIOS", "Visualizar horarios y cátedras asignadas a empleados"),
            new Permiso("HORARIOS_GESTIONAR", "HORARIOS", "Crear horarios y cátedras"),
            new Permiso("HORARIOS_EDITAR", "HORARIOS", "Editar horarios y cátedras asignadas a empleados"),
            new Permiso("HORARIOS_ELIMINAR", "HORARIOS", "Eliminar horarios y cátedras asignadas a empleados"),

            // Incidentes Diarios & Auditoría de Marcación
            new Permiso("INCIDENTES_VER", "INCIDENTES", "Consultar el tablero de incidentes diarios y desvíos de asistencia"),
            new Permiso("INCIDENTES_JUSTIFICAR", "INCIDENTES", "Auditar, justificar o rechazar incidentes y anomalías de marcación"),
        
            // Gestión de Materias & Clases
            new Permiso("MATERIAS_CALENDARIO_VER", "MATERIAS", "Visualizar el calendario semanal de clases y cumplimiento de horas"),
            new Permiso("MATERIAS_VER", "MATERIAS", "Visualizar catálogo maestro de cátedras y comisiones"),
            new Permiso("MATERIAS_CREAR", "MATERIAS", "Crear materias y registrar comisiones en el sistema"),
            new Permiso("MATERIAS_EDITAR", "MATERIAS", "Modificar datos de cátedras, tarifas por hora y aulas predeterminadas"),
            new Permiso("MATERIAS_ELIMINAR", "MATERIAS", "Dar de baja lógica o reactivar cátedras del catálogo institucional"),          
            
            // Excepciones y Licencias
            new Permiso("EXCEPCIONES_VER", "EXCEPCIONES", "Visualizar módulo de excepciones, licencias vigentes y desglose por agente"),
            new Permiso("EXCEPCIONES_CREAR", "EXCEPCIONES", "Registrar licencias particulares y asuetos/feriados institucionales"),
            new Permiso("EXCEPCIONES_DICTAMINAR", "EXCEPCIONES", "Auditar, dictaminar, aprobar o rechazar solicitudes de licencias"),
            new Permiso("EXCEPCIONES_ELIMINAR", "EXCEPCIONES", "Anular o dar de baja registros de licencias y excepciones")
        );

        for (Permiso p : catalogo) {
            jdbcTemplate.update("""
                INSERT INTO permisos (codigo, modulo, descripcion)
                VALUES (?, ?, ?) AS nuevo
                ON DUPLICATE KEY UPDATE 
                    modulo = nuevo.modulo,
                    descripcion = nuevo.descripcion
            """, p.getCodigo(), p.getModulo(), p.getDescripcion());
        }

        log.info(">>> Catálogo maestro de {} permisos sincronizado en base de datos.", catalogo.size());
    }

    private void inicializarAdminSiNoExiste() {
        try {
            Integer existe = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM usuarios WHERE username = 'admin'",
                Integer.class
            );

            if (existe != null && existe > 0) return;

            String hash = passwordEncoder.encode("admin123");

            jdbcTemplate.update("""
                INSERT INTO usuarios (username, password_hash, rol, activo, debe_cambiar_password, id_empleado, fecha_creacion, fecha_modificacion)
                VALUES ('admin', ?, 'ADMINISTRADOR', 1, 1, NULL, NOW(), NOW())
            """, hash);

            log.info(">>> Usuario 'admin' inicial creado exitosamente con clave temporal y cambio forzado.");
        } catch (Exception e) {
            log.error("Error al inicializar usuario administrador: {}", e.getMessage(), e);
        }
    }

    private void actualizarPermisosAdmin() {
        try {
            Long idAdmin = jdbcTemplate.queryForObject(
                "SELECT id_usuario FROM usuarios WHERE username = 'admin'",
                Long.class
            );

            if (idAdmin == null) return;

            List<String> codigos = permisoRepo.findAllCodigos();
            for (String cod : codigos) {
                jdbcTemplate.update("""
                    INSERT INTO usuario_permisos (id_usuario, codigo_permiso, activo, es_temporal, fecha_otorgacion, otorgado_por, motivo)
                    VALUES (?, ?, 1, 0, NOW(), 'SISTEMA', 'Inicialización automática cuenta raíz')
                    ON DUPLICATE KEY UPDATE activo = 1
                """, idAdmin, cod);
            }
            log.info(">>> Matriz de accesos del administrador raíz actualizada con {} permisos.", codigos.size());
        } catch (Exception e) {
            log.warn("Aviso al actualizar permisos de admin: {}", e.getMessage());
        }
    }
}