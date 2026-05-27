package com.workify.formationservice.repository;

import com.workify.formationservice.domain.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByFormationIdOrderByCreatedAtDesc(Long formationId);
    
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.formation.id = :formationId")
    Double getAverageRatingByFormationId(Long formationId);

    boolean existsByFormationIdAndUserId(Long formationId, String userId);
}
