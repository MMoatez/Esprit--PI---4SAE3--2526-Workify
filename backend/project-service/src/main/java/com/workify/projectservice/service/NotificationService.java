package com.workify.projectservice.service;

import com.workify.projectservice.domains.Project;
import com.workify.projectservice.domains.Offer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    @Autowired
    private JavaMailSender mailSender;

    public void notifyClient(Project project, Offer offer) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(project.getClientEmail());
        message.setSubject("Nouvelle offre pour votre projet");
        message.setText("Bonjour " + project.getClientName() +
                ",\n\nVous avez reçu une nouvelle offre pour votre projet : " +
                project.getTitle() +
                ".\n\nMontant proposé : " + offer.getPrice() +
                "\nDurée estimée : " + offer.getDuration() + " jours." +
                "\n\nCordialement,\nWorkify");

        mailSender.send(message);
    }
}
