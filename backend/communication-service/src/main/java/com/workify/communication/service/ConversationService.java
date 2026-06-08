package com.workify.communication.service;

import com.workify.communication.domain.Conversation;
import com.workify.communication.enums.ConversationStatus;
import com.workify.communication.enums.PriorityLevel;
import com.workify.communication.repository.ConversationRepository;
import com.workify.communication.web.dto.CreateConversationDTO;
import com.workify.communication.web.dto.UpdateConversationDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import com.workify.communication.exception.BlockedConversationException;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;

    // ── CREATE ─────────────────────────────────────────────────────
    @Transactional
    public Conversation getOrCreateConversation(Long currentUserId, CreateConversationDTO dto) {
        log.info("Looking for existing conversation between {} and {}", currentUserId, dto.getReceiverId());

        List<Conversation> existing =
                conversationRepository.findAllByParticipants(currentUserId, dto.getReceiverId());

        if (!existing.isEmpty()) {
            // Pick the best candidate: prefer active non-blocked > archived non-blocked > blocked
            Conversation conv = existing.stream()
                    .filter(c -> !ConversationStatus.BLOCKED.equals(c.getStatus()) && !Boolean.TRUE.equals(c.getIsArchived()))
                    .findFirst()
                    .or(() -> existing.stream()
                            .filter(c -> !ConversationStatus.BLOCKED.equals(c.getStatus()))
                            .findFirst())
                    .orElse(existing.get(0));

            log.info("Found existing conversation — ID: {} status={} archived={}",
                    conv.getId(), conv.getStatus(), conv.getIsArchived());

            // Surface BLOCKED status so Angular can show a clear warning
            if (ConversationStatus.BLOCKED.equals(conv.getStatus())) {
                log.warn("Conversation {} is BLOCKED — refusing silent reopen", conv.getId());
                throw new BlockedConversationException(
                        "This contact is blocked. Unblock them first before opening a conversation.",
                        conv
                );
            }

            // Auto-unarchive instead of creating a duplicate row
            if (Boolean.TRUE.equals(conv.getIsArchived())) {
                conv.setIsArchived(false);
                conv.setArchivedAt(null);
                conv = conversationRepository.save(conv);
                log.info("Auto-unarchived conversation {} to prevent duplicate creation", conv.getId());
            }

            return conv;
        }

        Conversation newConv = Conversation.builder()
                .creatorId(currentUserId)
                .receiverId(dto.getReceiverId())
                .title(dto.getTitle() != null ? dto.getTitle() : "Chat")
                .themeColor(dto.getThemeColor())
                .emojiIcon(dto.getEmojiIcon())
                .status(ConversationStatus.ACTIVE)
                .priorityLevel(PriorityLevel.MEDIUM)
                .isFavorite(false)
                .isArchived(false)
                .createdAt(LocalDateTime.now())
                .lastMessageAt(LocalDateTime.now())
                .build();
        Conversation saved = conversationRepository.save(newConv);
        log.info("Created new conversation — ID: {}", saved.getId());
        return saved;
    }

    // ── READ ───────────────────────────────────────────────────────
    public Page<Conversation> getAllConversationsByUser(Long userId, Pageable pageable) {
        return conversationRepository.findAllByUserId(userId, pageable);
    }

    public Conversation getConversationById(Long id, Long currentUserId) {
        Conversation c = conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + id));
        if (!c.getCreatorId().equals(currentUserId) && !c.getReceiverId().equals(currentUserId))
            throw new RuntimeException("Access denied to conversation: " + id);
        return c;
    }

    // ── UPDATE ─────────────────────────────────────────────────────
    @Transactional
    public Conversation updateConversation(Long id, UpdateConversationDTO dto) {
        Conversation c = conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + id));
        if (dto.getTitle()       != null) c.setTitle(dto.getTitle());
        if (dto.getThemeColor()  != null) c.setThemeColor(dto.getThemeColor());
        if (dto.getEmojiIcon()   != null) c.setEmojiIcon(dto.getEmojiIcon());
        if (dto.getIsFavorite()  != null) c.setIsFavorite(dto.getIsFavorite());
        if (dto.getIsArchived()  != null) {
            c.setIsArchived(dto.getIsArchived());
            c.setArchivedAt(dto.getIsArchived() ? LocalDateTime.now() : null);
        }
        if (dto.getStatus()      != null) c.setStatus(dto.getStatus());
        if (dto.getBlockedById() != null) c.setBlockedById(dto.getBlockedById());
        return conversationRepository.save(c);
    }

    // ── BLOCK ──────────────────────────────────────────────────────
    /**
     * Block a conversation.
     * Sets status = BLOCKED and records the userId who performed the block.
     * The row stays in the DB so it appears in the "Blocked" tab.
     * Angular filters it out of all normal tabs based on status='BLOCKED'.
     */
    @Transactional
    public Conversation blockConversation(Long id, Long blockedByUserId) {
        Conversation c = conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + id));
        if (!c.getCreatorId().equals(blockedByUserId) && !c.getReceiverId().equals(blockedByUserId))
            throw new RuntimeException("Access denied: user " + blockedByUserId + " is not a participant");

        c.setStatus(ConversationStatus.BLOCKED);
        c.setBlockedById(blockedByUserId);
        Conversation saved = conversationRepository.save(c);
        log.info("Conversation {} blocked by user {}", id, blockedByUserId);
        return saved;
    }

    /**
     * Unblock a conversation.
     * Restores status = ACTIVE and clears blockedById.
     * Only the user who originally blocked can unblock.
     */
    @Transactional
    public Conversation unblockConversation(Long id, Long requestingUserId) {
        Conversation c = conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + id));
        if (!ConversationStatus.BLOCKED.equals(c.getStatus()))
            throw new RuntimeException("Conversation " + id + " is not blocked");
        if (!requestingUserId.equals(c.getBlockedById()))
            throw new RuntimeException("Only the user who blocked can unblock conversation " + id);

        c.setStatus(ConversationStatus.ACTIVE);
        c.setBlockedById(null);
        Conversation saved = conversationRepository.save(c);
        log.info("Conversation {} unblocked by user {}", id, requestingUserId);
        return saved;
    }

    // ── DELETE ─────────────────────────────────────────────────────
    @Transactional
    public void softDeleteConversation(Long id) {
        Conversation c = conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found: " + id));
        c.setIsArchived(true);
        c.setArchivedAt(LocalDateTime.now());
        conversationRepository.save(c);
        log.info("Conversation {} soft-deleted (archived)", id);
    }

    @Transactional
    public void hardDeleteConversation(Long id) {
        if (!conversationRepository.existsById(id)) {
            log.warn("Conversation {} already deleted — skipping (idempotent)", id);
            return;
        }
        conversationRepository.deleteById(id);
        log.info("Conversation {} permanently deleted from DB", id);
    }
}