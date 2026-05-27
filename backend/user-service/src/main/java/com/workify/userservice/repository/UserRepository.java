package com.workify.userservice.repository;

import com.workify.userservice.domain.AccountStatus;
import com.workify.userservice.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByKeycloakId(String keycloakId);

  Optional<User> findByEmail(String email);

  boolean existsByKeycloakId(String keycloakId);

    java.util.List<User> findAllByRole(com.workify.userservice.domain.Role role);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(@Param("role") com.workify.userservice.domain.Role role);

    long countByRoleAndAccountStatus(com.workify.userservice.domain.Role role,
            AccountStatus accountStatus);

    @Query("SELECT COUNT(u) FROM User u WHERE u.accountStatus = :status")
    long countByAccountStatus(@Param("status") AccountStatus status);

    @Query("SELECT COUNT(u) FROM User u WHERE u.inscriptionDate >= :startOfMonth")
    long countByInscriptionDateAfter(@Param("startOfMonth") java.time.Instant startOfMonth);
}
