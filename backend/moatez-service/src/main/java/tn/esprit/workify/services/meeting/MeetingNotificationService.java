package tn.esprit.workify.services.meeting;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import tn.esprit.workify.DTO.MeetingNotificationDto;
import tn.esprit.workify.clients.project.ProjectServiceClient;
import tn.esprit.workify.clients.project.RemoteProjectDto;
import tn.esprit.workify.clients.user.RemoteUserDto;
import tn.esprit.workify.clients.user.UserServiceClient;
import tn.esprit.workify.entities.meeting.Meeting;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service responsable d'envoyer les notifications WebSocket (STOMP) liées aux meetings.
 *
 * Destinations utilisées côté client Angular :
 *   - /user/{userId}/queue/meeting-notifications  → notification ciblée par utilisateur
 *   - /topic/meeting/{meetingId}/notifications    → broadcast sur le topic du meeting
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MeetingNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ProjectServiceClient projectServiceClient;
    private final UserServiceClient userServiceClient;

    // ─────────────────────────────────────────────────────────────────────────
    //  CAS 1 : Nouveau meeting proposé par le CLIENT → notifier le FREELANCER
    // ─────────────────────────────────────────────────────────────────────────
    public void notifyFreelancerNewMeetingRequest(Meeting meeting, RemoteUserDto client) {
        try {
            String clientName = client.getFullName();
            List<Integer> recipients = meeting.getParticipantIds() == null
                    ? List.of()
                    : meeting.getParticipantIds().stream()
                    .filter(id -> id != null && !id.equals(meeting.getCreatedByUserId()))
                    .toList();

            for (Integer freelancerId : recipients) {
                RemoteUserDto freelancer = userServiceClient.findUserById(freelancerId).orElse(null);
                if (freelancer == null || !freelancer.hasRole("FREELANCER")) {
                    continue;
                }

                MeetingNotificationDto notification = MeetingNotificationDto.newMeetingRequest(
                        meeting.getId(),
                        meeting.getTitle(),
                        meeting.getProjetId(),
                        freelancerId,
                        clientName
                );
                sendToUser(freelancerId, notification);
                log.info("[MeetingNotif] New meeting notification sent to freelancer {}", freelancerId);
            }

            MeetingNotificationDto broadcast = MeetingNotificationDto.newMeetingRequest(
                    meeting.getId(),
                    meeting.getTitle(),
                    meeting.getProjetId(),
                    null,
                    clientName
            );
            broadcastToMeeting(meeting.getId(), broadcast);

        } catch (Exception e) {
            log.error("[MeetingNotif] Erreur CAS1 : {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CAS 1b : Nouveau meeting proposé par le FREELANCER → notifier le CLIENT
    // ─────────────────────────────────────────────────────────────────────────
    public void notifyClientNewMeetingRequest(Meeting meeting, RemoteUserDto freelancer) {
        try {
            RemoteProjectDto projet = projectServiceClient.findProjectById(meeting.getProjetId()).orElse(null);
            if (projet == null || projet.getClientId() == null) {
                log.warn("[MeetingNotif] Projet/client introuvable pour le meeting {}", meeting.getId());
                return;
            }

            Integer clientId = projet.getClientId().intValue();
            RemoteUserDto client = userServiceClient.findUserById(clientId).orElse(null);
            if (client == null || !client.hasRole("CLIENT")) {
                return;
            }

            String freelancerName = freelancer.getFullName();

            MeetingNotificationDto notification = MeetingNotificationDto.newMeetingRequestByFreelancer(
                    meeting.getId(),
                    meeting.getTitle(),
                    meeting.getProjetId(),
                    clientId,
                    freelancerName
            );

            sendToUser(clientId, notification);
            broadcastToMeeting(meeting.getId(), notification);

        } catch (Exception e) {
            log.error("[MeetingNotif] Erreur CAS1b : {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CAS 1c : CLIENT confirme la proposition du FREELANCER → notifier le FREELANCER
    // ─────────────────────────────────────────────────────────────────────────
    public void notifyFreelancerMeetingConfirmedByClient(Meeting meeting, RemoteUserDto client) {
        try {
            String clientName = client.getFullName();
            if (meeting.getParticipantIds() != null) {
                for (Integer freelancerId : meeting.getParticipantIds()) {
                    RemoteUserDto freelancer = userServiceClient.findUserById(freelancerId).orElse(null);
                    if (freelancer == null || !freelancer.hasRole("FREELANCER")) {
                        continue;
                    }

                    MeetingNotificationDto notification = MeetingNotificationDto.meetingAccepted(
                            meeting.getId(),
                            meeting.getTitle(),
                            meeting.getProjetId(),
                            freelancerId,
                            clientName,
                            meeting.getMeetingDate()
                    );
                    sendToUser(freelancerId, notification);
                }
            }

            broadcastToMeeting(meeting.getId(), MeetingNotificationDto.meetingAccepted(
                    meeting.getId(),
                    meeting.getTitle(),
                    meeting.getProjetId(),
                    null,
                    clientName,
                    meeting.getMeetingDate()
            ));

        } catch (Exception e) {
            log.error("[MeetingNotif] Erreur CAS1c : {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CAS 2a : Meeting accepté (CONFIRMED) → notifier le CLIENT
    // ─────────────────────────────────────────────────────────────────────────
    public void notifyClientMeetingAccepted(Meeting meeting, RemoteUserDto freelancer) {
        try {
            RemoteProjectDto projet = projectServiceClient.findProjectById(meeting.getProjetId()).orElse(null);
            if (projet == null || projet.getClientId() == null) {
                return;
            }

            Integer clientId = projet.getClientId().intValue();

            String freelancerName = freelancer.getFullName();

            MeetingNotificationDto notification = MeetingNotificationDto.meetingAccepted(
                    meeting.getId(),
                    meeting.getTitle(),
                    meeting.getProjetId(),
                    clientId,
                    freelancerName,
                    meeting.getMeetingDate()
            );

            sendToUser(clientId, notification);
            broadcastToMeeting(meeting.getId(), notification);

        } catch (Exception e) {
            log.error("[MeetingNotif] Erreur CAS2a : {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CAS 2b : Meeting refusé (REJECTED) → notifier le CLIENT
    // ─────────────────────────────────────────────────────────────────────────
    public void notifyClientMeetingRejected(Meeting meeting, RemoteUserDto freelancer) {
        try {
            RemoteProjectDto projet = projectServiceClient.findProjectById(meeting.getProjetId()).orElse(null);
            if (projet == null || projet.getClientId() == null) {
                return;
            }

            Integer clientId = projet.getClientId().intValue();

            String freelancerName = freelancer.getFullName();

            MeetingNotificationDto notification = MeetingNotificationDto.meetingRejected(
                    meeting.getId(),
                    meeting.getTitle(),
                    meeting.getProjetId(),
                    clientId,
                    freelancerName
            );

            sendToUser(clientId, notification);
            broadcastToMeeting(meeting.getId(), notification);

        } catch (Exception e) {
            log.error("[MeetingNotif] Erreur CAS2b : {}", e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  CAS 3 : Rappel 24h → notifier CLIENT + FREELANCER
    // ─────────────────────────────────────────────────────────────────────────
    public void notifyReminderToAll(Meeting meeting) {
        try {
            RemoteProjectDto projet = projectServiceClient.findProjectById(meeting.getProjetId()).orElse(null);
            if (projet == null) {
                return;
            }

            LocalDateTime meetingDate = meeting.getMeetingDate();

            if (projet.getClientId() != null) {
                Integer clientId = projet.getClientId().intValue();
                MeetingNotificationDto notifClient = MeetingNotificationDto.reminder24h(
                        meeting.getId(), meeting.getTitle(),
                        meeting.getProjetId(), clientId, meetingDate
                );
                sendToUser(clientId, notifClient);
            }

            if (meeting.getParticipantIds() != null) {
                for (Integer participantId : meeting.getParticipantIds()) {
                    RemoteUserDto participant = userServiceClient.findUserById(participantId).orElse(null);
                    if (participant == null || !participant.hasRole("FREELANCER")) {
                        continue;
                    }
                    MeetingNotificationDto notifFreelancer = MeetingNotificationDto.reminder24h(
                            meeting.getId(), meeting.getTitle(),
                            meeting.getProjetId(), participantId, meetingDate
                    );
                    sendToUser(participantId, notifFreelancer);
                }
            }

            MeetingNotificationDto broadcast = MeetingNotificationDto.reminder24h(
                    meeting.getId(), meeting.getTitle(),
                    meeting.getProjetId(), null, meetingDate
            );
            broadcastToMeeting(meeting.getId(), broadcast);

        } catch (Exception e) {
            log.error("[MeetingNotif] Erreur CAS3 (rappel) pour meeting {} : {}", meeting.getId(), e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Méthodes utilitaires d'envoi WebSocket
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Envoi ciblé à un utilisateur spécifique.
     * Angular s'abonne à : /user/{userId}/queue/meeting-notifications
     */
    private void sendToUser(Integer userId, MeetingNotificationDto notification) {
        if (userId == null) {
            return;
        }
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/meeting-notifications",
                notification
        );
    }

    /**
     * Broadcast sur le topic du meeting (optionnel, pour les dashboards).
     * Angular s'abonne à : /topic/meeting/{meetingId}/notifications
     */
    private void broadcastToMeeting(Integer meetingId, MeetingNotificationDto notification) {
        messagingTemplate.convertAndSend(
                "/topic/meeting/" + meetingId + "/notifications",
                notification
        );
    }
}

