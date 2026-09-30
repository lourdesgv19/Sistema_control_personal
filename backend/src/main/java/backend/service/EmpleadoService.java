package backend.service;

import backend.dto.MetricasPersonalDTO;
import backend.model.*;
import backend.repositories.EmpleadoHorarioRepository;
import backend.repositories.EmpleadoRepository;
import backend.repositories.MateriaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalTime;
import java.util.*;


@Service
public class EmpleadoService {

    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoHorarioRepository horarioRepo;
    private final MateriaRepository materiaRepo;
    private final AuditorHelperService auditor;

    public EmpleadoService(EmpleadoRepository empleadoRepo, 
                           EmpleadoHorarioRepository horarioRepo,
                           MateriaRepository materiaRepo, AuditorHelperService auditor) {
        this.empleadoRepo = empleadoRepo;
        this.horarioRepo = horarioRepo;
        this.materiaRepo = materiaRepo;
        this.auditor = auditor;
    }

    @Transactional(readOnly = true)
    public List<Empleado> listarTodosActivos() {
        return empleadoRepo.findAllActivos();
    }

    @Transactional(readOnly = true)
    public Page<Empleado> listarPaginado(String q, Long categoriaId, String estado, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return empleadoRepo.buscarPaginado(q, categoriaId, estado, pageable);
    }

    @Transactional(readOnly = true)
    public Empleado obtenerPorId(Long id) {
        return empleadoRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado con ID: " + id));
    }

    @Transactional
    public Empleado crear(Empleado emp) {
        emp.setActivo(true);
        emp.setFechaBaja(null);
        Empleado nuevo = empleadoRepo.save(emp);

        auditor.registrar(
            "CREAR_EMPLEADO",
            "PERSONAL",
            "Alta de colaborador: " + nuevo.getNombre() + " " + nuevo.getApellido() + " (Legajo: " + nuevo.getNroLegajo() + ", DNI: " + nuevo.getDni() + ")"
        );

        return nuevo;
    }

    @Transactional
    public Empleado actualizar(Long id, Empleado empActualizado) {
        Empleado emp = obtenerPorId(id);
        emp.setNombre(empActualizado.getNombre());
        emp.setApellido(empActualizado.getApellido());
        emp.setDni(empActualizado.getDni());
        emp.setEmail(empActualizado.getEmail());
        emp.setTelefono(empActualizado.getTelefono());
        emp.setNroLegajo(empActualizado.getNroLegajo());
        emp.setIdBiometrico(empActualizado.getIdBiometrico());
        emp.setToleranciaIngresoMin(empActualizado.getToleranciaIngresoMin());
        emp.setToleranciaEgresoMin(empActualizado.getToleranciaEgresoMin());
        emp.setCategorias(empActualizado.getCategorias() != null ? empActualizado.getCategorias() : new ArrayList<>());
        emp.setCargos(empActualizado.getCargos() != null ? empActualizado.getCargos() : new ArrayList<>());

        if (Boolean.TRUE.equals(empActualizado.getActivo())) {
            emp.setActivo(true);
            emp.setFechaBaja(null);
        }
        auditor.registrar(
            "ACTUALIZAR_EMPLEADO",
            "PERSONAL",
            "Actualizacion de datos del empleado: " + emp.getNombre() + " " + emp.getApellido() + " (Legajo: " + emp.getNroLegajo() + ")"
        );

        return empleadoRepo.save(emp);
    }

@Transactional
    public void eliminar(Long id) {
        Empleado emp = obtenerPorId(id);
        emp.setActivo(false);
        emp.setFechaBaja(java.time.LocalDateTime.now());
        empleadoRepo.save(emp);

        auditor.registrar(
            "BAJA_EMPLEADO",
            "PERSONAL",
            "Baja lógica del colaborador: " + emp.getNombre() + " " + emp.getApellido() + " (Legajo: " + emp.getNroLegajo() + ")"
        );
    }

    @Transactional
    public void reactivar(Long id) {
        Empleado emp = obtenerPorId(id);
        emp.setActivo(true);
        emp.setFechaBaja(null);
        auditor.registrar(
            "REACTIVA_EMPLEADO",
            "PERSONAL",
            "Reactivación del empleado: " + emp.getNombre() + " " + emp.getApellido() + " (Legajo: " + emp.getNroLegajo() + ")"
        );
        empleadoRepo.save(emp);
    }

    // =========================================================
    // HORARIOS UNIFICADOS
    // =========================================================

    @Transactional(readOnly = true)
    public List<EmpleadoHorario> listarHorariosEmpleado(Long empleadoId) {
        return horarioRepo.findByEmpleadoId(empleadoId);
    }

@Transactional
public List<EmpleadoHorario> agregarHorariosMultiples(Long empleadoId,
                                                     List<Integer> diasSemana,
                                                     String horaEntradaStr,
                                                     String horaSalidaStr,
                                                     Long materiaId,
                                                     String etiqueta,
                                                     String aula,
                                                     Boolean forzarGuardado) {
    Empleado emp = obtenerPorId(empleadoId);
    LocalTime nuevaEntrada = LocalTime.parse(horaEntradaStr);
    LocalTime nuevaSalida = LocalTime.parse(horaSalidaStr);

    if (!nuevaSalida.isAfter(nuevaEntrada)) {
        throw new IllegalArgumentException("La hora de salida debe ser posterior a la de entrada.");
    }

    Materia mat = (materiaId != null) ? materiaRepo.findById(materiaId).orElse(null) : null;
    List<EmpleadoHorario> existentes = horarioRepo.findByEmpleadoId(empleadoId);

    if (!Boolean.TRUE.equals(forzarGuardado)) {
        for (Integer dia : diasSemana) {
            for (EmpleadoHorario h : existentes) {
                if (h.getDiaSemana().equals(dia)) {
                    LocalTime exEntrada = h.getHoraEntrada();
                    LocalTime exSalida = h.getHoraSalida();

                    if (nuevaEntrada.isBefore(exSalida) && nuevaSalida.isAfter(exEntrada)) {
                        String nombreDia = diaNumeroANombre(dia);
                        String info = h.getMateria() != null ? h.getMateria().getNombre() : (h.getEtiqueta() != null ? h.getEtiqueta() : "Turno");
                        
                        throw new IllegalStateException(String.format(
                            "SOLAPAMIENTO: El día %s coincide parcialmente con '%s' (%s a %s hs).",
                            nombreDia, info,
                            exEntrada.toString().substring(0, 5), exSalida.toString().substring(0, 5)
                        ));
                    }
                }
            }
        }
    }

    List<EmpleadoHorario> creados = new ArrayList<>();
    List<String> nombresDias = new ArrayList<>();

    for (Integer dia : diasSemana) {
        EmpleadoHorario nuevo = new EmpleadoHorario();
        nuevo.setEmpleado(emp);
        nuevo.setDiaSemana(dia);
        nuevo.setHoraEntrada(nuevaEntrada);
        nuevo.setHoraSalida(nuevaSalida);
        nuevo.setMateria(mat);
        nuevo.setEtiqueta(etiqueta);
        nuevo.setAula(aula != null && !aula.isBlank() ? aula : (mat != null ? mat.getAulaPredeterminada() : null));
        nuevo.setToleranciaIngresoMin(emp.getToleranciaIngresoMin() != null ? emp.getToleranciaIngresoMin() : 15);
        nuevo.setToleranciaEgresoMin(emp.getToleranciaEgresoMin() != null ? emp.getToleranciaEgresoMin() : 10);
        nuevo.setActivo(true);
        
        creados.add(horarioRepo.save(nuevo));
        nombresDias.add(diaNumeroANombre(dia));
    }

    // REGISTRO ÚNICO EN AUDITORÍA
    String tipoFranja = mat != null ? "Cátedra: " + mat.getNombre() : (etiqueta != null ? etiqueta : "Turno");
    String detalleDias = String.join(", ", nombresDias);
    String franjaHoras = nuevaEntrada.toString().substring(0, 5) + " a " + nuevaSalida.toString().substring(0, 5) + " hs";
    String avisoForzado = Boolean.TRUE.equals(forzarGuardado) ? " [Asignación con solapamiento forzado]" : "";

    auditor.registrar(
        "ASIGNAR_HORARIO_EMPLEADO",
        "PERSONAL",
        "Asignación de horario (" + tipoFranja + " | " + detalleDias + " de " + franjaHoras + avisoForzado + ") al colaborador: " + 
        emp.getNombre() + " " + emp.getApellido() + " (Legajo: " + emp.getNroLegajo() + ")"
    );

    return creados;
}

   @Transactional
    public void eliminarHorario(Long horarioId) {
    EmpleadoHorario h = horarioRepo.findById(horarioId)
            .orElseThrow(() -> new RuntimeException("Horario no encontrado con ID: " + horarioId));
    
    h.setActivo(false);
    h.setFechaBaja(java.time.LocalDateTime.now());
    horarioRepo.save(h);

    Empleado emp = h.getEmpleado();
    String detalleFranja = diaNumeroANombre(h.getDiaSemana()) + " " + 
                           h.getHoraEntrada().toString().substring(0, 5) + " a " + 
                           h.getHoraSalida().toString().substring(0, 5) + " hs";
    
    String infoExtra = h.getMateria() != null 
            ? " [Cátedra: " + h.getMateria().getNombre() + "]" 
            : (h.getEtiqueta() != null ? " [" + h.getEtiqueta() + "]" : "");

    auditor.registrar(
        "BAJA_HORARIO_EMPLEADO",
        "PERSONAL",
        "Baja de franja horaria (" + detalleFranja + infoExtra + ") del colaborador: " + 
        emp.getNombre() + " " + emp.getApellido() + " (Legajo: " + emp.getNroLegajo() + ")"
    );
}

    // =========================================================
    // MÉTRICAS CALCULADAS
    // =========================================================
    @Transactional(readOnly = true)
    public MetricasPersonalDTO calcularMetricas(Long empleadoId) {
        Empleado emp = obtenerPorId(empleadoId);
        List<EmpleadoHorario> franjas = horarioRepo.findByEmpleadoId(empleadoId);

        double totalHorasSemana = 0.0;
        Set<String> diasSet = new LinkedHashSet<>();
        boolean tieneMaterias = false;

        for (EmpleadoHorario f : franjas) {
            String diaNombre = diaNumeroANombre(f.getDiaSemana());
            diasSet.add(diaNombre);

            if (f.getMateria() != null) {
                tieneMaterias = true;
            }

            if (f.getHoraEntrada() != null && f.getHoraSalida() != null) {
                long minutos = Duration.between(f.getHoraEntrada(), f.getHoraSalida()).toMinutes();
                if (minutos > 0) {
                    totalHorasSemana += (minutos / 60.0);
                }
            }
        }

        String regimenDesc = franjas.isEmpty() ? "Sin Horario Fijado" : (tieneMaterias ? "Docente Por Cátedras" : "Jornada Regular");
        String regimenSub = franjas.isEmpty() ? "Pendiente de asignar" : franjas.size() + " bloques semanales";
        String textoDias = formatearTextoDias(diasSet);

        return new MetricasPersonalDTO(
                Math.round(totalHorasSemana * 10.0) / 10.0,
                diasSet.size(),
                textoDias,
                regimenDesc,
                regimenSub,
                emp.getToleranciaIngresoMin() != null ? emp.getToleranciaIngresoMin() : 15,
                emp.getToleranciaEgresoMin() != null ? emp.getToleranciaEgresoMin() : 10,
                new ArrayList<>(diasSet)
        );
    }

    private String diaNumeroANombre(Integer dia) {
        return switch (dia) {
            case 1 -> "Lunes";
            case 2 -> "Martes";
            case 3 -> "Miércoles";
            case 4 -> "Jueves";
            case 5 -> "Viernes";
            case 6 -> "Sábado";
            case 7 -> "Domingo";
            default -> "Día " + dia;
        };
    }

    private String formatearTextoDias(Set<String> dias) {
        if (dias.isEmpty()) return "Sin días asignados";
        if (dias.size() == 5 && dias.contains("Lunes") && dias.contains("Viernes") && !dias.contains("Sábado")) {
            return "De Lunes a Viernes";
        }
        if (dias.size() == 6 && dias.contains("Lunes") && dias.contains("Sábado")) {
            return "De Lunes a Sábado";
        }
        if (dias.size() == 7) {
            return "De Lunes a Domingo";
        }
        return String.join(", ", dias);
    }
}