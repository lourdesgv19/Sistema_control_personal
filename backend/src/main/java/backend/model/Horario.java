package backend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import org.hibernate.annotations.SQLDelete;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "config_horarios")
@SQLDelete(sql = "UPDATE config_horarios SET activo = false, fecha_baja = NOW() WHERE id_horario = ?")
public class Horario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_horario")
    private Long id;

    @Column(nullable = false, length = 120)
    private String nombre;

    @NotFound(action = NotFoundAction.IGNORE)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_categoria", nullable = false)
    private Categoria categoria;

    @Column(name = "hora_entrada", nullable = false)
    private LocalTime horaEntrada;

    @Column(name = "hora_egreso", nullable = false)
    private LocalTime horaEgreso;

    @Column(name = "dias_laborables", nullable = false, length = 60)
    private String diasLaborables;

    @Column(name = "tol_entrada_min")
    private Integer tolEntradaMin = 15;

    @Column(name = "tol_egreso_min")
    private Integer tolEgresoMin = 10;

    @Column(name = "max_salidas_intermedias")
    private Integer maxSalidasIntermedias = 2;

    @Column(name = "tiempo_max_fuera_min")
    private Integer tiempoMaxFueraMin = 45;

    @Column(name = "total_personal")
    private Integer totalPersonal = 0;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_baja")
    private LocalDateTime fechaBaja;

    public Horario() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public Categoria getCategoria() { return categoria; }
    public void setCategoria(Categoria categoria) { this.categoria = categoria; }

    public LocalTime getHoraEntrada() { return horaEntrada; }
    public void setHoraEntrada(LocalTime horaEntrada) { this.horaEntrada = horaEntrada; }

    public LocalTime getHoraEgreso() { return horaEgreso; }
    public void setHoraEgreso(LocalTime horaEgreso) { this.horaEgreso = horaEgreso; }

    public String getDiasLaborables() { return diasLaborables; }
    public void setDiasLaborables(String diasLaborables) { this.diasLaborables = diasLaborables; }

    public Integer getTolEntradaMin() { return tolEntradaMin; }
    public void setTolEntradaMin(Integer tolEntradaMin) { this.tolEntradaMin = tolEntradaMin; }

    public Integer getTolEgresoMin() { return tolEgresoMin; }
    public void setTolEgresoMin(Integer tolEgresoMin) { this.tolEgresoMin = tolEgresoMin; }

    public Integer getMaxSalidasIntermedias() { return maxSalidasIntermedias; }
    public void setMaxSalidasIntermedias(Integer maxSalidasIntermedias) { this.maxSalidasIntermedias = maxSalidasIntermedias; }

    public Integer getTiempoMaxFueraMin() { return tiempoMaxFueraMin; }
    public void setTiempoMaxFueraMin(Integer tiempoMaxFueraMin) { this.tiempoMaxFueraMin = tiempoMaxFueraMin; }

    public Integer getTotalPersonal() { return totalPersonal; }
    public void setTotalPersonal(Integer totalPersonal) { this.totalPersonal = totalPersonal; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDateTime fechaBaja) { this.fechaBaja = fechaBaja; }
}