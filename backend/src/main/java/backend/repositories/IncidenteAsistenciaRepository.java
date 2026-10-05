package backend.repositories;

import backend.model.IncidenteAsistencia;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface IncidenteAsistenciaRepository extends JpaRepository<IncidenteAsistencia, Long> {

    @Query("""
        SELECT i FROM IncidenteAsistencia i
        WHERE i.fecha BETWEEN :fechaDesde AND :fechaHasta
          AND (:severidad IS NULL OR :severidad = '' OR i.severidad = :severidad)
          AND (:categoria IS NULL OR :categoria = '' OR i.categoriaRegla = :categoria)
          AND (:estado IS NULL OR :estado = '' OR i.estado = :estado)
          AND (:busqueda IS NULL OR :busqueda = '' OR
               LOWER(i.empleado.nombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
               LOWER(i.empleado.apellido) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
               LOWER(i.empleado.nroLegajo) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
               LOWER(i.tipo) LIKE LOWER(CONCAT('%', :busqueda, '%')))
        ORDER BY i.fecha DESC, i.hora DESC
    """)
    Page<IncidenteAsistencia> buscarFiltradoPaginadoRango(
        @Param("fechaDesde") LocalDate fechaDesde,
        @Param("fechaHasta") LocalDate fechaHasta,
        @Param("severidad") String severidad,
        @Param("categoria") String categoria,
        @Param("estado") String estado,
        @Param("busqueda") String busqueda,
        Pageable pageable
    );

    @Query("""
        SELECT COUNT(i) FROM IncidenteAsistencia i 
        WHERE i.fecha BETWEEN :fechaDesde AND :fechaHasta 
          AND i.categoriaRegla = :categoria
    """)
    long contarPorRangoYCategoria(
        @Param("fechaDesde") LocalDate fechaDesde, 
        @Param("fechaHasta") LocalDate fechaHasta, 
        @Param("categoria") String categoria
    );

    @Query("SELECT COUNT(i) FROM IncidenteAsistencia i WHERE i.fecha BETWEEN :fechaDesde AND :fechaHasta")
    long contarTotalPorRango(
        @Param("fechaDesde") LocalDate fechaDesde, 
        @Param("fechaHasta") LocalDate fechaHasta
    );

    @Query("""
        SELECT COUNT(i) > 0 FROM IncidenteAsistencia i
        WHERE i.fecha = :fecha
          AND i.empleado.id = :idEmpleado
          AND i.categoriaRegla = :categoria
    """)
    boolean existeIncidentePorFechaEmpleadoYCategoria(
        @Param("fecha") LocalDate fecha,
        @Param("idEmpleado") Long idEmpleado,
        @Param("categoria") String categoria
    );
}