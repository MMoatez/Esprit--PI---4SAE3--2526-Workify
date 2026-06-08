package com.workify.communication.web.controller;

import com.workify.communication.domain.Conversation;
import com.workify.communication.domain.Message;
import com.workify.communication.repository.MessageRepository;
import com.workify.communication.service.ConversationService;
import com.workify.communication.service.MessageService;
import com.workify.communication.web.dto.CreateConversationDTO;
import com.workify.communication.web.dto.MessageResponse;
import com.workify.communication.web.dto.UpdateConversationDTO;
import com.workify.communication.exception.BlockedConversationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class ConversationController {

    private final ConversationService conversationService;
    private final MessageService      messageService;
    private final MessageRepository   messageRepository;

    // ── CREATE ─────────────────────────────────────────────────────
    @PostMapping({"/start", "/start/"})
    public ResponseEntity<?> startConversation(
            @RequestParam Long currentUserId,
            @RequestBody  CreateConversationDTO dto) {
        log.info("POST /api/conversations/start — user={}, receiver={}", currentUserId, dto.getReceiverId());
        try {
            return ResponseEntity.ok(conversationService.getOrCreateConversation(currentUserId, dto));
        } catch (BlockedConversationException bce) {
            // HTTP 409: the existing conversation is BLOCKED.
            // Return the conversation object so Angular knows the conversation ID
            // and can direct the user to the Blocked tab to unblock first.
            log.warn("startConversation blocked — convId={}", bce.getConversation().getId());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(bce.getConversation());
        } catch (Exception e) {
            log.error("startConversation error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }

    // ── READ ───────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getAllConversations(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size) {
        log.info("GET /api/conversations — user={}", userId);
        try {
            var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "lastMessageAt"));
            Page<Conversation> result = conversationService.getAllConversationsByUser(userId, pageable);
            result.getContent().forEach(conv -> enrichConversation(conv, userId));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("getAllConversations error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }

    @GetMapping({"/{id}", "/{id}/"})
    public ResponseEntity<?> getConversation(
            @PathVariable Long id,
            @RequestParam Long currentUserId) {
        log.info("GET /api/conversations/{} — user={}", id, currentUserId);
        try {
            Conversation conv = conversationService.getConversationById(id, currentUserId);
            enrichConversation(conv, currentUserId);
            return ResponseEntity.ok(conv);
        } catch (Exception e) {
            log.error("getConversation error", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Conversation not found");
        }
    }

    /** Populates computed @Transient fields before serialisation. */
    private void enrichConversation(Conversation conv, Long userId) {
        conv.setUnreadCount((int) messageRepository.countUnread(conv.getId(), userId));
        List<Message> last = messageRepository.findLastByConversation(
                conv.getId(), PageRequest.of(0, 1));
        if (!last.isEmpty()) {
            conv.setLastMessageContent(last.get(0).getContent());
            conv.setLastMessageSenderId(last.get(0).getSenderId());
        }
        conv.setBlockedByMe(conv.getBlockedById() != null && conv.getBlockedById().equals(userId));
    }

    @GetMapping({"/{id}/messages", "/{id}/messages/"})
    public ResponseEntity<?> getMessages(@PathVariable Long id) {
        log.info("GET /api/conversations/{}/messages", id);
        try {
            List<MessageResponse> messages = messageService.getMessagesByConversation(id);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("getMessages error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }

    // ── UPDATE ─────────────────────────────────────────────────────
    @PutMapping({"/{id}", "/{id}/"})
    public ResponseEntity<?> updateConversation(
            @PathVariable Long id,
            @RequestBody  UpdateConversationDTO dto) {
        log.info("PUT /api/conversations/{}", id);
        try {
            return ResponseEntity.ok(conversationService.updateConversation(id, dto));
        } catch (Exception e) {
            log.error("updateConversation error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }

    @PatchMapping({"/{id}/read-all", "/{id}/read-all/"})
    public ResponseEntity<?> markAllAsRead(
            @PathVariable Long id,
            @RequestParam Long userId) {
        log.info("PATCH /api/conversations/{}/read-all — user={}", id, userId);
        try {
            messageService.markAllAsRead(id, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("markAllAsRead error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }

    // ── BLOCK / UNBLOCK ────────────────────────────────────────────
    /**
     * POST /api/conversations/{id}/block?currentUserId=X
     *
     * Sets status = BLOCKED, records blockedById = currentUserId.
     * The row stays in the DB — Angular shows it only in the Blocked tab.
     */
    @PostMapping({"/{id}/block", "/{id}/block/"})
    public ResponseEntity<?> blockConversation(
            @PathVariable Long id,
            @RequestParam Long currentUserId) {
        log.info("POST /api/conversations/{}/block — user={}", id, currentUserId);
        try {
            Conversation blocked = conversationService.blockConversation(id, currentUserId);
            blocked.setBlockedByMe(true);
            return ResponseEntity.ok(blocked);
        } catch (Exception e) {
            log.error("blockConversation error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }

    /**
     * POST /api/conversations/{id}/unblock?currentUserId=X
     *
     * Restores status = ACTIVE, clears blockedById.
     * Conversation returns to the normal list.
     */
    @PostMapping({"/{id}/unblock", "/{id}/unblock/"})
    public ResponseEntity<?> unblockConversation(
            @PathVariable Long id,
            @RequestParam Long currentUserId) {
        log.info("POST /api/conversations/{}/unblock — user={}", id, currentUserId);
        try {
            Conversation unblocked = conversationService.unblockConversation(id, currentUserId);
            unblocked.setBlockedByMe(false);
            return ResponseEntity.ok(unblocked);
        } catch (RuntimeException e) {
            log.error("unblockConversation error: {}", e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("Only the user who blocked")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only the blocker can unblock this conversation.");
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error: " + e.getMessage());
        } catch (Exception e) {
            log.error("unblockConversation unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }

    // ── DELETE ─────────────────────────────────────────────────────
    @DeleteMapping({"/{id}", "/{id}/"})
    public ResponseEntity<?> deleteConversation(
            @PathVariable Long id,
            @RequestParam(required = false) Long currentUserId) {
        log.info("DELETE /api/conversations/{} — user={}", id, currentUserId);
        try {
            // Enforce: only the blocker can delete a BLOCKED conversation
            if (currentUserId != null) {
                try {
                    Conversation conv = conversationService.getConversationById(id, currentUserId);
                    if (com.workify.communication.enums.ConversationStatus.BLOCKED.equals(conv.getStatus())
                            && !currentUserId.equals(conv.getBlockedById())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body("Only the user who blocked this conversation can delete it.");
                    }
                } catch (Exception ignored) { /* access check failed — let hardDelete reject below */ }
            }
            conversationService.hardDeleteConversation(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("deleteConversation error for id={}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping({"/{id}/permanent", "/{id}/permanent/"})
    public ResponseEntity<?> hardDeleteConversation(@PathVariable Long id) {
        log.info("DELETE /api/conversations/{}/permanent — hard delete", id);
        try {
            conversationService.hardDeleteConversation(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("hardDeleteConversation error for id={}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }
}