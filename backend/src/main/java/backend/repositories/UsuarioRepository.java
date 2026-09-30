package backend.repositories;

import backend.model.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);
    Optional<Usuario> findByEmpleadoId(Long empleadoId);
    boolean existsByUsername(String username);

    // Métricas globales
    @Query("SELECT COUNT(u) FROM Usuario u")
    long countTotal();

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.activo = true AND (u.rol = 'ADMINISTRADOR' OR u.rol = 'ADMIN')")
    long countAdministradoresActivos();

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.activo = true AND (u.rol = 'AUDITOR' OR u.rol = 'RECURSOS_HUMANOS')")
    long countAuditoresActivos();

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.activo = false")
    long countInactivos();

    // Consulta Paginada con Filtros
    @Query("""
        SELECT u FROM Usuario u 
        LEFT JOIN u.empleado e 
        WHERE (:q IS NULL OR :q = '' 
               OR LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%')) 
               OR LOWER(e.nombre) LIKE LOWER(CONCAT('%', :q, '%')) 
               OR LOWER(e.apellido) LIKE LOWER(CONCAT('%', :q, '%')))
          AND (:rol = 'TODOS' 
               OR (:rol = 'AUDITOR' AND (u.rol = 'AUDITOR' OR u.rol = 'RECURSOS_HUMANOS'))
               OR (:rol = 'ADMINISTRADOR' AND (u.rol = 'ADMINISTRADOR' OR u.rol = 'ADMIN'))
               OR u.rol = :rol)
          AND (:activo IS NULL OR u.activo = :activo)
        ORDER BY u.id DESC
    """)
    Page<Usuario> listarPaginado(
        @Param("q") String q,
        @Param("rol") String rol,
        @Param("activo") Boolean activo,
        Pageable pageable
    );
}