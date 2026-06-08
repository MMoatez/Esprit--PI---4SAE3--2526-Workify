package com.workify.communication.scheduler;

import com.workify.communication.service.RagClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RagSyncScheduler {

    private final RagClient ragClient;

    /**
     * Health check toutes les 60 secondes
     */
    @Scheduled(fixedRate = 60_000)
    public void checkRagHealth() {
        boolean healthy = ragClient.isHealthy();
        if (!healthy) {
            log.warn("⚠️ RAG Engine is DOWN at {}", System.currentTimeMillis());
        } else {
            log.debug("✅ RAG Engine is healthy");
        }
    }
}
