package com.workify.userservice.web;

import com.workify.userservice.domain.Role;
import com.workify.userservice.repository.UserRepository;
import com.workify.userservice.web.dto.UserProfileDto;
import com.workify.userservice.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicUserController {

  private final UserRepository userRepository;
  private final UserProfileService userProfileService;

  @GetMapping("/freelancers")
  public ResponseEntity<List<UserProfileDto>> getAllFreelancers() {
    return ResponseEntity.ok(userProfileService.getAllFreelancers());
  }

  @GetMapping("/freelancers/{id}")
  public ResponseEntity<UserProfileDto> getFreelancerById(
    @org.springframework.web.bind.annotation.PathVariable Long id) {
    return ResponseEntity.ok(userProfileService.getFreelancerById(id));
  }

  @GetMapping("/clients")
  public ResponseEntity<List<UserProfileDto>> getAllClients() {
    return ResponseEntity.ok(userProfileService.getAllClients());
  }

  /** Generic endpoint — returns any user by id regardless of role. Used for name resolution. */
  @GetMapping("/users/{id}")
  public ResponseEntity<UserProfileDto> getUserById(
    @org.springframework.web.bind.annotation.PathVariable Long id) {
    return ResponseEntity.ok(userProfileService.getUserById(id));
  }
}
