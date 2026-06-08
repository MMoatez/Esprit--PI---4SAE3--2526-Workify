package tn.esprit.workify.services.meeting;

import tn.esprit.workify.DTO.CreateMeetingDto;
import tn.esprit.workify.DTO.VoteProposalDto;
import tn.esprit.workify.entities.meeting.Meeting;
import tn.esprit.workify.entities.meeting.MeetingProposal;

import java.time.LocalDateTime;
import java.util.List;

public interface IMeetingService {
    Meeting createMeeting(CreateMeetingDto dto);
    List<Meeting> getMeetingsByProjetId(Integer projetId);
    Meeting getMeetingById(Integer id);
    MeetingProposal proposeDate(Integer meetingId, LocalDateTime proposedDate, Integer userId);
    MeetingProposal voteForProposal(VoteProposalDto dto);
    Meeting confirmMeeting(Integer meetingId, Integer proposalId);
    Meeting completeMeeting(Integer meetingId, String notes, Integer userId);
    Meeting updateMeetingNotes(Integer meetingId, String notes); // ✅ NOUVEAU
    Meeting cancelMeeting(Integer meetingId, String cancellationReason, Integer userId);
    Meeting rejectMeeting(Integer meetingId, String rejectionReason, Integer userId);
    void deleteMeeting(Integer id);
}