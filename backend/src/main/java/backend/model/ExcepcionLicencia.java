package backend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.SQLDelete;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "excepciones_licencias")
@SQLDelete(sql = "UPDATE excepciones_licencias SET activo = false, fecha_baja = NOW() WHERE id_excepcion = ?")
public class ExcepcionLicencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_excepcion")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_empleado", nullable = true)
    private Empleado empleado;

    @Column(name = "es_institucional", nullable = false)
    private Boolean esInstitucional = false;

    @Column(nullable = false, length = 60)
    private String tipo;

    @Column(name = "tipo_etiqueta", nullable = false, length = 100)
    private String tipoEtiqueta;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;

    @Column(name = "dias_duracion", nullable = false)
    private Integer diasDuracion = 1;

    @Column(nullable = false, length = 30)
    private String estado = "APROBADA"; // APROBADA, PENDIENTE_RRHH, RECHAZADA

    @Column(name = "motivo_dictamen", columnDefinition = "TEXT", nullable = false)
    private String motivoDictamen;

    @Column(name = "observaciones_rrhh", columnDefinition = "TEXT")
    private String observacionesRrhh;

    @Column(name = "registrado_por", length = 100)
    private String registradoPor;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_baja")
    private LocalDateTime fechaBaja;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private LocalDateTime creadoEn;

    public ExcepcionLicencia() {}

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Empleado getEmpleado() { return empleado; }
    public void setEmpleado(Empleado empleado) { this.empleado = empleado; }
    public Boolean getEsInstitucional() { return esInstitucional; }
    public void setEsInstitucional(Boolean esInstitucional) { this.esInstitucional = esInstitucional; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getTipoEtiqueta() { return tipoEtiqueta; }
    public void setTipoEtiqueta(String tipoEtiqueta) { this.tipoEtiqueta = tipoEtiqueta; }
    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }
    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }
    public Integer getDiasDuracion() { return diasDuracion; }
    public void setDiasDuracion(Integer diasDuracion) { this.diasDuracion = diasDuracion; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getMotivoDictamen() { return motivoDictamen; }
    public void setMotivoDictamen(String motivoDictamen) { this.motivoDictamen = motivoDictamen; }
    public String getObservacionesRrhh() { return observacionesRrhh; }
    public void setObservacionesRrhh(String observacionesRrhh) { this.observacionesRrhh = observacionesRrhh; }
    public String getRegistradoPor() { return registradoPor; }
    public void setRegistradoPor(String registradoPor) { this.registradoPor = registradoPor; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public LocalDateTime getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDateTime fechaBaja) { this.fechaBaja = fechaBaja; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
}