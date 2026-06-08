package tn.esprit.workify.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.workify.entities.ProjectFile;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ProjectFileRepository extends JpaRepository<ProjectFile, Integer> {
    List<ProjectFile> findByProjectIdOrderByUploadedAtDesc(Integer projectId);
    void deleteByProjectId(Integer projectId);

    long countByUploadedByAndUploadedAtAfter(Integer uploadedBy, LocalDateTime uploadedAt);
}