package com.workify.formationservice.repository;

import com.workify.formationservice.domain.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, Long> {
    List<Lesson> findByChapterIdOrderByPositionAsc(Long chapterId);

    long countByChapterFormationId(Long formationId);
}
