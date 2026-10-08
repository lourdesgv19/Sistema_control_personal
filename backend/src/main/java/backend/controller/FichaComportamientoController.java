package backend.controller;

import backend.dto.FichaComportamientoDTO;
import backend.service.FichaComportamientoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/ficha-comportamiento")
@CrossOrigin(origins = "http://localhost:5173")
public class FichaComportamientoController {

    private static final Logger log = LoggerFactory.getLogger(FichaComportamientoController.class);
    private final FichaComportamientoService fichaService;

    public FichaComportamientoController(FichaComportamientoService fichaService) {
        this.fichaService = fichaService;
    }

    @GetMapping("/{empleadoId}")
    public ResponseEntity<?> obtenerFicha(
            @PathVariable Long empleadoId,
            @RequestParam(required = false, defaultValue = "DIARIO") String modalidad,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta) {

        log.info("--> [GET /api/ficha-comportamiento/{}] Params recibidos: modalidad='{}', fecha={}, fechaDesde={}, fechaHasta={}",
                empleadoId, modalidad, fecha, fechaDesde, fechaHasta);

        try {
            LocalDate fechaFiltro = (fecha != null) ? fecha : LocalDate.now();
            FichaComportamientoDTO resultado = fichaService.obtenerFicha(
                    empleadoId, modalidad, fechaFiltro, fechaDesde, fechaHasta
            );

            log.info("<-- [GET /api/ficha-comportamiento/{}] Ficha generada con éxito. Periodo='{}', Cumplimiento={}%",
                    empleadoId, resultado.periodoTexto(), resultado.porcentajeCumplimiento());

            return ResponseEntity.ok(resultado);

        } catch (Exception ex) {
            log.error("💥 ERROR en [GET /api/ficha-comportamiento/{}]: {}", empleadoId, ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al generar ficha de comportamiento: " + ex.getMessage());
        }
    }
}