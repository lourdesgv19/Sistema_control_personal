package backend.service;

import backend.dto.MetricasPersonalDTO;
import backend.model.*;
import backend.repositories.EmpleadoClaseRepository;
import backend.repositories.EmpleadoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalTime;
import java.util.*;

@Service
public class EmpleadoService {

    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoClaseRepository claseRepo;

    public EmpleadoService(EmpleadoRepository empleadoRepo, EmpleadoClaseRepository claseRepo) {
        this.empleadoRepo = empleadoRepo;
        this.claseRepo = claseRepo;
    }

    @Transactional(readOnly = true)
    public List<Empleado> listarTodos() {
        return empleadoRepo.findAll();
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
        return empleadoRepo.save(emp);
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
        emp.setRolSistema(empActualizado.getRolSistema());
        emp.setTipoRegimenHorario(empActualizado.getTipoRegimenHorario());
        emp.setHorarioGeneral(empActualizado.getHorarioGeneral());
        emp.setToleranciaIngresoMin(empActualizado.getToleranciaIngresoMin());
        emp.setToleranciaEgresoMin(empActualizado.getToleranciaEgresoMin());
        emp.setActivo(empActualizado.getActivo());

        // Manejo de categorías múltiples (@ManyToMany)
        emp.setCategorias(empActualizado.getCategorias() != null ? empActualizado.getCategorias() : new ArrayList<>());

        // Manejo de cargos múltiples
        emp.setCargos(empActualizado.getCargos() != null ? empActualizado.getCargos() : new ArrayList<>());

        if (Boolean.TRUE.equals(empActualizado.getActivo())) {
            emp.setFechaBaja(null);
        }

        // Persistir rangos de horario específico
        if ("ESPECIFICO".equals(empActualizado.getTipoRegimenHorario())) {
            emp.getRangosHorario().clear();
            if (empActualizado.getRangosHorario() != null) {
                for (EmpleadoRangoHorario rango : empActualizado.getRangosHorario()) {
                    rango.setEmpleado(emp);
                    emp.getRangosHorario().add(rango);
                }
            }
        } else {
            emp.getRangosHorario().clear();
        }

        return empleadoRepo.save(emp);
    }

    @Transactional
    public void eliminar(Long id) {
        Empleado emp = obtenerPorId(id);
        emp.setActivo(false);
        emp.setFechaBaja(java.time.LocalDateTime.now());
        empleadoRepo.save(emp);
    }

    @Transactional
    public void reactivar(Long id) {
        Empleado emp = obtenerPorId(id);
        emp.setActivo(true);
        emp.setFechaBaja(null);
        empleadoRepo.save(emp);
    }

    // --- CÁLCULO DE MÉTRICAS PERSONAL DTO ---
    @Transactional(readOnly = true)
    public MetricasPersonalDTO calcularMetricas(Long empleadoId) {
        Empleado emp = obtenerPorId(empleadoId);

        double totalHorasSemana = 0.0;
        Set<String> diasSet = new LinkedHashSet<>();
        String regimenDesc = "Sin Horario Fijado";
        String regimenSub = "Pendiente de asignar";

        String tipo = emp.getTipoRegimenHorario() != null ? emp.getTipoRegimenHorario() : "SIN_HORARIO";

        if ("POR_CLASES".equals(tipo)) {
            List<EmpleadoClase> clases = claseRepo.findByEmpleadoId(empleadoId);
            regimenDesc = "Docente Por Cátedras";
            regimenSub = clases.size() + " clases en la semana";

            for (EmpleadoClase c : clases) {
                if (c.getDiaSemana() != null) {
                    diasSet.add(normalizarNombreDia(c.getDiaSemana()));
                }
                if (c.getHoraInicio() != null && c.getHoraFin() != null) {
                    long minutos = Duration.between(c.getHoraInicio(), c.getHoraFin()).toMinutes();
                    if (minutos > 0) totalHorasSemana += (minutos / 60.0);
                }
            }
        } else if ("PREESTABLECIDO".equals(tipo) && emp.getHorarioGeneral() != null) {
            Horario h = emp.getHorarioGeneral();
            regimenDesc = h.getNombre();
            regimenSub = "Horario institucional corporativo";

            String[] dias = (h.getDiasLaborables() != null ? h.getDiasLaborables() : "").split(",");
            for (String d : dias) {
                String diaNorm = normalizarDiaAbreviado(d.trim());
                if (!diaNorm.isEmpty()) diasSet.add(diaNorm);
            }

            if (h.getHoraEntrada() != null && h.getHoraEgreso() != null) {
                long minutosJornada = Duration.between(h.getHoraEntrada(), h.getHoraEgreso()).toMinutes();
                if (minutosJornada > 0) {
                    totalHorasSemana = (minutosJornada / 60.0) * diasSet.size();
                }
            }
        } else if ("ESPECIFICO".equals(tipo)) {
            regimenDesc = "Horario Específico";
            regimenSub = "Jornada personalizada";

            double horasJornadaDiaria = 0.0;
            if (emp.getRangosHorario() != null) {
                for (EmpleadoRangoHorario r : emp.getRangosHorario()) {
                    if (r.getDiasAplicables() != null) {
                        for (String d : r.getDiasAplicables().split(",")) {
                            String diaNorm = normalizarDiaAbreviado(d.trim());
                            if (!diaNorm.isEmpty()) diasSet.add(diaNorm);
                        }
                    }
                    if (r.getHoraDesde() != null && r.getHoraHasta() != null) {
                        long min = Duration.between(r.getHoraDesde(), r.getHoraHasta()).toMinutes();
                        if (min > 0) horasJornadaDiaria += (min / 60.0);
                    }
                }
            }
            totalHorasSemana = horasJornadaDiaria * (diasSet.isEmpty() ? 5 : diasSet.size());
        }

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

    // --- ASIGNACIÓN DE CLASES CON CONTROL DE SOLAPAMIENTO ---
    @Transactional
    public List<EmpleadoClase> agregarClasesMultiples(Long empleadoId, String materia, String comision,
                                                      String horaInicioStr, String horaFinStr, String aula,
                                                      List<String> diasSemana) {
        Empleado emp = obtenerPorId(empleadoId);
        LocalTime nuevaInicio = LocalTime.parse(horaInicioStr);
        LocalTime nuevaFin = LocalTime.parse(horaFinStr);

        if (!nuevaFin.isAfter(nuevaInicio)) {
            throw new IllegalArgumentException("La hora de fin debe ser posterior a la de inicio.");
        }

        List<EmpleadoClase> clasesActivas = claseRepo.findByEmpleadoId(empleadoId);

        for (String dia : diasSemana) {
            for (EmpleadoClase existente : clasesActivas) {
                if (existente.getDiaSemana().equalsIgnoreCase(dia)) {
                    LocalTime exInicio = existente.getHoraInicio();
                    LocalTime exFin = existente.getHoraFin();

                    if (nuevaInicio.isBefore(exFin) && nuevaFin.isAfter(exInicio)) {
                        throw new IllegalStateException(String.format(
                            "Conflicto el día %s: ya dicta '%s' de %s a %s hs.",
                            dia, existente.getMateria(),
                            exInicio.toString().substring(0, 5), exFin.toString().substring(0, 5)
                        ));
                    }
                }
            }
        }

        List<EmpleadoClase> creadas = new ArrayList<>();
        for (String dia : diasSemana) {
            EmpleadoClase nueva = new EmpleadoClase();
            nueva.setEmpleado(emp);
            nueva.setMateria(materia);
            nueva.setComision(comision);
            nueva.setHoraInicio(nuevaInicio);
            nueva.setHoraFin(nuevaFin);
            nueva.setAula(aula);
            nueva.setDiaSemana(dia);
            nueva.setActivo(true);
            creadas.add(claseRepo.save(nueva));
        }

        if (!"POR_CLASES".equals(emp.getTipoRegimenHorario())) {
            emp.setTipoRegimenHorario("POR_CLASES");
            empleadoRepo.save(emp);
        }

        return creadas;
    }

    @Transactional
    public void eliminarClase(Long claseId) {
        EmpleadoClase clase = claseRepo.findById(claseId)
                .orElseThrow(() -> new RuntimeException("Clase no encontrada"));
        clase.setActivo(false);
        clase.setFechaBaja(java.time.LocalDateTime.now());
        claseRepo.save(clase);
    }

    private String normalizarNombreDia(String dia) {
        String d = dia.toLowerCase();
        if (d.contains("lun")) return "Lunes";
        if (d.contains("mar")) return "Martes";
        if (d.contains("mi")) return "Miércoles";
        if (d.contains("jue")) return "Jueves";
        if (d.contains("vie")) return "Viernes";
        if (d.contains("s")) return "Sábado";
        if (d.contains("dom")) return "Domingo";
        return dia;
    }

    private String normalizarDiaAbreviado(String clave) {
        String c = clave.toLowerCase();
        if (c.startsWith("lun")) return "Lunes";
        if (c.startsWith("mar")) return "Martes";
        if (c.startsWith("mi")) return "Miércoles";
        if (c.startsWith("jue")) return "Jueves";
        if (c.startsWith("vie")) return "Viernes";
        if (c.startsWith("s")) return "Sábado";
        if (c.startsWith("dom")) return "Domingo";
        return "";
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