package backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "permisos")
public class Permiso {

    @Id
    @Column(name = "codigo", length = 60)
    private String codigo;

    @Column(name = "modulo", nullable = false, length = 40)
    private String modulo;

    @Column(name = "descripcion", nullable = false, length = 150)
    private String descripcion;

    public Permiso() {}

    public Permiso(String codigo, String modulo, String descripcion) {
        this.codigo = codigo;
        this.modulo = modulo;
        this.descripcion = descripcion;
    }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
}