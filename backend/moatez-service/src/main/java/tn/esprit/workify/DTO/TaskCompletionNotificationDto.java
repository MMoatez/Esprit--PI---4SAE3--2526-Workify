package tn.esprit.workify.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskCompletionNotificationDto {

    private String type;           // "TASK_COMPLETED"
    private String message;        // Message lisible
    private String taskName;       // Nom de la tâche
    private String colonneName;    // Nom de la colonne (Done, Terminé, ...)
    private String projetName;     // Nom du projet
    private Integer projetId;      // ID du projet
    private Integer taskId;        // ID de la tâche
    private Integer clientId;      // ID du client (propriétaire du projet)
    private LocalDateTime timestamp;

    public static TaskCompletionNotificationDto build(
            String taskName,
            String colonneName,
            String projetName,
            Integer projetId,
            Integer taskId,
            Integer clientId) {
        return TaskCompletionNotificationDto.builder()
                .type("TASK_COMPLETED")
                .message(String.format(
                        "✅ La tâche \"%s\" a été déplacée vers \"%s\" dans le projet \"%s\".",
                        taskName, colonneName, projetName))
                .taskName(taskName)
                .colonneName(colonneName)
                .projetName(projetName)
                .projetId(projetId)
                .taskId(taskId)
                .clientId(clientId)
                .timestamp(LocalDateTime.now())
                .build();
    }
}

