package tn.esprit.workify.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.workify.clients.project.ProjectServiceClient;
import tn.esprit.workify.entities.Colonne;
import tn.esprit.workify.entities.Planning;
import tn.esprit.workify.repositories.PlanningRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanningServiceImpl implements IPlanningService {

    private final PlanningRepository planningRepository;
    private final ProjectServiceClient projectServiceClient;

    @Override
    @Transactional
    public Planning createPlanning(Planning planning) {
        projectServiceClient.getRequiredProject(planning.getIdProjet());

        Planning savedPlanning = planningRepository.save(planning);

        if (savedPlanning.getColonnes() == null || savedPlanning.getColonnes().isEmpty()) {
            createDefaultColumns(savedPlanning);
        }

        return planningRepository.save(savedPlanning);
    }

    @Override
    public List<Planning> getAllPlannings() {
        return planningRepository.findAll();
    }

    @Override
    public Planning getPlanningById(Integer id) {
        return planningRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Planning non trouvé avec l'id: " + id));
    }

    @Override
    @Transactional
    public Planning getPlanningByProjetId(Integer projetId) {
        return planningRepository.findByIdProjet(projetId)
                .map(existingPlanning -> {
                    if (existingPlanning.getColonnes() == null || existingPlanning.getColonnes().isEmpty()) {
                        createDefaultColumns(existingPlanning);
                        return planningRepository.save(existingPlanning);
                    }
                    return existingPlanning;
                })
                .orElseGet(() -> {
                projectServiceClient.getRequiredProject(projetId);


                    Planning newPlanning = Planning.builder()
                            .idProjet(projetId)
                            .creationDate(LocalDateTime.now())
                            .colonnes(new ArrayList<>())
                            .build();

                    Planning savedPlanning = planningRepository.save(newPlanning);


                    createDefaultColumns(savedPlanning);

                    return planningRepository.save(savedPlanning);
                });
    }

    @Override
    public Planning updatePlanning(Integer id, Planning planning) {
        Planning existing = getPlanningById(id);
        existing.setIdProjet(planning.getIdProjet());
        return planningRepository.save(existing);
    }

    @Override
    @Transactional
    public void deletePlanning(Integer id) {
        planningRepository.deleteById(id);
    }


    private void createDefaultColumns(Planning planning) {
        if (planning.getColonnes() != null && !planning.getColonnes().isEmpty()) {
            return;
        }

        List<Colonne> defaultColumns = new ArrayList<>();


        Colonne todoColumn = Colonne.builder()
                .name("To do")
                .description("This item hasn't been started")
                .color("#10B981") // Green
                .idPlanning(planning.getId())
                .planning(planning)
                .taches(new ArrayList<>())
                .build();
        defaultColumns.add(todoColumn);


        Colonne inProgressColumn = Colonne.builder()
                .name("In Progress")
                .description("This is actively being worked on")
                .color("#F59E0B") // Orange
                .idPlanning(planning.getId())
                .planning(planning)
                .taches(new ArrayList<>())
                .build();
        defaultColumns.add(inProgressColumn);


        Colonne doneColumn = Colonne.builder()
                .name("Done")
                .description("This has been completed")
                .color("#3B82F6") // Blue
                .idPlanning(planning.getId())
                .planning(planning)
                .taches(new ArrayList<>())
                .build();
        defaultColumns.add(doneColumn);

        planning.setColonnes(defaultColumns);
    }
}