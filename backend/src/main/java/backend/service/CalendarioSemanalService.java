package backend.service;

import backend.dto.CalendarioSemanalDTO.*;
import backend.model.Empleado;
import backend.model.EmpleadoFichaje;
import backend.model.EmpleadoHorario;
import backend.model.IncidenteAsistencia;
import backend.model.Materia;
import backend.repositories.EmpleadoFichajeRepository;
import backend.repositories.EmpleadoHorarioRepository;
import backend.repositories.EmpleadoRepository;
import backend.repositories.IncidenteAsistenciaRepository;
import backend.repositories.MateriaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CalendarioSemanalService {

    private final EmpleadoHorarioRepository horarioRepo;
    private final EmpleadoRepository empleadoRepo;
    private final MateriaRepository materiaRepo;
    private final EmpleadoFichajeRepository fichajeRepo;
    private final IncidenteAsistenciaRepository incidenteRepo;
    private final EvaluadorIncidentesService evaluadorService;

    public CalendarioSemanalService(
            EmpleadoHorarioRepository horarioRepo,
            EmpleadoRepository empleadoRepo,
            MateriaRepository materiaRepo,
            EmpleadoFichajeRepository fichajeRepo,
            IncidenteAsistenciaRepository incidenteRepo,
            EvaluadorIncidentesService evaluadorService) {
        this.horarioRepo = horarioRepo;
        this.empleadoRepo = empleadoRepo;
        this.materiaRepo = materiaRepo;
        this.fichajeRepo = fichajeRepo;
        this.incidenteRepo = incidenteRepo;
        this.evaluadorService = evaluadorService;
    }

    private static final String[] NOMBRES_DIAS = {"Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"};

    @Transactional(readOnly = true)
    public RespuestaCalendarioDTO obtenerCalendarioSemanal(
            LocalDate fechaInicio, 
            Long idDocente, 
            List<Integer> diasFiltro, 
            String busqueda) {

        LocalDate lunes = fechaInicio;
        LocalDate sabado = lunes.plusDays(5);
        LocalDate hoy = LocalDate.now();

        boolean filtrarPorDias = diasFiltro != null && !diasFiltro.isEmpty();

        // 1. Obtener materias asignadas a docentes en empleado_horarios
        List<EmpleadoHorario> todosHorarios = horarioRepo.findAll().stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .filter(h -> h.getMateria() != null)
                .filter(h -> h.getEmpleado() != null && Boolean.TRUE.equals(h.getEmpleado().getActivo()))
                .toList();

        // 2. Dropdown de docentes disponibles para el filtro
        List<DocenteFiltroDTO> docentesDisponibles = todosHorarios.stream()
                .map(EmpleadoHorario::getEmpleado)
                .distinct()
                .sorted(Comparator.comparing(Empleado::getApellido).thenComparing(Empleado::getNombre))
                .map(e -> new DocenteFiltroDTO(e.getId(), e.getApellido() + ", " + e.getNombre(), e.getNroLegajo()))
                .toList();

        // 3. Filtrar horarios de docentes según filtros
        List<EmpleadoHorario> horariosFiltrados = todosHorarios.stream()
                .filter(h -> idDocente == null || (h.getEmpleado() != null && h.getEmpleado().getId().equals(idDocente)))
                .filter(h -> !filtrarPorDias || (h.getDiaSemana() != null && diasFiltro.contains(h.getDiaSemana())))
                .filter(h -> {
                    if (busqueda == null || busqueda.isBlank()) return true;
                    String q = busqueda.trim().toLowerCase();
                    boolean matchMateria = h.getMateria().getNombre() != null && h.getMateria().getNombre().toLowerCase().contains(q);
                    boolean matchAula = (h.getAula() != null && h.getAula().toLowerCase().contains(q)) ||
                                        (h.getMateria().getAulaPredeterminada() != null && h.getMateria().getAulaPredeterminada().toLowerCase().contains(q));
                    return matchMateria || matchAula;
                })
                .toList();

        // 4. Obtener materias vacantes (con días y horas fijados en 'materias' pero sin docente)
        List<Materia> materiasVacantes = new ArrayList<>();
        if (idDocente == null) {
            Set<Long> idsMateriasConHorarioActivo = todosHorarios.stream()
                    .map(h -> h.getMateria().getId())
                    .collect(Collectors.toSet());

            materiasVacantes = materiaRepo.findAll().stream()
                    .filter(m -> Boolean.TRUE.equals(m.getActivo()))
                    .filter(m -> !idsMateriasConHorarioActivo.contains(m.getId()))
                    .filter(m -> m.getDiasSemana() != null && !m.getDiasSemana().isBlank() && m.getHoraInicio() != null && m.getHoraFin() != null)
                    .filter(m -> {
                        if (busqueda == null || busqueda.isBlank()) return true;
                        String q = busqueda.trim().toLowerCase();
                        boolean matchMateria = m.getNombre() != null && m.getNombre().toLowerCase().contains(q);
                        boolean matchAula = m.getAulaPredeterminada() != null && m.getAulaPredeterminada().toLowerCase().contains(q);
                        return matchMateria || matchAula;
                    })
                    .toList();
        }

        // 5. Obtener fichajes e incidentes de la semana
        List<EmpleadoFichaje> fichajesSemana = fichajeRepo.findAll().stream()
                .filter(f -> Boolean.TRUE.equals(f.getActivo()))
                .filter(f -> "valido".equalsIgnoreCase(f.getEstadoFichaje()))
                .filter(f -> f.getHoraFichaje() != null)
                .filter(f -> !f.getHoraFichaje().toLocalDate().isBefore(lunes) && !f.getHoraFichaje().toLocalDate().isAfter(sabado))
                .toList();

        List<IncidenteAsistencia> incidentesSemana = incidenteRepo.buscarFiltradoPaginadoRango(
                lunes, sabado, null, null, null, null, org.springframework.data.domain.Pageable.unpaged()
        ).getContent();

        // 6. Construcción por día de la semana
        List<DiaCalendarioDTO> diasResponse = new ArrayList<>();

        for (int i = 1; i <= 6; i++) {
            final int diaNum = i;
            if (filtrarPorDias && !diasFiltro.contains(diaNum)) {
                continue;
            }

            LocalDate fechaDia = lunes.plusDays(diaNum - 1);
            LocalDateTime inicioDelDia = fechaDia.atStartOfDay();
            LocalDateTime finDelDia = fechaDia.atTime(LocalTime.MAX);
            boolean esFuturo = fechaDia.isAfter(hoy);

            // A. Clases asignadas a docentes: VALIDACIÓN ESTRICTA DE VIGENCIA (fechaAlta / fechaBaja)
            List<EmpleadoHorario> horariosDia = horariosFiltrados.stream()
                    .filter(h -> h.getDiaSemana() != null && h.getDiaSemana() == diaNum)
                    .filter(h -> {
                        LocalDateTime altaH = h.getFechaAlta() != null ? h.getFechaAlta() : LocalDateTime.MIN;
                        LocalDateTime bajaH = h.getFechaBaja();
                        boolean horarioIniciado = !altaH.isAfter(finDelDia);
                        boolean horarioNoTerminado = (bajaH == null) || !bajaH.isBefore(inicioDelDia);

                        // Comprobar vigencia de la materia asociada
                        Materia mat = h.getMateria();
                        LocalDateTime altaM = (mat != null && mat.getFechaAlta() != null) ? mat.getFechaAlta() : LocalDateTime.MIN;
                        LocalDateTime bajaM = (mat != null) ? mat.getFechaBaja() : null;
                        boolean materiaIniciada = !altaM.isAfter(finDelDia);
                        boolean materiaNoTerminada = (bajaM == null) || !bajaM.isBefore(inicioDelDia);

                        return horarioIniciado && horarioNoTerminado && materiaIniciada && materiaNoTerminada;
                    })
                    .sorted(Comparator.comparing(h -> h.getHoraEntrada() != null ? h.getHoraEntrada() : LocalTime.MIDNIGHT))
                    .toList();

            List<BloqueClaseDTO> bloquesDia = new ArrayList<>();

            for (EmpleadoHorario h : horariosDia) {
                Empleado doc = h.getEmpleado();

                long minutosTeoricos = (h.getHoraEntrada() != null && h.getHoraSalida() != null)
                        ? Duration.between(h.getHoraEntrada(), h.getHoraSalida()).toMinutes()
                        : 0;
                double horasProg = Math.round((minutosTeoricos / 60.0) * 10.0) / 10.0;

                double horasEfectivas = 0.0;
                String semaforo;
                String motivoDesvio;

                if (esFuturo) {
                    semaforo = "PENDIENTE";
                    motivoDesvio = horasProg + "h prog.";
                } else {
                    List<EmpleadoFichaje> fDiaDocente = fichajesSemana.stream()
                            .filter(f -> f.getEmpleado() != null && f.getEmpleado().getId().equals(doc.getId()))
                            .filter(f -> f.getHoraFichaje().toLocalDate().equals(fechaDia))
                            .toList();

                    long minutosEfectivos = evaluadorService.calcularMinutosClaseEfectivos(List.of(h), fDiaDocente, fechaDia);
                    horasEfectivas = Math.round((minutosEfectivos / 60.0) * 10.0) / 10.0;

                    String agrupadorAusencia = "AUSENCIA_" + fechaDia + "_" + doc.getId() + "_" + h.getId();
                    
                    List<IncidenteAsistencia> incsDocenteDia = incidentesSemana.stream()
                            .filter(inc -> inc.getEmpleado() != null && inc.getEmpleado().getId().equals(doc.getId()))
                            .filter(inc -> inc.getFecha().equals(fechaDia))
                            .toList();

                    boolean tieneIncidenteAusencia = incsDocenteDia.stream()
                            .anyMatch(inc -> "AUSENCIAS".equalsIgnoreCase(inc.getCategoriaRegla()) && 
                                            (agrupadorAusencia.equals(inc.getIdEventoAgrupador()) || inc.getTipo().contains(h.getMateria().getNombre())));

                    boolean tieneSalidaEnClase = incsDocenteDia.stream()
                            .anyMatch(inc -> "SALIDAS_EN_CLASE".equalsIgnoreCase(inc.getCategoriaRegla()) || 
                                             (inc.getTipo() != null && inc.getTipo().toLowerCase().contains("salida no autorizada")));

                    boolean tieneTardanza = incsDocenteDia.stream()
                            .anyMatch(inc -> "LLEGADAS_TARDE".equalsIgnoreCase(inc.getCategoriaRegla()));

                    if (tieneIncidenteAusencia || (fDiaDocente.isEmpty() && minutosEfectivos == 0)) {
                        semaforo = "ROJO";
                        motivoDesvio = "0h / No dada";
                    } else if (tieneSalidaEnClase || tieneTardanza || minutosEfectivos < minutosTeoricos) {
                        semaforo = "AMBAR";
                        motivoDesvio = horasEfectivas + "h / " + horasProg + "h";
                    } else {
                        semaforo = "VERDE";
                        motivoDesvio = horasEfectivas + "h (100%)";
                    }
                }

                String aulaFinal = (h.getAula() != null && !h.getAula().isBlank()) 
                        ? h.getAula() 
                        : (h.getMateria().getAulaPredeterminada() != null ? h.getMateria().getAulaPredeterminada() : "Aula Sin Asignar");

                bloquesDia.add(new BloqueClaseDTO(
                        h.getId(),
                        h.getMateria().getId(),
                        h.getMateria().getNombre(),
                        aulaFinal,
                        diaNum,
                        fechaDia,
                        h.getHoraEntrada(),
                        h.getHoraSalida(),
                        horasProg,
                        horasEfectivas,
                        semaforo,
                        motivoDesvio,
                        doc.getId(),
                        doc.getNombre(),
                        doc.getApellido()
                ));
            }

            // B. Materias vacantes: VALIDACIÓN DE VIGENCIA (fechaAlta / fechaBaja)
            for (Materia mv : materiasVacantes) {
                LocalDateTime altaM = mv.getFechaAlta() != null ? mv.getFechaAlta() : LocalDateTime.MIN;
                LocalDateTime bajaM = mv.getFechaBaja();
                boolean yaIniciada = !altaM.isAfter(finDelDia);
                boolean noTerminada = (bajaM == null) || !bajaM.isBefore(inicioDelDia);

                if (!yaIniciada || !noTerminada) {
                    continue; // Se omite si la cátedra no está vigente en este día
                }

                List<Integer> diasMateria = Arrays.stream(mv.getDiasSemana().split(","))
                        .map(String::trim)
                        .map(Integer::parseInt)
                        .toList();

                if (diasMateria.contains(diaNum)) {
                    long minutosTeoricos = (mv.getHoraInicio() != null && mv.getHoraFin() != null)
                            ? Duration.between(mv.getHoraInicio(), mv.getHoraFin()).toMinutes()
                            : 0;
                    double horasProg = Math.round((minutosTeoricos / 60.0) * 10.0) / 10.0;

                    bloquesDia.add(new BloqueClaseDTO(
                            null,
                            mv.getId(),
                            mv.getNombre(),
                            mv.getAulaPredeterminada() != null ? mv.getAulaPredeterminada() : "Aula sin asignar",
                            diaNum,
                            fechaDia,
                            mv.getHoraInicio(),
                            mv.getHoraFin(),
                            horasProg,
                            0.0,
                            "PENDIENTE",
                            "Sin docente asignado",
                            null,
                            "Sin Docente",
                            "Asignado"
                    ));
                }
            }

            bloquesDia.sort(Comparator.comparing(b -> b.horaInicio() != null ? b.horaInicio() : LocalTime.MIDNIGHT));

            diasResponse.add(new DiaCalendarioDTO(
                    diaNum,
                    NOMBRES_DIAS[diaNum - 1],
                    fechaDia,
                    fechaDia.equals(hoy),
                    bloquesDia.size(),
                    bloquesDia
            ));
        }

        return new RespuestaCalendarioDTO(lunes, sabado, diasResponse, docentesDisponibles);
    }
}