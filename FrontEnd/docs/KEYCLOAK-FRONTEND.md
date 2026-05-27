# Keycloak – Frontend (Angular)

L’authentification utilise **Keycloak**. Création de compte et connexion se font via Keycloak ; le frontend redirige vers Keycloak puis récupère le token au retour.

## Configuration Keycloak (côté Keycloak)

1. **Realm** : `workify` (ou adapter `environment.keycloak.realm`).
2. **Client** : créer un client public (ex. `workify-frontend`) :
   - **Valid redirect URIs** : `http://localhost:4200/*`, `http://localhost:4201/*` (et l’URL de prod si besoin).
   - **Web origins** : `http://localhost:4200`, `http://localhost:4201`.
   - Pour que la redirection avec token dans le fragment fonctionne : activer **Implicit flow** (Standard flow peut aussi être activé). Sinon utiliser Authorization Code + PKCE et un backend pour échanger le code.
3. **Inscription** : dans le realm, **Login** → **Registration allowed** = ON pour permettre la création de compte.

## Variables d’environnement (Angular)

Dans `environment.development.ts` (et `environment.ts` pour la prod) :

- `apiBaseUrl` : URL du **user-service** (ex. `http://localhost:8081`) ou de la gateway.
- `keycloak.url` : URL de Keycloak (ex. `http://localhost:8180`).
- `keycloak.realm` : nom du realm (ex. `workify`).
- `keycloak.clientId` : ID du client (ex. `workify-frontend`).

## Flux

1. **Connexion** : l’utilisateur va sur **Sign In** → redirection vers Keycloak → après login, Keycloak redirige vers `/auth/callback#access_token=...`.
2. **Callback** : le composant `AuthCallbackComponent` lit le token dans le fragment, le stocke (localStorage), puis redirige vers `/profile`.
3. **Création de compte** : **Get Started** → redirection vers Keycloak avec `kc_action=register` (page d’inscription Keycloak).
4. **Profil** : les appels à `/api/users/me` (et avatar, compétences) envoient le token dans l’en-tête `Authorization: Bearer <token>` (intercepteur Angular).

## Routes

- `/auth/login` : redirection vers Keycloak login.
- `/auth/register` : redirection vers Keycloak registration.
- `/auth/callback` : réception du token après Keycloak (ne pas ouvrir à la main).
- `/profile` : profil utilisateur (protégé par `authGuard`).
