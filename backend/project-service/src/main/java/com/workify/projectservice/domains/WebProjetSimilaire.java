package com.workify.projectservice.domains;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class WebProjetSimilaire {
    private String title;
    private String url;
    private String snippet;
    private String source;
    private String error;

    public String getTitle()   { return title; }
    public void setTitle(String v) { this.title = v; }

    public String getUrl()     { return url; }
    public void setUrl(String v) { this.url = v; }

    public String getSnippet() { return snippet; }
    public void setSnippet(String v) { this.snippet = v; }

    public String getSource()  { return source; }
    public void setSource(String v) { this.source = v; }

    public String getError()   { return error; }
    public void setError(String v) { this.error = v; }
}