package com.workify.userservice.repository;

import com.workify.userservice.domain.Competence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompetenceRepository extends JpaRepository<Competence, Long> {
    List<Competence> findByUserId(Long userId);
    void deleteByUserIdAndId(Long userId, Long competenceId);
}
