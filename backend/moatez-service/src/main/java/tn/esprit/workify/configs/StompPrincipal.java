package tn.esprit.workify.configs;

import java.security.Principal;

/**
 * Principal STOMP minimal : associe un userId (String) à une session STOMP.
 * Utilisé par Spring pour résoudre convertAndSendToUser(userId, ...).
 */
public class StompPrincipal implements Principal {

    private final String name;

    public StompPrincipal(String name) {
        this.name = name;
    }

    @Override
    public String getName() {
        return name;
    }
}
