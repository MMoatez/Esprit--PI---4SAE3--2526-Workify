package tn.esprit.workify.services.user;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.workify.DTO.CreateUserDto;
import tn.esprit.workify.entities.user.Role;
import tn.esprit.workify.entities.user.User;
import tn.esprit.workify.repositories.UserRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock UserRepository userRepository;
    @InjectMocks UserServiceImpl service;

    @Test
    void createUser_shouldThrow_whenEmailExists() {
        when(userRepository.existsByEmail("a@b")).thenReturn(true);
        CreateUserDto dto = new CreateUserDto();
        dto.setEmail("a@b");
        dto.setFirstName("A");
        dto.setLastName("B");
        assertThrows(RuntimeException.class, () -> service.createUser(dto));
    }

    @Test
    void createUser_shouldDefaultRoleToFreelancer_whenNull() {
        when(userRepository.existsByEmail("a@b")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateUserDto dto = new CreateUserDto();
        dto.setEmail("a@b");
        dto.setFirstName("A");
        dto.setLastName("B");

        User u = service.createUser(dto);
        assertEquals(Role.FREELANCER, u.getRole());
    }

    @Test
    void getUserByEmail_shouldThrow_whenMissing() {
        when(userRepository.findByEmail("x")).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> service.getUserByEmail("x"));
    }
}
