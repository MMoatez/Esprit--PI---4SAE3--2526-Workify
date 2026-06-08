package tn.esprit.workify.entities.subscription;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.esprit.workify.entities.pack.Dur;
import tn.esprit.workify.entities.pack.Pack;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "subscription")
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pack_id", nullable = false)
    private Pack pack;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatutsSubscription statuts = StatutsSubscription.ACTIVE;

    @Column(name = "amount_paid", nullable = false)
    private Float amountPaid;

    @Enumerated(EnumType.STRING)
    @Column(name = "selected_duration", nullable = false)
    private Dur selectedDuration;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    private PaymentMethod paymentMethod;

    // User-provided transaction reference (required for bank transfer)
    @Column(name = "transaction_reference")
    private String transactionReference;

    // Path to the uploaded receipt file (bank transfer)
    @Column(name = "receipt_path")
    private String receiptPath;

    // Admin rejection reason
    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "receipt_confidence")
    private Double receiptConfidence;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_validation_status")
    private AiValidationStatus aiValidationStatus;

    @Lob
    @Column(name = "extracted_metadata", columnDefinition = "LONGTEXT")
    private String extractedMetadata;

    @Column(name = "ai_rejection_reason", length = 500)
    private String aiRejectionReason;

    @Column(name = "admin_override")
    private Boolean adminOverride;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
