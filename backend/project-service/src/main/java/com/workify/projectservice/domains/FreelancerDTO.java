package com.workify.projectservice.domains;

import lombok.Data;

@Data
public class FreelancerDTO {
    private Long id;
    private Long userId;
    private String nom;
    private String email;

    public FreelancerDTO(Freelancer freelancer) {
        this.id = freelancer.getId();
        this.userId = freelancer.getUserId();
        this.nom = freelancer.getNom();
        this.email = freelancer.getEmail();
    }
}
