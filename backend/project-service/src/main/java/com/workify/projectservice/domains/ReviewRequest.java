package com.workify.projectservice.domains;

import lombok.Data;

@Data
public class ReviewRequest {

    /** Note 1 à 5 — envoyée par le client */
    private Integer rating;

    /** Commentaire du client */
    private String comment;
}