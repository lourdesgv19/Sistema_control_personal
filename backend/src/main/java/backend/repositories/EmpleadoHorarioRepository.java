package backend.repositories;

import backend.model.EmpleadoHorario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmpleadoHorarioRepository extends JpaRepository<EmpleadoHorario, Long> {

    @Query("SELECT h FROM EmpleadoHorario h WHERE h.empleado.id = :empleadoId AND h.activo = true ORDER BY h.diaSemana ASC, h.horaEntrada ASC")
    List<EmpleadoHorario> findByEmpleadoId(@Param("empleadoId") Long empleadoId);

    @Query("SELECT h FROM EmpleadoHorario h WHERE h.empleado.id = :empleadoId AND h.diaSemana = :diaSemana AND h.activo = true ORDER BY h.horaEntrada ASC")
    List<EmpleadoHorario> findByEmpleadoIdAndDiaSemana(@Param("empleadoId") Long empleadoId, @Param("diaSemana") Integer diaSemana);
}