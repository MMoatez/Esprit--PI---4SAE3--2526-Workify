package com.workify.formationservice.repository;

import com.workify.formationservice.domain.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {
    List<LessonProgress> findByUserId(String userId);

    Optional<LessonProgress> findByUserIdAndLessonId(String userId, Long lessonId);

    List<LessonProgress> findByUserIdAndLessonChapterFormationId(String userId, Long formationId);
}
