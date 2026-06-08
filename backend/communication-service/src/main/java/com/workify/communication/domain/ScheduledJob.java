package com.workify.communication.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "scheduled_job")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(name = "job_type", nullable = false)
    private String jobType;

    @Column(name = "due_at", nullable = false)
    private LocalDateTime dueAt;

    @Column(name = "payload", columnDefinition = "JSON")
    private String payload;

    @Column(name = "locked")
    private Boolean locked;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
