package backend.model;

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
    @JoinColumn(name = "id_empleado", nullable = true)
    private Empleado empleado;

    // Relación con el lote de importación
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_importacion")
    private ImportacionHistorial importacion;

    @Column(name = "id_biometrico", length = 50)
    private String idBiometrico; // sJobNo directo del archivo

    @Column(name = "nombre_reloj", length = 150)
    private String nombreReloj; // sName directo del archivo

    @Column(name = "hora_fichaje", nullable = false)
    private LocalDateTime horaFichaje;

    @Column(name = "tipo_evento", length = 50)
    private String tipoEvento; // checkIn, checkOut, etc.

    @Column(name = "serial_no")
    private Long serialNo;

    @Column(name = "estado_fichaje", length = 50)
    private String estadoFichaje = "valido";

    @Column(length = 255)
    private String observacion;

    @Column(name = "creado_en", insertable = false, updatable = false)
    private LocalDateTime creadoEn;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_baja")
    private LocalDateTime fechaBaja;

    public EmpleadoFichaje() {}

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Empleado getEmpleado() { return empleado; }
    public void setEmpleado(Empleado empleado) { this.empleado = empleado; }
    public String getIdBiometrico() { return idBiometrico; }
    public void setIdBiometrico(String idBiometrico) { this.idBiometrico = idBiometrico; }
    public String getNombreReloj() { return nombreReloj; }
    public void setNombreReloj(String nombreReloj) { this.nombreReloj = nombreReloj; }
    public LocalDateTime getHoraFichaje() { return horaFichaje; }
    public void setHoraFichaje(LocalDateTime horaFichaje) { this.horaFichaje = horaFichaje; }
    public String getTipoEvento() { return tipoEvento; }
    public void setTipoEvento(String tipoEvento) { this.tipoEvento = tipoEvento; }
    public Long getSerialNo() { return serialNo; }
    public void setSerialNo(Long serialNo) { this.serialNo = serialNo; }
    public String getEstadoFichaje() { return estadoFichaje; }
    public void setEstadoFichaje(String estadoFichaje) { this.estadoFichaje = estadoFichaje; }
    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
    public ImportacionHistorial getImportacion() { return importacion; }
    public void setImportacion(ImportacionHistorial importacion) { this.importacion = importacion; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public LocalDateTime getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDateTime fechaBaja) { this.fechaBaja = fechaBaja; }
}