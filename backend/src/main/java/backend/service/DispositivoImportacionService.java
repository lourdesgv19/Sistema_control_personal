package backend.service;

import backend.dto.DispositivoEventoDTO;
import backend.dto.ResumenImportacionDTO;
import backend.model.Empleado;
import backend.model.EmpleadoFichaje;
import backend.model.ImportacionHistorial;
import backend.repositories.EmpleadoFichajeRepository;
import backend.repositories.EmpleadoRepository;
import backend.repositories.ImportacionHistorialRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class DispositivoImportacionService {

    private static final Logger log = LoggerFactory.getLogger(DispositivoImportacionService.class);

    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoFichajeRepository fichajeRepo;
    private final ImportacionHistorialRepository historialRepo;
    private final EvaluadorIncidentesService evaluadorIncidentes;
    private final NotificacionTiempoRealService notificacionService;
    private final ObjectMapper objectMapper;

    public DispositivoImportacionService(
            EmpleadoRepository empleadoRepo,
            EmpleadoFichajeRepository fichajeRepo,
            ImportacionHistorialRepository historialRepo,
            EvaluadorIncidentesService evaluadorIncidentes,
            NotificacionTiempoRealService notificacionService,
            ObjectMapper objectMapper) {
        this.empleadoRepo = empleadoRepo;
        this.fichajeRepo = fichajeRepo;
        this.historialRepo = historialRepo;
        this.evaluadorIncidentes = evaluadorIncidentes;
        this.notificacionService = notificacionService;
        this.objectMapper = objectMapper;
    }

    private boolean esNuloOVacio(String val) {
        if (val == null) return true;
        String v = val.trim();
        return v.isEmpty() || v.equalsIgnoreCase("null") || v.equalsIgnoreCase("'null'");
    }

    @Transactional
    public ResumenImportacionDTO procesarLoteDispositivo(List<DispositivoEventoDTO> eventos, String nombreDispositivo) {
        int total = eventos != null ? eventos.size() : 0;
        int registrosNulos = 0;
        int duplicados = 0;
        int errores = 0;
        List<EmpleadoFichaje> aPersistir = new ArrayList<>();
        Set<LocalDate> fechasAfectadas = new HashSet<>();

        if (total == 0) {
            return new ResumenImportacionDTO(0, 0, 0, 0, 0, List.of());
        }

        String loteNombre = "Dispositivo: " + (nombreDispositivo != null ? nombreDispositivo : "Hikvision DS-K1T804")
                + " - " + LocalDate.now();
        ImportacionHistorial historial = new ImportacionHistorial(
                loteNombre,
                total,
                0,
                0,
                0,
                0,
                "Terminal Biométrico"
        );
        historial = historialRepo.save(historial);

        List<Empleado> empleados = empleadoRepo.findAll();
        Map<String, Empleado> mapaEmpleados = new HashMap<>();
        for (Empleado e : empleados) {
            if (e.getIdBiometrico() != null && !e.getIdBiometrico().isBlank()) {
                mapaEmpleados.put(e.getIdBiometrico().trim(), e);
            }
        }

        Set<Long> serialesLote = new HashSet<>();

        for (DispositivoEventoDTO ev : eventos) {
            DispositivoEventoDTO.AccessControllerEvent acEvent = ev.getAccessControllerEvent();

            // Control de nulos: descartar y contar
            if (acEvent == null || esNuloOVacio(acEvent.getEmployeeNoString()) || esNuloOVacio(ev.getDateTime())) {
                registrosNulos++;
                continue;
            }

            // Control de serial duplicado
            Long serial = acEvent.getSerialNo();
            if (serial != null) {
                if (serialesLote.contains(serial) || fichajeRepo.existsBySerialNo(serial)) {
                    duplicados++;
                    continue;
                }
                serialesLote.add(serial);
            }

            try {
                LocalDateTime horaFichaje = LocalDateTime.parse(ev.getDateTime(), DateTimeFormatter.ISO_DATE_TIME);
                fechasAfectadas.add(horaFichaje.toLocalDate());

                String idBio = acEvent.getEmployeeNoString().trim();
                Empleado emp = mapaEmpleados.get(idBio);

                EmpleadoFichaje f = new EmpleadoFichaje();
                f.setImportacion(historial);
                f.setEmpleado(emp);
                f.setIdBiometrico(idBio);

                // El nombre de la persona configurado en el reloj
                String nombrePersonaReloj = !esNuloOVacio(acEvent.getName()) 
                        ? acEvent.getName().trim() 
                        : (emp != null ? (emp.getNombre() + " " + emp.getApellido()) : nombreDispositivo);
                f.setNombreReloj(nombrePersonaReloj);

                f.setHoraFichaje(horaFichaje);
                f.setTipoEvento(!esNuloOVacio(acEvent.getAttendanceStatus()) ? acEvent.getAttendanceStatus() : "checkIn");
                f.setSerialNo(serial);
                f.setEstadoFichaje("valido");
                f.setActivo(true);

                try {
                    f.setRawPayload(objectMapper.writeValueAsString(ev));
                } catch (Exception ignored) {
                    f.setRawPayload(null);
                }

                aPersistir.add(f);

            } catch (Exception ex) {
                errores++;
                log.warn("Error convirtiendo registro del dispositivo: {}", ex.getMessage());
            }
        }

        if (!aPersistir.isEmpty()) {
            fichajeRepo.saveAll(aPersistir);
        }

        int procesadasOk = aPersistir.size();
        historial.setTotalFilas(total);
        historial.setProcesadasOk(procesadasOk);
        historial.setRegistrosNulos(registrosNulos);
        historial.setDuplicadasIgnoradas(duplicados);
        historial.setErrores(errores);
        historialRepo.save(historial);

        try {
            for (LocalDate fecha : fechasAfectadas) {
                evaluadorIncidentes.evaluarFecha(fecha);
            }
        } catch (Exception ex) {
            log.error("Error al evaluar incidentes tras sincronización del dispositivo: {}", ex.getMessage());
        }

        notificacionService.notificarCambio("IMPORTACION_DISPOSITIVO");

        return new ResumenImportacionDTO(total, procesadasOk, registrosNulos, duplicados, errores, List.of());
    }

    @Transactional
    public void procesarEventoIndividualConPayload(DispositivoEventoDTO ev, String rawJson) {
        DispositivoEventoDTO.AccessControllerEvent acEvent = ev != null ? ev.getAccessControllerEvent() : null;

        // Control de nulos: si viene sin identificación o fecha se descarta directamente
        if (acEvent == null || esNuloOVacio(acEvent.getEmployeeNoString()) || esNuloOVacio(ev.getDateTime())) {
            log.debug("Fichaje nulo descartado del terminal");
            return;
        }

        try {
            LocalDateTime horaFichaje = LocalDateTime.parse(ev.getDateTime(), DateTimeFormatter.ISO_DATE_TIME);
            String idBio = acEvent.getEmployeeNoString().trim();

            if (acEvent.getSerialNo() != null && fichajeRepo.existsBySerialNo(acEvent.getSerialNo())) {
                log.debug("Serial duplicado ignorado: {}", acEvent.getSerialNo());
                return;
            }

            Empleado emp = empleadoRepo.findAll().stream()
                    .filter(e -> idBio.equals(e.getIdBiometrico()))
                    .findFirst()
                    .orElse(null);

            EmpleadoFichaje f = new EmpleadoFichaje();
            f.setEmpleado(emp);
            f.setIdBiometrico(idBio);

            // Nombre de la persona cargado en el dispositivo
            String nombrePersona = !esNuloOVacio(acEvent.getName()) 
                    ? acEvent.getName().trim() 
                    : (emp != null ? (emp.getNombre() + " " + emp.getApellido()) : "Hikvision Terminal");
            f.setNombreReloj(nombrePersona);

            f.setHoraFichaje(horaFichaje);
            f.setTipoEvento(!esNuloOVacio(acEvent.getAttendanceStatus()) ? acEvent.getAttendanceStatus() : "checkIn");
            f.setSerialNo(acEvent.getSerialNo());
            f.setEstadoFichaje("valido");
            f.setActivo(true);
            f.setRawPayload(rawJson);

            fichajeRepo.save(f);

            evaluadorIncidentes.evaluarFecha(horaFichaje.toLocalDate());
            notificacionService.notificarCambio("NUEVA_FICHA_DISPOSITIVO");
        } catch (Exception e) {
            log.error("Error procesando evento individual del dispositivo: {}", e.getMessage());
        }
    }

    @Transactional
    public void procesarEventoIndividual(DispositivoEventoDTO ev) {
        String json = null;
        try {
            json = objectMapper.writeValueAsString(ev);
        } catch (Exception ignored) {}
        procesarEventoIndividualConPayload(ev, json);
    }
}