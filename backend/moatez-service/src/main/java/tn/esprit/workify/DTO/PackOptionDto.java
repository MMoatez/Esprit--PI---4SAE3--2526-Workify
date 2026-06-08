package tn.esprit.workify.DTO;

import lombok.Data;
import tn.esprit.workify.entities.pack.Dur;

@Data
public class PackOptionDto {
    private Dur duration;
    private Float price;
    private Boolean active;
}
