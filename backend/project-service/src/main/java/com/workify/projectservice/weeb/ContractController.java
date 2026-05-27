package com.workify.projectservice.weeb;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/contract")
@CrossOrigin(origins = "http://localhost:4200")
public class ContractController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper  = new ObjectMapper();

    @Value("${fastapi.url:http://localhost:8000}")
    private String fastapiUrl;

    /**
     * POST /api/contract/generate
     * Proxifie la requête vers FastAPI /generate-contract
     * et retourne le PDF au frontend Angular.
     */
    @PostMapping("/generate")
    public ResponseEntity<byte[]> generateContract(
            @RequestBody Map<String, Object> contractRequest) {

        try {
            String url = fastapiUrl + "/generate-contract";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String jsonBody = objectMapper.writeValueAsString(contractRequest);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<byte[]> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    byte[].class
            );

            // Récupère le nom de fichier depuis FastAPI ou en génère un
            String contentDisposition = "attachment; filename=contrat.pdf";
            if (response.getHeaders().getContentDisposition() != null) {
                contentDisposition = response.getHeaders()
                        .getFirst(HttpHeaders.CONTENT_DISPOSITION);
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                    .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS,
                            HttpHeaders.CONTENT_DISPOSITION)
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(response.getBody());

        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(("Erreur génération contrat : " + e.getMessage()).getBytes());
        }
    }
}
