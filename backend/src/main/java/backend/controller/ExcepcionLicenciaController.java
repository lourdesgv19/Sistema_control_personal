package backend.controller;

import backend.dto.ExcepcionLicenciaDTOs.*;
import backend.service.ExcepcionLicenciaService;
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

    @GetMapping("/panel")
    public ResponseEntity<ResumenPanelDTO> obtenerPanel(
            @RequestParam(required = false, defaultValue = "") String busqueda,
            @RequestParam(required = false, defaultValue = "TODOS") String estado,
            @RequestParam(required = false, defaultValue = "TODOS") String tipo,
            @RequestParam(required = false, defaultValue = "TODAS") String categoria) {
        return ResponseEntity.ok(service.obtenerPanel(busqueda, estado, tipo, categoria));
    }

    @PostMapping
    public ResponseEntity<DetalleLicenciaDTO> crear(
            @RequestBody CrearExcepcionRequest request,
            Authentication auth) {
        String usuario = auth != null ? auth.getName() : "ADMIN";
        return new ResponseEntity<>(service.registrarLicencia(request, usuario), HttpStatus.CREATED);
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

    @PutMapping("/{id}")
    public ResponseEntity<DetalleLicenciaDTO> actualizar(
        @PathVariable Long id,
        @RequestBody CrearExcepcionRequest request) {
    return ResponseEntity.ok(service.actualizarLicencia(id, request));
    }
}