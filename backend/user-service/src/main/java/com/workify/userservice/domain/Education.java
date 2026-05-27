package com.workify.userservice.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "education")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Education {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String institution;

    @Column(nullable = false)
    private String degree; // Equivalent to 'studyType' or 'area'

    @Column(length = 2000)
    private String description;

    @Column
    private String startDate;

    @Column
    private String endDate;
}
