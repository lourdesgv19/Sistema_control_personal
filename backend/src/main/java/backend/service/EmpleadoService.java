package backend.service;

import backend.model.Empleado;
import backend.repositories.EmpleadoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class EmpleadoService {

    private final EmpleadoRepository empleadoRepo;
    private final AuditorHelperService auditor;

    public EmpleadoService(EmpleadoRepository empleadoRepo, AuditorHelperService auditor) {
        this.empleadoRepo = empleadoRepo;
        this.auditor = auditor;
    }

    @Transactional(readOnly = true)
    public List<Empleado> listarTodosActivos() {
        return empleadoRepo.findAllActivos();
    }

    @Transactional(readOnly = true)
    public Page<Empleado> listarPaginado(String q, Long categoriaId, String estado, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return empleadoRepo.buscarPaginado(q, categoriaId, estado, pageable);
    }

    @Transactional(readOnly = true)
    public Empleado obtenerPorId(Long id) {
        return empleadoRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado con ID: " + id));
    }

    @Transactional
    public Empleado crear(Empleado emp) {
        emp.setActivo(true);
        emp.setFechaBaja(null);
        Empleado nuevo = empleadoRepo.save(emp);

        auditor.registrar(
            "CREAR_EMPLEADO",
            "PERSONAL",
            "Alta de colaborador: " + nuevo.getNombre() + " " + nuevo.getApellido() + " (Legajo: " + nuevo.getNroLegajo() + ", DNI: " + nuevo.getDni() + ")"
        );

        return nuevo;
    }

    @Transactional
    public Empleado actualizar(Long id, Empleado empActualizado) {
        Empleado emp = obtenerPorId(id);
        emp.setNombre(empActualizado.getNombre());
        emp.setApellido(empActualizado.getApellido());
        emp.setDni(empActualizado.getDni());
        emp.setEmail(empActualizado.getEmail());
        emp.setTelefono(empActualizado.getTelefono());
        emp.setNroLegajo(empActualizado.getNroLegajo());
        emp.setIdBiometrico(empActualizado.getIdBiometrico());
        emp.setToleranciaIngresoMin(empActualizado.getToleranciaIngresoMin());
        emp.setToleranciaEgresoMin(empActualizado.getToleranciaEgresoMin());
        emp.setCategorias(empActualizado.getCategorias() != null ? empActualizado.getCategorias() : new ArrayList<>());
        emp.setCargos(empActualizado.getCargos() != null ? empActualizado.getCargos() : new ArrayList<>());
        emp.setTiempoMaxFueraMin(empActualizado.getTiempoMaxFueraMin() != null ? empActualizado.getTiempoMaxFueraMin() : 45);
        emp.setMaxSalidasIntermedias(empActualizado.getMaxSalidasIntermedias() != null ? empActualizado.getMaxSalidasIntermedias() : 2);

        if (Boolean.TRUE.equals(empActualizado.getActivo())) {
            emp.setActivo(true);
            emp.setFechaBaja(null);
        }
        auditor.registrar(
            "ACTUALIZAR_EMPLEADO",
            "PERSONAL",
            "Actualización de datos del empleado: " + emp.getNombre() + " " + emp.getApellido() + " (Legajo: " + emp.getNroLegajo() + ")"
        );

        return empleadoRepo.save(emp);
    }

    @Transactional
    public void eliminar(Long id) {
        Empleado emp = obtenerPorId(id);
        emp.setActivo(false);
        emp.setFechaBaja(LocalDateTime.now());
        empleadoRepo.save(emp);

        auditor.registrar(
            "BAJA_EMPLEADO",
            "PERSONAL",
            "Baja lógica del colaborador: " + emp.getNombre() + " " + emp.getApellido() + " (Legajo: " + emp.getNroLegajo() + ")"
        );
    }

    @Transactional
    public void reactivar(Long id) {
        Empleado emp = obtenerPorId(id);
        emp.setActivo(true);
        emp.setFechaBaja(null);
        empleadoRepo.save(emp);

        auditor.registrar(
            "REACTIVA_EMPLEADO",
            "PERSONAL",
            "Reactivación del empleado: " + emp.getNombre() + " " + emp.getApellido() + " (Legajo: " + emp.getNroLegajo() + ")"
        );
    }
}