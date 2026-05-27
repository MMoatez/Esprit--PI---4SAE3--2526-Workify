package com.workify.eventservice.Dto;

import com.workify.eventservice.entites.ContentType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class EventContentDto {
  private Long id;
  private String partnerId;
  private String partnerName;
  private ContentType type;
  private String title;
  private String description;
  private String resourceUrl;
  private LocalDateTime addedAt;
}
