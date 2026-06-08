# Workify - SmartFreelance

## Description
Workify (SmartFreelance) est une plateforme complète et intelligente de mise en relation pour les freelances. Elle facilite la recherche de missions et la gestion de projets en intégrant des recommandations basées sur l'intelligence artificielle (IA). Le projet repose sur une architecture microservices évolutive, une interface utilisateur moderne et réactive, ainsi qu'un service d'apprentissage automatique dédié pour optimiser les correspondances entre les profils de freelances et les offres de projets.

## Technologies utilisées
Frontend : Angular 18, TailwindCSS
Backend : Spring Boot (Microservices), Spring Cloud (Eureka, API Gateway), Keycloak (Authentification)
Base de données : PostgreSQL (Utilisateurs/Keycloak), MySQL (Microservices métier)
IA / Machine Learning : Python, FastAPI, Scikit-learn, Pandas
Générateur de CV (Open Resume) : Next.js, React, TailwindCSS

## 4. Prérequis techniques

| Technologie / Outil | Version requise |
| ------------------- | ---------------- |
| Node.js             | 18+              |
| Java / JDK          | 17+              |
| Angular             | 18+              |
| Docker & Compose    | Requis           |
| Python              | 3.9+             |
| Maven               | Requis (pour lancer Spring Boot en local) |

## Installation
**Frontend :**
```bash
cd FrontEnd
npm install
```

**Backend :**
Le backend utilise Docker pour télécharger et construire les images nécessaires automatiquement.

**Service ML :**
```bash
cd ml-service
python -m venv venv
venv\Scripts\activate # Sur Windows
pip install -r requirements.txt
```

**Générateur de CV (Open Resume) :**
```bash
cd open-resume
npm install
```

## Lancement
**Backend (Via Docker - Complet) :**
```bash
cd backend
docker-compose up -d
```

**Backend (Lancement individuel d'un microservice Spring Boot) :**
Si vous souhaitez développer ou tester un service spécifique en local (ex: `user-service`) :
```bash
cd backend/user-service
mvn spring-boot:run
```
*(Note : Il est nécessaire que les bases de données, Keycloak et Eureka soient déjà en cours d'exécution via Docker pour que le microservice fonctionne correctement).*

**Frontend (Interface Web) :**
```bash
cd FrontEnd
npm start
```
*L'application sera accessible sur http://localhost:4200/*

**Service ML (IA) :**
```bash
cd ml-service
uvicorn api.main:app --reload
```
*L'API sera accessible sur http://localhost:8000/docs*

**Générateur de CV (Open Resume) :**
```bash
cd open-resume
npm run dev
```
*L'application sera accessible sur http://localhost:3000/*

## Variables d'environnement
La majorité des variables d'environnement sont configurées directement dans le fichier `backend/docker-compose.yml` (identifiants bases de données, URLs Keycloak, etc.).

## Démo
Vidéo : https://drive.google.com/file/d/1fOJIE-AslQUg3h5IkyHm9HteecAmiDuy/view?usp=sharing
Déploiement : non disponible

## Auteurs 
* Noms : 
-Safa Hajji 
-Moatez Mathlouthi
-Nour Jbeli
-Oumaima Ouerfelli
-Louay Krouna
* Classe : 4 SAE 3
* Année : 2025/2026
Tuteur : Mme Nadine Maazoune