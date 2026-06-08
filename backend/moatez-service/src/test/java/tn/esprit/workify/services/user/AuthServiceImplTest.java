package tn.esprit.workify.services.user;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import tn.esprit.workify.DTO.JwtUtil;
import tn.esprit.workify.DTO.LoginRequest;
import tn.esprit.workify.DTO.RegisterRequest;
import tn.esprit.workify.entities.user.Role;
import tn.esprit.workify.entities.user.User;
import tn.esprit.workify.repositories.UserRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock UserRepository userRepository;
    @Mock JwtUtil jwtUtil;

    @InjectMocks AuthServiceImpl service;

    @Test
    void login_shouldThrow_whenPasswordMismatch() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        User u = User.builder()
                .id(1)
                .email("a@b")
                .password(encoder.encode("good"))
                .role(Role.CLIENT)
                .build();
        when(userRepository.findByEmail("a@b")).thenReturn(Optional.of(u));

        LoginRequest req = new LoginRequest();
        req.setEmail("a@b");
        req.setPassword("bad");

        assertThrows(RuntimeException.class, () -> service.login(req));
    }

    @Test
    void register_shouldThrow_whenEmailExists() {
        when(userRepository.existsByEmail("a@b")).thenReturn(true);

        RegisterRequest req = new RegisterRequest();
        req.setEmail("a@b");

        assertThrows(RuntimeException.class, () -> service.register(req));
    }
}
