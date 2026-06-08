package tn.esprit.workify.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.workify.entities.Tache;
import tn.esprit.workify.services.ITacheService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/taches")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class TacheController {
    private final ITacheService tacheService;


    @PostMapping
    public ResponseEntity<Tache> createTache(@RequestBody Tache tache) {
        Tache created = tacheService.createTache(tache);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }


    @GetMapping
    public ResponseEntity<List<Tache>> getAllTaches() {
        List<Tache> taches = tacheService.getAllTaches();
        return ResponseEntity.ok(taches);
    }


    @GetMapping("/{id}")
    public ResponseEntity<Tache> getTacheById(@PathVariable Integer id) {
        Tache tache = tacheService.getTacheById(id);
        return ResponseEntity.ok(tache);
    }


    @GetMapping("/colonne/{idColonne}")
    public ResponseEntity<List<Tache>> getTachesByColonneId(@PathVariable Integer idColonne) {
        List<Tache> taches = tacheService.getTachesByColonneId(idColonne);
        return ResponseEntity.ok(taches);
    }


    @PutMapping("/{id}")
    public ResponseEntity<Tache> updateTache(
            @PathVariable Integer id,
            @RequestBody Tache tache) {
        Tache updated = tacheService.updateTache(id, tache);
        return ResponseEntity.ok(updated);
    }


    @PatchMapping("/{idTache}/move/{newIdColonne}")
    public ResponseEntity<Tache> moveTacheToColonne(
            @PathVariable Integer idTache,
            @PathVariable Integer newIdColonne) {
        Tache moved = tacheService.moveTacheToColonne(idTache, newIdColonne);
        return ResponseEntity.ok(moved);
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTache(@PathVariable Integer id) {
        tacheService.deleteTache(id);
        return ResponseEntity.noContent().build();
    }

    // DRAG & DROP
    @PutMapping("/{id}/move")
    public ResponseEntity<Tache> moveTache(
            @PathVariable Integer id,
            @RequestBody Map<String, Integer> body) {
        Integer newColonneId = body.get("idColonne");
        Tache updated = tacheService.moveTache(id, newColonneId);
        return ResponseEntity.ok(updated);
    }
}
