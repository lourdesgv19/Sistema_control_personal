package backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "empleado_horarios")
@SQLDelete(sql = "UPDATE empleado_horarios SET activo = false, fecha_baja = NOW() WHERE id_empleado_horario = ?")
@SQLRestriction("activo = true")
public class EmpleadoHorario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_empleado_horario")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_empleado", nullable = false)
    @JsonIgnore
    private Empleado empleado;

    // 1: Lunes, 2: Martes, ..., 7: Domingo
    @Column(name = "dia_semana", nullable = false)
    private Integer diaSemana;

    @Column(name = "hora_entrada", nullable = false)
    private LocalTime horaEntrada;

    @Column(name = "hora_salida", nullable = false)
    private LocalTime horaSalida;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_materia")
    private Materia materia;

    @Column(length = 100)
    private String etiqueta; // Ej: "Turno Mañana", "Cátedra Teórica", "Comisión 1"

    @Column(length = 80)
    private String aula;

    @Column(name = "tolerancia_ingreso_min")
    private Integer toleranciaIngresoMin = 15;

    @Column(name = "tolerancia_egreso_min")
    private Integer toleranciaEgresoMin = 10;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_baja")
    private LocalDateTime fechaBaja;

    public EmpleadoHorario() {}

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Empleado getEmpleado() { return empleado; }
    public void setEmpleado(Empleado empleado) { this.empleado = empleado; }

    public Integer getDiaSemana() { return diaSemana; }
    public void setDiaSemana(Integer diaSemana) { this.diaSemana = diaSemana; }

    public LocalTime getHoraEntrada() { return horaEntrada; }
    public void setHoraEntrada(LocalTime horaEntrada) { this.horaEntrada = horaEntrada; }

    public LocalTime getHoraSalida() { return horaSalida; }
    public void setHoraSalida(LocalTime horaSalida) { this.horaSalida = horaSalida; }

    public Materia getMateria() { return materia; }
    public void setMateria(Materia materia) { this.materia = materia; }

    public String getEtiqueta() { return etiqueta; }
    public void setEtiqueta(String etiqueta) { this.etiqueta = etiqueta; }

    public String getAula() { return aula; }
    public void setAula(String aula) { this.aula = aula; }

    public Integer getToleranciaIngresoMin() { return toleranciaIngresoMin; }
    public void setToleranciaIngresoMin(Integer toleranciaIngresoMin) { this.toleranciaIngresoMin = toleranciaIngresoMin; }

    public Integer getToleranciaEgresoMin() { return toleranciaEgresoMin; }
    public void setToleranciaEgresoMin(Integer toleranciaEgresoMin) { this.toleranciaEgresoMin = toleranciaEgresoMin; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDateTime fechaBaja) { this.fechaBaja = fechaBaja; }
}