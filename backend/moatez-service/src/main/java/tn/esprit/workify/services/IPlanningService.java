package tn.esprit.workify.services;

import tn.esprit.workify.entities.Planning;
import java.util.List;

public interface IPlanningService {
    Planning createPlanning(Planning planning);
    List<Planning> getAllPlannings();
    Planning getPlanningById(Integer id);
    Planning getPlanningByProjetId(Integer idProjet);
    Planning updatePlanning(Integer id, Planning planning);
    void deletePlanning(Integer id);
}
