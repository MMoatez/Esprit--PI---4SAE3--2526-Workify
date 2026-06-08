package tn.esprit.workify.services.payment.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.FileSystemResource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeTypeUtils;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import tn.esprit.workify.DTO.payment.ReceiptAiValidationResponseDto;

import java.math.BigDecimal;

@Component
@Slf4j
public class AiReceiptClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AiReceiptClient(@Qualifier("directRestTemplate") RestTemplate restTemplate,
                           ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Value("${ai.receipt.base-url:http://localhost:8001}")
    private String baseUrl;

    @Value("${ai.receipt.verify-path:/verify-receipt}")
    private String verifyPath;

    public ReceiptAiValidationResponseDto verifyReceipt(Resource receiptResource,
                                                        String filename,
                                                        BigDecimal expectedAmount,
                                                        String expectedBankName) {
        String url = buildVerifyUrl();
        String safeFilename = (filename != null && !filename.isBlank())
                ? filename
                : (receiptResource != null ? receiptResource.getFilename() : null);

        log.debug("Calling AI receipt API: url={}, filename={}, expectedAmount={}, expectedBank={}",
                url, safeFilename, expectedAmount, expectedBankName);

        if (receiptResource == null || !receiptResource.exists()) {
            log.error("AI receipt API call aborted: file resource is null or does not exist. filename={}", safeFilename);
            throw new IllegalStateException("Receipt file resource is missing");
        }

        if (receiptResource instanceof FileSystemResource fileSystemResource) {
            log.debug("AI receipt file path: {}", fileSystemResource.getPath());
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpHeaders fileHeaders = new HttpHeaders();
                MediaType detectedMediaType = detectMediaType(safeFilename);
                fileHeaders.setContentType(detectedMediaType);
            fileHeaders.setContentDisposition(ContentDisposition
                    .formData()
                    .name("file")
                    .filename(safeFilename != null ? safeFilename : "receipt")
                    .build());

                log.debug("Sending multipart file part with contentType={} and filename={}", detectedMediaType, safeFilename);

            HttpEntity<Resource> filePart = new HttpEntity<>(receiptResource, fileHeaders);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", filePart);

            if (safeFilename != null && !safeFilename.isBlank()) {
                body.add("filename", safeFilename);
            }

            if (expectedAmount != null) {
                body.add("expected_amount", expectedAmount.toPlainString());
            }

            if (expectedBankName != null && !expectedBankName.isBlank()) {
                body.add("expected_bank", expectedBankName);
            }

            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            String rawBody = response.getBody();

            log.debug("AI receipt API response: status={}, body={}", response.getStatusCode(), rawBody);

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("AI receipt API returned non-success status: {}", response.getStatusCode());
                throw new IllegalStateException("AI receipt API returned non-success status: " + response.getStatusCode());
            }

            if (rawBody == null || rawBody.isBlank()) {
                log.error("AI receipt API returned empty body");
                throw new IllegalStateException("AI receipt API returned empty body");
            }

            ReceiptAiValidationResponseDto mapped = objectMapper.readValue(rawBody, ReceiptAiValidationResponseDto.class);
            if (mapped == null) {
                log.error("AI receipt API body could not be mapped to DTO. body={}", rawBody);
                throw new IllegalStateException("AI receipt API response mapping failed");
            }

            log.debug("AI receipt parsed confidence={}", mapped.getConfidence());
            return mapped;
        } catch (Exception ex) {
            log.error("AI receipt API call failed: url={}, filename={}, message={}",
                    url, safeFilename, ex.getMessage(), ex);
            throw new IllegalStateException("AI receipt API call failed", ex);
        }
    }

    private String buildVerifyUrl() {
        String normalizedBase = baseUrl != null ? baseUrl.replaceAll("/+$", "") : "http://localhost:8001";
        String normalizedPath = (verifyPath != null && !verifyPath.isBlank()) ? verifyPath : "/verify-receipt";
        if (!normalizedPath.startsWith("/")) {
            normalizedPath = "/" + normalizedPath;
        }
        return normalizedBase + normalizedPath;
    }

    private MediaType detectMediaType(String filename) {
        if (filename == null) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }

        String lower = filename.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        }
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (lower.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        if (lower.endsWith(".pdf")) {
            return MediaType.APPLICATION_PDF;
        }

        return MediaType.parseMediaType(MimeTypeUtils.APPLICATION_OCTET_STREAM_VALUE);
    }
}
