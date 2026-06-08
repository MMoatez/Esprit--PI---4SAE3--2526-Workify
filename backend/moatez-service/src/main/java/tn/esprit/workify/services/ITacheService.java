package tn.esprit.workify.services;

import tn.esprit.workify.entities.Tache;
import java.util.List;

public interface ITacheService {
    Tache createTache(Tache tache);
    List<Tache> getAllTaches();
    Tache getTacheById(Integer id);
    List<Tache> getTachesByColonneId(Integer idColonne);
    Tache updateTache(Integer id, Tache tache);
    Tache moveTacheToColonne(Integer idTache, Integer newIdColonne);
    void deleteTache(Integer id);
    Tache moveTache(Integer id, Integer newColonneId);
}
