package tn.esprit.workify.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.esprit.workify.entities.subscription.StatutsSubscription;
import tn.esprit.workify.entities.subscription.Subscription;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Integer> {

    boolean existsByUserId(Integer userId);

    List<Subscription> findByUserId(Integer userId);

    List<Subscription> findByUserIdAndStatuts(Integer userId, StatutsSubscription statuts);

    List<Subscription> findByPackId(Integer packId);

    List<Subscription> findByStatuts(StatutsSubscription statuts);

    boolean existsByUserIdAndPackIdAndStatuts(Integer userId, Integer packId, StatutsSubscription statuts);

    Optional<Subscription> findTopByUserIdAndStatutsOrderByEndDateDesc(Integer userId, StatutsSubscription statuts);

    List<Subscription> findByEndDateBeforeAndStatuts(LocalDateTime date, StatutsSubscription statuts);

        @Query("""
            SELECT s FROM Subscription s
            WHERE (:fromDate IS NULL OR s.createdAt >= :fromDate)
              AND (:toDateExclusive IS NULL OR s.createdAt < :toDateExclusive)
            ORDER BY s.createdAt DESC
            """)
        List<Subscription> findForExport(
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDateExclusive") LocalDateTime toDateExclusive
        );
}
