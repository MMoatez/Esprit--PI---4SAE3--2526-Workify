package com.workify.projectservice.weeb;

import com.workify.projectservice.domains.Project;
import com.workify.projectservice.domains.ProjectComplexity;
import com.workify.projectservice.service.EstimationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/estimation")
@RequiredArgsConstructor
public class EstimationController {

    private final EstimationService estimationService;

    @PostMapping("/duration")
    public Integer estimateDuration(@RequestBody Project project) {
        return estimationService.estimateDuration(project);
    }

    @PostMapping("/complexity")
    public ProjectComplexity estimateComplexity(@RequestBody Project project) {
        return estimationService.estimateComplexity(project);
    }
}
