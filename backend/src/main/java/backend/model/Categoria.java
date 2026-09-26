package backend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.SQLDelete;
import java.time.LocalDateTime;

@Entity
@Table(name = "config_categorias")
@SQLDelete(sql = "UPDATE config_categorias SET activo = false, fecha_baja = NOW() WHERE id_categoria = ?")
public class Categoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_categoria")
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(name = "codigo_tag", nullable = false, length = 50)
    private String codigoTag;

    @Column(name = "color_identificacion", length = 30)
    private String colorIdentificacion;

    @Column(length = 300)
    private String descripcion;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_baja")
    private LocalDateTime fechaBaja;

    public Categoria() {}

    public Categoria(Long id, String nombre, String codigoTag, String colorIdentificacion, String descripcion, Boolean activo, LocalDateTime fechaBaja) {
        this.id = id;
        this.nombre = nombre;
        this.codigoTag = codigoTag;
        this.colorIdentificacion = colorIdentificacion;
        this.descripcion = descripcion;
        this.activo = activo != null ? activo : true;
        this.fechaBaja = fechaBaja;
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getCodigoTag() { return codigoTag; }
    public void setCodigoTag(String codigoTag) { this.codigoTag = codigoTag; }

    public String getColorIdentificacion() { return colorIdentificacion; }
    public void setColorIdentificacion(String colorIdentificacion) { this.colorIdentificacion = colorIdentificacion; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDateTime fechaBaja) { this.fechaBaja = fechaBaja; }
}