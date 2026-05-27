package com.workify.feedbackservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Generates AI-powered suggestion phrases for feedback and replies,
 * tailored to the project's domain (detected via zero-shot classification).
 */
@Service
@Slf4j
public class SuggestionService {

    @Value("${huggingface.api.key:}")
    private String hfApiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String HF_ZEROSHOT =
            "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli/pipeline/zero-shot-classification";

    private static final List<String> DOMAINS = List.of(
            "3D animation", "web development", "mobile development", "API development",
            "AI machine learning", "graphic design", "video editing",
            "content writing", "data analysis", "cybersecurity"
    );

    // ── Phrases suggérées pour le client (feedback) ───────────────────────────

    private static final Map<String, List<String>> FEEDBACK_PHRASES = Map.of(
        "3D animation", List.of(
                "The creativity and originality of the animations exceeded my expectations.",
                "The movements were very smooth and perfectly matched the storyboard.",
                "The rendering quality was impressive and delivered on time.",
                "The visual style was unique and aligned with my creative vision.",
                "The animation fluidity made the final result look very professional."),
        "web development", List.of(
                "The code quality was clean, well-structured, and easy to maintain.",
                "The UI/UX design was intuitive and visually appealing.",
                "The application performed excellently across all browsers.",
                "Security best practices were followed throughout the project.",
                "The documentation provided was clear and very helpful."),
        "mobile development", List.of(
                "The app ran smoothly and responsively on all tested devices.",
                "The user interface was clean, modern, and easy to navigate.",
                "Cross-platform compatibility was handled very professionally.",
                "The code architecture was solid and well-organized.",
                "Testing coverage was thorough and helped catch issues early."),
        "API development", List.of(
                "The API was well-designed, reliable, and easy to integrate.",
                "The documentation was clear, detailed, and very well structured.",
                "Response times were consistently fast and within agreed limits.",
                "Error handling was robust and covered all edge cases effectively.",
                "Security and authentication were implemented following best practices."),
        "AI machine learning", List.of(
                "The model achieved excellent prediction accuracy on our dataset.",
                "The training pipeline was efficient, well-optimized, and scalable.",
                "The approach was innovative and showed deep expertise in the field.",
                "Data preprocessing was handled carefully and improved model quality.",
                "The results were explained clearly and were easy to interpret."),
        "graphic design", List.of(
                "The visual aesthetics were stunning and perfectly matched our brand.",
                "Brand guidelines were respected consistently throughout the project.",
                "The color palette and typography choices were harmonious and elegant.",
                "The creativity shown in the designs went beyond our initial expectations.",
                "All files were delivered in the correct formats and well-organized."),
        "video editing", List.of(
                "The editing rhythm was dynamic and kept the viewer fully engaged.",
                "Color grading gave the video a professional and cinematic look.",
                "Audio and video synchronization was flawless throughout the edit.",
                "Transitions were smooth and perfectly timed with the narrative.",
                "The final video clearly conveyed the story we wanted to tell."),
        "content writing", List.of(
                "The writing was clear, engaging, and perfectly suited our audience.",
                "SEO optimization was well-applied and improved our content ranking.",
                "The tone was consistent and aligned with our brand voice.",
                "Research was thorough and added real depth to the content.",
                "Grammar and style were impeccable throughout all deliverables."),
        "data analysis", List.of(
                "The analysis was deep, insightful, and highly actionable.",
                "The data visualizations were clear, informative, and well-designed.",
                "The insights provided were accurate and backed by solid methodology.",
                "The final report was well-structured and easy to understand.",
                "Data cleaning and preparation were handled carefully and precisely."),
        "cybersecurity", List.of(
                "The vulnerability assessment was thorough and very well documented.",
                "The security report was detailed, clear, and easy to act upon.",
                "Remediation advice was practical, prioritized, and clearly explained.",
                "Test coverage was comprehensive and left no critical area unchecked.",
                "The findings were communicated professionally and on schedule.")
    );

    // ── Phrases suggérées pour le freelancer (reply) ──────────────────────────

    private static final Map<String, List<String>> REPLY_PHRASES = Map.of(
        "3D animation", List.of(
                "Thank you for your detailed feedback on my animation work — it truly means a lot.",
                "I will focus on refining movement transitions and timing in future projects.",
                "Your storyboard guidance was very clear and helped me deliver a better result.",
                "I am glad the visual quality met your expectations and I look forward to working together again."),
        "web development", List.of(
                "Thank you for testing the application so thoroughly — your attention to detail is appreciated.",
                "I will improve the documentation and code comments in future deliveries.",
                "Your feedback on performance helped me identify and fix key bottlenecks.",
                "I am happy the UI design met your expectations and I welcome any further suggestions."),
        "mobile development", List.of(
                "Thank you for testing on multiple devices — it helped ensure a solid user experience.",
                "I appreciate your detailed feedback on the interface and will apply it going forward.",
                "Your suggestions on performance will directly influence how I approach future builds.",
                "I am committed to improving cross-platform consistency in my upcoming projects."),
        "API development", List.of(
                "Thank you for the thorough integration testing — your feedback was very valuable.",
                "I will enhance the API documentation to make future integrations even smoother.",
                "Your notes on reliability helped me identify improvements that will benefit future clients.",
                "I appreciate your comments on error handling and will refine that in the next version."),
        "AI machine learning", List.of(
                "Thank you for carefully evaluating the model performance — your insights were very helpful.",
                "Your feedback on prediction accuracy is valuable and will guide my next optimization.",
                "I will work on streamlining the training pipeline even further for better efficiency.",
                "I appreciate your thoughtful review and look forward to our next collaboration."),
        "graphic design", List.of(
                "Thank you for the creative direction feedback — it helped me better understand your vision.",
                "I will apply brand guidelines even more precisely in future design projects.",
                "Your input on colors and typography was very useful and I will keep it in mind.",
                "I am glad the designs resonated with your brand identity and welcome further feedback."),
        "video editing", List.of(
                "Thank you for the detailed editing feedback — it helps me grow as a professional.",
                "I will work on improving transition rhythm and pacing in future video projects.",
                "Your audio synchronization notes were very precise and I will address them going forward.",
                "I am happy the final result matched your vision and look forward to the next project."),
        "content writing", List.of(
                "Thank you for your honest feedback on the writing — it helps me improve continuously.",
                "I will apply a stronger focus on SEO optimization in all future content deliveries.",
                "Your guidance on tone and voice will help me write more aligned content next time.",
                "I appreciate your thoroughness in reviewing the content and welcome ongoing feedback."),
        "data analysis", List.of(
                "Thank you for reviewing the analysis report so carefully — your input is very valuable.",
                "I will improve the visualization clarity and layout in future reports.",
                "Your feedback on the analytical methodology is greatly appreciated and noted.",
                "I am glad the insights were useful and I look forward to supporting your next data project."),
        "cybersecurity", List.of(
                "Thank you for reviewing the security report — your comments helped refine the findings.",
                "I will include more detailed remediation steps in all future security assessments.",
                "Your feedback on test coverage motivates me to be even more thorough next time.",
                "I appreciate your professional engagement throughout this project and look forward to the next.")
    );

    private static final List<String> DEFAULT_FEEDBACK = List.of(
            "The quality of the deliverables was excellent and met all my expectations.",
            "Communication throughout the project was clear, responsive, and professional.",
            "All deadlines were respected and the work was delivered on schedule.",
            "The level of professionalism shown was very high and greatly appreciated.",
            "Great attention to detail was demonstrated in every aspect of the work.",
            "Overall I am very satisfied with the outcome and would recommend this freelancer."
    );

    private static final List<String> DEFAULT_REPLY = List.of(
            "Thank you for your honest and constructive feedback — it is very much appreciated.",
            "I am glad the work met your expectations and I look forward to collaborating again.",
            "Your feedback will help me improve and deliver even better results in future projects.",
            "Thank you for the opportunity to work on this project — it was a great experience."
    );

    // ── Public API ────────────────────────────────────────────────────────────

    public List<String> getSuggestions(String projectTitle, String mode) {
        String domain = detectDomain(projectTitle);
        log.info("[SUGGESTION] domain='{}' for projectTitle='{}'", domain, projectTitle);

        Map<String, List<String>> phrases = "reply".equals(mode) ? REPLY_PHRASES : FEEDBACK_PHRASES;
        List<String> defaults = "reply".equals(mode) ? DEFAULT_REPLY : DEFAULT_FEEDBACK;

        return domain != null ? phrases.getOrDefault(domain, defaults) : defaults;
    }

    // ── Domain detection ──────────────────────────────────────────────────────

    private String detectDomain(String projectTitle) {
        if (projectTitle == null || projectTitle.isBlank()) return null;
        try {
            RestTemplate rt = buildRestTemplate();
            HttpHeaders  hh = buildHeaders();
            String body = objectMapper.writeValueAsString(Map.of(
                    "inputs", "Project: " + projectTitle,
                    "parameters", Map.of("candidate_labels", DOMAINS, "multi_label", false)
            ));
            ResponseEntity<String> resp = rt.exchange(
                    HF_ZEROSHOT, HttpMethod.POST, new HttpEntity<>(body, hh), String.class);

            JsonNode raw = objectMapper.readTree(resp.getBody());

            // New flat array format: [{label, score}, ...]
            if (raw.isArray() && raw.size() > 0) {
                if (raw.get(0).has("label")) return raw.get(0).path("label").asText();
                if (raw.get(0).has("labels")) return raw.get(0).get("labels").get(0).asText();
            }
            // Old object format: {labels:[...], scores:[...]}
            if (raw.has("labels")) return raw.get("labels").get(0).asText();

        } catch (Exception e) {
            log.warn("[SUGGESTION] Domain detection failed: {}", e.getMessage());
        }
        return null;
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private RestTemplate buildRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(30_000);
        return new RestTemplate(factory);
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        if (hfApiKey != null && !hfApiKey.isBlank()) headers.setBearerAuth(hfApiKey);
        return headers;
    }
}
