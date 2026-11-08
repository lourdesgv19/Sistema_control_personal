package backend.controller;

import backend.dto.CalendarioSemanalDTO;
import backend.dto.GestionMateriasDTO.*;
import backend.model.Materia;
import backend.service.CalendarioSemanalService;
import backend.service.MateriaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/materias")
public class MateriaController {

    private final MateriaService materiaService;
    private final CalendarioSemanalService calendarioService;

    public MateriaController(MateriaService materiaService, CalendarioSemanalService calendarioService) {
        this.materiaService = materiaService;
        this.calendarioService = calendarioService;
    }

    // 1. Listado plano de materias
    @GetMapping
    public ResponseEntity<List<Materia>> listar() {
        return ResponseEntity.ok(materiaService.listarTodas());
    }

    // 2. Consulta por ID
    @GetMapping("/{id}")
    public ResponseEntity<Materia> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(materiaService.obtenerPorId(id));
    }

    // 3. Catálogo agrupado con desglose de días, horarios y alertas de docente vacante
    @GetMapping("/catalogo-agrupado")
    public ResponseEntity<List<MateriaCatalogoDTO>> getCatalogoAgrupado() {
        return ResponseEntity.ok(materiaService.obtenerCatalogoMateriasAgrupadas());
    }

    // 4. Métricas superiores de horas y liquidación semanal
    @GetMapping("/resumen")
    public ResponseEntity<ResumenMetricas> getResumen(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {
        return ResponseEntity.ok(materiaService.obtenerResumenSemanal(fechaInicio, fechaFin));
    }

    // 5. Calendario semanal biométrico
    @GetMapping("/calendario-semanal")
    public ResponseEntity<CalendarioSemanalDTO.RespuestaCalendarioDTO> getCalendarioSemanal(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) Long idDocente,
            @RequestParam(required = false) List<Integer> diasSemana,
            @RequestParam(required = false) String busqueda) {
        return ResponseEntity.ok(calendarioService.obtenerCalendarioSemanal(fechaInicio, idDocente, diasSemana, busqueda));
    }

    // 6. Alta y modificación unificada de materia y asignación de horarios
    @PostMapping
    public ResponseEntity<?> registrarMateriaConHorarios(@RequestBody NuevaMateriaRequest request) {
        try {
            Materia guardada = materiaService.registrarNuevaMateriaConHorarios(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(guardada);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 7. Modificación directa de atributos maestros
    @PutMapping("/{id}")
    public ResponseEntity<Materia> actualizar(@PathVariable Long id, @RequestBody Materia m) {
        return ResponseEntity.ok(materiaService.actualizar(id, m));
    }

    // 8. Desvincular docente de la cátedra (deja la materia vacante y asienta la baja en materia_docentes y empleado_horarios)
    @PatchMapping("/{id}/desvincular-docente")
    public ResponseEntity<Void> desvincularDocente(@PathVariable Long id) {
        materiaService.desvincularDocenteDeMateria(id);
        return ResponseEntity.noContent().build();
    }

    // 9. Desvincular comisión individual (soporta idHorario nulo si era comisión vacante)
    @DeleteMapping("/{idMateria}/comisiones")
    public ResponseEntity<Void> desvincularComision(
            @PathVariable Long idMateria,
            @RequestParam(required = false) Long idHorario,
            @RequestParam(required = false) Integer diaSemana) {
        materiaService.desvincularHorarioComision(idMateria, idHorario, diaSemana);
        return ResponseEntity.noContent().build();
    }

    // 10. Consulta de comisiones afectadas antes de confirmar baja
    @GetMapping("/{id}/impacto-baja")
    public ResponseEntity<ImpactoBajaMateriaDTO> obtenerImpactoBaja(@PathVariable Long id) {
        return ResponseEntity.ok(materiaService.obtenerImpactoBajaMateria(id));
    }

    // 11. Baja lógica simple
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> baja(@PathVariable Long id) {
        materiaService.bajaLogica(id);
        return ResponseEntity.noContent().build();
    }

    // 12. Baja en cascada
    @DeleteMapping("/{id}/cascada")
    public ResponseEntity<Void> eliminarMateriaEnCascada(@PathVariable Long id) {
        materiaService.darDeBajaMateriaEnCascada(id);
        return ResponseEntity.noContent().build();
    }

    // 13. Reactivación
    @PatchMapping("/{id}/reactivar")
    public ResponseEntity<Void> reactivar(@PathVariable Long id) {
        materiaService.reactivar(id);
        return ResponseEntity.noContent().build();
    }
}