package tn.esprit.workify.clients.project;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class RemoteProjectDto {
    private Long id;
    private String title;
    private String shortDescription;
    private String detailedDescription;
    private Long clientId;
    private String clientName;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    public Integer getIdAsInteger() {
        return id == null ? null : id.intValue();
    }
}
