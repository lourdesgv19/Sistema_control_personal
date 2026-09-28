package backend.service;

import backend.model.Empleado;
import backend.model.EmpleadoFichaje;
import backend.repositories.EmpleadoFichajeRepository;
import backend.repositories.EmpleadoRepository;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.*;

@Service
public class VinculacionBiometricaService {

    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoFichajeRepository fichajeRepo;

    public VinculacionBiometricaService(EmpleadoRepository empleadoRepo, EmpleadoFichajeRepository fichajeRepo) {
        this.empleadoRepo = empleadoRepo;
        this.fichajeRepo = fichajeRepo;
    }

    public record DispositivoUsuarioDTO(
        String sJobNo,
        String sName,
        Long sugeridoEmpleadoId,
        String sugeridoEmpleadoNombre,
        boolean yaVinculado
    ) {}

    public record AsignacionBiometricaRequest(
        Long empleadoId,
        String idBiometrico
    ) {}

    private String limpiar(String val) {
        if (val == null) return "";
        return val.replace("'", "").trim();
    }

    private String normalizarTexto(String texto) {
        if (texto == null) return "";
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase()
                .trim();
    }

    public List<DispositivoUsuarioDTO> previsualizarUsuariosCSV(MultipartFile file) throws Exception {
        Map<String, String> usuariosEnLector = new LinkedHashMap<>();
        byte[] fileBytes = file.getBytes();
        char separador = '\t';

        // Detectar si separa por comas o tabuladores
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
            if (header == null) return Collections.emptyList();

            Map<String, Integer> colIndex = new HashMap<>();
            for (int i = 0; i < header.length; i++) {
                colIndex.put(limpiar(header[i]).toLowerCase(), i);
            }

            int idxName = colIndex.getOrDefault("sname", 0);
            int idxJob = colIndex.getOrDefault("sjobno", 1);

            String[] fila;
            while ((fila = reader.readNext()) != null) {
                if (fila.length <= 1) continue;

                String name = idxName < fila.length ? limpiar(fila[idxName]) : "";
                String jobNo = idxJob < fila.length ? limpiar(fila[idxJob]) : "";

                if (jobNo.isBlank() || name.isBlank() || jobNo.equalsIgnoreCase("null") || name.equalsIgnoreCase("null")) {
                    continue;
                }

                usuariosEnLector.putIfAbsent(jobNo, name);
            }
        }

        List<Empleado> todosLosEmpleados = empleadoRepo.findAll();
        List<DispositivoUsuarioDTO> resultado = new ArrayList<>();

        for (Map.Entry<String, String> entry : usuariosEnLector.entrySet()) {
            String jobNo = entry.getKey();
            String name = entry.getValue();

            // 1. Verificar si ya está asignado en la BD
            Optional<Empleado> yaAsignado = todosLosEmpleados.stream()
                .filter(e -> jobNo.equals(e.getIdBiometrico()))
                .findFirst();

            if (yaAsignado.isPresent()) {
                Empleado e = yaAsignado.get();
                resultado.add(new DispositivoUsuarioDTO(jobNo, name, e.getId(), e.getNombre() + " " + e.getApellido(), true));
                continue;
            }

            // 2. Coincidencia inteligente (Nombre completo, nombre o apellido sin acentos)
            String nameNorm = normalizarTexto(name);
            Empleado coincidente = todosLosEmpleados.stream()
                .filter(e -> {
                    String nomNorm = normalizarTexto(e.getNombre());
                    String apeNorm = normalizarTexto(e.getApellido());
                    String fullNorm = nomNorm + " " + apeNorm;

                    return fullNorm.contains(nameNorm) 
                        || nameNorm.contains(nomNorm) 
                        || (!apeNorm.isBlank() && nameNorm.contains(apeNorm));
                })
                .findFirst()
                .orElse(null);

            resultado.add(new DispositivoUsuarioDTO(
                jobNo,
                name,
                coincidente != null ? coincidente.getId() : null,
                coincidente != null ? coincidente.getNombre() + " " + coincidente.getApellido() : null,
                false
            ));
        }

        return resultado;
    }

    @Transactional
    public void guardarVinculaciones(List<AsignacionBiometricaRequest> asignaciones) {
        for (AsignacionBiometricaRequest asig : asignaciones) {
            if (asig.empleadoId() != null && asig.idBiometrico() != null && !asig.idBiometrico().isBlank()) {
                String idBio = asig.idBiometrico().trim();

                // Liberar el ID de cualquier otro empleado si ya lo tenía asignado (evita colisión UNIQUE)
                empleadoRepo.findByIdBiometrico(idBio).ifPresent(otro -> {
                    if (!otro.getId().equals(asig.empleadoId())) {
                        otro.setIdBiometrico(null);
                        empleadoRepo.save(otro);
                    }
                });

                // Asignar al empleado confirmado
                empleadoRepo.findById(asig.empleadoId()).ifPresent(emp -> {
                    emp.setIdBiometrico(idBio);
                    empleadoRepo.save(emp);

                    // Actualizar retroactivamente las marcas históricas que estaban huérfanas
                    List<EmpleadoFichaje> marcasPrevias = fichajeRepo.findAllByIdBiometrico(idBio);
                    for (EmpleadoFichaje f : marcasPrevias) {
                        f.setEmpleado(emp);
                    }
                    fichajeRepo.saveAll(marcasPrevias);
                });
            }
        }
    }

    @Transactional(readOnly = true)
public List<DispositivoUsuarioDTO> obtenerPendientesDesdeBD() {
    // 1. Obtener pares únicos (idBiometrico, nombreReloj) de los fichajes sin empleado
    List<Object[]> huerfanos = fichajeRepo.findDistinctHuerfanos(); 
    // SELECT DISTINCT f.idBiometrico, f.nombreReloj FROM EmpleadoFichaje f WHERE f.activo = true AND f.empleado IS NULL

    List<Empleado> todos = empleadoRepo.findAll();
    List<DispositivoUsuarioDTO> resultado = new ArrayList<>();

    for (Object[] fila : huerfanos) {
        String jobNo = (String) fila[0];
        String name = (String) fila[1];
        if (jobNo == null || jobNo.isBlank()) continue;

        String nameNorm = normalizarTexto(name);
        Empleado coincidente = todos.stream()
            .filter(e -> {
                String fullNorm = normalizarTexto(e.getNombre() + " " + e.getApellido());
                return fullNorm.contains(nameNorm) || nameNorm.contains(normalizarTexto(e.getNombre()));
            })
            .findFirst()
            .orElse(null);

        resultado.add(new DispositivoUsuarioDTO(
            jobNo,
            name != null ? name : "Desconocido",
            coincidente != null ? coincidente.getId() : null,
            coincidente != null ? coincidente.getNombre() + " " + coincidente.getApellido() : null,
            false // Si está aquí, es porque aún no está vinculado en los fichajes
        ));
    }
    return resultado;
}
}