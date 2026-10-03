package backend.controller;

import backend.dto.MetricasPersonalDTO;
import backend.dto.PersonalResumenDTO;
import backend.model.Empleado;
import backend.repositories.EmpleadoRepository;
import backend.service.EmpleadoService;
import backend.service.HorarioService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/empleados")
@CrossOrigin(origins = "http://localhost:5173")
public class EmpleadoController {

    private final EmpleadoService empleadoService;
    private final HorarioService horarioService;
    private final EmpleadoRepository empleadoRepo;

    public EmpleadoController(EmpleadoService empleadoService, 
                              HorarioService horarioService, 
                              EmpleadoRepository empleadoRepo) {
        this.empleadoService = empleadoService;
        this.horarioService = horarioService;
        this.empleadoRepo = empleadoRepo;
    }

    @GetMapping
    public ResponseEntity<Page<Empleado>> listar(
            @RequestParam(value = "q", required = false, defaultValue = "") String q,
            @RequestParam(value = "categoriaId", required = false) Long categoriaId,
            @RequestParam(value = "estado", required = false, defaultValue = "TODOS") String estado,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "15") int size) {
        return ResponseEntity.ok(empleadoService.listarPaginado(q, categoriaId, estado, page, size));
    }

    @GetMapping("/activos")
    public ResponseEntity<List<Empleado>> listarActivos() {
        return ResponseEntity.ok(empleadoService.listarTodosActivos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Empleado> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(empleadoService.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<Empleado> crear(@RequestBody Empleado emp) {
        return new ResponseEntity<>(empleadoService.crear(emp), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Empleado> editar(@PathVariable Long id, @RequestBody Empleado emp) {
        return ResponseEntity.ok(empleadoService.actualizar(id, emp));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        empleadoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reactivar")
    public ResponseEntity<Void> reactivar(@PathVariable Long id) {
        empleadoService.reactivar(id);
        return ResponseEntity.noContent().build();
    }

    // Consulta de métricas calculadas delegada a HorarioService
    @GetMapping("/{id}/metricas")
    public ResponseEntity<MetricasPersonalDTO> obtenerMetricas(@PathVariable Long id) {
        return ResponseEntity.ok(horarioService.calcularMetricas(id));
    }

    @GetMapping("/resumen-metricas")
    public ResponseEntity<PersonalResumenDTO> obtenerResumenMetricas() {
        long activos = empleadoRepo.countActivos();
        long inactivos = empleadoRepo.countInactivos();
        long docentes = empleadoRepo.countDocentes();
        long administrativos = empleadoRepo.countAdministrativos();

        return ResponseEntity.ok(new PersonalResumenDTO(
            activos + inactivos,
            docentes,
            administrativos,
            inactivos
        ));
    }
}