package backend.service;

import backend.model.Empleado;
import backend.repositories.EmpleadoRepository;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class VinculacionBiometricaService {

    private final EmpleadoRepository empleadoRepo;

    public VinculacionBiometricaService(EmpleadoRepository empleadoRepo) {
        this.empleadoRepo = empleadoRepo;
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

    // 1. Extrae los usuarios únicos del CSV y sugiere coincidencias con empleados del sistema
    public List<DispositivoUsuarioDTO> previsualizarUsuariosCSV(MultipartFile file) throws Exception {
        Map<String, String> usuariosEnLector = new LinkedHashMap<>(); // sJobNo -> sName

        try (CSVReader reader = new CSVReaderBuilder(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))
                .withCSVParser(new CSVParserBuilder().withSeparator('\t').build())
                .build()) {
            
            String[] header = reader.readNext();
            String[] fila;
            while ((fila = reader.readNext()) != null) {
                if (fila.length <= 1 || fila[0].isBlank()) continue;
                String name = fila[0].replace("'", "").trim();
                String jobNo = fila[1].replace("'", "").trim();
                if (!jobNo.isBlank()) {
                    usuariosEnLector.putIfAbsent(jobNo, name);
                }
            }
        }

        List<Empleado> todosLosEmpleados = empleadoRepo.findAll();
        List<DispositivoUsuarioDTO> resultado = new ArrayList<>();

        for (Map.Entry<String, String> entry : usuariosEnLector.entrySet()) {
            String jobNo = entry.getKey();
            String name = entry.getValue();

            // Buscar si ya hay un empleado con este ID biométrico
            Optional<Empleado> yaAsignado = empleadoRepo.findByIdBiometrico(jobNo);
            if (yaAsignado.isPresent()) {
                Empleado e = yaAsignado.get();
                resultado.add(new DispositivoUsuarioDTO(jobNo, name, e.getId(), e.getNombre() + " " + e.getApellido(), true));
                continue;
            }

            // Si no está vinculado, buscar coincidencia por nombre o apellido
            Empleado coincidente = todosLosEmpleados.stream()
                .filter(e -> e.getNombre().toLowerCase().contains(name.toLowerCase()) || 
                             name.toLowerCase().contains(e.getNombre().toLowerCase()))
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

    // 2. Guarda la asignación masiva de ID biométrico a cada empleado
    @Transactional
    public void guardarVinculaciones(List<AsignacionBiometricaRequest> asignaciones) {
        for (AsignacionBiometricaRequest asig : asignaciones) {
            if (asig.empleadoId() != null && asig.idBiometrico() != null && !asig.idBiometrico().isBlank()) {
                empleadoRepo.findById(asig.empleadoId()).ifPresent(emp -> {
                    emp.setIdBiometrico(asig.idBiometrico().trim());
                    empleadoRepo.save(emp);
                });
            }
        }
    }
}