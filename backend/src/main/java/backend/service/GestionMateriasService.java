package backend.service;

import backend.dto.GestionMateriasDTO.*;
import backend.dto.CalendarioSemanalDTO.BloqueClaseDTO;
import backend.dto.CalendarioSemanalDTO.RespuestaCalendarioDTO;
import backend.dto.GestionMateriasDTO;
import backend.model.Empleado;
import backend.model.EmpleadoHorario;
import backend.model.Materia;
import backend.repositories.EmpleadoHorarioRepository;
import backend.repositories.EmpleadoRepository;
import backend.repositories.MateriaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Service
public class GestionMateriasService {

    private final MateriaRepository materiaRepository;
    private final EmpleadoRepository empleadoRepository;
    private final EmpleadoHorarioRepository horarioRepo;
    private final CalendarioSemanalService calendarioService;
    private final AuditorHelperService auditor;

    public GestionMateriasService(
            MateriaRepository materiaRepository,
            EmpleadoRepository empleadoRepository,
            EmpleadoHorarioRepository horarioRepo,
            CalendarioSemanalService calendarioService,
            AuditorHelperService auditor) {
        this.materiaRepository = materiaRepository;
        this.empleadoRepository = empleadoRepository;
        this.horarioRepo = horarioRepo;
        this.calendarioService = calendarioService;
        this.auditor = auditor;
    }

    @Transactional(readOnly = true)
    public ResumenMetricas obtenerResumenSemanal(LocalDate fechaInicio, LocalDate fechaFin) {
        RespuestaCalendarioDTO calendario = calendarioService.obtenerCalendarioSemanal(fechaInicio, null, null, null);

        double horasDictadas = 0.0;
        double horasFijadas = 0.0;
        long completas = 0;
        long desvios = 0;
        long faltas = 0;
        double totalLiquidar = 0.0;
        double totalDeduccion = 0.0;

        for (var dia : calendario.dias()) {
            for (BloqueClaseDTO clase : dia.clases()) {
                horasFijadas += clase.horasProgramadas();
                horasDictadas += clase.horasEfectivas();
                totalLiquidar += clase.montoLiquidado();

                double perdidaClase = Math.max(0, (clase.horasProgramadas() - clase.horasEfectivas()) * clase.tarifaHora());
                totalDeduccion += perdidaClase;

                switch (clase.estadoSemaforo()) {
                    case "VERDE" -> completas++;
                    case "AMBAR" -> desvios++;
                    case "ROJO" -> faltas++;
                    default -> {}
                }
            }
        }

        double cumplimiento = horasFijadas > 0 
                ? Math.round((horasDictadas / horasFijadas) * 100.0) 
                : 0.0;

        return new ResumenMetricas(
            Math.round(horasDictadas * 10.0) / 10.0,
            Math.round(horasFijadas * 10.0) / 10.0,
            cumplimiento,
            completas,
            desvios,
            faltas,
            Math.round(totalLiquidar),
            Math.round(totalDeduccion)
        );
    }

@Transactional
    public void registrarNuevaMateriaConHorarios(NuevaMateriaRequest req) {
        LocalTime nuevaInicio = LocalTime.parse(req.horaInicio().length() == 5 ? req.horaInicio() + ":00" : req.horaInicio());
        LocalTime nuevaFin = LocalTime.parse(req.horaFin().length() == 5 ? req.horaFin() + ":00" : req.horaFin());

        if (!nuevaFin.isAfter(nuevaInicio)) {
            throw new IllegalArgumentException("La hora de finalización debe ser posterior a la de inicio.");
        }

        Empleado doc = null;
        if (req.idDocenteTitular() != null) {
            doc = empleadoRepository.findById(req.idDocenteTitular())
                    .orElseThrow(() -> new RuntimeException("Docente no encontrado con ID: " + req.idDocenteTitular()));
        }

        String aulaFinal = req.aula() != null ? req.aula().trim() : "";

        // 1. CONTROL DE SOLAPAMIENTOS (IGNORANDO EL HORARIO ACTUAL SI ES EDICIÓN)
        if (!Boolean.TRUE.equals(req.forzarGuardado()) && req.diasSemana() != null && !req.diasSemana().isEmpty()) {
            List<EmpleadoHorario> todosActivos = horarioRepo.findAll().stream()
                    .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                    // Si se está editando un horario existente, ignorar ese mismo horario para evitar falso solapamiento consigo mismo
                    .filter(h -> req.idHorario() == null || !h.getId().equals(req.idHorario()))
                    .toList();

            for (Integer dia : req.diasSemana()) {
                for (EmpleadoHorario h : todosActivos) {
                    if (h.getDiaSemana() != null && h.getDiaSemana().equals(dia)) {
                        LocalTime exInicio = h.getHoraEntrada();
                        LocalTime exFin = h.getHoraSalida();

                        boolean solapaTiempo = nuevaInicio.isBefore(exFin) && nuevaFin.isAfter(exInicio);

                        if (solapaTiempo) {
                            String nombreDia = diaNumeroANombre(dia);

                            // Control de Docente
                            if (doc != null && h.getEmpleado() != null && h.getEmpleado().getId().equals(doc.getId())) {
                                String matDoc = h.getMateria() != null ? h.getMateria().getNombre() : (h.getEtiqueta() != null ? h.getEtiqueta() : "Horario asignado");
                                throw new IllegalStateException(String.format(
                                    "SOLAPAMIENTO_DOCENTE: El docente %s ya tiene asignada la actividad '%s' el día %s de %s a %s hs.",
                                    doc.getApellido() + ", " + doc.getNombre(),
                                    matDoc, nombreDia,
                                    exInicio.toString().substring(0, 5), exFin.toString().substring(0, 5)
                                ));
                            }

                            // Control de Aula
                            if (!aulaFinal.isBlank() && h.getAula() != null && h.getAula().trim().equalsIgnoreCase(aulaFinal)) {
                                String ocupante = h.getEmpleado() != null ? (h.getEmpleado().getApellido() + " " + h.getEmpleado().getNombre()) : "Otro docente";
                                String materiaOcupante = h.getMateria() != null ? h.getMateria().getNombre() : (h.getEtiqueta() != null ? h.getEtiqueta() : "Clase");
                                throw new IllegalStateException(String.format(
                                    "SOLAPAMIENTO_AULA: El aula '%s' ya se encuentra ocupada el día %s de %s a %s hs por %s (%s).",
                                    aulaFinal, nombreDia,
                                    exInicio.toString().substring(0, 5), exFin.toString().substring(0, 5),
                                    materiaOcupante, ocupante
                                ));
                            }
                        }
                    }
                }
            }
        }

        // 2. BUSCAR MATERIA EXISTENTE O CREAR UNA NUEVA
        Materia materia;
        if (req.idMateria() != null) {
            materia = materiaRepository.findById(req.idMateria())
                    .orElse(new Materia());
        } else {
            materia = new Materia();
        }

        materia.setNombre(req.nombre().trim());
        if (req.codigo() != null) materia.setCodigo(req.codigo().trim());
        if (req.departamento() != null) materia.setDepartamento(req.departamento().trim());
        materia.setAulaPredeterminada(!aulaFinal.isBlank() ? aulaFinal : null);
        materia.setTarifaHoraCatedra(req.tarifaHora() != null ? BigDecimal.valueOf(req.tarifaHora()) : BigDecimal.ZERO);
        if (req.observaciones() != null) materia.setObservaciones(req.observaciones());
        materia.setActivo(true);
        Materia guardada = materiaRepository.save(materia);

        // 3. ACTUALIZAR O ASIGNAR EN EMPLEADO_HORARIOS
        if (doc != null && req.diasSemana() != null) {
            // Si vino un idHorario específico a editar, actualizamos esa fila
            if (req.idHorario() != null) {
                EmpleadoHorario hExistente = horarioRepo.findById(req.idHorario()).orElse(null);
                if (hExistente != null) {
                    hExistente.setEmpleado(doc);
                    hExistente.setDiaSemana(req.diasSemana().get(0));
                    hExistente.setHoraEntrada(nuevaInicio);
                    hExistente.setHoraSalida(nuevaFin);
                    hExistente.setMateria(guardada);
                    hExistente.setEtiqueta(guardada.getNombre());
                    hExistente.setAula(guardada.getAulaPredeterminada());
                    horarioRepo.save(hExistente);
                    return;
                }
            }

            // Si es alta nueva (o asignación múltiple de días)
            for (Integer dia : req.diasSemana()) {
                EmpleadoHorario nuevoH = new EmpleadoHorario();
                nuevoH.setEmpleado(doc);
                nuevoH.setDiaSemana(dia);
                nuevoH.setHoraEntrada(nuevaInicio);
                nuevoH.setHoraSalida(nuevaFin);
                nuevoH.setMateria(guardada);
                nuevoH.setEtiqueta(guardada.getNombre());
                nuevoH.setAula(guardada.getAulaPredeterminada());
                nuevoH.setToleranciaIngresoMin(doc.getToleranciaIngresoMin() != null ? doc.getToleranciaIngresoMin() : 15);
                nuevoH.setToleranciaEgresoMin(doc.getToleranciaEgresoMin() != null ? doc.getToleranciaEgresoMin() : 10);
                nuevoH.setTipoFrecuencia("SEMANAL");
                nuevoH.setRepeticionesPeriodo(1);
                nuevoH.setActivo(true);
                horarioRepo.save(nuevoH);
            }
        }
    }

    @Transactional(readOnly = true)
public List<GestionMateriasDTO.MateriaCatalogoDTO> obtenerCatalogoMateriasAgrupadas() {
    List<Materia> materias = materiaRepository.findAll().stream()
            .filter(m -> Boolean.TRUE.equals(m.getActivo()))
            .sorted(Comparator.comparing(Materia::getNombre))
            .toList();

    List<EmpleadoHorario> horarios = horarioRepo.findAll().stream()
            .filter(h -> Boolean.TRUE.equals(h.getActivo()) && h.getMateria() != null)
            .toList();

    List<GestionMateriasDTO.MateriaCatalogoDTO> resultado = new ArrayList<>();

    for (Materia m : materias) {
        List<EmpleadoHorario> horariosDeMateria = horarios.stream()
                .filter(h -> h.getMateria().getId().equals(m.getId()))
                .sorted(Comparator.comparing((EmpleadoHorario h) -> h.getDiaSemana() != null ? h.getDiaSemana() : 1)
                        .thenComparing(h -> h.getHoraEntrada() != null ? h.getHoraEntrada() : LocalTime.MIDNIGHT))
                .toList();

        double tarifa = m.getTarifaHoraCatedra() != null ? m.getTarifaHoraCatedra().doubleValue() : 5200.0;
        double horasTotales = 0.0;
        Set<String> diasUnicos = new LinkedHashSet<>();
        List<GestionMateriasDTO.HorarioDesgloseDTO> desgloses = new ArrayList<>();

        String docenteTitular = "Sin docente asignado";
        Long docenteId = null;

        for (EmpleadoHorario h : horariosDeMateria) {
            int diaNum = h.getDiaSemana() != null ? h.getDiaSemana() : 1;
            String diaNombre = diaNumeroANombre(diaNum);
            diasUnicos.add(diaNombre.substring(0, 3));

            long minutos = (h.getHoraEntrada() != null && h.getHoraSalida() != null)
                    ? Duration.between(h.getHoraEntrada(), h.getHoraSalida()).toMinutes()
                    : 0;
            double horasClase = Math.round((minutos / 60.0) * 10.0) / 10.0;
            horasTotales += horasClase;

            double totalClase = Math.round(horasClase * tarifa);

            String turno = (h.getHoraEntrada() != null && h.getHoraEntrada().isBefore(LocalTime.of(13, 0)))
                    ? "Turno Mañana" : "Turno Tarde";

            String docNombre = "-";
            String docLegajo = "-";
            if (h.getEmpleado() != null) {
                docNombre = h.getEmpleado().getApellido() + " " + h.getEmpleado().getNombre();
                docLegajo = h.getEmpleado().getNroLegajo() != null ? h.getEmpleado().getNroLegajo() : "-";
                if (docenteId == null) {
                    docenteId = h.getEmpleado().getId();
                    docenteTitular = docNombre;
                }
            }

            String aulaFinal = h.getAula() != null ? h.getAula() : (m.getAulaPredeterminada() != null ? m.getAulaPredeterminada() : "-");

            desgloses.add(new GestionMateriasDTO.HorarioDesgloseDTO(
                h.getId(),
                diaNum,
                diaNombre,
                h.getHoraEntrada() != null ? h.getHoraEntrada().toString().substring(0, 5) : "--:--",
                h.getHoraSalida() != null ? h.getHoraSalida().toString().substring(0, 5) : "--:--",
                horasClase,
                turno,
                aulaFinal,
                h.getEmpleado() != null ? h.getEmpleado().getId() : null,
                docNombre,
                docLegajo,
                tarifa,
                totalClase
            ));
        }

        resultado.add(new GestionMateriasDTO.MateriaCatalogoDTO(
            m.getId(),
            m.getNombre(),
            m.getCodigo(),
            m.getAulaPredeterminada() != null ? m.getAulaPredeterminada() : "Aula sin asignar",
            tarifa,
            horariosDeMateria.size(),
            new ArrayList<>(diasUnicos),
            Math.round(horasTotales * 10.0) / 10.0,
            docenteId,
            docenteTitular,
            desgloses
        ));
    }

    return resultado;
}

    private String diaNumeroANombre(Integer dia) {
        return switch (dia) {
            case 1 -> "Lunes";
            case 2 -> "Martes";
            case 3 -> "Miércoles";
            case 4 -> "Jueves";
            case 5 -> "Viernes";
            case 6 -> "Sábado";
            default -> "Día " + dia;
        };
    }
}