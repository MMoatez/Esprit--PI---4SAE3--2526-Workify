package com.workify.formationservice.service;

import com.workify.formationservice.domain.Formation;
import com.workify.formationservice.repository.FormationRepository;
import com.workify.formationservice.web.dto.FormationRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class FormationService {

    private final FormationRepository formationRepository;

    public List<Formation> getAllFormations() {
        return formationRepository.findAll();
    }

    public Formation getFormationById(Long id) {
        return formationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Formation not found with id: " + id));
    }

    @Transactional
    public Formation createFormation(FormationRequest request) {
        Formation formation = Formation.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .field(request.getField())
                .level(request.getLevel())
                .status(request.getStatus())
                .idPackFk(request.getIdPackFk())
                .period(request.getPeriod())
                .googleMeetLink(request.getGoogleMeetLink())
                .address(request.getAddress())
                .build();

        Formation saved = formationRepository.save(formation);
        log.info("Created new formation: {}", saved.getId());
        return saved;
    }

    @Transactional
    public Formation updateFormation(Long id, FormationRequest request) {
        Formation formation = getFormationById(id);

        formation.setTitle(request.getTitle());
        formation.setDescription(request.getDescription());
        formation.setField(request.getField());
        formation.setLevel(request.getLevel());
        formation.setStatus(request.getStatus());
        formation.setIdPackFk(request.getIdPackFk());
        formation.setPeriod(request.getPeriod());
        formation.setGoogleMeetLink(request.getGoogleMeetLink());
        formation.setAddress(request.getAddress());

        log.info("Updated formation: {}", id);
        return formationRepository.save(formation);
    }

    @Transactional
    public void deleteFormation(Long id) {
        Formation formation = getFormationById(id);
        formationRepository.delete(formation);
        log.info("Deleted formation: {}", id);
    }
}
