package com.workify.projectservice.repositories;

import com.workify.projectservice.domains.Skill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SkillRepository extends JpaRepository<Skill, Long> {

    Optional<Skill> findByNomIgnoreCase(String nom);

}