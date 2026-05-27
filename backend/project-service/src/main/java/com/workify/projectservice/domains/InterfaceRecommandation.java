package com.workify.projectservice.domains;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class InterfaceRecommandation {

    private String nom;
    private String type;
    private String description;
    private Double score;
    private List<String> sources;

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public List<String> getSources() { return sources; }
    public void setSources(List<String> sources) { this.sources = sources; }
}