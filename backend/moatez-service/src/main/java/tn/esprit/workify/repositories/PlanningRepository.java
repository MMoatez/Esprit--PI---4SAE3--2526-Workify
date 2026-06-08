package tn.esprit.workify.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.workify.entities.Planning;

import java.util.Optional;

@Repository
public interface PlanningRepository extends JpaRepository<Planning, Integer> {
    Optional<Planning> findByIdProjet(Integer idProjet);
    
}
