package tn.esprit.workify.services.meeting;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.workify.DTO.CreateMeetingDto;
import tn.esprit.workify.DTO.VoteProposalDto;
import tn.esprit.workify.clients.project.ProjectServiceClient;
import tn.esprit.workify.clients.user.RemoteUserDto;
import tn.esprit.workify.clients.user.UserServiceClient;
import tn.esprit.workify.entities.meeting.Meeting;
import tn.esprit.workify.entities.meeting.MeetingProposal;
import tn.esprit.workify.entities.meeting.MeetingStatus;
import tn.esprit.workify.repositories.meeting.MeetingProposalRepository;
import tn.esprit.workify.repositories.meeting.MeetingRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class MeetingServiceImpl implements IMeetingService {

    private final MeetingRepository meetingRepository;
    private final MeetingProposalRepository proposalRepository;
    private final UserServiceClient userServiceClient;
    private final ProjectServiceClient projectServiceClient;
    private final MeetingNotificationService meetingNotificationService;

    @Override
    @Transactional
    public Meeting createMeeting(CreateMeetingDto dto) {
        projectServiceClient.getRequiredProject(dto.getProjetId());

        RemoteUserDto createdBy = userServiceClient.findUserById(dto.getCreatedBy()).orElse(null);

        List<Integer> participants = new ArrayList<>();
        if (dto.getParticipantIds() != null && !dto.getParticipantIds().isEmpty()) {
            participants = dto.getParticipantIds().stream()
                    .filter(id -> id != null)
                    .distinct()
                    .toList();

            for (Integer participantId : participants) {
                userServiceClient.findUserById(participantId);
            }
        }

        Meeting meeting = Meeting.builder()
                .projetId(dto.getProjetId())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .durationMinutes(dto.getDurationMinutes())
                .status(MeetingStatus.PROPOSED)
                .createdByUserId(dto.getCreatedBy())
                .participantIds(participants)
                .proposals(new ArrayList<>())
                .isOnline(dto.getIsOnline())
                .meetingLink(dto.getMeetingLink())
                .build();

        Meeting savedMeeting = meetingRepository.save(meeting);

        for (LocalDateTime proposedDate : dto.getProposedDates()) {
            MeetingProposal proposal = MeetingProposal.builder()
                    .meetingId(savedMeeting.getId())
                    .proposedDate(proposedDate)
                    .proposedByUserId(dto.getCreatedBy())
                    .voteCount(0)
                    .votedByUserIds(new ArrayList<>())
                    .build();

            MeetingProposal savedProposal = proposalRepository.save(proposal);
            savedMeeting.getProposals().add(savedProposal);
        }

        if (createdBy != null && createdBy.hasRole("CLIENT")) {
            meetingNotificationService.notifyFreelancerNewMeetingRequest(savedMeeting, createdBy);
        }
        else if (createdBy != null && createdBy.hasRole("FREELANCER")) {
            meetingNotificationService.notifyClientNewMeetingRequest(savedMeeting, createdBy);
        }

        return savedMeeting;
    }

    @Override
    public List<Meeting> getMeetingsByProjetId(Integer projetId) {
        return meetingRepository.findByProjetId(projetId);
    }

    @Override
    public Meeting getMeetingById(Integer id) {
        return meetingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));
    }

    @Override
    @Transactional
    public MeetingProposal proposeDate(Integer meetingId, LocalDateTime proposedDate, Integer userId) {
        Meeting meeting = getMeetingById(meetingId);
        userServiceClient.getRequiredUser(userId);

        MeetingProposal proposal = MeetingProposal.builder()
                .meetingId(meetingId)
                .proposedDate(proposedDate)
            .proposedByUserId(userId)
                .voteCount(0)
                .meeting(meeting)
                .build();

        return proposalRepository.save(proposal);
    }

    @Override
    @Transactional
    public MeetingProposal voteForProposal(VoteProposalDto dto) {
        MeetingProposal proposal = proposalRepository.findById(dto.getProposalId())
                .orElseThrow(() -> new RuntimeException("Proposal not found"));

        RemoteUserDto voter = userServiceClient.findUserById(dto.getUserId()).orElse(null);

        Meeting meeting = proposal.getMeeting();
        if (meeting == null) {
            meeting = getMeetingById(proposal.getMeetingId());
        }

        boolean alreadyVoted = proposal.getVotedByUserIds().stream()
                .anyMatch(votedUserId -> votedUserId.equals(dto.getUserId()));

        if (alreadyVoted) {
            throw new RuntimeException("You have already voted for this date");
        }

        if (meeting.getCreatedByUserId().equals(dto.getUserId())) {
            throw new RuntimeException("You cannot vote on your own meeting proposal");
        }

        proposal.getVotedByUserIds().add(dto.getUserId());
        proposal.setVoteCount(proposal.getVotedByUserIds().size());

        MeetingProposal savedProposal = proposalRepository.save(proposal);

        if (savedProposal.getVoteCount() >= 1) {
            meeting.setMeetingDate(proposal.getProposedDate());
            meeting.setStatus(MeetingStatus.CONFIRMED);
            Meeting savedMeeting = meetingRepository.save(meeting);

            if (voter != null && voter.hasRole("FREELANCER")) {
                meetingNotificationService.notifyClientMeetingAccepted(savedMeeting, voter);
            }
            else if (voter != null && voter.hasRole("CLIENT")) {
                meetingNotificationService.notifyFreelancerMeetingConfirmedByClient(savedMeeting, voter);
            }
        }

        return savedProposal;
    }

    @Override
    @Transactional
    public Meeting confirmMeeting(Integer meetingId, Integer proposalId) {
        Meeting meeting = getMeetingById(meetingId);
        MeetingProposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new RuntimeException("Proposal not found"));

        meeting.setMeetingDate(proposal.getProposedDate());
        meeting.setStatus(MeetingStatus.CONFIRMED);

        Meeting saved = meetingRepository.save(meeting);
        return saved;
    }

    @Override
    @Transactional
    public Meeting completeMeeting(Integer meetingId, String notes, Integer userId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        userServiceClient.findUserById(userId);

        meeting.setStatus(MeetingStatus.COMPLETED);
        meeting.setMeetingNotes(notes);
        meeting.setCompletedAt(LocalDateTime.now());
        meeting.setCompletedByUserId(userId);

        return meetingRepository.save(meeting);
    }

    @Override
    public Meeting updateMeetingNotes(Integer meetingId, String notes) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        meeting.setMeetingNotes(notes);

        return meetingRepository.save(meeting);
    }

    @Override
    @Transactional
    public Meeting cancelMeeting(Integer meetingId, String cancellationReason, Integer userId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        userServiceClient.findUserById(userId);

        meeting.setStatus(MeetingStatus.CANCELLED);
        meeting.setCancellationReason(cancellationReason);
        meeting.setCancelledByUserId(userId);

        return meetingRepository.save(meeting);
    }

    @Override
    @Transactional
    public Meeting rejectMeeting(Integer meetingId, String rejectionReason, Integer userId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        RemoteUserDto user = userServiceClient.findUserById(userId).orElse(null);

        meeting.setStatus(MeetingStatus.REJECTED);
        meeting.setRejectionReason(rejectionReason);
        meeting.setRejectedByUserId(userId);

        Meeting saved = meetingRepository.save(meeting);

        if (user != null && user.hasRole("FREELANCER")) {
            meetingNotificationService.notifyClientMeetingRejected(saved, user);
        }

        return saved;
    }

    @Override
    @Transactional
    public void deleteMeeting(Integer id) {
        meetingRepository.deleteById(id);
    }
}


