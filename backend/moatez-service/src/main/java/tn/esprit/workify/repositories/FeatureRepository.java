package tn.esprit.workify.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.workify.entities.pack.Feature;

import java.util.List;

public interface FeatureRepository extends JpaRepository<Feature, Integer> {
    List<Feature> findByPackId(Integer packId);
}
