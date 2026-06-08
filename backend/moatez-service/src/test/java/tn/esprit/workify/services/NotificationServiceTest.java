package tn.esprit.workify.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import tn.esprit.workify.DTO.TaskCompletionNotificationDto;
import tn.esprit.workify.entities.Colonne;
import tn.esprit.workify.entities.Planning;
import tn.esprit.workify.entities.Projet;
import tn.esprit.workify.entities.Tache;
import tn.esprit.workify.entities.user.Role;
import tn.esprit.workify.entities.user.User;
import tn.esprit.workify.repositories.ColonneRepository;
import tn.esprit.workify.repositories.PlanningRepository;
import tn.esprit.workify.repositories.ProjetRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock ColonneRepository colonneRepository;
    @Mock PlanningRepository planningRepository;
    @Mock ProjetRepository projetRepository;

    @InjectMocks NotificationService service;

    @Test
    void isCompletionColonne_shouldDetectDoneVariations() {
        assertTrue(service.isCompletionColonne("Done"));
        assertTrue(service.isCompletionColonne("✅ done"));
        assertTrue(service.isCompletionColonne("Tâches terminées"));
        assertFalse(service.isCompletionColonne("In Progress"));
        assertFalse(service.isCompletionColonne(null));
    }

    @Test
    void notifyClientIfTaskCompleted_shouldSendToUserAndTopic_whenMovedToDone() {
        Tache tache = Tache.builder().id(7).task("Task A").build();

        Colonne colonne = Colonne.builder().id(10).name("Done").idPlanning(20).build();
        Planning planning = Planning.builder().id(20).idProjet(30).build();

        User client = User.builder().id(40).email("c@x.tn").role(Role.CLIENT).firstName("C").lastName("L").build();
        Projet projet = Projet.builder().id(30).name("P1").client(client).build();

        when(colonneRepository.findById(10)).thenReturn(Optional.of(colonne));
        when(planningRepository.findById(20)).thenReturn(Optional.of(planning));
        when(projetRepository.findById(30)).thenReturn(Optional.of(projet));

        service.notifyClientIfTaskCompleted(tache, 10);

        // Vérifie convertAndSendToUser
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSendToUser(eq("40"), eq("/queue/notifications"), payloadCaptor.capture());
        assertTrue(payloadCaptor.getValue() instanceof TaskCompletionNotificationDto);

        // Vérifie broadcast sur topic projet
        verify(messagingTemplate).convertAndSend(eq("/topic/projet/30/notifications"), any(TaskCompletionNotificationDto.class));
    }

    @Test
    void notifyClientIfTaskCompleted_shouldNotSend_whenColonneNotDone() {
        Tache tache = Tache.builder().id(1).task("Task").build();
        Colonne colonne = Colonne.builder().id(10).name("To do").idPlanning(20).build();
        when(colonneRepository.findById(10)).thenReturn(Optional.of(colonne));

        service.notifyClientIfTaskCompleted(tache, 10);

        verifyNoInteractions(messagingTemplate);
        verify(planningRepository, never()).findById(anyInt());
        verify(projetRepository, never()).findById(anyInt());
    }
}

