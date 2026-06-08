package com.workify.communication.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Minimal user data received from user-service via Feign.
 * Only the fields we actually need — ignores everything else.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserDto {
    private Long   id;
    private String email;
    private String firstName;
    private String lastName;
}
