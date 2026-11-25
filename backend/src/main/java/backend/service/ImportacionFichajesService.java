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

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ImportacionFichajesService {

    private static final Logger log = LoggerFactory.getLogger(ImportacionFichajesService.class);

    // Límites para Control 2 (Rango lógico de fechas)
    private static final LocalDateTime FECHA_MINIMA_VALIDA = LocalDateTime.of(2024, 1, 1, 0, 0);
    private static final long MARGEN_FUTURO_MINUTOS = 5;

    // Umbral para filtro de rebote (2 minutos)
    private static final long UMBRAL_REBOTE_SEGUNDOS = 120;

    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoFichajeRepository fichajeRepo;
    private final ImportacionHistorialRepository historialRepo;
    private final EvaluadorIncidentesService evaluadorIncidentes;
    private final NotificacionTiempoRealService notificacionService;

    public ImportacionFichajesService(
            EmpleadoRepository empleadoRepo,
            EmpleadoFichajeRepository fichajeRepo,
            ImportacionHistorialRepository historialRepo,
            EvaluadorIncidentesService evaluadorIncidentesService,
            NotificacionTiempoRealService notificacionService) {
        this.empleadoRepo = empleadoRepo;
        this.fichajeRepo = fichajeRepo;
        this.historialRepo = historialRepo;
        this.evaluadorIncidentes = evaluadorIncidentesService;
        this.notificacionService = notificacionService;
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

    // =========================================================================
    // CONTROL 4: CÁLCULO DE HUELLA SHA-256 DEL ARCHIVO
    // =========================================================================
    private String calcularSha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes);
            StringBuilder hexString = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("No se pudo calcular el hash de integridad del archivo", e);
        }
    }

    @Transactional
    public ResumenImportacionDTO importarArchivo(MultipartFile file) throws Exception {
        log.info(">>> INICIO DE IMPORTACIÓN: Archivo='{}'", file.getOriginalFilename());

        byte[] fileBytes = file.getBytes();
        if (fileBytes.length == 0) {
            throw new IllegalArgumentException("El archivo seleccionado está vacío.");
        }

        // 1. Verificar duplicidad exacta de archivo mediante hash SHA-256 (Control 4)
        String hashArchivo = calcularSha256(fileBytes);
        Optional<ImportacionHistorial> lotePrevio = historialRepo.findFirstByHashArchivoAndActivoTrue(hashArchivo);
        if (lotePrevio.isPresent()) {
            ImportacionHistorial previo = lotePrevio.get();
            String fechaCarga = previo.getFechaImportacion() != null
                    ? previo.getFechaImportacion().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                    : "anteriormente";
            throw new IllegalStateException(
                    String.format("Este archivo ya fue importado el %s bajo el lote '%s' (ID #%d). Si deseas volver a cargarlo, primero da de baja el lote anterior.",
                            fechaCarga, previo.getNombreArchivo(), previo.getId())
            );
        }

        List<FilaFichajeRaw> filas = parsearCSV(fileBytes);

        ImportacionHistorial historial = new ImportacionHistorial(
                file.getOriginalFilename(),
                filas.size(),
                0,
                0,
                0,
                0,
                "Administrador"
        );
        historial.setHashArchivo(hashArchivo);
        historial = historialRepo.save(historial);

        ResumenImportacionDTO resumen = procesarTodasLasFilas(filas, historial);

        historial.setTotalFilas(resumen.totalFilas());
        historial.setProcesadasOk(resumen.procesadasOk());
        historial.setRegistrosNulos(resumen.registrosNulos());
        historial.setDuplicadasIgnoradas(resumen.duplicadasIgnoradas());
        historial.setErrores(resumen.errores());
        historialRepo.save(historial);

        // Evaluar incidentes en el rango continuo de fechas válidas del archivo
        try {
            LocalDate minFecha = null;
            LocalDate maxFecha = null;
            LocalDate hoy = LocalDate.now();

            for (FilaFichajeRaw f : filas) {
                if (!esVacioONulo(f.fecha())) {
                    try {
                        LocalDate d = parsearFechaSegura(f.fecha());
                        // Ignorar fechas fuera de rango lógico al calcular límites de auditoría
                        if (d.isBefore(FECHA_MINIMA_VALIDA.toLocalDate()) || d.isAfter(hoy)) {
                            continue;
                        }
                        if (minFecha == null || d.isBefore(minFecha)) minFecha = d;
                        if (maxFecha == null || d.isAfter(maxFecha)) maxFecha = d;
                    } catch (Exception ignored) {}
                }
            }

            if (minFecha != null && maxFecha != null) {
                if (maxFecha.getYear() == hoy.getYear() && maxFecha.getMonth() == hoy.getMonth() && maxFecha.isBefore(hoy)) {
                    maxFecha = hoy;
                }
                LocalDate cursor = minFecha;
                while (!cursor.isAfter(maxFecha)) {
                    if (!cursor.isAfter(hoy)) {
                        evaluadorIncidentes.evaluarFecha(cursor);
                    }
                    cursor = cursor.plusDays(1);
                }
            }
        } catch (Exception e) {
            log.error("Error al auditar incidentes tras importación: {}", e.getMessage());
        }

        notificacionService.notificarCambio("IMPORTACION_FICHAJES");

        return resumen;
    }

    private List<FilaFichajeRaw> parsearCSV(byte[] fileBytes) throws Exception {
        List<FilaFichajeRaw> lista = new ArrayList<>();
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

        // Ordenar cronológicamente para detectar rebotes consecutivos
        List<FilaFichajeRaw> filasOrdenadas = new ArrayList<>(filas);
        filasOrdenadas.sort(Comparator.comparing(f -> {
            try {
                if (esVacioONulo(f.fecha()) || esVacioONulo(f.hora())) {
                    return LocalDateTime.MAX;
                }
                return LocalDateTime.of(parsearFechaSegura(f.fecha()), parsearHoraSegura(f.hora()));
            } catch (Exception e) {
                return LocalDateTime.MAX;
            }
        }));

        Set<Long> serialesEnEsteArchivo = new HashSet<>();
        Map<String, LocalDateTime> ultimaMarcaValidaPorIdBio = new HashMap<>();
        LocalDateTime limiteMaximoFuturo = LocalDateTime.now().plusMinutes(MARGEN_FUTURO_MINUTOS);

        int indice = 0;
        for (FilaFichajeRaw f : filasOrdenadas) {
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

                // =============================================================
                // CONTROL 2: VALIDACIÓN DE FECHAS FUTURAS O FUERA DE RANGO LÓGICO
                // =============================================================
                if (fechaHora.isAfter(limiteMaximoFuturo)) {
                    throw new IllegalArgumentException(
                            "Fecha/hora futura detectada (" + fechaHora.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) + "). Revise el reloj del terminal biométrico."
                    );
                }
                if (fechaHora.isBefore(FECHA_MINIMA_VALIDA)) {
                    throw new IllegalArgumentException(
                            "Fecha fuera de rango histórico (" + fechaHora.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + "). Posible desconfiguración de fecha del reloj."
                    );
                }

                String idBio = f.sJobNo().trim();
                Empleado emp = mapaEmpleados.get(idBio);

                // Control de rebote (< 2 minutos para el mismo empleado/ID biométrico)
                LocalDateTime anteriorValida = ultimaMarcaValidaPorIdBio.get(idBio);
                if (anteriorValida == null) {
                    anteriorValida = fichajeRepo
                            .findTopByIdBiometricoAndEstadoFichajeAndActivoTrueOrderByHoraFichajeDesc(idBio, "valido")
                            .map(EmpleadoFichaje::getHoraFichaje)
                            .orElse(null);
                }

                String estadoFichaje = "valido";
                String observacion = null;

                if (anteriorValida != null) {
                    long diffSegundos = Math.abs(Duration.between(anteriorValida, fechaHora).getSeconds());
                    if (diffSegundos < UMBRAL_REBOTE_SEGUNDOS) {
                        estadoFichaje = "duplicado_ignorado";
                        observacion = "Descarte automático: marcación repetida con " + diffSegundos + "s de diferencia (< 2 min).";
                        duplicadas++;
                    }
                }

                if ("valido".equals(estadoFichaje)) {
                    ultimaMarcaValidaPorIdBio.put(idBio, fechaHora);
                }

                EmpleadoFichaje fichaje = new EmpleadoFichaje();
                fichaje.setImportacion(historial);
                fichaje.setEmpleado(emp);
                fichaje.setIdBiometrico(idBio);
                fichaje.setNombreReloj(f.sName());
                fichaje.setHoraFichaje(fechaHora);
                fichaje.setTipoEvento(f.status() != null && !f.status().isBlank() ? f.status() : "checkIn");
                fichaje.setSerialNo(f.serialNo());
                fichaje.setEstadoFichaje(estadoFichaje);
                fichaje.setObservacion(observacion);
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
            procesadas = (int) loteAGuardar.stream()
                    .filter(f -> "valido".equals(f.getEstadoFichaje()))
                    .count();
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

        notificacionService.notificarCambio("BAJA_IMPORTACION");
    }

    @Transactional
    public void reactivarHistorial(Long id) {
        ImportacionHistorial h = historialRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Importación no encontrada"));

        // Evitar reactivar si ya existe otro lote activo con el mismo hash
        if (h.getHashArchivo() != null) {
            Optional<ImportacionHistorial> otroActivo = historialRepo.findFirstByHashArchivoAndActivoTrue(h.getHashArchivo());
            if (otroActivo.isPresent() && !otroActivo.get().getId().equals(id)) {
                throw new IllegalStateException("Ya existe un lote activo con el mismo contenido de archivo (Lote #" + otroActivo.get().getId() + ").");
            }
        }

        h.setActivo(true);
        h.setFechaBaja(null);
        historialRepo.save(h);

        fichajeRepo.reactivarFichajesPorImportacion(id);

        notificacionService.notificarCambio("REACTIVACION_IMPORTACION");
    }

    public record FilaFichajeRaw(String sName, String sJobNo, String fecha, String hora, String status, Long serialNo) {}
}