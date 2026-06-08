package tn.esprit.workify.entities.subscription;

public enum StatutsSubscription {
    PENDING,   // waiting for admin approval (bank transfer)
    ACTIVE,
    INACTIVE,
    REJECTED
}
