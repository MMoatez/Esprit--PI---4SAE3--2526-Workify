package tn.esprit.workify.services.subscription;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import tn.esprit.workify.DTO.CreateSubscriptionDto;
import tn.esprit.workify.DTO.payment.ReceiptDecisionResult;
import tn.esprit.workify.DTO.payment.ReceiptDecisionStatus;
import tn.esprit.workify.DTO.SubscriptionResponseDto;
import tn.esprit.workify.clients.user.RemoteUserDto;
import tn.esprit.workify.clients.user.UserServiceClient;
import tn.esprit.workify.entities.pack.Dur;
import tn.esprit.workify.entities.pack.Pack;
import tn.esprit.workify.entities.pack.PackOption;
import tn.esprit.workify.entities.pack.UserType;
import tn.esprit.workify.entities.subscription.AiValidationStatus;
import tn.esprit.workify.entities.subscription.PaymentMethod;
import tn.esprit.workify.entities.subscription.StatutsSubscription;
import tn.esprit.workify.entities.subscription.Subscription;
import tn.esprit.workify.repositories.PackRepository;
import tn.esprit.workify.repositories.SubscriptionRepository;
import tn.esprit.workify.services.payment.ai.ReceiptVerificationService;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionServiceImpl implements ISubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final PackRepository packRepository;
    private final UserServiceClient userServiceClient;
    private final ReceiptVerificationService receiptVerificationService;

    @Value("${file.upload.dir:uploads/projects}")
    private String uploadDir;

    @Value("${ai.receipt.expected-bank-name:BIAT}")
    private String expectedBankName;

    @Override
    @Transactional
    public SubscriptionResponseDto subscribe(CreateSubscriptionDto dto) {
        userServiceClient.findUserById(dto.getUserId())
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Utilisateur introuvable (id=" + dto.getUserId() + "). Reconnectez-vous ou vérifiez user-service."));

        Pack pack = packRepository.findById(dto.getPackId())
                .orElseThrow(() -> new RuntimeException("Pack not found: " + dto.getPackId()));

        Dur selectedDuration = dto.getSelectedDuration() != null ? dto.getSelectedDuration() : Dur.ONE_MONTH;
        PackOption selectedOption = resolveActivePackOption(pack, selectedDuration);
        boolean targetIsFree = isFreePack(pack);

        Integer userId = dto.getUserId();
        Subscription activeSubscription = resolveCurrentActiveSubscription(userId).orElse(null);

        if (activeSubscription != null
            && activeSubscription.getPack() != null
            && activeSubscription.getPack().getId() != null
            && activeSubscription.getPack().getId().equals(pack.getId())) {
            long daysRemaining = computeDaysRemaining(activeSubscription.getEndDate());
            String activePackName = activeSubscription.getPack().getName() != null
                ? activeSubscription.getPack().getName()
                : "current pack";
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "You already have an active subscription to '" + activePackName + "' with " + daysRemaining + " day(s) remaining."
            );
        }

            boolean hasPendingRequestForSamePack = subscriptionRepository
                .existsByUserIdAndPackIdAndStatuts(userId, pack.getId(), StatutsSubscription.PENDING);

            if (hasPendingRequestForSamePack) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You already have a pending request for this pack. Please wait for admin validation or rejection before sending another request."
                );
            }

        // Bank transfer / deposit flows can now be auto-validated by AI.
        boolean isBankTransfer = !targetIsFree && (PaymentMethod.BANK_TRANSFER.equals(dto.getPaymentMethod())
            || PaymentMethod.BANK_DEPOSIT.equals(dto.getPaymentMethod()));

        StatutsSubscription initialStatus = StatutsSubscription.ACTIVE;
        LocalDateTime startDate = LocalDateTime.now();
        LocalDateTime endDate = targetIsFree ? null : computeEndDate(startDate, selectedOption.getDuration());

        AiValidationStatus aiValidationStatus = null;
        Double receiptConfidence = null;
        String extractedMetadata = null;
        String aiRejectionReason = null;
        String rejectionReason = null;
        Boolean adminOverride = Boolean.FALSE;

        if (isBankTransfer) {
            if (!StringUtils.hasText(dto.getReceiptPath())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "receiptPath is required for BANK_TRANSFER/BANK_DEPOSIT");
            }

            BigDecimal expectedAmount = selectedOption.getPrice() == null
                    ? BigDecimal.ZERO
                    : BigDecimal.valueOf(selectedOption.getPrice());

            ReceiptDecisionResult decision;
            try {
                Path receiptAbsolutePath = resolveReceiptAbsolutePath(dto.getReceiptPath());
                decision = receiptVerificationService.verifyReceiptPath(
                        receiptAbsolutePath,
                        receiptAbsolutePath.getFileName().toString(),
                        expectedAmount,
                        expectedBankName
                );
            } catch (Exception ex) {
                log.error("AI receipt validation failed for user {} and pack {}", userId, pack.getId(), ex);
                decision = ReceiptDecisionResult.pendingFallback("AI service unavailable. Sent to admin validation.");
            }

            receiptConfidence = decision.getConfidence();
            extractedMetadata = decision.getExtractedMetadataJson();

            if (decision.getDecision() == ReceiptDecisionStatus.APPROVED) {
                initialStatus = StatutsSubscription.ACTIVE;
                aiValidationStatus = AiValidationStatus.APPROVED;
                startDate = LocalDateTime.now();
                endDate = computeEndDate(startDate, selectedOption.getDuration());
            } else if (decision.getDecision() == ReceiptDecisionStatus.PENDING_ADMIN_VALIDATION) {
                initialStatus = StatutsSubscription.PENDING;
                aiValidationStatus = AiValidationStatus.PENDING_ADMIN_VALIDATION;
                startDate = PLACEHOLDER;
                endDate = PLACEHOLDER;
            } else {
                initialStatus = StatutsSubscription.REJECTED;
                aiValidationStatus = AiValidationStatus.REJECTED;
                aiRejectionReason = decision.getMessage();
                rejectionReason = decision.getMessage();
                startDate = PLACEHOLDER;
                endDate = PLACEHOLDER;
            }
        }

        Subscription subscription = Subscription.builder()
            .userId(userId)
                .pack(pack)
                .startDate(startDate)
                .endDate(endDate)
                .statuts(initialStatus)
                .amountPaid(selectedOption.getPrice())
                .selectedDuration(selectedOption.getDuration())
                .paymentMethod(targetIsFree ? PaymentMethod.ONLINE_PAYMENT : dto.getPaymentMethod())
                .transactionReference(dto.getTransactionReference())
                .receiptPath(dto.getReceiptPath())
                .receiptConfidence(receiptConfidence)
                .aiValidationStatus(aiValidationStatus)
                .extractedMetadata(extractedMetadata)
                .aiRejectionReason(aiRejectionReason)
                .rejectionReason(rejectionReason)
                .adminOverride(adminOverride)
                .build();

        if (initialStatus == StatutsSubscription.ACTIVE && activeSubscription != null) {
            expireSubscription(activeSubscription);
        }

        return toDto(subscriptionRepository.save(subscription));
    }

    @Override
    public List<SubscriptionResponseDto> getAllSubscriptions() {
        return subscriptionRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SubscriptionResponseDto> getSubscriptionsByUser(Integer userId) {
        return subscriptionRepository.findByUserId(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public SubscriptionResponseDto getActiveSubscription(Integer userId) {
        Optional<Subscription> activeSubscription = resolveCurrentActiveSubscription(userId);
        if (activeSubscription.isPresent()) {
            return toDto(activeSubscription.get());
        }

        RemoteUserDto user = userServiceClient.findUserById(userId).orElse(null);
        if (user == null) {
            return null;
        }

        return ensureFreeSubscription(user)
                .map(this::toDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public SubscriptionResponseDto cancelSubscription(Integer id) {
        Subscription sub = findById(id);
        sub.setStatuts(StatutsSubscription.INACTIVE);
        return toDto(subscriptionRepository.save(sub));
    }

    @Override
    @Transactional
    public SubscriptionResponseDto approveSubscription(Integer id) {
        Subscription sub = findById(id);
        boolean targetIsFree = isFreePack(sub.getPack());

        resolveCurrentActiveSubscription(sub.getUserId())
            .ifPresent(this::expireSubscription);

        LocalDateTime start = LocalDateTime.now();
        sub.setStartDate(start);
        sub.setEndDate(targetIsFree ? null : computeEndDate(start, sub.getSelectedDuration()));
        sub.setStatuts(StatutsSubscription.ACTIVE);
        sub.setAiValidationStatus(AiValidationStatus.APPROVED);
        sub.setAdminOverride(Boolean.TRUE);
        return toDto(subscriptionRepository.save(sub));
    }

    @Override
    @Transactional
    public SubscriptionResponseDto rejectSubscription(Integer id, String reason) {
        Subscription sub = findById(id);
        sub.setStatuts(StatutsSubscription.REJECTED);
        sub.setRejectionReason(reason);
        sub.setAiValidationStatus(AiValidationStatus.REJECTED);
        sub.setAiRejectionReason(reason);
        sub.setAdminOverride(Boolean.TRUE);
        return toDto(subscriptionRepository.save(sub));
    }

    @Override
    @Transactional
    public SubscriptionResponseDto overrideAiDecision(Integer id, boolean approve, String reason) {
        return approve ? approveSubscription(id) : rejectSubscription(id, reason);
    }

    @Override
    public byte[] exportSubscriptions(LocalDate fromDate, LocalDate toDate) {
        LocalDateTime fromDateTime = fromDate != null ? fromDate.atStartOfDay() : null;
        LocalDateTime toDateExclusive = toDate != null ? toDate.plusDays(1).atStartOfDay() : null;

        List<Subscription> subscriptions = subscriptionRepository.findForExport(fromDateTime, toDateExclusive);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Subscriptions");
            createHeader(sheet);

            int rowIndex = 1;
            for (Subscription sub : subscriptions) {
                Row row = sheet.createRow(rowIndex++);
                writeRow(row, sub);
            }

            for (int i = 0; i < 13; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate subscription export.", e);
        }
    }

    // --- helpers ---

    private Subscription findById(Integer id) {
        return subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subscription not found: " + id));
    }

    private PackOption resolveActivePackOption(Pack pack, Dur duration) {
        return pack.getOptions().stream()
                .filter(option -> option.getDuration() == duration)
                .filter(option -> Boolean.TRUE.equals(option.getActive()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Selected duration is not available for this pack: " + duration));
    }

    private LocalDateTime computeEndDate(LocalDateTime start, Dur duration) {
        if (start == null || duration == null) return null;
        return switch (duration) {
            case ONE_MONTH    -> start.plusMonths(1);
            case THREE_MONTHS -> start.plusMonths(3);
            case SIX_MONTHS   -> start.plusMonths(6);
            case ONE_YEAR     -> start.plusYears(1);
        };
    }

    private Path resolveReceiptAbsolutePath(String receiptPath) {
        Path path = Paths.get(receiptPath);
        if (path.isAbsolute()) {
            return path;
        }

        Path uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (receiptPath.startsWith(uploadDir)) {
            return Paths.get(receiptPath).toAbsolutePath().normalize();
        }

        return uploadRoot.resolve(path).normalize();
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

    private long computeDaysRemaining(LocalDateTime endDate) {
        if (endDate == null) {
            return 0;
        }
        long days = ChronoUnit.DAYS.between(LocalDate.now(), endDate.toLocalDate());
        return Math.max(days, 0);
    }

    private void expireSubscription(Subscription subscription) {
        subscription.setStatuts(StatutsSubscription.INACTIVE);
        if (subscription.getEndDate() == null || subscription.getEndDate().isAfter(LocalDateTime.now())) {
            subscription.setEndDate(LocalDateTime.now());
        }
        subscriptionRepository.save(subscription);
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

    private Optional<Subscription> ensureFreeSubscription(RemoteUserDto user) {
        Pack freePack = packRepository.findAll().stream()
                .filter(pack -> Boolean.TRUE.equals(pack.getActive()))
                .filter(pack -> isFreePack(pack))
                .filter(pack -> isPackVisibleForRole(pack.getUserType(), user.getRole()))
                .findFirst()
                .orElse(null);

        if (freePack == null) {
            return Optional.empty();
        }

        PackOption freeOption = freePack.getOptions().stream()
                .filter(option -> Boolean.TRUE.equals(option.getActive()))
                .min(Comparator.comparing(option -> option.getPrice() == null ? Float.MAX_VALUE : option.getPrice()))
                .orElse(null);

        if (freeOption == null) {
            return Optional.empty();
        }

        LocalDateTime now = LocalDateTime.now();
        Subscription freeSubscription = Subscription.builder()
            .userId(user.getIdAsInteger())
                .pack(freePack)
                .startDate(now)
                .endDate(null)
                .statuts(StatutsSubscription.ACTIVE)
                .amountPaid(freeOption.getPrice() != null ? freeOption.getPrice() : 0f)
                .selectedDuration(freeOption.getDuration())
                .paymentMethod(PaymentMethod.ONLINE_PAYMENT)
                .build();

        return Optional.of(subscriptionRepository.save(freeSubscription));
    }

    private boolean isFreePack(Pack pack) {
        if (pack == null || pack.getName() == null) {
            return false;
        }
        String name = pack.getName().toLowerCase();
        return name.contains("free") || name.contains("starter") || name.contains("basic");
    }

    private boolean isPackVisibleForRole(UserType userType, String role) {
        if (userType == null || role == null) {
            return false;
        }
        String normalizedRole = role.toUpperCase();
        return switch (normalizedRole) {
            case "FREELANCER" -> userType == UserType.FREELANCER || userType == UserType.FREELANCER_CLIENT;
            case "CLIENT" -> userType == UserType.CLIENT || userType == UserType.FREELANCER_CLIENT;
            case "PARTNER" -> userType == UserType.PARTNER || userType == UserType.FREELANCER_CLIENT;
            default -> true;
        };
    }

    private static final LocalDateTime PLACEHOLDER = LocalDateTime.of(1970, 1, 1, 0, 0);
    private static final DateTimeFormatter EXPORT_DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private void createHeader(Sheet sheet) {
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("User ID");
        header.createCell(2).setCellValue("User Name");
        header.createCell(3).setCellValue("User Email");
        header.createCell(4).setCellValue("Pack");
        header.createCell(5).setCellValue("Duration");
        header.createCell(6).setCellValue("Status");
        header.createCell(7).setCellValue("Amount Paid");
        header.createCell(8).setCellValue("Payment Method");
        header.createCell(9).setCellValue("Start Date");
        header.createCell(10).setCellValue("End Date");
        header.createCell(11).setCellValue("Created At");
        header.createCell(12).setCellValue("Transaction Reference");
    }

    private void writeRow(Row row, Subscription sub) {
        RemoteUserDto user = userServiceClient.findUserById(sub.getUserId()).orElse(null);
        row.createCell(0).setCellValue(sub.getId() != null ? sub.getId() : 0);
        row.createCell(1).setCellValue(sub.getUserId() != null ? sub.getUserId() : 0);
        row.createCell(2).setCellValue(user != null ? user.getFullName() : "-");
        row.createCell(3).setCellValue(user != null && user.getEmail() != null ? user.getEmail() : "-");
        row.createCell(4).setCellValue(sub.getPack() != null && sub.getPack().getName() != null ? sub.getPack().getName() : "-");
        row.createCell(5).setCellValue(sub.getSelectedDuration() != null ? sub.getSelectedDuration().name() : "-");
        row.createCell(6).setCellValue(sub.getStatuts() != null ? sub.getStatuts().name() : "-");
        row.createCell(7).setCellValue(sub.getAmountPaid() != null ? sub.getAmountPaid() : 0);
        row.createCell(8).setCellValue(sub.getPaymentMethod() != null ? sub.getPaymentMethod().name() : "-");
        row.createCell(9).setCellValue(formatDateTime(sub.getStartDate()));
        row.createCell(10).setCellValue(formatDateTime(sub.getEndDate()));
        row.createCell(11).setCellValue(formatDateTime(sub.getCreatedAt()));
        row.createCell(12).setCellValue(sub.getTransactionReference() != null ? sub.getTransactionReference() : "-");
    }

    private String formatDateTime(LocalDateTime value) {
        return value != null ? value.format(EXPORT_DATE_TIME) : "-";
    }

    private SubscriptionResponseDto toDto(Subscription s) {
        RemoteUserDto user = userServiceClient.findUserById(s.getUserId()).orElse(null);
        // Return null for placeholder dates so frontend shows "Pending approval"
        LocalDateTime start = PLACEHOLDER.equals(s.getStartDate()) ? null : s.getStartDate();
        LocalDateTime end   = PLACEHOLDER.equals(s.getEndDate())   ? null : s.getEndDate();

        return SubscriptionResponseDto.builder()
                .id(s.getId())
            .userId(s.getUserId())
            .userFullName(user != null ? user.getFullName() : "-")
            .userEmail(user != null && user.getEmail() != null ? user.getEmail() : "-")
                .packId(s.getPack().getId())
                .packName(s.getPack().getName())
                .packPrice(s.getAmountPaid())
                .packDuration(s.getSelectedDuration() != null ? s.getSelectedDuration().name() : null)
                .startDate(start)
                .endDate(end)
                .statuts(s.getStatuts())
                .amountPaid(s.getAmountPaid())
                .paymentMethod(s.getPaymentMethod())
                .transactionReference(s.getTransactionReference())
                .receiptPath(s.getReceiptPath())
                .rejectionReason(s.getRejectionReason())
                .receiptConfidence(s.getReceiptConfidence())
                .aiValidationStatus(s.getAiValidationStatus())
                .extractedMetadata(s.getExtractedMetadata())
                .aiRejectionReason(s.getAiRejectionReason())
                .adminOverride(s.getAdminOverride())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
