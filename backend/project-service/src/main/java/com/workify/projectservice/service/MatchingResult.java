package com.workify.projectservice.service;

import com.workify.projectservice.domains.Freelancer;
import lombok.Data;

@Data
public class MatchingResult {
    private double score;
    private String explication;

    public MatchingResult(Freelancer freelancer, double score, String explication) {
        this.score = score;
        this.explication = explication;
    }
}
