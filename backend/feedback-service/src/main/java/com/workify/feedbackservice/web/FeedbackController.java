package com.workify.feedbackservice.web;

import com.workify.feedbackservice.dto.*;
import com.workify.feedbackservice.repositories.EvaluationWindowRepository;
import com.workify.feedbackservice.repositories.FeedbackRepository;
import com.workify.feedbackservice.repositories.ResponseFeedbackRepository;
import com.workify.feedbackservice.service.FraudDetectionService;
import com.workify.feedbackservice.service.FeedbackAIService;
import com.workify.feedbackservice.service.FeedbackService;
import com.workify.feedbackservice.service.ReportPdfService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final FeedbackAIService feedbackAIService;
    private final FeedbackRepository feedbackRepo;
    private final ResponseFeedbackRepository responseRepo;
    private final EvaluationWindowRepository windowRepo;
    private final FraudDetectionService fraudService;
    private final ReportPdfService reportPdfService;

    // ── CLIENT : CRUD Feedback ────────────────────────────────────────────────

    /**
     * POST /api/feedback/offer/{offerId}
     * Créer un feedback pour une offre acceptée.
     * Guard: evaluationPending=true ET clientEmail correspond.
     */
    @PostMapping("/offer/{offerId}")
    public ResponseEntity<FeedbackDto> create(
            @PathVariable Long offerId,
            @Valid @RequestBody FeedbackRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(feedbackService.create(offerId, req));
    }

    /**
     * POST /api/feedback/offer/{offerId}/request-review
     * Client explicitly submits their spam-flagged comment for admin review.
     * Saves the feedback as pending (fraudScore=1.0) and closes the evaluation window.
     */
    @PostMapping("/offer/{offerId}/request-review")
    public ResponseEntity<Map<String, Object>> requestReview(
            @PathVariable Long offerId,
            @RequestBody FeedbackRequest req) {
        feedbackService.submitForReview(offerId, req);
        return ResponseEntity.ok(Map.of(
            "type",    "PENDING_REVIEW",
            "message", "Your feedback has been submitted for admin review. You will be notified once it is approved."
        ));
    }

    /**
     * GET /api/feedback/offer/{offerId}
     * Récupérer le feedback d'une offre (client + freelancer).
     */
    @GetMapping("/offer/{offerId}")
    public ResponseEntity<FeedbackDto> getByOffer(@PathVariable Long offerId) {
        return ResponseEntity.ok(feedbackService.getByOfferId(offerId));
    }

    /**
     * GET /api/feedback/{feedbackId}
     */
    @GetMapping("/{feedbackId}")
    public ResponseEntity<FeedbackDto> getById(@PathVariable Long feedbackId) {
        return ResponseEntity.ok(feedbackService.getById(feedbackId));
    }

    /**
     * PUT /api/feedback/{feedbackId}
     * Modifier un feedback (seulement si non verrouillé).
     * Guard: isLocked=false (pas encore de réponse freelancer).
     */
    @PutMapping("/{feedbackId}")
    public ResponseEntity<FeedbackDto> update(
            @PathVariable Long feedbackId,
            @Valid @RequestBody FeedbackUpdateRequest req,
            @RequestParam String clientEmail) {
        return ResponseEntity.ok(feedbackService.update(feedbackId, req, clientEmail));
    }

    /**
     * DELETE /api/feedback/{feedbackId}
     * Suppression logique (seulement si non verrouillé).
     */
    @DeleteMapping("/{feedbackId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long feedbackId,
            @RequestParam String clientEmail) {
        feedbackService.delete(feedbackId, clientEmail);
        return ResponseEntity.noContent().build();
    }

    // ── PUBLIC : Profil freelancer ────────────────────────────────────────────

    /**
     * GET /api/feedback/freelancer/{freelancerId}/report.pdf
     * Génère et télécharge le rapport PDF de réputation du freelancer.
     */
    @GetMapping("/freelancer/{freelancerId}/report.pdf")
    public ResponseEntity<byte[]> downloadReport(
            @PathVariable Long freelancerId,
            @RequestParam(defaultValue = "") String name) {
        byte[] pdf = reportPdfService.generateReport(freelancerId, name);
        String filename = "reputation-report-" + freelancerId + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.length)
                .body(pdf);
    }

    /**
     * GET /api/feedback/freelancer/{freelancerId}
     * Résumé + liste paginée des feedbacks d'un freelancer.
     * Filtrés: non supprimés, fraudScore < 0.7.
     * Query params: rating, sort (date|rating), order (asc|desc), page, size.
     */
    @GetMapping("/freelancer/{freelancerId}")
    public ResponseEntity<FreelancerSummaryDto> getFreelancerSummary(
            @PathVariable Long freelancerId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(defaultValue = "date")  String sort,
            @RequestParam(defaultValue = "desc")  String order,
            @RequestParam(defaultValue = "0")     int page,
            @RequestParam(defaultValue = "5")     int size) {
        return ResponseEntity.ok(
                feedbackService.getFreelancerSummary(freelancerId, rating, sort, order, page, size));
    }

    // ── ADMIN ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/feedback/admin/stats
     * Global statistics for the admin feedback dashboard.
     */
    @GetMapping("/admin/stats")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        var all = feedbackRepo.findByDeletedFalse();
        int total = all.size();

        // ── Ratings ──────────────────────────────────────────────────────────
        double avgGlobal           = all.stream().mapToInt(f -> f.getRatingGlobal()).average().orElse(0);
        double avgCommunication    = all.stream().mapToInt(f -> f.getRatingCommunication()).average().orElse(0);
        double avgQuality          = all.stream().mapToInt(f -> f.getRatingQuality()).average().orElse(0);
        double avgDeadline         = all.stream().mapToInt(f -> f.getRatingDeadline()).average().orElse(0);
        double avgProfessionalism  = all.stream().mapToInt(f -> f.getRatingProfessionalism()).average().orElse(0);

        // ── Rates ─────────────────────────────────────────────────────────────
        long recommendCount  = all.stream().filter(f -> f.isRecommend()).count();
        long withResponse    = all.stream().filter(f -> f.getResponse() != null).count();
        long fraudFlagged    = all.stream().filter(f -> f.getFraudScore() != null && f.getFraudScore() >= 0.7f).count();
        long aiAnalyzed      = all.stream().filter(f -> f.getAiSentiment() != null).count();
        long pendingAI       = total - aiAnalyzed;

        double recommendRate = total > 0 ? Math.round(recommendCount * 1000.0 / total) / 10.0 : 0.0;
        double responseRate  = total > 0 ? Math.round(withResponse  * 1000.0 / total) / 10.0 : 0.0;

        // ── Sentiment distribution ────────────────────────────────────────────
        Map<String, Long> sentimentDist = new LinkedHashMap<>();
        for (String s : List.of("POSITIVE", "NEUTRAL", "NEGATIVE", "APOLOGETIC", "CONSTRUCTIVE")) {
            sentimentDist.put(s, all.stream().filter(f -> s.equals(f.getAiSentiment())).count());
        }

        // ── Rating distribution (1–5) ─────────────────────────────────────────
        Map<String, Long> ratingDist = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            final int star = i;
            ratingDist.put(String.valueOf(i), all.stream().filter(f -> f.getRatingGlobal() == star).count());
        }

        // ── Top freelancers by avg rating (min 1 feedback) ───────────────────
        Map<Long, List<Integer>> byFreelancer = all.stream()
                .collect(Collectors.groupingBy(
                        f -> f.getFreelancerId(),
                        Collectors.mapping(f -> f.getRatingGlobal(), Collectors.toList())));

        List<Map<String, Object>> topFreelancers = byFreelancer.entrySet().stream()
                .map(e -> {
                    double avg = e.getValue().stream().mapToInt(Integer::intValue).average().orElse(0);
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("freelancerId", e.getKey());
                    m.put("avgRating",    Math.round(avg * 10.0) / 10.0);
                    m.put("count",        e.getValue().size());
                    return m;
                })
                .sorted(Comparator.<Map<String, Object>, Double>comparing(
                        m -> (Double) m.get("avgRating")).reversed())
                .limit(5)
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalFeedbacks",          total);
        result.put("avgGlobalRating",         Math.round(avgGlobal          * 10.0) / 10.0);
        result.put("avgCommunicationRating",  Math.round(avgCommunication   * 10.0) / 10.0);
        result.put("avgQualityRating",        Math.round(avgQuality         * 10.0) / 10.0);
        result.put("avgDeadlineRating",       Math.round(avgDeadline        * 10.0) / 10.0);
        result.put("avgProfessionalismRating",Math.round(avgProfessionalism * 10.0) / 10.0);
        result.put("recommendRate",           recommendRate);
        result.put("responseRate",            responseRate);
        result.put("fraudFlaggedCount",       fraudFlagged);
        result.put("aiAnalyzedCount",         aiAnalyzed);
        result.put("pendingAICount",          pendingAI);
        result.put("sentimentDistribution",   sentimentDist);
        result.put("ratingDistribution",      ratingDist);
        result.put("topFreelancers",          topFreelancers);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/feedback/admin/flagged?minScore=0.7
     * Feedbacks signalés pour modération.
     */
    @GetMapping("/admin/flagged")
    public ResponseEntity<List<FeedbackDto>> getFlagged(
            @RequestParam(defaultValue = "0.7") float minScore) {
        return ResponseEntity.ok(feedbackService.getFlagged(minScore));
    }

    /**
     * POST /api/feedback/admin/analyze-all
     * Triggers async AI analysis for all feedbacks that have no AI data yet.
     */
    @PostMapping("/admin/analyze-all")
    public ResponseEntity<String> analyzeAll() {
        feedbackAIService.analyzeAllPending();
        return ResponseEntity.accepted().body("AI batch analysis started in background");
    }

    /**
     * DELETE /api/feedback/admin/{feedbackId}
     * Admin force soft-delete (bypasses lock check).
     */
    @DeleteMapping("/admin/{feedbackId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminDelete(@PathVariable Long feedbackId) {
        return feedbackRepo.findById(feedbackId).map(f -> {
            f.setDeleted(true);
            feedbackRepo.save(f);
            return ResponseEntity.ok(Map.<String, Object>of(
                "feedbackId", feedbackId,
                "message",    "Feedback #" + feedbackId + " deleted"
            ));
        }).orElse(ResponseEntity.notFound().<Map<String, Object>>build());
    }

    /**
     * PUT /api/feedback/admin/{feedbackId}/validate
     * Admin approves a pending-review feedback: clears spam flag, re-runs fraud analysis.
     */
    @PutMapping("/admin/{feedbackId}/validate")
    @Transactional
    public ResponseEntity<Map<String, Object>> validateFeedback(@PathVariable Long feedbackId) {
        return feedbackRepo.findById(feedbackId).map(f -> {
            // Remove spam flags so fraud re-analysis is fair
            f.setFraudFlags(null);
            f.setFraudScore(0f);
            // Re-run business fraud detection (duplicate, inconsistent ratings, etc.)
            fraudService.analyzeFeedback(f);
            feedbackRepo.save(f);
            return ResponseEntity.ok(Map.<String, Object>of(
                "feedbackId", feedbackId,
                "message",    "Feedback #" + feedbackId + " validated and now public",
                "fraudScore", f.getFraudScore()
            ));
        }).orElse(ResponseEntity.notFound().<Map<String, Object>>build());
    }

    /**
     * PUT /api/feedback/admin/{feedbackId}/clear-fraud
     * Resets fraudScore and fraudFlags (mark as legitimate).
     */
    @PutMapping("/admin/{feedbackId}/clear-fraud")
    @Transactional
    public ResponseEntity<Map<String, Object>> clearFraud(@PathVariable Long feedbackId) {
        return feedbackRepo.findById(feedbackId).map(f -> {
            f.setFraudScore(0f);
            f.setFraudFlags(null);
            feedbackRepo.save(f);
            return ResponseEntity.ok(Map.<String, Object>of(
                "feedbackId", feedbackId,
                "message",    "Fraud flag cleared for feedback #" + feedbackId
            ));
        }).orElse(ResponseEntity.notFound().<Map<String, Object>>build());
    }

    /**
     * GET /api/feedback/analytics/freelancer/{freelancerId}
     * Advanced reputation analytics for the freelancer dashboard.
     */
    @GetMapping("/analytics/freelancer/{freelancerId}")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getFreelancerAnalytics(@PathVariable Long freelancerId) {
        var all = feedbackRepo.findByDeletedFalse().stream()
                .filter(f -> freelancerId.equals(f.getFreelancerId()))
                .collect(Collectors.toList());

        int total = all.size();

        // ── Average ratings ───────────────────────────────────────────────────
        double avgGlobal          = all.stream().mapToInt(f -> f.getRatingGlobal()).average().orElse(0);
        double avgCommunication   = all.stream().mapToInt(f -> f.getRatingCommunication()).average().orElse(0);
        double avgQuality         = all.stream().mapToInt(f -> f.getRatingQuality()).average().orElse(0);
        double avgDeadline        = all.stream().mapToInt(f -> f.getRatingDeadline()).average().orElse(0);
        double avgProfessionalism = all.stream().mapToInt(f -> f.getRatingProfessionalism()).average().orElse(0);

        long recommendCount = all.stream().filter(f -> f.isRecommend()).count();
        long withResponse   = all.stream().filter(f -> f.getResponse() != null).count();
        double recommendRate = total > 0 ? Math.round(recommendCount * 1000.0 / total) / 10.0 : 0.0;
        double responseRate  = total > 0 ? Math.round(withResponse  * 1000.0 / total) / 10.0 : 0.0;

        // ── Rating distribution ───────────────────────────────────────────────
        Map<String, Long> ratingDist = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) {
            final int star = i;
            ratingDist.put(String.valueOf(i), all.stream().filter(f -> f.getRatingGlobal() == star).count());
        }

        // ── Monthly evolution ─────────────────────────────────────────────────
        String[] monthNames = {"","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};
        List<Object[]> monthly = feedbackRepo.findMonthlyRatingByFreelancer(freelancerId);
        List<Map<String, Object>> monthlyEvolution = new ArrayList<>();
        Map<String, Object> bestMonth = null, worstMonth = null;
        double bestAvg = -1, worstAvg = 6;

        for (Object[] row : monthly) {
            int year  = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            double avg = Math.round(((Number) row[2]).doubleValue() * 10.0) / 10.0;
            long count = ((Number) row[3]).longValue();
            String label = monthNames[month] + " " + year;

            Map<String, Object> slot = new LinkedHashMap<>();
            slot.put("month", label);
            slot.put("avgRating", avg);
            slot.put("count", count);
            monthlyEvolution.add(slot);

            if (avg > bestAvg  && count > 0) { bestAvg  = avg; bestMonth  = slot; }
            if (avg < worstAvg && count > 0) { worstAvg = avg; worstMonth = slot; }
        }

        // ── Market comparison & percentile ────────────────────────────────────
        Double marketAvg = feedbackRepo.findMarketAvgRating();
        double marketAvgRating = marketAvg != null ? Math.round(marketAvg * 10.0) / 10.0 : 0.0;

        long totalFreelancers = feedbackRepo.countDistinctFreelancers();
        long belowMe = feedbackRepo.countFreelancersBelowRating(avgGlobal).size();
        double rankPercentile = totalFreelancers > 1
                ? Math.round(belowMe * 100.0 / (totalFreelancers - 1) * 10) / 10.0 : 100.0;

        // ── Feedback rate vs contracts ────────────────────────────────────────
        long totalContracts = windowRepo.countByFreelancerId(freelancerId);
        double feedbackRate = totalContracts > 0
                ? Math.round(total * 1000.0 / totalContracts) / 10.0 : 0.0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("freelancerId",            freelancerId);
        result.put("totalFeedbacks",          total);
        result.put("totalContracts",          totalContracts);
        result.put("feedbackRate",            feedbackRate);
        result.put("avgGlobalRating",         Math.round(avgGlobal          * 10.0) / 10.0);
        result.put("avgCommunicationRating",  Math.round(avgCommunication   * 10.0) / 10.0);
        result.put("avgQualityRating",        Math.round(avgQuality         * 10.0) / 10.0);
        result.put("avgDeadlineRating",       Math.round(avgDeadline        * 10.0) / 10.0);
        result.put("avgProfessionalismRating",Math.round(avgProfessionalism * 10.0) / 10.0);
        result.put("recommendRate",           recommendRate);
        result.put("responseRate",            responseRate);
        result.put("ratingDistribution",      ratingDist);
        result.put("monthlyEvolution",        monthlyEvolution);
        result.put("bestMonth",               bestMonth);
        result.put("worstMonth",              worstMonth);
        result.put("marketAvgRating",         marketAvgRating);
        result.put("rankPercentile",          rankPercentile);
        return ResponseEntity.ok(result);
    }

    /**
     * DELETE /api/feedback/admin/client/{email}
     * Soft-deletes ALL feedbacks from a given client email (ban client).
     */
    @DeleteMapping("/admin/client/{email}")
    @Transactional
    public ResponseEntity<Map<String, Object>> banClient(@PathVariable String email) {
        List<com.workify.feedbackservice.domains.Feedback> toDelete = feedbackRepo.findByDeletedFalse()
                .stream()
                .filter(f -> email.equals(f.getClientEmail()))
                .collect(Collectors.toList());
        toDelete.forEach(f -> f.setDeleted(true));
        feedbackRepo.saveAll(toDelete);
        return ResponseEntity.ok(Map.of(
            "email",   email,
            "removed", toDelete.size(),
            "message", "Client " + email + " banned: " + toDelete.size() + " feedback(s) removed"
        ));
    }
}
