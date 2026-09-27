package backend.repositories;

import backend.model.Empleado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmpleadoRepository extends JpaRepository<Empleado, Long> {
    @Query("SELECT e FROM Empleado e ORDER BY e.activo DESC, e.apellido ASC, e.nombre ASC")
    List<Empleado> findAllOrdenados();
}