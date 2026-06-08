package tn.esprit.workify.services.meeting;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import tn.esprit.workify.entities.Projet;
import tn.esprit.workify.entities.meeting.Meeting;
import tn.esprit.workify.entities.user.Role;
import tn.esprit.workify.entities.user.User;
import tn.esprit.workify.repositories.ProjetRepository;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeetingNotificationServiceTest {

    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock ProjetRepository projetRepository;

    @InjectMocks MeetingNotificationService service;

    @Test
    void notifyReminderToAll_shouldSendToClientAndFreelancerAndBroadcast() {
        User client = User.builder().id(1).role(Role.CLIENT).email("c@x").build();
        User freelancer = User.builder().id(2).role(Role.FREELANCER).email("f@x").build();
        Projet projet = Projet.builder().id(9).client(client).freelancer(freelancer).build();

        Meeting meeting = Meeting.builder()
                .id(7)
                .projetId(9)
                .title("Meet")
                .meetingDate(LocalDateTime.now().plusDays(1))
                .build();

        when(projetRepository.findById(9)).thenReturn(Optional.of(projet));

        service.notifyReminderToAll(meeting);

        verify(messagingTemplate, times(2)).convertAndSendToUser(anyString(), eq("/queue/meeting-notifications"), any());
        verify(messagingTemplate).convertAndSend(eq("/topic/meeting/7/notifications"), any(Object.class));
    }
}
