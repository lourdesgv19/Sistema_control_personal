package backend.repositories;

import backend.model.Materia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MateriaRepository extends JpaRepository<Materia, Long> {
    @Query("SELECT m FROM Materia m ORDER BY m.activo DESC, m.nombre ASC")
    List<Materia> findAllOrdenados();
}