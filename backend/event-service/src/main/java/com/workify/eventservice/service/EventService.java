package com.workify.eventservice.service;

import com.workify.eventservice.Dto.*;
import com.workify.eventservice.client.UserServiceClient;
import com.workify.eventservice.entites.*;
import com.workify.eventservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.temporal.IsoFields;
import java.util.*;
import java.util.stream.Collectors;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

  private final EventRepository eventRepository;
  private final EventPartnerRepository eventPartnerRepository;
  private final EventRegistrationRepository eventRegistrationRepository;
  private final EventContentRepository eventContentRepository;
  private final UserServiceClient userServiceClient;
  private final EmailService emailService;

  // ===============================
  // EVENT CRUD
  // ===============================

  @Transactional
  public EventDto createEvent(CreateEventRequest request, String adminId) {
    Event event = Event.builder()
      .title(request.getTitle())
      .description(request.getDescription())
      .eventDate(request.getEventDate())
      .location(request.getLocation())
      .latitude(request.getLatitude())
      .longitude(request.getLongitude())
      .capacity(request.getCapacity())
      .category(request.getCategory())
      .topic(request.getTopic())
      .status(EventStatus.PUBLISHED)
      .createdBy(adminId)
      .build();
    return toEventDto(eventRepository.save(event));
  }

  @Transactional(readOnly = true)
  public List<EventDto> getAllEvents() {
    return eventRepository.findAll()
      .stream().map(this::toEventDto).collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public EventDto getEventById(Long id) {
    Event event = eventRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Event not found with id: " + id));
    return toEventDto(event);
  }

  @Transactional(readOnly = true)
  public List<EventDto> getPublishedEvents() {
    return eventRepository.findByStatusIn(getPubliclyVisibleStatuses())
      .stream().map(this::toEventDto).collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public List<EventDto> getEventsByCategory(EventCategory category) {
    return eventRepository.findByCategory(category)
      .stream()
      .filter(event -> isPubliclyVisible(event.getStatus()))
      .map(this::toEventDto)
      .collect(Collectors.toList());
  }

  @Transactional
  public EventDto updateStatus(Long id, EventStatus newStatus) {
    Event event = eventRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Event not found with id: " + id));
    event.setStatus(newStatus);
    return toEventDto(eventRepository.save(event));
  }

  @Transactional
  public EventDto updateEvent(Long id, CreateEventRequest request) {
    Event event = eventRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Event not found with id: " + id));
    event.setTitle(request.getTitle());
    event.setDescription(request.getDescription());
    event.setEventDate(request.getEventDate());
    event.setLocation(request.getLocation());
    event.setLatitude(request.getLatitude());
    event.setLongitude(request.getLongitude());
    event.setCapacity(request.getCapacity());
    event.setCategory(request.getCategory());
    event.setTopic(request.getTopic());
    return toEventDto(eventRepository.save(event));
  }

  @Transactional
  public void deleteEvent(Long id) {
    eventRepository.deleteById(id);
  }

  // ===============================
  // PARTNER MANAGEMENT
  // ===============================

  @Transactional
  public EventPartnerDto invitePartner(Long eventId, InvitePartnerRequest request,
                                       String authToken) {
    Event event = eventRepository.findById(eventId)
      .orElseThrow(() -> new RuntimeException("Event not found"));

    if (eventPartnerRepository.existsByEventIdAndPartnerId(
      eventId, request.getPartnerId())) {
      throw new RuntimeException("Partner already invited to this event");
    }

    String token = UUID.randomUUID().toString();

    EventPartner partner = EventPartner.builder()
      .event(event)
      .partnerId(request.getPartnerId())
      .partnerEmail(request.getPartnerEmail())
      .partnerName(request.getPartnerName())
      .invitationToken(token)
      .build();

    event.setStatus(EventStatus.PENDING_PARTNERS);
    eventRepository.save(event);

    EventPartner saved = eventPartnerRepository.save(partner);

    emailService.sendPartnerInvitation(
      request.getPartnerEmail(),
      request.getPartnerName(),
      event.getTitle(),
      token);

    return toPartnerDto(saved);
  }

  @Transactional
  public EventPartnerDto respondToInvitation(String token,
                                             PartnerResponseRequest request) {
    EventPartner partner = eventPartnerRepository.findByInvitationToken(token)
      .orElseThrow(() -> new RuntimeException("Invalid invitation token"));

    partner.setStatus(request.getResponse());
    partner.setRespondedAt(LocalDateTime.now());

    if (request.getResponse() == PartnerStatus.ACCEPTED) {
      Event event = partner.getEvent();
      event.setStatus(EventStatus.ENRICHED);
      eventRepository.save(event);
    }

    return toPartnerDto(eventPartnerRepository.save(partner));
  }

  @Transactional(readOnly = true)
  public List<EventPartnerDto> getEventPartners(Long eventId) {
    return eventPartnerRepository.findByEventId(eventId)
      .stream().map(this::toPartnerDto).collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public List<EventPartnerDto> getMyInvitations(String partnerId) {
    return eventPartnerRepository.findByPartnerId(partnerId)
      .stream()
      .sorted((a, b) -> {
        // PENDING first, then by invitedAt desc
        if (a.getStatus() == PartnerStatus.PENDING && b.getStatus() != PartnerStatus.PENDING) return -1;
        if (a.getStatus() != PartnerStatus.PENDING && b.getStatus() == PartnerStatus.PENDING) return 1;
        if (a.getInvitedAt() != null && b.getInvitedAt() != null) return b.getInvitedAt().compareTo(a.getInvitedAt());
        return 0;
      })
      .map(this::toPartnerDto)
      .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public List<PartnerSummaryDto> getAvailablePartners(Long eventId, String authToken) {
    Set<String> alreadyInvited = eventPartnerRepository.findByEventId(eventId)
      .stream().map(EventPartner::getPartnerId).collect(Collectors.toSet());

    UserPageResponse page = userServiceClient.getAllUsersAdmin(200, authToken);
    if (page == null || page.getContent() == null) return java.util.Collections.emptyList();

    return page.getContent().stream()
      .filter(u -> "PARTNER".equalsIgnoreCase(u.getRole()))
      .filter(u -> !alreadyInvited.contains(u.getKeycloakId()))
      .map(u -> new PartnerSummaryDto(
        u.getKeycloakId(),
        u.getFirstName() + " " + u.getLastName(),
        u.getEmail(),
        u.getCompanyName() != null ? u.getCompanyName() : ""))
      .collect(Collectors.toList());
  }

  // ===============================
  // REGISTRATION
  // ===============================

  @Transactional
  public EventRegistrationDto registerToEvent(Long eventId,
                                              RegisterEventRequest request,
                                              String userId, String authToken) {
    Event event = eventRepository.findById(eventId)
      .orElseThrow(() -> new RuntimeException("Event not found"));

    if (!isPubliclyVisible(event.getStatus())) {
      throw new RuntimeException("Event is not available for registration");
    }

    // Check for existing registration
    Optional<EventRegistration> existingOpt = eventRegistrationRepository.findByEventIdAndUserId(eventId, userId);
    if (existingOpt.isPresent()) {
      EventRegistration existing = existingOpt.get();
      if (existing.getStatus() != RegistrationStatus.CANCELLED) {
        throw new RuntimeException("You are already registered to this event");
      }
      // Re-register after cancellation: reset to PENDING
      existing.setStatus(RegistrationStatus.PENDING);
      existing.setCancelledAt(null);
      existing.setRegisteredAt(LocalDateTime.now());
      existing.setUserType(request.getUserType());
      return toRegistrationDto(eventRegistrationRepository.save(existing));
    }

    // Check capacity (only confirmed registrations count toward capacity)
    if (event.getCapacity() != null) {
      long confirmed = eventRegistrationRepository
        .countByEventIdAndStatus(eventId, RegistrationStatus.CONFIRMED);
      if (confirmed >= event.getCapacity()) {
        throw new RuntimeException("Event is fully booked");
      }
    }

    String userEmail = request.getUserEmail() != null ? request.getUserEmail() : "";
    String userName = request.getUserName() != null ? request.getUserName() : "";

    EventRegistration registration = EventRegistration.builder()
      .event(event)
      .userId(userId)
      .userEmail(userEmail)
      .userName(userName)
      .userType(request.getUserType())
      .status(RegistrationStatus.PENDING)
      .build();

    return toRegistrationDto(eventRegistrationRepository.save(registration));
  }

  @Transactional
  public void cancelRegistration(Long eventId, String userId) {
    EventRegistration registration = eventRegistrationRepository
      .findByEventIdAndUserId(eventId, userId)
      .orElseThrow(() -> new RuntimeException("Registration not found"));
    registration.setStatus(RegistrationStatus.CANCELLED);
    registration.setCancelledAt(LocalDateTime.now());
    eventRegistrationRepository.save(registration);
  }

  @Transactional(readOnly = true)
  public List<EventRegistrationDto> getEventRegistrations(Long eventId) {
    return eventRegistrationRepository.findByEventId(eventId)
      .stream().map(this::toRegistrationDto).collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public EventRegistrationDto getRegistrationById(Long registrationId) {
    EventRegistration reg = eventRegistrationRepository.findById(registrationId)
      .orElseThrow(() -> new RuntimeException("Registration not found"));
    return toRegistrationDto(reg);
  }

  @Transactional(readOnly = true)
  public Optional<EventRegistrationDto> getMyRegistration(Long eventId, String userId) {
    return eventRegistrationRepository.findByEventIdAndUserId(eventId, userId)
      .map(this::toRegistrationDto);
  }

  @Transactional(readOnly = true)
  public List<EventRegistrationDto> getMyRegistrations(String userId) {
    return eventRegistrationRepository.findByUserId(userId)
      .stream()
      .filter(r -> r.getStatus() != RegistrationStatus.CANCELLED)
      .map(this::toRegistrationDto)
      .collect(Collectors.toList());
  }

  @Transactional
  public EventRegistrationDto updateRegistrationStatus(Long eventId, Long registrationId,
                                                       RegistrationStatus status) {
    EventRegistration registration = eventRegistrationRepository.findById(registrationId)
      .orElseThrow(() -> new RuntimeException("Registration not found"));

    if (!registration.getEvent().getId().equals(eventId)) {
      throw new RuntimeException("Registration does not belong to this event");
    }

    registration.setStatus(status);
    if (status == RegistrationStatus.CANCELLED) {
      registration.setCancelledAt(LocalDateTime.now());
    } else {
      registration.setCancelledAt(null);
    }

    // Generate secure QR token and send ticket email when confirmed
    if (status == RegistrationStatus.CONFIRMED && registration.getQrToken() == null) {
      registration.setQrToken(UUID.randomUUID().toString());
      Event event = registration.getEvent();
      emailService.sendTicketEmail(
        registration.getUserEmail(),
        registration.getUserName(),
        event.getTitle(),
        event.getEventDate() != null ? event.getEventDate().toString() : "",
        event.getLocation(),
        registration.getId(),
        event.getId()
      );
    }

    return toRegistrationDto(eventRegistrationRepository.save(registration));
  }

  // ===============================
  // TICKET SCAN — marks attended
  // ===============================

  @Transactional
  public java.util.Map<String, Object> scanTicket(String qrToken) {
    java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();

    EventRegistration reg = eventRegistrationRepository.findByQrToken(qrToken).orElse(null);
    if (reg == null) {
      result.put("valid", false);
      result.put("message", "QR code invalide ou inconnu");
      return result;
    }

    if (reg.getStatus() == RegistrationStatus.ATTENDED) {
      result.put("valid", false);
      result.put("alreadyScanned", true);
      result.put("message", "Ticket déjà utilisé");
      result.put("checkedInAt", reg.getCheckedInAt());
      result.put("participant", reg.getUserName());
      result.put("email", reg.getUserEmail());
      result.put("eventTitle", reg.getEvent().getTitle());
      return result;
    }

    if (reg.getStatus() == RegistrationStatus.CANCELLED) {
      result.put("valid", false);
      result.put("message", "Inscription annulée");
      return result;
    }

    if (reg.getStatus() == RegistrationStatus.PENDING) {
      result.put("valid", false);
      result.put("message", "Inscription en attente de confirmation");
      return result;
    }

    // CONFIRMED → mark ATTENDED
    reg.setStatus(RegistrationStatus.ATTENDED);
    reg.setCheckedInAt(LocalDateTime.now());
    eventRegistrationRepository.save(reg);

    result.put("valid", true);
    result.put("message", "Accès autorisé ✅");
    result.put("participant", reg.getUserName());
    result.put("email", reg.getUserEmail());
    result.put("userType", reg.getUserType());
    result.put("eventTitle", reg.getEvent().getTitle());
    result.put("eventId", reg.getEvent().getId());
    result.put("registrationId", reg.getId());
    result.put("checkedInAt", reg.getCheckedInAt());
    return result;
  }

  // ===============================
  // CONTENT
  // ===============================

  @Transactional
  public EventContentDto addContent(Long eventId, AddContentRequest request,
                                    String partnerId, String authToken) {
    Event event = eventRepository.findById(eventId)
      .orElseThrow(() -> new RuntimeException("Event not found"));

    String partnerName = partnerId;

    EventContent content = EventContent.builder()
      .event(event)
      .partnerId(partnerId)
      .partnerName(partnerName)
      .type(request.getType())
      .title(request.getTitle())
      .description(request.getDescription())
      .resourceUrl(request.getResourceUrl())
      .build();

    return toContentDto(eventContentRepository.save(content));
  }

  @Transactional(readOnly = true)
  public List<EventContentDto> getEventContents(Long eventId) {
    return eventContentRepository.findByEventId(eventId)
      .stream().map(this::toContentDto).collect(Collectors.toList());
  }

  // ===============================
  // STATS
  // ===============================

  @Transactional(readOnly = true)
  public EventStatsDto getEventStats(Long eventId) {
    Event event = eventRepository.findById(eventId)
      .orElseThrow(() -> new RuntimeException("Event not found"));

    long totalRegistrations = eventRegistrationRepository
      .countByEventIdAndStatus(eventId, RegistrationStatus.CONFIRMED);
    long totalPartners = eventPartnerRepository.findByEventId(eventId).size();
    long acceptedPartners = eventPartnerRepository
      .findByEventId(eventId).stream()
      .filter(p -> p.getStatus() == PartnerStatus.ACCEPTED).count();
    long totalContents = eventContentRepository.findByEventId(eventId).size();

    EventStatsDto stats = new EventStatsDto();
    stats.setEventId(eventId);
    stats.setEventTitle(event.getTitle());
    stats.setStatus(event.getStatus());
    stats.setTotalRegistrations(totalRegistrations);
    stats.setTotalPartners(totalPartners);
    stats.setAcceptedPartners(acceptedPartners);
    stats.setTotalContents(totalContents);
    stats.setCapacity(event.getCapacity());
    stats.setAvailableSpots(event.getCapacity() != null ?
      event.getCapacity() - totalRegistrations : -1);

    return stats;
  }

  // ===============================
  // MAPPERS
  // ===============================

  private EventDto toEventDto(Event event) {
    EventDto dto = new EventDto();
    dto.setId(event.getId());
    dto.setTitle(event.getTitle());
    dto.setDescription(event.getDescription());
    dto.setEventDate(event.getEventDate());
    dto.setLocation(event.getLocation());
    dto.setLatitude(event.getLatitude());
    dto.setLongitude(event.getLongitude());
    dto.setCapacity(event.getCapacity());
    dto.setCategory(event.getCategory());
    dto.setTopic(event.getTopic());
    dto.setStatus(event.getStatus());
    dto.setCreatedBy(event.getCreatedBy());
    dto.setCreatedAt(event.getCreatedAt());
    dto.setTotalRegistrations(event.getRegistrations() != null ?
      event.getRegistrations().size() : 0);
    dto.setTotalPartners(event.getPartners() != null ?
      event.getPartners().size() : 0);
    return dto;
  }

  private EventPartnerDto toPartnerDto(EventPartner partner) {
    EventPartnerDto dto = new EventPartnerDto();
    dto.setId(partner.getId());
    dto.setPartnerId(partner.getPartnerId());
    dto.setPartnerEmail(partner.getPartnerEmail());
    dto.setPartnerName(partner.getPartnerName());
    dto.setStatus(partner.getStatus());
    dto.setInvitedAt(partner.getInvitedAt());
    dto.setRespondedAt(partner.getRespondedAt());
    dto.setInvitationToken(partner.getInvitationToken());
    Event event = partner.getEvent();
    if (event != null) {
      dto.setEventId(event.getId());
      dto.setEventTitle(event.getTitle());
      dto.setEventDate(event.getEventDate());
      dto.setEventLocation(event.getLocation());
      dto.setEventCategory(event.getCategory() != null ? event.getCategory().name() : null);
      dto.setEventDescription(event.getDescription());
    }
    return dto;
  }

  private EventRegistrationDto toRegistrationDto(EventRegistration reg) {
    EventRegistrationDto dto = new EventRegistrationDto();
    dto.setId(reg.getId());
    dto.setUserId(reg.getUserId());
    dto.setUserEmail(reg.getUserEmail());
    dto.setUserName(reg.getUserName());
    dto.setUserType(reg.getUserType());
    dto.setStatus(reg.getStatus());
    dto.setRegisteredAt(reg.getRegisteredAt());
    dto.setCheckedInAt(reg.getCheckedInAt());
    dto.setQrToken(reg.getQrToken());
    if (reg.getEvent() != null) {
      Event ev = reg.getEvent();
      dto.setEventId(ev.getId());
      dto.setEventTitle(ev.getTitle());
      dto.setEventDate(ev.getEventDate() != null ? ev.getEventDate().toString() : null);
      dto.setEventLocation(ev.getLocation());
    }
    return dto;
  }

  private EventContentDto toContentDto(EventContent content) {
    EventContentDto dto = new EventContentDto();
    dto.setId(content.getId());
    dto.setPartnerId(content.getPartnerId());
    dto.setPartnerName(content.getPartnerName());
    dto.setType(content.getType());
    dto.setTitle(content.getTitle());
    dto.setDescription(content.getDescription());
    dto.setResourceUrl(content.getResourceUrl());
    dto.setAddedAt(content.getAddedAt());
    return dto;
  }

  // ===============================
  // iCAL EXPORT
  // ===============================

  @Transactional(readOnly = true)
  public String generateIcal(Long eventId) {
    Event event = eventRepository.findById(eventId)
      .orElseThrow(() -> new RuntimeException("Event not found"));

    DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");
    String dtStart = event.getEventDate().atOffset(ZoneOffset.UTC).format(fmt);
    String dtEnd = event.getEventDate().plusHours(2).atOffset(ZoneOffset.UTC).format(fmt);
    String now = LocalDateTime.now().atOffset(ZoneOffset.UTC).format(fmt);

    String desc = event.getDescription() != null
      ? event.getDescription().replace("\\n", " ").replace(",", "\\,") : "";

    return "BEGIN:VCALENDAR\r\n" +
      "VERSION:2.0\r\n" +
      "PRODID:-//Workify//Events//FR\r\n" +
      "CALSCALE:GREGORIAN\r\n" +
      "METHOD:PUBLISH\r\n" +
      "BEGIN:VEVENT\r\n" +
      "UID:event-" + eventId + "@workify.com\r\n" +
      "DTSTAMP:" + now + "\r\n" +
      "DTSTART:" + dtStart + "\r\n" +
      "DTEND:" + dtEnd + "\r\n" +
      "SUMMARY:" + event.getTitle() + "\r\n" +
      "DESCRIPTION:" + desc + "\r\n" +
      "LOCATION:" + event.getLocation() + "\r\n" +
      "STATUS:CONFIRMED\r\n" +
      "END:VEVENT\r\n" +
      "END:VCALENDAR";
  }

  // ===============================
  // QR CODE
  // ===============================

  public byte[] generateQrCode(String text, int size) {
    try {
      QRCodeWriter writer = new QRCodeWriter();
      BitMatrix matrix = writer.encode(text, BarcodeFormat.QR_CODE, size, size);
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      MatrixToImageWriter.writeToStream(matrix, "PNG", out);
      return out.toByteArray();
    } catch (WriterException | IOException e) {
      throw new RuntimeException("QR code generation failed", e);
    }
  }

  // ===============================
  // ATTENDANCE
  // ===============================

  @Transactional
  public EventRegistrationDto markAttended(Long eventId, Long registrationId) {
    EventRegistration registration = eventRegistrationRepository.findById(registrationId)
      .orElseThrow(() -> new RuntimeException("Registration not found"));
    if (!registration.getEvent().getId().equals(eventId)) {
      throw new RuntimeException("Registration does not belong to this event");
    }
    registration.setStatus(RegistrationStatus.ATTENDED);
    return toRegistrationDto(eventRegistrationRepository.save(registration));
  }

  @Transactional(readOnly = true)
  public java.util.Map<String, Object> getEventAnalytics(Long eventId) {
    Event event = eventRepository.findById(eventId)
      .orElseThrow(() -> new RuntimeException("Event not found"));

    List<EventRegistration> registrations = eventRegistrationRepository.findByEventId(eventId);
    long total = registrations.size();
    long confirmed = registrations.stream().filter(r -> r.getStatus() == RegistrationStatus.CONFIRMED).count();
    long pending = registrations.stream().filter(r -> r.getStatus() == RegistrationStatus.PENDING).count();
    long attended = registrations.stream().filter(r -> r.getStatus() == RegistrationStatus.ATTENDED).count();
    long cancelled = registrations.stream().filter(r -> r.getStatus() == RegistrationStatus.CANCELLED).count();
    long freelancers = registrations.stream().filter(r -> r.getUserType() == UserType.FREELANCER).count();
    long clients = registrations.stream().filter(r -> r.getUserType() == UserType.CLIENT).count();

    double attendanceRate = (confirmed + attended) > 0 ? (double) attended / (confirmed + attended) * 100 : 0;
    double noShowRate = (confirmed + attended) > 0 ? (double) confirmed / (confirmed + attended) * 100 : 0;

    java.util.Map<String, Object> analytics = new java.util.LinkedHashMap<>();
    analytics.put("eventId", eventId);
    analytics.put("eventTitle", event.getTitle());
    analytics.put("totalRegistrations", total);
    analytics.put("pending", pending);
    analytics.put("confirmed", confirmed);
    analytics.put("attended", attended);
    analytics.put("cancelled", cancelled);
    analytics.put("freelancers", freelancers);
    analytics.put("clients", clients);
    analytics.put("attendanceRate", Math.round(attendanceRate * 10.0) / 10.0);
    analytics.put("noShowRate", Math.round(noShowRate * 10.0) / 10.0);
    analytics.put("capacity", event.getCapacity());
    analytics.put("fillRate", event.getCapacity() != null && event.getCapacity() > 0
      ? Math.round((double)(confirmed + attended) / event.getCapacity() * 100 * 10.0) / 10.0 : 0);
    return analytics;
  }

  // ===============================
  // GLOBAL ANALYTICS DASHBOARD
  // ===============================

  @Transactional(readOnly = true)
  public Map<String, Object> getGlobalAnalytics() {
    List<Event> allEvents = eventRepository.findAll();
    List<EventRegistration> allRegs = eventRegistrationRepository.findAll();

    // --- KPIs ---
    long totalEvents      = allEvents.size();
    long publishedEvents  = allEvents.stream().filter(e -> e.getStatus() == EventStatus.PUBLISHED).count();
    long totalRegs        = allRegs.size();
    long confirmedRegs    = allRegs.stream().filter(r -> r.getStatus() == RegistrationStatus.CONFIRMED).count();
    long attendedRegs     = allRegs.stream().filter(r -> r.getStatus() == RegistrationStatus.ATTENDED).count();

    // --- Registrations per week (last 8 weeks) ---
    LocalDateTime since = LocalDateTime.now().minusWeeks(8);
    List<Object[]> weeklyRaw = eventRegistrationRepository.countRegistrationsPerWeek(since);

    // Build a map yearweek -> count, then fill all 8 weeks
    Map<String, Long> weekMap = new LinkedHashMap<>();
    for (int i = 7; i >= 0; i--) {
      LocalDateTime w = LocalDateTime.now().minusWeeks(i);
      int year = w.getYear();
      int week = w.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
      // MySQL YEARWEEK with mode 1 produces YYYYWW as integer
      String key = year + "W" + String.format("%02d", week);
      weekMap.put(key, 0L);
    }
    for (Object[] row : weeklyRaw) {
      // row[0] = YEARWEEK integer e.g. 202612, row[1] = count
      int yw = ((Number) row[0]).intValue();
      int yr = yw / 100;
      int wk = yw % 100;
      String key = yr + "W" + String.format("%02d", wk);
      if (weekMap.containsKey(key)) weekMap.put(key, ((Number) row[1]).longValue());
    }

    // --- Events by category ---
    Map<String, Long> byCategory = allEvents.stream()
      .filter(e -> e.getCategory() != null)
      .collect(Collectors.groupingBy(e -> e.getCategory().name(), Collectors.counting()));

    // --- Fill rate per published event (top 8) ---
    List<Map<String, Object>> fillRates = allEvents.stream()
      .filter(e -> e.getStatus() == EventStatus.PUBLISHED && e.getCapacity() != null && e.getCapacity() > 0)
      .sorted(Comparator.comparingLong((Event e) ->
          allRegs.stream().filter(r -> r.getEvent().getId().equals(e.getId()) &&
            (r.getStatus() == RegistrationStatus.CONFIRMED || r.getStatus() == RegistrationStatus.ATTENDED))
            .count()).reversed())
      .limit(8)
      .map(e -> {
        long filled = allRegs.stream().filter(r -> r.getEvent().getId().equals(e.getId()) &&
          (r.getStatus() == RegistrationStatus.CONFIRMED || r.getStatus() == RegistrationStatus.ATTENDED))
          .count();
        double rate = Math.round((double) filled / e.getCapacity() * 100 * 10.0) / 10.0;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("title", e.getTitle().length() > 20 ? e.getTitle().substring(0, 20) + "…" : e.getTitle());
        m.put("fillRate", rate);
        m.put("filled", filled);
        m.put("capacity", e.getCapacity());
        return m;
      })
      .collect(Collectors.toList());

    // --- Status distribution ---
    Map<String, Long> byStatus = allEvents.stream()
      .collect(Collectors.groupingBy(e -> e.getStatus().name(), Collectors.counting()));

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("kpis", Map.of(
      "totalEvents",     totalEvents,
      "publishedEvents", publishedEvents,
      "totalRegistrations", totalRegs,
      "confirmedRegistrations", confirmedRegs,
      "attendedRegistrations", attendedRegs,
      "conversionRate", totalRegs > 0 ? Math.round((double)(confirmedRegs + attendedRegs) / totalRegs * 100 * 10.0) / 10.0 : 0.0
    ));
    result.put("weeklyRegistrations", Map.of(
      "labels", new ArrayList<>(weekMap.keySet()),
      "data",   new ArrayList<>(weekMap.values())
    ));
    result.put("byCategory", byCategory);
    result.put("byStatus",   byStatus);
    result.put("fillRates",  fillRates);
    return result;
  }

  @Transactional(readOnly = true)
  public java.util.Map<String, Object> validateTicket(String qrData) {
    java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
    try {
      // QR format: WORKIFY|EVENT:{id}|REG:{regId}|USER:{userId}|STATUS:CONFIRMED
      if (!qrData.startsWith("WORKIFY|")) {
        result.put("valid", false);
        result.put("message", "QR code invalide");
        return result;
      }
      String[] parts = qrData.split("\\|");
      Long eventId = Long.parseLong(parts[1].split(":")[1]);
      Long regId = Long.parseLong(parts[2].split(":")[1]);

      EventRegistration reg = eventRegistrationRepository.findById(regId)
        .orElse(null);

      if (reg == null || !reg.getEvent().getId().equals(eventId)) {
        result.put("valid", false);
        result.put("message", "Inscription introuvable");
        return result;
      }

      if (reg.getStatus() == RegistrationStatus.ATTENDED) {
        result.put("valid", false);
        result.put("message", "Ticket déjà utilisé");
        result.put("participant", reg.getUserName());
        return result;
      }

      if (reg.getStatus() == RegistrationStatus.CANCELLED) {
        result.put("valid", false);
        result.put("message", "Inscription annulée");
        return result;
      }

      if (reg.getStatus() == RegistrationStatus.PENDING) {
        result.put("valid", false);
        result.put("message", "Inscription en attente de confirmation");
        return result;
      }

      result.put("valid", true);
      result.put("message", "Ticket valide ✅");
      result.put("participant", reg.getUserName());
      result.put("email", reg.getUserEmail());
      result.put("userType", reg.getUserType());
      result.put("eventTitle", reg.getEvent().getTitle());
      result.put("registrationId", regId);
      result.put("eventId", eventId);
      return result;
    } catch (Exception e) {
      result.put("valid", false);
      result.put("message", "Erreur de validation: " + e.getMessage());
      return result;
    }
  }

  private List<EventStatus> getPubliclyVisibleStatuses() {
    return List.of(
      EventStatus.DRAFT,
      EventStatus.PENDING_PARTNERS,
      EventStatus.ENRICHED,
      EventStatus.PUBLISHED
    );
  }

  private boolean isPubliclyVisible(EventStatus status) {
    return status != null && getPubliclyVisibleStatuses().contains(status);
  }
}
