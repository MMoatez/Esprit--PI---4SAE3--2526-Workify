package tn.esprit.workify.repositories;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.workify.entities.Tache;

import java.util.List;

@Repository
public interface TacheRepository extends JpaRepository<Tache, Integer> {
    List<Tache> findByIdColonne(Integer idColonne);
}
