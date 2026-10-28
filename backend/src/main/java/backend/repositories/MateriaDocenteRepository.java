package backend.repositories;

import backend.model.MateriaDocente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MateriaDocenteRepository extends JpaRepository<MateriaDocente, Long> {

    @Query("SELECT md FROM MateriaDocente md WHERE md.materia.id = :idMateria AND md.activo = true")
    Optional<MateriaDocente> findByMateriaActiva(@Param("idMateria") Long idMateria);

    @Query("SELECT md FROM MateriaDocente md WHERE (md.docenteTitular.id = :idDocente OR md.docenteAuxiliar.id = :idDocente) AND md.activo = true")
    List<MateriaDocente> findByDocente(@Param("idDocente") Long idDocente);

    @Query("SELECT md FROM MateriaDocente md WHERE md.docenteTitular.id = :idTitular AND md.activo = true")
    List<MateriaDocente> findByTitular(@Param("idTitular") Long idTitular);
}