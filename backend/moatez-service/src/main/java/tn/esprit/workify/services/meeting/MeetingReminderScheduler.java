package tn.esprit.workify.services.meeting;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tn.esprit.workify.entities.meeting.Meeting;
import tn.esprit.workify.entities.meeting.MeetingStatus;
import tn.esprit.workify.repositories.meeting.MeetingRepository;

import java.time.LocalDateTime;
import java.util.List;


@Component
@RequiredArgsConstructor
@Slf4j
public class MeetingReminderScheduler {

    private final MeetingRepository meetingRepository;
    private final MeetingNotificationService meetingNotificationService;


    @Scheduled(fixedDelay = 1000)
    public void sendReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowStart = now.plusHours(24);
        LocalDateTime windowEnd   = now.plusHours(24).plusSeconds(1);

       // log.info("[MeetingReminder] 🔍 Vérification des rappels entre {} et {}", windowStart, windowEnd);

        List<Meeting> upcomingMeetings = meetingRepository.findConfirmedMeetingsInWindow(
                MeetingStatus.CONFIRMED,
                windowStart,
                windowEnd
        );

        if (upcomingMeetings.isEmpty()) {
            //log.info("[MeetingReminder] Aucun meeting à rappeler dans cette fenêtre");
            return;
        }

        //log.info("[MeetingReminder] ⏰ {} meeting(s) à rappeler.", upcomingMeetings.size());

        for (Meeting meeting : upcomingMeetings) {
            log.info("[MeetingReminder] → Envoi rappel pour meeting '{}' (id={}) prévu le {}",
                    meeting.getTitle(), meeting.getId(), meeting.getMeetingDate());
            meetingNotificationService.notifyReminderToAll(meeting);
        }
    }
}

