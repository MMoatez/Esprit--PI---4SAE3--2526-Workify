package com.workify.projectservice.weeb;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class projectc {

    @GetMapping("/projects/test")
    public String test() {
        return "Project-service is working!";
    }
}
