package backend.service;

import backend.dto.CalendarioSemanalDTO.*;
import backend.model.Empleado;
import backend.model.EmpleadoFichaje;
import backend.model.EmpleadoHorario;
import backend.model.IncidenteAsistencia;
import backend.repositories.EmpleadoFichajeRepository;
import backend.repositories.EmpleadoHorarioRepository;
import backend.repositories.EmpleadoRepository;
import backend.repositories.IncidenteAsistenciaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CalendarioSemanalService {

    private final EmpleadoHorarioRepository horarioRepo;
    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoFichajeRepository fichajeRepo;
    private final IncidenteAsistenciaRepository incidenteRepo;
    private final EvaluadorIncidentesService evaluadorService;

    public CalendarioSemanalService(
            EmpleadoHorarioRepository horarioRepo,
            EmpleadoRepository empleadoRepo,
            EmpleadoFichajeRepository fichajeRepo,
            IncidenteAsistenciaRepository incidenteRepo,
            EvaluadorIncidentesService evaluadorService) {
        this.horarioRepo = horarioRepo;
        this.empleadoRepo = empleadoRepo;
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

    // Si la lista de días es nula o vacía, mostramos todos los días (1 al 6)
    boolean filtrarPorDias = diasFiltro != null && !diasFiltro.isEmpty();

    // 1. Obtener todos los horarios de materias activas
    List<EmpleadoHorario> todosHorarios = horarioRepo.findAll().stream()
            .filter(h -> Boolean.TRUE.equals(h.getActivo()))
            .filter(h -> h.getMateria() != null)
            .filter(h -> h.getEmpleado() != null && Boolean.TRUE.equals(h.getEmpleado().getActivo()))
            .toList();

    // 2. Dropdown de docentes disponibles
    List<DocenteFiltroDTO> docentesDisponibles = todosHorarios.stream()
            .map(EmpleadoHorario::getEmpleado)
            .distinct()
            .sorted(Comparator.comparing(Empleado::getApellido).thenComparing(Empleado::getNombre))
            .map(e -> new DocenteFiltroDTO(e.getId(), e.getApellido() + ", " + e.getNombre(), e.getNroLegajo()))
            .toList();

    // 3. Filtrar horarios
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

    // 4. Fichajes e incidentes del rango
    List<EmpleadoFichaje> fichajesSemana = fichajeRepo.findAll().stream()
            .filter(f -> Boolean.TRUE.equals(f.getActivo()))
            .filter(f -> "valido".equalsIgnoreCase(f.getEstadoFichaje()))
            .filter(f -> f.getHoraFichaje() != null)
            .filter(f -> !f.getHoraFichaje().toLocalDate().isBefore(lunes) && !f.getHoraFichaje().toLocalDate().isAfter(sabado))
            .toList();

    List<IncidenteAsistencia> incidentesSemana = incidenteRepo.buscarFiltradoPaginadoRango(
            lunes, sabado, null, null, null, null, org.springframework.data.domain.Pageable.unpaged()
    ).getContent();

    // 5. Construcción de los días que corresponden mostrar
    List<DiaCalendarioDTO> diasResponse = new ArrayList<>();

    for (int i = 1; i <= 6; i++) {
        final int diaNum = i;
        if (filtrarPorDias && !diasFiltro.contains(diaNum)) {
            continue; // Si el día no está entre los seleccionados, no se incluye en la respuesta
        }

        LocalDate fechaDia = lunes.plusDays(diaNum - 1);
        boolean esFuturo = fechaDia.isAfter(hoy);

        List<EmpleadoHorario> horariosDia = horariosFiltrados.stream()
                .filter(h -> h.getDiaSemana() != null && h.getDiaSemana() == diaNum)
                .sorted(Comparator.comparing(h -> h.getHoraEntrada() != null ? h.getHoraEntrada() : LocalTime.MIDNIGHT))
                .toList();

        List<BloqueClaseDTO> bloquesDia = new ArrayList<>();

        for (EmpleadoHorario h : horariosDia) {
            Empleado doc = h.getEmpleado();
            double tarifaHora = (h.getMateria().getTarifaHoraCatedra() != null) 
                    ? h.getMateria().getTarifaHoraCatedra().doubleValue() 
                    : 5200.0;

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

                List<IncidenteAsistencia> incsDocenteDia = incidentesSemana.stream()
                        .filter(inc -> inc.getEmpleado() != null && inc.getEmpleado().getId().equals(doc.getId()))
                        .filter(inc -> inc.getFecha().equals(fechaDia))
                        .toList();

                boolean tieneSalidaEnClase = incsDocenteDia.stream()
                        .anyMatch(inc -> "SALIDAS_EN_CLASE".equalsIgnoreCase(inc.getCategoriaRegla()) || 
                                         (inc.getTipo() != null && inc.getTipo().toLowerCase().contains("salida no autorizada")));

                boolean tieneTardanza = incsDocenteDia.stream()
                        .anyMatch(inc -> "LLEGADAS_TARDE".equalsIgnoreCase(inc.getCategoriaRegla()));

                if (fDiaDocente.isEmpty() || minutosEfectivos == 0) {
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

            double monto = Math.round(horasEfectivas * tarifaHora);
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
                    doc.getApellido(),
                    tarifaHora,
                    monto
            ));
        }

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
}}