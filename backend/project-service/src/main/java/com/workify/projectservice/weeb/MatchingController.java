package com.workify.projectservice.weeb;

import com.workify.projectservice.service.MatchingService;
import com.workify.projectservice.service.MatchingResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
public class MatchingController {

    private final MatchingService matchingService;

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<MatchingResult>> matchFreelancersToProject(@PathVariable Long projectId) {
        List<MatchingResult> results = matchingService.matchFreelancersToProject(projectId);
        return ResponseEntity.ok(results);
    }
}
