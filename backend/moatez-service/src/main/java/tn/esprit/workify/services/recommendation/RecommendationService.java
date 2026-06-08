package tn.esprit.workify.services.recommendation;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.esprit.workify.DTO.RecommendationQuizRequestDto;
import tn.esprit.workify.DTO.RecommendationResponseDto;
import tn.esprit.workify.DTO.UpgradeSuggestionDto;
import tn.esprit.workify.clients.project.ProjectServiceClient;
import tn.esprit.workify.clients.user.RemoteUserDto;
import tn.esprit.workify.clients.user.UserServiceClient;
import tn.esprit.workify.entities.subscription.StatutsSubscription;
import tn.esprit.workify.repositories.ProjectFileRepository;
import tn.esprit.workify.repositories.SubscriptionRepository;
import tn.esprit.workify.repositories.meeting.MeetingRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RecommendationService implements IRecommendationService {

    private static final String FREE_STARTER = "Free Starter";
    private static final String PRO_FREELANCER = "Pro Freelancer";
    private static final String BUSINESS_CLIENT = "Business Client";
    private static final String ENTERPRISE_PARTNER = "Enterprise Partner";

    private final UserServiceClient userServiceClient;
    private final ProjectServiceClient projectServiceClient;
    private final ProjectFileRepository projectFileRepository;
    private final MeetingRepository meetingRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Override
    public RecommendationResponseDto recommendPlan(RecommendationQuizRequestDto request) {
        if (request == null) {
            throw new RuntimeException("Recommendation payload is required");
        }

        Map<String, Integer> scores = new HashMap<>();
        scores.put(FREE_STARTER, 0);
        scores.put(PRO_FREELANCER, 0);
        scores.put(BUSINESS_CLIENT, 0);
        scores.put(ENTERPRISE_PARTNER, 0);

        List<String> reasons = new ArrayList<>();

        String role = norm(request.getRole());
        switch (role) {
            case "FREELANCER" -> {
                add(scores, PRO_FREELANCER, 3);
                add(scores, FREE_STARTER, 1);
                reasons.add("Your profile is freelancer-oriented");
            }
            case "CLIENT" -> {
                add(scores, BUSINESS_CLIENT, 4);
                reasons.add("Your profile is client-oriented");
            }
            case "BOTH" -> {
                add(scores, BUSINESS_CLIENT, 2);
                add(scores, PRO_FREELANCER, 2);
                add(scores, ENTERPRISE_PARTNER, 2);
                reasons.add("You need flexibility across multiple usage modes");
            }
            default -> add(scores, FREE_STARTER, 1);
        }

        String projectLoad = norm(request.getProjectsPerMonth());
        switch (projectLoad) {
            case "1-3" -> {
                add(scores, FREE_STARTER, 3);
                add(scores, PRO_FREELANCER, 1);
                reasons.add("Your project volume is currently light");
            }
            case "4-10" -> {
                add(scores, PRO_FREELANCER, 3);
                add(scores, BUSINESS_CLIENT, 2);
                reasons.add("Your project volume suggests growth potential");
            }
            case "10+" -> {
                add(scores, ENTERPRISE_PARTNER, 4);
                add(scores, BUSINESS_CLIENT, 2);
                add(scores, PRO_FREELANCER, 2);
                reasons.add("High project volume benefits from advanced capacity");
            }
        }

        String messaging = norm(request.getMessagingUsage());
        switch (messaging) {
            case "RAREMENT", "RARELY" -> add(scores, FREE_STARTER, 1);
            case "SOUVENT", "OFTEN" -> {
                add(scores, PRO_FREELANCER, 2);
                add(scores, BUSINESS_CLIENT, 1);
                reasons.add("Frequent messaging requires stronger collaboration features");
            }
            case "INTENSIVEMENT", "INTENSIVELY" -> {
                add(scores, ENTERPRISE_PARTNER, 3);
                add(scores, PRO_FREELANCER, 2);
                add(scores, BUSINESS_CLIENT, 2);
                reasons.add("Intensive communication usage needs premium limits");
            }
        }

        String visibility = norm(request.getVisibilityNeed());
        switch (visibility) {
            case "NON", "NO" -> add(scores, FREE_STARTER, 1);
            case "MOYENNE", "MEDIUM" -> {
                add(scores, PRO_FREELANCER, 2);
                add(scores, BUSINESS_CLIENT, 1);
            }
            case "ELEVEE", "HIGH" -> {
                add(scores, PRO_FREELANCER, 2);
                add(scores, BUSINESS_CLIENT, 2);
                add(scores, ENTERPRISE_PARTNER, 2);
                reasons.add("High visibility goals match premium exposure features");
            }
        }

        if (Boolean.TRUE.equals(request.getAdvancedStats())) {
            add(scores, ENTERPRISE_PARTNER, 2);
            add(scores, BUSINESS_CLIENT, 1);
            add(scores, PRO_FREELANCER, 1);
            reasons.add("Advanced analytics requirements favor higher plans");
        } else {
            add(scores, FREE_STARTER, 1);
        }

        String plan = scores.entrySet().stream()
                .max(Comparator.comparingInt(Map.Entry::getValue))
                .map(Map.Entry::getKey)
                .orElse(FREE_STARTER);

        int maxScore = scores.get(plan);
        int confidence = Math.min(95, Math.max(55, 50 + (maxScore * 5)));

        String message = switch (plan) {
            case PRO_FREELANCER -> "We recommend Pro Freelancer 🚀 to accelerate your growth and visibility.";
            case BUSINESS_CLIENT -> "We recommend Business Client 📈 to manage projects at scale with confidence.";
            case ENTERPRISE_PARTNER -> "We recommend Enterprise Partner ⭐ for intensive, high-impact usage.";
            default -> "We recommend Free Starter 🌱 to begin simply and upgrade anytime.";
        };

        return RecommendationResponseDto.builder()
                .recommendedPlan(plan)
                .message(message)
                .reasons(reasons.stream().distinct().toList())
                .confidence(confidence)
                .actionLabel("Choose this plan")
                .build();
    }

    @Override
    public UpgradeSuggestionDto suggestUpgrade(Integer userId) {
        if (userId == null) {
            throw new RuntimeException("userId is required");
        }

        RemoteUserDto user = userServiceClient.getRequiredUser(userId);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime weekAgo = now.minusDays(7);
        LocalDateTime monthAgo = now.minusDays(30);

        long weeklyCreated = projectServiceClient.countClientProjectsSince(userId, weekAgo);
        long weeklyAssigned = 0;
        long weeklyProjectActivity = weeklyCreated + weeklyAssigned;

        long monthlyCreated = projectServiceClient.countClientProjectsSince(userId, monthAgo);
        long monthlyAssigned = 0;
        long monthlyProjectActivity = monthlyCreated + monthlyAssigned;

        long weeklyUploads = projectFileRepository.countByUploadedByAndUploadedAtAfter(userId, weekAgo);
        long monthlyMeetings = meetingRepository.countUserMeetingsInPeriod(userId, monthAgo, now);

        String recommendedPlan = null;
        String message = null;
        boolean shouldSuggest = false;

        if (user.hasRole("CLIENT") && (weeklyCreated > 3 || monthlyProjectActivity > 8 || monthlyMeetings > 5)) {
            recommendedPlan = BUSINESS_CLIENT;
            message = "You are managing more client-side activity. Upgrade to Business Client to unlock smoother project control.";
            shouldSuggest = true;
        } else if (user.hasRole("FREELANCER") && (weeklyAssigned > 10 || weeklyUploads > 20 || monthlyProjectActivity > 8 || monthlyMeetings > 6)) {
            recommendedPlan = PRO_FREELANCER;
            message = "You're growing fast 🚀 Upgrade to Pro Freelancer to unlock more opportunities and visibility.";
            shouldSuggest = true;
        } else if (user.hasRole("PARTNER") && (weeklyProjectActivity > 10 || weeklyUploads > 20 || monthlyMeetings > 8)) {
            recommendedPlan = ENTERPRISE_PARTNER;
            message = "Your partner activity is high. Enterprise Partner will give you premium scale and control.";
            shouldSuggest = true;
        }

        String currentPlan = subscriptionRepository
                .findTopByUserIdAndStatutsOrderByEndDateDesc(userId, StatutsSubscription.ACTIVE)
                .map(subscription -> subscription.getPack().getName())
                .orElse(null);

        if (shouldSuggest && currentPlan != null && recommendedPlan != null &&
                currentPlan.toLowerCase(Locale.ROOT).contains(keywordForPlan(recommendedPlan))) {
            shouldSuggest = false;
            message = "Your current plan already matches your activity level.";
        }

        return UpgradeSuggestionDto.builder()
                .shouldSuggest(shouldSuggest)
                .recommendedPlan(recommendedPlan)
                .message(message)
                .actionLabel("Upgrade Now")
                .weeklyProjectActivity(weeklyProjectActivity)
                .weeklyUploads(weeklyUploads)
                .monthlyProjectActivity(monthlyProjectActivity)
                .monthlyMeetings(monthlyMeetings)
                .currentPlan(currentPlan)
                .build();
    }

    private static void add(Map<String, Integer> scores, String key, int value) {
        scores.computeIfPresent(key, (k, v) -> v + value);
    }

    private static String norm(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String keywordForPlan(String plan) {
        if (plan == null) return "";
        if (plan.equals(PRO_FREELANCER)) return "pro";
        if (plan.equals(BUSINESS_CLIENT)) return "business";
        if (plan.equals(ENTERPRISE_PARTNER)) return "enterprise";
        return "free";
    }
}
