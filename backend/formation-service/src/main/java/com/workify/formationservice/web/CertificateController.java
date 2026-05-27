package com.workify.formationservice.web;

import com.workify.formationservice.domain.Certificate;
import com.workify.formationservice.service.CertificateService;
import com.workify.formationservice.web.dto.CertificateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/certificates")
@RequiredArgsConstructor
public class CertificateController {

    private final CertificateService certificateService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Certificate>> getCertificatesByUser(@PathVariable String userId) {
        return ResponseEntity.ok(certificateService.getCertificatesByUserId(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Certificate> getCertificateById(@PathVariable Long id) {
        return ResponseEntity.ok(certificateService.getCertificateById(id));
    }

    @PostMapping
    public ResponseEntity<Certificate> issueCertificate(@Valid @RequestBody CertificateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(certificateService.issueCertificate(request));
    }
}
