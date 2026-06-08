package com.workify.communication.enums;

/**
 * Statut de livraison d'un message
 */
public enum DeliveryStatus {
    SENT,      // Message envoyé
    DELIVERED, // Message délivré
    READ,      // Message lu
    BLOCKED    // Message bloqué par modération
}