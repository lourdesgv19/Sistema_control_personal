package backend.repositories;

import backend.model.ImportacionHistorial;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ImportacionHistorialRepository extends JpaRepository<ImportacionHistorial, Long> {

    List<ImportacionHistorial> findAllByOrderByFechaImportacionDesc();

    @Query("SELECT h FROM ImportacionHistorial h ORDER BY h.activo DESC, h.fechaImportacion DESC")
    List<ImportacionHistorial> findAllOrdenados();

    // 1. Obtener la última importación registrada
    Optional<ImportacionHistorial> findFirstByActivoTrueOrderByFechaImportacionDesc();

    // 2. Historial de importaciones paginado con filtros
    @Query("""
        SELECT h FROM ImportacionHistorial h
        WHERE (:estado = 'TODOS' 
               OR (:estado = 'ACTIVOS' AND h.activo = true) 
               OR (:estado = 'INACTIVOS' AND h.activo = false))
          AND (:inicio IS NULL OR h.fechaImportacion >= :inicio)
          AND (:fin IS NULL OR h.fechaImportacion <= :fin)
        ORDER BY h.fechaImportacion DESC
    """)
    Page<ImportacionHistorial> buscarHistorialPaginado(
        @Param("estado") String estado,
        @Param("inicio") LocalDateTime inicio,
        @Param("fin") LocalDateTime fin,
        Pageable pageable
    );
}