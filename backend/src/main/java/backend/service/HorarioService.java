package backend.service;

import backend.dto.EmpleadoHorarioResumenDTO;
import backend.dto.MetricasPersonalDTO;
import backend.dto.ResumenPresenciaFichajesDTO;
import backend.model.Empleado;
import backend.model.EmpleadoFichaje;
import backend.model.EmpleadoHorario;
import backend.model.Materia;
import backend.repositories.EmpleadoHorarioRepository;
import backend.repositories.EmpleadoRepository;
import backend.repositories.MateriaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.temporal.IsoFields;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
public class HorarioService {

    private final EmpleadoHorarioRepository horarioRepo;
    private final EmpleadoRepository empleadoRepo;
    private final MateriaRepository materiaRepo;
    private final AuditorHelperService auditor;

    public HorarioService(EmpleadoHorarioRepository horarioRepo,
                          EmpleadoRepository empleadoRepo,
                          MateriaRepository materiaRepo,
                          AuditorHelperService auditor) {
        this.horarioRepo = horarioRepo;
        this.empleadoRepo = empleadoRepo;
        this.materiaRepo = materiaRepo;
        this.auditor = auditor;
    }

    @Transactional(readOnly = true)
    public Page<EmpleadoHorarioResumenDTO> listarHorariosPaginados(String q, Long categoriaId, Long empleadoId, Pageable pageable) {
        Page<EmpleadoHorario> pageResult = horarioRepo.buscarHorariosPaginados(q, categoriaId, empleadoId, pageable);

        return pageResult.map(h -> new EmpleadoHorarioResumenDTO(
            h.getId(),
            h.getEmpleado().getId(),
            h.getEmpleado().getNombre(),
            h.getEmpleado().getApellido(),
            h.getEmpleado().getNroLegajo(),
            h.getEmpleado().getCargos() != null
                ? h.getEmpleado().getCargos().stream().map(c -> c.getNombre()).toList()
                : List.of(),
            h.getEmpleado().getCategorias() != null && !h.getEmpleado().getCategorias().isEmpty()
                ? h.getEmpleado().getCategorias().get(0).getNombre()
                : "General",
            h.getMateria() != null ? h.getMateria().getNombre() : null,
            h.getMateria() != null ? h.getMateria().getCodigo() : null,
            h.getAula(),
            h.getDiaSemana(),
            h.getHoraEntrada(),
            h.getHoraSalida(),
            h.getEtiqueta(),
            h.getTipoFrecuencia(),
            h.getRepeticionesPeriodo(),
            h.getSemanaAlterna(),
            h.getActivo()
        ));
    }

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
                                                         String tipoFrecuencia,
                                                         Integer repeticionesPeriodo,
                                                         String semanaAlterna,
                                                         Boolean forzarGuardado) {
        Empleado emp = empleadoRepo.findById(empleadoId)
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado con ID: " + empleadoId));

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
            nuevo.setTipoFrecuencia(tipoFrecuencia != null ? tipoFrecuencia : "SEMANAL");
            nuevo.setRepeticionesPeriodo(repeticionesPeriodo != null ? repeticionesPeriodo : 1);
            nuevo.setSemanaAlterna(semanaAlterna != null && !semanaAlterna.isBlank() ? semanaAlterna.toUpperCase() : null);

            creados.add(horarioRepo.save(nuevo));
            nombresDias.add(diaNumeroANombre(dia));
        }

        String tipoFranja = mat != null ? "Cátedra: " + mat.getNombre() : (etiqueta != null ? etiqueta : "Turno");
        String detalleDias = String.join(", ", nombresDias);
        String franjaHoras = nuevaEntrada.toString().substring(0, 5) + " a " + nuevaSalida.toString().substring(0, 5) + " hs";
        String avisoForzado = Boolean.TRUE.equals(forzarGuardado) ? " [Asignación con solapamiento forzado]" : "";

        auditor.registrar(
            "ASIGNAR_HORARIO_EMPLEADO",
            "HORARIOS",
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
            "HORARIOS",
            "Baja de franja horaria (" + detalleFranja + infoExtra + ") del colaborador: " +
            emp.getNombre() + " " + emp.getApellido() + " (Legajo: " + emp.getNroLegajo() + ")"
        );
    }

    @Transactional(readOnly = true)
    public MetricasPersonalDTO calcularMetricas(Long empleadoId) {
        Empleado emp = empleadoRepo.findById(empleadoId)
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado con ID: " + empleadoId));

        // 1. Filtrar únicamente las franjas activas en la BD
        List<EmpleadoHorario> franjas = horarioRepo.findByEmpleadoId(empleadoId).stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .toList();

        double totalHorasSemana = 0.0;
        Set<String> diasSet = new LinkedHashSet<>();
        boolean tieneMaterias = false;
        boolean tieneSemanaPorMedio = false;
        boolean tieneMensual = false;
        boolean tieneAnual = false;
        int repeticionesMensuales = 0;
        String etiquetaDetectada = null;

        for (EmpleadoHorario f : franjas) {
            String diaNombre = diaNumeroANombre(f.getDiaSemana());
            diasSet.add(diaNombre);

            if (f.getMateria() != null) {
                tieneMaterias = true;
            }

            // Capturar la etiqueta o nombre del turno asignado
            if (f.getEtiqueta() != null && !f.getEtiqueta().isBlank() && etiquetaDetectada == null) {
                etiquetaDetectada = f.getEtiqueta().trim();
            }

            String frec = f.getTipoFrecuencia() != null ? f.getTipoFrecuencia().toUpperCase() : "SEMANAL";
            int reps = (f.getRepeticionesPeriodo() != null && f.getRepeticionesPeriodo() > 0)
                       ? f.getRepeticionesPeriodo() : 1;

            if ("SEMANA_POR_MEDIO".equals(frec)) tieneSemanaPorMedio = true;
            if ("MENSUAL".equals(frec)) {
                tieneMensual = true;
                repeticionesMensuales = Math.max(repeticionesMensuales, reps);
            }
            if ("ANUAL".equals(frec)) tieneAnual = true;

            if (f.getHoraEntrada() != null && f.getHoraSalida() != null) {
                long minutos = Duration.between(f.getHoraEntrada(), f.getHoraSalida()).toMinutes();
                if (minutos > 0) {
                    double horasBase = minutos / 60.0;
                    switch (frec) {
                        case "SEMANA_POR_MEDIO" -> totalHorasSemana += (horasBase * 0.5);
                        case "MENSUAL"          -> totalHorasSemana += (horasBase * reps) / 4.33;
                        case "ANUAL"            -> totalHorasSemana += (horasBase * reps) / 52.0;
                        default                 -> totalHorasSemana += horasBase;
                    }
                }
            }
        }

        String regimenDesc;
        String regimenSub;

        if (franjas.isEmpty()) {
            regimenDesc = "Sin Horario Asignado";
            regimenSub = "Pendiente de configuración";
        } else if (tieneMaterias) {
            regimenDesc = "Por Cátedra";
            regimenSub = franjas.size() + " bloques semanales";
        } else if (etiquetaDetectada != null) {
            regimenDesc = etiquetaDetectada;
            regimenSub = franjas.size() + " días asignados";
        } else if (tieneMensual) {
            regimenDesc = "Esquema Mensual";
            regimenSub = repeticionesMensuales + " jornada(s) requerida(s) al mes";
        } else if (tieneSemanaPorMedio) {
            regimenDesc = "Semana de por Medio";
            regimenSub = "Rotación quincenal alternada";
        } else if (tieneAnual) {
            regimenDesc = "Esquema Anual";
            regimenSub = "Jornadas fijadas al año";
        } else {
            regimenDesc = "Personalizado";
            regimenSub = franjas.size() + " bloques semanales";
        }

        return new MetricasPersonalDTO(
                Math.round(totalHorasSemana * 10.0) / 10.0,
                diasSet.size(),
                formatearTextoDias(diasSet),
                regimenDesc,
                regimenSub,
                emp.getToleranciaIngresoMin() != null ? emp.getToleranciaIngresoMin() : 15,
                emp.getToleranciaEgresoMin() != null ? emp.getToleranciaEgresoMin() : 10,
                emp.getTiempoMaxFueraMin() != null ? emp.getTiempoMaxFueraMin() : 45,
                emp.getMaxSalidasIntermedias() != null ? emp.getMaxSalidasIntermedias() : 2,
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

    // CALCULO DE HORAS QUE DEBERÍA CUMPLIR EL EMPLEADO SEGÚN SU HORARIO ASIGNADO
    /**
     * 1. CÁLCULO PARA UN DÍA ESPECÍFICO
     * Evalúa las horas planificadas considerando el día de la semana y si aplica
     * por semana par/impar en casos de rotación quincenal.
     */
    @Transactional(readOnly = true)
    public double calcularHorasTeoricasDia(Long empleadoId, LocalDate fecha) {
        if (fecha == null || empleadoId == null) return 0.0;

        List<EmpleadoHorario> franjas = horarioRepo.findByEmpleadoId(empleadoId).stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .toList();

        int diaSemana = fecha.getDayOfWeek().getValue(); // 1 = Lunes ... 7 = Domingo
        int numeroSemana = fecha.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        boolean esSemanaPar = (numeroSemana % 2 == 0);

        double minutosTotales = 0.0;

        for (EmpleadoHorario h : franjas) {
            if (h.getDiaSemana() != null && h.getDiaSemana() == diaSemana) {
                String frec = h.getTipoFrecuencia() != null ? h.getTipoFrecuencia().toUpperCase() : "SEMANAL";

                // Verificación de semana par / impar en rotaciones quincenales
                if ("SEMANA_POR_MEDIO".equals(frec)) {
                    String alterna = h.getSemanaAlterna() != null ? h.getSemanaAlterna().toUpperCase() : "PAR";
                    if ("PAR".equals(alterna) && !esSemanaPar) continue;
                    if ("IMPAR".equals(alterna) && esSemanaPar) continue;
                }

                if (h.getHoraEntrada() != null && h.getHoraSalida() != null) {
                    long duracion = Duration.between(h.getHoraEntrada(), h.getHoraSalida()).toMinutes();
                    if (duracion > 0) {
                        minutosTotales += duracion;
                    }
                }
            }
        }

        return redondear(minutosTotales / 60.0);
    }

    /**
     * 2. CÁLCULO SEMANAL
     * Retorna la carga horaria semanal teórica contractual o ponderada del colaborador.
     */
    @Transactional(readOnly = true)
    public double calcularHorasTeoricasSemanal(Long empleadoId) {
        if (empleadoId == null) return 0.0;

        List<EmpleadoHorario> franjas = horarioRepo.findByEmpleadoId(empleadoId).stream()
                .filter(h -> Boolean.TRUE.equals(h.getActivo()))
                .toList();

        double totalHoras = 0.0;

        for (EmpleadoHorario h : franjas) {
            if (h.getHoraEntrada() != null && h.getHoraSalida() != null) {
                long minutos = Duration.between(h.getHoraEntrada(), h.getHoraSalida()).toMinutes();
                if (minutos > 0) {
                    double horasBase = minutos / 60.0;
                    String frec = h.getTipoFrecuencia() != null ? h.getTipoFrecuencia().toUpperCase() : "SEMANAL";
                    int reps = (h.getRepeticionesPeriodo() != null && h.getRepeticionesPeriodo() > 0)
                            ? h.getRepeticionesPeriodo() : 1;

                    switch (frec) {
                        case "SEMANA_POR_MEDIO" -> totalHoras += (horasBase * 0.5);
                        case "MENSUAL"          -> totalHoras += (horasBase * reps) / 4.33; // Ponderación de 4.33 semanas/mes
                        case "ANUAL"            -> totalHoras += (horasBase * reps) / 52.0; // Ponderación de 52 semanas/año
                        default                 -> totalHoras += horasBase;
                    }
                }
            }
        }

        return redondear(totalHoras);
    }

    /**
     * 3. CÁLCULO MENSUAL
     * Calcula la suma exacta de horas planificadas para todos los días del mes y año indicados.
     */
    @Transactional(readOnly = true)
    public double calcularHorasTeoricasMensual(Long empleadoId, int anio, int mes) {
        LocalDate inicioMes = LocalDate.of(anio, mes, 1);
        LocalDate finMes = inicioMes.withDayOfMonth(inicioMes.lengthOfMonth());
        return calcularHorasTeoricasRango(empleadoId, inicioMes, finMes);
    }

    /**
     * 4. CÁLCULO PARA UN RANGO DE FECHAS (Desde - Hasta)
     * Itera día por día en el período acumulando las horas exactas según el calendario.
     */
    @Transactional(readOnly = true)
    public double calcularHorasTeoricasRango(Long empleadoId, LocalDate desde, LocalDate hasta) {
        if (empleadoId == null || desde == null || hasta == null) return 0.0;
        if (hasta.isBefore(desde)) return 0.0;

        double acumuladorHoras = 0.0;
        LocalDate fechaActual = desde;

        while (!fechaActual.isAfter(hasta)) {
            acumuladorHoras += calcularHorasTeoricasDia(empleadoId, fechaActual);
            fechaActual = fechaActual.plusDays(1);
        }

        return redondear(acumuladorHoras);
    }

    private double redondear(double valor) {
        return Math.round(valor * 100.0) / 100.0;
    }
}