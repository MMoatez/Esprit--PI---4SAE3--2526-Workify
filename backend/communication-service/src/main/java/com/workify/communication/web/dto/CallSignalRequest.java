package com.workify.communication.web.dto;

import lombok.Data;

@Data
public class CallSignalRequest {
    private String callId;
    private String type;       // OFFER | ANSWER | ICE | REJECT | HANGUP
    private String callType;   // audio | video
    private Long   fromUserId;
    private Long   toUserId;
    private String sdp;        // JSON-encoded SDP or ICE candidate
}

