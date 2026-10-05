package backend.controller;

import backend.dto.ResolverIncidenteRequest;
import backend.dto.TableroIncidentesDTO;
import backend.model.IncidenteAsistencia;
import backend.service.IncidenteAsistenciaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/incidentes")
@CrossOrigin(origins = "http://localhost:5173")
public class IncidenteAsistenciaController {

    private final IncidenteAsistenciaService incidenteService;

    public IncidenteAsistenciaController(IncidenteAsistenciaService incidenteService) {
        this.incidenteService = incidenteService;
    }

    @GetMapping("/tablero")
    public ResponseEntity<TableroIncidentesDTO> obtenerTablero(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @RequestParam(required = false) String severidad,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String busqueda,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {

        // Compatibilidad: si envían 'fecha', se toma como desde y hasta
        LocalDate fDesde = (fechaDesde != null) ? fechaDesde : (fecha != null ? fecha : LocalDate.now());
        LocalDate fHasta = (fechaHasta != null) ? fechaHasta : (fecha != null ? fecha : fDesde);

        return ResponseEntity.ok(
            incidenteService.obtenerTableroRango(fDesde, fHasta, severidad, categoria, estado, busqueda, page, size)
        );
    }

    @PutMapping("/{id}/resolver")
    public ResponseEntity<IncidenteAsistencia> resolver(
            @PathVariable Long id,
            @RequestBody ResolverIncidenteRequest req) {
        return ResponseEntity.ok(incidenteService.resolverIncidente(id, req));
    }
}