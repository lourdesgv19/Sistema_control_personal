package backend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.SQLDelete;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "materias")
@SQLDelete(sql = "UPDATE materias SET activo = false, fecha_baja = NOW() WHERE id_materia = ?")
public class Materia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_materia")
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 50)
    private String codigo;

    @Column(name = "aula_predeterminada", length = 80)
    private String aulaPredeterminada;

    @Column(name = "dias_semana", length = 50)
    private String diasSemana; // Coma-separated: "1,3"

    @Column(name = "hora_inicio")
    private LocalTime horaInicio;

    @Column(name = "hora_fin")
    private LocalTime horaFin;

    @Column(name = "tipo_frecuencia", length = 30)
    private String tipoFrecuencia = "SEMANAL";

    @Column(name = "repeticiones_periodo")
    private Integer repeticionesPeriodo = 1;

    @Column(name = "semana_alterna", length = 10)
    private String semanaAlterna;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_baja")
    private LocalDateTime fechaBaja;

    public Materia() {}

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getAulaPredeterminada() { return aulaPredeterminada; }
    public void setAulaPredeterminada(String aulaPredeterminada) { this.aulaPredeterminada = aulaPredeterminada; }

    public String getDiasSemana() { return diasSemana; }
    public void setDiasSemana(String diasSemana) { this.diasSemana = diasSemana; }

    public LocalTime getHoraInicio() { return horaInicio; }
    public void setHoraInicio(LocalTime horaInicio) { this.horaInicio = horaInicio; }

    public LocalTime getHoraFin() { return horaFin; }
    public void setHoraFin(LocalTime horaFin) { this.horaFin = horaFin; }

    public String getTipoFrecuencia() { return tipoFrecuencia; }
    public void setTipoFrecuencia(String tipoFrecuencia) { this.tipoFrecuencia = tipoFrecuencia; }

    public Integer getRepeticionesPeriodo() { return repeticionesPeriodo; }
    public void setRepeticionesPeriodo(Integer repeticionesPeriodo) { this.repeticionesPeriodo = repeticionesPeriodo; }

    public String getSemanaAlterna() { return semanaAlterna; }
    public void setSemanaAlterna(String semanaAlterna) { this.semanaAlterna = semanaAlterna; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDateTime fechaBaja) { this.fechaBaja = fechaBaja; }
}