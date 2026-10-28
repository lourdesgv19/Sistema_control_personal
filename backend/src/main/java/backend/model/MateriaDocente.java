package backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "materia_docentes")
public class MateriaDocente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_materia_docente")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_materia", nullable = false)
    private Materia materia;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_docente_titular", nullable = false)
    private Empleado docenteTitular;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_docente_auxiliar", nullable = true)
    private Empleado docenteAuxiliar;

    @Column(name = "rol_titular", length = 50)
    private String rolTitular = "TITULAR";

    @Column(name = "rol_auxiliar", length = 50)
    private String rolAuxiliar = "AUXILIAR";

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_asignacion")
    private LocalDateTime fechaAsignacion = LocalDateTime.now();

    @Column(name = "fecha_baja")
    private LocalDateTime fechaBaja;

    @Column(length = 255)
    private String observaciones;

    public MateriaDocente() {}

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Materia getMateria() { return materia; }
    public void setMateria(Materia materia) { this.materia = materia; }

    public Empleado getDocenteTitular() { return docenteTitular; }
    public void setDocenteTitular(Empleado docenteTitular) { this.docenteTitular = docenteTitular; }

    public Empleado getDocenteAuxiliar() { return docenteAuxiliar; }
    public void setDocenteAuxiliar(Empleado docenteAuxiliar) { this.docenteAuxiliar = docenteAuxiliar; }

    public String getRolTitular() { return rolTitular; }
    public void setRolTitular(String rolTitular) { this.rolTitular = rolTitular; }

    public String getRolAuxiliar() { return rolAuxiliar; }
    public void setRolAuxiliar(String rolAuxiliar) { this.rolAuxiliar = rolAuxiliar; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getFechaAsignacion() { return fechaAsignacion; }
    public void setFechaAsignacion(LocalDateTime fechaAsignacion) { this.fechaAsignacion = fechaAsignacion; }

    public LocalDateTime getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDateTime fechaBaja) { this.fechaBaja = fechaBaja; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
}