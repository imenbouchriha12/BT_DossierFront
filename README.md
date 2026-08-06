# BT DocCenter — Frontend (Angular)

Interface web de **BT DocCenter**, le système de gestion de dossiers clients bancaires. Application Angular (SPA) qui consomme l'API REST du backend ASP.NET Core et communique en temps réel via SignalR.

## Aperçu des technologies

| Technologie | Version |
|-------------|---------|
| Angular | 18.x (CLI 18.2.21) |
| TypeScript | ~5.5 |
| Tailwind CSS | 3.4 |
| Chart.js | 4.5 (graphiques du tableau de bord) |
| SignalR | 10.x (`@microsoft/signalr`) |
| RxJS | 7.8 |

## Prérequis

- **Node.js** ≥ 18.19 (testé avec Node 20+)
- **npm** ≥ 10
- Le backend **BT_DossierBackend** doit être démarré (l'application ne fonctionne pas sans lui)

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de développement
npm start          # équivalent à : ng serve
```

L'application est disponible sur **http://localhost:4200**.

## Scripts

| Commande | Description |
|----------|-------------|
| `npm start` | Serveur de développement (rechargement à chaud) |
| `npm run build` | Build de production dans `dist/luma-finance/` |
| `npm run watch` | Build en mode watch (développement) |
| `npm test` | Tests unitaires via Karma / Jasmine |

## Configuration

La configuration se trouve dans `src/environments/` :

| Fichier | Rôle |
|---------|------|
| `environment.ts` | Environnement de développement (défaut) |
| `environment.prod.ts` | Environnement de production |

```ts
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5184/api',        // URL de l'API REST
  staticUrl: 'http://localhost:5184/uploads/', // URL des fichiers statiques (photos, docs)
};
```

> En production, mettre à jour ces URLs avant le build.

## Architecture du projet

```
src/
├── app/
│   ├── layouts/                # Layouts de l'application
│   │   ├── marketing-layout/   # Pages publiques (connexion, inscription, ...)
│   │   └── sidebar-layout/     # Layout authentifié (barre latérale + topbar)
│   ├── pages/                  # Écrans de l'application
│   │   ├── tableau-de-bord/    # Dashboard analytique (KPIs, graphiques)
│   │   ├── liste-clients/      # Recherche et liste des clients
│   │   ├── nouveau-client/     # Création / modification d'un client
│   │   ├── detail-client/      # Fiche détaillée d'un client (documents, ...)
│   │   ├── comptes/            # Comptes bancaires (importés SISS)
│   │   ├── gestion-documents/  # Gestion documentaire (validation, OCR)
│   │   ├── agenda-taches/      # Rappels et tâches
│   │   ├── rapports/           # Rapports PDF / Excel
│   │   ├── cours/              # Cours de change en temps réel
│   │   ├── messagerie/         # Messages privés
│   │   ├── surveillance-fraude # Détection d'anomalies / fraudes
│   │   ├── assistant-ia/       # Assistant IA (RAG sur les dossiers)
│   │   ├── parametres/         # Profil, sécurité, préférences
│   │   ├── gestion-utilisateurs# Administration (Admin / Superviseur)
│   │   ├── historique-modifications # Journal d'audit
│   │   └── portal/             # Vue du portail client
│   ├── shared/                 # Composants partagés
│   │   ├── topbar/             # Barre supérieure (recherche, notif., thème)
│   │   ├── sidebar/            # Navigation latérale
│   │   ├── toast/              # Système de notifications toast
│   │   └── footer/
│   ├── services/               # Services HTTP (un par domaine métier)
│   ├── models/                 # Interfaces TypeScript
│   ├── guards/                 # Guards de route (auth, rôles)
│   ├── app.routes.ts           # Définition des routes (lazy loading)
│   └── app.component.ts
├── environments/               # Configuration par environnement
├── styles.css                  # Tokens CSS + surcharges mode sombre
└── index.html
```

### Routage

- **Pages publiques** (`marketing-layout`) : `/connexion`, `/inscription`, `/forgot-password`, `/reset-password`
- **Pages privées** (`sidebar-layout`, protégées par `authGuard`) : `/tableau-de-bord`, `/liste-clients`, `/comptes`, `/client/:id`, `/gestion-documents`, `/agenda-taches`, `/rapports`, `/cours`, `/messagerie`, `/surveillance-fraude`, `/assistant-ia`, `/parametres`, `/historique-modifications`, `/portal`
- **Administration** (protégées par `roleGuard`) : `/gestion-utilisateurs` (réservé Admin / Superviseur)

Toutes les pages sont chargées en **lazy loading** (`loadComponent`).

## Fonctionnalités principales

- **Authentification** JWT : connexion par matricule, inscription, mot de passe oublié / réinitialisation
- **Tableau de bord analytique** : KPIs, évolutions, répartitions, alertes (Chart.js)
- **Gestion des clients** : CRUD, recherche multi-critères, import/export Excel, archivage
- **Gestion documentaire** : upload, validation, OCR, portail client self-service
- **Finance SISS (lecture seule)** : comptes, mouvements, cours de change temps réel
- **Rappels & agenda** : tâches, rendez-vous, suivis, notifications en retard
- **Rapports** : génération PDF / Excel
- **Messagerie** interne et **surveillance de fraude** / score de risque
- **Assistant IA** : chat conversationnel avec les données du dossier
- **Notifications temps réel** via SignalR (toasts + badge)
- **Mode sombre** : bascule manuelle (mémorisée) ou automatique selon le système

## Mode sombre

Le thème est contrôlé par la classe `dark` sur `<html>` :
- Toggle dans la topbar (mémorisé dans `localStorage`, clé `theme`)
- Détection automatique de la préférence système au premier chargement (`index.html`)
- Tailwind configuré avec `darkMode: "class"` ; les couleurs sémantiques sont mappées sur des tokens CSS définis dans `src/styles.css`
- Pour les composants encapsulés, les variantes sombres utilisent `:host-context(.dark)` (voir `shared/toast`, `pages/detail-client`, etc.)

## Développement

### Ajouter une page

```bash
ng generate component pages/ma-nouvelle-page --standalone
```

Puis déclarer la route dans `src/app/app.routes.ts` avec `loadComponent`.

### Convention de nommage

- Pages : `pages/<nom>/<nom>.component.{ts,html,css}`
- Services : `services/<nom>.service.ts`
- Modèles : `models/<domaine>.models.ts`
- Langue de l'interface : **français**

## Tests

```bash
npm test        # tests unitaires (Karma + Jasmine, Chrome headless requis)
```

## Build de production

```bash
npm run build
```

Les fichiers générés sont dans `dist/luma-finance/`. Ils peuvent être servis par le backend ASP.NET Core (dossier `wwwroot`) ou par n'importe quel serveur statique (nginx, IIS, ...).

## Dépendances avec le backend

| Ressource | URL |
|-----------|-----|
| API REST | `http://localhost:5184/api` |
| Fichiers statiques (photos, uploads) | `http://localhost:5184/uploads/` |
| Hubs SignalR | `/hubs/notifications`, `/hubs/messages`, `/hubs/cours` |
