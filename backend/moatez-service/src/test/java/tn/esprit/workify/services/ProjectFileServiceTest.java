package tn.esprit.workify.services;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import tn.esprit.workify.entities.ProjectFile;
import tn.esprit.workify.repositories.ProjectFileRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectFileServiceTest {

    @Mock ProjectFileRepository projectFileRepository;

    @InjectMocks ProjectFileService service;

    private Path tempDir;

    @AfterEach
    void cleanup() throws IOException {
        if (tempDir != null && Files.exists(tempDir)) {
            // suppression récursive simple
            Files.walk(tempDir)
                    .sorted((a, b) -> b.getNameCount() - a.getNameCount())
                    .forEach(p -> {
                        try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                    });
        }
    }

    @Test
    void uploadFile_shouldCreateFileAndPersistEntity() throws Exception {
        tempDir = Files.createTempDirectory("workify_upload_test_");
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "doc.txt",
                "text/plain",
                "hello".getBytes()
        );

        when(projectFileRepository.save(any(ProjectFile.class))).thenAnswer(inv -> inv.getArgument(0));

        ProjectFile saved = service.uploadFile(9, file, 123);

        assertNotNull(saved);
        assertEquals(9, saved.getProjectId());
        assertEquals("doc.txt", saved.getOriginalFileName());
        assertEquals("text/plain", saved.getFileType());
        assertEquals(123, saved.getUploadedBy());
        assertNotNull(saved.getFileName());
        assertTrue(saved.getFileName().endsWith(".txt"));

        Path written = Path.of(saved.getFilePath());
        assertTrue(Files.exists(written));
        assertEquals("hello", Files.readString(written));

        verify(projectFileRepository).save(any(ProjectFile.class));
    }

    @Test
    void getProjectFiles_shouldDelegateToRepository() {
        when(projectFileRepository.findByProjectIdOrderByUploadedAtDesc(1)).thenReturn(List.of());
        assertNotNull(service.getProjectFiles(1));
        verify(projectFileRepository).findByProjectIdOrderByUploadedAtDesc(1);
    }

    @Test
    void getFileById_shouldThrow_whenMissing() {
        when(projectFileRepository.findById(55)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.getFileById(55));
    }

    @Test
    void deleteFile_shouldDeletePhysicalFileAndDbRow() throws Exception {
        tempDir = Files.createTempDirectory("workify_delete_test_");
        Path f = tempDir.resolve("a.txt");
        Files.writeString(f, "x");

        ProjectFile pf = ProjectFile.builder().id(8).originalFileName("a.txt").filePath(f.toString()).build();
        when(projectFileRepository.findById(8)).thenReturn(Optional.of(pf));

        service.deleteFile(8);

        assertFalse(Files.exists(f));
        verify(projectFileRepository).deleteById(8);
    }
}

