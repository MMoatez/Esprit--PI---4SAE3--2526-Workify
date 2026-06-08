package tn.esprit.workify.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class Tache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String task;

    @Column(name = "id_colonne")
    private Integer idColonne;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_colonne", insertable = false, updatable = false)
    @JsonIgnore
    private Colonne colonne;

}
