package com.workify.communication.web.controller;

import com.workify.communication.domain.Conversation;
import com.workify.communication.repository.ConversationRepository;
import com.workify.communication.service.RagClient;
import com.workify.communication.web.dto.SuggestionDto;
import com.workify.communication.web.dto.SuggestionRequest;
import com.workify.communication.web.dto.SuggestionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/suggestions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class SuggestionController {

    private final ConversationRepository conversationRepository;
    private final RagClient ragClient;

    private static final int PICK = 3; // number of suggestions to return each time

    @PostMapping
    public ResponseEntity<?> suggest(@RequestBody SuggestionRequest request) {

        Conversation conv = conversationRepository.findById(request.getConversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        Long userId = request.getUserId();
        if (userId == null || (!userId.equals(conv.getCreatorId()) && !userId.equals(conv.getReceiverId()))) {
            return ResponseEntity.status(403).body("Access denied: not a conversation participant");
        }

        String draft    = request.getDraft()    != null ? request.getDraft().trim()          : "";
        String userRole = request.getUserRole() != null ? request.getUserRole().toUpperCase() : "CLIENT";
        String query    = draft.isBlank() ? "What should I say next?" : draft;

        log.info("RAG suggestion: role={} conv={} draft='{}'", userRole, request.getConversationId(), query);

        // 1. Try RAG engine first
        String ragSuggestion = ragClient.getSuggestion(query, userRole, request.getConversationId());

        int offset = request.getOffset(); // 0 by default; frontend increments on each re-trigger

        List<SuggestionDto> suggestions;
        if (isUsableSuggestion(ragSuggestion)) {
            suggestions = List.of(new SuggestionDto(ragSuggestion, "rag"));
        } else {
            // 2. Pick from pool using offset-based rotation so each re-trigger returns different suggestions
            suggestions = pickWithOffset(buildPool(draft, userRole), PICK, offset);
        }

        return ResponseEntity.ok(new SuggestionResponse(suggestions));
    }

    // ── FILTER ────────────────────────────────────────────────────────────────

    private boolean isUsableSuggestion(String text) {
        if (text == null || text.isBlank() || text.length() < 16) return false;
        // Reject JSON blobs (call logs, system messages ingested by RAG)
        String stripped = text.stripLeading();
        if (stripped.startsWith("{") || stripped.startsWith("[")) return false;
        // Reject if it contains raw call-log fields
        if (text.contains("callType") || text.contains("callId") || text.contains("fromUserId")) return false;
        // Reject file paths / media URLs
        if (text.contains("/api/messages/files/")) return false;
        // Reject known useless RAG fallback phrases
        String lower = text.toLowerCase();
        return !lower.startsWith("i don't have")
            && !lower.startsWith("i do not have")
            && !lower.startsWith("based on available")
            && !lower.startsWith("please provide")
            && !lower.startsWith("no specific context")
            && !lower.startsWith("based on the conversation");
    }

    // ── OFFSET ROTATION PICK ──────────────────────────────────────────────────

    /**
     * Returns n suggestions from the pool starting at position (offset * n) % pool.size().
     * Each successive call with offset+1 returns the next 3 items, wrapping around.
     * Pool of 8, n=3: offset=0→[0,1,2], offset=1→[3,4,5], offset=2→[6,7,0], offset=3→[1,2,3]…
     */
    private List<SuggestionDto> pickWithOffset(List<String[]> pool, int n, int offset) {
        int size = pool.size();
        if (size == 0) return Collections.emptyList();
        int start = (offset * n) % size;
        List<SuggestionDto> result = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            int idx = (start + i) % size;
            result.add(new SuggestionDto(pool.get(idx)[0], pool.get(idx)[1]));
        }
        return result;
    }

    // ── POOL BUILDER ──────────────────────────────────────────────────────────
    /**
     * Returns a large pool of candidate suggestions for the given draft.
     * Each item is String[]{text, tone}.
     * The pool is matched by keyword category; if no category matches,
     * the role-based default pool is used.
     */
    private List<String[]> buildPool(String draft, String userRole) {
        String d = draft.toLowerCase().trim();

        // ── Greetings ─────────────────────────────────────────────────────────
        if (isGreeting(d)) {
            return greetingPool(userRole);
        }

        // ── Short affirmations ────────────────────────────────────────────────
        if (isAffirmation(d)) {
            return pool(
                s("Understood! I'll proceed as planned and keep you posted.", "formal"),
                s("Perfect, let's move forward. I'll share progress shortly.", "neutral"),
                s("Great, I'll handle it and confirm once done.", "friendly"),
                s("Noted — I'll get right on it.", "formal"),
                s("All good! I'll keep you in the loop.", "neutral"),
                s("Absolutely, I'll take care of it immediately.", "formal"),
                s("Sure thing! I'll update you as soon as it's done.", "friendly"),
                s("Roger that! I'll make it happen.", "neutral")
            );
        }

        // ── Thank you ─────────────────────────────────────────────────────────
        if (d.contains("thank") || d.contains("thx") || d.contains("merci") || d.contains("appreciate") || d.contains("grateful")) {
            return pool(
                s("You're welcome! Let me know if you need anything else.", "friendly"),
                s("Happy to help! Looking forward to delivering great results.", "formal"),
                s("My pleasure! Don't hesitate to reach out anytime.", "neutral"),
                s("Glad I could help! Feel free to ask if there's more.", "friendly"),
                s("Thank you too! I'm excited about our collaboration.", "neutral"),
                s("It's my pleasure — always here to support you.", "formal"),
                s("Great teamwork! Let's keep up this momentum.", "friendly"),
                s("Thank you for the kind words — let's keep pushing forward!", "neutral")
            );
        }

        // ── Apology ───────────────────────────────────────────────────────────
        if (d.contains("sorry") || d.contains("apologize") || d.contains("apologi") || d.contains("excuse") || d.contains("désolé") || d.contains("my bad")) {
            return pool(
                s("No worries! Let's focus on moving forward together.", "friendly"),
                s("That's alright — how can we resolve this efficiently?", "neutral"),
                s("No problem at all. What's the best next step?", "formal"),
                s("Don't worry about it! Let's continue from here.", "friendly"),
                s("It happens — let's stay focused on the goal.", "neutral"),
                s("All good! We can adjust and move on.", "formal"),
                s("I appreciate the transparency — let's find a solution.", "neutral"),
                s("No issue at all. Let's make sure it's sorted quickly.", "formal")
            );
        }

        // ── Problem / Issue / Bug ─────────────────────────────────────────────
        if (d.contains("problem") || d.contains("issue") || d.contains("bug") || d.contains("error") || d.contains("block") || d.contains("stuck") || d.contains("fail") || d.contains("crash")) {
            return pool(
                s("I've encountered a blocker — could you help me resolve it?", "formal"),
                s("There's an issue that needs your attention. Can we discuss?", "neutral"),
                s("I'm stuck on a problem. Do you have time to review it?", "friendly"),
                s("A bug has been identified — I'll send you the details.", "formal"),
                s("I need some guidance on a technical issue I've hit.", "neutral"),
                s("Something is blocking progress — let's sync on it.", "formal"),
                s("I ran into a challenge. Can we find a solution together?", "friendly"),
                s("An unexpected issue came up — I'll document it and share.", "neutral")
            );
        }

        // ── Deadline / Time / Date ────────────────────────────────────────────
        if (d.contains("deadline") || d.contains("when") || d.contains("date") || d.contains("time") || d.contains("delay") || d.contains("late") || d.contains("due")) {
            return pool(
                s("When is the confirmed deadline for this project?", "formal"),
                s("Could you clarify the expected delivery date?", "neutral"),
                s("Is there any risk of a delay we should plan for?", "formal"),
                s("What's the target completion date for the next milestone?", "neutral"),
                s("Can you confirm whether we are still on schedule?", "formal"),
                s("I wanted to flag a potential delay — can we discuss?", "friendly"),
                s("What's the latest update on the timeline?", "neutral"),
                s("Are the deadlines still realistic given the current progress?", "formal")
            );
        }

        // ── Status / Progress / Update ────────────────────────────────────────
        if (d.contains("status") || d.contains("progress") || d.contains("update") || d.contains("how") || d.contains("going") || d.contains("latest")) {
            return pool(
                s("What is the current progress on this project?", "formal"),
                s("Can you share the latest status update?", "neutral"),
                s("Are we on track to meet the milestones?", "formal"),
                s("I'd love a quick progress report when you get a chance.", "friendly"),
                s("How is the project going overall?", "neutral"),
                s("Any blockers or risks I should be aware of?", "formal"),
                s("What's been completed since the last update?", "neutral"),
                s("Could you summarise where we stand right now?", "formal")
            );
        }

        // ── Payment / Budget / Invoice ────────────────────────────────────────
        if (d.contains("pay") || d.contains("budget") || d.contains("cost") || d.contains("price") || d.contains("invoice") || d.contains("money") || d.contains("amount") || d.contains("fee")) {
            return pool(
                s("What is the agreed budget for this project?", "formal"),
                s("When will the payment be processed?", "neutral"),
                s("Could you confirm the invoice details?", "formal"),
                s("Is the budget still within the approved range?", "neutral"),
                s("I'd like to review the cost breakdown when possible.", "formal"),
                s("Has the invoice been approved for payment?", "formal"),
                s("Can you clarify the payment timeline?", "neutral"),
                s("I'll send over the invoice details for your review.", "friendly")
            );
        }

        // ── Delivery / Done / Completed ───────────────────────────────────────
        if (d.contains("deliver") || d.contains("submit") || d.contains("finish") || d.contains("done") || d.contains("complet") || d.contains("ready") || d.contains("ship")) {
            return pool(
                s("The deliverable is ready for your review.", "formal"),
                s("I've completed the task — please check and confirm.", "neutral"),
                s("Is the project ready for final review and sign-off?", "formal"),
                s("All tasks have been delivered as agreed. Please review.", "formal"),
                s("Work is done! Awaiting your approval to move forward.", "friendly"),
                s("The final version has been submitted — let me know your thoughts.", "neutral"),
                s("Everything is wrapped up — feedback would be appreciated.", "friendly"),
                s("The milestone has been completed. Ready for next steps?", "formal")
            );
        }

        // ── Review / Feedback ─────────────────────────────────────────────────
        if (d.contains("review") || d.contains("feedback") || d.contains("check") || d.contains("opinion") || d.contains("thought") || d.contains("look at")) {
            return pool(
                s("Please review the latest work and share your feedback.", "formal"),
                s("Could you take a look and let me know your thoughts?", "neutral"),
                s("I'd appreciate your feedback on the current version.", "friendly"),
                s("Your review on this would be very helpful.", "neutral"),
                s("Could you validate the latest deliverable?", "formal"),
                s("Once you've reviewed, let's sync on the next steps.", "formal"),
                s("Any comments or improvements you'd suggest?", "friendly"),
                s("I've made the requested changes — please review.", "neutral")
            );
        }

        // ── Meeting / Call / Sync ─────────────────────────────────────────────
        if (d.contains("meet") || d.contains("call") || d.contains("sync") || d.contains("schedule") || d.contains("available") || d.contains("discuss") || d.contains("chat")) {
            return pool(
                s("Are you available for a quick call to align on the project?", "formal"),
                s("Could we schedule a sync to review the current status?", "neutral"),
                s("Let's jump on a call — when works best for you?", "friendly"),
                s("I'd like to set up a brief meeting to discuss next steps.", "formal"),
                s("Can we find a time to review the progress together?", "neutral"),
                s("A 15-minute sync would help clarify things — interested?", "friendly"),
                s("Would tomorrow work for a quick project catch-up?", "neutral"),
                s("Let's align before the next milestone — any availability?", "formal")
            );
        }

        // ── Requirements / Questions ──────────────────────────────────────────
        if (d.contains("need") || d.contains("require") || d.contains("want") || d.contains("expect") || d.contains("what") || d.contains("clarif") || d.contains("question")) {
            return pool(
                s("Could you clarify the project requirements in more detail?", "formal"),
                s("What are the exact expectations for this deliverable?", "neutral"),
                s("I have a few questions — can we go over them together?", "friendly"),
                s("Please confirm the scope so I can align my work accordingly.", "formal"),
                s("Could you define the acceptance criteria for this task?", "formal"),
                s("I'd like to make sure I fully understand the requirements.", "neutral"),
                s("Are there any constraints I should be aware of?", "formal"),
                s("What's the priority order for the pending tasks?", "neutral")
            );
        }

        // ── Default: role-based pool ───────────────────────────────────────────
        return defaultPool(userRole);
    }

    // ── ROLE POOLS ────────────────────────────────────────────────────────────

    private List<String[]> greetingPool(String userRole) {
        return switch (userRole) {
            case "FREELANCER" -> pool(
                s("Hi! I wanted to give you a quick update on the project.", "friendly"),
                s("Hello! I'm making good progress and will share details soon.", "neutral"),
                s("Hey! Do you have any new requirements or changes for me?", "friendly"),
                s("Hi! Just checking in — any feedback on the latest submission?", "neutral"),
                s("Hello! I've been working hard on the tasks. How can I help?", "friendly"),
                s("Hi there! Ready to discuss the next milestone whenever you are.", "formal"),
                s("Good day! I've completed part of the work. Shall we review?", "formal"),
                s("Hey! Is there anything specific you need from me today?", "friendly")
            );
            case "ADMIN" -> pool(
                s("Hello! Here is a summary of the current project status.", "formal"),
                s("Hi! Please review the latest platform activity.", "neutral"),
                s("Good day! Are there any priority issues to address?", "formal"),
                s("Hello! I've reviewed the reports — let's align on next steps.", "formal"),
                s("Hi! Everything looks on track — any changes needed?", "neutral"),
                s("Hey! Just wanted to check if there are any escalations.", "friendly"),
                s("Hello! Ready to discuss the platform metrics when you are.", "formal"),
                s("Hi there! What's on the agenda for today?", "neutral")
            );
            default -> pool( // CLIENT
                s("Hi! I'd like to get an update on the project progress.", "friendly"),
                s("Hello! Can we schedule a quick sync on the deliverables?", "formal"),
                s("Hey! How is everything going with the project?", "neutral"),
                s("Hi! I have a few questions about the latest milestone.", "friendly"),
                s("Hello! Looking forward to seeing the next update.", "neutral"),
                s("Hi there! Any news on the project timeline?", "friendly"),
                s("Good day! Could we go over the current status together?", "formal"),
                s("Hey! Just wanted to check in on the latest progress.", "neutral")
            );
        };
    }

    private List<String[]> defaultPool(String userRole) {
        return switch (userRole) {
            case "FREELANCER" -> pool(
                s("I'm working on it and will share an update soon.", "neutral"),
                s("Could you clarify the requirements so I can proceed?", "formal"),
                s("Task completed — please review when you get a chance.", "friendly"),
                s("I've made good progress — here's a quick summary.", "neutral"),
                s("I need a bit more time — will deliver shortly.", "friendly"),
                s("Can I get your input before proceeding further?", "formal"),
                s("I've hit a small challenge — mind if I reach out?", "friendly"),
                s("Everything is on track — no blockers at the moment.", "neutral"),
                s("I'll have this ready before the agreed deadline.", "formal"),
                s("Should I prioritise this over the current tasks?", "neutral")
            );
            case "ADMIN" -> pool(
                s("Please review and confirm the project status.", "formal"),
                s("An action may be required for this conversation.", "neutral"),
                s("I've reviewed the situation and have a recommendation.", "formal"),
                s("All metrics look good — no immediate action needed.", "neutral"),
                s("A follow-up is needed on this matter.", "formal"),
                s("I'll escalate this if no response is received soon.", "formal"),
                s("Let's ensure both parties are aligned before proceeding.", "neutral"),
                s("I'll prepare a summary for the next review.", "formal"),
                s("This needs resolution — can we address it now?", "neutral"),
                s("I'll monitor this and report back with findings.", "formal")
            );
            default -> pool( // CLIENT
                s("Could you share a progress update on the project?", "neutral"),
                s("When can I expect the next deliverable?", "formal"),
                s("I'd like to discuss the current project status.", "friendly"),
                s("Is everything on track as planned?", "neutral"),
                s("Please keep me informed of any changes.", "formal"),
                s("What's the expected timeline for the next phase?", "neutral"),
                s("I'm looking forward to seeing the results soon.", "friendly"),
                s("Let me know if you need anything from my side.", "neutral"),
                s("Are there any risks I should be aware of?", "formal"),
                s("I'm happy with the progress — keep it up!", "friendly")
            );
        };
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private String[] s(String text, String tone) {
        return new String[]{text, tone};
    }

    private List<String[]> pool(String[]... items) {
        return new ArrayList<>(List.of(items));
    }

    private boolean isGreeting(String d) {
        return d.equals("hi") || d.equals("hello") || d.equals("hey") || d.equals("hii")
            || d.equals("hiii") || d.equals("bonjour") || d.equals("salut") || d.equals("coucou")
            || d.startsWith("hi ") || d.startsWith("hello ") || d.startsWith("hey ")
            || d.startsWith("good morning") || d.startsWith("good afternoon")
            || d.startsWith("good evening") || d.startsWith("dear ");
    }

    private boolean isAffirmation(String d) {
        return d.equals("ok") || d.equals("okay") || d.equals("sure") || d.equals("yes")
            || d.equals("yeah") || d.equals("yep") || d.equals("alright") || d.equals("noted")
            || d.equals("understood") || d.equals("agreed") || d.equals("got it")
            || d.equals("d'accord") || d.equals("oui") || d.equals("yup") || d.equals("ок")
            || d.startsWith("ok ") || d.startsWith("sure ") || d.startsWith("yes ") || d.startsWith("okay ");
    }
}
