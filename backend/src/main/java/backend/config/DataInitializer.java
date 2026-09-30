package backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DataInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        // Carga automática del catálogo de permisos si no existen
        String sql = """
            INSERT INTO permisos (codigo, modulo, descripcion) VALUES
            ('PERSONAL_VER', 'PERSONAL', 'Visualizar padrón general y cronogramas semanales'),
            ('PERSONAL_CREAR', 'PERSONAL', 'Dar de alta colaboradores y asignar legajos/biometría'),
            ('PERSONAL_EDITAR', 'PERSONAL', 'Modificar datos personales y jornadas fijas/cátedras'),
            ('PERSONAL_BAJA_REACTIVAR', 'PERSONAL', 'Baja lógica y reactivación de colaboradores'),
            ('FICHAJES_VER', 'FICHAJES', 'Consultar registros consolidados y padrón de marcas'),
            ('FICHAJES_IMPORTAR', 'FICHAJES', 'Cargar archivos CSV/Excel y procesar lotes biométricos'),
            ('FICHAJES_VINCULAR', 'FICHAJES', 'Asociar IDs biométricos huérfanos con empleados'),
            ('FICHAJES_ELIMINAR_LOTE', 'FICHAJES', 'Dar de baja lotes cargados erróneamente'),
            ('CONFIG_VER', 'CONFIGURACION', 'Lectura de categorías, cargos, materias y turnos molde'),
            ('CONFIG_EDITAR_CATEGORIAS', 'CONFIGURACION', 'Crear, editar o dar de baja categorías de personal'),
            ('CONFIG_EDITAR_CARGOS', 'CONFIGURACION', 'Gestionar puestos y áreas funcionales'),
            ('CONFIG_EDITAR_MATERIAS_TURNOS', 'CONFIGURACION', 'Administrar cátedras y moldes de horario'),
            ('USUARIOS_VER', 'USUARIOS', 'Listar usuarios del sistema y estados de cuenta'),
            ('USUARIOS_GESTIONAR_ACCESOS', 'USUARIOS', 'Otorgar o modificar permisos granulares'),
            ('USUARIOS_RESET_PASSWORD', 'USUARIOS', 'Restablecer claves por defecto'),
            ('USUARIOS_SUSPENDER', 'USUARIOS', 'Bloquear o habilitar cuentas de usuario'),
            ('AUDITORIA_VER', 'AUDITORIA', 'Permite consultar el padrón de auditoría inmutable y métricas de actividad')
            ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);
        """;
        
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception e) {
            // Ignorar si la tabla aún se está generando
        }
    }
}