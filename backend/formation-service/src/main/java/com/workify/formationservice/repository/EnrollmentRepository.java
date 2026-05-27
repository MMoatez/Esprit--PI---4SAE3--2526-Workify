package com.workify.formationservice.repository;

import com.workify.formationservice.domain.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    List<Enrollment> findByUserId(String userId);

    Optional<Enrollment> findByUserIdAndFormationId(String userId, Long formationId);

    Optional<Enrollment> findByFormationIdAndUserId(Long formationId, String userId);
}
