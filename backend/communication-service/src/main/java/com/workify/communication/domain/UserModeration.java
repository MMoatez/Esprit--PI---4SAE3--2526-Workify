package com.workify.communication.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_moderation")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserModeration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The user being tracked. One row per user. */
    @Column(unique = true, nullable = false)
    private Long userId;

    /** Lifetime violation count — never reset. */
    @Column(nullable = false)
    @Builder.Default
    private int violationCount = 0;

    /**
     * Violations in the current period.
     * Resets to 0 after a ban is served so the user gets a fresh 3-strike window.
     */
    @Column(nullable = false)
    @Builder.Default
    private int periodViolations = 0;

    /** When the ban expires. Null means the user is not currently banned. */
    private LocalDateTime bannedUntil;

    private LocalDateTime lastViolationAt;

    /** Cached from user-service to avoid repeated HTTP calls per email. */
    private String cachedEmail;
}
