package backend.repositories;

import backend.model.Horario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface HorarioRepository extends JpaRepository<Horario, Long> {
    List<Horario> findByCategoria_Id(Long idCategoria);

    @Query("SELECT h FROM Horario h ORDER BY h.activo DESC, h.nombre ASC")
    List<Horario> findAllOrdenados();
}