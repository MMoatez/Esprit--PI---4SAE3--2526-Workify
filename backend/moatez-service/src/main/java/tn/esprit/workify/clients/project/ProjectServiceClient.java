package tn.esprit.workify.clients.project;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class ProjectServiceClient {

    private final RestTemplate restTemplate;

    public ProjectServiceClient(@Qualifier("directRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Value("${services.project-service.base-url:http://project-service}")
    private String projectServiceBaseUrl;

    public Optional<RemoteProjectDto> findProjectById(Integer projectId) {
        if (projectId == null) {
            return Optional.empty();
        }

        String url = projectServiceBaseUrl + "/api/projects/{id}";
        try {
            return Optional.ofNullable(restTemplate.getForObject(url, RemoteProjectDto.class, projectId));
        } catch (HttpClientErrorException.NotFound ex) {
            return Optional.empty();
        } catch (RestClientException ex) {
            log.warn("Project-service unavailable for projectId {}: {}", projectId, ex.getMessage());
            return Optional.empty();
        }
    }

    public RemoteProjectDto getRequiredProject(Integer projectId) {
        return findProjectById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found in project-service: " + projectId));
    }

    public long countClientProjectsSince(Integer clientId, LocalDateTime threshold) {
        if (clientId == null || threshold == null) {
            return 0;
        }

        List<RemoteProjectDto> projects = getProjectsByClientId(clientId.longValue());
        return projects.stream()
                .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(threshold))
                .count();
    }

    public List<RemoteProjectDto> getProjectsByClientId(Long clientId) {
        if (clientId == null) {
            return Collections.emptyList();
        }

        String url = projectServiceBaseUrl + "/api/projects/my-by-client-id?clientId={clientId}";
        try {
            ResponseEntity<List<RemoteProjectDto>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<>() {},
                    clientId
            );
            List<RemoteProjectDto> body = response.getBody();
            return body == null ? Collections.emptyList() : body;
        } catch (RestClientException ex) {
            log.warn("Project-service unavailable for clientId {}: {}", clientId, ex.getMessage());
            return Collections.emptyList();
        }
    }
}
