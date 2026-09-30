package backend.controller;

import backend.model.Materia;
import backend.service.MateriaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/configuracion/materias")
@CrossOrigin(origins = "http://localhost:5173")
public class MateriaController {

    private final MateriaService materiaService;

    public MateriaController(MateriaService materiaService) {
        this.materiaService = materiaService;
    }

    @GetMapping
    public ResponseEntity<List<Materia>> listar() {
        return ResponseEntity.ok(materiaService.listarTodas());
    }

    @PostMapping
    public ResponseEntity<Materia> crear(@RequestBody Materia m) {
        return new ResponseEntity<>(materiaService.guardar(m), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Materia> actualizar(@PathVariable Long id, @RequestBody Materia m) {
        return ResponseEntity.ok(materiaService.actualizar(id, m));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> baja(@PathVariable Long id) {
        materiaService.bajaLogica(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reactivar")
    public ResponseEntity<Void> reactivar(@PathVariable Long id) {
        materiaService.reactivar(id);
        return ResponseEntity.noContent().build();
    }
}