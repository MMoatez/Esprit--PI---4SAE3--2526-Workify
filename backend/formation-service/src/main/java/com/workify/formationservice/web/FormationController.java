package com.workify.formationservice.web;

import com.workify.formationservice.domain.Formation;
import com.workify.formationservice.service.FormationService;
import com.workify.formationservice.web.dto.FormationRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/formations")
@RequiredArgsConstructor
public class FormationController {

    private final FormationService formationService;

    @GetMapping
    public ResponseEntity<List<Formation>> getAllFormations() {
        return ResponseEntity.ok(formationService.getAllFormations());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Formation> getFormationById(@PathVariable Long id) {
        return ResponseEntity.ok(formationService.getFormationById(id));
    }

    @PostMapping
    public ResponseEntity<Formation> createFormation(@Valid @RequestBody FormationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(formationService.createFormation(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Formation> updateFormation(@PathVariable Long id,
            @Valid @RequestBody FormationRequest request) {
        return ResponseEntity.ok(formationService.updateFormation(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFormation(@PathVariable Long id) {
        formationService.deleteFormation(id);
        return ResponseEntity.noContent().build();
    }
}
