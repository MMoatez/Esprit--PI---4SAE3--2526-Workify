package com.workify.formationservice.service;

import com.workify.formationservice.repository.ChapterRepository;
import com.workify.formationservice.repository.FormationRepository;
import com.workify.formationservice.repository.LessonRepository;
import com.workify.formationservice.web.dto.StatisticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final FormationRepository formationRepository;
    private final ChapterRepository chapterRepository;
    private final LessonRepository lessonRepository;

    public StatisticsResponse getStatistics() {
        return StatisticsResponse.builder()
                .totalFormations(formationRepository.count())
                .totalChapters(chapterRepository.count())
                .totalLessons(lessonRepository.count())
                .build();
    }
}
