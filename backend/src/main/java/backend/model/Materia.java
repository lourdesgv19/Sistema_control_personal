package backend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.SQLDelete;
import java.math.BigDecimal;
import java.time.LocalDateTime;

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

    @Column(name = "tarifa_hora_catedra", precision = 10, scale = 2)
    private BigDecimal tarifaHoraCatedra = BigDecimal.ZERO;

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

    public BigDecimal getTarifaHoraCatedra() { return tarifaHoraCatedra; }
    public void setTarifaHoraCatedra(BigDecimal tarifaHoraCatedra) { this.tarifaHoraCatedra = tarifaHoraCatedra; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDateTime fechaBaja) { this.fechaBaja = fechaBaja; }
}