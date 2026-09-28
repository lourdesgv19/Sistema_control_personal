package backend.controller;

import backend.dto.MetricasPersonalDTO;
import backend.model.Empleado;
import backend.model.EmpleadoHorario;
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

    public EmpleadoController(EmpleadoService empleadoService) {
        this.empleadoService = empleadoService;
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

    // ========================================================
    // ENDPOINTS UNIFICADOS DE HORARIOS
    // ========================================================

    @GetMapping("/{id}/horarios")
    public ResponseEntity<List<EmpleadoHorario>> listarHorarios(@PathVariable Long id) {
        return ResponseEntity.ok(empleadoService.listarHorariosEmpleado(id));
    }

    public record AsignarHorarioRequest(
        List<Integer> diasSemana,      // [1, 2, 3] donde 1=Lunes, 7=Domingo
        String horaEntrada,            // "08:00" o "08:00:00"
        String horaSalida,             // "12:00" o "12:00:00"
        Long materiaId,                // opcional (para docentes)
        String etiqueta,               // opcional ("Turno Mañana", "Cátedra A")
        String aula,
        Boolean forzarGuardado                    // opcional
    ) {}

    @PostMapping("/{id}/horarios")
    public ResponseEntity<?> agregarHorarios(
            @PathVariable Long id,
            @RequestBody AsignarHorarioRequest req) {
        try {
            List<EmpleadoHorario> creados = empleadoService.agregarHorariosMultiples(
                    id,
                    req.diasSemana(),
                    req.horaEntrada().length() == 5 ? req.horaEntrada() + ":00" : req.horaEntrada(),
                    req.horaSalida().length() == 5 ? req.horaSalida() + ":00" : req.horaSalida(),
                    req.materiaId(),
                    req.etiqueta(),
                    req.aula(),
                    req.forzarGuardado() != null && req.forzarGuardado()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(creados);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/horarios/{horarioId}")
    public ResponseEntity<Void> eliminarHorario(@PathVariable Long horarioId) {
        empleadoService.eliminarHorario(horarioId);
        return ResponseEntity.noContent().build();
    }
}