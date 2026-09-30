package backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria_movimientos")
public class AuditoriaMovimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_auditoria")
    private Long id;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    @Column(name = "id_usuario")
    private Long idUsuario;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(length = 50)
    private String rol;

    @Column(nullable = false, length = 80)
    private String accion;

    @Column(nullable = false, length = 40)
    private String modulo;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String descripcion;

    @Column(name = "ip_origen", length = 45)
    private String ipOrigen;

    @PrePersist
    public void prePersist() {
        if (this.fechaHora == null) {
            this.fechaHora = LocalDateTime.now();
        }
    }

    public AuditoriaMovimiento() {}

    // Constructor práctico
    public AuditoriaMovimiento(Long idUsuario, String username, String rol, String accion, String modulo, String descripcion, String ipOrigen) {
        this.idUsuario = idUsuario;
        this.username = username;
        this.rol = rol;
        this.accion = accion;
        this.modulo = modulo;
        this.descripcion = descripcion;
        this.ipOrigen = ipOrigen;
        this.fechaHora = LocalDateTime.now();
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    public Long getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Long idUsuario) { this.idUsuario = idUsuario; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }
    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getIpOrigen() { return ipOrigen; }
    public void setIpOrigen(String ipOrigen) { this.ipOrigen = ipOrigen; }
}