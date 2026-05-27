package com.workify.projectservice.domains;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Freelancer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true)
    private Long userId;

    private String nom;

    private String email;

    private String bio;

    private String localisation;

    private Boolean disponibilite;

    private Double noteMoyenne;
    @JsonIgnore
    @OneToMany(mappedBy = "freelancer", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OfferSkill> skills;
    @JsonIgnore
    @OneToOne(mappedBy = "freelancer", cascade = CascadeType.ALL)
    private Preference preference;
    @Column(columnDefinition = "LONGTEXT")
    private String embeddingJson;
}
