package com.workify.projectservice.domains;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Preference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String typeProjet;       // ex : "mission courte", "temps plein", "freelance"
    private String dureePreferee;    // ex : "1 mois", "3-6 mois", "long terme"
    private String secteur;          // ex : "finance", "éducation", "e-commerce"

    @OneToOne
    @JoinColumn(name = "freelancer_id")
    private Freelancer freelancer;
}
