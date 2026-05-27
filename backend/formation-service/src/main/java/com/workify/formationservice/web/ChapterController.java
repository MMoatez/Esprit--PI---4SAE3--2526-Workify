package com.workify.formationservice.web;

import com.workify.formationservice.domain.Chapter;
import com.workify.formationservice.service.ChapterService;
import com.workify.formationservice.web.dto.ChapterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chapters")
@RequiredArgsConstructor
public class ChapterController {

    private final ChapterService chapterService;

    @GetMapping("/formation/{formationId}")
    public ResponseEntity<List<Chapter>> getChapters(@PathVariable Long formationId) {
        return ResponseEntity.ok(chapterService.getChaptersByFormationId(formationId));
    }

    @PostMapping
    public ResponseEntity<Chapter> createChapter(@Valid @RequestBody ChapterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chapterService.createChapter(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Chapter> updateChapter(@PathVariable Long id, @Valid @RequestBody ChapterRequest request) {
        return ResponseEntity.ok(chapterService.updateChapter(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChapter(@PathVariable Long id) {
        chapterService.deleteChapter(id);
        return ResponseEntity.noContent().build();
    }
}
