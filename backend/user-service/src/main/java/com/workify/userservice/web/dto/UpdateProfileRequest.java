package com.workify.userservice.web.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(max = 100)
    private String firstName;
    @Size(max = 100)
    private String lastName;
    @Size(max = 30)
    private String phone;
    @Size(max = 100)
    private String rib;
    @Size(max = 100)
    private String title;
    @Size(max = 2000)
    private String bio;
    private Double hourlyRate;
    @Size(max = 100)
    private String location;
    @Size(max = 100)
    private String companyName;
    @Size(max = 100)
    private String industry;
    @Size(max = 255)
    private String website;
}
