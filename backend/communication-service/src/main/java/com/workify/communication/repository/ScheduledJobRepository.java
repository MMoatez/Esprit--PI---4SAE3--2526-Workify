package com.workify.communication.repository;

import com.workify.communication.domain.ScheduledJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ScheduledJobRepository extends JpaRepository<ScheduledJob, Long> {

    @Query("SELECT s FROM ScheduledJob s WHERE (s.locked IS NULL OR s.locked = false) AND s.dueAt <= :now ORDER BY s.dueAt ASC")
    List<ScheduledJob> findDueJobs(@Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE ScheduledJob s SET s.locked = true WHERE s.id = :id AND (s.locked IS NULL OR s.locked = false)")
    int lockJob(@Param("id") Long id);

    /**
     * Deletes all locked jobs that have passed their due time.
     * Called once at startup to clean up jobs that were locked but never deleted
     * due to a previous bug (server crash, missing delete, etc.).
     */
    @Modifying
    @Query("DELETE FROM ScheduledJob s WHERE s.locked = true AND s.dueAt <= :cutoff")
    int deleteStaleLockedJobs(@Param("cutoff") LocalDateTime cutoff);
}
