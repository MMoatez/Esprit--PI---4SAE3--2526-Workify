package tn.esprit.workify.clients.user;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Component
@Slf4j
public class UserServiceClient {

    private final RestTemplate restTemplate;

    public UserServiceClient(@Qualifier("directRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Value("${services.user-service.base-url:http://localhost:8081}")
    private String userServiceBaseUrl;

    public Optional<RemoteUserDto> findUserById(Integer userId) {
        if (userId == null) {
            return Optional.empty();
        }

        String url = userServiceBaseUrl + "/api/public/users/{id}";
        try {
            return Optional.ofNullable(restTemplate.getForObject(url, RemoteUserDto.class, userId));
        } catch (HttpClientErrorException.NotFound ex) {
            return Optional.empty();
        } catch (RestClientException | IllegalStateException ex) {
            log.warn("User-service unavailable for userId {}: {}", userId, ex.getMessage());
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le service utilisateur est indisponible. Démarrez user-service sur le port 8081.");
        }
    }

    public RemoteUserDto getRequiredUser(Integer userId) {
        return findUserById(userId)
                .orElseThrow(() -> new RuntimeException("User not found in user-service: " + userId));
    }
}
