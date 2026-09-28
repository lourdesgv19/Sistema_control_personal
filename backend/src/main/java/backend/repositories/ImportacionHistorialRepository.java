package backend.repositories;

import backend.model.ImportacionHistorial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ImportacionHistorialRepository extends JpaRepository<ImportacionHistorial, Long> {
    // Listado ordenado de la más reciente a la más antigua
    List<ImportacionHistorial> findAllByOrderByFechaImportacionDesc();
}