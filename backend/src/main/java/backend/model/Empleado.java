package backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLDelete;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "empleados")
@SQLDelete(sql = "UPDATE empleados SET activo = false, fecha_baja = NOW() WHERE id_empleado = ?")
public class Empleado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_empleado")
    private Long id;

    @Column(nullable = false, length = 80)
    private String nombre;

    @Column(nullable = false, length = 80)
    private String apellido;

    @Column(nullable = true, unique = true, length = 20)
    private String dni;

    @Column(length = 120)
    private String email;

    @Column(length = 30)
    private String telefono;

    @Column(name = "nro_legajo", nullable = true, unique = true, length = 30)
    private String nroLegajo;

    @Column(name = "id_biometrico", nullable = true, unique = true, length = 30)
    private String idBiometrico;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "empleado_categorias",
        joinColumns = @JoinColumn(name = "id_empleado"),
        inverseJoinColumns = @JoinColumn(name = "id_categoria")
    )
    private List<Categoria> categorias = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "empleado_cargos",
        joinColumns = @JoinColumn(name = "id_empleado"),
        inverseJoinColumns = @JoinColumn(name = "id_cargo")
    )
    private List<Cargo> cargos = new ArrayList<>();

    @Column(name = "tolerancia_ingreso_min")
    private Integer toleranciaIngresoMin = 15;

    @Column(name = "tolerancia_egreso_min")
    private Integer toleranciaEgresoMin = 10;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_baja")
    private LocalDateTime fechaBaja;

    // Relación inversa opcional con la cuenta de acceso
    @OneToOne(mappedBy = "empleado", fetch = FetchType.LAZY)
    @JsonIgnore
    private Usuario usuario;

    public Empleado() {}

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }

    public String getDni() { return dni; }
    public void setDni(String dni) { this.dni = dni; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getNroLegajo() { return nroLegajo; }
    public void setNroLegajo(String nroLegajo) { this.nroLegajo = nroLegajo; }

    public String getIdBiometrico() { return idBiometrico; }
    public void setIdBiometrico(String idBiometrico) { this.idBiometrico = idBiometrico; }

    public List<Categoria> getCategorias() { return categorias; }
    public void setCategorias(List<Categoria> categorias) { this.categorias = categorias; }

    public List<Cargo> getCargos() { return cargos; }
    public void setCargos(List<Cargo> cargos) { this.cargos = cargos; }

    public Integer getToleranciaIngresoMin() { return toleranciaIngresoMin; }
    public void setToleranciaIngresoMin(Integer toleranciaIngresoMin) { this.toleranciaIngresoMin = toleranciaIngresoMin; }

    public Integer getToleranciaEgresoMin() { return toleranciaEgresoMin; }
    public void setToleranciaEgresoMin(Integer toleranciaEgresoMin) { this.toleranciaEgresoMin = toleranciaEgresoMin; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDateTime fechaBaja) { this.fechaBaja = fechaBaja; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}