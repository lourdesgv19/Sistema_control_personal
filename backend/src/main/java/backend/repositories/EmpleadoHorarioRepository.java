package backend.repositories;

import backend.model.EmpleadoHorario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

@Repository
public interface EmpleadoHorarioRepository extends JpaRepository<EmpleadoHorario, Long> {

    @Query("SELECT h FROM EmpleadoHorario h WHERE h.empleado.id = :empleadoId AND h.activo = true ORDER BY h.diaSemana ASC, h.horaEntrada ASC")
    List<EmpleadoHorario> findByEmpleadoId(@Param("empleadoId") Long empleadoId);

    @Query("SELECT h FROM EmpleadoHorario h WHERE h.empleado.id = :empleadoId AND h.diaSemana = :diaSemana AND h.activo = true ORDER BY h.horaEntrada ASC")
    List<EmpleadoHorario> findByEmpleadoIdAndDiaSemana(@Param("empleadoId") Long empleadoId, @Param("diaSemana") Integer diaSemana);

    @Query("""
        SELECT h FROM EmpleadoHorario h
        JOIN h.empleado e
        LEFT JOIN e.categorias c
        LEFT JOIN h.materia m
        WHERE h.activo = true
          AND (:categoriaId IS NULL OR c.id = :categoriaId)
          AND (:empleadoId IS NULL OR e.id = :empleadoId)
          AND (
            :q IS NULL OR :q = '' OR
            LOWER(e.nombre) LIKE LOWER(CONCAT('%', :q, '%')) OR
            LOWER(e.apellido) LIKE LOWER(CONCAT('%', :q, '%')) OR
            LOWER(e.nroLegajo) LIKE LOWER(CONCAT('%', :q, '%')) OR
            LOWER(m.nombre) LIKE LOWER(CONCAT('%', :q, '%'))
          )
        ORDER BY e.apellido ASC, e.nombre ASC, h.diaSemana ASC
    """)
    Page<EmpleadoHorario> buscarHorariosPaginados(
        @Param("q") String q,
        @Param("categoriaId") Long categoriaId,
        @Param("empleadoId") Long empleadoId,
        Pageable pageable
    );

@Query("""
        SELECT DISTINCT h.empleado.id 
        FROM EmpleadoHorario h 
        WHERE h.diaSemana = :diaSemana 
          AND h.activo = true 
          AND h.empleado.activo = true
    """)
    List<Long> findEmpleadosEsperadosPorDia(@Param("diaSemana") Integer diaSemana);
}