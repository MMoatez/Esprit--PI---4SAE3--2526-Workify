package com.workify.projectservice.weeb;

import com.workify.projectservice.domains.Freelancer;
import com.workify.projectservice.domains.FreelancerDTO;
import com.workify.projectservice.repositories.FreelancerRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/freelancers")
@RequiredArgsConstructor
public class FreelancerController {

    private final FreelancerRepository freelancerRepository;

    @Data
    static class SyncRequest {
        private Long   userId;
        private String nom;
        private String email;
    }

    /**
     * Find or create a Freelancer record linked to the real user-service user.
     * Lookup priority: userId -> email -> create new.
     */
    @PostMapping("/sync")
    public ResponseEntity<FreelancerDTO> syncFreelancer(@RequestBody SyncRequest request) {
        Freelancer existing = null;

        if (request.getUserId() != null) {
            existing = freelancerRepository.findByUserId(request.getUserId()).orElse(null);
        }

        if (existing == null && request.getEmail() != null) {
            existing = freelancerRepository.findFirstByEmail(request.getEmail()).orElse(null);
            if (existing != null && request.getUserId() != null && existing.getUserId() == null) {
                existing.setUserId(request.getUserId());
                existing = freelancerRepository.save(existing);
            }
        }

        if (existing == null) {
            Freelancer f = new Freelancer();
            f.setUserId(request.getUserId());
            f.setNom(request.getNom());
            f.setEmail(request.getEmail());
            f.setDisponibilite(true);
            existing = freelancerRepository.save(f);
        }

        return ResponseEntity.ok(new FreelancerDTO(existing));
    }

    @GetMapping("/by-email")
    public ResponseEntity<Freelancer> getByEmail(@RequestParam String email) {
        return freelancerRepository.findFirstByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
