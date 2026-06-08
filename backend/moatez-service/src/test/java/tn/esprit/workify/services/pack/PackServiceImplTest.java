package tn.esprit.workify.services.pack;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.workify.DTO.CreatePackDto;
import tn.esprit.workify.DTO.PackOptionDto;
import tn.esprit.workify.entities.pack.Dur;
import tn.esprit.workify.entities.pack.Pack;
import tn.esprit.workify.entities.pack.UserType;
import tn.esprit.workify.repositories.PackRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PackServiceImplTest {

    @Mock PackRepository packRepository;
    @InjectMocks PackServiceImpl service;

    @Test
    void createPack_shouldMapFeatures() {
        CreatePackDto dto = new CreatePackDto();
        dto.setName("Basic");
        dto.setDescription("d");
        dto.setUserType(UserType.FREELANCER);
        dto.setFeatures(java.util.List.of("F1", "F2"));

        PackOptionDto option = new PackOptionDto();
        option.setDuration(Dur.ONE_MONTH);
        option.setPrice(10.0f);
        option.setActive(true);
        dto.setOptions(java.util.List.of(option));

        when(packRepository.save(any(Pack.class))).thenAnswer(inv -> inv.getArgument(0));

        Pack res = service.createPack(dto);
        assertEquals("Basic", res.getName());
        assertNotNull(res.getFeatures());
        assertEquals(2, res.getFeatures().size());
        assertSame(res, res.getFeatures().get(0).getPack());
        assertNotNull(res.getOptions());
        assertEquals(1, res.getOptions().size());
        assertEquals(Dur.ONE_MONTH, res.getOptions().get(0).getDuration());
    }

    @Test
    void getPackById_shouldThrow_whenMissing() {
        when(packRepository.findById(1)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.getPackById(1));
    }
}
