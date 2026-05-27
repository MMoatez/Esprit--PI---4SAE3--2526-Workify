package com.workify.formationservice.web;

import com.workify.formationservice.domain.Lesson;
import com.workify.formationservice.service.LessonService;
import com.workify.formationservice.web.dto.LessonRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/lessons")
@RequiredArgsConstructor
public class LessonController {

    private final LessonService lessonService;

    @GetMapping("/chapter/{chapterId}")
    public ResponseEntity<List<Lesson>> getLessons(@PathVariable Long chapterId) {
        return ResponseEntity.ok(lessonService.getLessonsByChapterId(chapterId));
    }

    @PostMapping
    public ResponseEntity<Lesson> createLesson(@Valid @RequestBody LessonRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(lessonService.createLesson(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Lesson> updateLesson(@PathVariable Long id,
                                                @Valid @RequestBody LessonRequest request) {
        return ResponseEntity.ok(lessonService.updateLesson(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLesson(@PathVariable Long id) {
        lessonService.deleteLesson(id);
        return ResponseEntity.noContent().build();
    }

    /** Upload or replace a PDF for an existing lesson */
    @PostMapping("/{id}/pdf")
    public ResponseEntity<Lesson> uploadPdf(@PathVariable Long id,
                                             @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(lessonService.uploadPdf(id, file));
    }

    /** Serve a stored PDF file */
    @GetMapping("/pdf/{filename}")
    public ResponseEntity<byte[]> getPdf(@PathVariable String filename) throws Exception {
        byte[] content = lessonService.getPdfContent(filename);
        if (content == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .body(content);
    }
}
