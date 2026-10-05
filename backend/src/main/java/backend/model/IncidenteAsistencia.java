package backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "incidentes_asistencia")
public class IncidenteAsistencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate fecha; // Fecha del incidente a auditar

    @Column(nullable = false)
    private LocalTime hora;

    @Column(nullable = false)
    private String severidad; // CRÍTICA, ALTA, MEDIA, LEVE

    @Column(nullable = false)
    private String categoriaRegla; // SALIDAS_EN_CLASE, TARDANZAS, RETIROS, SALIDAS_EXCESIVAS, AUSENCIAS, MARCAS_ABIERTAS

    @Column(nullable = false)
    private String tipo; // ej: "Salida no autorizada durante dictado", "Llegada tarde (+38 min)"

    @Column(columnDefinition = "TEXT")
    private String detalle;

    @Column(nullable = false)
    private String estado; // PENDIENTE, JUSTIFICADA, OBSERVADA, RECHAZADA

    private String resolucionMotivo;
    
    @Column(columnDefinition = "TEXT")
    private String resolucionObservaciones;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_empleado")
    private Empleado empleado;

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public LocalTime getHora() { return hora; }
    public void setHora(LocalTime hora) { this.hora = hora; }
    public String getSeveridad() { return severidad; }
    public void setSeveridad(String severidad) { this.severidad = severidad; }
    public String getCategoriaRegla() { return categoriaRegla; }
    public void setCategoriaRegla(String categoriaRegla) { this.categoriaRegla = categoriaRegla; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getDetalle() { return detalle; }
    public void setDetalle(String detalle) { this.detalle = detalle; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getResolucionMotivo() { return resolucionMotivo; }
    public void setResolucionMotivo(String resolucionMotivo) { this.resolucionMotivo = resolucionMotivo; }
    public String getResolucionObservaciones() { return resolucionObservaciones; }
    public void setResolucionObservaciones(String resolucionObservaciones) { this.resolucionObservaciones = resolucionObservaciones; }
    public Empleado getEmpleado() { return empleado; }
    public void setEmpleado(Empleado empleado) { this.empleado = empleado; }
}