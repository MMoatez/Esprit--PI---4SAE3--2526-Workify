package com.workify.projectservice.domains;

import com.fasterxml.jackson.annotation.JsonAlias;

public enum ProjectComplexity {
    @JsonAlias({"LOW", "SIMPLE"})
    SIMPLE,
    MEDIUM,
    @JsonAlias({"HIGH", "COMPLEX"})
    COMPLEX
}

