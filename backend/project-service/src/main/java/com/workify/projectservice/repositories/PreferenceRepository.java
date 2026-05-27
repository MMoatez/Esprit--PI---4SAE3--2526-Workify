package com.workify.projectservice.repositories;

import com.workify.projectservice.domains.Freelancer;
import com.workify.projectservice.domains.Preference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PreferenceRepository extends JpaRepository<Preference, Long> {
    Optional<Preference> findByFreelancer(Freelancer freelancer);
}
