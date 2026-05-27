package com.workify.projectservice.service;

import com.workify.projectservice.domains.*;
import com.workify.projectservice.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OfferServiceImpl implements OfferService {

    private final OfferRepository       offerRepository;
    private final ProjectRepository     projectRepository;
    private final FreelancerRepository  freelancerRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${feedback-service.url:http://localhost:8086}")
    private String feedbackServiceUrl;

    @Override
    public List<Offer> getAll() {
        return offerRepository.findAll();
    }

    @Override
    public List<Offer> getByProject(Long projectId) {
        return offerRepository.findByProjectId(projectId);
    }

    @Override
    public List<Offer> getByFreelancer(Long freelancerId) {
        return offerRepository.findByFreelancerId(freelancerId);
    }

    @Override
    public List<Offer> getByClientEmail(String clientEmail) {
        return offerRepository.findByProject_ClientEmail(clientEmail);
    }

    @Override
    public Offer accept(Long id) {
        Offer offer = offerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Offer not found"));
        offer.setStatus(OfferStatus.ACCEPTED);
        Offer updated = offerRepository.save(offer);
        messagingTemplate.convertAndSend("/topic/offers", updated);
        return updated;
    }

    @Async
    public void triggerEvaluationAsync(Offer offer) {
        try {
            Project project = offer.getProject();
            Freelancer freelancer = offer.getFreelancer();
            if (project == null || freelancer == null) return;

            Map<String, Object> body = new HashMap<>();
            body.put("offerId",       offer.getId());
            body.put("clientEmail",   project.getClientEmail());
            body.put("freelancerId",  freelancer.getId());
            body.put("projectTitle",  project.getTitle());

            RestTemplate restTemplate = new RestTemplate();
            restTemplate.postForEntity(
                    feedbackServiceUrl + "/api/evaluation/trigger", body, Object.class);

            log.info("[OFFER] Évaluation déclenchée pour offre {}", offer.getId());
        } catch (Exception e) {
            log.warn("[OFFER] Impossible de déclencher l'évaluation pour offre {}: {}",
                    offer.getId(), e.getMessage());
        }
    }

    @Override
    public Offer complete(Long id) {
        Offer offer = offerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Offer not found"));
        if (offer.getStatus() != OfferStatus.ACCEPTED) {
            throw new RuntimeException("Only an ACCEPTED offer can be marked as completed");
        }
        offer.setStatus(OfferStatus.COMPLETED);
        Offer updated = offerRepository.save(offer);
        messagingTemplate.convertAndSend("/topic/offers", updated);

        // C'est ici que l'évaluation est déclenchée — le projet est terminé
        triggerEvaluationAsync(updated);

        return updated;
    }

    @Override
    public Offer reject(Long id) {
        Offer offer = offerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Offer not found"));
        offer.setStatus(OfferStatus.REJECTED);
        Offer updated = offerRepository.save(offer);
        messagingTemplate.convertAndSend("/topic/offers", updated);
        return updated;
    }

    @Override
    public Offer addOfferByProjectId(Long projectId, Long freelancerId, Offer offer) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        Freelancer freelancer = freelancerRepository.findById(freelancerId)
                .orElseThrow(() -> new RuntimeException("Freelancer not found"));

        offer.setProject(project);
        offer.setFreelancer(freelancer);
        offer.setCreatedAt(LocalDateTime.now());
        offer.setStatus(OfferStatus.PENDING);

        Offer saved = offerRepository.save(offer);

        // ════════════════════════════════════════════════════
        // 🔔 NOTIFICATION → /topic/client-1-notifications
        // Topic dédié au client ID=1, sans besoin d'authentification
        // ════════════════════════════════════════════════════
        String freelancerName = Optional.ofNullable(freelancer.getNom())
                .filter(n -> !n.isBlank()).orElse("Un freelancer");

        String projectTitle = Optional.ofNullable(project.getTitle())
                .filter(t -> !t.isBlank()).orElse("un projet");

        NotificationMessage notification = NotificationMessage.newOffer(
                saved.getId(),
                projectTitle,
                freelancerName,
                saved.getPrice()
        );

        messagingTemplate.convertAndSend("/topic/client-1-notifications", notification);

        return saved;
    }
}