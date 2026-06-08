package tn.esprit.workify;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Test minimal pour valider que l'application démarre et que le contexte Spring se charge.
 *
 * On active le profil "test" afin d'éviter toute dépendance à des services externes (ex: MySQL).
 */
@SpringBootTest
@ActiveProfiles("test")
class WorkifyApplicationTests {

    @Test
    void contextLoads() {
        // Vérifie que le contexte Spring démarre correctement
    }
}
