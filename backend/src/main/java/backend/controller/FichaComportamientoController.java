package backend.controller;

import backend.dto.FichaComportamientoDTO;
import backend.service.FichaComportamientoService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/ficha-comportamiento")
@CrossOrigin(origins = "http://localhost:5173")
public class FichaComportamientoController {

    private final FichaComportamientoService fichaService;

    public FichaComportamientoController(FichaComportamientoService fichaService) {
        this.fichaService = fichaService;
    }

    @GetMapping("/{empleadoId}")
    public ResponseEntity<FichaComportamientoDTO> obtenerFicha(
            @PathVariable Long empleadoId,
            @RequestParam(required = false, defaultValue = "DIARIO") String modalidad,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        
        LocalDate fechaFiltro = (fecha != null) ? fecha : LocalDate.now();
        return ResponseEntity.ok(fichaService.obtenerFicha(empleadoId, modalidad, fechaFiltro));
    }
}