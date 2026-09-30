package backend.repositories;

import backend.model.AuditoriaMovimiento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditoriaMovimientoRepository extends JpaRepository<AuditoriaMovimiento, Long> {

    // 1. Paginado con filtros
    @Query("""
        SELECT a FROM AuditoriaMovimiento a
        WHERE (:username IS NULL OR :username = '' OR LOWER(a.username) LIKE LOWER(CONCAT('%', :username, '%')))
          AND (:accion IS NULL OR :accion = '' OR a.accion = :accion)
          AND (:fechaInicio IS NULL OR a.fechaHora >= :fechaInicio)
          AND (:fechaFin IS NULL OR a.fechaHora <= :fechaFin)
        ORDER BY a.fechaHora DESC
    """)
    Page<AuditoriaMovimiento> buscarPaginado(
            @Param("username") String username,
            @Param("accion") String accion,
            @Param("fechaInicio") LocalDateTime fechaInicio,
            @Param("fechaFin") LocalDateTime fechaFin,
            Pageable pageable
    );

    // 2. Total de movimientos en el rango de fechas
    @Query("""
        SELECT COUNT(a) 
        FROM AuditoriaMovimiento a 
        WHERE (:fechaInicio IS NULL OR a.fechaHora >= :fechaInicio)
          AND (:fechaFin IS NULL OR a.fechaHora <= :fechaFin)
    """)
    long contarTotalMovimientosEnRango(
            @Param("fechaInicio") LocalDateTime fechaInicio,
            @Param("fechaFin") LocalDateTime fechaFin
    );

    // 3. Distribución de acciones en el rango de fechas
    @Query("""
        SELECT a.accion, COUNT(a) 
        FROM AuditoriaMovimiento a 
        WHERE (:fechaInicio IS NULL OR a.fechaHora >= :fechaInicio)
          AND (:fechaFin IS NULL OR a.fechaHora <= :fechaFin)
        GROUP BY a.accion 
        ORDER BY COUNT(a) DESC
    """)
    List<Object[]> contarMovimientosPorAccionEnRango(
            @Param("fechaInicio") LocalDateTime fechaInicio,
            @Param("fechaFin") LocalDateTime fechaFin
    );

    // 4. Operaciones por usuario en el rango de fechas
    @Query("""
        SELECT a.username, COUNT(a) 
        FROM AuditoriaMovimiento a 
        WHERE (:fechaInicio IS NULL OR a.fechaHora >= :fechaInicio)
          AND (:fechaFin IS NULL OR a.fechaHora <= :fechaFin)
        GROUP BY a.username 
        ORDER BY COUNT(a) DESC
    """)
    List<Object[]> contarMovimientosPorUsuarioEnRango(
            @Param("fechaInicio") LocalDateTime fechaInicio,
            @Param("fechaFin") LocalDateTime fechaFin
    );

    // 5. Catálogo completo de acciones únicas (para el selector de filtros)
    @Query("SELECT DISTINCT a.accion FROM AuditoriaMovimiento a ORDER BY a.accion ASC")
    List<String> findDistinctAcciones();
}