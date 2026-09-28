package backend.controller;

import backend.dto.MetricasPersonalDTO;
import backend.dto.PersonalResumenDTO;
import backend.model.Empleado;
import backend.model.EmpleadoHorario;
import backend.repositories.EmpleadoRepository;
import backend.service.EmpleadoService;
import org.springframework.data.domain.Page;
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
    private final EmpleadoRepository empleadoRepo;

    public EmpleadoController(EmpleadoService empleadoService, EmpleadoRepository empleadoRepository) {
        this.empleadoService = empleadoService;
        this.empleadoRepo = empleadoRepository;
    }

    // Listado paginado con filtros para la grilla principal
    @GetMapping
    public ResponseEntity<Page<Empleado>> listar(
            @RequestParam(value = "q", required = false, defaultValue = "") String q,
            @RequestParam(value = "categoriaId", required = false) Long categoriaId,
            @RequestParam(value = "estado", required = false, defaultValue = "TODOS") String estado,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "15") int size) {
        return ResponseEntity.ok(empleadoService.listarPaginado(q, categoriaId, estado, page, size));
    }

    // Lista simple para selectores desplegables de modales (solo activos)
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

    @GetMapping("/{id}/metricas")
    public ResponseEntity<MetricasPersonalDTO> obtenerMetricas(@PathVariable Long id) {
        return ResponseEntity.ok(empleadoService.calcularMetricas(id));
    }

    @GetMapping("/{id}/horarios")
    public ResponseEntity<List<EmpleadoHorario>> listarHorarios(@PathVariable Long id) {
        return ResponseEntity.ok(empleadoService.listarHorariosEmpleado(id));
    }

    public record AsignarHorarioRequest(
        List<Integer> diasSemana,
        String horaEntrada,
        String horaSalida,
        Long materiaId,
        String etiqueta,
        String aula,
        Boolean forzarGuardado
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

    @GetMapping("/resumen-metricas")
    public ResponseEntity<PersonalResumenDTO> obtenerResumenMetricas() {
        long activos = empleadoRepo.countActivos();
        long inactivos = empleadoRepo.countInactivos();
        long docentes = empleadoRepo.countDocentes();
        long administrativos = empleadoRepo.countAdministrativos();

        return ResponseEntity.ok(new backend.dto.PersonalResumenDTO(
            activos + inactivos,
            docentes,
            administrativos,
            inactivos
        ));
    }
}