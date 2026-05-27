package com.workify.userservice.web.dto;

import lombok.Data;
import java.util.List;

@Data
public class ImportCvRequest {
    private Profile profile;
    private List<WorkExperience> workExperiences;
    private List<EducationItem> educations;
    private Skills skills;

    @Data
    public static class Profile {
        private String name;
        private String summary;
        private String email;
        private String phone;
        private String location;
        private String url;
    }

    @Data
    public static class WorkExperience {
        private String company;
        private String jobTitle;
        private String date;
        private List<String> descriptions;
    }

    @Data
    public static class EducationItem {
        private String school;
        private String degree;
        private String gpa;
        private String date;
        private List<String> descriptions;
    }

    @Data
    public static class Skills {
        private List<FeaturedSkill> featuredSkills;
        private List<String> descriptions;
    }

    @Data
    public static class FeaturedSkill {
        private String skill;
        private int rating;
    }
}
