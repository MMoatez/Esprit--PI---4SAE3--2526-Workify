package tn.esprit.workify.entities;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Colonne {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "id_planning")
    private Integer idPlanning;

    private String name;

    private String color;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_planning", insertable = false, updatable = false)
    @JsonIgnore
    private Planning planning;

    @OneToMany(mappedBy = "colonne", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Tache> taches = new ArrayList<>();
}
