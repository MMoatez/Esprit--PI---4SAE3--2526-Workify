package com.workify.formationservice.repository;

import com.workify.formationservice.domain.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, Long> {
    List<Chapter> findByFormationIdOrderByPositionAsc(Long formationId);
}
