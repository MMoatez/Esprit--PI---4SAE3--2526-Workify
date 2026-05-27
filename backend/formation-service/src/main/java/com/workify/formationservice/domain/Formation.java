package com.workify.formationservice.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "formations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Formation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Domain field;

    private Integer level;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    private Long idPackFk;

    private String period;

    private String googleMeetLink;
    
    private String address;

    @OneToOne(mappedBy = "formation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Quiz quiz;
}
