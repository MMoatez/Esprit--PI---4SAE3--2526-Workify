package tn.esprit.workify.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.workify.entities.Planning;
import tn.esprit.workify.services.IPlanningService;

import java.util.List;

@RestController
@RequestMapping("/api/plannings")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class PlanningController {
    private final IPlanningService planningService;


    @PostMapping
    public ResponseEntity<Planning> createPlanning(@RequestBody Planning planning) {
        Planning created = planningService.createPlanning(planning);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }


    @GetMapping
    public ResponseEntity<List<Planning>> getAllPlannings() {
        List<Planning> plannings = planningService.getAllPlannings();
        return ResponseEntity.ok(plannings);
    }


    @GetMapping("/{id}")
    public ResponseEntity<Planning> getPlanningById(@PathVariable Integer id) {
        Planning planning = planningService.getPlanningById(id);
        return ResponseEntity.ok(planning);
    }


    @GetMapping("/projet/{idProjet}")
    public ResponseEntity<Planning> getPlanningByProjetId(@PathVariable Integer idProjet) {
        Planning planning = planningService.getPlanningByProjetId(idProjet);
        return ResponseEntity.ok(planning);
    }


    @PutMapping("/{id}")
    public ResponseEntity<Planning> updatePlanning(
            @PathVariable Integer id,
            @RequestBody Planning planning) {
        Planning updated = planningService.updatePlanning(id, planning);
        return ResponseEntity.ok(updated);
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlanning(@PathVariable Integer id) {
        planningService.deletePlanning(id);
        return ResponseEntity.noContent().build();
    }

}
