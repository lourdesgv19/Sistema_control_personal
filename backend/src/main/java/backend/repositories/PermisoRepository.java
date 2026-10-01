package backend.repositories;

import backend.model.Permiso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PermisoRepository extends JpaRepository<Permiso, String> {

    @Query("SELECT p.codigo FROM Permiso p")
    List<String> findAllCodigos();

    List<Permiso> findAllByOrderByModuloAscCodigoAsc();
}