package com.workify.communication.repository;

import com.workify.communication.domain.CallSignal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface CallSignalRepository extends JpaRepository<CallSignal, Long> {

    /** Pending signals addressed to this user (optionally filtered by callId) */
    List<CallSignal> findByToUserIdOrderByCreatedAtAsc(Long toUserId);

    List<CallSignal> findByToUserIdAndCallIdOrderByCreatedAtAsc(Long toUserId, String callId);

    /** Cleanup stale signals older than X minutes */
    @Modifying
    @Transactional
    @Query("DELETE FROM CallSignal c WHERE c.createdAt < :cutoff")
    void deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
