package com.workify.projectservice.domains;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Offer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double  price;
    private Integer duration;
    private String  message;

    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(20)")
    private OfferStatus status;

    @JsonIgnoreProperties({"offers", "hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.EAGER)
    private Project project;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "freelancer_id")
    private Freelancer freelancer;

    // ══════════════════════════════════════════════════
    // REVIEW — rempli apres offre ACCEPTED
    // ══════════════════════════════════════════════════

    /** Note donnee par le client (1 a 5) */
    private Integer rating;

    /** Commentaire du client */
    private String reviewComment;

    /** Date de l'evaluation */
    private LocalDateTime reviewedAt;

    /** Reponse du freelancer a l'evaluation */
    private String freelancerReply;

    /** Date de la reponse du freelancer */
    private LocalDateTime freelancerRepliedAt;
}
