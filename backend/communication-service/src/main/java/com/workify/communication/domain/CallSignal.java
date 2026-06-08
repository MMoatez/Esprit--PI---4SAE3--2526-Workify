package com.workify.communication.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "call_signals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallSignal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "call_id", nullable = false)
    private String callId;

    /** OFFER | ANSWER | ICE | REJECT | HANGUP */
    @Column(name = "type", nullable = false)
    private String type;

    /** audio | video */
    @Column(name = "call_type")
    private String callType;

    @Column(name = "from_user_id", nullable = false)
    private Long fromUserId;

    @Column(name = "to_user_id", nullable = false)
    private Long toUserId;

    /** JSON-encoded SDP or ICE candidate */
    @Column(name = "sdp", columnDefinition = "LONGTEXT")
    private String sdp;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
