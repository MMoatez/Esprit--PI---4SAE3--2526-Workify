package tn.esprit.workify.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingNotificationDto {

    /** Type d'événement : NEW_MEETING_REQUEST | NEW_MEETING_REQUEST_BY_FREELANCER | MEETING_ACCEPTED | MEETING_REJECTED | MEETING_REMINDER */
    private String type;

    /** Message affiché à l'utilisateur */
    private String message;

    /** Titre du meeting */
    private String meetingTitle;

    /** ID du meeting concerné */
    private Integer meetingId;

    /** ID du projet concerné */
    private Integer projetId;

    /** ID du destinataire (pour filtrage côté front) */
    private Integer recipientId;

    /** Date du meeting (utile pour le rappel) */
    private LocalDateTime meetingDate;

    /** Date/heure d'envoi de la notification */
    private LocalDateTime timestamp;

    // ─── Factories ───────────────────────────────────────────────────────────

    /** Cas 1 : Notification au FREELANCER → nouveau meeting proposé par le CLIENT */
    public static MeetingNotificationDto newMeetingRequest(
            Integer meetingId, String meetingTitle, Integer projetId,
            Integer freelancerId, String clientName) {
        return MeetingNotificationDto.builder()
                .type("NEW_MEETING_REQUEST")
                .message("📅 " + clientName + " vous a proposé un nouveau meeting : \"" + meetingTitle + "\".")
                .meetingTitle(meetingTitle)
                .meetingId(meetingId)
                .projetId(projetId)
                .recipientId(freelancerId)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /** Cas 1b : Notification au CLIENT → nouveau meeting proposé par le FREELANCER */
    public static MeetingNotificationDto newMeetingRequestByFreelancer(
            Integer meetingId, String meetingTitle, Integer projetId,
            Integer clientId, String freelancerName) {
        return MeetingNotificationDto.builder()
                .type("NEW_MEETING_REQUEST_BY_FREELANCER")
                .message("📅 " + freelancerName + " vous a proposé un nouveau meeting : \"" + meetingTitle + "\". Veuillez confirmer ou refuser.")
                .meetingTitle(meetingTitle)
                .meetingId(meetingId)
                .projetId(projetId)
                .recipientId(clientId)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /** Cas 2a : Notification au CLIENT → meeting accepté par le FREELANCER */
    public static MeetingNotificationDto meetingAccepted(
            Integer meetingId, String meetingTitle, Integer projetId,
            Integer clientId, String freelancerName, LocalDateTime meetingDate) {
        return MeetingNotificationDto.builder()
                .type("MEETING_ACCEPTED")
                .message("✅ " + freelancerName + " a accepté votre meeting : \"" + meetingTitle + "\".")
                .meetingTitle(meetingTitle)
                .meetingId(meetingId)
                .projetId(projetId)
                .recipientId(clientId)
                .meetingDate(meetingDate)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /** Cas 2b : Notification au CLIENT → meeting refusé par le FREELANCER */
    public static MeetingNotificationDto meetingRejected(
            Integer meetingId, String meetingTitle, Integer projetId,
            Integer clientId, String freelancerName) {
        return MeetingNotificationDto.builder()
                .type("MEETING_REJECTED")
                .message("❌ " + freelancerName + " a refusé votre meeting : \"" + meetingTitle + "\".")
                .meetingTitle(meetingTitle)
                .meetingId(meetingId)
                .projetId(projetId)
                .recipientId(clientId)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /** Cas 3 : Rappel 24h avant — envoyé à un utilisateur (client ou freelancer) */
    public static MeetingNotificationDto reminder24h(
            Integer meetingId, String meetingTitle, Integer projetId,
            Integer recipientId, LocalDateTime meetingDate) {
        return MeetingNotificationDto.builder()
                .type("MEETING_REMINDER")
                .message("⏰ Rappel : votre meeting \"" + meetingTitle
                        + "\" est prévu dans moins de 24 heures (" + meetingDate + ").")
                .meetingTitle(meetingTitle)
                .meetingId(meetingId)
                .projetId(projetId)
                .recipientId(recipientId)
                .meetingDate(meetingDate)
                .timestamp(LocalDateTime.now())
                .build();
    }
}

