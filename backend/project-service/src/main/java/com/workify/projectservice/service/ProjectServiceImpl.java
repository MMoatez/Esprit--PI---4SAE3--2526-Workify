package com.workify.projectservice.service;

import com.workify.projectservice.domains.*;
import com.workify.projectservice.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository       projectRepository;
    private final EstimationService       estimationService;
    private final EmbeddingService        embeddingService;
    private final SkillExtractionService  skillExtractionService;
    private final SkillRepository         skillRepository;
    private final ProjectSkillRepository  projectSkillRepository;

    // ── WebSocket ──────────────────────────────────────────
    private final SimpMessagingTemplate   messagingTemplate;

    @Override
    public Project create(Project project) {

        // Limite par email (100 projets max par utilisateur)
        String email = project.getClientEmail();
        if (email != null && !email.trim().isEmpty()) {
            long count = projectRepository.countByClientEmail(email.trim());
            if (count >= 100) {
                throw new RuntimeException("User has reached the maximum project limit.");
            }
        }

        project.setStatus(ProjectStatus.OPEN);
        project.setCreatedAt(LocalDateTime.now());

        if (project.getEstimatedDuration() == null) {
            project.setEstimatedDuration(estimationService.estimateDuration(project));
        }
        if (project.getComplexity() == null) {
            project.setComplexity(estimationService.estimateComplexity(project));
        }

        // Sauvegarde initiale
        Project saved = projectRepository.save(project);

        // ── Génération Embedding (non-bloquant) ───────────
        try {
            String text =
                    Optional.ofNullable(saved.getTitle()).orElse("") + " " +
                            Optional.ofNullable(saved.getDetailedDescription()).orElse("") + " " +
                            Optional.ofNullable(saved.getCategory()).map(Enum::name).orElse("") + " " +
                            Optional.ofNullable(saved.getComplexity()).map(Enum::name).orElse("");

            double[] embedding = embeddingService.generateEmbedding(text);
            saved.setEmbeddingJson(embeddingService.toJson(embedding));
            projectRepository.save(saved);
        } catch (Exception e) {
            log.warn("[PROJECT] Embedding generation failed for project {}: {}", saved.getId(), e.getMessage());
        }

        // ── Extraction Skills (non-bloquant) ──────────────
        try {
            if (saved.getDetailedDescription() != null &&
                    saved.getDetailedDescription().length() > 20) {

                List<String> extractedSkills =
                        skillExtractionService.extractSkills(saved.getDetailedDescription());

                for (String skillName : extractedSkills) {
                    skillRepository.findByNomIgnoreCase(skillName)
                            .ifPresent(skill -> {
                                boolean alreadyExists =
                                        projectSkillRepository.existsByProjectAndSkill(saved, skill);
                                if (!alreadyExists) {
                                    ProjectSkill ps = new ProjectSkill();
                                    ps.setProject(saved);
                                    ps.setSkill(skill);
                                    ps.setNiveauRequis("INTERMEDIAIRE");
                                    projectSkillRepository.save(ps);
                                }
                            });
                }
            }
        } catch (Exception e) {
            log.warn("[PROJECT] Skill extraction failed for project {}: {}", saved.getId(), e.getMessage());
        }

        // ════════════════════════════════════════════════════
        // 🔔 NOTIFICATION WebSocket → tous les freelancers
        // ════════════════════════════════════════════════════
        String clientName = Optional.ofNullable(saved.getClientName())
                .filter(n -> !n.isBlank())
                .orElse("Un client");

        NotificationMessage notification = NotificationMessage.newProject(
                saved.getId(),
                saved.getTitle(),
                clientName
        );

        // Broadcast vers TOUS les abonnés de /topic/freelancers
        messagingTemplate.convertAndSend("/topic/freelancers", notification);

        return saved;
    }

    @Override
    public List<Project> getAll() {
        return projectRepository.findAll();
    }

    @Override
    public List<Project> getByClientEmail(String clientEmail) {
        return projectRepository.findByClientEmail(clientEmail);
    }

    @Override
    public List<Project> getByClientId(Long clientId) {
        return projectRepository.findByClientId(clientId);
    }

    @Override
    public Project getById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    @Override
    public Project update(Long id, Project project) {
        Project existing = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        existing.setTitle(project.getTitle());
        existing.setShortDescription(project.getShortDescription());
        existing.setDetailedDescription(project.getDetailedDescription());
        existing.setCategory(project.getCategory());
        existing.setBudget(project.getBudget());
        existing.setClientName(project.getClientName());
        existing.setClientEmail(project.getClientEmail());
        existing.setClientPhone(project.getClientPhone());
        existing.setStatus(project.getStatus());
        existing.setEstimatedDuration(estimationService.estimateDuration(existing));
        existing.setComplexity(estimationService.estimateComplexity(existing));

        Project saved = projectRepository.save(existing);

        try {
            String text =
                    Optional.ofNullable(saved.getTitle()).orElse("") + " " +
                            Optional.ofNullable(saved.getDetailedDescription()).orElse("") + " " +
                            Optional.ofNullable(saved.getCategory()).map(Enum::name).orElse("") + " " +
                            Optional.ofNullable(saved.getComplexity()).map(Enum::name).orElse("");

            double[] embedding = embeddingService.generateEmbedding(text);
            saved.setEmbeddingJson(embeddingService.toJson(embedding));
            projectRepository.save(saved);
        } catch (Exception e) {
            log.warn("[PROJECT] Embedding update failed for project {}: {}", saved.getId(), e.getMessage());
        }

        return saved;
    }

    @Override
    public void delete(Long id) {
        if (!projectRepository.existsById(id))
            throw new RuntimeException("Project not found");
        projectRepository.deleteById(id);
    }
}