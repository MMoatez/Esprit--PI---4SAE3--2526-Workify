package com.workify.projectservice.domains;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ProjetSimilaire {

    @JsonProperty("proj_id")   // ← snake_case de FastAPI → camelCase Java
    private String projId;

    private String nom;
    private String domaine;
    private Double score;

    public String getProjId() { return projId; }
    public void setProjId(String projId) { this.projId = projId; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getDomaine() { return domaine; }
    public void setDomaine(String domaine) { this.domaine = domaine; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }
}