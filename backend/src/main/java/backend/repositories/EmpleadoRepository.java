package backend.repositories;

import backend.model.Empleado;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmpleadoRepository extends JpaRepository<Empleado, Long> {

    Optional<Empleado> findByIdBiometrico(String idBiometrico);

    Optional<Empleado> findByEmail(String email);

    // Consulta de padrón optimizada con filtros y paginación
    @Query("SELECT DISTINCT e FROM Empleado e " +
           "LEFT JOIN e.categorias cat " +
           "LEFT JOIN e.cargos car " +
           "WHERE (:estado = 'TODOS' OR (:estado = 'ACTIVOS' AND e.activo = true) OR (:estado = 'INACTIVOS' AND e.activo = false)) " +
           "  AND (:categoriaId IS NULL OR cat.id = :categoriaId) " +
           "  AND (:q IS NULL OR :q = '' OR " +
           "       LOWER(e.nombre) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "       LOWER(e.apellido) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "       e.dni LIKE CONCAT('%', :q, '%') OR " +
           "       e.nroLegajo LIKE CONCAT('%', :q, '%') OR " +
           "       LOWER(car.nombre) LIKE LOWER(CONCAT('%', :q, '%'))) " +
           "ORDER BY e.activo DESC, e.apellido ASC, e.nombre ASC")
    Page<Empleado> buscarPaginado(
            @Param("q") String q,
            @Param("categoriaId") Long categoriaId,
            @Param("estado") String estado,
            Pageable pageable
    );

    @Query("SELECT e FROM Empleado e WHERE e.activo = true ORDER BY e.apellido ASC, e.nombre ASC")
    List<Empleado> findAllActivos();

    @Query("SELECT COUNT(e) FROM Empleado e WHERE e.activo = true")
    long countActivos();

    @Query("SELECT COUNT(e) FROM Empleado e WHERE e.activo = false")
    long countInactivos();

    @Query("SELECT COUNT(DISTINCT e) FROM Empleado e JOIN e.categorias c WHERE e.activo = true AND (LOWER(c.codigoTag) LIKE '%docente%' OR LOWER(c.nombre) LIKE '%docente%')")
    long countDocentes();

     @Query("SELECT COUNT(DISTINCT e) FROM Empleado e JOIN e.categorias c WHERE e.activo = true AND (LOWER(c.codigoTag) LIKE '%administrativo%' OR LOWER(c.nombre) LIKE '%administrativo%')")
     long countAdministrativos();
}