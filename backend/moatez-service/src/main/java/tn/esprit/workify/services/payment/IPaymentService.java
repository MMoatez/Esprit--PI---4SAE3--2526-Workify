package tn.esprit.workify.services.payment;

import tn.esprit.workify.DTO.payment.CreatePaymentIntentRequest;
import tn.esprit.workify.DTO.payment.CheckoutSessionResponse;
import tn.esprit.workify.DTO.payment.CreateCheckoutSessionRequest;
import tn.esprit.workify.DTO.payment.PaymentIntentResponse;
import tn.esprit.workify.DTO.payment.PaymentResponseDto;

import java.util.List;

public interface IPaymentService {
    PaymentIntentResponse createPaymentIntent(CreatePaymentIntentRequest request);
    CheckoutSessionResponse createCheckoutSession(CreateCheckoutSessionRequest request);
    PaymentResponseDto confirmCheckoutSession(String sessionId);
    void handleWebhookEvent(String payload, String signatureHeader);
    List<PaymentResponseDto> getAllPayments();
}
