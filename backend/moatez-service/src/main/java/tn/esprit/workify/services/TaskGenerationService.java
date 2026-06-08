package tn.esprit.workify.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.workify.clients.project.ProjectServiceClient;
import tn.esprit.workify.clients.project.RemoteProjectDto;
import tn.esprit.workify.entities.Colonne;
import tn.esprit.workify.entities.Planning;
import tn.esprit.workify.entities.Tache;
import tn.esprit.workify.services.ai.AiService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskGenerationService {

    private final ProjectServiceClient projectServiceClient;
    private final IPlanningService planningService;
    private final ITacheService tacheService;
    private final AiService aiService;

    @Transactional
    public Map<String, Object> generateTasksForProject(Integer projectId) {
        RemoteProjectDto project = projectServiceClient.getRequiredProject(projectId);

        String description = buildProjectDescription(project);
        if (description.isBlank()) {
            throw new RuntimeException("Project has no description to generate tasks from");
        }

        List<String> taskTitles = aiService.extractTasksFromDescription(description);
        if (taskTitles.isEmpty()) {
            throw new RuntimeException("Could not generate tasks from project description");
        }

        Planning planning = planningService.getPlanningByProjetId(projectId);
        Colonne todoColumn = findTodoColumn(planning);

        List<Tache> createdTasks = new ArrayList<>();
        for (String taskTitle : taskTitles) {
            Tache tache = Tache.builder()
                    .task(taskTitle)
                    .idColonne(todoColumn.getId())
                    .build();
            createdTasks.add(tacheService.createTache(tache));
        }

        log.info("Generated {} tasks for project {}", createdTasks.size(), projectId);
        return Map.of(
                "message", createdTasks.size() + " tasks generated successfully",
                "tasksGenerated", createdTasks.size()
        );
    }

    private String buildProjectDescription(RemoteProjectDto project) {
        if (project.getDetailedDescription() != null && !project.getDetailedDescription().isBlank()) {
            return project.getDetailedDescription().trim();
        }

        StringBuilder description = new StringBuilder();
        if (project.getTitle() != null && !project.getTitle().isBlank()) {
            description.append(project.getTitle().trim());
        }
        if (project.getShortDescription() != null && !project.getShortDescription().isBlank()) {
            if (!description.isEmpty()) {
                description.append("\n");
            }
            description.append(project.getShortDescription().trim());
        }
        return description.toString();
    }

    private Colonne findTodoColumn(Planning planning) {
        return planning.getColonnes().stream()
                .filter(column -> {
                    String name = column.getName();
                    return name != null && name.equalsIgnoreCase("To do");
                })
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Todo column not found in planning"));
    }
}
