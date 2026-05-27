package com.workify.eventservice.repository;

import com.workify.eventservice.entites.ContentType;
import com.workify.eventservice.entites.EventContent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EventContentRepository extends JpaRepository<EventContent, Long> {
  List<EventContent> findByEventId(Long eventId);
  List<EventContent> findByPartnerId(String partnerId);
  List<EventContent> findByEventIdAndType(Long eventId, ContentType type);
}
