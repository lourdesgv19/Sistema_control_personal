package backend.controller;

import backend.dto.ExcepcionLicenciaDTOs.*;
import backend.dto.ExcepcionMetricasDTO;
import backend.service.ExcepcionLicenciaService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/excepciones-licencias")
@CrossOrigin(origins = "*")
public class ExcepcionLicenciaController {

    private final ExcepcionLicenciaService service;

    public ExcepcionLicenciaController(ExcepcionLicenciaService service) {
        this.service = service;
    }

    @GetMapping("/metricas")
    public ResponseEntity<ExcepcionMetricasDTO> obtenerMetricas() {
        return ResponseEntity.ok(service.obtenerMetricasGlobales());
    }

    @GetMapping("/paginado")
    public ResponseEntity<Page<DetalleLicenciaDTO>> listarPaginado(
            @RequestParam(defaultValue = "") String busqueda,
            @RequestParam(defaultValue = "TODOS") String estado,
            @RequestParam(defaultValue = "TODOS") String tipo,
            @RequestParam(defaultValue = "TODOS") String filtroKpi,
            @RequestParam(defaultValue = "ACTIVOS") String filtroActivo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return ResponseEntity.ok(service.listarPaginado(busqueda, estado, tipo, filtroKpi, filtroActivo, page, size));
    }

    @PostMapping
    public ResponseEntity<DetalleLicenciaDTO> crear(
            @RequestBody CrearExcepcionRequest request,
            Authentication auth) {
        String usuario = auth != null ? auth.getName() : "ADMIN";
        return new ResponseEntity<>(service.registrarLicencia(request, usuario), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DetalleLicenciaDTO> actualizar(
            @PathVariable Long id,
            @RequestBody CrearExcepcionRequest request) {
        return ResponseEntity.ok(service.actualizarLicencia(id, request));
    }

    @PatchMapping("/{id}/dictaminar")
    public ResponseEntity<DetalleLicenciaDTO> dictaminar(
            @PathVariable Long id,
            @RequestBody DictaminarRequest request) {
        return ResponseEntity.ok(service.dictaminar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.bajaLogica(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reactivar")
    public ResponseEntity<Void> reactivar(@PathVariable Long id) {
        service.reactivarLicencia(id);
        return ResponseEntity.noContent().build();
    }
}