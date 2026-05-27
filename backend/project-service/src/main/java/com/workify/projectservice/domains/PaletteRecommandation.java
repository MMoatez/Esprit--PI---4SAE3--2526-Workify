package com.workify.projectservice.domains;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PaletteRecommandation {

    // FastAPI renvoie un objet imbriqué → Map<String, Object> est plus sûr que Object
    private Map<String, Object> palette;
    private Double score;
    private List<String> projets;

    public Map<String, Object> getPalette() { return palette; }
    public void setPalette(Map<String, Object> palette) { this.palette = palette; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public List<String> getProjets() { return projets; }
    public void setProjets(List<String> projets) { this.projets = projets; }
}