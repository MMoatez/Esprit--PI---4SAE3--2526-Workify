package tn.esprit.workify.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.workify.entities.Colonne;

import java.util.List;

@Repository
public interface ColonneRepository extends JpaRepository<Colonne, Integer> {
    List<Colonne> findByIdPlanning(Integer idPlanning);

}
