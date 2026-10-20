package backend.controller;

import backend.dto.CalendarioSemanalDTO;
import backend.dto.GestionMateriasDTO;
import backend.dto.GestionMateriasDTO.*;
import backend.service.GestionMateriasService;
import backend.service.CalendarioSemanalService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gestion-materias")
@CrossOrigin(origins = "http://localhost:5173")
public class GestionMateriasController {

    private final GestionMateriasService service;
    private final CalendarioSemanalService calendarioService;

    public GestionMateriasController(GestionMateriasService service, CalendarioSemanalService calendarioService) {
        this.service = service;
        this.calendarioService = calendarioService;
    }

    @GetMapping("/resumen")
    public ResponseEntity<ResumenMetricas> getResumen(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {
        return ResponseEntity.ok(service.obtenerResumenSemanal(fechaInicio, fechaFin));
    }

    @GetMapping("/calendario-semanal")
    public ResponseEntity<CalendarioSemanalDTO.RespuestaCalendarioDTO> getCalendarioSemanal(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
        @RequestParam(required = false) Long idDocente,
        @RequestParam(required = false) List<Integer> diasSemana,
        @RequestParam(required = false) String busqueda) {
        return ResponseEntity.ok(calendarioService.obtenerCalendarioSemanal(fechaInicio, idDocente, diasSemana, busqueda));
    }

    @PostMapping
    public ResponseEntity<?> crearMateria(@RequestBody NuevaMateriaRequest request) {
        try {
            service.registrarNuevaMateriaConHorarios(request);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/catalogo-agrupado")
    public ResponseEntity<List<GestionMateriasDTO.MateriaCatalogoDTO>> getCatalogoAgrupado() {
     return ResponseEntity.ok(service.obtenerCatalogoMateriasAgrupadas());
    }
}