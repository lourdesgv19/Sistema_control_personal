package backend.repositories;

import backend.model.Materia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MateriaRepository extends JpaRepository<Materia, Long> {
    @Query("SELECT m FROM Materia m ORDER BY m.activo DESC, m.nombre ASC")
    List<Materia> findAllOrdenados();

    @Query(
        value = """
            SELECT m FROM Materia m
            WHERE (:activo IS NULL OR m.activo = :activo)
              AND (:q IS NULL OR :q = '' 
                   OR LOWER(m.nombre) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(m.codigo) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(m.aulaPredeterminada) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY m.activo DESC, m.nombre ASC
        """,
        countQuery = """
            SELECT COUNT(m) FROM Materia m
            WHERE (:activo IS NULL OR m.activo = :activo)
              AND (:q IS NULL OR :q = '' 
                   OR LOWER(m.nombre) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(m.codigo) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(m.aulaPredeterminada) LIKE LOWER(CONCAT('%', :q, '%')))
        """
    )
    Page<Materia> buscarPaginado(
        @Param("q") String q,
        @Param("activo") Boolean activo,
        Pageable pageable
    );
}