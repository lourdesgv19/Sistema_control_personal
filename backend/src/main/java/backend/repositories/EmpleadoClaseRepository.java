package backend.repositories;

import backend.model.EmpleadoClase;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EmpleadoClaseRepository extends JpaRepository<EmpleadoClase, Long> {
    List<EmpleadoClase> findByEmpleadoId(Long empleadoId);
}