package com.workify.projectservice.repositories;

import com.workify.projectservice.domains.Offer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OfferRepository extends JpaRepository<Offer, Long> {
    List<Offer> findByProjectId(Long projectId);

    // ⭐ Pour les reviews
    List<Offer> findByFreelancerId(Long freelancerId);
    List<Offer> findByFreelancerIdAndRatingIsNotNull(Long freelancerId);

    // ⭐ Toutes les offres reçues sur les projets d'un client
    List<Offer> findByProject_ClientEmail(String clientEmail);
}