package com.workify.communication.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Low-level email sender for moderation notifications.
 *
 * <p>Kept in a separate Spring bean so that {@code @Retryable} proxy interception
 * works correctly (Spring AOP cannot intercept self-invocations within the same bean).
 *
 * <p>Escalation sequence:
 * <ul>
 *   <li>Violation 1 → first warning email</li>
 *   <li>Violation 2 → second warning email</li>
 *   <li>Violation 3 → final warning email (includes suspension expiry)</li>
 * </ul>
 *
 * <p>Retry policy: up to 3 SMTP attempts with 2 s → 4 s → 8 s exponential back-off.
 * If all attempts fail, {@code @Recover} logs a permanent-failure alert.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ModerationEmailSender {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String mailFrom;

    @Value("${app.moderation.ban-duration-minutes:5}")
    private int banDurationMinutes;

    private static final DateTimeFormatter BAN_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy 'at' HH:mm");

    // ── Warning emails (violations 1, 2, 3) ───────────────────────────────────

    /**
     * Sends the numbered warning email for the current violation.
     * <ul>
     *   <li>{@code violationNumber == 1} → first warning</li>
     *   <li>{@code violationNumber == 2} → second warning</li>
     *   <li>{@code violationNumber >= 3} → final warning; {@code bannedUntil} is non-null
     *       and included in the email body to inform the user of the suspension expiry.</li>
     * </ul>
     *
     * Automatically retried up to 3 times on any SMTP/network failure.
     *
     * @param to              recipient address (the violating user's email)
     * @param violationNumber 1, 2, or 3
     * @param reasonDesc      human-readable violation description
     * @param bannedUntil     non-null only on the 3rd violation (account suspended until this time)
     */
    @Retryable(
        retryFor    = Exception.class,
        maxAttempts = 3,
        backoff     = @Backoff(delay = 2000, multiplier = 2.0)
    )
    public void sendWarning(String to, int violationNumber, String reasonDesc,
                            LocalDateTime bannedUntil) {
        log.info("📧 [attempt] Sending warning #{} to {} …", violationNumber, to);

        MimeMessage msg = mailSender.createMimeMessage();
        try {
            MimeMessageHelper h = new MimeMessageHelper(msg, false, "UTF-8");
            h.setFrom(mailFrom);
            h.setTo(to);

            if (violationNumber == 1) {
                // ── First warning ─────────────────────────────────────────────
                h.setSubject("Warning – Inappropriate Language Detected");
                h.setText(
                    "Dear User,\n\n" +
                    "Your recent message was blocked by our automated moderation system.\n\n" +
                    "Reason detected: " + reasonDesc + ".\n\n" +
                    "Please ensure that all communication remains professional and respectful.\n" +
                    "This is your first warning (1/3).\n" +
                    "Continued violations may result in a temporary suspension of your account.\n\n" +
                    "Best regards,\n" +
                    "The Workify Team",
                    false
                );

            } else if (violationNumber == 2) {
                // ── Second warning ────────────────────────────────────────────
                h.setSubject("Second Warning – Continued Inappropriate Language");
                h.setText(
                    "Dear User,\n\n" +
                    "Your account has triggered a second violation (2/3).\n\n" +
                    "Reason detected: " + reasonDesc + ".\n\n" +
                    "The message was blocked and was not delivered to the recipient.\n" +
                    "One more violation will result in a temporary suspension " +
                    "of your messaging privileges for " + banDurationMinutes + " minutes.\n\n" +
                    "Best regards,\n" +
                    "The Workify Team",
                    false
                );

            } else {
                // ── Third (final) warning — account suspended ─────────────────
                String expiryStr = bannedUntil != null
                        ? bannedUntil.format(BAN_FMT)
                        : banDurationMinutes + " minutes from now";

                h.setSubject("Final Warning – Messaging Privileges Suspended");
                h.setText(
                    "Dear User,\n\n" +
                    "Your account has reached the maximum number of violations (3/3).\n\n" +
                    "Last reason detected: " + reasonDesc + ".\n\n" +
                    "As a result, your ability to send new messages has been temporarily suspended " +
                    "until " + expiryStr + " (" + banDurationMinutes + " minutes).\n\n" +
                    "After the suspension expires your account will be restored automatically " +
                    "with a fresh violation window.\n" +
                    "Please ensure all future messages remain professional and respectful.\n\n" +
                    "Best regards,\n" +
                    "The Workify Team",
                    false
                );
            }

        } catch (Exception e) {
            throw new RuntimeException("Failed to build warning email #" + violationNumber, e);
        }

        mailSender.send(msg);   // throws on SMTP error → triggers retry
        log.info("📧 ✅ Warning #{} sent successfully to {}", violationNumber, to);
    }

    /**
     * Called automatically after all 3 SMTP attempts fail for a warning email.
     * Violation is already persisted in the DB; only the notification is lost.
     */
    @Recover
    public void recoverWarning(Exception e, String to, int violationNumber,
                               String reasonDesc, LocalDateTime bannedUntil) {
        log.error(
            "❌❌❌ WARNING EMAIL #{} PERMANENTLY FAILED — could not reach {} after 3 attempts.\n" +
            "  Reason: {}, banned until: {}\n" +
            "  Last SMTP error: {}\n" +
            "  → Check spring.mail.username / password in application.yml.",
            violationNumber, to, reasonDesc, bannedUntil, e.getMessage()
        );
    }
}
