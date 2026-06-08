package com.workify.communication.repository;

import com.workify.communication.domain.UserModeration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserModerationRepository extends JpaRepository<UserModeration, Long> {

    Optional<UserModeration> findByUserId(Long userId);

    /** Lifts every active ban instantly — use only in dev/test. */
    @Modifying
    @Query("UPDATE UserModeration u SET u.bannedUntil = NULL, u.periodViolations = 0 WHERE u.bannedUntil IS NOT NULL")
    int clearAllBans();

    /** Lifts the ban for a specific user. */
    @Modifying
    @Query("UPDATE UserModeration u SET u.bannedUntil = NULL, u.periodViolations = 0 WHERE u.userId = :userId")
    int clearBanForUser(Long userId);

    /**
     * Returns all UserModeration records whose ban has expired (bannedUntil in the past).
     * Used by the scheduled cleanup task to delete blocked messages and lift stale bans.
     */
    @Query("SELECT u FROM UserModeration u WHERE u.bannedUntil IS NOT NULL AND u.bannedUntil < :now")
    List<UserModeration> findExpiredBans(@Param("now") LocalDateTime now);
}
