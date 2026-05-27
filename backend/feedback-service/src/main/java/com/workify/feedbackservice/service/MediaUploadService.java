package com.workify.feedbackservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class MediaUploadService {

    @Value("${feedback.upload.dir:./uploads/feedback}")
    private String uploadDir;

    @Value("${feedback.upload.max-size-mb:20}")
    private long maxSizeMb;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/png", "image/jpeg", "image/gif", "video/mp4"
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".png", ".jpg", ".jpeg", ".gif", ".mp4"
    );

    @PostConstruct
    public void init() throws IOException {
        Path dir = Paths.get(uploadDir);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
            log.info("[MEDIA] Upload directory created: {}", dir.toAbsolutePath());
        }
    }

    /**
     * Saves an uploaded file and returns its public URL path.
     *
     * @throws IllegalArgumentException if type or size validation fails
     */
    public String store(MultipartFile file) {
        validateFile(file);

        String original  = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String extension = getExtension(original).toLowerCase();
        String filename  = UUID.randomUUID() + extension;

        try (InputStream in = file.getInputStream()) {
            Path target = Paths.get(uploadDir).toAbsolutePath().resolve(filename);
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            log.info("[MEDIA] Stored file: {}", filename);
            return "/uploads/feedback/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + e.getMessage(), e);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        long maxBytes = maxSizeMb * 1024 * 1024;
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException(
                    "File too large: " + (file.getSize() / 1024 / 1024) + " MB (max " + maxSizeMb + " MB)");
        }

        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        String ext = getExtension(file.getOriginalFilename() != null ? file.getOriginalFilename() : "").toLowerCase();

        if (!ALLOWED_TYPES.contains(contentType) || !ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException(
                    "Unsupported file type: " + contentType + ". Allowed: PNG, JPG, GIF, MP4");
        }
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }
}
