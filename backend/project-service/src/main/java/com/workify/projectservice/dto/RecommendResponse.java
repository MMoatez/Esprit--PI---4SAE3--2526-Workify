package com.workify.projectservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.workify.projectservice.domains.InterfaceRecommandation;
import com.workify.projectservice.domains.PaletteRecommandation;
import com.workify.projectservice.domains.ProjetSimilaire;
import com.workify.projectservice.domains.WebProjetSimilaire;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class RecommendResponse {

    @JsonProperty("interfaces_recommandees")
    private List<InterfaceRecommandation> interfacesRecommandees;

    @JsonProperty("palettes_recommandees")
    private List<PaletteRecommandation> palettesRecommandees;

    @JsonProperty("projets_similaires")
    private List<ProjetSimilaire> projetsSimilaires;

    @JsonProperty("web_projects_similaires")
    private List<WebProjetSimilaire> webProjectsSimilaires;

    public List<InterfaceRecommandation> getInterfacesRecommandees() { return interfacesRecommandees; }
    public void setInterfacesRecommandees(List<InterfaceRecommandation> v) { this.interfacesRecommandees = v; }

    public List<PaletteRecommandation> getPalettesRecommandees() { return palettesRecommandees; }
    public void setPalettesRecommandees(List<PaletteRecommandation> v) { this.palettesRecommandees = v; }

    public List<ProjetSimilaire> getProjetsSimilaires() { return projetsSimilaires; }
    public void setProjetsSimilaires(List<ProjetSimilaire> v) { this.projetsSimilaires = v; }

    public List<WebProjetSimilaire> getWebProjectsSimilaires() { return webProjectsSimilaires; }
    public void setWebProjectsSimilaires(List<WebProjetSimilaire> v) { this.webProjectsSimilaires = v; }
}