package com.workify.projectservice.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class ContractPdfService {

    private static final Color PRIMARY = new Color(0x6C, 0x63, 0xFF);
    private static final Color DARK = new Color(0x1A, 0x1A, 0x2E);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generateContractPdf(Map<String, Object> request) {
        String projectTitle = text(request, "projet_titre", "Projet Workify");
        String projectDescription = text(request, "projet_description", "Prestation freelance");
        String projectId = text(request, "projet_id", "N/A");
        String deadline = text(request, "projet_delai", "30 jours");
        String startDate = text(request, "projet_debut", LocalDate.now().toString());
        String clientName = text(request, "client_nom", "Client");
        String clientEmail = text(request, "client_email", "-");
        String freelancerName = text(request, "freelancer_nom", "Freelancer");
        String freelancerEmail = text(request, "freelancer_email", "-");
        String specialty = text(request, "freelancer_specialite", "Freelance");
        String currency = text(request, "offre_devise", "TND");
        double amount = number(request, "offre_montant", number(request, "projet_budget", 0));
        double budget = number(request, "projet_budget", amount);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 48, 48, 48, 48);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 22, Font.BOLD, PRIMARY);
            Font sectionFont = new Font(Font.HELVETICA, 13, Font.BOLD, DARK);
            Font labelFont = new Font(Font.HELVETICA, 11, Font.BOLD, DARK);
            Font bodyFont = new Font(Font.HELVETICA, 11, Font.NORMAL, DARK);
            Font mutedFont = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.GRAY);

            document.add(new Paragraph("WORKIFY", titleFont));
            document.add(new Paragraph("Contrat de prestation freelance", sectionFont));
            document.add(new Paragraph("Date d'émission : " + LocalDate.now().format(DATE_FMT), mutedFont));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("1. Objet du contrat", sectionFont));
            document.add(new Paragraph(
                    "Le présent contrat formalise la collaboration entre le client et le freelancer " +
                            "pour la réalisation du projet \"" + projectTitle + "\" (réf. " + projectId + ").",
                    bodyFont));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("2. Description du projet", sectionFont));
            document.add(new Paragraph(projectDescription, bodyFont));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("3. Parties", sectionFont));
            document.add(new Paragraph("Client", labelFont));
            document.add(new Paragraph(clientName + " — " + clientEmail, bodyFont));
            document.add(Chunk.NEWLINE);
            document.add(new Paragraph("Freelancer", labelFont));
            document.add(new Paragraph(freelancerName + " — " + freelancerEmail, bodyFont));
            document.add(new Paragraph("Spécialité : " + specialty, bodyFont));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("4. Conditions financières", sectionFont));
            document.add(new Paragraph("Montant de l'offre : " + formatAmount(amount) + " " + currency, bodyFont));
            document.add(new Paragraph("Budget projet : " + formatAmount(budget) + " " + currency, bodyFont));
            document.add(new Paragraph("Délai estimé : " + deadline, bodyFont));
            document.add(new Paragraph("Date de début : " + startDate, bodyFont));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("5. Engagements", sectionFont));
            document.add(new Paragraph(
                    "Le freelancer s'engage à livrer la prestation conformément à la description du projet " +
                            "dans les délais convenus. Le client s'engage à fournir les informations nécessaires " +
                            "et à respecter les modalités de paiement définies sur la plateforme Workify.",
                    bodyFont));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("6. Signature électronique", sectionFont));
            document.add(new Paragraph(
                    "Ce document est généré automatiquement par Workify suite à l'acceptation de l'offre.",
                    bodyFont));
            document.add(Chunk.NEWLINE);
            document.add(new Paragraph("Client : " + clientName, bodyFont));
            document.add(new Paragraph("Freelancer : " + freelancerName, bodyFont));

            document.close();
            return out.toByteArray();
        } catch (DocumentException | IOException ex) {
            throw new RuntimeException("PDF generation failed: " + ex.getMessage(), ex);
        }
    }

    private String text(Map<String, Object> request, String key, String fallback) {
        Object value = request.get(key);
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? fallback : text;
    }

    private double number(Map<String, Object> request, String key, double fallback) {
        Object value = request.get(key);
        if (value == null) {
            return fallback;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private String formatAmount(double amount) {
        if (Math.abs(amount - Math.rint(amount)) < 0.0001d) {
            return String.format("%.0f", amount);
        }
        return String.format("%.2f", amount);
    }
}
