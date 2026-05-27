package com.workify.feedbackservice.repositories;

import com.workify.feedbackservice.domains.Feedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    Optional<Feedback> findByOfferIdAndDeletedFalse(Long offerId);

    boolean existsByOfferIdAndDeletedFalse(Long offerId);

    /** Feedbacks publics d'un freelancer (non supprimés, non frauduleux) */
    @Query("SELECT f FROM Feedback f WHERE f.freelancerId = :freelancerId " +
           "AND f.deleted = false AND (f.fraudScore IS NULL OR f.fraudScore < 0.7)")
    Page<Feedback> findPublicByFreelancerId(Long freelancerId, Pageable pageable);

    /** Filtré par note */
    @Query("SELECT f FROM Feedback f WHERE f.freelancerId = :freelancerId " +
           "AND f.deleted = false AND (f.fraudScore IS NULL OR f.fraudScore < 0.7) " +
           "AND f.ratingGlobal = :rating")
    Page<Feedback> findPublicByFreelancerIdAndRating(Long freelancerId, int rating, Pageable pageable);

    /** Tous les feedbacks non supprimés (batch ré-analyse AI) */
    List<Feedback> findByDeletedFalse();

    /** Feedbacks signalés (pour admin) */
    List<Feedback> findByDeletedFalseAndFraudScoreGreaterThanEqual(float score);

    /** Feedbacks sans analyse AI complète (batch rétroactif) */
    List<Feedback> findByDeletedFalseAndAiSentimentIsNull();

    /** Feedbacks où le ton n'a pas encore été analysé */
    List<Feedback> findByDeletedFalseAndAiToneIsNull();

    /** Compte des feedbacks d'un client (anti-fraude) */
    long countByClientEmail(String clientEmail);

    /** Texte identique (anti-fraude doublon) */
    boolean existsByCommentAndDeletedFalse(String comment);

    /** Stats pour note moyenne freelancer */
    @Query("SELECT AVG(f.ratingGlobal) FROM Feedback f WHERE f.freelancerId = :freelancerId AND f.deleted = false")
    Double avgRatingByFreelancerId(Long freelancerId);

    @Query("SELECT COUNT(f) FROM Feedback f WHERE f.freelancerId = :freelancerId AND f.deleted = false AND f.recommend = true")
    long countRecommendationsByFreelancerId(Long freelancerId);

    @Query("SELECT COUNT(f) FROM Feedback f WHERE f.freelancerId = :freelancerId AND f.deleted = false")
    long countByFreelancerId(Long freelancerId);

    /** Monthly avg rating + count for a freelancer (analytics chart). */
    @Query("SELECT FUNCTION('YEAR', f.createdAt), FUNCTION('MONTH', f.createdAt), " +
           "AVG(f.ratingGlobal), COUNT(f) FROM Feedback f " +
           "WHERE f.freelancerId = :id AND f.deleted = false " +
           "GROUP BY FUNCTION('YEAR', f.createdAt), FUNCTION('MONTH', f.createdAt) " +
           "ORDER BY FUNCTION('YEAR', f.createdAt), FUNCTION('MONTH', f.createdAt)")
    List<Object[]> findMonthlyRatingByFreelancer(@Param("id") Long id);

    /** Platform-wide market average rating (excluding fraud). */
    @Query("SELECT AVG(f.ratingGlobal) FROM Feedback f WHERE f.deleted = false AND (f.fraudScore IS NULL OR f.fraudScore < 0.7)")
    Double findMarketAvgRating();

    /** Count all freelancers with at least one feedback (for percentile). */
    @Query("SELECT COUNT(DISTINCT f.freelancerId) FROM Feedback f WHERE f.deleted = false")
    long countDistinctFreelancers();

    /** Count freelancers whose avg rating is below a given value (for percentile). */
    @Query("SELECT COUNT(DISTINCT f.freelancerId) FROM Feedback f WHERE f.deleted = false " +
           "GROUP BY f.freelancerId HAVING AVG(f.ratingGlobal) < :rating")
    List<Long> countFreelancersBelowRating(@Param("rating") double rating);
}
