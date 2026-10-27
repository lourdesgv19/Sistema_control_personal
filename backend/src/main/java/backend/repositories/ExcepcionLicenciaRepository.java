package backend.repositories;

import backend.model.ExcepcionLicencia;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ExcepcionLicenciaRepository extends JpaRepository<ExcepcionLicencia, Long> {

@Query(
        value = """
            SELECT e FROM ExcepcionLicencia e
            LEFT JOIN e.empleado emp
            WHERE (:filtroActivo = 'TODOS' 
                   OR (:filtroActivo = 'ACTIVOS' AND (e.activo = true OR e.activo IS NULL)) 
                   OR (:filtroActivo = 'INACTIVOS' AND e.activo = false))
              AND (:estado = 'TODOS' OR e.estado = :estado)
              AND (:tipo = 'TODOS' OR e.tipo = :tipo)
              AND (:filtroKpi = 'TODOS'
                   OR (:filtroKpi = 'EN_CURSO' AND :hoy BETWEEN e.fechaInicio AND e.fechaFin)
                   OR (:filtroKpi = 'PROXIMA' AND e.fechaInicio > :hoy)
                   OR (:filtroKpi = 'FINALIZADA' AND e.fechaFin < :hoy)
                   OR (:filtroKpi = 'PENDIENTES_RRHH' AND e.estado = 'PENDIENTE_RRHH'))
              AND (:busqueda IS NULL OR :busqueda = '' OR
                   LOWER(e.motivoDictamen) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
                   (emp IS NOT NULL AND (
                       LOWER(emp.nombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
                       LOWER(emp.apellido) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
                       LOWER(emp.nroLegajo) LIKE LOWER(CONCAT('%', :busqueda, '%'))
                   )))
            ORDER BY e.activo DESC, e.fechaInicio DESC
        """,
        countQuery = """
            SELECT COUNT(e) FROM ExcepcionLicencia e
            LEFT JOIN e.empleado emp
            WHERE (:filtroActivo = 'TODOS' 
                   OR (:filtroActivo = 'ACTIVOS' AND (e.activo = true OR e.activo IS NULL)) 
                   OR (:filtroActivo = 'INACTIVOS' AND e.activo = false))
              AND (:estado = 'TODOS' OR e.estado = :estado)
              AND (:tipo = 'TODOS' OR e.tipo = :tipo)
              AND (:filtroKpi = 'TODOS'
                   OR (:filtroKpi = 'EN_CURSO' AND :hoy BETWEEN e.fechaInicio AND e.fechaFin)
                   OR (:filtroKpi = 'PROXIMA' AND e.fechaInicio > :hoy)
                   OR (:filtroKpi = 'FINALIZADA' AND e.fechaFin < :hoy)
                   OR (:filtroKpi = 'PENDIENTES_RRHH' AND e.estado = 'PENDIENTE_RRHH'))
              AND (:busqueda IS NULL OR :busqueda = '' OR
                   LOWER(e.motivoDictamen) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
                   (emp IS NOT NULL AND (
                       LOWER(emp.nombre) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
                       LOWER(emp.apellido) LIKE LOWER(CONCAT('%', :busqueda, '%')) OR
                       LOWER(emp.nroLegajo) LIKE LOWER(CONCAT('%', :busqueda, '%'))
                   )))
        """
    )
    Page<ExcepcionLicencia> listarPaginado(
        @Param("filtroActivo") String filtroActivo,
        @Param("estado") String estado,
        @Param("tipo") String tipo,
        @Param("filtroKpi") String filtroKpi,
        @Param("busqueda") String busqueda,
        @Param("hoy") LocalDate hoy,
        Pageable pageable
    );

    @Query("SELECT COUNT(e) FROM ExcepcionLicencia e WHERE e.activo = true AND :hoy BETWEEN e.fechaInicio AND e.fechaFin")
    long contarEnCursoHoy(@Param("hoy") LocalDate hoy);

    @Query("SELECT COUNT(e) FROM ExcepcionLicencia e WHERE e.activo = true AND e.fechaInicio > :hoy")
    long contarProximas(@Param("hoy") LocalDate hoy);

    @Query("SELECT COUNT(e) FROM ExcepcionLicencia e WHERE e.activo = true AND e.fechaFin < :hoy")
    long contarFinalizadas(@Param("hoy") LocalDate hoy);

    @Query("SELECT COUNT(e) FROM ExcepcionLicencia e WHERE e.activo = true AND e.estado = 'PENDIENTE_RRHH'")
    long contarPendientesRrhh();

    @Query("SELECT COUNT(e) FROM ExcepcionLicencia e WHERE e.activo = true")
    long contarTotalActivos();

    @Modifying
    @Query("UPDATE ExcepcionLicencia e SET e.activo = true, e.fechaBaja = null WHERE e.id = :id")
    void reactivarPorId(@Param("id") Long id);

    @Query("""
        SELECT COUNT(e) > 0 FROM ExcepcionLicencia e
        WHERE e.activo = true
          AND e.estado IN ('APROBADA', 'PENDIENTE_RRHH')
          AND :fecha BETWEEN e.fechaInicio AND e.fechaFin
          AND (e.esInstitucional = true OR (e.empleado IS NOT NULL AND e.empleado.id = :idEmpleado))
    """)
    boolean tieneExcepcionOAsueto(@Param("idEmpleado") Long idEmpleado, @Param("fecha") LocalDate fecha);

    @Query("""
        SELECT e FROM ExcepcionLicencia e
        WHERE e.activo = true
          AND e.estado IN ('APROBADA', 'PENDIENTE_RRHH')
          AND (
              (e.fechaInicio BETWEEN :desde AND :hasta)
              OR (e.fechaFin BETWEEN :desde AND :hasta)
              OR (:desde BETWEEN e.fechaInicio AND e.fechaFin)
          )
          AND (e.esInstitucional = true OR (e.empleado IS NOT NULL AND e.empleado.id = :idEmpleado))
    """)
    List<ExcepcionLicencia> buscarExcepcionesVigentesEnRango(
        @Param("idEmpleado") Long idEmpleado,
        @Param("desde") LocalDate desde,
        @Param("hasta") LocalDate hasta
    );
}