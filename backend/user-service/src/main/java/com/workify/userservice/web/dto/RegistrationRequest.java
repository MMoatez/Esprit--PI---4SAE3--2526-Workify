package com.workify.userservice.web.dto;

import com.workify.userservice.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegistrationRequest {

  @NotBlank
  @Email
  private String email;

  @NotBlank
  @Size(min = 8)
  private String password;

  @NotBlank
  private String firstName;

  @NotBlank
  private String lastName;

  private String phone;

  @NotNull
  private Role role;

    private List<String> competences;

    private String companyName;
    private String industry;
    private String website;
}
