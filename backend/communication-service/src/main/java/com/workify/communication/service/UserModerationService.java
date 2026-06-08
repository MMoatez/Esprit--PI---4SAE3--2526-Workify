package com.workify.communication.service;

import com.workify.communication.client.UserServiceClient;
import com.workify.communication.domain.UserModeration;
import com.workify.communication.repository.MessageRepository;
import com.workify.communication.repository.UserModerationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Orchestrates content-moderation side-effects: violation counting, ban management,
 * and asynchronous email notifications.
 *
 * <p>Actual SMTP delivery (with retry logic) is delegated to {@link ModerationEmailSender}
 * so that Spring Retry's proxy interception works correctly.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserModerationService {

    private final UserModerationRepository userModerationRepository;
    private final ModerationEmailSender    emailSender;
    private final MessageRepository        messageRepository;
    private final UserServiceClient        userServiceClient;

    @Value("${app.moderation.ban-duration-minutes:5}")
    private int banDurationMinutes;

    @Value("${app.moderation.max-violations-before-ban:3}")
    private int maxViolationsBeforeBan;

    @Value("${spring.mail.username}")
    private String mailFrom;

    // ── Startup diagnostics ────────────────────────────────────────────────────

    /**
     * At startup, verify SMTP credentials look like they've been configured.
     * Logs a clear ERROR if the placeholder values from application.yml haven't been replaced.
     */
    @PostConstruct
    public void logMailConfig() {
        boolean unconfigured = mailFrom == null
                || mailFrom.isBlank()
                || mailFrom.startsWith("your-")
                || mailFrom.equals("FILL_IN_SENDER_EMAIL");

        if (unconfigured) {
            log.error("""
                ╔══════════════════════════════════════════════════════════════════╗
                ║  ❌  MAIL NOT CONFIGURED — emails will NOT be sent              ║
                ║                                                                  ║
                ║  Edit application.yml → spring.mail section:                     ║
                ║    username: your-sender@gmail.com                               ║
                ║    password: xxxx xxxx xxxx xxxx  (Gmail App Password)           ║
                ║                                                                  ║
                ║  See README or inline comments in application.yml for details.   ║
                ╚══════════════════════════════════════════════════════════════════╝
                """);
        } else {
            log.info("📧 Mail configured — sender={}, ban={}min, maxViolations={}",
                    mailFrom, banDurationMinutes, maxViolationsBeforeBan);
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    public boolean isUserBanned(Long userId) {
        return userModerationRepository.findByUserId(userId)
                .map(um -> um.getBannedUntil() != null && um.getBannedUntil().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    public LocalDateTime getBannedUntil(Long userId) {
        return userModerationRepository.findByUserId(userId)
                .map(UserModeration::getBannedUntil)
                .orElse(null);
    }

    /**
     * Records one violation for {@code userId}:
     * <ol>
     *   <li>Increments lifetime + period counters.</li>
     *   <li>If period counter ≥ threshold → bans the user for {@code banDurationMinutes}.</li>
     *   <li>Resolves the recipient email (client-provided → user-service → cache).</li>
     *   <li>Fires the appropriate warning or ban email asynchronously (with retry).</li>
     * </ol>
     *
     * @param userId        numeric user ID
     * @param flaggedReason PROFANITY | SYMBOL_SPAM | EXCESSIVE_CAPS
     * @param senderEmail   email from JWT (avoids user-service round-trip); may be null
     */
    @Transactional
    public UserModeration recordViolation(Long userId, String flaggedReason, String senderEmail) {
        UserModeration um = userModerationRepository.findByUserId(userId)
                .orElseGet(() -> UserModeration.builder().userId(userId).build());

        // Expired ban → reset the period window so the user gets a fresh 3-strike cycle
        if (um.getBannedUntil() != null && um.getBannedUntil().isBefore(LocalDateTime.now())) {
            um.setBannedUntil(null);
            um.setPeriodViolations(0);
        }

        um.setViolationCount(um.getViolationCount() + 1);
        um.setPeriodViolations(um.getPeriodViolations() + 1);
        um.setLastViolationAt(LocalDateTime.now());

        // Capture violation number BEFORE the period counter is reset on ban
        int violationNumber = um.getPeriodViolations();

        boolean banned = violationNumber >= maxViolationsBeforeBan;
        if (banned) {
            um.setBannedUntil(LocalDateTime.now().plusMinutes(banDurationMinutes));
            um.setPeriodViolations(0);   // reset window so next cycle starts fresh
        }

        UserModeration saved = userModerationRepository.save(um);
        log.info("🛡️ Violation #{} recorded — user={}, lifetime={}, banned={}, reason={}",
                violationNumber, userId, saved.getViolationCount(), banned, flaggedReason);

        String email = resolveEmail(saved, senderEmail);
        if (email != null) {
            String reasonDesc = describeReason(flaggedReason);
            // Always send a numbered warning email (1st, 2nd, or 3rd/final).
            // On the 3rd violation bannedUntil is non-null → the email explains the suspension.
            dispatchWarningEmailAsync(email, violationNumber, reasonDesc,
                                      banned ? saved.getBannedUntil() : null);
        } else {
            log.warn("⚠️ No email resolved for user {} — notification skipped " +
                     "(senderEmail param null AND user-service unreachable AND no cache).", userId);
        }

        return saved;
    }

    // ── Async dispatchers (thin @Async wrappers around the retryable sender) ───

    /**
     * Runs in a background thread; delegates to {@link ModerationEmailSender#sendWarning}
     * which handles up to 3 SMTP retries with exponential back-off.
     */
    @Async
    public void dispatchWarningEmailAsync(String to, int violationNumber, String reasonDesc,
                                          LocalDateTime bannedUntil) {
        log.info("📤 Dispatching warning #{} email to {} (banned={}) …",
                 violationNumber, to, bannedUntil != null);
        emailSender.sendWarning(to, violationNumber, reasonDesc, bannedUntil);
    }

    // ── Email resolution ───────────────────────────────────────────────────────

    /**
     * Priority chain for resolving the recipient email address:
     * <ol>
     *   <li>Email decoded from the JWT by Angular and sent in the request body.</li>
     *   <li>Live fetch from user-service {@code GET /api/public/users/{id}}.</li>
     *   <li>Cached address stored on the {@link UserModeration} entity.</li>
     * </ol>
     */
    private String resolveEmail(UserModeration um, String providedEmail) {
        if (providedEmail != null && !providedEmail.isBlank()) {
            log.info("📬 Using client-provided email for user {}: {}", um.getUserId(), providedEmail);
            if (!providedEmail.equals(um.getCachedEmail())) {
                um.setCachedEmail(providedEmail);
                userModerationRepository.save(um);
            }
            return providedEmail;
        }

        String live = fetchUserEmail(um.getUserId());
        if (live != null) {
            if (!live.equals(um.getCachedEmail())) {
                um.setCachedEmail(live);
                userModerationRepository.save(um);
                log.info("📬 Email cache updated for user {}: {}", um.getUserId(), live);
            }
            return live;
        }

        if (um.getCachedEmail() != null) {
            log.warn("⚠️ Falling back to cached email {} for user {} (user-service unreachable)",
                    um.getCachedEmail(), um.getUserId());
            return um.getCachedEmail();
        }

        return null;
    }

    private String fetchUserEmail(Long userId) {
        try {
            var user = userServiceClient.getUserById(userId);
            if (user != null && user.getEmail() != null) {
                log.info("📬 Fetched email for user {} from user-service: {}", userId, user.getEmail());
                return user.getEmail();
            }
            log.warn("⚠️ user-service returned no email for user {}", userId);
        } catch (Exception e) {
            log.warn("⚠️ Cannot reach user-service for user {} ({}). Using client-provided / cached email.",
                    userId, e.getMessage());
        }
        return null;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private String describeReason(String flaggedReason) {
        if (flaggedReason == null) return "inappropriate content";
        return switch (flaggedReason) {
            case "PROFANITY"      -> "offensive or inappropriate language (profanity)";
            case "SYMBOL_SPAM"    -> "excessive use of special characters or symbols (e.g. &&&&, %$!!#)";
            case "EXCESSIVE_CAPS" -> "excessive use of uppercase letters (shouting, e.g. STOP IT NOW)";
            default               -> "inappropriate content (" + flaggedReason.toLowerCase() + ")";
        };
    }

    // ── Scheduled ban expiry + blocked-message cleanup ─────────────────────────

    /**
     * Runs every 30 seconds. For every user whose ban has just expired:
     * <ol>
     *   <li>Permanently deletes all their BLOCKED (content-moderated) messages so neither
     *       sender nor receiver sees the red/grey bubbles anymore.</li>
     *   <li>Clears {@code bannedUntil} and resets {@code periodViolations} so the user
     *       starts a fresh 3-strike cycle.</li>
     * </ol>
     */
    @Scheduled(fixedDelay = 30_000)
    @Transactional
    public void processExpiredBans() {
        List<UserModeration> expired = userModerationRepository.findExpiredBans(LocalDateTime.now());
        if (expired.isEmpty()) return;
        for (UserModeration um : expired) {
            int deleted = messageRepository.deleteFlaggedOrBlockedMessagesBySender(um.getUserId());
            um.setBannedUntil(null);
            um.setPeriodViolations(0);
            userModerationRepository.save(um);
            log.info("🧹 Ban expired — user={}, {} blocked message(s) permanently deleted.",
                     um.getUserId(), deleted);
        }
    }

    // ── Dev/test helpers ───────────────────────────────────────────────────────

    /**
     * Lifts ALL active bans immediately (use only in development / testing).
     * This fixes accounts that were banned with the old 24-hour duration before
     * the configuration was changed to 5 minutes.
     */
    @Transactional
    public int clearAllBans() {
        int count = userModerationRepository.clearAllBans();
        log.warn("🔓 DEV: {} ban(s) cleared from all accounts.", count);
        return count;
    }

    /**
     * Lifts the ban for a single user immediately (use only in development / testing).
     */
    @Transactional
    public int clearBanForUser(Long userId) {
        int count = userModerationRepository.clearBanForUser(userId);
        log.warn("🔓 DEV: Ban cleared for user {}.", userId);
        return count;
    }

    public int getBanDurationMinutes() {
        return banDurationMinutes;
    }

    /**
     * If the user's ban has already expired, perform the same cleanup as the
     * scheduled task: delete their blocked messages and lift the ban immediately.
     * This makes moderation-status queries idempotent and avoids UI races.
     */
    @Transactional
    public void processExpiredBanIfNeeded(Long userId) {
        userModerationRepository.findByUserId(userId).ifPresent(um -> {
            if (um.getBannedUntil() != null && um.getBannedUntil().isBefore(LocalDateTime.now())) {
                int deleted = messageRepository.deleteFlaggedOrBlockedMessagesBySender(um.getUserId());
                um.setBannedUntil(null);
                um.setPeriodViolations(0);
                userModerationRepository.save(um);
                log.info("🧹 On-demand ban expiry — user={}, {} blocked message(s) deleted.", um.getUserId(), deleted);
            }
        });
    }
}
