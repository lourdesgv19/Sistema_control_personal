package backend.repositories;

import backend.model.EmpleadoClase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface EmpleadoClaseRepository extends JpaRepository<EmpleadoClase, Long> {
   @Query("SELECT c FROM EmpleadoClase c WHERE c.empleado.id = :empleadoId AND c.activo = true")
    List<EmpleadoClase> findByEmpleadoId(@Param("empleadoId") Long empleadoId);
}