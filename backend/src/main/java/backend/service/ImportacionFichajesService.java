package backend.service;

import backend.dto.ResumenImportacionDTO;
import backend.model.Empleado;
import backend.model.EmpleadoFichaje;
import backend.repositories.EmpleadoFichajeRepository;
import backend.repositories.EmpleadoRepository;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
public class ImportacionFichajesService {

    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoFichajeRepository fichajeRepo;

    public ImportacionFichajesService(EmpleadoRepository empleadoRepo, EmpleadoFichajeRepository fichajeRepo) {
        this.empleadoRepo = empleadoRepo;
        this.fichajeRepo = fichajeRepo;
    }

    private String limpiar(String val) {
        if (val == null) return "";
        return val.replace("'", "").trim();
    }

    @Transactional
    public ResumenImportacionDTO importarArchivo(MultipartFile file) throws Exception {
        String nombre = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        List<FilaFichajeRaw> filas = new ArrayList<>();

        if (nombre.endsWith(".csv") || nombre.endsWith(".txt")) {
            filas = parsearCSV(file);
        } else if (nombre.endsWith(".xlsx") || nombre.endsWith(".xls")) {
            filas = parsearExcel(file);
        } else {
            throw new IllegalArgumentException("Formato no soportado. Debe ser CSV o Excel.");
        }

        return procesarRegistros(filas);
    }

    // --- Parser CSV (detecta tabulaciones o comas) ---
    private List<FilaFichajeRaw> parsearCSV(MultipartFile file) throws Exception {
        List<FilaFichajeRaw> lista = new ArrayList<>();
        
        try (CSVReader reader = new CSVReaderBuilder(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))
                .withCSVParser(new CSVParserBuilder().withSeparator('\t').build()) // Tu archivo viene delimitado por TABs
                .build()) {

            String[] header = reader.readNext();
            // Si no detectó columnas por tabulador, probar con coma/punto y coma
            if (header != null && header.length == 1) {
                // Fallback a separador por coma si no fue por tab
                return parsearCSVConComa(file);
            }

            Map<String, Integer> colIndex = mapearCabeceras(header);
            String[] fila;
            while ((fila = reader.readNext()) != null) {
                if (fila.length <= 1 || fila[0].isBlank()) continue;
                lista.add(extraerFila(fila, colIndex));
            }
        }
        return lista;
    }

    private List<FilaFichajeRaw> parsearCSVConComa(MultipartFile file) throws Exception {
        List<FilaFichajeRaw> lista = new ArrayList<>();
        try (CSVReader reader = new CSVReaderBuilder(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))
                .withCSVParser(new CSVParserBuilder().withSeparator(',').build())
                .build()) {
            String[] header = reader.readNext();
            Map<String, Integer> colIndex = mapearCabeceras(header);
            String[] fila;
            while ((fila = reader.readNext()) != null) {
                if (fila.length <= 1 || fila[0].isBlank()) continue;
                lista.add(extraerFila(fila, colIndex));
            }
        }
        return lista;
    }

    // --- Parser Excel (.xlsx) ---
    private List<FilaFichajeRaw> parsearExcel(MultipartFile file) throws Exception {
        List<FilaFichajeRaw> lista = new ArrayList<>();
        Workbook workbook = WorkbookFactory.create(file.getInputStream());
        Sheet sheet = workbook.getSheetAt(0);

        Iterator<Row> rowIterator = sheet.iterator();
        if (!rowIterator.hasNext()) return lista;

        // Cabeceras
        Row headerRow = rowIterator.next();
        Map<String, Integer> colIndex = new HashMap<>();
        for (Cell cell : headerRow) {
            colIndex.put(cell.getStringCellValue().trim(), cell.getColumnIndex());
        }

        DataFormatter formatter = new DataFormatter();
        while (rowIterator.hasNext()) {
            Row r = rowIterator.next();
            String legajo = limpiar(formatter.formatCellValue(r.getCell(colIndex.getOrDefault("sJobNo", 1))));
            String fecha = formatter.formatCellValue(r.getCell(colIndex.getOrDefault("Date", 3)));
            String hora = formatter.formatCellValue(r.getCell(colIndex.getOrDefault("Time", 4)));
            String status = limpiar(formatter.formatCellValue(r.getCell(colIndex.getOrDefault("AttendanceStatus", 9))));
            String serialStr = limpiar(formatter.formatCellValue(r.getCell(colIndex.getOrDefault("SerialNo", 10))));

            if (!legajo.isBlank()) {
                lista.add(new FilaFichajeRaw(legajo, fecha, hora, status, serialStr.isBlank() ? null : Long.parseLong(serialStr)));
            }
        }
        workbook.close();
        return lista;
    }

    private Map<String, Integer> mapearCabeceras(String[] header) {
        Map<String, Integer> map = new HashMap<>();
        for (int i = 0; i < header.length; i++) {
            map.put(limpiar(header[i]), i);
        }
        return map;
    }

    private FilaFichajeRaw extraerFila(String[] fila, Map<String, Integer> idx) {
        String legajo = limpiar(fila[idx.getOrDefault("sJobNo", 1)]);
        String fecha = limpiar(fila[idx.getOrDefault("Date", 3)]);
        String hora = limpiar(fila[idx.getOrDefault("Time", 4)]);
        String status = limpiar(fila[idx.getOrDefault("AttendanceStatus", 9)]);
        String serialStr = limpiar(fila[idx.getOrDefault("SerialNo", 10)]);
        Long serial = serialStr.matches("\\d+") ? Long.parseLong(serialStr) : null;
        return new FilaFichajeRaw(legajo, fecha, hora, status, serial);
    }

    // --- Persistencia con Filtros de Negocio ---
    private ResumenImportacionDTO procesarRegistros(List<FilaFichajeRaw> filas) {
        int procesadas = 0;
        int duplicadas = 0;
        int errores = 0;
        List<String> mensajesErrores = new ArrayList<>();

        for (FilaFichajeRaw f : filas) {
    try {
        // 1. Validar duplicado por SerialNo (idempotencia del lector)
        if (f.serialNo() != null && fichajeRepo.existsBySerialNo(f.serialNo())) {
            duplicadas++;
            continue;
        }

        // 2. BUSCAR POR ID BIOMÉTRICO (el sJobNo limpio del CSV: "1", "2", "3", etc.)
        Optional<Empleado> empOpt = empleadoRepo.findByIdBiometrico(f.legajo());
        
        if (empOpt.isEmpty()) {
            errores++;
            mensajesErrores.add("No existe colaborador vinculado al ID Biométrico '" + f.legajo() + "'.");
            continue;
        }

        Empleado emp = empOpt.get();
        LocalDateTime fechaHora = LocalDateTime.of(LocalDate.parse(f.fecha()), LocalTime.parse(f.hora()));

        // 3. Regla antirrepetitiva / rebote (< 2 minutos)
        Optional<EmpleadoFichaje> ultimaFichada = fichajeRepo.findTopByEmpleadoOrderByHoraFichajeDesc(emp);
        String estado = "valido";
        String observacion = null;

        if (ultimaFichada.isPresent()) {
            long segundosDif = Math.abs(Duration.between(ultimaFichada.get().getHoraFichaje(), fechaHora).getSeconds());
            if (segundosDif < 120) {
                estado = "duplicado_ignorado";
                observacion = "Descarte automático: marcación con solo " + segundosDif + "s de diferencia.";
            }
        }

        // 4. Guardar fichaje
        EmpleadoFichaje fichaje = new EmpleadoFichaje();
        fichaje.setEmpleado(emp); // Relación ManyToOne con Empleado
        fichaje.setHoraFichaje(fechaHora);
        fichaje.setTipoEvento(f.status()); // 'checkIn', 'checkOut', etc.
        fichaje.setSerialNo(f.serialNo());
        fichaje.setEstadoFichaje(estado);
        fichaje.setObservacion(observacion);

        fichajeRepo.save(fichaje);
        procesadas++;

    } catch (Exception e) {
        errores++;
        mensajesErrores.add("Error en fila con Serial " + f.serialNo() + ": " + e.getMessage());
    }
}

        return new ResumenImportacionDTO(filas.size(), procesadas, duplicadas, errores, mensajesErrores);
    }

    private record FilaFichajeRaw(String legajo, String fecha, String hora, String status, Long serialNo) {}
}