package backend.controller;

import backend.dto.DispositivoEventoDTO;
import backend.dto.ResumenImportacionDTO;
import backend.model.EmpleadoFichaje;
import backend.model.ImportacionHistorial;
import backend.repositories.EmpleadoFichajeRepository;
import backend.repositories.ImportacionHistorialRepository;
import backend.service.DispositivoImportacionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dispositivo")
@CrossOrigin(origins = "http://localhost:5173")
public class DispositivoImportacionController {

    private final DispositivoImportacionService dispositivoService;
    private final ImportacionHistorialRepository historialRepo;
    private final EmpleadoFichajeRepository fichajeRepo;
    private final ObjectMapper objectMapper;

    public DispositivoImportacionController(
            DispositivoImportacionService dispositivoService,
            ImportacionHistorialRepository historialRepo,
            EmpleadoFichajeRepository fichajeRepo,
            ObjectMapper objectMapper) {
        this.dispositivoService = dispositivoService;
        this.historialRepo = historialRepo;
        this.fichajeRepo = fichajeRepo;
        this.objectMapper = objectMapper;
    }

    // Endpoint webhook Push configurado en el terminal Hikvision
    @PostMapping("/webhook-evento")
    public ResponseEntity<String> recibirEventoPush(@RequestBody Map<String, Object> payloadCompleto) {
        try {
            // Convierte el mapa a DTO para lógica interna
            DispositivoEventoDTO evento = objectMapper.convertValue(payloadCompleto, DispositivoEventoDTO.class);

            // Serializa el mapa exacto tal como vino en el socket HTTP:
            String rawJson = objectMapper.writeValueAsString(payloadCompleto);

            dispositivoService.procesarEventoIndividualConPayload(evento, rawJson);
        } catch (Exception e) {
            // Se captura para asegurar que siempre responda 200 OK al reloj
        }
        return ResponseEntity.ok("OK");
    }

    // Endpoint para sincronización en bloque de eventos acumulados
    @PostMapping("/sincronizar-lote")
    public ResponseEntity<ResumenImportacionDTO> sincronizarLote(
            @RequestBody List<DispositivoEventoDTO> eventos,
            @RequestParam(value = "dispositivo", required = false, defaultValue = "Terminal Biométrico") String dispositivo) {
        ResumenImportacionDTO resumen = dispositivoService.procesarLoteDispositivo(eventos, dispositivo);
        return ResponseEntity.ok(resumen);
    }

    // Listado de importaciones agrupadas por fecha/historial para el frontend
    @GetMapping("/historial-diario")
    public ResponseEntity<List<ImportacionHistorial>> listarHistorialDiario() {
        return ResponseEntity.ok(historialRepo.findAllByOrderByFechaImportacionDesc());
    }

    // Padrón de marcaciones filtrado por fecha del día
    @GetMapping("/fichajes/dia")
    public ResponseEntity<List<EmpleadoFichaje>> listarFichajesDelDia(
            @RequestParam(value = "fecha", required = false) String fechaStr,
            @RequestParam(value = "q", required = false) String q) {

        LocalDate fecha = (fechaStr != null && !fechaStr.isBlank())
                ? LocalDate.parse(fechaStr.trim())
                : LocalDate.now();

        LocalDateTime inicio = fecha.atStartOfDay();
        LocalDateTime fin = fecha.atTime(LocalTime.MAX);

        return ResponseEntity.ok(fichajeRepo.findFichajesPorRangoYBusqueda(inicio, fin, q != null ? q.trim() : ""));
    }
}