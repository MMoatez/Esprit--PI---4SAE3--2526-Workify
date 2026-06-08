package tn.esprit.workify.services;


import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.esprit.workify.entities.Colonne;
import tn.esprit.workify.repositories.ColonneRepository;
import tn.esprit.workify.repositories.PlanningRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ColonneServiceImpl implements IColonneService {
    private final ColonneRepository colonneRepository;
    private final PlanningRepository planningRepository;

    @Override
    @Transactional
    public Colonne createColonne(Colonne colonne) {
        if (colonne.getIdPlanning() == null) {
            throw new RuntimeException("idPlanning is required");
        }

        planningRepository.findById(colonne.getIdPlanning())
                .orElseThrow(() -> new RuntimeException("Planning non trouvé avec l'id: " + colonne.getIdPlanning()));

        return colonneRepository.save(colonne);
    }

    @Override
    public List<Colonne> getAllColonnes() {
        return colonneRepository.findAll();
    }

    @Override
    public Colonne getColonneById(Integer id) {
        return colonneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne non trouvée avec l'id: " + id));
    }

    @Override
    public List<Colonne> getColonnesByPlanningId(Integer idPlanning) {
        return colonneRepository.findByIdPlanning(idPlanning);
    }

    @Override
    @Transactional
    public Colonne updateColonne(Integer id, Colonne colonne) {
        Colonne existingColonne = colonneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colonne non trouvée avec l'id: " + id));

        existingColonne.setName(colonne.getName());
        existingColonne.setColor(colonne.getColor());
        existingColonne.setDescription(colonne.getDescription());

        if (colonne.getIdPlanning() != null) {
            existingColonne.setIdPlanning(colonne.getIdPlanning());
        }

        return colonneRepository.save(existingColonne);
    }

    @Override
    @Transactional
    public void deleteColonne(Integer id) {
        if (!colonneRepository.existsById(id)) {
            throw new RuntimeException("Colonne non trouvée avec l'id: " + id);
        }
        colonneRepository.deleteById(id);
    }
}
