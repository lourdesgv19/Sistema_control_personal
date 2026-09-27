package backend.controller;

import backend.model.Empleado;
import backend.model.EmpleadoClase;
import backend.service.EmpleadoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import backend.repositories.EmpleadoClaseRepository;
import jakarta.transaction.Transactional;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/empleados")
@CrossOrigin(origins = "http://localhost:5173")
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
    public ResponseEntity<Empleado> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(empleadoService.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<Empleado> crear(@RequestBody Empleado empleado) {
        return new ResponseEntity<>(empleadoService.guardar(empleado), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Empleado> editar(@PathVariable Long id, @RequestBody Empleado empleado) {
        return ResponseEntity.ok(empleadoService.actualizar(id, empleado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> baja(@PathVariable Long id) {
        empleadoService.bajaLogica(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reactivar")
    public ResponseEntity<Void> reactivar(@PathVariable Long id) {
        empleadoService.reactivar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/clases")
    public ResponseEntity<List<EmpleadoClase>> listarClases(@PathVariable Long id) {
        return ResponseEntity.ok(empleadoService.listarClases(id));
    }

    @PostMapping("/{id}/clases")
    public ResponseEntity<EmpleadoClase> agregarClase(@PathVariable Long id, @RequestBody EmpleadoClase clase) {
        return new ResponseEntity<>(empleadoService.agregarClase(id, clase), HttpStatus.CREATED);
    }

    @DeleteMapping("/clases/{claseId}")
    public ResponseEntity<Void> eliminarClase(@PathVariable Long claseId) {
        empleadoService.eliminarClase(claseId);
        return ResponseEntity.noContent().build();
    }

    // DTO auxiliar para la petición
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
public ResponseEntity<List<EmpleadoClase>> agregarClasesMultiples(
        @PathVariable Long id,
        @RequestBody AsignarClaseRequest req) {

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
}

    @PutMapping("/{id}/turno")
        public ResponseEntity<Empleado> asignarTurno(@PathVariable Long id, @RequestBody Empleado datos) {
        return ResponseEntity.ok(empleadoService.asignarTurnoPersonalizado(id, datos));
    }

    @GetMapping("/{id}/metricas")
        public ResponseEntity<backend.dto.MetricasPersonalDTO> obtenerMetricas(@PathVariable Long id) {
        return ResponseEntity.ok(empleadoService.calcularMetricas(id));
    }
}