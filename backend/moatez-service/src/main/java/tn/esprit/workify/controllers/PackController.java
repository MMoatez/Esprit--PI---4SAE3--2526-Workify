package tn.esprit.workify.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.workify.DTO.CreatePackDto;
import tn.esprit.workify.entities.pack.Pack;
import tn.esprit.workify.entities.pack.UserType;
import tn.esprit.workify.services.pack.IPackService;

import java.util.List;

@RestController
@RequestMapping("/api/packs")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class PackController {

    private final IPackService packService;

    @PostMapping
    public ResponseEntity<Pack> createPack(@RequestBody CreatePackDto dto) {
        Pack created = packService.createPack(dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Pack>> getAllPacks() {
        List<Pack> packs = packService.getAllPacks();
        return ResponseEntity.ok(packs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pack> getPackById(@PathVariable Integer id) {
        Pack pack = packService.getPackById(id);
        return ResponseEntity.ok(pack);
    }

    @GetMapping("/user-type/{userType}")
    public ResponseEntity<List<Pack>> getPacksByUserType(@PathVariable UserType userType) {
        List<Pack> packs = packService.getPacksByUserType(userType);
        return ResponseEntity.ok(packs);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Pack> updatePack(
            @PathVariable Integer id,
            @RequestBody CreatePackDto dto) {
        Pack updated = packService.updatePack(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePack(@PathVariable Integer id) {
        packService.deletePack(id);
        return ResponseEntity.noContent().build();
    }
}