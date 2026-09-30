package backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuario_permisos", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"id_usuario", "codigo_permiso"})
})
public class UsuarioPermiso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario_permiso")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    @JsonIgnore
    private Usuario usuario;

    @Column(name = "codigo_permiso", nullable = false, length = 60)
    private String codigoPermiso;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "es_temporal", nullable = false)
    private Boolean esTemporal = false;

    @Column(name = "fecha_otorgacion", nullable = false)
    private LocalDateTime fechaOtorgacion;

    @Column(name = "fecha_expiracion")
    private LocalDateTime fechaExpiracion;

    @Column(name = "otorgado_por", length = 100)
    private String otorgadoPor;

    @Column(length = 255)
    private String motivo;

    @PrePersist
    public void prePersist() {
        if (this.fechaOtorgacion == null) {
            this.fechaOtorgacion = LocalDateTime.now();
        }
        if (this.activo == null) {
            this.activo = true;
        }
        if (this.esTemporal == null) {
            this.esTemporal = (this.fechaExpiracion != null);
        }
    }

    /**
     * Valida en tiempo de ejecución si el permiso está activo y vigente.
     */
    public boolean isVigente() {
        if (!Boolean.TRUE.equals(this.activo)) {
            return false;
        }
        if (Boolean.TRUE.equals(this.esTemporal) && this.fechaExpiracion != null) {
            return LocalDateTime.now().isBefore(this.fechaExpiracion);
        }
        return true;
    }

    public UsuarioPermiso() {}

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public String getCodigoPermiso() { return codigoPermiso; }
    public void setCodigoPermiso(String codigoPermiso) { this.codigoPermiso = codigoPermiso; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public Boolean getEsTemporal() { return esTemporal; }
    public void setEsTemporal(Boolean esTemporal) { this.esTemporal = esTemporal; }
    public LocalDateTime getFechaOtorgacion() { return fechaOtorgacion; }
    public void setFechaOtorgacion(LocalDateTime fechaOtorgacion) { this.fechaOtorgacion = fechaOtorgacion; }
    public LocalDateTime getFechaExpiracion() { return fechaExpiracion; }
    public void setFechaExpiracion(LocalDateTime fechaExpiracion) { this.fechaExpiracion = fechaExpiracion; }
    public String getOtorgadoPor() { return otorgadoPor; }
    public void setOtorgadoPor(String otorgadoPor) { this.otorgadoPor = otorgadoPor; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
}