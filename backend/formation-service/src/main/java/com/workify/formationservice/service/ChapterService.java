package com.workify.formationservice.service;

import com.workify.formationservice.domain.Chapter;
import com.workify.formationservice.domain.Formation;
import com.workify.formationservice.repository.ChapterRepository;
import com.workify.formationservice.repository.FormationRepository;
import com.workify.formationservice.web.dto.ChapterRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class ChapterService {

    private final ChapterRepository chapterRepository;
    private final FormationRepository formationRepository;

    public List<Chapter> getChaptersByFormationId(Long formationId) {
        return chapterRepository.findByFormationIdOrderByPositionAsc(formationId);
    }

    @Transactional
    public Chapter createChapter(ChapterRequest request) {
        Formation formation = formationRepository.findById(request.getFormationId())
                .orElseThrow(() -> new RuntimeException("Formation not found"));

        Chapter chapter = Chapter.builder()
                .title(request.getTitle())
                .position(request.getPosition())
                .formation(formation)
                .build();

        return chapterRepository.save(chapter);
    }

    @Transactional
    public Chapter updateChapter(Long id, ChapterRequest request) {
        Chapter chapter = chapterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        chapter.setTitle(request.getTitle());
        chapter.setPosition(request.getPosition());

        return chapterRepository.save(chapter);
    }

    @Transactional
    public void deleteChapter(Long id) {
        chapterRepository.deleteById(id);
    }
}
