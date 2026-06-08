package tn.esprit.workify.services.ai;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AiServiceTest {

    @Test
    void extractTasksFromDescription_shouldReturnEmpty_whenBlank() {
        AiService service = new AiService();
        assertEquals(List.of(), service.extractTasksFromDescription("  "));
        assertEquals(List.of(), service.extractTasksFromDescription(null));
    }

    @Test
    void extractTasksFromDescription_shouldFallbackToKeywords_whenNoApiKey() {
        AiService service = new AiService();
        // geminiApiKey est vide par défaut → fallback keywords
        List<String> tasks = service.extractTasksFromDescription("Ceci est un système de notification avec interface utilisateur");
        assertFalse(tasks.isEmpty());
    }
}
