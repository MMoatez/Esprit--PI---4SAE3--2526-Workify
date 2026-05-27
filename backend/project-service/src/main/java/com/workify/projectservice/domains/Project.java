package com.workify.projectservice.domains;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(length = 1000)
    private String shortDescription;

    @Column(length = 5000)
    private String detailedDescription;

    @Enumerated(EnumType.STRING)
    private ProjectCategory category;

    private Double budget;

    private Long clientId;

    // Guest info
    private String clientName;
    private String clientEmail;
    private String clientPhone;


    private LocalDateTime createdAt;
    @Enumerated(EnumType.STRING)
    private ProjectStatus status;

    private Integer estimatedDuration;
    @Enumerated(EnumType.STRING) private ProjectComplexity complexity;
    @JsonIgnore
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Offer> offers;
    @Column(columnDefinition = "LONGTEXT")
    private String embeddingJson;
}
