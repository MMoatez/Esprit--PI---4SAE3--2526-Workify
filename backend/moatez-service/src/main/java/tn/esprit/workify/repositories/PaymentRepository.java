package tn.esprit.workify.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.workify.entities.payment.Payment;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {
    Optional<Payment> findByStripePaymentIntentId(String stripePaymentIntentId);
}
