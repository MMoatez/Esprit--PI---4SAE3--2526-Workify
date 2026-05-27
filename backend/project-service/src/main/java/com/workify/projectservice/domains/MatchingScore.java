package com.workify.projectservice.domains;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchingScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Freelancer freelancer;

    @ManyToOne
    private Project project;

    private Double score;

    @Column(columnDefinition = "TEXT")
    private String explication;

    private LocalDateTime date = LocalDateTime.now();
}
