package com.workify.communication.web.controller;

import com.workify.communication.exception.UserBannedException;
import com.workify.communication.service.MessageService;
import com.workify.communication.service.UserModerationService;
import com.workify.communication.web.dto.MessageResponse;
import com.workify.communication.web.dto.SendMessageRequest;
import com.workify.communication.web.dto.UpdateMessageRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class MessageController {

    private final MessageService messageService;
    private final UserModerationService userModerationService;

    // ==========================================
    // CREATE - ENVOYER MESSAGE
    // ==========================================

    /**
     * ENVOYER UN MESSAGE
     * POST /api/messages?senderId=1
     *
     * Body: {
     *   "conversationId": 1,
     *   "content": "Bonjour!",
     *   "contentType": "TEXT"
     * }
     */
    @PostMapping
    public ResponseEntity<?> sendMessage(
            @RequestParam Long senderId,
            @RequestBody SendMessageRequest request) {

        log.info("ðŸ”µ POST /api/messages - User: {}, Conv: {}",
                senderId, request.getConversationId());

        try {
            MessageResponse message = messageService.sendMessage(senderId, request);
            log.info("âœ… Message envoyÃ© - ID: {}", message.getId());
            return ResponseEntity.ok(message);
        } catch (UserBannedException e) {
            log.warn("🚫 Banned user {} attempted to send a message", senderId);
            Map<String, Object> body = new HashMap<>();
            body.put("banned", true);
            body.put("bannedUntil", e.getBannedUntil().toString());
            body.put("message", "Your messaging privileges are temporarily suspended.");
            return ResponseEntity.status(429).body(body);
        } catch (Exception e) {
            log.error("âŒ Erreur envoi message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur: " + e.getMessage());
        }
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAttachment(
            @RequestParam Long senderId,
            @RequestParam Long conversationId,
            @RequestParam("file") MultipartFile file) {

        log.info("ðŸ”µ POST /api/messages/upload - User: {}, Conv: {}, file: {}",
                senderId, conversationId, file != null ? file.getOriginalFilename() : "null");

        try {
            MessageResponse message = messageService.sendAttachmentMessage(senderId, conversationId, file);
            log.info("âœ… Fichier envoyÃ© - Message ID: {}", message.getId());
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.error("âŒ Erreur upload fichier", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> getAttachment(@PathVariable String filename) {
        try {
            Resource resource = messageService.getAttachmentResource(filename);
            String contentType = determineContentType(filename);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header("Accept-Ranges", "bytes")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private String determineContentType(String filename) {
        String lower = filename.toLowerCase(java.util.Locale.ROOT);
        // Strip codec params for matching (e.g. ".webm;codecs=opus")
        int semi = lower.indexOf(';');
        if (semi >= 0) lower = lower.substring(0, semi);
        if (lower.endsWith(".webm"))  return "audio/webm";
        if (lower.endsWith(".mp3"))   return "audio/mpeg";
        if (lower.endsWith(".ogg"))   return "audio/ogg";
        if (lower.endsWith(".wav"))   return "audio/wav";
        if (lower.endsWith(".m4a"))   return "audio/mp4";
        if (lower.endsWith(".opus"))  return "audio/ogg";
        if (lower.endsWith(".aac"))   return "audio/aac";
        if (lower.endsWith(".png"))   return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif"))   return "image/gif";
        if (lower.endsWith(".webp"))  return "image/webp";
        if (lower.endsWith(".mp4"))   return "video/mp4";
        if (lower.endsWith(".pdf"))   return "application/pdf";
        if (lower.endsWith(".txt"))   return "text/plain";
        return "application/octet-stream";
    }

    // ==========================================
    // READ - LIRE MESSAGES
    // ==========================================

    /**
     * RÃ‰CUPÃ‰RER TOUS LES MESSAGES D'UNE CONVERSATION
     * GET /api/messages/conversation/1
     */
    /**
     * GET /api/messages/conversation/{conversationId}?userId=X
     *
     * Returns only the messages visible to {@code userId}:
     * all normal messages + BLOCKED messages sent BY userId (their own violations).
     * BLOCKED messages from other senders are excluded server-side so the
     * recipient never receives them.
     */
    @GetMapping({"/conversation/{conversationId}", "/conversation/{conversationId}/"})
    public ResponseEntity<?> getMessagesByConversation(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        log.info("ðŸ”µ GET /api/messages/conversation/{}", conversationId);

        try {
            List<MessageResponse> messages = messageService.getMessagesByConversation(conversationId, userId);
            log.info("âœ… {} messages rÃ©cupÃ©rÃ©s", messages.size());
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("âŒ Erreur rÃ©cupÃ©ration messages", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur: " + e.getMessage());
        }
    }

    /**
     * RÃ‰CUPÃ‰RER UN MESSAGE PAR ID
     * GET /api/messages/1
     */
    @GetMapping({"/{id}", "/{id}/"})
    public ResponseEntity<?> getMessageById(@PathVariable Long id) {
        log.info("ðŸ”µ GET /api/messages/{}", id);

        try {
            MessageResponse message = messageService.getMessageById(id);
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.error("âŒ Erreur rÃ©cupÃ©ration message {}", id, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Message non trouvÃ©");
        }
    }

    // ==========================================
    // UPDATE - MODIFIER MESSAGE
    // ==========================================

    /**
     * MODIFIER UN MESSAGE
     * PUT /api/messages/1
     *
     * Body: {
     *   "content": "Message modifiÃ©",
     *   "reactionEmoji": "â¤ï¸"
     * }
     */
    @PutMapping({"/{id}", "/{id}/"})
    public ResponseEntity<?> updateMessage(
            @PathVariable Long id,
            @RequestBody UpdateMessageRequest request) {

        log.info("ðŸ”µ PUT /api/messages/{}", id);

        try {
            MessageResponse updated = messageService.updateMessage(id, request);
            log.info("âœ… Message {} mis Ã  jour", id);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("âŒ Erreur modification message {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur: " + e.getMessage());
        }
    }

    /**
     * MARQUER MESSAGE COMME LU
     * PATCH /api/messages/1/read
     */
    @PatchMapping({"/{id}/read", "/{id}/read/"})
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        log.info("ðŸ”µ PATCH /api/messages/{}/read", id);

        try {
            messageService.markAsRead(id);
            log.info("âœ… Message {} marquÃ© comme lu", id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("âŒ Erreur marquage lecture message {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur: " + e.getMessage());
        }
    }

    // ==========================================
    // DELETE - SUPPRIMER MESSAGE
    // ==========================================

    /**
     * SUPPRIMER UN MESSAGE (HARD DELETE)
     * DELETE /api/messages/1
     *
     * â†’ Le message est supprimÃ© dÃ©finitivement de la base
     */
    @DeleteMapping({"/{id}", "/{id}/"})
    public ResponseEntity<?> softDeleteMessage(@PathVariable Long id) {
        log.info("ðŸ”µ DELETE /api/messages/{} (HARD)", id);

        try {
            messageService.softDeleteMessage(id);
            log.info("âœ… Message {} supprimÃ© dÃ©finitivement", id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("âŒ Erreur suppression soft message {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur: " + e.getMessage());
        }
    }

    /**
     * SUPPRIMER DÃ‰FINITIVEMENT UN MESSAGE (HARD DELETE)
     * DELETE /api/messages/1/permanent
     *
     * â†’ DELETE FROM messages WHERE id = 1
     * â†’ Le message est SUPPRIMÃ‰ de la base de donnÃ©es!
     */
    @DeleteMapping({"/{id}/permanent", "/{id}/permanent/"})
    public ResponseEntity<?> hardDeleteMessage(@PathVariable Long id) {
        log.info("ðŸ”µ DELETE /api/messages/{}/permanent (HARD - DELETE FROM DB)", id);

        try {
            messageService.hardDeleteMessage(id);
            log.info("âœ… Message {} supprimÃ© dÃ©finitivement", id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("âŒ Erreur suppression hard message {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur: " + e.getMessage());
        }
    }

    // ==========================================
    // MODERATION STATUS
    // ==========================================

    /**
     * GET /api/messages/moderation-status?userId=X
     * Returns the current ban status for a user.
     * Called on component init to restore ban state after page reload.
     */
    @GetMapping("/moderation-status")
    public ResponseEntity<?> getModerationStatus(@RequestParam Long userId) {
        // Return the current moderation status WITHOUT performing side-effects.
        // Avoid deleting blocked messages as a result of a simple status check —
        // the scheduled cleanup task (`processExpiredBans`) will remove expired
        // blocked messages in short order (every 30s) and ensures consistent
        // behaviour across clients.
        boolean banned = userModerationService.isUserBanned(userId);
        LocalDateTime bannedUntil = userModerationService.getBannedUntil(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("banned", banned);
        result.put("bannedUntil", Optional.ofNullable(bannedUntil).map(Object::toString).orElse(null));
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/messages/moderation/refresh?userId=X
     * Triggers on-demand processing of any expired ban for {@code userId} (deletes blocked
     * messages and clears the ban) and returns the up-to-date moderation status.
     * This endpoint is intended to be called when a user navigates into a conversation
     * so that expired bans are resolved immediately and blocked messages removed.
     */
    @GetMapping("/moderation/refresh")
    public ResponseEntity<?> refreshModerationStatus(@RequestParam Long userId) {
        try {
            userModerationService.processExpiredBanIfNeeded(userId);
        } catch (Exception e) {
            // Non-fatal — continue to return status even if processing fails
            log.warn("⚠️ Error processing expired ban for user {}: {}", userId, e.getMessage());
        }
        boolean banned = userModerationService.isUserBanned(userId);
        LocalDateTime bannedUntil = userModerationService.getBannedUntil(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("banned", banned);
        result.put("bannedUntil", Optional.ofNullable(bannedUntil).map(Object::toString).orElse(null));
        return ResponseEntity.ok(result);
    }

    // ── Dev / test reset endpoints ─────────────────────────────────────────────

    /**
     * DELETE /api/messages/moderation/bans
     * Lifts ALL active bans immediately.
     * Fixes test accounts that were banned with the old 24-hour duration.
     */
    @DeleteMapping("/moderation/bans")
    public ResponseEntity<?> clearAllBans() {
        int count = userModerationService.clearAllBans();
        return ResponseEntity.ok(Map.of(
            "cleared", count,
            "message", count + " ban(s) lifted — all accounts can now send messages."
        ));
    }

    /**
     * DELETE /api/messages/moderation/bans/{userId}
     * Lifts the ban for one specific user immediately.
     */
    @DeleteMapping("/moderation/bans/{userId}")
    public ResponseEntity<?> clearBanForUser(@PathVariable Long userId) {
        int count = userModerationService.clearBanForUser(userId);
        return ResponseEntity.ok(Map.of(
            "cleared", count,
            "userId", userId,
            "message", count > 0
                ? "Ban lifted for user " + userId + "."
                : "User " + userId + " had no active ban."
        ));
    }
}