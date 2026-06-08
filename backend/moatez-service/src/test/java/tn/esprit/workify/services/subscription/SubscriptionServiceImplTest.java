package tn.esprit.workify.services.subscription;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tn.esprit.workify.DTO.CreateSubscriptionDto;
import tn.esprit.workify.DTO.SubscriptionResponseDto;
import tn.esprit.workify.DTO.payment.ReceiptDecisionResult;
import tn.esprit.workify.entities.pack.Dur;
import tn.esprit.workify.entities.pack.Pack;
import tn.esprit.workify.entities.pack.PackOption;
import tn.esprit.workify.entities.subscription.PaymentMethod;
import tn.esprit.workify.entities.subscription.StatutsSubscription;
import tn.esprit.workify.entities.subscription.Subscription;
import tn.esprit.workify.entities.user.User;
import tn.esprit.workify.repositories.PackRepository;
import tn.esprit.workify.repositories.SubscriptionRepository;
import tn.esprit.workify.repositories.UserRepository;
import tn.esprit.workify.services.payment.ai.ReceiptVerificationService;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceImplTest {

    @Mock SubscriptionRepository subscriptionRepository;
    @Mock PackRepository packRepository;
    @Mock UserRepository userRepository;
    @Mock ReceiptVerificationService receiptVerificationService;

    @InjectMocks SubscriptionServiceImpl service;

    @Test
    void subscribe_bankTransfer_shouldCreatePendingWithNullDatesInDto() {
        ReflectionTestUtils.setField(service, "uploadDir", "uploads/projects");
        ReflectionTestUtils.setField(service, "expectedBankName", "BIAT");

        CreateSubscriptionDto dto = new CreateSubscriptionDto();
        dto.setUserId(1);
        dto.setPackId(2);
        dto.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        dto.setTransactionReference("TRX");
        dto.setReceiptPath("/r");

        User u = User.builder().id(1).firstName("A").lastName("B").email("a@b").build();
        Pack p = buildPackWithActiveOption(2, "P", Dur.ONE_MONTH, 99.0f);

        when(userRepository.findById(1)).thenReturn(Optional.of(u));
        when(packRepository.findById(2)).thenReturn(Optional.of(p));
        when(receiptVerificationService.verifyReceiptPath(any(), any(), any(), any()))
            .thenReturn(ReceiptDecisionResult.pendingFallback("fallback"));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> {
            Subscription s = inv.getArgument(0);
            s.setId(10);
            return s;
        });

        SubscriptionResponseDto res = service.subscribe(dto);
        assertEquals(10, res.getId());
        assertEquals(StatutsSubscription.PENDING, res.getStatuts());
        assertNull(res.getStartDate());
        assertNull(res.getEndDate());
    }

    @Test
    void approveSubscription_shouldSetActiveAndDates() {
        Pack p = buildPackWithActiveOption(2, "P", Dur.ONE_MONTH, 1.0f);
        Subscription s = Subscription.builder().id(1).pack(p)
                .user(User.builder().id(1).firstName("A").lastName("B").email("a@b").build())
                .statuts(StatutsSubscription.PENDING)
            .selectedDuration(Dur.ONE_MONTH)
                .build();

        when(subscriptionRepository.findById(1)).thenReturn(Optional.of(s));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        SubscriptionResponseDto res = service.approveSubscription(1);
        assertEquals(StatutsSubscription.ACTIVE, res.getStatuts());
        assertNotNull(res.getStartDate());
        assertNotNull(res.getEndDate());
    }

    private Pack buildPackWithActiveOption(int id, String name, Dur duration, float price) {
        Pack pack = Pack.builder().id(id).name(name).build();
        PackOption option = PackOption.builder()
                .duration(duration)
                .price(price)
                .active(true)
                .pack(pack)
                .build();
        pack.setOptions(java.util.List.of(option));
        return pack;
    }
}
