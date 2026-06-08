package tn.esprit.workify.services;

import tn.esprit.workify.entities.Colonne;

import java.util.List;

public interface IColonneService {
    Colonne createColonne(Colonne colonne);
    List<Colonne> getAllColonnes();
    Colonne getColonneById(Integer id);
    List<Colonne> getColonnesByPlanningId(Integer idPlanning);
    Colonne updateColonne(Integer id, Colonne colonne);
    void deleteColonne(Integer id);
}
