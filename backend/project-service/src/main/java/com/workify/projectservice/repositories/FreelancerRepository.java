package com.workify.projectservice.repositories;

import com.workify.projectservice.domains.Freelancer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FreelancerRepository extends JpaRepository<Freelancer, Long> {
    List<Freelancer> findByDisponibiliteTrue();
    Optional<Freelancer> findFirstByEmail(String email);
    Optional<Freelancer> findByUserId(Long userId);
}
