package com.workify.projectservice.service;

import com.workify.projectservice.dto.RecommendRequest;
import com.workify.projectservice.dto.RecommendResponse;
import org.springframework.http.*;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;

@Service
public class RecommendationService {

    private final RestTemplate restTemplate;

    public RecommendationService() {
        // Converter Jackson permissif : accepte null Content-Type + application/json
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setSupportedMediaTypes(Arrays.asList(
                MediaType.APPLICATION_JSON,
                MediaType.TEXT_PLAIN,
                MediaType.ALL          // ← corrige "No converter ... Content-Type 'null'"
        ));

        RestTemplate template = new RestTemplate();
        template.getMessageConverters().removeIf(c -> c instanceof MappingJackson2HttpMessageConverter);
        template.getMessageConverters().add(0, converter);
        this.restTemplate = template;
    }

    public RecommendResponse recommend(RecommendRequest request) {
        String url = "http://localhost:8000/recommend";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON)); // ← demande explicitement JSON

        HttpEntity<RecommendRequest> entity = new HttpEntity<>(request, headers);

        ResponseEntity<RecommendResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                RecommendResponse.class
        );

        return response.getBody();
    }
}