package com.workify.projectservice.weeb;

import com.workify.projectservice.domains.Project;
import com.workify.projectservice.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    // CREATE
    @PostMapping
    public Project create(@RequestBody Project project) {
        return projectService.create(project);
    }

    // READ ALL
    @GetMapping
    public List<Project> getAll() {
        return projectService.getAll();
    }

    // READ BY CLIENT EMAIL
    @GetMapping("/my")
    public List<Project> getByClientEmail(@RequestParam String clientEmail) {
        return projectService.getByClientEmail(clientEmail);
    }

    // READ BY CLIENT ID (user-service numeric ID)
    @GetMapping("/my-by-client-id")
    public List<Project> getByClientId(@RequestParam Long clientId) {
        return projectService.getByClientId(clientId);
    }

    // READ ONE
    @GetMapping("/{id}")
    public Project getById(@PathVariable Long id) {
        return projectService.getById(id);
    }

    // UPDATE
    @PutMapping("/{id}")
    public Project update(@PathVariable Long id, @RequestBody Project project) {
        return projectService.update(id, project);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
