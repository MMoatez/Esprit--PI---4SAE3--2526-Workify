package com.workify.communication.exception;

import java.time.LocalDateTime;

/**
 * Thrown when a banned user attempts to send a message.
 * The controller maps this to HTTP 429 Too Many Requests.
 */
public class UserBannedException extends RuntimeException {

    private final LocalDateTime bannedUntil;

    public UserBannedException(LocalDateTime bannedUntil) {
        super("User is temporarily banned until " + bannedUntil);
        this.bannedUntil = bannedUntil;
    }

    public LocalDateTime getBannedUntil() {
        return bannedUntil;
    }
}
