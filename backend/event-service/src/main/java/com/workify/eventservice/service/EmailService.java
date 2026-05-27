package com.workify.eventservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

  private final JavaMailSender mailSender;

  public void sendPartnerInvitation(String toEmail, String partnerName,
                                    String eventTitle, String token) {
    try {
      SimpleMailMessage message = new SimpleMailMessage();
      message.setTo(toEmail);
      message.setSubject("Invitation to partner - " + eventTitle);
      message.setText(
        "Bonjour " + partnerName + ",\n\n" +
          "Vous êtes invité à participer en tant que partenaire à l'événement : "
          + eventTitle + "\n\n" +
          "Pour accepter : http://localhost:4200/events/partner/respond/"
          + token + "?response=ACCEPTED\n" +
          "Pour refuser : http://localhost:4200/events/partner/respond/"
          + token + "?response=REFUSED\n\n" +
          "Cordialement,\nL'équipe Workify"
      );
      mailSender.send(message);
      log.info("Invitation email sent to: {}", toEmail);
    } catch (Exception e) {
      log.error("Failed to send email to: {}", toEmail, e);
    }
  }

  public void sendRegistrationConfirmation(String toEmail, String userName,
                                           String eventTitle, String eventDate,
                                           String location) {
    try {
      SimpleMailMessage message = new SimpleMailMessage();
      message.setTo(toEmail);
      message.setSubject("Confirmation d'inscription - " + eventTitle);
      message.setText(
        "Bonjour " + userName + ",\n\n" +
          "Votre inscription à l'événement \"" + eventTitle
          + "\" a été confirmée.\n\n" +
          "📅 Date : " + eventDate + "\n" +
          "📍 Lieu : " + location + "\n\n" +
          "Nous vous attendons !\n\n" +
          "Cordialement,\nL'équipe Workify"
      );
      mailSender.send(message);
      log.info("Confirmation email sent to: {}", toEmail);
    } catch (Exception e) {
      log.error("Failed to send confirmation email to: {}", toEmail, e);
    }
  }

  public void sendTicketEmail(String toEmail, String userName, String eventTitle,
                               String eventDate, String location,
                               Long registrationId, Long eventId) {
    try {
      SimpleMailMessage message = new SimpleMailMessage();
      message.setTo(toEmail);
      message.setSubject("🎟️ Votre ticket — " + eventTitle);
      message.setText(
        "Bonjour " + userName + ",\n\n" +
          "Votre inscription à l'événement \"" + eventTitle + "\" a été confirmée !\n\n" +
          "📅 Date    : " + eventDate + "\n" +
          "📍 Lieu    : " + location + "\n\n" +
          "🎟️ Votre ticket avec QR code :\n" +
          "http://localhost:4200/events/" + eventId + "/ticket\n\n" +
          "Présentez ce QR code à l'entrée de l'événement.\n" +
          "Le code est unique et personnel — ne le partagez pas.\n\n" +
          "À bientôt !\nL'équipe Workify"
      );
      mailSender.send(message);
      log.info("Ticket email sent to: {}", toEmail);
    } catch (Exception e) {
      log.error("Failed to send ticket email to: {}", toEmail, e);
    }
  }
}
