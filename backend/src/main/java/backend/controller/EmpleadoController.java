package backend.controller;

import backend.dto.MetricasPersonalDTO;
import backend.model.Empleado;
import backend.model.EmpleadoClase;
import backend.repositories.EmpleadoClaseRepository;
import backend.service.EmpleadoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/empleados")
@CrossOrigin(origins = "*")
public class EmpleadoController {

    private final EmpleadoService empleadoService;
    private final EmpleadoClaseRepository empleadoClaseRepo;

    public EmpleadoController(EmpleadoService empleadoService, EmpleadoClaseRepository empleadoClaseRepo) {
        this.empleadoService = empleadoService;
        this.empleadoClaseRepo = empleadoClaseRepo;
    }

    @GetMapping
    public ResponseEntity<List<Empleado>> listar() {
        return ResponseEntity.ok(empleadoService.listarTodos());
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

    @GetMapping("/{id}/metricas")
    public ResponseEntity<MetricasPersonalDTO> obtenerMetricas(@PathVariable Long id) {
        return ResponseEntity.ok(empleadoService.calcularMetricas(id));
    }

    @GetMapping("/{id}/clases")
    public ResponseEntity<List<EmpleadoClase>> obtenerClases(@PathVariable Long id) {
        return ResponseEntity.ok(empleadoClaseRepo.findByEmpleadoId(id));
    }

    public record AsignarClaseRequest(
        Long materiaId,
        String materia,
        List<String> diasSemana,
        String comision,
        String horaInicio,
        String horaFin,
        String aula
    ) {}

    @PostMapping("/{id}/clases/multiple")
    public ResponseEntity<?> agregarClasesMultiples(
            @PathVariable Long id,
            @RequestBody AsignarClaseRequest req) {
        try {
            List<EmpleadoClase> clases = empleadoService.agregarClasesMultiples(
                    id,
                    req.materia(),
                    req.comision(),
                    req.horaInicio(),
                    req.horaFin(),
                    req.aula(),
                    req.diasSemana()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(clases);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/clases/{claseId}")
    public ResponseEntity<Void> eliminarClase(@PathVariable Long claseId) {
        empleadoService.eliminarClase(claseId);
        return ResponseEntity.noContent().build();
    }
}