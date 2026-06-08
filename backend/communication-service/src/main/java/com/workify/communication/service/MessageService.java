package com.workify.communication.service;

import com.workify.communication.domain.Conversation;
import com.workify.communication.domain.Message;
import com.workify.communication.domain.UserModeration;
import com.workify.communication.enums.ContentType;
import com.workify.communication.enums.DeliveryStatus;
import com.workify.communication.exception.UserBannedException;
import com.workify.communication.repository.ConversationRepository;
import com.workify.communication.repository.MessageRepository;
import com.workify.communication.service.ContentModerationService.ModerationResult;
import com.workify.communication.web.dto.MessageResponse;
import com.workify.communication.web.dto.SendMessageRequest;
import com.workify.communication.web.dto.UpdateMessageRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ContentModerationService contentModerationService;
    private final UserModerationService userModerationService;
    private final com.workify.communication.service.ScheduledJobService scheduledJobService;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private RagClient ragClient;

    @Value("${app.upload.messages-dir:./uploads/messages}")
    private String messagesUploadDir;

    @Transactional
    public MessageResponse sendMessage(Long senderId, SendMessageRequest request) {
        log.info("💬 Envoi message - User: {}, Conv: {}", senderId, request.getConversationId());

        // ── 1. Ban check ──────────────────────────────────────────────────────
        if (userModerationService.isUserBanned(senderId)) {
            throw new UserBannedException(userModerationService.getBannedUntil(senderId));
        }

        Conversation conversation = conversationRepository.findById(request.getConversationId())
                .orElseThrow(() -> new RuntimeException("Conversation non trouvée"));

        ContentType contentType = ContentType.valueOf(
                request.getContentType() != null ? request.getContentType() : "TEXT"
        );

        // ── 2. Content moderation (TEXT only) ─────────────────────────────────
        if (contentType == ContentType.TEXT) {
            ModerationResult mod = contentModerationService.analyze(request.getContent());
            if (mod.violation()) {
                // Record the violation first so we can store the violation number on the message.
                // Both operations share the same @Transactional context — a save failure rolls both back.
                UserModeration um = userModerationService.recordViolation(senderId, mod.reason(), request.getSenderEmail());
                int violationNumber = um.getPeriodViolations() > 0 ? um.getPeriodViolations() : 3;

                // Save as flagged + BLOCKED (invisible to recipient), with violation number
                Message flagged = Message.builder()
                        .conversation(conversation)
                        .senderId(senderId)
                        .content(request.getContent())
                        .contentType(contentType)
                        .deliveryStatus(DeliveryStatus.BLOCKED)
                        .isFlagged(true)
                        .flaggedReason(mod.reason())
                        .violationNumber(violationNumber)
                        .isDeleted(false)
                        .isEdited(false)
                        .createdAt(LocalDateTime.now())
                        .build();

                Message savedFlagged = messageRepository.save(flagged);
                conversation.setLastMessageAt(LocalDateTime.now());
                conversationRepository.save(conversation);

                log.warn("🚫 Flagged message {} for user {} — violation {}/3, reason: {}",
                        savedFlagged.getId(), senderId, violationNumber, mod.reason());
                return mapToResponse(savedFlagged, um);
            }
        }

        // ── 3. Normal save ────────────────────────────────────────────────────
        Message message = Message.builder()
                .conversation(conversation)
                .senderId(senderId)
                .content(request.getContent())
                .contentType(contentType)
                .deliveryStatus(DeliveryStatus.SENT)
                .isFlagged(false)
                .isDeleted(false)
                .isEdited(false)
                .createdAt(LocalDateTime.now())
                .build();

        Message saved = messageRepository.save(message);

        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        // Schedule unanswered reminder (1 minute) and archive check (5 minutes)
        try {
            scheduledJobService.scheduleJob(conversation.getId(), "unanswered_check", LocalDateTime.now().plusMinutes(1), null);
            scheduledJobService.scheduleJob(conversation.getId(), "archive_check", LocalDateTime.now().plusMinutes(5), null);
        } catch (Exception e) {
            log.warn("Could not schedule jobs for conversation {}: {}", conversation.getId(), e.getMessage());
        }

        // Async RAG indexing — non-blocking, does not affect the response
        ragClient.ingestMessageAsync(
            request.getConversationId(),
            saved.getId(),
            saved.getContent(),
            request.getSenderRole() != null ? request.getSenderRole() : "UNKNOWN"
        );

        log.info("✅ Message envoyé - ID: {}", saved.getId());

        return mapToResponse(saved, null);
    }

    @Transactional
    public MessageResponse sendAttachmentMessage(Long senderId, Long conversationId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Fichier vide");
        }

        String storedFileName = storeAttachment(file);
        String publicPath = "/api/messages/files/" + storedFileName;

        SendMessageRequest request = SendMessageRequest.builder()
                .conversationId(conversationId)
                .content(publicPath)
                .contentType(detectContentType(file))
                .build();

        return sendMessage(senderId, request);
    }

    public Resource getAttachmentResource(String filename) {
        try {
            Path base = Paths.get(messagesUploadDir).toAbsolutePath().normalize();
            Path file = base.resolve(filename).normalize();

            // Security check: prevent path traversal
            if (!file.startsWith(base)) {
                throw new RuntimeException("Fichier introuvable");
            }

            // Try exact path first; if missing, try codec-suffix variants for
            // backward-compat with old files stored as "uuid.webm;codecs=opus"
            if (!Files.exists(file)) {
                String[] suffixes = {";codecs=opus", ";codecs=vp8", ";codecs=h264"};
                boolean found = false;
                for (String suffix : suffixes) {
                    Path variant = base.resolve(filename + suffix).normalize();
                    if (variant.startsWith(base) && Files.exists(variant)) {
                        file = variant;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    throw new RuntimeException("Fichier introuvable");
                }
            }

            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists()) {
                throw new RuntimeException("Fichier introuvable");
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new RuntimeException("Impossible de lire le fichier", e);
        }
    }

    private String detectContentType(MultipartFile file) {
        String mime = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "";
        // Strip codec params before comparing (e.g. "audio/webm;codecs=opus" → "audio/webm")
        if (mime.contains(";")) mime = mime.substring(0, mime.indexOf(';')).trim();
        if (mime.startsWith("audio/")) return ContentType.RECORD.name();
        if (mime.startsWith("image/")) return ContentType.IMAGE.name();
        if (mime.startsWith("video/")) return ContentType.VIDEO.name();
        return ContentType.FILE.name();
    }

    private String storeAttachment(MultipartFile file) {
        try {
            Path uploadDir = Paths.get(messagesUploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadDir);

            String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file.bin";
            String extension = "";
            int dot = original.lastIndexOf('.');
            if (dot >= 0) {
                extension = original.substring(dot);
                // Strip codec params appended to extension (e.g. ".webm;codecs=opus" → ".webm")
                int semi = extension.indexOf(';');
                if (semi >= 0) extension = extension.substring(0, semi);
            }

            String filename = UUID.randomUUID() + extension;
            Path target = uploadDir.resolve(filename).normalize();
            file.transferTo(target.toFile());
            return filename;
        } catch (Exception e) {
            throw new RuntimeException("Échec upload fichier", e);
        }
    }

    /**
     * Returns messages for {@code conversationId} visible to {@code userId}:
     * normal messages for everyone + BLOCKED messages only for their own sender.
     * This ensures the recipient never receives flagged/blocked messages from other users.
     */
    /** Backward-compatible overload used by ConversationController (no content masking). */
    public List<MessageResponse> getMessagesByConversation(Long conversationId) {
        return messageRepository.findByConversationId(conversationId).stream()
                .map(m -> mapToResponse(m, null))
                .collect(Collectors.toList());
    }

    /**
     * Returns all non-deleted messages for a conversation visible to {@code userId}.
     * BLOCKED messages are included for everyone, but their content is masked (empty string)
     * when the viewer is not the original sender — so the receiver sees a grey placeholder banner
     * instead of the actual blocked content.
     */
    public List<MessageResponse> getMessagesByConversation(Long conversationId, Long userId) {
        log.info("📨 Récupération messages conversation {} for user {}", conversationId, userId);
        return messageRepository.findByConversationId(conversationId).stream()
                .map(m -> mapToResponse(m, null, userId))
                .collect(Collectors.toList());
    }

    public MessageResponse getMessageById(Long messageId) {
        log.info("🔍 Récupération message {}", messageId);

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message non trouvé"));

        return mapToResponse(message, null);
    }

    @Transactional
    public MessageResponse updateMessage(Long messageId, UpdateMessageRequest request) {
        log.info("✏️ Modification message {}", messageId);

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message non trouvé"));

        if (request.getContent() != null) {
            message.setContent(request.getContent());
            message.setIsEdited(true);
        }

        if (request.getReactionEmoji() != null) {
            message.setReactionEmoji(request.getReactionEmoji());
        }

        Message updated = messageRepository.save(message);
        log.info("✅ Message mis à jour");

        return mapToResponse(updated, null);
    }

    @Transactional
    public void markAsRead(Long messageId) {
        log.info("👁️ Marquer message {} comme lu", messageId);

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message non trouvé"));

        message.setDeliveryStatus(DeliveryStatus.READ);
        messageRepository.save(message);
    }

    @Transactional
    public void markAllAsRead(Long conversationId, Long userId) {
        log.info("👁️ Marquer tous messages conversation {} comme lus", conversationId);

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation non trouvée"));

        conversation.getMessages().stream()
                .filter(msg -> !java.util.Objects.equals(msg.getSenderId(), userId))
                .filter(msg -> msg.getDeliveryStatus() != DeliveryStatus.READ)
                .forEach(msg -> {
                    msg.setDeliveryStatus(DeliveryStatus.READ);
                    messageRepository.save(msg);
                });

        log.info("✅ Tous les messages marqués comme lus");
    }

    @Transactional
    public void softDeleteMessage(Long messageId) {
        log.info("🗑️ Soft delete message {} — marking isDeleted=true", messageId);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message non trouvé"));
        message.setIsDeleted(true);
        messageRepository.save(message);
        log.info("✅ Message {} marqué comme supprimé (soft delete)", messageId);
    }

    @Transactional
    public void hardDeleteMessage(Long messageId) {
        log.info("🗑️ Hard delete message {}", messageId);
        messageRepository.findById(messageId).ifPresent(msg -> deleteAttachmentIfExists(msg.getContent()));
        messageRepository.deleteById(messageId);
        log.info("✅ Message supprimé définitivement");
    }

    private void deleteAttachmentIfExists(String content) {
        if (content == null || !content.startsWith("/api/messages/files/")) {
            return;
        }
        try {
            String filename = content.substring("/api/messages/files/".length());
            if (filename.isBlank()) return;
            Path base = Paths.get(messagesUploadDir).toAbsolutePath().normalize();
            Path file = base.resolve(filename).normalize();
            if (file.startsWith(base) && Files.exists(file)) {
                Files.delete(file);
                log.info("🧹 Fichier supprimé: {}", file);
            }
        } catch (Exception e) {
            log.warn("⚠️ Impossible de supprimer le fichier lié au message: {}", e.getMessage());
        }
    }

    private MessageResponse mapToResponse(Message message, UserModeration um) {
        return mapToResponse(message, um, null);
    }

    /**
     * Builds a MessageResponse for the given viewer.
     * If the message is BLOCKED and the viewer is NOT the original sender,
     * the content is masked (empty string) so the receiver only sees a grey banner,
     * never the actual blocked text.
     */
    private MessageResponse mapToResponse(Message message, UserModeration um, Long viewerId) {
        // Determine whether this message should be considered BLOCKED for display purposes.
        // Consider both the deliveryStatus and any legacy/DB flagged marker so old records
        // that were marked via `isFlagged` but lack the enum still render as blocked.
        boolean isBlocked = (DeliveryStatus.BLOCKED == message.getDeliveryStatus())
            || Boolean.TRUE.equals(message.getIsFlagged());

        // Determine display content for blocked messages.
        String displayContent = message.getContent();
        if (isBlocked) {
            // Resolve a violation number to select the appropriate explanatory text.
            int violationNumber = 1;
            if (um != null) {
                violationNumber = um.getPeriodViolations() > 0 ? um.getPeriodViolations() : 3;
            } else if (message.getViolationNumber() != null) {
                violationNumber = message.getViolationNumber();
            }

            // If the viewer is the sender, show a red-warning style message text
            // (frontend uses deliveryStatus == BLOCKED to style the bubble).
            if (viewerId != null && viewerId.equals(message.getSenderId())) {
                displayContent = switch (violationNumber) {
                    case 1 -> "This message contains inappropriate language and was not sent.";
                    case 2 -> "This message was blocked due to repeated inappropriate content and cannot be viewed.";
                    default -> "This message was blocked. The sender has reached the violation limit and is now suspended.";
                };
            } else {
                // For receivers (and anonymous viewers), show the grey placeholder text
                displayContent = switch (violationNumber) {
                    case 1 -> "This message was blocked due to inappropriate content and cannot be viewed.";
                    case 2 -> "This message was blocked due to repeated inappropriate content and cannot be viewed.";
                    default -> "This message was blocked. The sender has reached the violation limit and is now suspended.";
                };
            }
        }

        MessageResponse.MessageResponseBuilder b = MessageResponse.builder()
            .id(message.getId())
            .conversationId(message.getConversationId())
            .senderId(message.getSenderId())
            .content(displayContent)
            .contentType(message.getContentType().name())
            .deliveryStatus(isBlocked ? DeliveryStatus.BLOCKED.name() : message.getDeliveryStatus().name())
                .reactionEmoji(message.getReactionEmoji())
                .isDeleted(message.getIsDeleted())
                .isEdited(message.getIsEdited())
                .createdAt(message.getCreatedAt())
                .isFlagged(message.getIsFlagged())
                .flaggedReason(message.getFlaggedReason());

        if (um != null) {
            int displayViolation = um.getPeriodViolations() > 0
                    ? um.getPeriodViolations()
                    : 3;
            b.violationCount(displayViolation);
            if (um.getBannedUntil() != null) {
                b.bannedUntil(um.getBannedUntil().toString());
            }
        } else if (message.getViolationNumber() != null) {
            b.violationCount(message.getViolationNumber());
        }

        return b.build();
    }
}