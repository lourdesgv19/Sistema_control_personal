package backend.service;

import backend.dto.GestionMateriasDTO.*;
import backend.dto.CalendarioSemanalDTO.BloqueClaseDTO;
import backend.dto.CalendarioSemanalDTO.RespuestaCalendarioDTO;
import backend.model.Empleado;
import backend.model.EmpleadoHorario;
import backend.model.Materia;
import backend.repositories.EmpleadoHorarioRepository;
import backend.repositories.EmpleadoRepository;
import backend.repositories.MateriaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        // 1. CONTROL DE SOLAPAMIENTOS (PERSONA Y AULA)
        if (!Boolean.TRUE.equals(req.forzarGuardado()) && req.diasSemana() != null && !req.diasSemana().isEmpty()) {
            List<EmpleadoHorario> todosActivos = horarioRepo.findAll().stream()
                    .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                    .toList();

            for (Integer dia : req.diasSemana()) {
                for (EmpleadoHorario h : todosActivos) {
                    if (h.getDiaSemana() != null && h.getDiaSemana().equals(dia)) {
                        LocalTime exInicio = h.getHoraEntrada();
                        LocalTime exFin = h.getHoraSalida();

                        // Fórmula de solapamiento de intervalos
                        boolean solapaTiempo = nuevaInicio.isBefore(exFin) && nuevaFin.isAfter(exInicio);

                        if (solapaTiempo) {
                            String nombreDia = diaNumeroANombre(dia);

                            // A. Control de Docente / Persona
                            if (doc != null && h.getEmpleado() != null && h.getEmpleado().getId().equals(doc.getId())) {
                                String matDoc = h.getMateria() != null ? h.getMateria().getNombre() : (h.getEtiqueta() != null ? h.getEtiqueta() : "Horario asignado");
                                throw new IllegalStateException(String.format(
                                    "SOLAPAMIENTO_DOCENTE: El docente %s ya tiene asignada la actividad '%s' el día %s de %s a %s hs.",
                                    doc.getApellido() + ", " + doc.getNombre(),
                                    matDoc, nombreDia,
                                    exInicio.toString().substring(0, 5), exFin.toString().substring(0, 5)
                                ));
                            }

                            // B. Control de Aula / Laboratorio
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

        // 2. GUARDAR EN CATÁLOGO DE MATERIAS
        Materia materia = new Materia();
        materia.setNombre(req.nombre().trim());
        materia.setCodigo(req.codigo() != null ? req.codigo().trim() : null);
        materia.setDepartamento(req.departamento() != null ? req.departamento().trim() : "General");
        materia.setAulaPredeterminada(!aulaFinal.isBlank() ? aulaFinal : null);
        materia.setTarifaHoraCatedra(req.tarifaHora() != null ? BigDecimal.valueOf(req.tarifaHora()) : BigDecimal.ZERO);
        materia.setObservaciones(req.observaciones());
        materia.setActivo(true);
        Materia guardada = materiaRepository.save(materia);

        // 3. PERSISTIR EN LA TABLA UNIFICADA EMPLEADO_HORARIOS
        if (doc != null && req.diasSemana() != null) {
            List<String> diasStr = new ArrayList<>();
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

                diasStr.add(diaNumeroANombre(dia));
            }

            auditor.registrar(
                "CREAR_MATERIA_CON_HORARIOS",
                "MATERIAS",
                String.format("Alta de cátedra '%s' asignada a %s (%s de %s a %s hs en %s)",
                    guardada.getNombre(), doc.getApellido() + " " + doc.getNombre(),
                    String.join(", ", diasStr), nuevaInicio.toString().substring(0, 5),
                    nuevaFin.toString().substring(0, 5), aulaFinal.isBlank() ? "Sin Aula" : aulaFinal)
            );
        }
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