package tn.esprit.workify.controllers;


import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.workify.entities.Colonne;
import tn.esprit.workify.services.IColonneService;

import java.util.List;

@RestController
@RequestMapping("/api/colonnes")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ColonneController {

    private final IColonneService colonneService;


    @PostMapping
    public ResponseEntity<Colonne> createColonne(@RequestBody Colonne colonne) {
        Colonne created = colonneService.createColonne(colonne);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }


    @GetMapping
    public ResponseEntity<List<Colonne>> getAllColonnes() {
        List<Colonne> colonnes = colonneService.getAllColonnes();
        return ResponseEntity.ok(colonnes);
    }


    @GetMapping("/{id}")
    public ResponseEntity<Colonne> getColonneById(@PathVariable Integer id) {
        Colonne colonne = colonneService.getColonneById(id);
        return ResponseEntity.ok(colonne);
    }


    @GetMapping("/planning/{idPlanning}")
    public ResponseEntity<List<Colonne>> getColonnesByPlanningId(@PathVariable Integer idPlanning) {
        List<Colonne> colonnes = colonneService.getColonnesByPlanningId(idPlanning);
        return ResponseEntity.ok(colonnes);
    }


    @PutMapping("/{id}")
    public ResponseEntity<Colonne> updateColonne(
            @PathVariable Integer id,
            @RequestBody Colonne colonne) {
        Colonne updated = colonneService.updateColonne(id, colonne);
        return ResponseEntity.ok(updated);
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteColonne(@PathVariable Integer id) {
        colonneService.deleteColonne(id);
        return ResponseEntity.noContent().build();
    }
}
