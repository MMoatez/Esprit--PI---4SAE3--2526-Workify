package tn.esprit.workify.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import tn.esprit.workify.DTO.TaskCompletionNotificationDto;
import tn.esprit.workify.clients.project.ProjectServiceClient;
import tn.esprit.workify.clients.project.RemoteProjectDto;
import tn.esprit.workify.clients.user.RemoteUserDto;
import tn.esprit.workify.clients.user.UserServiceClient;
import tn.esprit.workify.entities.Colonne;
import tn.esprit.workify.entities.Planning;
import tn.esprit.workify.entities.Tache;
import tn.esprit.workify.repositories.ColonneRepository;
import tn.esprit.workify.repositories.PlanningRepository;

import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ColonneRepository colonneRepository;
    private final PlanningRepository planningRepository;
    private final ProjectServiceClient projectServiceClient;
    private final UserServiceClient userServiceClient;

    /**
     * Mots-clés indiquant qu'une colonne représente un état "terminé".
     * La vérification est insensible à la casse et aux accents.
     */
    private static final Set<String> DONE_KEYWORDS = Set.of(
            "done", "terminé", "termine", "terminée", "terminee",
            "fini", "finie", "finished", "completed", "achevé",
            "acheve", "clôturé", "cloture", "fermé", "ferme",
            "resolved", "résolu", "resolu", "closed"
    );

    /**
     * Vérifie si le nom d'une colonne indique un état "terminé".
     */
    public boolean isCompletionColonne(String colonneName) {
        if (colonneName == null) return false;
        String normalized = colonneName.trim().toLowerCase();
        // Vérification exacte
        if (DONE_KEYWORDS.contains(normalized)) return true;
        // Vérification par contenance (ex: "✅ Done", "Tâches terminées")
        for (String keyword : DONE_KEYWORDS) {
            if (normalized.contains(keyword)) return true;
        }
        return false;
    }

    /**
     * Envoie une notification WebSocket au CLIENT propriétaire du projet
     * lorsqu'une tâche est déplacée vers une colonne "terminée".
     */
    public void notifyClientIfTaskCompleted(Tache tache, Integer newColonneId) {
        try {
            // 1. Récupérer la colonne cible
            Optional<Colonne> colonneOpt = colonneRepository.findById(newColonneId);
            if (colonneOpt.isEmpty()) return;

            Colonne colonne = colonneOpt.get();

            // 2. Vérifier si la colonne est une colonne "terminée"
            if (!isCompletionColonne(colonne.getName())) return;

            // 3. Remonter jusqu'au Planning
            Optional<Planning> planningOpt = planningRepository.findById(colonne.getIdPlanning());
            if (planningOpt.isEmpty()) return;

            Planning planning = planningOpt.get();

                RemoteProjectDto projet = projectServiceClient.findProjectById(planning.getIdProjet()).orElse(null);
                if (projet == null || projet.getClientId() == null) {
                log.warn("[Notification] Projet {} introuvable ou sans client.", planning.getIdProjet());
                return;
            }

                Integer clientId = projet.getClientId().intValue();
                RemoteUserDto client = userServiceClient.findUserById(clientId).orElse(null);
                if (client == null || !client.hasRole("CLIENT")) {
                log.warn("[Notification] Le propriétaire du projet {} n'est pas un CLIENT.", projet.getId());
                return;
            }

            TaskCompletionNotificationDto notification = TaskCompletionNotificationDto.build(
                    tache.getTask(),
                    colonne.getName(),
                    projet.getTitle(),
                    projet.getIdAsInteger(),
                    tache.getId(),
                    clientId
            );

            String destination = "/queue/notifications";
            messagingTemplate.convertAndSendToUser(
                    clientId.toString(),
                    destination,
                    notification
            );

            messagingTemplate.convertAndSend(
                    "/topic/projet/" + projet.getIdAsInteger() + "/notifications",
                    notification
            );

                log.info("[Notification] Task '{}' completed, notification sent to client {}.",
                    tache.getTask(), clientId);

        } catch (Exception e) {
            log.error("[Notification] Erreur lors de l'envoi de la notification : {}", e.getMessage(), e);
        }
    }
}

