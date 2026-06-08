package tn.esprit.workify.DTO;

import lombok.Data;
import tn.esprit.workify.entities.meeting.MeetingStatus;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateMeetingDto {
    private Integer projetId;
    private String title;
    private String description;
    private Integer durationMinutes;
    private Integer createdBy;
    private List<LocalDateTime> proposedDates; // Dates proposées initialement
    private List<Integer> participantIds; // ✅ AJOUTEZ cette ligne
    private Boolean isOnline;
    private String meetingLink;

}