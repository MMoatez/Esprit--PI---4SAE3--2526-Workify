package tn.esprit.workify.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.workify.DTO.CreateProjetDto;
import tn.esprit.workify.entities.Colonne;
import tn.esprit.workify.entities.Planning;
import tn.esprit.workify.entities.Projet;
import tn.esprit.workify.entities.user.User;
import tn.esprit.workify.repositories.*;
import tn.esprit.workify.services.ai.AiService;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjetServiceImplTest {

    @Mock ProjetRepository projetRepository;
    @Mock UserRepository userRepository;
    @Mock PlanningRepository planningRepository;
    @Mock ColonneRepository colonneRepository;
    @Mock TacheRepository tacheRepository;
    @Mock AiService aiService;

    @InjectMocks ProjetServiceImpl service;

    @Test
    void createProjet_shouldCreatePlanningAndDefaultColumns() {
        CreateProjetDto dto = new CreateProjetDto();
        dto.setName("P");
        dto.setDescription("D");
        dto.setClientId(1);

        when(userRepository.findById(1)).thenReturn(Optional.of(User.builder().id(1).build()));

        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> {
            Projet p = inv.getArgument(0);
            p.setId(10);
            return p;
        });

        when(planningRepository.save(any(Planning.class))).thenAnswer(inv -> {
            Planning p = inv.getArgument(0);
            if (p.getId() == null) p.setId(20);
            return p;
        });

        Projet res = service.createProjet(dto);

        assertNotNull(res);
        assertEquals(10, res.getId());
        verify(planningRepository).save(any(Planning.class));

        ArgumentCaptor<Iterable<Colonne>> captor = ArgumentCaptor.forClass(Iterable.class);
        verify(colonneRepository).saveAll(captor.capture());

        List<Colonne> cols = new ArrayList<>();
        captor.getValue().forEach(cols::add);
        assertEquals(3, cols.size());
    }

    @Test
    void getMyProjects_shouldDelegate() {
        when(projetRepository.findByClientIdOrFreelancerId(1, 1)).thenReturn(List.of());
        assertNotNull(service.getMyProjects(1));
        verify(projetRepository).findByClientIdOrFreelancerId(1, 1);
    }
}
