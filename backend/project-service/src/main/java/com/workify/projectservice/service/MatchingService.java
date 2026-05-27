package com.workify.projectservice.service;

import com.workify.projectservice.domains.*;
import com.workify.projectservice.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Service
@RequiredArgsConstructor
public class MatchingService {

    private final FreelancerRepository freelancerRepository;
    private final ProjectRepository projectRepository;
    private final ProjectSkillRepository projectSkillRepository;
    private final OfferSkillRepository offerSkillRepository;
    private final PreferenceRepository preferenceRepository;

    private final EmbeddingService embeddingService;
    private final WebClient groqClient;

    public List<MatchingResult> matchFreelancersToProject(Long projectId) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Projet introuvable"));

        // ✅ FIX : retourne liste vide au lieu de crash
        if (project.getDetailedDescription() == null ||
                project.getDetailedDescription().trim().length() < 20) {
            return Collections.emptyList();
        }

        List<ProjectSkill> requiredSkills =
                projectSkillRepository.findByProject(project);

        if (requiredSkills.isEmpty()) {
            return Collections.emptyList();
        }

        // ✅ FIX : retourne liste vide si embedding manquant
        if (project.getEmbeddingJson() == null ||
                project.getEmbeddingJson().isEmpty()) {
            return Collections.emptyList();
        }

        double[] projectEmbedding =
                embeddingService.fromJson(project.getEmbeddingJson());

        List<Freelancer> freelancers =
                freelancerRepository.findAll();

        List<MatchingResult> results = new ArrayList<>();

        for (Freelancer freelancer : freelancers) {

            List<OfferSkill> skills =
                    offerSkillRepository.findByFreelancer(freelancer);

            Optional<Preference> preference =
                    preferenceRepository.findByFreelancer(freelancer);

            // 1️⃣ Score logique
            double skillScore =
                    calculateSkillScore(requiredSkills, skills, preference, project);

            // 2️⃣ Score sémantique
            double semanticScore = 0.0;

            String freelancerText =
                    buildFreelancerText(freelancer, skills, preference);

            if (!freelancerText.isBlank()) {
                double[] freelancerEmbedding =
                        embeddingService.generateEmbedding(freelancerText);

                semanticScore =
                        cosineSimilarity(projectEmbedding, freelancerEmbedding) * 20;
            }

            double finalScore = skillScore + semanticScore;

            String explanation;

            if (finalScore == 0) {
                explanation = "Aucune correspondance significative trouvée.";
            } else {
                String prompt =
                        buildMatchingPrompt(freelancer, project, finalScore,
                                requiredSkills, skills);
                explanation = generateAIExplanation(prompt);
            }

            results.add(new MatchingResult(
                    freelancer,
                    Math.round(finalScore * 100.0) / 100.0,
                    explanation
            ));
        }

        results.sort(
                Comparator.comparingDouble(MatchingResult::getScore).reversed()
        );

        return results;
    }

    // ===============================
    // SKILL SCORE
    // ===============================

    private double calculateSkillScore(List<ProjectSkill> requiredSkills,
                                       List<OfferSkill> freelancerSkills,
                                       Optional<Preference> preference,
                                       Project project) {
        double score = 0.0;

        for (ProjectSkill required : requiredSkills) {
            for (OfferSkill actual : freelancerSkills) {
                if (required.getSkill() != null &&
                        actual.getSkill() != null &&
                        required.getSkill().getId().equals(actual.getSkill().getId())) {

                    score += 10;

                    if (required.getNiveauRequis() != null &&
                            actual.getNiveau() != null &&
                            required.getNiveauRequis().equalsIgnoreCase(actual.getNiveau())) {
                        score += 5;
                    }
                }
            }
        }

        if (preference.isPresent()) {
            Preference pref = preference.get();

            if (project.getCategory() != null &&
                    pref.getSecteur() != null &&
                    project.getCategory().name().equalsIgnoreCase(pref.getSecteur())) {
                score += 5;
            }

            if (project.getComplexity() != null &&
                    pref.getTypeProjet() != null &&
                    project.getComplexity().name().equalsIgnoreCase(pref.getTypeProjet())) {
                score += 5;
            }
        }

        return score;
    }

    // ===============================
    // BUILD FREELANCER TEXT
    // ===============================

    private String buildFreelancerText(Freelancer freelancer,
                                       List<OfferSkill> skills,
                                       Optional<Preference> preference) {
        StringBuilder text = new StringBuilder();
        text.append(freelancer.getNom()).append(" ");

        for (OfferSkill skill : skills) {
            if (skill.getSkill() != null)
                text.append(skill.getSkill().getNom()).append(" ");
            if (skill.getNiveau() != null)
                text.append(skill.getNiveau()).append(" ");
        }

        preference.ifPresent(pref -> {
            if (pref.getSecteur() != null)
                text.append(pref.getSecteur()).append(" ");
            if (pref.getTypeProjet() != null)
                text.append(pref.getTypeProjet()).append(" ");
        });

        return text.toString();
    }

    // ===============================
    // COSINE SIMILARITY
    // ===============================

    private double cosineSimilarity(double[] a, double[] b) {
        if (a == null || b == null || a.length != b.length)
            return 0.0;

        double dot = 0.0, normA = 0.0, normB = 0.0;

        for (int i = 0; i < a.length; i++) {
            dot   += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA == 0 || normB == 0) return 0.0;

        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // ===============================
    // PROMPT IA
    // ===============================

    private String buildMatchingPrompt(Freelancer freelancer,
                                       Project project,
                                       double score,
                                       List<ProjectSkill> requiredSkills,
                                       List<OfferSkill> freelancerSkills) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Analyse uniquement les données fournies.\n");
        prompt.append("N'invente aucune information.\n\n");
        prompt.append("Projet : ").append(project.getTitle()).append("\n");
        prompt.append("Score : ").append(score).append("\n\n");
        prompt.append("Compétences requises :\n");

        for (ProjectSkill ps : requiredSkills) {
            prompt.append("- ").append(ps.getSkill().getNom())
                    .append(" (").append(ps.getNiveauRequis()).append(")\n");
        }

        prompt.append("\nCompétences freelance :\n");
        for (OfferSkill os : freelancerSkills) {
            prompt.append("- ").append(os.getSkill().getNom())
                    .append(" (").append(os.getNiveau()).append(")\n");
        }

        prompt.append("\nExplique brièvement la compatibilité (2 phrases maximum).");
        return prompt.toString();
    }

    private String generateAIExplanation(String prompt) {
        try {
            Map<String, Object> request = Map.of(
                    "model", "llama-3.1-8b-instant",
                    "messages", List.of(Map.of("role", "user", "content", prompt)),
                    "temperature", 0.2,
                    "max_tokens", 120
            );

            Map<String, Object> response = groqClient.post()
                    .uri("/chat/completions")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null || !response.containsKey("choices"))
                return "Explication non disponible.";

            List<Map<String, Object>> choices =
                    (List<Map<String, Object>>) response.get("choices");

            if (choices.isEmpty()) return "Explication non disponible.";

            Map<String, Object> message =
                    (Map<String, Object>) choices.get(0).get("message");

            return message.get("content").toString();

        } catch (Exception e) {
            return "Explication IA non disponible.";
        }
    }
}