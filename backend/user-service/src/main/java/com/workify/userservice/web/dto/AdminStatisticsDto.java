package com.workify.userservice.web.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminStatisticsDto {
    // Overall counts
    @JsonProperty("totalUsers")
    private long totalUsers;

    @JsonProperty("activeUsers")
    private long activeUsers;

    @JsonProperty("inactiveUsers")
    private long inactiveUsers;

    // By role
    @JsonProperty("totalFreelancers")
    private long totalFreelancers;

    @JsonProperty("totalClients")
    private long totalClients;

    @JsonProperty("totalPartners")
    private long totalPartners;

    @JsonProperty("totalAdmins")
    private long totalAdmins;

    // Growth
    @JsonProperty("newUsersThisMonth")
    private long newUsersThisMonth;

    // Derived
    @JsonProperty("activationRate")
    private double activationRate; // 0-100
}
