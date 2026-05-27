package com.workify.eventservice.repository;

import com.workify.eventservice.entites.Event;
import com.workify.eventservice.entites.EventCategory;
import com.workify.eventservice.entites.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
  List<Event> findByStatus(EventStatus status);
  List<Event> findByCreatedBy(String createdBy);
  List<Event> findByCategory(EventCategory category);
}
