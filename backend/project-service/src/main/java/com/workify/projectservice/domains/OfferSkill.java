package com.workify.projectservice.domains;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfferSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Freelancer freelancer;

    @ManyToOne
    private Skill skill;

    private String niveau; // exemple : "débutant", "intermédiaire", "expert"
}
