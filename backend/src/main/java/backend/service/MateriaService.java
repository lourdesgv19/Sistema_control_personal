package backend.service;

import backend.model.Materia;
import backend.repositories.MateriaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class MateriaService {

    private final MateriaRepository materiaRepo;

    public MateriaService(MateriaRepository materiaRepo) {
        this.materiaRepo = materiaRepo;
    }

    @Transactional(readOnly = true)
    public List<Materia> listarTodas() {
        return materiaRepo.findAllOrdenados();
    }

    @Transactional(readOnly = true)
    public Materia obtenerPorId(Long id) {
        return materiaRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Cátedra no encontrada con ID: " + id));
    }

    @Transactional
    public Materia guardar(Materia m) {
        m.setActivo(true);
        m.setFechaBaja(null);
        return materiaRepo.save(m);
    }

    @Transactional
    public Materia actualizar(Long id, Materia m) {
        Materia existente = obtenerPorId(id);
        existente.setNombre(m.getNombre());
        existente.setCodigo(m.getCodigo());
        existente.setDepartamento(m.getDepartamento());
        existente.setAulaPredeterminada(m.getAulaPredeterminada());
        existente.setActivo(m.getActivo());
        if (Boolean.TRUE.equals(m.getActivo())) {
            existente.setFechaBaja(null);
        }
        return materiaRepo.save(existente);
    }

    @Transactional
    public void bajaLogica(Long id) {
        materiaRepo.deleteById(id);
    }

    @Transactional
    public void reactivar(Long id) {
        Materia m = obtenerPorId(id);
        m.setActivo(true);
        m.setFechaBaja(null);
        materiaRepo.save(m);
    }
}