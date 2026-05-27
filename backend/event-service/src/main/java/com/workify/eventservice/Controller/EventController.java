package com.workify.eventservice.Controller;

import com.workify.eventservice.Dto.*;
import com.workify.eventservice.entites.EventCategory;
import com.workify.eventservice.entites.EventStatus;
import com.workify.eventservice.entites.RegistrationStatus;
import com.workify.eventservice.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
@Slf4j
public class EventController {

  private final EventService eventService;

  // ===============================
  // EVENT CRUD — ADMIN
  // ===============================

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<EventDto> createEvent(
    @Valid @RequestBody CreateEventRequest request,
    Authentication authentication) {
    String adminId = ((Jwt) authentication.getPrincipal()).getSubject();
    return ResponseEntity.ok(eventService.createEvent(request, adminId));
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<List<EventDto>> getAllEvents() {
    try {
      return ResponseEntity.ok(eventService.getAllEvents());
    } catch (Exception e) {
      log.error("ERROR in getAllEvents: {}", e.getMessage(), e);
      throw e;
    }
  }

  @GetMapping("/{id}")
  public ResponseEntity<EventDto> getEventById(@PathVariable Long id) {
    return ResponseEntity.ok(eventService.getEventById(id));
  }

  @GetMapping("/published")
  public ResponseEntity<List<EventDto>> getPublishedEvents() {
    return ResponseEntity.ok(eventService.getPublishedEvents());
  }

  @GetMapping("/category/{category}")
  public ResponseEntity<List<EventDto>> getEventsByCategory(
    @PathVariable EventCategory category) {
    return ResponseEntity.ok(eventService.getEventsByCategory(category));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<EventDto> updateEvent(
    @PathVariable Long id,
    @Valid @RequestBody CreateEventRequest request) {
    return ResponseEntity.ok(eventService.updateEvent(id, request));
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<EventDto> updateStatus(
    @PathVariable Long id,
    @RequestParam EventStatus status) {
    return ResponseEntity.ok(eventService.updateStatus(id, status));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
    eventService.deleteEvent(id);
    return ResponseEntity.noContent().build();
  }

  // ===============================
  // PARTNER MANAGEMENT — ADMIN
  // ===============================

  @PostMapping("/{id}/partners")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<EventPartnerDto> invitePartner(
    @PathVariable Long id,
    @Valid @RequestBody InvitePartnerRequest request,
    @RequestHeader("Authorization") String authToken) {
    return ResponseEntity.ok(eventService.invitePartner(id, request, authToken));
  }

  @GetMapping("/{id}/partners")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<List<EventPartnerDto>> getEventPartners(
    @PathVariable Long id) {
    return ResponseEntity.ok(eventService.getEventPartners(id));
  }

  @GetMapping("/{id}/available-partners")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<List<com.workify.eventservice.Dto.PartnerSummaryDto>> getAvailablePartners(
    @PathVariable Long id,
    @RequestHeader("Authorization") String authToken) {
    return ResponseEntity.ok(eventService.getAvailablePartners(id, authToken));
  }

  @GetMapping("/partner/my-invitations")
  @PreAuthorize("hasRole('PARTNER')")
  public ResponseEntity<List<EventPartnerDto>> getMyInvitations(Authentication authentication) {
    String partnerId = ((Jwt) authentication.getPrincipal()).getSubject();
    return ResponseEntity.ok(eventService.getMyInvitations(partnerId));
  }

  @PutMapping("/partners/respond/{token}")
  @PreAuthorize("hasRole('PARTNER')")
  public ResponseEntity<EventPartnerDto> respondToInvitation(
    @PathVariable String token,
    @Valid @RequestBody PartnerResponseRequest request) {
    return ResponseEntity.ok(eventService.respondToInvitation(token, request));
  }

  // ===============================
  // REGISTRATION — USER
  // ===============================

  @PostMapping("/{id}/register")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<EventRegistrationDto> registerToEvent(
    @PathVariable Long id,
    @Valid @RequestBody RegisterEventRequest request,
    Authentication authentication,
    @RequestHeader("Authorization") String authToken) {
    Jwt jwt = (Jwt) authentication.getPrincipal();
    String userId = jwt.getSubject();
    // Enrich from JWT so name/email are never empty
    if (request.getUserEmail() == null || request.getUserEmail().isEmpty()) {
      request.setUserEmail(jwt.getClaimAsString("email"));
    }
    if (request.getUserName() == null || request.getUserName().isEmpty()) {
      String name = jwt.getClaimAsString("name");
      if (name == null || name.isEmpty()) {
        name = jwt.getClaimAsString("preferred_username");
      }
      request.setUserName(name);
    }
    return ResponseEntity.ok(
      eventService.registerToEvent(id, request, userId, authToken));
  }

  @DeleteMapping("/{id}/register")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<Void> cancelRegistration(
    @PathVariable Long id,
    Authentication authentication) {
    String userId = ((Jwt) authentication.getPrincipal()).getSubject();
    eventService.cancelRegistration(id, userId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}/registrations")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<List<EventRegistrationDto>> getEventRegistrations(
    @PathVariable Long id) {
    return ResponseEntity.ok(eventService.getEventRegistrations(id));
  }

  @GetMapping("/my-registrations")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<EventRegistrationDto>> getMyRegistrations(
    Authentication authentication) {
    String userId = ((Jwt) authentication.getPrincipal()).getSubject();
    return ResponseEntity.ok(eventService.getMyRegistrations(userId));
  }

  @GetMapping("/{id}/my-registration")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<EventRegistrationDto> getMyRegistration(
    @PathVariable Long id,
    Authentication authentication) {
    String userId = ((Jwt) authentication.getPrincipal()).getSubject();
    return eventService.getMyRegistration(id, userId)
      .map(ResponseEntity::ok)
      .orElse(ResponseEntity.notFound().build());
  }

  @PatchMapping("/{id}/registrations/{registrationId}/status")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<EventRegistrationDto> updateRegistrationStatus(
    @PathVariable Long id,
    @PathVariable Long registrationId,
    @RequestParam RegistrationStatus status) {
    return ResponseEntity.ok(
      eventService.updateRegistrationStatus(id, registrationId, status));
  }

  // ===============================
  // CONTENT — PARTNER
  // ===============================

  @PostMapping("/{id}/content")
  @PreAuthorize("hasRole('PARTNER')")
  public ResponseEntity<EventContentDto> addContent(
    @PathVariable Long id,
    @Valid @RequestBody AddContentRequest request,
    Authentication authentication,
    @RequestHeader("Authorization") String authToken) {
    String partnerId = ((Jwt) authentication.getPrincipal()).getSubject();
    return ResponseEntity.ok(
      eventService.addContent(id, request, partnerId, authToken));
  }

  @GetMapping("/{id}/content")
  public ResponseEntity<List<EventContentDto>> getEventContents(
    @PathVariable Long id) {
    return ResponseEntity.ok(eventService.getEventContents(id));
  }

  // ===============================
  // STATS — ADMIN
  // ===============================

  @GetMapping("/{id}/stats")
  public ResponseEntity<EventStatsDto> getEventStats(@PathVariable Long id) {
    return ResponseEntity.ok(eventService.getEventStats(id));
  }

  // ===============================
  // iCAL — PUBLIC
  // ===============================

  @GetMapping("/{id}/ical")
  public ResponseEntity<byte[]> downloadIcal(@PathVariable Long id) {
    String ical = eventService.generateIcal(id);
    byte[] bytes = ical.getBytes(StandardCharsets.UTF_8);
    return ResponseEntity.ok()
      .contentType(MediaType.parseMediaType("text/calendar; charset=utf-8"))
      .header("Content-Disposition", "attachment; filename=\"event-" + id + ".ics\"")
      .body(bytes);
  }

  // ===============================
  // QR CODE TICKET — AUTHENTICATED
  // ===============================

  @GetMapping(value = "/{id}/ticket/{registrationId}/qr", produces = MediaType.IMAGE_PNG_VALUE)
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<byte[]> getTicketQr(
    @PathVariable Long id,
    @PathVariable Long registrationId,
    Authentication authentication) {
    // Use the secure qrToken stored in DB, not a raw concatenated string
    EventRegistrationDto reg = eventService.getRegistrationById(registrationId);
    String tokenToEncode = reg.getQrToken() != null ? reg.getQrToken()
      : "WORKIFY|EVENT:" + id + "|REG:" + registrationId;
    byte[] qrImage = eventService.generateQrCode(tokenToEncode, 350);
    return ResponseEntity.ok()
      .contentType(MediaType.IMAGE_PNG)
      .body(qrImage);
  }

  // ===============================
  // SCAN TICKET — ADMIN (validate + mark attended in one call)
  // ===============================

  @PostMapping("/scan")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<java.util.Map<String, Object>> scanTicket(
    @RequestBody java.util.Map<String, String> body) {
    String qrToken = body.get("qrToken");
    if (qrToken == null || qrToken.isBlank()) {
      return ResponseEntity.badRequest().body(
        java.util.Map.of("valid", false, "message", "Token manquant"));
    }
    return ResponseEntity.ok(eventService.scanTicket(qrToken));
  }

  // ===============================
  // TICKET VALIDATION (legacy text input) — ADMIN
  // ===============================

  @PostMapping("/validate-ticket")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<java.util.Map<String, Object>> validateTicket(
    @RequestBody java.util.Map<String, String> body) {
    String qrData = body.get("qrData");
    return ResponseEntity.ok(eventService.validateTicket(qrData));
  }

  // ===============================
  // ATTENDANCE — ADMIN
  // ===============================

  @PostMapping("/{id}/registrations/{registrationId}/attend")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<EventRegistrationDto> markAttended(
    @PathVariable Long id,
    @PathVariable Long registrationId) {
    return ResponseEntity.ok(eventService.markAttended(id, registrationId));
  }

  // ===============================
  // ANALYTICS — ADMIN
  // ===============================

  @GetMapping("/{id}/analytics")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<java.util.Map<String, Object>> getEventAnalytics(@PathVariable Long id) {
    return ResponseEntity.ok(eventService.getEventAnalytics(id));
  }

  @GetMapping("/analytics/dashboard")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<java.util.Map<String, Object>> getGlobalAnalytics() {
    return ResponseEntity.ok(eventService.getGlobalAnalytics());
  }
}
