package com.workify.formationservice.repository;

import com.workify.formationservice.domain.QuizResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QuizResultRepository extends JpaRepository<QuizResult, Long> {
    List<QuizResult> findByUserIdAndFormationId(String userId, Long formationId);
}
