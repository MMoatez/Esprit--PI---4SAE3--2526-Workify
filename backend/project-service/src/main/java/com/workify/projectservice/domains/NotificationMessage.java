package com.workify.projectservice.domains;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationMessage {

    private String type;       // "NEW_PROJECT" | "NEW_OFFER"
    private String title;      // Titre affiché dans la cloche
    private String message;    // Message convivial
    private String icon;       // Emoji icon
    private Long   relatedId;  // ID du projet ou de l'offre
    private LocalDateTime timestamp;

    // Factory — nouveau projet (pour tous les freelancers)
    public static NotificationMessage newProject(Long projectId, String projectTitle, String clientName) {
        return NotificationMessage.builder()
                .type("NEW_PROJECT")
                .title("🚀 Nouveau projet disponible !")
                .message(String.format(
                        "%s vient de publier un nouveau projet : « %s ». Consultez-le et soumettez votre offre !",
                        clientName, projectTitle))
                .icon("📁")
                .relatedId(projectId)
                .timestamp(LocalDateTime.now())
                .build();
    }

    // Factory — nouvelle offre (pour le client ID=1)
    public static NotificationMessage newOffer(Long offerId, String projectTitle, String freelancerName, Double amount) {
        return NotificationMessage.builder()
                .type("NEW_OFFER")
                .title("💼 Nouvelle offre reçue !")
                .message(String.format(
                        "%s a soumis une offre de %.0f TND pour votre projet « %s ». Consultez-la dès maintenant !",
                        freelancerName, amount != null ? amount : 0, projectTitle))
                .icon("💼")
                .relatedId(offerId)
                .timestamp(LocalDateTime.now())
                .build();
    }
}