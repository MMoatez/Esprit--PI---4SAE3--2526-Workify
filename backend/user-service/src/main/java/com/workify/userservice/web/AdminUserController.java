package com.workify.userservice.web;

import com.workify.userservice.service.AdminService;
import com.workify.userservice.web.dto.UserProfileDto;
import com.workify.userservice.web.dto.AdminStatisticsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminService adminService;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<UserProfileDto>> getAllUsers(
            @PageableDefault(size = 10, sort = "inscriptionDate", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(adminService.getAllUsers(pageable, search));
    }

    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminStatisticsDto> getStatistics() {
        return ResponseEntity.ok(adminService.getStatistics());
    }

    @PutMapping("/users/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserProfileDto> toggleUserStatus(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.toggleUserStatus(id));
    }
}
