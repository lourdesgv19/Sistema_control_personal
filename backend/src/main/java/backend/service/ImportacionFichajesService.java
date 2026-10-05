package backend.service;

import backend.dto.ResumenImportacionDTO;
import backend.model.Empleado;
import backend.model.EmpleadoFichaje;
import backend.model.ImportacionHistorial;
import backend.repositories.EmpleadoFichajeRepository;
import backend.repositories.EmpleadoRepository;
import backend.repositories.ImportacionHistorialRepository;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import backend.service.EvaluadorIncidentesService;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
public class ImportacionFichajesService {

    private static final Logger log = LoggerFactory.getLogger(ImportacionFichajesService.class);

    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoFichajeRepository fichajeRepo;
    private final ImportacionHistorialRepository historialRepo;
    private final EvaluadorIncidentesService evaluadorIncidentes;
    public ImportacionFichajesService(
            EmpleadoRepository empleadoRepo,
            EmpleadoFichajeRepository fichajeRepo,
            ImportacionHistorialRepository historialRepo,
            EvaluadorIncidentesService evaluadorIncidentesService) {
        this.empleadoRepo = empleadoRepo;
        this.fichajeRepo = fichajeRepo;
        this.historialRepo = historialRepo;
        this.evaluadorIncidentes = evaluadorIncidentesService;
    }

    private String limpiar(String val) {
        if (val == null) return "";
        return val.replace("'", "").trim();
    }

    private boolean esVacioONulo(String val) {
        if (val == null) return true;
        String v = val.trim();
        return v.isEmpty() || v.equalsIgnoreCase("null") || v.equalsIgnoreCase("'null'");
    }

    @Transactional
    public ResumenImportacionDTO importarArchivo(MultipartFile file) throws Exception {
        log.info(">>> INICIO DE IMPORTACIÓN: Archivo='{}'", file.getOriginalFilename());

        List<FilaFichajeRaw> filas = parsearCSV(file);

        ImportacionHistorial historial = new ImportacionHistorial(
            file.getOriginalFilename(),
            filas.size(),
            0,
            0,
            0,
            0,
            "Administrador"
        );
        historial = historialRepo.save(historial);

        ResumenImportacionDTO resumen = procesarTodasLasFilas(filas, historial);

        historial.setTotalFilas(resumen.totalFilas());
        historial.setProcesadasOk(resumen.procesadasOk());
        historial.setRegistrosNulos(resumen.registrosNulos());
        historial.setDuplicadasIgnoradas(resumen.duplicadasIgnoradas());
        historial.setErrores(resumen.errores());
        historialRepo.save(historial);

        try {
        Set<LocalDate> fechasDelArchivo = new HashSet<>();
        for (FilaFichajeRaw f : filas) {
            if (!esVacioONulo(f.fecha())) {
                try {
                    fechasDelArchivo.add(parsearFechaSegura(f.fecha()));
                } catch (Exception ignored) {}
            }
        }

        for (LocalDate fecha : fechasDelArchivo) {
            evaluadorIncidentes.evaluarFecha(fecha);
        }
    } catch (Exception e) {
        log.error("Error al auditar incidentes tras importación: {}", e.getMessage());
    }

        return resumen;
    }

    private List<FilaFichajeRaw> parsearCSV(MultipartFile file) throws Exception {
        List<FilaFichajeRaw> lista = new ArrayList<>();
        byte[] fileBytes = file.getBytes();
        char separador = '\t';

        try (BufferedReader br = new BufferedReader(new InputStreamReader(new ByteArrayInputStream(fileBytes), StandardCharsets.UTF_8))) {
            String firstLine = br.readLine();
            if (firstLine != null && !firstLine.contains("\t") && firstLine.contains(",")) {
                separador = ',';
            }
        }

        try (CSVReader reader = new CSVReaderBuilder(new InputStreamReader(new ByteArrayInputStream(fileBytes), StandardCharsets.UTF_8))
                .withCSVParser(new CSVParserBuilder().withSeparator(separador).build())
                .build()) {

            String[] header = reader.readNext();
            if (header == null) return lista;

            Map<String, Integer> colIndex = new HashMap<>();
            for (int i = 0; i < header.length; i++) {
                colIndex.put(limpiar(header[i]).toLowerCase(), i);
            }

            int idxName = colIndex.getOrDefault("sname", 0);
            int idxJob = colIndex.getOrDefault("sjobno", 1);
            int idxDate = colIndex.getOrDefault("date", 3);
            int idxTime = colIndex.getOrDefault("time", 4);
            int idxStatus = colIndex.getOrDefault("attendancestatus", 9);
            int idxSerial = colIndex.getOrDefault("serialno", 10);

            String[] fila;
            while ((fila = reader.readNext()) != null) {
                if (fila.length <= 1) continue;

                try {
                    String sName = idxName < fila.length ? limpiar(fila[idxName]) : "";
                    String sJobNo = idxJob < fila.length ? limpiar(fila[idxJob]) : "";
                    String fecha = idxDate < fila.length ? limpiar(fila[idxDate]) : "";
                    String hora = idxTime < fila.length ? limpiar(fila[idxTime]) : "";
                    String status = idxStatus < fila.length ? limpiar(fila[idxStatus]) : "checkIn";
                    String serialStr = idxSerial < fila.length ? limpiar(fila[idxSerial]) : null;

                    Long serial = (serialStr != null && serialStr.matches("\\d+")) ? Long.parseLong(serialStr) : null;
                    lista.add(new FilaFichajeRaw(sName, sJobNo, fecha, hora, status, serial));
                } catch (Exception ignored) {}
            }
        }
        return lista;
    }

    private ResumenImportacionDTO procesarTodasLasFilas(List<FilaFichajeRaw> filas, ImportacionHistorial historial) {
        int procesadas = 0;
        int registrosNulos = 0;
        int duplicadas = 0;
        int errores = 0;
        List<String> mensajesErrores = new ArrayList<>();
        List<EmpleadoFichaje> loteAGuardar = new ArrayList<>();

        List<Empleado> todos = empleadoRepo.findAll();
        Map<String, Empleado> mapaEmpleados = new HashMap<>();
        for (Empleado e : todos) {
            if (e.getIdBiometrico() != null && !e.getIdBiometrico().isBlank()) {
                mapaEmpleados.put(e.getIdBiometrico().trim(), e);
            }
        }

        Set<Long> serialesEnEsteArchivo = new HashSet<>();

        int indice = 0;
        for (FilaFichajeRaw f : filas) {
            indice++;

            if (esVacioONulo(f.sJobNo()) || esVacioONulo(f.sName())) {
                registrosNulos++;
                continue;
            }

            if (f.serialNo() != null) {
                if (serialesEnEsteArchivo.contains(f.serialNo()) || fichajeRepo.existsBySerialNo(f.serialNo())) {
                    duplicadas++;
                    continue;
                }
                serialesEnEsteArchivo.add(f.serialNo());
            }

            try {
                LocalDate fecha = parsearFechaSegura(f.fecha());
                LocalTime hora = parsearHoraSegura(f.hora());
                LocalDateTime fechaHora = LocalDateTime.of(fecha, hora);

                Empleado emp = mapaEmpleados.get(f.sJobNo());

                EmpleadoFichaje fichaje = new EmpleadoFichaje();
                fichaje.setImportacion(historial);
                fichaje.setEmpleado(emp);
                fichaje.setIdBiometrico(f.sJobNo());
                fichaje.setNombreReloj(f.sName());
                fichaje.setHoraFichaje(fechaHora);
                fichaje.setTipoEvento(f.status() != null && !f.status().isBlank() ? f.status() : "checkIn");
                fichaje.setSerialNo(f.serialNo());
                fichaje.setEstadoFichaje("valido");
                fichaje.setActivo(true);

                loteAGuardar.add(fichaje);

            } catch (Exception e) {
                errores++;
                if (mensajesErrores.size() < 5) {
                    mensajesErrores.add("Fila #" + indice + ": " + e.getMessage());
                }
            }
        }

        if (!loteAGuardar.isEmpty()) {
            fichajeRepo.saveAll(loteAGuardar);
            procesadas = loteAGuardar.size();
        }

        return new ResumenImportacionDTO(filas.size(), procesadas, registrosNulos, duplicadas, errores, mensajesErrores);
    }

    private LocalDate parsearFechaSegura(String fStr) {
        if (fStr == null || fStr.isBlank()) throw new IllegalArgumentException("Fecha vacía");
        String limpia = fStr.replace("'", "").trim().replace("/", "-");
        String[] partes = limpia.split("-");
        if (partes.length == 3 && partes[0].length() <= 2 && partes[2].length() == 4) {
            limpia = String.format("%s-%02d-%02d", partes[2], Integer.parseInt(partes[1]), Integer.parseInt(partes[0]));
        }
        return LocalDate.parse(limpia);
    }

    private LocalTime parsearHoraSegura(String hStr) {
        if (hStr == null || hStr.isBlank()) throw new IllegalArgumentException("Hora vacía");
        String limpia = hStr.replace("'", "").trim();
        String[] partes = limpia.split(":");
        if (partes.length >= 2) {
            int h = Integer.parseInt(partes[0]);
            int m = Integer.parseInt(partes[1]);
            int s = partes.length > 2 ? Integer.parseInt(partes[2]) : 0;
            return LocalTime.of(h, m, s);
        }
        return LocalTime.parse(limpia);
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<EmpleadoFichaje> listarMarcacionesPaginadas(String q, int pagina, int tamano) {
        org.springframework.data.domain.Pageable pageable = 
            org.springframework.data.domain.PageRequest.of(pagina, tamano);
        return fichajeRepo.buscarMarcacionesPaginadas(q, pageable);
    }

    @Transactional(readOnly = true)
    public long contarSinVincular() {
        return fichajeRepo.countIdentificadoresSinVincular();
    }

    @Transactional(readOnly = true)
    public List<EmpleadoFichaje> listarTodasLasMarcaciones() {
        return fichajeRepo.findAll();
    }

    @Transactional(readOnly = true)
    public List<EmpleadoFichaje> listarFichajesPorImportacion(Long importacionId, String nombre, String fechaStr) {
        LocalDateTime inicio = null;
        LocalDateTime fin = null;

        if (fechaStr != null && !fechaStr.isBlank()) {
            LocalDate fecha = LocalDate.parse(fechaStr.trim());
            inicio = fecha.atStartOfDay();
            fin = fecha.atTime(LocalTime.MAX);
        }

        return fichajeRepo.findByImportacionFiltrado(importacionId, nombre, inicio, fin);
    }

    @Transactional
    public void darDeBajaHistorial(Long id) {
        LocalDateTime ahora = LocalDateTime.now();
        fichajeRepo.desactivarFichajesPorImportacion(id, ahora);
        historialRepo.deleteById(id);
    }

    public record FilaFichajeRaw(String sName, String sJobNo, String fecha, String hora, String status, Long serialNo) {}
}