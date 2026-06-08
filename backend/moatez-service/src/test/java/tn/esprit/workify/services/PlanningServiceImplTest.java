package tn.esprit.workify.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.workify.entities.Planning;
import tn.esprit.workify.entities.Projet;
import tn.esprit.workify.repositories.PlanningRepository;
import tn.esprit.workify.repositories.ProjetRepository;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlanningServiceImplTest {

    @Mock PlanningRepository planningRepository;
    @Mock ProjetRepository projetRepository;

    @InjectMocks PlanningServiceImpl service;

    @Test
    void getPlanningById_shouldThrow_whenMissing() {
        when(planningRepository.findById(1)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.getPlanningById(1));
    }

    @Test
    void getPlanningByProjetId_shouldReturnExisting_whenFound() {
        Planning p = Planning.builder().id(2).idProjet(9).build();
        when(planningRepository.findByIdProjet(9)).thenReturn(Optional.of(p));
        Planning res = service.getPlanningByProjetId(9);
        assertSame(p, res);
        verify(planningRepository, never()).save(argThat(x -> x != null && x.getId() == null));
    }

    @Test
    void getPlanningByProjetId_shouldCreate_whenMissing() {
        when(planningRepository.findByIdProjet(9)).thenReturn(Optional.empty());
        when(projetRepository.findById(9)).thenReturn(Optional.of(Projet.builder().id(9).build()));

        when(planningRepository.save(any(Planning.class))).thenAnswer(inv -> {
            Planning p = inv.getArgument(0);
            if (p.getId() == null) p.setId(100);
            return p;
        });

        Planning res = service.getPlanningByProjetId(9);
        assertNotNull(res);
        assertEquals(9, res.getIdProjet());
        assertNotNull(res.getColonnes());
        assertEquals(3, res.getColonnes().size());
    }

    @Test
    void getAllPlannings_shouldDelegate() {
        when(planningRepository.findAll()).thenReturn(List.of());
        assertNotNull(service.getAllPlannings());
    }
}

