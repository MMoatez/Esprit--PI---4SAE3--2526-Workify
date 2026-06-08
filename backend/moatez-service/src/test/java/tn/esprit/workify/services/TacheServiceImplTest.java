package tn.esprit.workify.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.workify.entities.Tache;
import tn.esprit.workify.repositories.TacheRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TacheServiceImplTest {

    @Mock TacheRepository tacheRepository;
    @Mock NotificationService notificationService;

    @InjectMocks TacheServiceImpl service;

    @Test
    void getTacheById_shouldThrow_whenMissing() {
        when(tacheRepository.findById(1)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.getTacheById(1));
    }

    @Test
    void moveTacheToColonne_shouldNotify() {
        Tache existing = Tache.builder().id(5).idColonne(1).task("X").build();
        when(tacheRepository.findById(5)).thenReturn(Optional.of(existing));
        when(tacheRepository.save(any(Tache.class))).thenAnswer(inv -> inv.getArgument(0));

        Tache res = service.moveTacheToColonne(5, 99);
        assertEquals(99, res.getIdColonne());
        verify(notificationService).notifyClientIfTaskCompleted(any(Tache.class), eq(99));
    }

    @Test
    void updateTache_shouldNotifyOnlyWhenColumnChanged() {
        Tache existing = Tache.builder().id(5).idColonne(1).task("X").build();
        when(tacheRepository.findById(5)).thenReturn(Optional.of(existing));
        when(tacheRepository.save(any(Tache.class))).thenAnswer(inv -> inv.getArgument(0));

        // column changed
        Tache patch = Tache.builder().task("Y").idColonne(2).build();
        service.updateTache(5, patch);
        verify(notificationService).notifyClientIfTaskCompleted(any(Tache.class), eq(2));

        reset(notificationService);

        // column unchanged
        existing.setIdColonne(2);
        Tache patch2 = Tache.builder().task("Z").idColonne(2).build();
        service.updateTache(5, patch2);
        verifyNoInteractions(notificationService);
    }
}

