package com.workify.communication.exception;

import com.workify.communication.domain.Conversation;
import lombok.Getter;

/**
 * Thrown by ConversationService.getOrCreateConversation when the existing
 * conversation between two users has status = BLOCKED.
 *
 * The controller maps this to HTTP 409 Conflict so the Angular frontend
 * can display a "user is blocked" warning instead of silently navigating
 * to the blocked conversation.
 */
@Getter
public class BlockedConversationException extends RuntimeException {

    /** The blocked conversation (always present). */
    private final Conversation conversation;

    public BlockedConversationException(String message, Conversation conversation) {
        super(message);
        this.conversation = conversation;
    }
}