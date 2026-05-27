package com.workify.eventservice.client;

import com.workify.eventservice.Dto.UserPageResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "user-service", url = "${user-service.url}")
public interface UserServiceClient {

  // GET /api/admin/users?size=200 — returns Page<UserProfileDto> (JSON has "content" array)
  @GetMapping("/api/admin/users")
  UserPageResponse getAllUsersAdmin(
    @RequestParam("size") int size,
    @RequestHeader("Authorization") String token);
}
