package tn.esprit.workify.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tn.esprit.workify.clients.project.ProjectServiceClient;
import tn.esprit.workify.entities.ProjectFile;
import tn.esprit.workify.repositories.ProjectFileRepository;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectFileService {

    private final ProjectFileRepository projectFileRepository;
    private final ProjectServiceClient projectServiceClient;

    @Value("${file.upload.dir:uploads/projects}")
    private String uploadDir;

    /**
     * Upload un fichier pour un projet
     */
    public ProjectFile uploadFile(Integer projectId, MultipartFile file, Integer userId) throws IOException {
        ensureProjectExists(projectId);

        // Créer le répertoire s'il n'existe pas
        Path uploadPath = Paths.get(uploadDir, projectId.toString());
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Générer un nom de fichier unique
        String originalFileName = file.getOriginalFilename();
        String fileExtension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String uniqueFileName = UUID.randomUUID().toString() + fileExtension;

        // Sauvegarder le fichier
        Path filePath = uploadPath.resolve(uniqueFileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        log.info("✅ File uploaded: {} (original: {})", uniqueFileName, originalFileName);

        // Créer l'entrée en base de données
        ProjectFile projectFile = ProjectFile.builder()
                .projectId(projectId)
                .fileName(uniqueFileName)
                .originalFileName(originalFileName)
                .filePath(filePath.toString())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .uploadedBy(userId)
                .uploadedAt(LocalDateTime.now())
                .build();

        return projectFileRepository.save(projectFile);
    }

    /**
     * Récupérer tous les fichiers d'un projet
     */
    public List<ProjectFile> getProjectFiles(Integer projectId) {
        ensureProjectExists(projectId);
        return projectFileRepository.findByProjectIdOrderByUploadedAtDesc(projectId);
    }

    /**
     * Récupérer un fichier par ID
     */
    public ProjectFile getFileById(Integer fileId) {
        return projectFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
    }

    /**
     * Supprimer un fichier
     */
    public void deleteFile(Integer fileId) throws IOException {
        ProjectFile projectFile = getFileById(fileId);

        // Supprimer le fichier physique
        Path filePath = Paths.get(projectFile.getFilePath());
        Files.deleteIfExists(filePath);

        // Supprimer l'entrée en base de données
        projectFileRepository.deleteById(fileId);

        log.info("✅ File deleted: {}", projectFile.getOriginalFileName());
    }

    /**
     * Lire le contenu d'un fichier
     */
    public byte[] readFile(Integer fileId) throws IOException {
        ProjectFile projectFile = getFileById(fileId);
        ensureProjectExists(projectFile.getProjectId());
        Path filePath = Paths.get(projectFile.getFilePath());
        return Files.readAllBytes(filePath);
    }

    private void ensureProjectExists(Integer projectId) {
        if (projectId == null) {
            throw new RuntimeException("Project id is required");
        }
        projectServiceClient.getRequiredProject(projectId);
    }
}