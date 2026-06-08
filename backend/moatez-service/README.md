# 📋 WORKIFY - Plateforme Collaborative Freelance


> **Workify** est une plateforme web moderne et collaborative qui connecte les **clients** et les **freelancers** pour gérer des projets de manière efficace. Elle intègre des fonctionnalités avancées comme la génération de tâches par IA, la gestion de planning en temps réel, un calendrier interactif de meetings, et un système de notifications intelligent.

---

## 🌟 Fonctionnalités Principales

### 📂 Gestion de Projets
- ✅ Création de projets par les clients
- ✅ Attribution de freelancers aux projets
- ✅ Description détaillée des projets
- ✅ Visualisation des projets (liste et détails)
- ✅ Suppression de projets

### 📋 Planning Board
- ✅ Planning board avec colonnes personnalisables
- ✅ 3 colonnes par défaut : **To do**, **In Progress**, **Done**
- ✅ **Drag & Drop** des tâches entre colonnes
- ✅ Création, modification et suppression de tâches
- ✅ Ajout de nouvelles colonnes
- ✅ Couleurs personnalisables pour les colonnes
- ✅ **Mode sombre / clair** avec switch intégré

### 🤖 Génération de Tâches par IA (Google Gemini)
- ✅ Analyse automatique de la description du projet
- ✅ Extraction intelligente des fonctionnalités principales
- ✅ Génération de tâches pertinentes avec **Gemini 2.5 Flash**
- ✅ Ajout automatique des tâches dans la colonne "Todo"

### 📤 Gestion de Fichiers
- ✅ Upload de fichiers (images, PDF, Excel, RAR, ZIP, etc.)
- ✅ Taille maximale : **50 MB**
- ✅ Affichage des fichiers avec icônes dynamiques
- ✅ Téléchargement de fichiers
- ✅ Suppression de fichiers (FREELANCER uniquement)
- ✅ Métadonnées : taille, date d'upload, type
- ✅ Stockage sécurisé avec UUID unique

### 📅 Calendrier de Meetings Interactif
- ✅ **Vue Calendrier** : Mois, Semaine, Jour
- ✅ **Liste de tous les meetings** avec filtres
- ✅ **Création de meetings** par CLIENT ou FREELANCER
- ✅ **Propositions de dates multiples**
- ✅ **Confirmation des meetings**
- ✅ **Meetings en ligne** : Lien Google Meet, Zoom, Teams, etc
  - Clic sur date → Ouverture automatique du meeting
- ✅ **Meetings physiques** : Intégration Google Maps
  - Clic sur date → Ouverture automatique de la localisation dans Google Maps
- ✅ **Mode sombre / clair** avec switch intégré
- ✅ **Statuts des meetings** :
  - 🟡 **Pending Approvals** (En attente d'approbation)
  - 🟢 **Upcoming Meetings** (À venir)
  - ✅ **Completed Meetings** (Terminés)
  - ❌ **Cancelled Meetings** (Annulés avec raison)
  - 🚫 **Rejected Meetings** (Rejetés avec raison)

### ✍️ Notes de Meetings
- ✅ **Mark as Completed** → Ouverture automatique d'une section notes
- ✅ **Résumé du meeting** (récapitulatif, décisions, actions)
- ✅ **Sauvegarde automatique** des notes
- ✅ **Consultation des notes** pour les meetings passés

### 🔔 Système de Notifications en Temps Réel
- ✅ **WebSocket** pour notifications instantanées
- ✅ **Scheduler Spring**
- ✅ **Rappels automatiques** 24h avant les meetings confirmés
- ✅ **Notifications selon les cas** :
  - **CAS 1a** : Créateur CLIENT → Notification FREELANCER
  - **CAS 1b** : Créateur FREELANCER → Notification CLIENT
  - **CAS 2a** : Confirmation manuelle → Notification CLIENT si confirmateur FREELANCER
  - **CAS 2b** : Rejet FREELANCER → Notification CLIENT
  - **CAS 3** : Meeting dans 24h → Rappel CLIENT + FREELANCER


---

## 🏗️ Architecture Technique

### **Backend - Spring Boot**

```
workify-backend/
├── src/main/java/tn/esprit/workify/
│   ├── controllers/        # REST API Controllers
│   │   ├── ProjetController.java
│   │   ├── ProjectFileController.java
│   │   ├── PlanningController.java
│   │   ├── ColonneController.java
│   │   ├── TacheController.java
│   │   ├── MeetingController.java
│   │   └── NotificationController.java
│   ├── services/           # Business Logic
│   │   ├── ProjetServiceImpl.java
│   │   ├── ProjectFileService.java
│   │   ├── AiService.java              # ✨ Google Gemini AI
│   │   ├── MeetingService.java         # 📅 Meetings Management
│   │   ├── NotificationService.java    # 🔔 WebSocket Notifications
│   │   └── MeetingReminderScheduler.java # 🕐 Scheduler
│   ├── entities/           # JPA Entities
│   │   ├── Projet.java
│   │   ├── ProjectFile.java
│   │   ├── Planning.java
│   │   ├── Colonne.java
│   │   ├── Tache.java
│   │   ├── Meeting.java
│   │   ├── MeetingProposal.java
│   │   ├── MeetingNote.java
│   │   └── User.java
│   ├── repositories/       # Data Access Layer
│   ├── DTO/               # Data Transfer Objects
│   ├── config/            # Configuration Classes
│   │   ├── WebSocketConfig.java
│   │   └── SecurityConfig.java
│   └── schedulers/        # 🕐 Meeting Reminder Scheduler
├── src/main/resources/
│   ├── application.properties
│   └── uploads/           # 📁 Uploaded Files Storage
└── pom.xml
```

---

## 🚀 Installation & Configuration

### **Prérequis**

- ☕ **Java 17+**
- 🐬 **MySQL**

---

### **Backend - Spring Boot**

#### **Cloner le projet**

```bash
git clone https://github.com/MMoatez/workify.git
cd workify/WorkifyBackEnd
```

#### **Installer les dépendances et lancer**

```bash
mvn clean install
mvn spring-boot:run
```

Le backend sera accessible sur : `http://localhost:8082/workify`

---


## 📖 Guide d'Utilisation

### **Pour les CLIENTS**

1. **Créer un compte CLIENT** et se connecter
2. **Créer un nouveau projet** avec description détaillée
3. **Assigner un freelancer** au projet
4. **Créer des meetings** avec propositions de dates
5. **Accepter/Rejeter** les propositions de dates du freelancer
6. **Consulter le calendrier** (vue Mois/Semaine/Jour)
7. **Cliquer sur un meeting** → Ouverture automatique (Meet/Maps)
8. **Marquer comme terminé** → Ajouter des notes récapitulatives
9. **Consulter les fichiers** uploadés par le freelancer
10. **Télécharger les livrables**
11. **Recevoir des notifications** en temps réel

### **Pour les FREELANCERS**

1. **Créer un compte FREELANCER** et se connecter
2. **Consulter les projets** assignés
3. **Générer des tâches avec l'IA** à partir de la description
4. **Gérer le planning board** (créer, déplacer, modifier des tâches)
5. **Activer le mode sombre** pour un confort visuel
6. **Créer des meetings** avec propositions de dates
7. **Voter pour les propositions** de dates du client
8. **Consulter le calendrier** avec tous les meetings
9. **Rejoindre les meetings en ligne** (Google Meet/Zoom/etc)
10. **Uploader des fichiers** (livrables, designs, documentation)
11. **Recevoir des rappels** de meetings

---

## 🤖 Intégration IA - Google Gemini

### **Comment ça fonctionne ?**

1. Le freelancer clique sur **"✨ Generate Tasks with AI"**
2. La description du projet est envoyée à **Gemini 2.5 Flash**
3. L'IA analyse le texte et extrait les fonctionnalités principales
4. Les tâches sont automatiquement créées dans la colonne **"To do"**

### **Exemple de prompt envoyé à Gemini**

```
Analyse cette description de projet et extrais UNIQUEMENT les fonctionnalités 
principales sous forme de liste de tâches courtes et claires.

Description du projet:
Le projet consiste en la création d'une plateforme web dynamique et collaborative 
baptisée "ConnectHub". L'objectif principal est de permettre aux utilisateurs de 
communiquer instantanément via un système de messagerie privée robuste...

Exemple de format attendu:
Système de Messagerie
Système de Notifications
Gestion Utilisateur & Interface
```

### **Résultat**

```
✅ Système de Messagerie
✅ Système de Notifications
✅ Gestion Utilisateur & Interface
```

---

## 📅 Calendrier de Meetings

### **Vues Disponibles**

| Vue | Description | Fonctionnalités |
|-----|-------------|-----------------|
| **📅 Mois** | Vue mensuelle complète | Aperçu de tous les meetings du mois |
| **📆 Semaine** | Vue hebdomadaire détaillée | Planning de la semaine avec heures |
| **📋 Jour** | Vue journalière | Détails de tous les meetings du jour |

### **Statuts des Meetings**

| Statut | Icône | Description | Actions |
|--------|-------|-------------|---------|
| **Pending Approvals** | 🟡 | En attente de confirmation | Vote, Rejet |
| **Upcoming** | 🟢 | Confirmés à venir | Rejoindre, Annuler |
| **Completed** | ✅ | Terminés | Voir notes |
| **Cancelled** | ❌ | Annulés | Voir raison |
| **Rejected** | 🚫 | Rejetés | Voir raison |

### **Fonctionnalités Avancées**

#### **1. Meetings en Ligne**

```typescript
// Clic sur un meeting en ligne
onMeetingClick(meeting: Meeting) {
  if (meeting.type === 'ONLINE' && meeting.meetingLink) {
    window.open(meeting.meetingLink, '_blank');
  }
}
```

- ✅ **Google Meet** : Lien direct vers la visioconférence
- ✅ **Zoom** : Lien direct vers la salle Zoom
- ✅ **Ouverture automatique** au clic sur la date

#### **2. Meetings Physiques**

```typescript
// Clic sur un meeting physique
onMeetingClick(meeting: Meeting) {
  if (meeting.type === 'PHYSICAL' && meeting.location) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meeting.location)}`;
    window.open(mapsUrl, '_blank');
  }
}
```

- ✅ **Google Maps** : Ouverture automatique de l'adresse
- ✅ **Itinéraire** : Calculer le trajet directement
- ✅ **Vue satellite** disponible

#### **3. Notes de Meetings**

```typescript
// Marquer comme terminé
markAsCompleted(meeting: Meeting) {
  // Ouverture automatique de la section notes
  this.showNotesModal = true;
  this.currentMeeting = meeting;
}
```

- ✅ **Résumé** : Récapitulatif du meeting
- ✅ **Décisions** : Décisions prises
- ✅ **Actions** : Actions à entreprendre
- ✅ **Participants** : Liste des participants présents
- ✅ **Sauvegarde automatique**

### **Mode Sombre / Clair**

```typescript
// Toggle theme
toggleTheme() {
  this.isDarkMode = !this.isDarkMode;
  localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
}
```

- ✅ **Planning Board** : Mode sombre/clair
- ✅ **Calendrier** : Mode sombre/clair
- ✅ **Sauvegarde** : Préférence enregistrée dans localStorage
- ✅ **Transitions fluides** entre les modes

---

## 🔔 Système de Notifications

### **Architecture WebSocket**

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }
}
```

### **Scheduler pour Rappels de Meetings**

```java
@Scheduled(fixedRate = 1000) 
public void checkUpcomingMeetings() {
    LocalDateTime now = LocalDateTime.now();
    LocalDateTime in24Hours = now.plusHours(24);
    
    List<Meeting> upcomingMeetings = meetingRepository
        .findConfirmedMeetingsBetween(now, in24Hours);
    
    for (Meeting meeting : upcomingMeetings) {
        sendReminderNotification(meeting);
    }
}
```

### **Cas de Notifications**

| Cas | Déclencheur | Destinataire | Description |
|-----|------------|--------------|-------------|
| **1a** | CLIENT crée meeting | FREELANCER | Notification de nouveau meeting |
| **1b** | FREELANCER crée meeting | CLIENT | Notification de nouveau meeting |
| **2a** | FREELANCER confirme | CLIENT | Notification de confirmation |
| **2b** | FREELANCER rejette | CLIENT | Notification de rejet |
| **3** | Meeting dans 24h | CLIENT + FREELANCER | Rappel automatique |
| **4** | Meeting annulé | Tous participants | Notification d'annulation + raison |
| **5** | Meeting marqué terminé | Tous participants | Notification de fin + demande notes |

---

## 📁 Gestion de Fichiers

### **Types de fichiers supportés**

- 📄 **Documents** : PDF, Word, Excel, PowerPoint
- 🖼️ **Images** : JPG, PNG, GIF, SVG, WebP
- 📦 **Archives** : ZIP, RAR, 7Z, TAR
- 🎥 **Vidéos** : MP4, AVI, MOV
- 🎵 **Audio** : MP3, WAV, OGG
- 💻 **Code** : Tout type de fichier

### **Stockage**

Les fichiers sont stockés dans : `uploads/projects/{projectId}/`

### **Nomenclature**

Les fichiers sont renommés avec un UUID pour éviter les conflits :

```
a3f5c8e9-7b2d-4c1a-9e6f-8d3b5a2c1e7f.pdf
```

---


## 🧪 Tests

### **Backend**

```bash
mvn test
```


## 🚀 Déploiement

### **Backend (Production)**

```bash
mvn clean package
java -jar target/workify-0.0.1-SNAPSHOT.jar
```


## 👥 Contributeurs

- **Moatez Mathlouthi** - Développeur Full Stack

---


## 📞 Contact

Pour toute question ou suggestion :

- 📧 Email : moatez.mathlouthi@esprit.tn
- 💼 LinkedIn : [Moatez Mathlouthi](https://www.linkedin.com/in/moatez-mathlouthi-230266351/)
- 🐙 GitHub : [MMoatez](https://github.com/MMoatez)

---

<div align="center">
  <strong>Fait par Moatez Mathlouthi</strong>
  <br><br>
  🎉 Profitez de Workify pour gérer vos projets freelance efficacement ! 🚀
</div>
