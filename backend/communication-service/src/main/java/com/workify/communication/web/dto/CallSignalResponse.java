package com.workify.communication.web.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CallSignalResponse {
    private Long   id;
    private String callId;
    private String type;
    private String callType;
    private Long   fromUserId;
    private Long   toUserId;
    private String sdp;
}
