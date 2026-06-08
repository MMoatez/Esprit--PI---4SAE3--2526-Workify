package tn.esprit.workify.entities.meeting;

public enum MeetingStatus {
    PROPOSED,    // Date proposée, en attente de votes
    CONFIRMED,   // Date confirmée par les deux parties
    CANCELLED,   // Réunion annulée
    COMPLETED,    // Réunion terminée
    REJECTED
}