package backend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import java.time.LocalDateTime;

@Entity
@Table(name = "importaciones_fichajes")
@SQLDelete(sql = "UPDATE importaciones_fichajes SET activo = false, fecha_baja = NOW() WHERE id = ?")
@SQLRestriction("activo = true")
public class ImportacionHistorial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombre_archivo", nullable = false)
    private String nombreArchivo;

    @Column(name = "fecha_importacion", nullable = false)
    private LocalDateTime fechaImportacion = LocalDateTime.now();

    @Column(name = "total_filas")
    private int totalFilas;

    @Column(name = "procesadas_ok")
    private int procesadasOk;

    @Column(name = "registros_nulos")
    private int registrosNulos = 0;

    @Column(name = "duplicadas_ignoradas")
    private int duplicadasIgnoradas;

    private int errores;

    @Column(name = "usuario_responsable")
    private String usuarioResponsable;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_baja")
    private LocalDateTime fechaBaja;

    public ImportacionHistorial() {}

    public ImportacionHistorial(String nombreArchivo, int totalFilas, int procesadasOk, int registrosNulos, int duplicadasIgnoradas, int errores, String usuarioResponsable) {
        this.nombreArchivo = nombreArchivo;
        this.totalFilas = totalFilas;
        this.procesadasOk = procesadasOk;
        this.registrosNulos = registrosNulos;
        this.duplicadasIgnoradas = duplicadasIgnoradas;
        this.errores = errores;
        this.usuarioResponsable = usuarioResponsable;
        this.fechaImportacion = LocalDateTime.now();
        this.activo = true;
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombreArchivo() { return nombreArchivo; }
    public void setNombreArchivo(String nombreArchivo) { this.nombreArchivo = nombreArchivo; }
    public LocalDateTime getFechaImportacion() { return fechaImportacion; }
    public void setFechaImportacion(LocalDateTime fechaImportacion) { this.fechaImportacion = fechaImportacion; }
    public int getTotalFilas() { return totalFilas; }
    public void setTotalFilas(int totalFilas) { this.totalFilas = totalFilas; }
    public int getProcesadasOk() { return procesadasOk; }
    public void setProcesadasOk(int procesadasOk) { this.procesadasOk = procesadasOk; }
    public int getRegistrosNulos() { return registrosNulos; }
    public void setRegistrosNulos(int registrosNulos) { this.registrosNulos = registrosNulos; }
    public int getDuplicadasIgnoradas() { return duplicadasIgnoradas; }
    public void setDuplicadasIgnoradas(int duplicadasIgnoradas) { this.duplicadasIgnoradas = duplicadasIgnoradas; }
    public int getErrores() { return errores; }
    public void setErrores(int errores) { this.errores = errores; }
    public String getUsuarioResponsable() { return usuarioResponsable; }
    public void setUsuarioResponsable(String usuarioResponsable) { this.usuarioResponsable = usuarioResponsable; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public LocalDateTime getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDateTime fechaBaja) { this.fechaBaja = fechaBaja; }
}