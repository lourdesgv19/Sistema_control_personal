package backend.controller;

import backend.dto.ResumenImportacionDTO;
import backend.service.ImportacionFichajesService;
import backend.service.VinculacionBiometricaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;;

@RestController
@RequestMapping("/api/importacion")
@CrossOrigin(origins = "*")
public class ImportacionController {

    private final ImportacionFichajesService importacionService;
    private final VinculacionBiometricaService vinculacionService;  

    public ImportacionController(ImportacionFichajesService importacionService, VinculacionBiometricaService vBiometricaService) {
        this.importacionService = importacionService;
        this.vinculacionService = vBiometricaService;
    }

    @PostMapping("/fichajes")
    public ResponseEntity<ResumenImportacionDTO> subirArchivoFichajes(@RequestParam("archivo") MultipartFile archivo) {
        try {
            ResumenImportacionDTO resumen = importacionService.importarArchivo(archivo);
            return ResponseEntity.ok(resumen);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new ResumenImportacionDTO(0, 0, 0, 1, java.util.List.of("Error al procesar: " + e.getMessage()))
            );
        }
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