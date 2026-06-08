package tn.esprit.workify.services.subscription;

import tn.esprit.workify.DTO.CreateSubscriptionDto;
import tn.esprit.workify.DTO.SubscriptionResponseDto;

import java.time.LocalDate;
import java.util.List;

public interface ISubscriptionService {
    SubscriptionResponseDto subscribe(CreateSubscriptionDto dto);
    List<SubscriptionResponseDto> getAllSubscriptions();
    List<SubscriptionResponseDto> getSubscriptionsByUser(Integer userId);
    SubscriptionResponseDto getActiveSubscription(Integer userId);
    SubscriptionResponseDto cancelSubscription(Integer subscriptionId);
    SubscriptionResponseDto approveSubscription(Integer subscriptionId);
    SubscriptionResponseDto rejectSubscription(Integer subscriptionId, String reason);
    SubscriptionResponseDto overrideAiDecision(Integer subscriptionId, boolean approve, String reason);
    byte[] exportSubscriptions(LocalDate fromDate, LocalDate toDate);
}
