package tn.esprit.workify.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tn.esprit.workify.DTO.CreateSubscriptionDto;
import tn.esprit.workify.DTO.SubscriptionResponseDto;
import tn.esprit.workify.services.subscription.ISubscriptionService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class SubscriptionController {

    private final ISubscriptionService subscriptionService;

    @Value("${file.upload.dir:uploads/projects}")
    private String uploadDir;

    // ── Upload receipt file ──────────────────────────────────────────────────
    @PostMapping("/upload-receipt")
    public ResponseEntity<Map<String, String>> uploadReceipt(
            @RequestParam("file") MultipartFile file) {

        String originalName = StringUtils.cleanPath(file.getOriginalFilename() != null
                ? file.getOriginalFilename() : "receipt");
        String ext = originalName.contains(".")
                ? originalName.substring(originalName.lastIndexOf("."))
                : "";
        String filename = "receipt_" + UUID.randomUUID() + ext;

        try {
            Path receiptsDir = Paths.get(uploadDir, "receipts");
            Files.createDirectories(receiptsDir);
            Files.copy(file.getInputStream(), receiptsDir.resolve(filename),
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Could not store file: " + e.getMessage()));
        }

        return ResponseEntity.ok(Map.of("receiptPath", "uploads/projects/receipts/" + filename));
    }

    // ── Subscribe ────────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<SubscriptionResponseDto> subscribe(@RequestBody CreateSubscriptionDto dto) {
        return new ResponseEntity<>(subscriptionService.subscribe(dto), HttpStatus.CREATED);
    }

    // ── All subscriptions (admin) ────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<SubscriptionResponseDto>> getAll() {
        return ResponseEntity.ok(subscriptionService.getAllSubscriptions());
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportSubscriptions(
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        byte[] content = subscriptionService.exportSubscriptions(from, to);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "subscriptions_export.xlsx");

        return new ResponseEntity<>(content, headers, HttpStatus.OK);
    }

    // ── By user ──────────────────────────────────────────────────────────────
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<SubscriptionResponseDto>> getByUser(@PathVariable Integer userId) {
        return ResponseEntity.ok(subscriptionService.getSubscriptionsByUser(userId));
    }

    // ── Active subscription of a user ────────────────────────────────────────
    @GetMapping("/user/{userId}/active")
    public ResponseEntity<SubscriptionResponseDto> getActive(@PathVariable Integer userId) {
        SubscriptionResponseDto dto = subscriptionService.getActiveSubscription(userId);
        if (dto == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(dto);
    }

    // ── Cancel ───────────────────────────────────────────────────────────────
    @PutMapping("/{id}/cancel")
    public ResponseEntity<SubscriptionResponseDto> cancel(@PathVariable Integer id) {
        return ResponseEntity.ok(subscriptionService.cancelSubscription(id));
    }

    // ── Approve (admin) ──────────────────────────────────────────────────────
    @PutMapping("/{id}/approve")
    public ResponseEntity<SubscriptionResponseDto> approve(@PathVariable Integer id) {
        return ResponseEntity.ok(subscriptionService.approveSubscription(id));
    }

    // ── Reject (admin) ───────────────────────────────────────────────────────
    @PutMapping("/{id}/reject")
    public ResponseEntity<SubscriptionResponseDto> reject(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.getOrDefault("reason", "") : "";
        return ResponseEntity.ok(subscriptionService.rejectSubscription(id, reason));
    }

    @PutMapping("/{id}/ai-override")
    public ResponseEntity<SubscriptionResponseDto> aiOverride(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        boolean approve = Boolean.parseBoolean(body.getOrDefault("approve", "false"));
        String reason = body.getOrDefault("reason", "");
        return ResponseEntity.ok(subscriptionService.overrideAiDecision(id, approve, reason));
    }
}
