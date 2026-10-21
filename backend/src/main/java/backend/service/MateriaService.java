package backend.service;

import backend.dto.CalendarioSemanalDTO.BloqueClaseDTO;
import backend.dto.CalendarioSemanalDTO.RespuestaCalendarioDTO;
import backend.dto.GestionMateriasDTO.*;
import backend.dto.GestionMateriasDTO.ImpactoBajaMateriaDTO.HorarioAfectadoDTO;
import backend.model.Categoria;
import backend.model.Empleado;
import backend.model.EmpleadoHorario;
import backend.model.Materia;
import backend.repositories.CategoriaRepository;
import backend.repositories.EmpleadoHorarioRepository;
import backend.repositories.EmpleadoRepository;
import backend.repositories.MateriaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
public class MateriaService {

    private final MateriaRepository materiaRepo;
    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoHorarioRepository horarioRepo;
    private final CategoriaRepository categoriaRepo;
    private final CalendarioSemanalService calendarioService;
    private final AuditorHelperService auditor;

    public MateriaService(
            MateriaRepository materiaRepo,
            EmpleadoRepository empleadoRepo,
            EmpleadoHorarioRepository horarioRepo,
            CategoriaRepository categoriaRepo,
            CalendarioSemanalService calendarioService,
            AuditorHelperService auditor) {
        this.materiaRepo = materiaRepo;
        this.empleadoRepo = empleadoRepo;
        this.horarioRepo = horarioRepo;
        this.categoriaRepo = categoriaRepo;
        this.calendarioService = calendarioService;
        this.auditor = auditor;
    }

    @Transactional(readOnly = true)
    public List<Materia> listarTodas() {
        return materiaRepo.findAllOrdenados();
    }

    @Transactional(readOnly = true)
    public Materia obtenerPorId(Long id) {
        return materiaRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Cátedra no encontrada con ID: " + id));
    }

    @Transactional
    public Materia guardar(Materia m) {
        m.setActivo(true);
        m.setFechaBaja(null);
        return materiaRepo.save(m);
    }

    @Transactional
    public Materia actualizar(Long id, Materia m) {
        Materia existente = obtenerPorId(id);
        existente.setNombre(m.getNombre());
        existente.setCodigo(m.getCodigo());
        existente.setDepartamento(m.getDepartamento());
        existente.setAulaPredeterminada(m.getAulaPredeterminada());
        existente.setActivo(m.getActivo());
        if (Boolean.TRUE.equals(m.getActivo())) {
            existente.setFechaBaja(null);
        }
        return materiaRepo.save(existente);
    }

    @Transactional
    public void bajaLogica(Long id) {
        materiaRepo.deleteById(id);
    }

    @Transactional
    public void reactivar(Long id) {
        Materia m = obtenerPorId(id);
        m.setActivo(true);
        m.setFechaBaja(null);
        materiaRepo.save(m);
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

    @Transactional(readOnly = true)
    public ImpactoBajaMateriaDTO obtenerImpactoBajaMateria(Long idMateria) {
        Materia materia = obtenerPorId(idMateria);

        List<EmpleadoHorario> asignados = horarioRepo.findAll().stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .filter(h -> h.getMateria() != null && h.getMateria().getId().equals(idMateria))
                .toList();

        List<HorarioAfectadoDTO> listaAfectados = asignados.stream().map(h -> {
            String doc = (h.getEmpleado() != null) 
                ? h.getEmpleado().getApellido() + " " + h.getEmpleado().getNombre() 
                : "Sin Docente Asignado";
            String legajo = (h.getEmpleado() != null && h.getEmpleado().getNroLegajo() != null) 
                ? h.getEmpleado().getNroLegajo() 
                : "-";
            String dia = diaNumeroANombre(h.getDiaSemana());
            String ini = h.getHoraEntrada() != null ? h.getHoraEntrada().toString().substring(0, 5) : "--:--";
            String fin = h.getHoraSalida() != null ? h.getHoraSalida().toString().substring(0, 5) : "--:--";
            return new HorarioAfectadoDTO(h.getId(), dia, ini, fin, doc, legajo, h.getAula() != null ? h.getAula() : "-");
        }).toList();

        return new ImpactoBajaMateriaDTO(materia.getId(), materia.getNombre(), listaAfectados.size(), listaAfectados);
    }

    @Transactional
    public void darDeBajaMateriaEnCascada(Long idMateria) {
        Materia materia = obtenerPorId(idMateria);
        LocalDateTime ahora = LocalDateTime.now();

        materia.setActivo(false);
        materia.setFechaBaja(ahora);
        materiaRepo.save(materia);

        List<EmpleadoHorario> horariosDeMateria = horarioRepo.findAll().stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .filter(h -> h.getMateria() != null && h.getMateria().getId().equals(idMateria))
                .toList();

        for (EmpleadoHorario h : horariosDeMateria) {
            h.setActivo(false);
            h.setFechaBaja(ahora);
            horarioRepo.save(h);
        }

        auditor.registrar(
            "BAJA_MATERIA_CASCADA",
            "MATERIAS",
            String.format("Baja lógica de cátedra '%s' y desvinculación de %d horarios.", materia.getNombre(), horariosDeMateria.size())
        );
    }

    @Transactional
    public Materia registrarNuevaMateriaConHorarios(NuevaMateriaRequest req) {
        LocalTime nuevaInicio = null;
        LocalTime nuevaFin = null;

        if (req.horaInicio() != null && !req.horaInicio().isBlank() && req.horaFin() != null && !req.horaFin().isBlank()) {
            nuevaInicio = LocalTime.parse(req.horaInicio().length() == 5 ? req.horaInicio() + ":00" : req.horaInicio());
            nuevaFin = LocalTime.parse(req.horaFin().length() == 5 ? req.horaFin() + ":00" : req.horaFin());

            if (!nuevaFin.isAfter(nuevaInicio)) {
                throw new IllegalArgumentException("La hora de finalización debe ser posterior a la de inicio.");
            }
        }

        Empleado docTitular = null;
        if (req.idDocenteTitular() != null) {
            docTitular = empleadoRepo.findById(req.idDocenteTitular())
                    .orElseThrow(() -> new RuntimeException("Docente titular no encontrado con ID: " + req.idDocenteTitular()));
            garantizarCategoriaDocente(docTitular);
        }

        String aulaFinal = req.aula() != null ? req.aula().trim() : "";

        // 1. Control de solapamientos
        if (!Boolean.TRUE.equals(req.forzarGuardado()) && nuevaInicio != null && nuevaFin != null && req.diasSemana() != null) {
            List<EmpleadoHorario> todosActivos = horarioRepo.findAll().stream()
                    .filter(h -> Boolean.TRUE.equals(h.getActivo()))
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
                            if (docTitular != null && h.getEmpleado() != null && h.getEmpleado().getId().equals(docTitular.getId())) {
                                String matDoc = h.getMateria() != null ? h.getMateria().getNombre() : (h.getEtiqueta() != null ? h.getEtiqueta() : "Horario asignado");
                                throw new IllegalStateException(String.format(
                                    "SOLAPAMIENTO_DOCENTE: El docente %s ya tiene asignada la actividad '%s' el día %s de %s a %s hs.",
                                    docTitular.getApellido() + ", " + docTitular.getNombre(),
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

        // 2. Persistir Materia
        Materia materia;
        if (req.idMateria() != null) {
            materia = materiaRepo.findById(req.idMateria()).orElseGet(Materia::new);
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
        Materia guardada = materiaRepo.saveAndFlush(materia);

        // 3. Crear o actualizar los horarios normalizando los campos de periodicidad
        if (nuevaInicio != null && nuevaFin != null && req.diasSemana() != null && !req.diasSemana().isEmpty()) {
            String frecFinal = (req.tipoFrecuencia() != null && !req.tipoFrecuencia().isBlank()) 
                    ? req.tipoFrecuencia().toUpperCase() 
                    : "SEMANAL";
            int repsFinal = (req.repeticionesPeriodo() != null && req.repeticionesPeriodo() > 0) 
                    ? req.repeticionesPeriodo() 
                    : 1;
            String semAltFinal = "SEMANA_POR_MEDIO".equals(frecFinal) 
                    ? (req.semanaAlterna() != null ? req.semanaAlterna().toUpperCase() : "PAR") 
                    : null;

            if (req.idHorario() != null) {
                EmpleadoHorario hExistente = horarioRepo.findById(req.idHorario()).orElse(null);
                if (hExistente != null) {
                    hExistente.setEmpleado(docTitular);
                    hExistente.setDiaSemana(req.diasSemana().get(0));
                    hExistente.setHoraEntrada(nuevaInicio);
                    hExistente.setHoraSalida(nuevaFin);
                    hExistente.setMateria(guardada);
                    hExistente.setEtiqueta(guardada.getNombre());
                    hExistente.setAula(!aulaFinal.isBlank() ? aulaFinal : guardada.getAulaPredeterminada());
                    hExistente.setTipoFrecuencia(frecFinal);
                    hExistente.setRepeticionesPeriodo(repsFinal);
                    hExistente.setSemanaAlterna(semAltFinal);
                    hExistente.setActivo(true);
                    horarioRepo.saveAndFlush(hExistente);
                    return guardada;
                }
            }

            for (Integer dia : req.diasSemana()) {
                EmpleadoHorario nuevoH = new EmpleadoHorario();
                nuevoH.setEmpleado(docTitular);
                nuevoH.setDiaSemana(dia);
                nuevoH.setHoraEntrada(nuevaInicio);
                nuevoH.setHoraSalida(nuevaFin);
                nuevoH.setMateria(guardada);
                nuevoH.setEtiqueta(guardada.getNombre());
                nuevoH.setAula(!aulaFinal.isBlank() ? aulaFinal : guardada.getAulaPredeterminada());
                nuevoH.setToleranciaIngresoMin(docTitular != null && docTitular.getToleranciaIngresoMin() != null ? docTitular.getToleranciaIngresoMin() : 15);
                nuevoH.setToleranciaEgresoMin(docTitular != null && docTitular.getToleranciaEgresoMin() != null ? docTitular.getToleranciaEgresoMin() : 10);
                nuevoH.setTipoFrecuencia(frecFinal);
                nuevoH.setRepeticionesPeriodo(repsFinal);
                nuevoH.setSemanaAlterna(semAltFinal);
                nuevoH.setActivo(true);
                horarioRepo.saveAndFlush(nuevoH);
            }
        }

        auditor.registrar(
            "GESTION_MATERIA",
            "MATERIAS",
            String.format("Cátedra '%s' procesada con éxito (Docente: %s).", 
                guardada.getNombre(), docTitular != null ? docTitular.getApellido() + " " + docTitular.getNombre() : "Sin Docente")
        );

        return guardada;
    }

   @Transactional(readOnly = true)
    public List<MateriaCatalogoDTO> obtenerCatalogoMateriasAgrupadas() {
        // Obtenemos todas las materias sin descartar las inactivas para permitir ver las dadas de baja
        List<Materia> materias = materiaRepo.findAll().stream()
                .sorted(Comparator.comparing(Materia::getNombre, String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<EmpleadoHorario> horarios = horarioRepo.findAll().stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()) && h.getMateria() != null)
                .toList();

        List<MateriaCatalogoDTO> resultado = new ArrayList<>();

        for (Materia m : materias) {
            List<EmpleadoHorario> horariosDeMateria = horarios.stream()
                    .filter(h -> h.getMateria().getId().equals(m.getId()))
                    .sorted(Comparator.comparing((EmpleadoHorario h) -> h.getDiaSemana() != null ? h.getDiaSemana() : 1)
                            .thenComparing(h -> h.getHoraEntrada() != null ? h.getHoraEntrada() : LocalTime.MIDNIGHT))
                    .toList();

            double tarifa = m.getTarifaHoraCatedra() != null ? m.getTarifaHoraCatedra().doubleValue() : 5200.0;
            double horasTotales = 0.0;
            Set<String> diasUnicos = new LinkedHashSet<>();
            List<HorarioDesgloseDTO> desgloses = new ArrayList<>();

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

                String docNombre = "Sin Docente";
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

                desgloses.add(new HorarioDesgloseDTO(
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
                    totalClase,
                    h.getTipoFrecuencia() != null ? h.getTipoFrecuencia() : "SEMANAL",
                    h.getRepeticionesPeriodo() != null ? h.getRepeticionesPeriodo() : 1,
                    h.getSemanaAlterna()
                ));
            }

            boolean sinDocente = (docenteId == null);
            boolean esActivo = Boolean.TRUE.equals(m.getActivo());

            resultado.add(new MateriaCatalogoDTO(
                m.getId(),
                m.getNombre(),
                m.getCodigo(),
                m.getDepartamento(),
                m.getAulaPredeterminada() != null ? m.getAulaPredeterminada() : "Aula sin asignar",
                tarifa,
                horariosDeMateria.size(),
                new ArrayList<>(diasUnicos),
                Math.round(horasTotales * 10.0) / 10.0,
                docenteId,
                docenteTitular,
                null,
                null,
                sinDocente,
                esActivo,
                desgloses
            ));
        }

        return resultado;
    }

    private void garantizarCategoriaDocente(Empleado emp) {
        if (emp.getCategorias() == null) {
            emp.setCategorias(new ArrayList<>());
        }
        boolean yaEsDocente = emp.getCategorias().stream()
                .anyMatch(c -> c.getNombre() != null && c.getNombre().toLowerCase().contains("docente"));

        if (!yaEsDocente) {
            Categoria catDocente = categoriaRepo.findAll().stream()
                    .filter(c -> c.getNombre() != null && c.getNombre().toLowerCase().contains("docente"))
                    .findFirst()
                    .orElse(null);

            if (catDocente != null) {
                emp.getCategorias().add(catDocente);
                empleadoRepo.save(emp);
                auditor.registrar(
                    "ASIGNACION_CATEGORIA_DOCENTE",
                    "EMPLEADOS",
                    String.format("Se asoció la categoría DOCENTE a %s %s por asignación de cátedra.", 
                        emp.getNombre(), emp.getApellido())
                );
            }
        }
    }

    private String diaNumeroANombre(Integer dia) {
        if (dia == null) return "Día -";
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