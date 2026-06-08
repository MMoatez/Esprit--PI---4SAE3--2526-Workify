package com.workify.communication.service;

import com.workify.communication.domain.ScheduledJob;
import com.workify.communication.repository.ScheduledJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ScheduledJobService {

    private final ScheduledJobRepository scheduledJobRepository;

    @Transactional
    public ScheduledJob scheduleJob(Long conversationId, String jobType, LocalDateTime dueAt, String payload) {
        ScheduledJob sj = ScheduledJob.builder()
                .conversationId(conversationId)
                .jobType(jobType)
                .dueAt(dueAt)
                .payload(payload)
                .locked(false)
                .createdAt(LocalDateTime.now())
                .build();
        return scheduledJobRepository.save(sj);
    }
}
