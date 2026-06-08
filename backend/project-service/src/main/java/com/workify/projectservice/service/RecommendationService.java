package com.workify.projectservice.service;

import com.workify.projectservice.dto.RecommendRequest;
import com.workify.projectservice.dto.RecommendResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@Slf4j
public class RecommendationService {

    private final RestTemplate restTemplate;
    private final String recommendUrl;

    public RecommendationService(
            @Value("${recommendation.service.url:http://localhost:8000}") String baseUrl,
            @Value("${recommendation.service.path:/recommend}") String path) {
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setSupportedMediaTypes(Arrays.asList(
                MediaType.APPLICATION_JSON,
                MediaType.TEXT_PLAIN,
                MediaType.ALL
        ));

        RestTemplate template = new RestTemplate();
        template.getMessageConverters().removeIf(c -> c instanceof MappingJackson2HttpMessageConverter);
        template.getMessageConverters().add(0, converter);
        this.restTemplate = template;
        this.recommendUrl = baseUrl.replaceAll("/+$", "") + path;
    }

    public RecommendResponse recommend(RecommendRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        HttpEntity<RecommendRequest> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<RecommendResponse> response = restTemplate.exchange(
                    recommendUrl,
                    HttpMethod.POST,
                    entity,
                    RecommendResponse.class
            );
            return response.getBody() != null ? response.getBody() : emptyResponse();
        } catch (RestClientException ex) {
            log.warn("Recommendation service unavailable at {}: {}", recommendUrl, ex.getMessage());
            return emptyResponse();
        }
    }

    private RecommendResponse emptyResponse() {
        RecommendResponse response = new RecommendResponse();
        response.setInterfacesRecommandees(Collections.emptyList());
        response.setPalettesRecommandees(Collections.emptyList());
        response.setProjetsSimilaires(Collections.emptyList());
        response.setWebProjectsSimilaires(Collections.emptyList());
        return response;
    }
}
