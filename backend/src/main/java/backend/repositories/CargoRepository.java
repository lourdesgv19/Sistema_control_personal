package backend.repositories;

import backend.model.Cargo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CargoRepository extends JpaRepository<Cargo, Long> {
    List<Cargo> findByCategoria_Id(Long idCategoria);

    @Query("SELECT c FROM Cargo c ORDER BY c.activo DESC, c.nombre ASC")
    List<Cargo> findAllOrdenados();
}