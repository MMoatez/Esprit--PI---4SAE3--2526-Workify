package tn.esprit.workify.services;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.esprit.workify.entities.Tache;
import tn.esprit.workify.repositories.TacheRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TacheServiceImpl implements ITacheService {

    private final TacheRepository tacheRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public Tache createTache(Tache tache) {
        return tacheRepository.save(tache);
    }

    @Override
    public List<Tache> getAllTaches() {
        return tacheRepository.findAll();
    }

    @Override
    public Tache getTacheById(Integer id) {
        return tacheRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tache non trouvée avec l'id: " + id));
    }

    @Override
    public List<Tache> getTachesByColonneId(Integer idColonne) {
        return tacheRepository.findByIdColonne(idColonne);
    }

    @Override
    @Transactional
    public Tache updateTache(Integer id, Tache tache) {
        Tache existingTache = tacheRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tache non trouvée avec l'id: " + id));

        Integer ancienColonneId = existingTache.getIdColonne();
        existingTache.setTask(tache.getTask());
        existingTache.setIdColonne(tache.getIdColonne());

        Tache saved = tacheRepository.save(existingTache);

        // Notifier si la colonne cible est une colonne "terminée"
        if (tache.getIdColonne() != null && !tache.getIdColonne().equals(ancienColonneId)) {
            notificationService.notifyClientIfTaskCompleted(saved, saved.getIdColonne());
        }

        return saved;
    }

    @Override
    @Transactional
    public Tache moveTacheToColonne(Integer idTache, Integer newIdColonne) {
        Tache tache = tacheRepository.findById(idTache)
                .orElseThrow(() -> new RuntimeException("Tache non trouvée avec l'id: " + idTache));

        tache.setIdColonne(newIdColonne);
        Tache saved = tacheRepository.save(tache);

        // Notifier si la colonne cible est une colonne "terminée"
        notificationService.notifyClientIfTaskCompleted(saved, newIdColonne);

        return saved;
    }

    @Override
    @Transactional
    public void deleteTache(Integer id) {
        if (!tacheRepository.existsById(id)) {
            throw new RuntimeException("Tache non trouvée avec l'id: " + id);
        }
        tacheRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Tache moveTache(Integer id, Integer newColonneId) {
        Tache tache = getTacheById(id);
        tache.setIdColonne(newColonneId);
        Tache saved = tacheRepository.save(tache);

        // Notifier si la colonne cible est une colonne "terminée"
        notificationService.notifyClientIfTaskCompleted(saved, newColonneId);

        return saved;
    }
}


