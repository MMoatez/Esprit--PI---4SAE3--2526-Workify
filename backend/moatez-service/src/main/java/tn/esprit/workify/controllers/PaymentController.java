package tn.esprit.workify.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.workify.DTO.payment.CheckoutSessionResponse;
import tn.esprit.workify.DTO.payment.CreateCheckoutSessionRequest;
import tn.esprit.workify.DTO.payment.CreatePaymentIntentRequest;
import tn.esprit.workify.DTO.payment.PaymentIntentResponse;
import tn.esprit.workify.DTO.payment.PaymentResponseDto;
import tn.esprit.workify.services.payment.IPaymentService;

import java.util.List;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class PaymentController {

    private final IPaymentService paymentService;

    @PostMapping("/create")
    public ResponseEntity<PaymentIntentResponse> createPaymentIntent(@RequestBody CreatePaymentIntentRequest request) {
        return ResponseEntity.ok(paymentService.createPaymentIntent(request));
    }

    @PostMapping("/create-checkout-session")
    public ResponseEntity<CheckoutSessionResponse> createCheckoutSession(@RequestBody CreateCheckoutSessionRequest request) {
        return ResponseEntity.ok(paymentService.createCheckoutSession(request));
    }

    @GetMapping("/confirm-checkout-session")
    public ResponseEntity<PaymentResponseDto> confirmCheckoutSession(@RequestParam String sessionId) {
        return ResponseEntity.ok(paymentService.confirmCheckoutSession(sessionId));
    }

    @PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> stripeWebhook(
        @RequestBody String payload,
        @RequestHeader("Stripe-Signature") String signatureHeader
    ) {
        paymentService.handleWebhookEvent(payload, signatureHeader);
        return ResponseEntity.ok("Webhook processed");
    }

    @GetMapping("/admin/transactions")
    public ResponseEntity<List<PaymentResponseDto>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }
}
