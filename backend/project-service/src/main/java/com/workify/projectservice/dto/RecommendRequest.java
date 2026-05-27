package com.workify.projectservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

public class RecommendRequest {

    private String description;

    @JsonProperty("mots_cles")
    private List<String> motsCles = new ArrayList<>();

    private List<String> tags = new ArrayList<>();

    @JsonProperty("audience_cible")
    private String audienceCible = "";

    @JsonProperty("interfaces_existantes")
    private List<String> interfacesExistantes = new ArrayList<>();

    @JsonProperty("top_k")
    private int topK = 5;

    // ── Getters & Setters ────────────────────────────────────────────────────

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getMotsCles() { return motsCles; }
    public void setMotsCles(List<String> motsCles) { this.motsCles = motsCles; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public String getAudienceCible() { return audienceCible; }
    public void setAudienceCible(String audienceCible) { this.audienceCible = audienceCible; }

    public List<String> getInterfacesExistantes() { return interfacesExistantes; }
    public void setInterfacesExistantes(List<String> interfacesExistantes) { this.interfacesExistantes = interfacesExistantes; }

    public int getTopK() { return topK; }
    public void setTopK(int topK) { this.topK = topK; }
}