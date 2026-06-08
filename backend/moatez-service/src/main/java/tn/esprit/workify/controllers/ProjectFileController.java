package tn.esprit.workify.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.esprit.workify.entities.ProjectFile;
import tn.esprit.workify.services.ProjectFileService;
import tn.esprit.workify.services.TaskGenerationService;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProjectFileController {

    private final ProjectFileService projectFileService;
    private final TaskGenerationService taskGenerationService;

    /**
     * Générer des tâches avec l'IA à partir de la description du projet
     */
    @PostMapping("/{projectId}/tasks/generate")
    public ResponseEntity<Map<String, Object>> generateTasks(@PathVariable Integer projectId) {
        try {
            Map<String, Object> result = taskGenerationService.generateTasksForProject(projectId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Upload un fichier
     */
    @PostMapping("/{projectId}/files/upload")
    public ResponseEntity<ProjectFile> uploadFile(
            @PathVariable Integer projectId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("userId") Integer userId) {
        try {
            ProjectFile uploadedFile = projectFileService.uploadFile(projectId, file, userId);
            return ResponseEntity.ok(uploadedFile);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Récupérer tous les fichiers d'un projet
     */
    @GetMapping("/{projectId}/files")
    public ResponseEntity<List<ProjectFile>> getProjectFiles(@PathVariable Integer projectId) {
        try {
            List<ProjectFile> files = projectFileService.getProjectFiles(projectId);
            return ResponseEntity.ok(files);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Télécharger un fichier
     */
    @GetMapping("/files/{fileId}/download")
    public ResponseEntity<Resource> downloadFile(@PathVariable Integer fileId) {
        try {
            ProjectFile projectFile = projectFileService.getFileById(fileId);
            byte[] data = projectFileService.readFile(fileId);

            ByteArrayResource resource = new ByteArrayResource(data);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + projectFile.getOriginalFileName() + "\"")
                    .contentType(MediaType.parseMediaType(projectFile.getFileType()))
                    .contentLength(data.length)
                    .body(resource);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Supprimer un fichier
     */
    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<Void> deleteFile(@PathVariable Integer fileId) {
        try {
            projectFileService.deleteFile(fileId);
            return ResponseEntity.noContent().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}