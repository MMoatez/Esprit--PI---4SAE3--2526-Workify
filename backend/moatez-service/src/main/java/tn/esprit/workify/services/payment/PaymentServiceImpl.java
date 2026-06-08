package tn.esprit.workify.services.payment;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tn.esprit.workify.DTO.payment.CreatePaymentIntentRequest;
import tn.esprit.workify.DTO.payment.CheckoutSessionResponse;
import tn.esprit.workify.DTO.payment.CreateCheckoutSessionRequest;
import tn.esprit.workify.DTO.payment.PaymentIntentResponse;
import tn.esprit.workify.DTO.payment.PaymentResponseDto;
import tn.esprit.workify.clients.user.RemoteUserDto;
import tn.esprit.workify.clients.user.UserServiceClient;
import tn.esprit.workify.entities.pack.Dur;
import tn.esprit.workify.entities.pack.Pack;
import tn.esprit.workify.entities.pack.PackOption;
import tn.esprit.workify.entities.payment.Payment;
import tn.esprit.workify.entities.payment.PaymentStatus;
import tn.esprit.workify.entities.subscription.PaymentMethod;
import tn.esprit.workify.entities.subscription.StatutsSubscription;
import tn.esprit.workify.entities.subscription.Subscription;
import tn.esprit.workify.repositories.PackRepository;
import tn.esprit.workify.repositories.PaymentRepository;
import tn.esprit.workify.repositories.SubscriptionRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements IPaymentService {

    private final PaymentRepository paymentRepository;
    private final UserServiceClient userServiceClient;
    private final PackRepository packRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @Value("${stripe.webhook.secret}")
    private String stripeWebhookSecret;

    @Value("${stripe.currency:eur}")
    private String stripeCurrency;

    @Override
    @Transactional
    public PaymentIntentResponse createPaymentIntent(CreatePaymentIntentRequest request) {
        if (request.getUserId() == null || request.getPackId() == null || request.getSelectedDuration() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId, packId and selectedDuration are required");
        }

        RemoteUserDto user = userServiceClient.findUserById(request.getUserId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + request.getUserId()));

        Pack pack = packRepository.findById(request.getPackId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pack not found: " + request.getPackId()));

        PackOption option = resolveActivePackOption(pack, request.getSelectedDuration());
        if (option.getPrice() == null || option.getPrice() <= 0f) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot process online payment for a free plan");
        }

        BigDecimal amount = BigDecimal.valueOf(option.getPrice()).setScale(2, RoundingMode.HALF_UP);
        String currency = stripeCurrency == null ? "eur" : stripeCurrency.toLowerCase(Locale.ROOT);
        long stripeAmount = amount.multiply(BigDecimal.valueOf(100)).longValue();

        Payment payment = Payment.builder()
            .userId(request.getUserId())
            .pack(pack)
            .selectedDuration(request.getSelectedDuration())
            .amount(amount)
            .currency(currency)
            .status(PaymentStatus.PENDING)
            .build();
        payment = paymentRepository.save(payment);

        try {
            Stripe.apiKey = stripeSecretKey;

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(stripeAmount)
                .setCurrency(currency)
                .putMetadata("paymentId", payment.getId().toString())
                .putMetadata("userId", request.getUserId().toString())
                .putMetadata("packId", pack.getId().toString())
                .putMetadata("selectedDuration", request.getSelectedDuration().name())
                .build();

            PaymentIntent intent = PaymentIntent.create(params);
            payment.setStripePaymentIntentId(intent.getId());
            paymentRepository.save(payment);

            return PaymentIntentResponse.builder()
                .paymentId(payment.getId())
                .paymentIntentId(intent.getId())
                .clientSecret(intent.getClientSecret())
                .amount(stripeAmount)
                .currency(currency)
                .build();
        } catch (StripeException e) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Stripe error while creating payment intent", e);
        }
    }

    @Override
    @Transactional
    public CheckoutSessionResponse createCheckoutSession(CreateCheckoutSessionRequest request) {
        if (request.getUserId() == null || request.getPackId() == null || request.getSelectedDuration() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId, packId and selectedDuration are required");
        }
        if (request.getSuccessUrl() == null || request.getSuccessUrl().isBlank() || request.getCancelUrl() == null || request.getCancelUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "successUrl and cancelUrl are required");
        }

        RemoteUserDto user = userServiceClient.findUserById(request.getUserId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + request.getUserId()));

        Pack pack = packRepository.findById(request.getPackId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pack not found: " + request.getPackId()));

        PackOption option = resolveActivePackOption(pack, request.getSelectedDuration());
        if (option.getPrice() == null || option.getPrice() <= 0f) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot process online payment for a free plan");
        }

        String currency = stripeCurrency == null ? "eur" : stripeCurrency.toLowerCase(Locale.ROOT);
        BigDecimal amount = BigDecimal.valueOf(option.getPrice()).setScale(2, RoundingMode.HALF_UP);
        long stripeAmount = amount.multiply(BigDecimal.valueOf(100)).longValue();

        Payment payment = Payment.builder()
            .userId(request.getUserId())
            .pack(pack)
            .selectedDuration(request.getSelectedDuration())
            .amount(amount)
            .currency(currency)
            .status(PaymentStatus.PENDING)
            .build();
        payment = paymentRepository.save(payment);

        try {
            Stripe.apiKey = stripeSecretKey;

            SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(request.getSuccessUrl())
                .setCancelUrl(request.getCancelUrl())
                .setCustomerEmail(user.getEmail())
                .setPaymentIntentData(
                    SessionCreateParams.PaymentIntentData.builder()
                        .putMetadata("paymentId", payment.getId().toString())
                        .putMetadata("userId", request.getUserId().toString())
                        .putMetadata("packId", pack.getId().toString())
                        .putMetadata("selectedDuration", request.getSelectedDuration().name())
                        .build()
                )
                .addLineItem(
                    SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(
                            SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency(currency)
                                .setUnitAmount(stripeAmount)
                                .setProductData(
                                    SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(pack.getName())
                                        .setDescription("Subscription " + request.getSelectedDuration().name())
                                        .build()
                                )
                                .build()
                        )
                        .build()
                )
                .build();

            Session session = Session.create(params);

            return CheckoutSessionResponse.builder()
                .sessionId(session.getId())
                .checkoutUrl(session.getUrl())
                .paymentId(payment.getId())
                .build();
        } catch (StripeException e) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Stripe error while creating checkout session", e);
        }
    }

    @Override
    @Transactional
    public PaymentResponseDto confirmCheckoutSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sessionId is required");
        }

        try {
            Stripe.apiKey = stripeSecretKey;

            Session session = Session.retrieve(sessionId);
            if (session == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Stripe checkout session not found");
            }

            String paymentIntentId = session.getPaymentIntent();
            if (paymentIntentId == null || paymentIntentId.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No payment intent found for checkout session");
            }

            PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);
            if (!"succeeded".equals(intent.getStatus())) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Payment is not completed yet. Current status: " + intent.getStatus());
            }

            Payment payment = markPaymentSuccessAndActivateSubscription(intent);
            return toDto(payment);
        } catch (StripeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Stripe error while confirming checkout session", e);
        }
    }

    @Override
    @Transactional
    public void handleWebhookEvent(String payload, String signatureHeader) {
        if (signatureHeader == null || signatureHeader.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing Stripe-Signature header");
        }

        final Event event;
        try {
            event = Webhook.constructEvent(payload, signatureHeader, stripeWebhookSecret);
        } catch (SignatureVerificationException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Stripe webhook signature", e);
        }

        if ("checkout.session.completed".equals(event.getType())) {
            Session session = event.getDataObjectDeserializer()
                .getObject()
                .filter(Session.class::isInstance)
                .map(Session.class::cast)
                .orElse(null);

            if (session == null) {
                log.warn("Unable to parse checkout.session.completed payload for event {}", event.getId());
                return;
            }

            handleCheckoutSessionCompleted(session);
            return;
        }

        if ("payment_intent.succeeded".equals(event.getType())) {
            PaymentIntent intent = event.getDataObjectDeserializer()
                .getObject()
                .filter(PaymentIntent.class::isInstance)
                .map(PaymentIntent.class::cast)
                .orElse(null);

            if (intent == null) {
                log.warn("Unable to parse payment_intent.succeeded payload for event {}", event.getId());
                return;
            }

            markPaymentSuccessAndActivateSubscription(intent);
            return;
        }

        if ("payment_intent.payment_failed".equals(event.getType())) {
            PaymentIntent intent = event.getDataObjectDeserializer()
                .getObject()
                .filter(PaymentIntent.class::isInstance)
                .map(PaymentIntent.class::cast)
                .orElse(null);

            if (intent == null) {
                log.warn("Unable to parse payment_intent.payment_failed payload for event {}", event.getId());
                return;
            }

            paymentRepository.findByStripePaymentIntentId(intent.getId()).ifPresent(payment -> {
                payment.setStatus(PaymentStatus.FAILED);
                paymentRepository.save(payment);
            });
            log.warn("Stripe payment failed for intent {}", intent.getId());
            return;
        }

        log.info("Stripe webhook event received and ignored: {}", event.getType());
    }

    @Override
    public List<PaymentResponseDto> getAllPayments() {
        return paymentRepository.findAll().stream()
            .sorted(Comparator.comparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(this::toDto)
            .toList();
    }

    private Payment markPaymentSuccessAndActivateSubscription(PaymentIntent intent) {
        Payment payment = paymentRepository.findByStripePaymentIntentId(intent.getId())
            .orElseGet(() -> resolvePaymentFromIntentMetadata(intent));

        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            log.info("Payment {} already marked success, skipping duplicate webhook", payment.getId());
            return payment;
        }

        payment.setStripePaymentIntentId(intent.getId());
        payment.setStatus(PaymentStatus.SUCCESS);
        paymentRepository.save(payment);

        activateUserSubscriptionAfterPayment(payment);
        log.info("Payment {} confirmed and subscription activated", payment.getId());
        return payment;
    }

    private void handleCheckoutSessionCompleted(Session session) {
        String paymentIntentId = session.getPaymentIntent();
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            log.warn("checkout.session.completed {} has no payment_intent", session.getId());
            return;
        }

        try {
            Stripe.apiKey = stripeSecretKey;
            PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);

            if (!"succeeded".equals(intent.getStatus())) {
                log.info("Checkout session {} completed with payment intent {} in status {}", session.getId(), paymentIntentId, intent.getStatus());
                return;
            }

            markPaymentSuccessAndActivateSubscription(intent);
        } catch (StripeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Stripe error while confirming checkout session", e);
        }
    }

    private Payment resolvePaymentFromIntentMetadata(PaymentIntent intent) {
        String paymentIdRaw = intent.getMetadata() != null ? intent.getMetadata().get("paymentId") : null;
        if (paymentIdRaw == null || paymentIdRaw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found for intent: " + intent.getId());
        }

        try {
            Integer paymentId = Integer.valueOf(paymentIdRaw);
            return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found for id: " + paymentId));
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid paymentId metadata in Stripe payment intent", ex);
        }
    }

    private void activateUserSubscriptionAfterPayment(Payment payment) {
        Integer userId = payment.getUserId();
        Pack pack = payment.getPack();
        Dur duration = payment.getSelectedDuration();

        if (userId == null || pack == null || duration == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Payment data is incomplete for subscription activation");
        }

        userServiceClient.getRequiredUser(userId);
        resolveCurrentActiveSubscription(userId).ifPresent(this::expireSubscription);

        PackOption option = resolveActivePackOption(pack, duration);
        LocalDateTime startDate = LocalDateTime.now();

        Subscription subscription = Subscription.builder()
            .userId(userId)
            .pack(pack)
            .startDate(startDate)
            .endDate(computeEndDate(startDate, duration))
            .statuts(StatutsSubscription.ACTIVE)
            .amountPaid(option.getPrice())
            .selectedDuration(duration)
            .paymentMethod(PaymentMethod.ONLINE_PAYMENT)
            .transactionReference(payment.getStripePaymentIntentId())
            .build();

        subscriptionRepository.save(subscription);
    }

    private PackOption resolveActivePackOption(Pack pack, Dur duration) {
        return pack.getOptions().stream()
            .filter(option -> option.getDuration() == duration)
            .filter(option -> Boolean.TRUE.equals(option.getActive()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Selected duration is not available for this pack: " + duration));
    }

    private Optional<Subscription> resolveCurrentActiveSubscription(Integer userId) {
        List<Subscription> activeSubscriptions = subscriptionRepository.findByUserIdAndStatuts(userId, StatutsSubscription.ACTIVE);

        activeSubscriptions.stream()
            .filter(subscription -> !isStillActive(subscription))
            .forEach(this::expireSubscription);

        return activeSubscriptions.stream()
            .filter(this::isStillActive)
            .sorted(Comparator.comparing(Subscription::getEndDate, Comparator.nullsLast(Comparator.reverseOrder())))
            .findFirst();
    }

    private boolean isStillActive(Subscription subscription) {
        if (subscription == null || subscription.getStatuts() != StatutsSubscription.ACTIVE) {
            return false;
        }
        if (subscription.getEndDate() == null) {
            return true;
        }
        return subscription.getEndDate().isAfter(LocalDateTime.now());
    }

    private void expireSubscription(Subscription subscription) {
        subscription.setStatuts(StatutsSubscription.INACTIVE);
        if (subscription.getEndDate() == null || subscription.getEndDate().isAfter(LocalDateTime.now())) {
            subscription.setEndDate(LocalDateTime.now());
        }
        subscriptionRepository.save(subscription);
    }

    private LocalDateTime computeEndDate(LocalDateTime start, Dur duration) {
        return switch (duration) {
            case ONE_MONTH -> start.plusMonths(1);
            case THREE_MONTHS -> start.plusMonths(3);
            case SIX_MONTHS -> start.plusMonths(6);
            case ONE_YEAR -> start.plusYears(1);
        };
    }

    private PaymentResponseDto toDto(Payment payment) {
        RemoteUserDto user = userServiceClient.findUserById(payment.getUserId()).orElse(null);
        String currency = payment.getCurrency() == null ? "" : payment.getCurrency().toUpperCase(Locale.ROOT);
        return PaymentResponseDto.builder()
            .id(payment.getId())
            .userId(payment.getUserId())
            .userFullName(user != null ? user.getFullName() : "-")
            .userEmail(user != null && user.getEmail() != null ? user.getEmail() : "-")
            .packName(payment.getPack() != null ? payment.getPack().getName() : "-")
            .selectedDuration(payment.getSelectedDuration() != null ? payment.getSelectedDuration().name() : null)
            .amount(payment.getAmount())
            .currency(currency)
            .status(payment.getStatus())
            .stripePaymentIntentId(payment.getStripePaymentIntentId())
            .createdAt(payment.getCreatedAt())
            .build();
    }
}
