package com.workify.userservice.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public final class KeycloakPrincipal {

  private KeycloakPrincipal() {
  }

  public static String getKeycloakId(Authentication auth) {
    if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
      return null;
    }
    return jwt.getSubject();
  }

  public static String getEmail(Authentication auth) {
    if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
      return null;
    }
    return jwt.getClaimAsString("email");
  }

  public static String getPreferredUsername(Authentication auth) {
    if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
      return null;
    }
    return jwt.getClaimAsString("preferred_username");
  }

  @SuppressWarnings("unchecked")
  public static List<String> getRealmRoles(Authentication auth) {
    if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
      return Collections.emptyList();
    }
    Object realmAccess = jwt.getClaim("realm_access");
    if (realmAccess instanceof java.util.Map<?, ?> map) {
      Object roles = map.get("roles");
      if (roles instanceof List<?> list) {
        return list.stream().map(Object::toString).collect(Collectors.toList());
      }
    }
    return Collections.emptyList();
  }

  public static String getFirstName(Authentication auth) {
    if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
      return null;
    }
    return jwt.getClaimAsString("given_name");
  }

  public static String getLastName(Authentication auth) {
    if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
      return null;
    }
    return jwt.getClaimAsString("family_name");
  }
}
