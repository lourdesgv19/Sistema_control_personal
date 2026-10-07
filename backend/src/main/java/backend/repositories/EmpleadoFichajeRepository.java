package backend.repositories;

import backend.model.Empleado;
import backend.model.EmpleadoFichaje;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmpleadoFichajeRepository extends JpaRepository<EmpleadoFichaje, Long> {

    List<EmpleadoFichaje> findAllByIdBiometrico(String idBiometrico);

    @Query("SELECT DISTINCT f.idBiometrico, f.nombreReloj FROM EmpleadoFichaje f WHERE f.activo = true AND f.empleado IS NULL")
    List<Object[]> findDistinctHuerfanos();

    // Padrón general paginado y buscable directamente en BD
    @Query("SELECT f FROM EmpleadoFichaje f " +
           "WHERE f.activo = true " +
           "  AND (:q IS NULL OR :q = '' OR " +
           "       LOWER(f.nombreReloj) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "       f.idBiometrico LIKE CONCAT('%', :q, '%') OR " +
           "       (f.empleado IS NOT NULL AND (" +
           "           LOWER(f.empleado.nombre) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "           LOWER(f.empleado.apellido) LIKE LOWER(CONCAT('%', :q, '%'))" +
           "       ))) " +
           "ORDER BY f.horaFichaje DESC")
    Page<EmpleadoFichaje> buscarMarcacionesPaginadas(@Param("q") String q, Pageable pageable);

    // Consulta para el modal de una importación específica
    @Query("SELECT f FROM EmpleadoFichaje f " +
           "WHERE f.importacion.id = :importacionId " +
           "  AND f.activo = true " +
           "  AND (:nombre IS NULL OR :nombre = '' OR " +
           "       LOWER(f.nombreReloj) LIKE LOWER(CONCAT('%', :nombre, '%')) OR " +
           "       (f.empleado IS NOT NULL AND (" +
           "           LOWER(f.empleado.nombre) LIKE LOWER(CONCAT('%', :nombre, '%')) OR " +
           "           LOWER(f.empleado.apellido) LIKE LOWER(CONCAT('%', :nombre, '%'))" +
           "       ))) " +
           "  AND (:inicio IS NULL OR f.horaFichaje >= :inicio) " +
           "  AND (:fin IS NULL OR f.horaFichaje <= :fin) " +
           "ORDER BY f.horaFichaje ASC")
    List<EmpleadoFichaje> findByImportacionFiltrado(
            @Param("importacionId") Long importacionId,
            @Param("nombre") String nombre,
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin
    );

    @Modifying
    @Transactional
    @Query("UPDATE EmpleadoFichaje f SET f.activo = false, f.fechaBaja = :fecha WHERE f.importacion.id = :importacionId")
    void desactivarFichajesPorImportacion(
            @Param("importacionId") Long importacionId,
            @Param("fecha") LocalDateTime fecha
    );

    boolean existsBySerialNo(Long serialNo);

    // Cantidad de fichajes huérfanos sin empleado asignado
    @Query("SELECT COUNT(DISTINCT f.idBiometrico) FROM EmpleadoFichaje f WHERE f.activo = true AND f.empleado IS NULL")
    long countIdentificadoresSinVincular();

    // Empleados únicos con fichaje de ingreso (checkIn / overtimeIn) en el día
    @Query("""
        SELECT COUNT(DISTINCT f.empleado.id) 
        FROM EmpleadoFichaje f 
        WHERE f.horaFichaje BETWEEN :inicio AND :fin 
          AND f.tipoEvento IN ('checkIn', 'overtimeIn', 'ENTRADA')
          AND f.estadoFichaje = 'valido'
          AND f.activo = true
    """)
    long contarEmpleadosIngresados(
        @Param("inicio") LocalDateTime inicio, 
        @Param("fin") LocalDateTime fin
    );

    @Query("""
        SELECT f FROM EmpleadoFichaje f
        WHERE f.empleado.id = :empleadoId
          AND f.activo = true
          AND f.horaFichaje BETWEEN :inicio AND :fin
        ORDER BY f.horaFichaje ASC
    """)
    List<EmpleadoFichaje> findFichajesPorEmpleadoYRango(
        @Param("empleadoId") Long empleadoId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fin") LocalDateTime fin
    );
}