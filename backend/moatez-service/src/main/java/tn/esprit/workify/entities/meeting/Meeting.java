package tn.esprit.workify.entities.meeting;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "meeting")
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "projet_id", nullable = false)
    private Integer projetId;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "meeting_date")
    private LocalDateTime meetingDate;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MeetingStatus status;

    // ✅ NOUVEAUX CHAMPS
    @Column(name = "is_online")
    private Boolean isOnline; // true = Online, false = In-Person

    @Column(name = "meeting_link", columnDefinition = "TEXT")
    private String meetingLink; // Lien Zoom/Google Meet OU Google Maps

    // ✅ AJOUTEZ : Notes du meeting (recap)
    @Column(name = "meeting_notes", columnDefinition = "TEXT")
    private String meetingNotes;

    // ✅ AJOUTEZ cette colonne
    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "completed_by_id")
    private Integer completedByUserId;

    @Column(name = "rejected_by_id")
    private Integer rejectedByUserId;

    @Column(name = "cancelled_by_id")
    private Integer cancelledByUserId;

    @Column(name = "created_by_id", nullable = false)
    private Integer createdByUserId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ✅ AJOUTEZ : Date de complétion
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "meeting", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MeetingProposal> proposals = new ArrayList<>();

        @ElementCollection
        @CollectionTable(name = "meeting_participants", joinColumns = @JoinColumn(name = "meeting_id"))
        @Column(name = "user_id")
    @Builder.Default
        private List<Integer> participantIds = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}