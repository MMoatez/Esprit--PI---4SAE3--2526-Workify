package com.workify.eventservice.repository;

import com.workify.eventservice.entites.EventRegistration;
import com.workify.eventservice.entites.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EventRegistrationRepository extends JpaRepository<EventRegistration, Long> {
  List<EventRegistration> findByEventId(Long eventId);
  List<EventRegistration> findByUserId(String userId);
  Optional<EventRegistration> findByEventIdAndUserId(Long eventId, String userId);
  boolean existsByEventIdAndUserId(Long eventId, String userId);
  long countByEventIdAndStatus(Long eventId, RegistrationStatus status);
  java.util.Optional<EventRegistration> findByQrToken(String qrToken);

  @Query("SELECT FUNCTION('YEARWEEK', r.registeredAt, 1), COUNT(r) " +
         "FROM EventRegistration r " +
         "WHERE r.registeredAt >= :since " +
         "GROUP BY FUNCTION('YEARWEEK', r.registeredAt, 1) " +
         "ORDER BY FUNCTION('YEARWEEK', r.registeredAt, 1)")
  List<Object[]> countRegistrationsPerWeek(@Param("since") LocalDateTime since);

  long countByStatus(RegistrationStatus status);
}
