package tn.esprit.workify.services.meeting;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.workify.entities.meeting.Meeting;
import tn.esprit.workify.repositories.meeting.MeetingRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeetingReminderSchedulerTest {

    @Mock MeetingRepository meetingRepository;
    @Mock MeetingNotificationService meetingNotificationService;

    @InjectMocks MeetingReminderScheduler scheduler;

    @Test
    void sendReminders_shouldNotifyForEachUpcomingMeeting() {
        Meeting m1 = Meeting.builder().id(1).title("A").meetingDate(LocalDateTime.now().plusHours(24)).build();
        Meeting m2 = Meeting.builder().id(2).title("B").meetingDate(LocalDateTime.now().plusHours(24)).build();

        when(meetingRepository.findConfirmedMeetingsInWindow(any(), any(), any())).thenReturn(List.of(m1, m2));

        scheduler.sendReminders();

        verify(meetingNotificationService, times(2)).notifyReminderToAll(any(Meeting.class));
    }
}

