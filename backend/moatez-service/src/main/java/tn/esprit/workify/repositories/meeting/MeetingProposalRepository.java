package tn.esprit.workify.repositories.meeting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.workify.entities.meeting.MeetingProposal;

import java.util.List;

@Repository
public interface MeetingProposalRepository extends JpaRepository<MeetingProposal, Integer> {
    List<MeetingProposal> findByMeetingId(Integer meetingId);
}