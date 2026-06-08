package tn.esprit.workify.DTO;


import lombok.Data;
import tn.esprit.workify.entities.pack.Dur;
import tn.esprit.workify.entities.pack.UserType;

import java.util.List;

@Data
public class CreatePackDto {
    private String name;
    private String description;
    // Legacy field kept for backward compatibility with older service/tests.
    private Float price;
    // Legacy field kept for backward compatibility with older service/tests.
    private Dur duration;
    private UserType userType;
    private List<String> features;
    private List<PackOptionDto> options;
}
