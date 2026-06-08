package com.workify.communication.web.controller;

import com.workify.communication.service.CallSignalingService;
import com.workify.communication.web.dto.CallSignalRequest;
import com.workify.communication.web.dto.CallSignalResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class CallController {

    private final CallSignalingService signalingService;

    /**
     * POST /api/calls/signal
     * Caller / callee posts an OFFER, ANSWER, ICE, REJECT, or HANGUP signal.
     */
    @PostMapping("/signal")
    public ResponseEntity<CallSignalResponse> postSignal(@RequestBody CallSignalRequest request) {
        try {
            CallSignalResponse response = signalingService.postSignal(request);
            log.info("✅ Call signal processed: {} → {} type={}", request.getFromUserId(), request.getToUserId(), request.getType());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            log.warn("⚠️ Invalid call signal request: {}", ex.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception ex) {
            log.error("❌ Error processing call signal", ex);
            throw ex;
        }
    }

    /**
     * GET /api/calls/pending?userId=X&callId=Y
     * Poll for signals addressed to the current user.
     * callId is optional — omit it to receive all pending signals (useful for detecting incoming calls).
     */
    @GetMapping("/pending")
    public ResponseEntity<List<CallSignalResponse>> getPending(
            @RequestParam Long userId,
            @RequestParam(required = false, defaultValue = "") String callId) {
        try {
            List<CallSignalResponse> signals = signalingService.getPendingSignals(userId, callId);
            log.debug("📞 Retrieved {} pending signals for user {}", signals.size(), userId);
            return ResponseEntity.ok(signals);
        } catch (Exception ex) {
            log.error("❌ Error retrieving pending signals", ex);
            throw ex;  // Will be caught by global exception handler
        }
    }

    /**
     * DELETE /api/calls/signal/{id}
     * Acknowledge and remove a signal after it has been consumed.
     */
    @DeleteMapping("/signal/{id}")
    public ResponseEntity<Void> deleteSignal(@PathVariable Long id) {
        try {
            signalingService.deleteSignal(id);
            log.debug("🗑️ Call signal {} deleted", id);
            return ResponseEntity.noContent().build();
        } catch (Exception ex) {
            log.error("❌ Error deleting call signal {}", id, ex);
            throw ex;  // Will be caught by global exception handler
        }
    }
}