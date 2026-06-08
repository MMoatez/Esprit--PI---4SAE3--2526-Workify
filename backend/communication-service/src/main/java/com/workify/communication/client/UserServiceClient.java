package com.workify.communication.client;

import com.workify.communication.web.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign client for user-service.
 * "name" = spring.application.name du user-service (pour Eureka).
 * "url"  = fallback si Eureka n'est pas disponible.
 */
@FeignClient(
    name = "user-service",
    url  = "${app.user-service-url:http://localhost:8081}"
)
public interface UserServiceClient {

    @GetMapping("/api/public/users/{id}")
    UserDto getUserById(@PathVariable("id") Long userId);
}
