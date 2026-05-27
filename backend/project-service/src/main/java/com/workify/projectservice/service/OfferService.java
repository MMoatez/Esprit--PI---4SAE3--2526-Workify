package com.workify.projectservice.service;

import com.workify.projectservice.domains.Offer;

import java.util.List;

public interface OfferService {

    List<Offer> getAll();

    List<Offer> getByProject(Long projectId);

    List<Offer> getByFreelancer(Long freelancerId);

    List<Offer> getByClientEmail(String clientEmail);

    Offer accept(Long id);

    Offer reject(Long id);

    Offer complete(Long id);

    Offer addOfferByProjectId(Long projectId, Long freelancerId, Offer offer);
}