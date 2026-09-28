package backend.controller;

import backend.dto.ResumenImportacionDTO;
import backend.model.EmpleadoFichaje;
import backend.model.ImportacionHistorial;
import backend.repositories.ImportacionHistorialRepository;
import backend.service.ImportacionFichajesService;
import backend.service.VinculacionBiometricaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/api/importacion")
@CrossOrigin(origins = "http://localhost:5173")
public class ImportacionController {

    private final ImportacionFichajesService importacionService;
    private final VinculacionBiometricaService vinculacionService;
    private final ImportacionHistorialRepository historialRepo;

    public ImportacionController(
            ImportacionFichajesService importacionService,
            VinculacionBiometricaService vinculacionService,
            ImportacionHistorialRepository historialRepo) {
        this.importacionService = importacionService;
        this.vinculacionService = vinculacionService;
        this.historialRepo = historialRepo;
    }

    @GetMapping("/historial")
    public ResponseEntity<List<ImportacionHistorial>> listarHistorial() {
        return ResponseEntity.ok(historialRepo.findAllByOrderByFechaImportacionDesc());
    }

    @GetMapping("/fichajes")
    public ResponseEntity<org.springframework.data.domain.Page<EmpleadoFichaje>> listarFichajes(
            @RequestParam(value = "q", required = false, defaultValue = "") String q,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "25") int size) {
        return ResponseEntity.ok(importacionService.listarMarcacionesPaginadas(q, page, size));
    }

    @GetMapping("/sin-vincular-count")
    public ResponseEntity<Long> contarSinVincular() {
        return ResponseEntity.ok(importacionService.contarSinVincular());
    }

    @GetMapping("/pendientes-vinculacion")
    public ResponseEntity<List<VinculacionBiometricaService.DispositivoUsuarioDTO>> obtenerPendientes() {
        return ResponseEntity.ok(vinculacionService.obtenerPendientesDesdeBD());
    }

    // Endpoint específico para las filas del lote con filtrado por servidor
    @GetMapping("/historial/{id}/fichajes")
    public ResponseEntity<List<EmpleadoFichaje>> listarFichajesPorLote(
            @PathVariable Long id,
            @RequestParam(value = "nombre", required = false) String nombre,
            @RequestParam(value = "fecha", required = false) String fecha) {
        return ResponseEntity.ok(importacionService.listarFichajesPorImportacion(id, nombre, fecha));
    }

    @PostMapping("/fichajes")
    public ResponseEntity<ResumenImportacionDTO> subirArchivoFichajes(@RequestParam("archivo") MultipartFile archivo) {
        try {
            ResumenImportacionDTO resumen = importacionService.importarArchivo(archivo);
            return ResponseEntity.ok(resumen);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new ResumenImportacionDTO(0, 0, 0, 0, 1, List.of("Error al procesar: " + e.getMessage()))
            );
        }
    }

    @DeleteMapping("/historial/{id}")
    public ResponseEntity<Void> eliminarHistorial(@PathVariable Long id) {
        importacionService.darDeBajaHistorial(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/previsualizar-vinculaciones")
    public ResponseEntity<List<VinculacionBiometricaService.DispositivoUsuarioDTO>> previsualizar(
            @RequestParam("archivo") MultipartFile archivo) {
        try {
            return ResponseEntity.ok(vinculacionService.previsualizarUsuariosCSV(archivo));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/guardar-vinculaciones")
    public ResponseEntity<Void> guardarVinculaciones(
            @RequestBody List<VinculacionBiometricaService.AsignacionBiometricaRequest> asignaciones) {
        vinculacionService.guardarVinculaciones(asignaciones);
        return ResponseEntity.ok().build();
    }
}