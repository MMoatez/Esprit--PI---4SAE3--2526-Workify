package com.workify.projectservice.weeb;

import com.workify.projectservice.service.ContractPdfService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/contract")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
@Slf4j
public class ContractController {

    private final ContractPdfService contractPdfService;

    @PostMapping("/generate")
    public ResponseEntity<byte[]> generateContract(@RequestBody Map<String, Object> contractRequest) {
        try {
            byte[] pdf = contractPdfService.generateContractPdf(contractRequest);
            String projectId = contractRequest.getOrDefault("projet_id", "contrat").toString();
            String filename = "contrat_" + projectId + ".pdf";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdf);
        } catch (Exception e) {
            log.error("Contract generation failed", e);
            return ResponseEntity.internalServerError()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(("{\"error\":\"Erreur génération contrat: " + e.getMessage() + "\"}").getBytes());
        }
    }
}
