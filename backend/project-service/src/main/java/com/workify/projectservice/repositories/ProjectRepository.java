package com.workify.projectservice.repositories;
import com.workify.projectservice.domains.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByClientId(Long clientId);
    long countByClientEmail(String clientEmail);
    List<Project> findByStatus(String status);
    List<Project> findByClientEmail(String clientEmail);
}
