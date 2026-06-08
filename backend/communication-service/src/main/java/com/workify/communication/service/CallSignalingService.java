package com.workify.communication.service;

import com.workify.communication.domain.CallSignal;
import com.workify.communication.repository.CallSignalRepository;
import com.workify.communication.web.dto.CallSignalRequest;
import com.workify.communication.web.dto.CallSignalResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CallSignalingService {

    private final CallSignalRepository repository;

    @Transactional
    public CallSignalResponse postSignal(CallSignalRequest req) {
        // Validation manuelle — évite NullPointerException / contraintes DB
        if (req.getCallId() == null || req.getCallId().isBlank()) {
            throw new IllegalArgumentException("callId is required");
        }
        if (req.getType() == null || req.getType().isBlank()) {
            throw new IllegalArgumentException("type is required");
        }
        if (req.getFromUserId() == null) {
            throw new IllegalArgumentException("fromUserId is required");
        }
        if (req.getToUserId() == null) {
            throw new IllegalArgumentException("toUserId is required");
        }

        CallSignal signal = CallSignal.builder()
                .callId(req.getCallId())
                .type(req.getType())
                .callType(req.getCallType())
                .fromUserId(req.getFromUserId())
                .toUserId(req.getToUserId())
                .sdp(req.getSdp() != null ? req.getSdp() : "")
                .build();
        CallSignal saved = repository.save(signal);
        log.debug("📞 CallSignal stored: {} → {} type={}", req.getFromUserId(), req.getToUserId(), req.getType());
        return toResponse(saved);
    }

    public List<CallSignalResponse> getPendingSignals(Long userId, String callId) {
        List<CallSignal> signals = (callId != null && !callId.isBlank())
                ? repository.findByToUserIdAndCallIdOrderByCreatedAtAsc(userId, callId)
                : repository.findByToUserIdOrderByCreatedAtAsc(userId);
        return signals.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public void deleteSignal(Long id) {
        repository.deleteById(id);
    }

    /** Auto-clean signals older than 2 minutes to prevent table bloat */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void cleanupStaleSignals() {
        repository.deleteOlderThan(LocalDateTime.now().minusMinutes(2));
    }

    private CallSignalResponse toResponse(CallSignal s) {
        return CallSignalResponse.builder()
                .id(s.getId())
                .callId(s.getCallId())
                .type(s.getType())
                .callType(s.getCallType())
                .fromUserId(s.getFromUserId())
                .toUserId(s.getToUserId())
                .sdp(s.getSdp())
                .build();
    }
}