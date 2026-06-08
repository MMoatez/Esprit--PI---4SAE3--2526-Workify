package tn.esprit.workify.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.workify.DTO.CreateMeetingDto;
import tn.esprit.workify.DTO.VoteProposalDto;
import tn.esprit.workify.entities.meeting.Meeting;
import tn.esprit.workify.entities.meeting.MeetingProposal;
import tn.esprit.workify.services.meeting.IMeetingService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MeetingController {

    private final IMeetingService meetingService;

    @PostMapping
    public ResponseEntity<Meeting> createMeeting(@RequestBody CreateMeetingDto dto) {
        Meeting meeting = meetingService.createMeeting(dto);
        return new ResponseEntity<>(meeting, HttpStatus.CREATED);
    }

    @GetMapping("/projet/{projetId}")
    public ResponseEntity<List<Meeting>> getMeetingsByProject(@PathVariable Integer projetId) {
        List<Meeting> meetings = meetingService.getMeetingsByProjetId(projetId);
        return ResponseEntity.ok(meetings);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Meeting> getMeetingById(@PathVariable Integer id) {
        Meeting meeting = meetingService.getMeetingById(id);
        return ResponseEntity.ok(meeting);
    }

    @PostMapping("/{meetingId}/propose")
    public ResponseEntity<MeetingProposal> proposeDate(
            @PathVariable Integer meetingId,
            @RequestParam LocalDateTime proposedDate,
            @RequestParam Integer userId) {
        MeetingProposal proposal = meetingService.proposeDate(meetingId, proposedDate, userId);
        return ResponseEntity.ok(proposal);
    }

    @PostMapping("/vote")
    public ResponseEntity<MeetingProposal> voteForProposal(@RequestBody VoteProposalDto dto) {
        MeetingProposal proposal = meetingService.voteForProposal(dto);
        return ResponseEntity.ok(proposal);
    }

    // ✅ NOUVEAU : Accepter un meeting (confirmer une date)
    @PutMapping("/{meetingId}/confirm/{proposalId}")
    public ResponseEntity<Meeting> confirmMeeting(
            @PathVariable Integer meetingId,
            @PathVariable Integer proposalId) {

        System.out.println("✅ Confirming meeting " + meetingId + " with proposal " + proposalId);

        Meeting meeting = meetingService.confirmMeeting(meetingId, proposalId);
        return ResponseEntity.ok(meeting);
    }

    @PutMapping("/{meetingId}/complete")
    public ResponseEntity<Meeting> completeMeeting(
            @PathVariable Integer meetingId,
            @RequestBody Map<String, String> body) {

        String notes = body.get("notes");
        Integer userId = Integer.parseInt(body.get("userId"));  // ✅ AJOUTEZ

        System.out.println("✅ Completing meeting " + meetingId + " by user " + userId);

        Meeting meeting = meetingService.completeMeeting(meetingId, notes, userId);
        return ResponseEntity.ok(meeting);
    }

    // ✅ NOUVEAU : Mettre à jour les notes d'un meeting
    @PutMapping("/{meetingId}/notes")
    public ResponseEntity<Meeting> updateMeetingNotes(
            @PathVariable Integer meetingId,
            @RequestBody Map<String, String> body) {
        String notes = body.get("notes");
        Meeting meeting = meetingService.updateMeetingNotes(meetingId, notes);
        return ResponseEntity.ok(meeting);
    }

    @PutMapping("/{meetingId}/cancel")
    public ResponseEntity<Meeting> cancelMeeting(
            @PathVariable Integer meetingId,
            @RequestBody Map<String, String> body) {

        String reason = body.getOrDefault("reason", "No reason provided");
        Integer userId = Integer.parseInt(body.get("userId"));  // ✅ AJOUTEZ

        System.out.println("✅ Cancelling meeting " + meetingId + " by user " + userId);

        Meeting meeting = meetingService.cancelMeeting(meetingId, reason, userId);
        return ResponseEntity.ok(meeting);
    }

    @PutMapping("/{meetingId}/reject")
    public ResponseEntity<Meeting> rejectMeeting(
            @PathVariable Integer meetingId,
            @RequestBody Map<String, String> body) {

        String reason = body.getOrDefault("reason", "No reason provided");
        Integer userId = Integer.parseInt(body.get("userId"));  // ✅ AJOUTEZ

        System.out.println("✅ Rejecting meeting " + meetingId + " by user " + userId);

        Meeting meeting = meetingService.rejectMeeting(meetingId, reason, userId);
        return ResponseEntity.ok(meeting);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMeeting(@PathVariable Integer id) {
        meetingService.deleteMeeting(id);
        return ResponseEntity.noContent().build();
    }
}