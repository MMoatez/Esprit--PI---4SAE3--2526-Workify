package com.workify.eventservice.repository;

import com.workify.eventservice.entites.EventPartner;
import com.workify.eventservice.entites.PartnerStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EventPartnerRepository extends JpaRepository<EventPartner, Long> {
  List<EventPartner> findByEventId(Long eventId);
  List<EventPartner> findByPartnerId(String partnerId);
  List<EventPartner> findByPartnerIdAndStatus(String partnerId, PartnerStatus status);
  Optional<EventPartner> findByInvitationToken(String token);
  boolean existsByEventIdAndPartnerId(Long eventId, String partnerId);
}
