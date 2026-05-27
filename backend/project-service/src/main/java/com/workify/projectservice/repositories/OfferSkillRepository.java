package com.workify.projectservice.repositories;

import com.workify.projectservice.domains.Freelancer;
import com.workify.projectservice.domains.OfferSkill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OfferSkillRepository extends JpaRepository<OfferSkill, Long> {
    List<OfferSkill> findByFreelancer(Freelancer freelancer);
}

