package com.workify.formationservice.service;

import com.workify.formationservice.config.UploadConfig;
import com.workify.formationservice.domain.Chapter;
import com.workify.formationservice.domain.Lesson;
import com.workify.formationservice.repository.ChapterRepository;
import com.workify.formationservice.repository.LessonRepository;
import com.workify.formationservice.web.dto.LessonRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepository;
    private final ChapterRepository chapterRepository;
    private final UploadConfig uploadConfig;

    public List<Lesson> getLessonsByChapterId(Long chapterId) {
        return lessonRepository.findByChapterIdOrderByPositionAsc(chapterId);
    }

    @Transactional
    public Lesson createLesson(LessonRequest request) {
        Chapter chapter = chapterRepository.findById(request.getChapterId())
                .orElseThrow(() -> new RuntimeException("Chapter not found"));

        Lesson lesson = Lesson.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .videoUrl(request.getVideoUrl())
                .position(request.getPosition())
                .chapter(chapter)
                .build();

        return lessonRepository.save(lesson);
    }

    @Transactional
    public Lesson updateLesson(Long id, LessonRequest request) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));

        lesson.setTitle(request.getTitle());
        lesson.setContent(request.getContent());
        lesson.setVideoUrl(request.getVideoUrl());
        lesson.setPosition(request.getPosition());

        return lessonRepository.save(lesson);
    }

    @Transactional
    public void deleteLesson(Long id) {
        Lesson lesson = lessonRepository.findById(id).orElse(null);
        if (lesson != null) {
            deletePdfFile(lesson.getPdfUrl());
        }
        lessonRepository.deleteById(id);
    }

    @Transactional
    public Lesson uploadPdf(Long lessonId, MultipartFile file) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));

        // Delete old PDF if exists
        deletePdfFile(lesson.getPdfUrl());

        // Save new PDF
        String pdfUrl = savePdfFile(file);
        lesson.setPdfUrl(pdfUrl);

        return lessonRepository.save(lesson);
    }

    public byte[] getPdfContent(String filename) throws IOException {
        Path path = Path.of(uploadConfig.getLessonPdfDir()).resolve(filename);
        if (!Files.exists(path)) {
            return null;
        }
        return Files.readAllBytes(path);
    }

    private String savePdfFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            throw new IllegalArgumentException("Only PDF files are allowed");
        }

        String filename = "lesson_" + UUID.randomUUID() + ".pdf";
        Path dir = Path.of(uploadConfig.getLessonPdfDir());
        try {
            if (!Files.exists(dir)) {
                Files.createDirectories(dir);
            }
            Path target = dir.resolve(filename);
            Files.copy(file.getInputStream(), target);
        } catch (IOException e) {
            throw new RuntimeException("Failed to save PDF file", e);
        }

        return "/api/lessons/pdf/" + filename;
    }

    private void deletePdfFile(String pdfUrl) {
        if (pdfUrl == null || pdfUrl.isBlank()) return;
        String filename = pdfUrl.substring(pdfUrl.lastIndexOf('/') + 1);
        Path path = Path.of(uploadConfig.getLessonPdfDir()).resolve(filename);
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Failed to delete old PDF file: {}", path, e);
        }
    }
}
