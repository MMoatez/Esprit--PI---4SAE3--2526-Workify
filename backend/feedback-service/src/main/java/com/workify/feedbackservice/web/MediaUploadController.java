package com.workify.feedbackservice.web;

import com.workify.feedbackservice.service.MediaUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/feedback/media")
@RequiredArgsConstructor
public class MediaUploadController {

    private final MediaUploadService mediaUploadService;

    /**
     * POST /api/feedback/media/upload
     * Accepts a single multipart file (PNG, JPG, GIF, MP4 — max 20 MB).
     * Returns { "url": "/uploads/feedback/{uuid}.ext" }
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        String url = mediaUploadService.store(file);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
