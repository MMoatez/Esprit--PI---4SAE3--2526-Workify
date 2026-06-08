package tn.esprit.workify.repositories.meeting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.workify.entities.meeting.Meeting;
import tn.esprit.workify.entities.meeting.MeetingStatus;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, Integer> {

    List<Meeting> findByProjetId(Integer projetId);

    /**
     * Retourne les meetings CONFIRMÉS dont la date est comprise entre
     * [now + 24h] et [now + 25h] → fenêtre de 1h pour le scheduler toutes les heures.
     */
    @Query("SELECT m FROM Meeting m WHERE m.status = :status " +
           "AND m.meetingDate >= :from AND m.meetingDate < :to")
    List<Meeting> findConfirmedMeetingsInWindow(
            @Param("status") MeetingStatus status,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

        @Query("""
            SELECT COUNT(DISTINCT m)
            FROM Meeting m
                        LEFT JOIN m.participantIds p
                        WHERE (m.createdByUserId = :userId OR p = :userId)
              AND m.createdAt >= :from
              AND m.createdAt < :to
            """)
        long countUserMeetingsInPeriod(
            @Param("userId") Integer userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
        );
}

