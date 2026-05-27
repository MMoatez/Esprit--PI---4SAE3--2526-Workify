package com.workify.projectservice.weeb;

import com.workify.projectservice.domains.Offer;
import com.workify.projectservice.service.OfferService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/offers")
@RequiredArgsConstructor
public class OfferController {

    private final OfferService offerService;

    // CREATE OFFER FOR PROJECT + FREELANCER
    @PostMapping("/project/{projectId}/freelancer/{freelancerId}")
    public ResponseEntity<Offer> addOfferByProjectId(
            @PathVariable Long projectId,
            @PathVariable Long freelancerId,
            @RequestBody Offer offer) {

        return ResponseEntity.ok(
                offerService.addOfferByProjectId(projectId, freelancerId, offer)
        );
    }

    @GetMapping
    public ResponseEntity<List<Offer>> getAll() {
        return ResponseEntity.ok(offerService.getAll());
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Offer>> getByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(offerService.getByProject(projectId));
    }

    @GetMapping("/freelancer/{freelancerId}")
    public ResponseEntity<List<Offer>> getByFreelancer(@PathVariable Long freelancerId) {
        return ResponseEntity.ok(offerService.getByFreelancer(freelancerId));
    }

    @GetMapping("/by-client")
    public ResponseEntity<List<Offer>> getByClientEmail(@RequestParam String clientEmail) {
        return ResponseEntity.ok(offerService.getByClientEmail(clientEmail));
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<Offer> accept(@PathVariable Long id) {
        return ResponseEntity.ok(offerService.accept(id));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Offer> reject(@PathVariable Long id) {
        return ResponseEntity.ok(offerService.reject(id));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<Offer> complete(@PathVariable Long id) {
        return ResponseEntity.ok(offerService.complete(id));
    }
}