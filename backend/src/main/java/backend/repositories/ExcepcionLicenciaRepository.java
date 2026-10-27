package backend.repositories;

import backend.model.ExcepcionLicencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface ExcepcionLicenciaRepository extends JpaRepository<ExcepcionLicencia, Long> {

    @Query("""
        SELECT e FROM ExcepcionLicencia e
        LEFT JOIN e.empleado emp
        WHERE e.activo = true
          AND (:estado IS NULL OR :estado = 'TODOS' OR e.estado = :estado)
          AND (:tipo IS NULL OR :tipo = 'TODOS' OR e.tipo = :tipo)
          AND (:busqueda IS NULL OR :busqueda = '' OR
               LOWER(e.motivoDictamen) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
               (emp IS NOT NULL AND (
                   LOWER(emp.nombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
                   LOWER(emp.apellido) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
                   LOWER(emp.nroLegajo) LIKE LOWER(CONCAT('%', :busqueda, '%'))
               )))
        ORDER BY e.fechaInicio DESC
    """)
    List<ExcepcionLicencia> listarConFiltros(
        @Param("estado") String estado,
        @Param("tipo") String tipo,
        @Param("busqueda") String busqueda
    );

    @Query("SELECT e FROM ExcepcionLicencia e WHERE e.activo = true AND e.empleado.id = :empleadoId ORDER BY e.fechaInicio DESC")
    List<ExcepcionLicencia> findByEmpleadoId(@Param("empleadoId") Long empleadoId);

    @Query("SELECT e FROM ExcepcionLicencia e WHERE e.activo = true AND e.esInstitucional = true ORDER BY e.fechaInicio DESC")
    List<ExcepcionLicencia> findInstitucionales();
}