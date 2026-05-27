package com.workify.feedbackservice.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;
import com.workify.feedbackservice.domains.Feedback;
import com.workify.feedbackservice.repositories.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportPdfService {

    private final FeedbackRepository feedbackRepo;

    @Value("${platform.url:http://localhost:4200}")
    private String platformUrl;

    // ── Brand colours ─────────────────────────────────────────────────────────
    private static final Color PRIMARY    = new Color(0x6C, 0x63, 0xFF);
    private static final Color DARK       = new Color(0x1A, 0x1A, 0x2E);
    private static final Color LIGHT_GRAY = new Color(0xF5, 0xF5, 0xF7);
    private static final Color MID_GRAY   = new Color(0xBB, 0xBB, 0xCC);
    private static final Color WHITE      = Color.WHITE;
    private static final Color GREEN      = new Color(0x2E, 0xCC, 0x71);
    private static final Color GOLD       = new Color(0xF3, 0x9C, 0x12);
    private static final Color CORAL      = new Color(0xFF, 0x6B, 0x6B);

    // ── Entry point ──────────────────────────────────────────────────────────

    public byte[] generateReport(Long freelancerId, String name) {
        String displayName = (name != null && !name.isBlank()) ? name : "Freelancer #" + freelancerId;
        List<Feedback> all = feedbackRepo.findByDeletedFalse().stream()
                .filter(f -> freelancerId.equals(f.getFreelancerId()))
                .filter(f -> f.getFraudScore() == null || f.getFraudScore() < 0.7f)
                .collect(Collectors.toList());

        if (all.isEmpty()) {
            return generateNoDataReport(freelancerId, displayName);
        }

        // ── Compute aggregates ─────────────────────────────────────────────
        double avgGlobal         = all.stream().mapToInt(Feedback::getRatingGlobal).average().orElse(0);
        double avgCommunication  = all.stream().mapToInt(Feedback::getRatingCommunication).average().orElse(0);
        double avgQuality        = all.stream().mapToInt(Feedback::getRatingQuality).average().orElse(0);
        double avgDeadline       = all.stream().mapToInt(Feedback::getRatingDeadline).average().orElse(0);
        double avgProfession     = all.stream().mapToInt(Feedback::getRatingProfessionalism).average().orElse(0);
        long   total             = all.size();
        long   recs              = all.stream().filter(Feedback::isRecommend).count();
        double recRate           = total > 0 ? recs * 100.0 / total : 0;
        long   withResponse      = all.stream().filter(f -> f.getResponse() != null).count();
        double responseRate      = total > 0 ? withResponse * 100.0 / total : 0;

        List<Feedback> top3 = all.stream()
                .sorted(Comparator.comparingInt(Feedback::getRatingGlobal).reversed()
                        .thenComparing(Comparator.comparing(
                                f -> f.getCreatedAt() == null ? LocalDateTime.MIN : f.getCreatedAt(),
                                Comparator.reverseOrder())))
                .limit(3)
                .collect(Collectors.toList());

        List<Object[]> monthly = feedbackRepo.findMonthlyRatingByFreelancer(freelancerId);

        List<String[]> badges  = computeBadges(total, avgGlobal, recRate, responseRate);

        Double marketAvg    = feedbackRepo.findMarketAvgRating();
        double market       = marketAvg != null ? Math.round(marketAvg * 10.0) / 10.0 : 0;
        long   totalFree    = feedbackRepo.countDistinctFreelancers();
        long   belowMe      = feedbackRepo.countFreelancersBelowRating(avgGlobal).size();
        double percentile   = totalFree > 1 ? belowMe * 100.0 / (totalFree - 1) : 100.0;

        String qrContent = String.format(
                "WORKIFY — VERIFIED REPUTATION\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "Name    : %s\n" +
                "Score   : %.1f / 5.0\n" +
                "Reviews : %d verified feedbacks\n" +
                "Recommend: %.0f%%\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "Generated: %s\n" +
                "Workify Platform",
                displayName,
                avgGlobal,
                total,
                recRate,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
        );
        byte[] qrBytes = generateQrCode(qrContent, 120);

        // ── Build document ─────────────────────────────────────────────────
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter writer = PdfWriter.getInstance(doc, baos);
            doc.open();

            addPage1(doc, writer, freelancerId, displayName, avgGlobal, total, recRate, percentile, market, qrBytes, badges);

            doc.newPage();
            addPage2(doc, avgCommunication, avgQuality, avgDeadline, avgProfession, avgGlobal);

            doc.newPage();
            addPage3(doc, top3);

            if (!monthly.isEmpty()) {
                doc.newPage();
                addPage4(doc, monthly);
            }

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    // ── PAGE 1 : Cover ────────────────────────────────────────────────────────

    private void addPage1(Document doc, PdfWriter writer,
                          Long freelancerId, String displayName, double avgGlobal, long total,
                          double recRate, double percentile, double market,
                          byte[] qrBytes, List<String[]> badges) throws Exception {

        // Header band (full-width coloured table)
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{75, 25});

        Font titleFont    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, WHITE);
        Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(210, 205, 255));

        PdfPCell leftCell = new PdfPCell();
        leftCell.addElement(new Paragraph("Professional Reputation Report", titleFont));
        leftCell.addElement(new Paragraph(
                "Workify  |  " + displayName + "  |  " +
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")), subtitleFont));
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.setBackgroundColor(PRIMARY);
        leftCell.setPadding(18);
        header.addCell(leftCell);

        PdfPCell qrCell = new PdfPCell();
        if (qrBytes != null) {
            Image qr = Image.getInstance(qrBytes);
            qr.scaleToFit(72, 72);
            qrCell.addElement(qr);
            qrCell.addElement(new Paragraph("Scan to verify",
                    FontFactory.getFont(FontFactory.HELVETICA, 7, new Color(210, 205, 255))));
        }
        qrCell.setBorder(Rectangle.NO_BORDER);
        qrCell.setBackgroundColor(PRIMARY);
        qrCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        qrCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        qrCell.setPadding(10);
        header.addCell(qrCell);
        doc.add(header);

        // ── Key metrics row ────────────────────────────────────────────────
        doc.add(Chunk.NEWLINE);
        PdfPTable metrics = new PdfPTable(3);
        metrics.setWidthPercentage(100);
        metrics.setSpacingBefore(12);
        metrics.setSpacingAfter(8);
        addScoreCard(metrics, String.format("%.1f / 5.0", avgGlobal),  "Global Score",       PRIMARY);
        addScoreCard(metrics, total + " reviews",                       "Total Feedbacks",     DARK);
        addScoreCard(metrics, String.format("%.0f%%", recRate),        "Would Recommend",     GREEN);
        doc.add(metrics);

        // ── Market position ────────────────────────────────────────────────
        addSectionTitle(doc, "Market Position");
        PdfPTable pos = new PdfPTable(2);
        pos.setWidthPercentage(100);
        pos.setSpacingAfter(8);
        addScoreCard(pos, String.format("Top %.0f%%", 100 - percentile), "Percentile Rank",   GOLD);
        addScoreCard(pos, String.format("%.1f  vs  %.1f", avgGlobal, market), "You vs Market Avg", CORAL);
        doc.add(pos);

        // ── Badges ─────────────────────────────────────────────────────────
        if (!badges.isEmpty()) {
            addSectionTitle(doc, "Earned Badges");
            int cols = Math.min(badges.size(), 3);
            PdfPTable bt = new PdfPTable(cols);
            bt.setWidthPercentage(100);
            bt.setSpacingAfter(10);
            for (String[] badge : badges) {
                PdfPCell bc = new PdfPCell();
                bc.setBackgroundColor(LIGHT_GRAY);
                bc.setBorderColor(MID_GRAY);
                bc.setBorderWidth(1f);
                bc.setPadding(10);
                bc.setHorizontalAlignment(Element.ALIGN_CENTER);
                bc.addElement(new Paragraph(badge[0],
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, DARK)));
                bc.addElement(new Paragraph(badge[1],
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, PRIMARY)));
                bc.addElement(new Paragraph(badge[2],
                        FontFactory.getFont(FontFactory.HELVETICA, 8, MID_GRAY)));
                bt.addCell(bc);
            }
            doc.add(bt);
        }

        // ── Footer note ────────────────────────────────────────────────────
        Paragraph footer = new Paragraph(
                "This report was automatically generated by Workify. " +
                "Data reflects verified feedback from real clients only.",
                FontFactory.getFont(FontFactory.HELVETICA, 8, MID_GRAY));
        footer.setAlignment(Element.ALIGN_CENTER);
        footer.setSpacingBefore(20);
        doc.add(footer);
    }

    // ── PAGE 2 : Dimension scores + Radar chart ───────────────────────────────

    private void addPage2(Document doc, double comm, double quality,
                          double deadline, double profess, double global) throws Exception {
        addPageHeader(doc, "Dimension Scores");

        // Radar chart as embedded PNG
        BufferedImage radar = drawRadarChart(
                new double[]{comm, quality, deadline, profess, global},
                new String[]{"Communication", "Quality", "Deadlines", "Professionalism", "Global"});
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        ImageIO.write(radar, "PNG", buf);
        Image radarImg = Image.getInstance(buf.toByteArray());
        radarImg.scaleToFit(280, 280);
        radarImg.setAlignment(Image.ALIGN_CENTER);
        doc.add(radarImg);

        // Score breakdown table
        addSectionTitle(doc, "Detailed Breakdown");
        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{35, 45, 20});
        table.setSpacingBefore(8);
        addTableHeader(table, "Criterion");
        addTableHeader(table, "Score Bar");
        addTableHeader(table, "Score");
        addDimensionRow(table, "Communication",   comm);
        addDimensionRow(table, "Quality",         quality);
        addDimensionRow(table, "Deadlines",       deadline);
        addDimensionRow(table, "Professionalism", profess);
        addDimensionRow(table, "Global Average",  global);
        doc.add(table);
    }

    // ── PAGE 3 : Top 3 feedbacks ──────────────────────────────────────────────

    private void addPage3(Document doc, List<Feedback> top3) throws Exception {
        addPageHeader(doc, "Top Client Reviews");
        Paragraph intro = new Paragraph(
                "The following reviews represent the highest-rated feedback from your clients.",
                FontFactory.getFont(FontFactory.HELVETICA, 10, MID_GRAY));
        intro.setSpacingAfter(12);
        doc.add(intro);

        String[] ranks  = {"#1", "#2", "#3"};
        Color[]  colors = {GOLD, MID_GRAY, new Color(0xCD, 0x7F, 0x32)};
        for (int i = 0; i < top3.size(); i++) {
            addFeedbackCard(doc, top3.get(i), ranks[i], colors[i]);
        }
    }

    // ── PAGE 4 : Monthly evolution ────────────────────────────────────────────

    private void addPage4(Document doc, List<Object[]> monthly) throws Exception {
        addPageHeader(doc, "Rating Evolution");

        BufferedImage chart = drawBarChart(monthly);
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        ImageIO.write(chart, "PNG", buf);
        Image chartImg = Image.getInstance(buf.toByteArray());
        chartImg.scaleToFit(480, 230);
        chartImg.setAlignment(Image.ALIGN_CENTER);
        doc.add(chartImg);

        addSectionTitle(doc, "Monthly Breakdown");
        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(75);
        table.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.setSpacingBefore(10);
        addTableHeader(table, "Period");
        addTableHeader(table, "Avg Rating");
        addTableHeader(table, "Reviews");

        String[] MON = {"","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};
        for (Object[] row : monthly) {
            int    yr    = ((Number) row[0]).intValue();
            int    mo    = ((Number) row[1]).intValue();
            double avg   = Math.round(((Number) row[2]).doubleValue() * 10.0) / 10.0;
            long   count = ((Number) row[3]).longValue();
            Font cFont = FontFactory.getFont(FontFactory.HELVETICA, 10, DARK);
            Font rFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, scoreColor(avg));

            PdfPCell pc = new PdfPCell(new Phrase(MON[mo] + " " + yr, cFont));
            pc.setBorder(Rectangle.BOTTOM); pc.setBorderColor(LIGHT_GRAY); pc.setPadding(7);
            table.addCell(pc);

            PdfPCell rc = new PdfPCell(new Phrase(String.format("%.1f / 5", avg), rFont));
            rc.setBorder(Rectangle.BOTTOM); rc.setBorderColor(LIGHT_GRAY); rc.setPadding(7);
            rc.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(rc);

            PdfPCell cc = new PdfPCell(new Phrase(String.valueOf(count), cFont));
            cc.setBorder(Rectangle.BOTTOM); cc.setBorderColor(LIGHT_GRAY); cc.setPadding(7);
            cc.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cc);
        }
        doc.add(table);
    }

    // ── Drawing helpers ───────────────────────────────────────────────────────

    private BufferedImage drawRadarChart(double[] values, String[] labels) {
        int size = 460;
        BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(java.awt.Color.WHITE);
        g.fillRect(0, 0, size, size);

        int cx = size / 2, cy = size / 2, r = 150, n = values.length;
        double[] angles = new double[n];
        for (int i = 0; i < n; i++) angles[i] = Math.PI / 2 + 2 * Math.PI * i / n;

        // Grid polygons
        g.setStroke(new BasicStroke(0.6f));
        for (int lvl = 1; lvl <= 5; lvl++) {
            int gr = r * lvl / 5;
            int[] xp = new int[n], yp = new int[n];
            for (int i = 0; i < n; i++) {
                xp[i] = cx + (int) (gr * Math.cos(angles[i]));
                yp[i] = cy - (int) (gr * Math.sin(angles[i]));
            }
            g.setColor(new java.awt.Color(200, 200, 225, 160));
            g.drawPolygon(xp, yp, n);
        }

        // Axes
        g.setColor(new java.awt.Color(180, 180, 205));
        g.setStroke(new BasicStroke(1f));
        for (int i = 0; i < n; i++) {
            g.drawLine(cx, cy,
                    cx + (int) (r * Math.cos(angles[i])),
                    cy - (int) (r * Math.sin(angles[i])));
        }

        // Data polygon
        int[] xd = new int[n], yd = new int[n];
        for (int i = 0; i < n; i++) {
            double norm = values[i] / 5.0;
            xd[i] = cx + (int) (r * norm * Math.cos(angles[i]));
            yd[i] = cy - (int) (r * norm * Math.sin(angles[i]));
        }
        g.setColor(new java.awt.Color(108, 99, 255, 70));
        g.fillPolygon(xd, yd, n);
        g.setColor(new java.awt.Color(108, 99, 255));
        g.setStroke(new BasicStroke(2.5f));
        g.drawPolygon(xd, yd, n);
        for (int i = 0; i < n; i++) g.fillOval(xd[i] - 5, yd[i] - 5, 10, 10);

        // Labels
        int labelR = r + 32;
        for (int i = 0; i < n; i++) {
            double ax = Math.cos(angles[i]), ay = Math.sin(angles[i]);
            int lx = cx + (int) (labelR * ax);
            int ly = cy - (int) (labelR * ay);

            g.setFont(new java.awt.Font("SansSerif", java.awt.Font.BOLD, 12));
            g.setColor(new java.awt.Color(26, 26, 46));
            FontMetrics fm = g.getFontMetrics();
            int sw = fm.stringWidth(labels[i]);
            // Centre label on the axis point
            int tx = lx - sw / 2;
            int ty = ly + (ay < 0 ? -6 : 14);
            g.drawString(labels[i], tx, ty);

            g.setFont(new java.awt.Font("SansSerif", java.awt.Font.PLAIN, 11));
            g.setColor(new java.awt.Color(108, 99, 255));
            String val = String.format("%.1f", values[i]);
            int vw = g.getFontMetrics().stringWidth(val);
            g.drawString(val, lx - vw / 2, ty + 14);
        }
        g.dispose();
        return img;
    }

    private BufferedImage drawBarChart(List<Object[]> monthly) {
        int W = 700, H = 300;
        BufferedImage img = new BufferedImage(W, H, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(java.awt.Color.WHITE);
        g.fillRect(0, 0, W, H);

        int pL = 50, pR = 20, pT = 20, pB = 55;
        int cW = W - pL - pR, cH = H - pT - pB;

        // Y-axis grid + labels
        g.setFont(new java.awt.Font("SansSerif", java.awt.Font.PLAIN, 10));
        for (int lvl = 1; lvl <= 5; lvl++) {
            int y = pT + cH - cH * lvl / 5;
            g.setColor(new java.awt.Color(220, 220, 235));
            g.drawLine(pL, y, pL + cW, y);
            g.setColor(new java.awt.Color(110, 110, 135));
            g.drawString(String.valueOf(lvl), pL - 18, y + 4);
        }
        g.setColor(new java.awt.Color(200, 200, 215));
        g.drawLine(pL, pT + cH, pL + cW, pT + cH);

        int n = monthly.size();
        int slot = cW / Math.max(n, 1);
        int bw   = Math.min(slot - 8, 55);
        String[] MON = {"","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};

        for (int i = 0; i < n; i++) {
            int yr   = ((Number) monthly.get(i)[0]).intValue();
            int mo   = ((Number) monthly.get(i)[1]).intValue();
            double a = ((Number) monthly.get(i)[2]).doubleValue();
            int barH = (int) (cH * a / 5.0);
            int bx   = pL + i * slot + (slot - bw) / 2;
            int by   = pT + cH - barH;

            java.awt.Color bc = a >= 4.5 ? new java.awt.Color(46,204,113)
                    : a >= 3.5 ? new java.awt.Color(108,99,255)
                    : a >= 2.5 ? new java.awt.Color(243,156,18)
                    :            new java.awt.Color(255,107,107);
            g.setColor(bc);
            g.fillRoundRect(bx, by, bw, barH, 6, 6);

            g.setFont(new java.awt.Font("SansSerif", java.awt.Font.BOLD, 9));
            g.setColor(new java.awt.Color(50, 50, 70));
            String lbl = String.format("%.1f", a);
            FontMetrics fm = g.getFontMetrics();
            g.drawString(lbl, bx + (bw - fm.stringWidth(lbl)) / 2, by - 3);

            g.setFont(new java.awt.Font("SansSerif", java.awt.Font.PLAIN, 9));
            String xl = MON[mo] + " " + (yr % 100);
            g.drawString(xl, bx + (bw - fm.stringWidth(xl)) / 2, pT + cH + 15);
        }
        g.dispose();
        return img;
    }

    // ── UI component helpers ──────────────────────────────────────────────────

    private void addScoreCard(PdfPTable table, String value, String label, Color color) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(LIGHT_GRAY);
        cell.setBorderWidthLeft(4);
        cell.setBorderColor(color);
        cell.setBorderWidthTop(0); cell.setBorderWidthRight(0); cell.setBorderWidthBottom(0);
        cell.setPadding(12);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.addElement(new Paragraph(value,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, color)));
        cell.addElement(new Paragraph(label,
                FontFactory.getFont(FontFactory.HELVETICA, 9, MID_GRAY)));
        table.addCell(cell);
    }

    private void addDimensionRow(PdfPTable table, String name, double score) {
        PdfPCell nc = new PdfPCell(new Phrase(name,
                FontFactory.getFont(FontFactory.HELVETICA, 10, DARK)));
        nc.setBorder(Rectangle.BOTTOM); nc.setBorderColor(LIGHT_GRAY); nc.setPadding(8);
        table.addCell(nc);

        // Progress bar (2-cell nested table)
        PdfPCell bc = new PdfPCell();
        bc.setBorder(Rectangle.BOTTOM); bc.setBorderColor(LIGHT_GRAY); bc.setPadding(8);
        float fill = (float) (score / 5.0 * 100);
        float empty = 100 - fill;
        PdfPTable bar = new PdfPTable(fill > 0 && empty > 0 ? 2 : 1);
        bar.setWidthPercentage(100);
        if (fill > 0 && empty > 0) {
            bar.setWidths(new float[]{fill, empty});
            PdfPCell fc = new PdfPCell(); fc.setFixedHeight(10);
            fc.setBackgroundColor(scoreColor(score)); fc.setBorder(Rectangle.NO_BORDER);
            PdfPCell ec = new PdfPCell(); ec.setFixedHeight(10);
            ec.setBackgroundColor(new Color(225, 225, 238)); ec.setBorder(Rectangle.NO_BORDER);
            bar.addCell(fc); bar.addCell(ec);
        } else {
            PdfPCell fc = new PdfPCell(); fc.setFixedHeight(10);
            fc.setBackgroundColor(fill > 0 ? scoreColor(score) : new Color(225, 225, 238));
            fc.setBorder(Rectangle.NO_BORDER);
            bar.addCell(fc);
        }
        bc.addElement(bar);
        table.addCell(bc);

        PdfPCell sc = new PdfPCell(new Phrase(String.format("%.1f / 5", score),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, scoreColor(score))));
        sc.setBorder(Rectangle.BOTTOM); sc.setBorderColor(LIGHT_GRAY); sc.setPadding(8);
        sc.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(sc);
    }

    private void addFeedbackCard(Document doc, Feedback fb, String rank, Color rankColor) throws Exception {
        PdfPTable card = new PdfPTable(1);
        card.setWidthPercentage(100);
        card.setSpacingAfter(12);

        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(LIGHT_GRAY);
        cell.setBorderWidthLeft(5); cell.setBorderColor(rankColor);
        cell.setBorderWidthTop(0); cell.setBorderWidthRight(0); cell.setBorderWidthBottom(0);
        cell.setPadding(12);

        // Rank + stars + date on one line
        StringBuilder stars = new StringBuilder();
        for (int s = 0; s < 5; s++) stars.append(s < fb.getRatingGlobal() ? "★" : "☆");
        Paragraph hdr = new Paragraph();
        hdr.add(new Chunk(rank + "  ",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, rankColor)));
        hdr.add(new Chunk(stars + "  ",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, GOLD)));
        if (fb.getCreatedAt() != null) {
            hdr.add(new Chunk(
                    fb.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy")),
                    FontFactory.getFont(FontFactory.HELVETICA, 8, MID_GRAY)));
        }
        cell.addElement(hdr);

        if (fb.getProjectTitle() != null) {
            cell.addElement(new Paragraph("Project: " + fb.getProjectTitle(),
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, PRIMARY)));
        }

        String comment = fb.getComment();
        if (comment != null && comment.length() > 280) comment = comment.substring(0, 277) + "...";
        Paragraph body = new Paragraph(comment != null ? "\u201c" + comment + "\u201d" : "",
                FontFactory.getFont(FontFactory.HELVETICA, 10, DARK));
        body.setSpacingBefore(6);
        cell.addElement(body);

        Paragraph tags = new Paragraph();
        tags.setSpacingBefore(6);
        if (fb.getAiSentiment() != null) {
            tags.add(new Chunk("[" + fb.getAiSentiment() + "]  ",
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, sentimentColor(fb.getAiSentiment()))));
        }
        if (fb.isRecommend()) {
            tags.add(new Chunk("[RECOMMENDS]",
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, GREEN)));
        }
        cell.addElement(tags);
        card.addCell(cell);
        doc.add(card);
    }

    private void addPageHeader(Document doc, String title) throws Exception {
        Paragraph p = new Paragraph(title,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, PRIMARY));
        p.setSpacingAfter(4);
        doc.add(p);
        doc.add(new Chunk(new LineSeparator(2, 100, PRIMARY, Element.ALIGN_LEFT, -2)));
        doc.add(Chunk.NEWLINE);
    }

    private void addSectionTitle(Document doc, String title) throws Exception {
        Paragraph p = new Paragraph(title,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, DARK));
        p.setSpacingBefore(12); p.setSpacingAfter(6);
        doc.add(p);
    }

    private void addTableHeader(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text,
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, WHITE)));
        cell.setBackgroundColor(PRIMARY);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(8);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(cell);
    }

    // ── QR Code ───────────────────────────────────────────────────────────────

    private byte[] generateQrCode(String content, int size) {
        try {
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.MARGIN, 1);
            BitMatrix matrix = new QRCodeWriter()
                    .encode(content, BarcodeFormat.QR_CODE, size, size, hints);
            BufferedImage qr = new BufferedImage(size, size, BufferedImage.TYPE_INT_RGB);
            for (int x = 0; x < size; x++)
                for (int y = 0; y < size; y++)
                    qr.setRGB(x, y, matrix.get(x, y) ? 0x1A1A2E : 0xFFFFFF);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(qr, "PNG", out);
            return out.toByteArray();
        } catch (Exception e) {
            return null;
        }
    }

    // ── Badges ────────────────────────────────────────────────────────────────

    private List<String[]> computeBadges(long total, double avg, double recRate, double responseRate) {
        List<String[]> b = new ArrayList<>();
        if (total >= 5)                         b.add(new String[]{"*",   "Reliable",          "5+ verified feedbacks"});
        if (total >= 15 && avg >= 4.0)          b.add(new String[]{"**",  "Recognized",        "15+ feedbacks, avg >= 4.0"});
        if (total >= 30 && avg >= 4.5)          b.add(new String[]{"***", "Verified Expert",   "30+ feedbacks, avg >= 4.5"});
        if (recRate >= 90)                      b.add(new String[]{"R",   "Highly Recommended","90%+ clients recommend"});
        if (responseRate >= 80)                 b.add(new String[]{"@",   "Responsive",        "80%+ response rate"});
        return b;
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private Color scoreColor(double score) {
        if (score >= 4.5) return GREEN;
        if (score >= 3.5) return PRIMARY;
        if (score >= 2.5) return GOLD;
        return CORAL;
    }

    private Color sentimentColor(String s) {
        return switch (s) {
            case "POSITIVE"     -> GREEN;
            case "NEGATIVE"     -> CORAL;
            case "APOLOGETIC"   -> GOLD;
            case "CONSTRUCTIVE" -> PRIMARY;
            default             -> MID_GRAY;
        };
    }

    private byte[] generateNoDataReport(Long freelancerId, String displayName) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();
            doc.add(new Paragraph("Reputation Report — " + displayName,
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, PRIMARY)));
            doc.add(new Paragraph(
                    "\nNo verified feedbacks found yet. Complete your first projects to build your reputation!",
                    FontFactory.getFont(FontFactory.HELVETICA, 12, DARK)));
            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed", e);
        }
    }
}
