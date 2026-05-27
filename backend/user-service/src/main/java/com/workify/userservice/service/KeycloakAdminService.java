package com.workify.userservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.ws.rs.core.Response;
import java.util.Collections;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class KeycloakAdminService {

  @Value("${keycloak.auth-server-url}")
  private String serverUrl;

  @Value("${keycloak.realm}")
  private String realm;

  @Value("${keycloak.admin.username:admin}")
  private String adminUsername;

  @Value("${keycloak.admin.password:admin}")
  private String adminPassword;

  @Value("${keycloak.admin.client-id:admin-cli}")
  private String adminClientId;

    public String createUser(String email, String password, String firstName, String lastName, String role) {
        Keycloak keycloak = getKeycloakInstance();

    UserRepresentation user = new UserRepresentation();
    user.setEnabled(true);
    user.setUsername(email);
    user.setEmail(email);
    user.setFirstName(firstName);
    user.setLastName(lastName);
    user.setEmailVerified(true);

    CredentialRepresentation credential = new CredentialRepresentation();
    credential.setTemporary(false);
    credential.setType(CredentialRepresentation.PASSWORD);
    credential.setValue(password);
    user.setCredentials(Collections.singletonList(credential));

    Response response = keycloak.realm(realm).users().create(user);

        if (response.getStatus() != 201) {
            String error = response.readEntity(String.class);
            log.error("Failed to create user in Keycloak: {} {}", response.getStatus(), error);
            throw new RuntimeException("Erreur Keycloak: " + response.getStatus());
        }

        String userId = response.getLocation().getPath().replaceAll(".*/([^/]+)$", "$1");

        // Explicitly set the password the Keycloak way
        resetPassword(userId, password);

        // As a failsafe, explicitly update the status to enabled again
        updateUserStatus(userId, true);

        // Assign role
        try {
            var roleRep = keycloak.realm(realm).roles().get(role.toLowerCase()).toRepresentation();
            keycloak.realm(realm).users().get(userId).roles().realmLevel().add(Collections.singletonList(roleRep));
        } catch (Exception e) {
            log.warn("Could not assign role {} to user {}, roles might not exist yet", role, userId);
        }

        return userId;
    }

    public void updateUserStatus(String keycloakId, boolean enabled) {
        Keycloak keycloak = getKeycloakInstance();
        UserRepresentation user = new UserRepresentation();
        user.setEnabled(enabled);
        keycloak.realm(realm).users().get(keycloakId).update(user);
    }

    public void updateUserRole(String keycloakId, String newRoleName) {
        Keycloak keycloak = getKeycloakInstance();
        var userResource = keycloak.realm(realm).users().get(keycloakId);

        // Remove existing roles (simplified: remove all realm roles then add new one)
        // In a real app, you might want to be more selective to keep default roles
        var currentRoles = userResource.roles().realmLevel().listAll();
        userResource.roles().realmLevel().remove(currentRoles);

        // Add new role
        var roleRep = keycloak.realm(realm).roles().get(newRoleName.toLowerCase()).toRepresentation();
        userResource.roles().realmLevel().add(Collections.singletonList(roleRep));
    }

    public java.util.Optional<UserRepresentation> getUser(String email) {
        Keycloak keycloak = getKeycloakInstance();
        List<UserRepresentation> users = keycloak.realm(realm).users().searchByEmail(email, true);
        return users.stream().findFirst();
    }

    public void resetPassword(String keycloakId, String newPassword) {
        Keycloak keycloak = getKeycloakInstance();
        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setTemporary(false);
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(newPassword);

        keycloak.realm(realm).users().get(keycloakId).resetPassword(credential);
        log.info("Password reset successfully for user: {}", keycloakId);
    }

    private Keycloak getKeycloakInstance() {
        return KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm("master")
                .username(adminUsername)
                .password(adminPassword)
                .clientId(adminClientId)
                .build();
    }
}
