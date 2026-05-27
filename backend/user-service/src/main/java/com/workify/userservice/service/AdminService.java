package com.workify.userservice.service;

import com.workify.userservice.domain.AccountStatus;
import com.workify.userservice.domain.Role;
import com.workify.userservice.domain.User;
import com.workify.userservice.repository.UserRepository;
import com.workify.userservice.web.dto.UserProfileDto;
import com.workify.userservice.web.dto.AdminStatisticsDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

        private final UserRepository userRepository;
        private final KeycloakAdminService keycloakAdminService;
        private final UserProfileService userProfileService;

        @Transactional(readOnly = true)
        public Page<UserProfileDto> getAllUsers(Pageable pageable, String search) {
                Specification<User> spec = (root, query, cb) -> {
                        List<Predicate> predicates = new ArrayList<>();

                        if (StringUtils.hasText(search)) {
                                String searchLike = "%" + search.toLowerCase() + "%";
                                Predicate namePredicate = cb.like(cb.lower(root.get("firstName")), searchLike);
                                Predicate lastNamePredicate = cb.like(cb.lower(root.get("lastName")), searchLike);
                                Predicate emailPredicate = cb.like(cb.lower(root.get("email")), searchLike);
                                predicates.add(cb.or(namePredicate, lastNamePredicate, emailPredicate));
                        }

                        return cb.and(predicates.toArray(new Predicate[0]));
                };

                return userRepository.findAll(spec, pageable)
                                .map(userProfileService::toDto);
        }

        @Transactional
        public UserProfileDto toggleUserStatus(Long id) {
                User user = userRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                boolean newStatus = user.getAccountStatus() != AccountStatus.ACTIVE;

                // Update Keycloak
                keycloakAdminService.updateUserStatus(user.getKeycloakId(), newStatus);

                // Update Local DB
                user.setAccountStatus(newStatus ? AccountStatus.ACTIVE : AccountStatus.INACTIVE);
                userRepository.save(user);

                log.info("Admin toggled user status: {} -> {}", user.getEmail(), user.getAccountStatus());
                return userProfileService.toDto(user);
        }

        @Transactional(readOnly = true)
        public AdminStatisticsDto getStatistics() {
                log.info("Starting statistics computation...");
                java.util.List<User> allUsers = userRepository.findAll();
                long totalUsers = allUsers.size();

                // Safety logging to see actual data in DB
                for (User u : allUsers) {
                        log.debug("User: {}, Email: {}, Role: {}, Status: {}",
                                        u.getId(), u.getEmail(), u.getRole(), u.getAccountStatus());
                }

                // Using String comparison for absolute safety against classloader issues with
                // Enums
                long activeUsers = allUsers.stream()
                                .filter(u -> u.getAccountStatus() != null
                                                && "ACTIVE".equals(u.getAccountStatus().name()))
                                .count();
                long inactiveUsers = allUsers.stream()
                                .filter(u -> u.getAccountStatus() != null
                                                && "INACTIVE".equals(u.getAccountStatus().name()))
                                .count();

                long totalFreelancers = allUsers.stream()
                                .filter(u -> u.getRole() != null && "FREELANCER".equals(u.getRole().name()))
                                .count();
                long totalClients = allUsers.stream()
                                .filter(u -> u.getRole() != null && "CLIENT".equals(u.getRole().name()))
                                .count();
                long totalPartners = allUsers.stream()
                                .filter(u -> u.getRole() != null && "PARTNER".equals(u.getRole().name()))
                                .count();
                long totalAdmins = allUsers.stream()
                                .filter(u -> u.getRole() != null && "ADMIN".equals(u.getRole().name()))
                                .count();

                // New users registered since the 1st of the current month
                java.time.Instant startOfMonth = java.time.LocalDate.now()
                                .withDayOfMonth(1)
                                .atStartOfDay(java.time.ZoneOffset.UTC)
                                .toInstant();

                long newUsersThisMonth = allUsers.stream()
                                .filter(u -> u.getInscriptionDate() != null
                                                && u.getInscriptionDate().isAfter(startOfMonth))
                                .count();

                double activationRate = totalUsers > 0
                                ? Math.round((activeUsers * 100.0 / totalUsers) * 10.0) / 10.0
                                : 0.0;

                log.info("STATISTICS AUDIT - Total: {}, Active: {}, Inactive: {}, Freelancers: {}, Clients: {}, Partners: {}, Admins: {}, MonthGrowth: {}, Rate: {}%",
                                totalUsers, activeUsers, inactiveUsers, totalFreelancers, totalClients, totalPartners,
                                totalAdmins, newUsersThisMonth, activationRate);

                return AdminStatisticsDto.builder()
                                .totalUsers(totalUsers)
                                .activeUsers(activeUsers)
                                .inactiveUsers(inactiveUsers)
                                .totalFreelancers(totalFreelancers)
                                .totalClients(totalClients)
                                .totalPartners(totalPartners)
                                .totalAdmins(totalAdmins)
                                .newUsersThisMonth(newUsersThisMonth)
                                .activationRate(activationRate)
                                .build();
        }
}
