package com.workify.projectservice.repositories;

import com.workify.projectservice.domains.Project;
import com.workify.projectservice.domains.ProjectSkill;
import com.workify.projectservice.domains.Skill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectSkillRepository extends JpaRepository<ProjectSkill, Long> {

    List<ProjectSkill> findByProject(Project project);

    boolean existsByProjectAndSkill(Project project, Skill skill);

}