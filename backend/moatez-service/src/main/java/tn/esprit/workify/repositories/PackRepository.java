package tn.esprit.workify.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.workify.entities.pack.Pack;
import tn.esprit.workify.entities.pack.UserType;

import java.util.List;

public interface PackRepository extends JpaRepository<Pack, Integer> {
    List<Pack> findByUserType(UserType userType);
}
