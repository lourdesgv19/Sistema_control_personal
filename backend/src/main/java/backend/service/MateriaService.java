package backend.service;

import backend.dto.CalendarioSemanalDTO.BloqueClaseDTO;
import backend.dto.CalendarioSemanalDTO.RespuestaCalendarioDTO;
import backend.dto.GestionMateriasDTO.*;
import backend.dto.GestionMateriasDTO.ImpactoBajaMateriaDTO.HorarioAfectadoDTO;
import backend.model.*;
import backend.repositories.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MateriaService {

    private final MateriaRepository materiaRepo;
    private final EmpleadoRepository empleadoRepo;
    private final EmpleadoHorarioRepository horarioRepo;
    private final CategoriaRepository categoriaRepo;
    private final MateriaDocenteRepository materiaDocenteRepo;
    private final CalendarioSemanalService calendarioService;
    private final AuditorHelperService auditor;

    public MateriaService(
            MateriaRepository materiaRepo,
            EmpleadoRepository empleadoRepo,
            EmpleadoHorarioRepository horarioRepo,
            CategoriaRepository categoriaRepo,
            MateriaDocenteRepository materiaDocenteRepo,
            CalendarioSemanalService calendarioService,
            AuditorHelperService auditor) {
        this.materiaRepo = materiaRepo;
        this.empleadoRepo = empleadoRepo;
        this.horarioRepo = horarioRepo;
        this.categoriaRepo = categoriaRepo;
        this.materiaDocenteRepo = materiaDocenteRepo;
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
        if (m.getFechaAlta() == null) {
            m.setFechaAlta(LocalDateTime.now());
        }
        return materiaRepo.save(m);
    }

    @Transactional
    public Materia actualizar(Long id, Materia m) {
        Materia existente = obtenerPorId(id);
        existente.setNombre(m.getNombre());
        existente.setCodigo(m.getCodigo());
        existente.setAulaPredeterminada(m.getAulaPredeterminada());
        existente.setDiasSemana(m.getDiasSemana());
        existente.setHoraInicio(m.getHoraInicio());
        existente.setHoraFin(m.getHoraFin());
        existente.setTipoFrecuencia(m.getTipoFrecuencia());
        existente.setRepeticionesPeriodo(m.getRepeticionesPeriodo());
        existente.setSemanaAlterna(m.getSemanaAlterna());
        existente.setObservaciones(m.getObservaciones());
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

    @Transactional
    public void desvincularDocenteDeMateria(Long idMateria) {
        Materia materia = obtenerPorId(idMateria);
        LocalDateTime ahora = LocalDateTime.now();

        materiaDocenteRepo.findByMateriaActiva(idMateria).ifPresent(md -> {
            md.setActivo(false);
            md.setFechaBaja(ahora);
            materiaDocenteRepo.save(md);
        });

        List<EmpleadoHorario> asignados = horarioRepo.findAll().stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .filter(h -> h.getMateria() != null && h.getMateria().getId().equals(idMateria))
                .toList();

        for (EmpleadoHorario h : asignados) {
            h.setActivo(false);
            h.setFechaBaja(ahora);
            horarioRepo.save(h);
        }

        auditor.registrar(
            "DESVINCULAR_DOCENTE_MATERIA",
            "MATERIAS",
            String.format("Docente desvinculado de la materia '%s'. Cátedra preservada como vacante.", materia.getNombre())
        );
    }

    @Transactional
    public void desvincularHorarioComision(Long idMateria, Long idHorario, Integer diaSemana) {
        LocalDateTime ahora = LocalDateTime.now();

        if (idHorario != null) {
            EmpleadoHorario h = horarioRepo.findById(idHorario).orElse(null);
            if (h != null) {
                h.setActivo(false);
                h.setFechaBaja(ahora);
                horarioRepo.save(h);
            }
        }

        List<EmpleadoHorario> restantes = horarioRepo.findAll().stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .filter(h -> h.getMateria() != null && h.getMateria().getId().equals(idMateria))
                .toList();

        if (restantes.isEmpty()) {
            materiaDocenteRepo.findByMateriaActiva(idMateria).ifPresent(md -> {
                md.setActivo(false);
                md.setFechaBaja(ahora);
                materiaDocenteRepo.save(md);
            });
        }

        Materia m = materiaRepo.findById(idMateria).orElse(null);
        if (m != null && m.getDiasSemana() != null && diaSemana != null) {
            List<String> dias = new ArrayList<>(Arrays.asList(m.getDiasSemana().split(",")));
            dias.remove(String.valueOf(diaSemana));
            m.setDiasSemana(dias.isEmpty() ? null : String.join(",", dias));
            materiaRepo.save(m);
        }
    }

    @Transactional(readOnly = true)
    public ResumenMetricas obtenerResumenSemanal(LocalDate fechaInicio, LocalDate fechaFin) {
        RespuestaCalendarioDTO calendario = calendarioService.obtenerCalendarioSemanal(fechaInicio, null, null, null);

        double horasDictadas = 0.0;
        double horasFijadas = 0.0;
        long completas = 0;
        long desvios = 0;
        long faltas = 0;

        for (var dia : calendario.dias()) {
            for (BloqueClaseDTO clase : dia.clases()) {
                horasFijadas += clase.horasProgramadas();
                horasDictadas += clase.horasEfectivas();

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
            faltas
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

        materiaDocenteRepo.findByMateriaActiva(idMateria).ifPresent(md -> {
            md.setActivo(false);
            md.setFechaBaja(ahora);
            materiaDocenteRepo.save(md);
        });

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

        Empleado docAuxiliar = null;
        if (req.idDocenteAuxiliar() != null) {
            docAuxiliar = empleadoRepo.findById(req.idDocenteAuxiliar())
                    .orElseThrow(() -> new RuntimeException("Docente auxiliar no encontrado con ID: " + req.idDocenteAuxiliar()));
            garantizarCategoriaDocente(docAuxiliar);
        }

        String aulaFinal = req.aula() != null ? req.aula().trim() : "";

        // 1. Control de solapamientos (docente y aula)
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

                            if (docTitular != null && h.getEmpleado() != null && h.getEmpleado().getId().equals(docTitular.getId())) {
                                String matDoc = h.getMateria() != null ? h.getMateria().getNombre() : (h.getEtiqueta() != null ? h.getEtiqueta() : "Horario asignado");
                                throw new IllegalStateException(String.format(
                                    "SOLAPAMIENTO_DOCENTE: El docente %s ya tiene asignada la actividad '%s' el día %s de %s a %s hs.",
                                    docTitular.getApellido() + ", " + docTitular.getNombre(),
                                    matDoc, nombreDia,
                                    exInicio.toString().substring(0, 5), exFin.toString().substring(0, 5)
                                ));
                            }

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
        materia.setAulaPredeterminada(!aulaFinal.isBlank() ? aulaFinal : null);
        if (req.observaciones() != null) materia.setObservaciones(req.observaciones());

        if (req.diasSemana() != null && !req.diasSemana().isEmpty()) {
            materia.setDiasSemana(req.diasSemana().stream().map(String::valueOf).collect(Collectors.joining(",")));
        }
        materia.setHoraInicio(nuevaInicio);
        materia.setHoraFin(nuevaFin);
        materia.setTipoFrecuencia(req.tipoFrecuencia() != null ? req.tipoFrecuencia() : "SEMANAL");
        materia.setRepeticionesPeriodo(req.repeticionesPeriodo() != null ? req.repeticionesPeriodo() : 1);
        materia.setSemanaAlterna(req.semanaAlterna());
        materia.setActivo(true);

        LocalDate fDesde = req.fechaDesde() != null ? req.fechaDesde() : LocalDate.now();
        LocalDateTime fechaAltaFinal = fDesde.atStartOfDay();

        if (materia.getId() == null || materia.getFechaAlta() == null) {
            materia.setFechaAlta(fechaAltaFinal);
        }

        Materia guardada = materiaRepo.saveAndFlush(materia);

        // 3. Vincular relación en materia_docentes
        Optional<MateriaDocente> vinculoActivoOpt = materiaDocenteRepo.findByMateriaActiva(guardada.getId());
        LocalDateTime fechaCambio = fechaAltaFinal;

        if (docTitular != null) {
            MateriaDocente vinculo = vinculoActivoOpt.orElseGet(MateriaDocente::new);
            vinculo.setMateria(guardada);
            vinculo.setDocenteTitular(docTitular);
            vinculo.setDocenteAuxiliar(docAuxiliar);
            vinculo.setRolTitular(req.rolTitular() != null ? req.rolTitular() : "TITULAR");
            vinculo.setRolAuxiliar(req.rolAuxiliar() != null ? req.rolAuxiliar() : "AUXILIAR");
            vinculo.setActivo(true);
            materiaDocenteRepo.save(vinculo);
        } else if (vinculoActivoOpt.isPresent()) {
            MateriaDocente vinculo = vinculoActivoOpt.get();
            vinculo.setActivo(false);
            vinculo.setFechaBaja(fechaCambio);
            materiaDocenteRepo.save(vinculo);
        }

        // 4. Gestión histórica en empleado_horarios
        List<EmpleadoHorario> horariosExistentes = horarioRepo.findAll().stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .filter(h -> h.getMateria() != null && h.getMateria().getId().equals(guardada.getId()))
                .toList();

        Long idDocenteAnterior = horariosExistentes.isEmpty() ? null : horariosExistentes.get(0).getEmpleado().getId();
        Long idDocenteNuevo = docTitular != null ? docTitular.getId() : null;

        if (!Objects.equals(idDocenteAnterior, idDocenteNuevo)) {
            for (EmpleadoHorario hViejo : horariosExistentes) {
                hViejo.setActivo(false);
                hViejo.setFechaBaja(fechaCambio);
                horarioRepo.saveAndFlush(hViejo);
            }

            if (docTitular != null && nuevaInicio != null && nuevaFin != null && req.diasSemana() != null) {
                for (Integer dia : req.diasSemana()) {
                    EmpleadoHorario nuevoH = new EmpleadoHorario();
                    nuevoH.setEmpleado(docTitular);
                    nuevoH.setDiaSemana(dia);
                    nuevoH.setHoraEntrada(nuevaInicio);
                    nuevoH.setHoraSalida(nuevaFin);
                    nuevoH.setMateria(guardada);
                    nuevoH.setEtiqueta(guardada.getNombre());
                    nuevoH.setAula(!aulaFinal.isBlank() ? aulaFinal : guardada.getAulaPredeterminada());
                    nuevoH.setToleranciaIngresoMin(docTitular.getToleranciaIngresoMin() != null ? docTitular.getToleranciaIngresoMin() : 15);
                    nuevoH.setToleranciaEgresoMin(docTitular.getToleranciaEgresoMin() != null ? docTitular.getToleranciaEgresoMin() : 10);
                    nuevoH.setTipoFrecuencia(guardada.getTipoFrecuencia());
                    nuevoH.setRepeticionesPeriodo(guardada.getRepeticionesPeriodo());
                    nuevoH.setSemanaAlterna(guardada.getSemanaAlterna());
                    nuevoH.setActivo(true);
                    nuevoH.setFechaAlta(fechaAltaFinal);
                    nuevoH.setFechaBaja(null);
                    horarioRepo.saveAndFlush(nuevoH);
                }
            }
        } else if (docTitular != null && req.idHorario() != null) {
            EmpleadoHorario hExistente = horarioRepo.findById(req.idHorario()).orElse(null);
            if (hExistente != null) {
                hExistente.setDiaSemana(req.diasSemana().get(0));
                hExistente.setHoraEntrada(nuevaInicio);
                hExistente.setHoraSalida(nuevaFin);
                hExistente.setAula(!aulaFinal.isBlank() ? aulaFinal : guardada.getAulaPredeterminada());
                hExistente.setTipoFrecuencia(guardada.getTipoFrecuencia());
                hExistente.setRepeticionesPeriodo(guardada.getRepeticionesPeriodo());
                hExistente.setSemanaAlterna(guardada.getSemanaAlterna());
                if (req.fechaDesde() != null) {
                    hExistente.setFechaAlta(fechaAltaFinal);
                }
                horarioRepo.saveAndFlush(hExistente);
            }
        }

        auditor.registrar(
            "GESTION_MATERIA",
            "MATERIAS",
            String.format("Cátedra '%s' procesada (Titular: %s).", 
                guardada.getNombre(),
                docTitular != null ? docTitular.getApellido() + " " + docTitular.getNombre() : "Sin Docente Asignado")
        );

        return guardada;
    }

    @Transactional(readOnly = true)
    public Page<MateriaCatalogoDTO> obtenerCatalogoMateriasPaginado(String q, String estado, Long docenteId, int page, int size) {
        Boolean activo = null;
        if ("ACTIVOS".equalsIgnoreCase(estado)) {
            activo = true;
        } else if ("INACTIVOS".equalsIgnoreCase(estado)) {
            activo = false;
        }

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        String query = (q != null) ? q.trim() : "";

        Page<Materia> pagina = materiaRepo.buscarPaginado(query, activo, pageable);
        return pagina.map(this::convertirAMateriaCatalogoDTO);
    }

    @Transactional(readOnly = true)
    public List<MateriaCatalogoDTO> obtenerCatalogoMateriasAgrupadas() {
        return materiaRepo.findAll().stream()
                .sorted(Comparator.comparing(Materia::getNombre, String.CASE_INSENSITIVE_ORDER))
                .map(this::convertirAMateriaCatalogoDTO)
                .toList();
    }

    public MateriaCatalogoDTO convertirAMateriaCatalogoDTO(Materia m) {
        List<EmpleadoHorario> horariosDeMateria = horarioRepo.findAll().stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()) && h.getMateria() != null && h.getMateria().getId().equals(m.getId()))
                .sorted(Comparator.comparing((EmpleadoHorario h) -> h.getDiaSemana() != null ? h.getDiaSemana() : 1)
                        .thenComparing(h -> h.getHoraEntrada() != null ? h.getHoraEntrada() : LocalTime.MIDNIGHT))
                .toList();

        double horasTotales = 0.0;
        Set<String> diasUnicos = new LinkedHashSet<>();
        List<HorarioDesgloseDTO> desgloses = new ArrayList<>();

        Optional<MateriaDocente> vinculoOpt = materiaDocenteRepo.findByMateriaActiva(m.getId());

        Long titularId = null;
        String titularNombre = "Sin docente asignado";
        Long auxiliarId = null;
        String auxiliarNombre = null;

        Optional<EmpleadoHorario> horarioConDocente = horariosDeMateria.stream()
                .filter(h -> h.getEmpleado() != null)
                .findFirst();

        if (horarioConDocente.isPresent()) {
            Empleado doc = horarioConDocente.get().getEmpleado();
            titularId = doc.getId();
            titularNombre = doc.getApellido() + " " + doc.getNombre();
        } else if (vinculoOpt.isPresent() && Boolean.TRUE.equals(vinculoOpt.get().getActivo()) && horariosDeMateria.isEmpty()) {
            MateriaDocente vinculo = vinculoOpt.get();
            if (vinculo.getDocenteTitular() != null) {
                titularId = vinculo.getDocenteTitular().getId();
                titularNombre = vinculo.getDocenteTitular().getApellido() + " " + vinculo.getDocenteTitular().getNombre();
            }
        }

        if (vinculoOpt.isPresent() && Boolean.TRUE.equals(vinculoOpt.get().getActivo())) {
            if (vinculoOpt.get().getDocenteAuxiliar() != null) {
                auxiliarId = vinculoOpt.get().getDocenteAuxiliar().getId();
                auxiliarNombre = vinculoOpt.get().getDocenteAuxiliar().getApellido() + " " + vinculoOpt.get().getDocenteAuxiliar().getNombre();
            }
        }

        if (!horariosDeMateria.isEmpty()) {
            for (EmpleadoHorario h : horariosDeMateria) {
                int diaNum = h.getDiaSemana() != null ? h.getDiaSemana() : 1;
                String diaNombre = diaNumeroANombre(diaNum);
                diasUnicos.add(diaNombre.substring(0, 3));

                long minutos = (h.getHoraEntrada() != null && h.getHoraSalida() != null)
                        ? Duration.between(h.getHoraEntrada(), h.getHoraSalida()).toMinutes()
                        : 0;
                double horasClase = Math.round((minutos / 60.0) * 10.0) / 10.0;
                horasTotales += horasClase;

                String turno = (h.getHoraEntrada() != null && h.getHoraEntrada().isBefore(LocalTime.of(13, 0)))
                        ? "Turno Mañana" : "Turno Tarde";

                String docNombre = h.getEmpleado() != null 
                    ? h.getEmpleado().getApellido() + " " + h.getEmpleado().getNombre() 
                    : "Sin Docente";
                String docLegajo = (h.getEmpleado() != null && h.getEmpleado().getNroLegajo() != null) 
                    ? h.getEmpleado().getNroLegajo() 
                    : "-";

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
                    h.getTipoFrecuencia() != null ? h.getTipoFrecuencia() : "SEMANAL",
                    h.getRepeticionesPeriodo() != null ? h.getRepeticionesPeriodo() : 1,
                    h.getSemanaAlterna()
                ));
            }
        } else if (m.getDiasSemana() != null && !m.getDiasSemana().isBlank() && m.getHoraInicio() != null && m.getHoraFin() != null) {
            String[] diasStr = m.getDiasSemana().split(",");
            long minutos = Duration.between(m.getHoraInicio(), m.getHoraFin()).toMinutes();
            double horasClase = Math.round((minutos / 60.0) * 10.0) / 10.0;

            for (String d : diasStr) {
                try {
                    int diaNum = Integer.parseInt(d.trim());
                    String diaNombre = diaNumeroANombre(diaNum);
                    diasUnicos.add(diaNombre.substring(0, 3));
                    horasTotales += horasClase;

                    String turno = m.getHoraInicio().isBefore(LocalTime.of(13, 0)) ? "Turno Mañana" : "Turno Tarde";

                    desgloses.add(new HorarioDesgloseDTO(
                        null,
                        diaNum,
                        diaNombre,
                        m.getHoraInicio().toString().substring(0, 5),
                        m.getHoraFin().toString().substring(0, 5),
                        horasClase,
                        turno,
                        m.getAulaPredeterminada() != null ? m.getAulaPredeterminada() : "-",
                        null,
                        "Sin Docente Asignado",
                        "-",
                        m.getTipoFrecuencia() != null ? m.getTipoFrecuencia() : "SEMANAL",
                        m.getRepeticionesPeriodo() != null ? m.getRepeticionesPeriodo() : 1,
                        m.getSemanaAlterna()
                    ));
                } catch (NumberFormatException ignored) {}
            }
        }

        boolean sinDocente = (titularId == null);
        boolean esActivo = Boolean.TRUE.equals(m.getActivo());

        return new MateriaCatalogoDTO(
            m.getId(),
            m.getNombre(),
            m.getCodigo(),
            m.getAulaPredeterminada() != null ? m.getAulaPredeterminada() : "Aula sin asignar",
            desgloses.size(),
            new ArrayList<>(diasUnicos),
            Math.round(horasTotales * 10.0) / 10.0,
            titularId,
            titularNombre,
            auxiliarId,
            auxiliarNombre,
            sinDocente,
            esActivo,
            desgloses
        );
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