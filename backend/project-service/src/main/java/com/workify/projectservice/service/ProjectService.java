package com.workify.projectservice.service;

import com.workify.projectservice.domains.Project;

import java.util.List;

public interface ProjectService {
    Project create(Project project);
    List<Project> getAll();
    List<Project> getByClientEmail(String clientEmail);
    List<Project> getByClientId(Long clientId);
    Project getById(Long id);
    Project update(Long id, Project project);
    void delete(Long id);
}
