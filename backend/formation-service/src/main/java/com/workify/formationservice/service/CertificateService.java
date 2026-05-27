package com.workify.formationservice.service;

import com.workify.formationservice.domain.Certificate;
import com.workify.formationservice.domain.Formation;
import com.workify.formationservice.repository.CertificateRepository;
import com.workify.formationservice.repository.FormationRepository;
import com.workify.formationservice.web.dto.CertificateRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class CertificateService {

    private final CertificateRepository certificateRepository;
    private final FormationRepository formationRepository;

    public List<Certificate> getCertificatesByUserId(String userId) {
        return certificateRepository.findByUserId(userId);
    }

    @Transactional
    public Certificate issueCertificate(CertificateRequest request) {
        Formation formation = formationRepository.findById(request.getFormationId())
                .orElseThrow(() -> new RuntimeException("Formation not found"));

        Certificate certificate = Certificate.builder()
                .userId(request.getUserId())
                .formation(formation)
                .dateObtained(LocalDate.now())
                .build();

        Certificate saved = certificateRepository.save(certificate);
        log.info("Issued certificate {} to user {} for formation {}",
                saved.getId(), request.getUserId(), request.getFormationId());
        return saved;
    }

    public Certificate getCertificateById(Long id) {
        return certificateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));
    }
}
