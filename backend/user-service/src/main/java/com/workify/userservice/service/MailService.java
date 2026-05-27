package com.workify.userservice.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@workify.com}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    public void sendResetPasswordEmail(String toEmail, String token) {
        String resetUrl = String.format("%s/auth/reset-password?token=%s", frontendUrl, token);

        String htmlContent = "<html>" +
                "<body style=\"font-family: 'Inter', sans-serif; background-color: #ffffff; margin: 0; padding: 0;\">" +
                "    <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #ffffff; padding: 40px 0;\">"
                +
                "        <tr>" +
                "            <td align=\"center\">" +
                "                <table width=\"600\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #ffffff; border-radius: 8px;\">"
                +
                "                    <tr>" +
                "                        <td align=\"left\" style=\"padding: 0 0 40px 0;\">" +
                "                            <h1 style=\"margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;\">"
                +
                "                                <span style=\"color: #00C3A5;\">Work</span><span style=\"color: #FF7A00;\">ify</span>"
                +
                "                            </h1>" +
                "                        </td>" +
                "                    </tr>" +
                "                    <tr>" +
                "                        <td align=\"left\" style=\"padding: 0 0 20px 0; color: #1E293B; font-size: 16px; line-height: 1.5;\">"
                +
                "                            Nous venons de recevoir une demande de changement de mot de passe de votre part.<br><br>"
                +
                "                            Si vous êtes bien à l'origine de cette demande cliquez ci-dessous. Pour des raisons de sécurité, ce lien ne sera actif que 24h 👇"
                +
                "                        </td>" +
                "                    </tr>" +
                "                    <tr>" +
                "                        <td align=\"center\" style=\"padding: 30px 0;\">" +
                "                            <a href=\"" + resetUrl
                + "\" style=\"background-color: #00A3FF; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;\">"
                +
                "                                Réinitialiser votre mot de passe" +
                "                            </a>" +
                "                        </td>" +
                "                    </tr>" +
                "                    <tr>" +
                "                        <td align=\"left\" style=\"padding: 20px 0 0 0; color: #64748B; font-size: 14px; line-height: 1.5; border-top: 1px solid #E2E8F0;\">"
                +
                "                            A bientôt,<br>L'équipe Workify 🚀" +
                "                        </td>" +
                "                    </tr>" +
                "                </table>" +
                "            </td>" +
                "        </tr>" +
                "    </table>" +
                "</body>" +
                "</html>";

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Réinitialisez votre mot de passe");
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Reset password email sent to {}", toEmail);
        } catch (MessagingException e) {
            log.error("Failed to send reset password email to {}", toEmail, e);
            throw new RuntimeException("Failed to send email");
        }
    }
}
