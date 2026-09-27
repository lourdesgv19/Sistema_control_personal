package backend.service;

import backend.dto.MetricasPersonalDTO;
import backend.model.Empleado;
import backend.model.EmpleadoClase;
import backend.model.EmpleadoRangoHorario;
import backend.model.Horario;
import backend.repositories.EmpleadoClaseRepository;
import backend.repositories.EmpleadoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.time.Duration;
import java.time.LocalTime;

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
        return empleadoRepo.findAllOrdenados();
    }

    @Transactional(readOnly = true)
    public Empleado obtenerPorId(Long id) {
        return empleadoRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Colaborador no encontrado con ID: " + id));
    }

    @Transactional
    public Empleado guardar(Empleado emp) {
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
        emp.setCategoria(empActualizado.getCategoria());
        emp.setCargos(empActualizado.getCargos());
        emp.setRolSistema(empActualizado.getRolSistema());
        emp.setTipoRegimenHorario(empActualizado.getTipoRegimenHorario());
        emp.setHorarioGeneral(empActualizado.getHorarioGeneral());
        emp.setToleranciaIngresoMin(empActualizado.getToleranciaIngresoMin());
        emp.setToleranciaEgresoMin(empActualizado.getToleranciaEgresoMin());
        emp.setActivo(empActualizado.getActivo());

        if (Boolean.TRUE.equals(empActualizado.getActivo())) {
            emp.setFechaBaja(null);
        }

        if ("ESPECIFICO".equals(empActualizado.getTipoRegimenHorario())) {
            emp.getRangosHorario().clear();
            if (empActualizado.getRangosHorario() != null) {
                for (EmpleadoRangoHorario rango : empActualizado.getRangosHorario()) {
                    rango.setEmpleado(emp); // Asocia la clave foránea id_empleado
                    emp.getRangosHorario().add(rango);
                }
            }
        } else {
            emp.getRangosHorario().clear();
        }

        return empleadoRepo.save(emp);
    }

    @Transactional
    public void bajaLogica(Long id) {
        empleadoRepo.deleteById(id);
    }

    @Transactional
    public void reactivar(Long id) {
        Empleado emp = obtenerPorId(id);
        emp.setActivo(true);
        emp.setFechaBaja(null);
        empleadoRepo.save(emp);
    }

    @Transactional
    public EmpleadoClase agregarClase(Long empleadoId, EmpleadoClase clase) {
        Empleado emp = obtenerPorId(empleadoId);
        clase.setEmpleado(emp);
        return claseRepo.save(clase);
    }

    @Transactional
public List<EmpleadoClase> agregarClasesMultiples(Long empleadoId, String materia, String comision, 
                                                  String horaInicio, String horaFin, String aula, 
                                                  List<String> diasSemana) {
    Empleado emp = obtenerPorId(empleadoId);
    List<EmpleadoClase> creadas = new ArrayList<>();

    for (String dia : diasSemana) {
        EmpleadoClase nueva = new EmpleadoClase();
        nueva.setEmpleado(emp);
        nueva.setMateria(materia);
        nueva.setComision(comision);
        nueva.setHoraInicio(LocalTime.parse(horaInicio));
        nueva.setHoraFin(LocalTime.parse(horaFin));
        nueva.setAula(aula);
        nueva.setDiaSemana(dia);
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
        claseRepo.deleteById(claseId);
    }

    @Transactional(readOnly = true)
    public List<EmpleadoClase> listarClases(Long empleadoId) {
        return claseRepo.findByEmpleadoId(empleadoId);
    }

    @Transactional
    public Empleado asignarTurnoPersonalizado(Long id, Empleado datos) {
    Empleado emp = obtenerPorId(id);
    emp.setTipoRegimenHorario(datos.getTipoRegimenHorario());
    emp.setHorarioGeneral(datos.getHorarioGeneral());
    emp.setToleranciaIngresoMin(datos.getToleranciaIngresoMin());
    emp.setToleranciaEgresoMin(datos.getToleranciaEgresoMin());

    // Si envía rangos horarios personalizados
    if (datos.getRangosHorario() != null) {
        emp.getRangosHorario().clear();
        for (EmpleadoRangoHorario rango : datos.getRangosHorario()) {
            rango.setEmpleado(emp);
            emp.getRangosHorario().add(rango);
        }
    }
    return empleadoRepo.save(emp);
}

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

        // Construcción del texto del rango de días
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
