package tn.esprit.workify.entities.meeting;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
@Table(name = "meeting_proposal")
public class MeetingProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "meeting_id")
    private Integer meetingId;

    @Column(name = "proposed_date", nullable = false)
    private LocalDateTime proposedDate;

    @Column(name = "proposed_by_id")
    private Integer proposedByUserId;

    @Column(name = "vote_count")
    @Builder.Default
    private Integer voteCount = 0;

        @ElementCollection
        @CollectionTable(name = "proposal_votes", joinColumns = @JoinColumn(name = "proposal_id"))
        @Column(name = "user_id")
    @Builder.Default
        private List<Integer> votedByUserIds = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", insertable = false, updatable = false)
    @JsonIgnore
    private Meeting meeting;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}