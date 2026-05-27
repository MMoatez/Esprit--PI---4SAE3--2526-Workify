package com.workify.feedbackservice.exception;

public class SpamDetectedException extends RuntimeException {

    private final String reason;

    public SpamDetectedException(String message, String reason) {
        super(message);
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }
}
