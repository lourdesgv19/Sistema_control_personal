package backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "empleado_fichajes")
public class EmpleadoFichaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_fichaje")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_empleado", nullable = false)
    private Empleado empleado;

    @Column(name = "hora_fichaje", nullable = false)
    private LocalDateTime horaFichaje;

    @Column(name = "tipo_evento", length = 50)
    private String tipoEvento; // checkIn, checkOut, breakIn, breakOut, etc.

    @Column(name = "serial_no", unique = true)
    private Long serialNo; // Identificador correlativo del lector biométrico

    @Column(name = "estado_fichaje", length = 50)
    private String estadoFichaje = "valido"; // "valido", "duplicado_ignorado", "manual", "anulado"

    @Column(length = 255)
    private String observacion;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private LocalDateTime creadoEn;

    public EmpleadoFichaje() {}

    public EmpleadoFichaje(Empleado empleado, LocalDateTime horaFichaje, String tipoEvento, Long serialNo, String estadoFichaje) {
        this.empleado = empleado;
        this.horaFichaje = horaFichaje;
        this.tipoEvento = tipoEvento;
        this.serialNo = serialNo;
        this.estadoFichaje = estadoFichaje != null ? estadoFichaje : "valido";
    }

    // Getters y Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Empleado getEmpleado() {
        return empleado;
    }

    public void setEmpleado(Empleado empleado) {
        this.empleado = empleado;
    }

    public LocalDateTime getHoraFichaje() {
        return horaFichaje;
    }

    public void setHoraFichaje(LocalDateTime horaFichaje) {
        this.horaFichaje = horaFichaje;
    }

    public String getTipoEvento() {
        return tipoEvento;
    }

    public void setTipoEvento(String tipoEvento) {
        this.tipoEvento = tipoEvento;
    }

    public Long getSerialNo() {
        return serialNo;
    }

    public void setSerialNo(Long serialNo) {
        this.serialNo = serialNo;
    }

    public String getEstadoFichaje() {
        return estadoFichaje;
    }

    public void setEstadoFichaje(String estadoFichaje) {
        this.estadoFichaje = estadoFichaje;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public LocalDateTime getCreadoEn() {
        return creadoEn;
    }

    public void setCreadoEn(LocalDateTime creadoEn) {
        this.creadoEn = creadoEn;
    }
}