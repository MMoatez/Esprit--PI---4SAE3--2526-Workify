package tn.esprit.workify.services.pack;

import tn.esprit.workify.DTO.CreatePackDto;
import tn.esprit.workify.entities.pack.Pack;
import tn.esprit.workify.entities.pack.UserType;

import java.util.List;

public interface IPackService {
    Pack createPack(CreatePackDto dto);
    List<Pack> getAllPacks();
    Pack getPackById(Integer id);
    List<Pack> getPacksByUserType(UserType userType);
    Pack updatePack(Integer id, CreatePackDto dto);
    void deletePack(Integer id);
}
