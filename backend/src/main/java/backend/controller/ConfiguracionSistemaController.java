package backend.controller;

import backend.model.Cargo;
import backend.model.Categoria;
import backend.model.Horario;
import backend.repositories.CargoRepository;
import backend.repositories.CategoriaRepository;
import backend.repositories.HorarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/configuracion")
@CrossOrigin(origins = "http://localhost:5173")
public class ConfiguracionSistemaController {

    private final CategoriaRepository categoriaRepo;
    private final CargoRepository cargoRepo;
    private final HorarioRepository horarioRepo;

    // Constructor explícito para inyección de dependencias
    public ConfiguracionSistemaController(CategoriaRepository categoriaRepo, 
                                          CargoRepository cargoRepo, 
                                          HorarioRepository horarioRepo) {
        this.categoriaRepo = categoriaRepo;
        this.cargoRepo = cargoRepo;
        this.horarioRepo = horarioRepo;
    }

    // --- 1. CATEGORÍAS ---
    @GetMapping("/categorias")
    public List<Categoria> listarCategorias() {
        return categoriaRepo.findAllOrdenados();
    }

    @PostMapping("/categorias")
    public ResponseEntity<Categoria> crearCategoria(@RequestBody Categoria cat) {
        if (cat.getCodigoTag() == null || cat.getCodigoTag().isBlank()) {
            cat.setCodigoTag(cat.getNombre().toLowerCase().replaceAll("\\s+", "-"));
        }
        return new ResponseEntity<>(categoriaRepo.save(cat), HttpStatus.CREATED);
    }

    @PutMapping("/categorias/{id}")
    public ResponseEntity<Categoria> editarCategoria(@PathVariable Long id, @RequestBody Categoria cat) {
        return categoriaRepo.findById(id).map(c -> {
            c.setNombre(cat.getNombre());
            c.setCodigoTag(cat.getCodigoTag());
            c.setColorIdentificacion(cat.getColorIdentificacion());
            c.setDescripcion(cat.getDescripcion());
            return ResponseEntity.ok(categoriaRepo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/categorias/{id}")
    public ResponseEntity<Void> bajaCategoria(@PathVariable Long id) {
        categoriaRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping ("/categorias/{id}/activar")
    public ResponseEntity<Categoria> activarCategoria(@PathVariable Long id) {
        return categoriaRepo.findById(id).map(c -> {
            c.setActivo(true);
            return ResponseEntity.ok(categoriaRepo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- 2. CARGOS Y PUESTOS ---
    @GetMapping("/cargos")
    public List<Cargo> listarCargos() {
        return cargoRepo.findAllOrdenados();
    }

    @PostMapping("/cargos")
    public ResponseEntity<Cargo> crearCargo(@RequestBody Cargo cargo) {
        return new ResponseEntity<>(cargoRepo.save(cargo), HttpStatus.CREATED);
    }

    @PutMapping("/cargos/{id}")
    public ResponseEntity<Cargo> editarCargo(@PathVariable Long id, @RequestBody Cargo cargo) {
        return cargoRepo.findById(id).map(c -> {
            c.setNombre(cargo.getNombre());
            c.setCategoria(cargo.getCategoria());
            c.setDescripcion(cargo.getDescripcion());
            return ResponseEntity.ok(cargoRepo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/cargos/{id}")
    public ResponseEntity<Void> bajaCargo(@PathVariable Long id) {
        cargoRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping ("/cargos/{id}/activar")
    public ResponseEntity<Cargo> activarCargo(@PathVariable Long id) {
        return cargoRepo.findById(id).map(c -> {
            c.setActivo(true);
            return ResponseEntity.ok(cargoRepo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- 3. HORARIOS PREESTABLECIDOS ---
    @GetMapping("/horarios")
    public List<Horario> listarHorarios() {
        return horarioRepo.findAllOrdenados();
    }

    @PostMapping("/horarios")
    public ResponseEntity<Horario> crearHorario(@RequestBody Horario horario) {
        return new ResponseEntity<>(horarioRepo.save(horario), HttpStatus.CREATED);
    }

    @PutMapping("/horarios/{id}")
    public ResponseEntity<Horario> editarHorario(@PathVariable Long id, @RequestBody Horario horario) {
        return horarioRepo.findById(id).map(h -> {
            h.setNombre(horario.getNombre());
            h.setCategoria(horario.getCategoria());
            h.setHoraEntrada(horario.getHoraEntrada());
            h.setHoraEgreso(horario.getHoraEgreso());
            h.setDiasLaborables(horario.getDiasLaborables());
            h.setTolEntradaMin(horario.getTolEntradaMin());
            h.setTolEgresoMin(horario.getTolEgresoMin());
            h.setMaxSalidasIntermedias(horario.getMaxSalidasIntermedias());
            h.setTiempoMaxFueraMin(horario.getTiempoMaxFueraMin());
            return ResponseEntity.ok(horarioRepo.save(h));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/horarios/{id}")
    public ResponseEntity<Void> bajaHorario(@PathVariable Long id) {
        horarioRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping ("/horarios/{id}/activar")
    public ResponseEntity<Horario> activarHorario(@PathVariable Long id) {
        return horarioRepo.findById(id).map(h -> {
            h.setActivo(true);
            return ResponseEntity.ok(horarioRepo.save(h));
        }).orElse(ResponseEntity.notFound().build());
    }
}