package tn.esprit.workify.services.meeting;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.workify.DTO.CreateMeetingDto;
import tn.esprit.workify.DTO.VoteProposalDto;
import tn.esprit.workify.entities.meeting.Meeting;
import tn.esprit.workify.entities.meeting.MeetingProposal;
import tn.esprit.workify.entities.meeting.MeetingStatus;
import tn.esprit.workify.entities.user.Role;
import tn.esprit.workify.entities.user.User;
import tn.esprit.workify.repositories.UserRepository;
import tn.esprit.workify.repositories.meeting.MeetingProposalRepository;
import tn.esprit.workify.repositories.meeting.MeetingRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeetingServiceImplTest {

    @Mock MeetingRepository meetingRepository;
    @Mock MeetingProposalRepository proposalRepository;
    @Mock UserRepository userRepository;
    @Mock MeetingNotificationService meetingNotificationService;

    @InjectMocks MeetingServiceImpl service;

    @Test
    void createMeeting_whenClientCreator_shouldNotifyFreelancer() {
        User creator = User.builder().id(1).role(Role.CLIENT).build();
        when(userRepository.findById(1)).thenReturn(Optional.of(creator));

        CreateMeetingDto dto = new CreateMeetingDto();
        dto.setCreatedBy(1);
        dto.setProjetId(9);
        dto.setTitle("T");
        dto.setDescription("D");
        dto.setDurationMinutes(30);
        dto.setParticipantIds(List.of());
        dto.setProposedDates(List.of(LocalDateTime.now().plusDays(1)));
        dto.setIsOnline(true);
        dto.setMeetingLink("x");

        when(meetingRepository.save(any(Meeting.class))).thenAnswer(inv -> {
            Meeting m = inv.getArgument(0);
            m.setId(100);
            return m;
        });
        when(proposalRepository.save(any(MeetingProposal.class))).thenAnswer(inv -> inv.getArgument(0));

        Meeting m = service.createMeeting(dto);

        assertEquals(MeetingStatus.PROPOSED, m.getStatus());
        verify(meetingNotificationService).notifyFreelancerNewMeetingRequest(any(Meeting.class));
    }

    @Test
    void voteForProposal_shouldConfirmAndNotifyClient_whenFreelancerVotes() {
        User freelancer = User.builder().id(2).role(Role.FREELANCER).build();
        when(userRepository.findById(2)).thenReturn(Optional.of(freelancer));

        User creator = User.builder().id(1).role(Role.CLIENT).build();
        Meeting meeting = Meeting.builder().id(10).createdBy(creator).status(MeetingStatus.PROPOSED).build();

        MeetingProposal proposal = MeetingProposal.builder()
                .id(5)
                .meetingId(10)
                .meeting(meeting)
                .proposedDate(LocalDateTime.now().plusDays(1))
                .votedBy(new ArrayList<>())
                .voteCount(0)
                .build();

        when(proposalRepository.findById(5)).thenReturn(Optional.of(proposal));
        when(proposalRepository.save(any(MeetingProposal.class))).thenAnswer(inv -> inv.getArgument(0));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(inv -> inv.getArgument(0));

        VoteProposalDto dto = new VoteProposalDto();
        dto.setProposalId(5);
        dto.setUserId(2);

        MeetingProposal res = service.voteForProposal(dto);

        assertEquals(1, res.getVoteCount());
        assertEquals(MeetingStatus.CONFIRMED, meeting.getStatus());
        verify(meetingNotificationService).notifyClientMeetingAccepted(any(Meeting.class), eq(freelancer));
    }
}
