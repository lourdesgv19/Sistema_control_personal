package backend.repositories;

import backend.model.Empleado;
import backend.model.EmpleadoFichaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmpleadoFichajeRepository extends JpaRepository<EmpleadoFichaje, Long> {

    // 1. Evitar importar dos veces la misma marcación del reloj
    boolean existsBySerialNo(Long serialNo);

    // 2. Obtener la última marcación registrada de un colaborador (para filtro de rebote)
    Optional<EmpleadoFichaje> findTopByEmpleadoOrderByHoraFichajeDesc(Empleado empleado);

    // 3. Fichajes de un colaborador en un rango de fechas (ej. semana o mes)
    @Query("SELECT f FROM EmpleadoFichaje f " +
           "WHERE f.empleado.id = :empleadoId " +
           "  AND f.horaFichaje BETWEEN :inicio AND :fin " +
           "ORDER BY f.horaFichaje ASC")
    List<EmpleadoFichaje> findByEmpleadoYFechas(
            @Param("empleadoId") Long empleadoId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin
    );

    // 4. Todas las marcaciones válidas de un día (para cálculo general de asistencia)
    @Query("SELECT f FROM EmpleadoFichaje f " +
           "WHERE f.horaFichaje BETWEEN :inicio AND :fin " +
           "  AND f.estadoFichaje = 'valido' " +
           "ORDER BY f.empleado.id ASC, f.horaFichaje ASC")
    List<EmpleadoFichaje> findFichajesValidosPorDia(
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin
    );
}