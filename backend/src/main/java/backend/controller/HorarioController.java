package backend.controller;

import backend.dto.EmpleadoHorarioResumenDTO;
import backend.model.EmpleadoHorario;
import backend.service.HorarioService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/horarios")
@CrossOrigin(origins = "http://localhost:5173")
public class HorarioController {

    private final HorarioService horarioService;

    public HorarioController(HorarioService horarioService) {
        this.horarioService = horarioService;
    }

    // Listado paginado de horarios con filtros (padrón general institucional)
    @GetMapping("/paginados")
    public ResponseEntity<Page<EmpleadoHorarioResumenDTO>> listarHorariosPaginados(
            @RequestParam(value = "q", required = false, defaultValue = "") String q,
            @RequestParam(value = "categoriaId", required = false) Long categoriaId,
            @RequestParam(value = "empleadoId", required = false) Long empleadoId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "15") int size) {

        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(horarioService.listarHorariosPaginados(q, categoriaId, empleadoId, pageable));
    }

    // Listado completo de franjas de un empleado para su cronograma semanal
    @GetMapping("/empleado/{empleadoId}")
    public ResponseEntity<List<EmpleadoHorario>> listarHorariosPorEmpleado(@PathVariable Long empleadoId) {
        return ResponseEntity.ok(horarioService.listarHorariosEmpleado(empleadoId));
    }

    public record AsignarHorarioRequest(
        List<Integer> diasSemana,
        String horaEntrada,
        String horaSalida,
        Long materiaId,
        String etiqueta,
        String aula,
        String tipoFrecuencia,         // "SEMANAL", "SEMANA_POR_MEDIO", "MENSUAL", "ANUAL"
        Integer repeticionesPeriodo,
        String semanaAlterna,
        Boolean forzarGuardado
    ) {}

    // Asignación de franjas horarias o cátedras a un empleado
    @PostMapping("/empleado/{empleadoId}")
    public ResponseEntity<?> agregarHorarios(
            @PathVariable Long empleadoId,
            @RequestBody AsignarHorarioRequest req) {
        try {
            List<EmpleadoHorario> creados = horarioService.agregarHorariosMultiples(
                    empleadoId,
                    req.diasSemana(),
                    req.horaEntrada().length() == 5 ? req.horaEntrada() + ":00" : req.horaEntrada(),
                    req.horaSalida().length() == 5 ? req.horaSalida() + ":00" : req.horaSalida(),
                    req.materiaId(),
                    req.etiqueta(),
                    req.aula(),
                    req.tipoFrecuencia(),
                    req.repeticionesPeriodo(),
                    req.semanaAlterna(),
                    req.forzarGuardado() != null && req.forzarGuardado()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(creados);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // Baja lógica de un bloque horario específico
    @DeleteMapping("/{horarioId}")
    public ResponseEntity<Void> eliminarHorario(@PathVariable Long horarioId) {
        horarioService.eliminarHorario(horarioId);
        return ResponseEntity.noContent().build();
    }
}