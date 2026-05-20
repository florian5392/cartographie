# Plan de Développement — Cartographie Applicative SI v3 (Atelier)

**Projet** : Outil d'atelier de cartographie applicative en temps réel
**Stack** : React + React Flow / PostgREST + PostgreSQL / Docker / Nginx
**Durée estimée** : 10 semaines

---

## Phase 0 — Setup & Fondations (Semaine 1) ✅

### 0.1 — Initialisation du projet

- [x] Créer le dépôt Git (privé)
- [x] Initialiser le projet React (Vite + plugin-react)
- [x] Installer les dépendances : `reactflow`, `axios`, `tailwindcss`, `zustand`
- [x] Configurer ESLint
- [x] Créer `.gitignore`, `.env.example` documenté (`POSTGRES_PASSWORD`)
- [x] Arborescence complète créée : `src/api/`, `src/hooks/`, `src/stores/`, `src/components/graph|panel|session/`, `src/data/`

### 0.2 — Docker & infrastructure locale

- [x] `docker-compose.yml` : 3 services (postgres:15-alpine, postgrest:latest, dashboard) avec healthchecks et `restart: unless-stopped`
- [x] `Dockerfile` multi-stage : build Vite → image Nginx Alpine
- [x] `nginx.conf` : SPA fallback (`try_files`), gzip, cache 1 an sur les assets, headers sécurité (X-Frame-Options, X-Content-Type-Options)
- [ ] Valider `docker compose up -d` sur les 3 services *(à tester en environnement cible)*

### 0.3 — Modèle de données PostgreSQL

- [x] 6 tables définies : Sessions, Établissements, Applications, Déploiements, Flux, Positions
- [x] `scripts/init.sql` : schéma PostgreSQL complet + rôle `web_anon` + vue `sessions_view` avec compteurs apps/flux

**Livrable** : Environnement local défini, modèle 6 tables, script de seed.

---

## Phase 1 — Client API & Mode Démo (Semaine 2) ✅

### 1.1 — Client API PostgREST (`src/api/api.js`)

- [x] CRUD Applications : `getApplications()`, `createApplication()`, `updateApplication()`, `deleteApplication()`
- [x] CRUD Flux : `getFlux(sessionId?)`, `createFlux()`, `updateFlux()`, `deleteFlux()`
- [x] CRUD Établissements : `getEtablissements()`, `createEtablissement()`
- [x] CRUD Déploiements : `getDeploiements(sessionId?)`, `createDeploiement()`, `deleteDeploiement()`
- [x] CRUD Sessions : `getSessions()`, `createSession()`, `updateSession()`
- [x] CRUD Positions : `getPositions(sessionId)`, `savePositions(sessionId, positions)` (upsert via clé composite)
- [x] Retry exponentiel sur erreurs réseau (3 tentatives : 1 s → 2 s → 4 s, pas de retry sur 4xx)
- [x] `isAPIReachable()` : retourne `true` si PostgREST répond, `false` si injoignable

### 1.2 — Mode démo (`src/data/demoData.js`)

- [x] 2 établissements : CHU Central, Clinique Sud
- [x] 8 applications (contexte SI hospitalier FR) : SAP ERP, Mediboard, PACS, Messagerie Exchange, Annuaire LDAP, DPI Web, BI Tableau, Orbis
- [x] 10 flux typés (API, Fichier, BDD, EDI, Manuel) avec description, fréquence, flag critique
- [x] 1 session démo multi-sites avec positions et déploiements
- [x] Switch automatique dans `initStore()` si PostgREST injoignable
- [x] Badge "DÉMO" visible dans KpiBar et SessionSelector

### 1.3 — State management local (`src/stores/sessionStore.js`)

- [x] Store Zustand : `session`, `sessions`, `applications`, `flux`, `positions`, `etablissements`, `deploiements`, `isDirty`, `demoMode`, `history`, `historyIndex`
- [x] Toutes les actions CRUD passent par le store avant persistance API
- [x] Le graphe réagit au store, pas directement aux appels API
- [x] Historique des 50 dernières actions (snapshots `{ applications, flux }`)
- [x] Scaffold complet de tous les composants (`AppNode`, `FluxEdge`, `GraphCanvas`, `QuickAdd*`, `Session*`, `KpiBar`, `PresentationMode`, `ExportPanel`)

**Livrable** : Couche données complète, mode démo fonctionnel, store local réactif.

---

## Phase 2 — Gestion des Sessions (Semaine 3) ✅

### 2.1 — Écran d'accueil / Sélecteur de session (`SessionSelector.jsx`)

- [x] Liste des sessions avec nom, date, périmètre, statut, compteurs apps/flux (`_appCount`, `_fluxCount`)
- [x] Badge statut coloré (vert = en cours, gris = terminée) + icône 🔒 si terminée
- [x] Bouton "Nouvelle session" → formulaire :
  - Nom de la session
  - Périmètre : boutons pills (Mono-site / Multi-sites)
  - Établissement cible (affiché uniquement en mono-site) : dropdown si établissements existants, champ libre sinon
  - Case "Pré-charger les N applications existantes"
- [x] Bouton "Reprendre" par session
- [x] Bouton "Dupliquer" (copie avec statut remis à "en cours")

### 2.2 — Gestionnaire de session (`SessionManager.jsx`)

- [x] Chargement des données liées à la session (apps, flux, positions, déploiements, établissements)
- [x] KpiBar : nom de session, périmètre, établissement cible, statut, bouton sauvegarder manuel
- [x] Bouton "← Sessions" avec dialog de confirmation si modifications non sauvegardées
- [x] Changement de statut **"En cours" ↔ "Terminée"** via toggle dans KpiBar (persisté via `updateSession` API)
- [x] **Mode lecture seule** quand statut = "terminée" : panneau latéral désactivé, bandeau "🔒 Session terminée", édition graphe bloquée, bouton "Rouvrir"
- [x] Raccourcis clavier : F1/F2/F3 (onglets), F11 (présentation), Escape (quitter présentation)

### 2.3 — Autosave (`useAutoSave.js`)

- [x] Sauvegarde automatique toutes les 30 secondes si `isDirty`
- [x] Indicateur visuel dans le bas du panneau : "Sauvegardé ✓" / "Sauvegarde..." / "Non sauvegardé ⚠"
- [x] Sauvegarde des positions incluse
- [x] **Sync apps et flux** : diff create/update/delete entre état courant et dernier état sauvé
- [x] File d'attente offline : les opérations en attente sont drainées au prochain cycle de sauvegarde
- [x] Pas de sauvegarde en mode démo

### 2.4 — Undo / Redo (`useUndoRedo.js`)

- [x] Historique des 50 dernières actions dans le store Zustand
- [x] Raccourcis clavier : Ctrl+Z (undo), Ctrl+Shift+Z / Ctrl+Y (redo)
- [x] Boutons ↩ / ↪ dans le bas du panneau latéral avec état disabled
- [x] Actions annulables : ajout/suppression/modification d'app, ajout/suppression/modification de flux

**Livrable** : Workflow complet de gestion des sessions avec autosave, lock lecture seule et undo/redo.

---

## Phase 3 — Vue Graphe Temps Réel (Semaines 4–5) ✅

### 3.1 — Canvas principal (`GraphCanvas.jsx`)

- [x] Intégration React Flow avec le store de session (source de vérité Zustand → sync via useEffect)
- [x] Layout dynamique selon le périmètre :
  - **Mono-site** : auto-grid jusqu'à 4 colonnes, calculé quand aucune position n'est stockée ; réorganisable par drag
  - **Multi-sites** : zone transverse en haut (apps Global/Multi-sites) + colonnes par établissement avec en-têtes visuels (`columnHeader` node type)
  - `resolvePositions` : utilise les positions stockées, fallback auto-layout pour les nouvelles apps
- [x] Fond de canvas : grille de points subtile (BackgroundVariant.Dots, gap 22px, couleur #1f2937)
- [x] Zoom / pan natif React Flow + raccourci Espace → fitView (animé 400ms)
- ~~Mini-map toggleable via bouton Panel en haut à droite~~ *(retirée — distraction en projection)*

### 3.2 — Nœuds applicatifs (`AppNode.jsx`)

- [x] Nom de l'app en 15px bold, sous-titre type, éditeur en gris
- [x] Bordure gauche colorée selon criticité : rouge (haute), orange (moyenne), gris (basse)
- [x] Badge périmètre (Global / Multi-sites / Local) affiché uniquement en mode multi-sites
- [x] Pastilles couleur des établissements déployés (via `appEtabsMap` calculé depuis les déploiements)
- ~~Badge statut (production / recette / pilote) en coin droit~~ *(retiré — redondant avec les infos panel)*
- [x] Handles (target top, source bottom) cachés par défaut, révélés au survol (transition opacity)
- [x] Double-clic → ouvre l'édition dans QuickAddApp (désactivé en lecture seule)
- [x] Animation d'entrée `.node-enter` : scale 0.82→1 + fade-in, 280ms easing spring

### 3.3 — Arêtes flux (`FluxEdge.jsx`)

- [x] Flèche directionnelle source → cible avec `MarkerType.ArrowClosed` coloré par type
- [x] Style par type : API=trait plein bleu, Fichier=tirets jaunes, BDD=pointillés violets, EDI=tirets verts, Manuel=trait fin gris
- [x] Label court (flux.label ou type) avec bordure colorée de l'arête
- [x] Tooltip (attribut `title`) : label + description + fréquence
- [x] Animation d'entrée `.edge-draw` : stroke-dashoffset 1200→0 sur 420ms

### 3.4 — Interactions en séance

- [x] Clic nœud → surbrillance des connexions entrantes/sortantes (opacity 1), dimming du reste (0.12 nœuds / 0.07 arêtes), transition 200ms
- [x] Second clic sur le même nœud ou clic sur le fond → désélection, retour à l'affichage normal
- [x] Drag & drop → `onNodeDragStop` met à jour les positions dans le store (isDirty → sauvegardé à l'autosave)
- [x] Double-clic sur le canvas (zone vide) → ouvre l'onglet "Applications" dans le panneau (`onOpenAddApp` prop câblée dans SessionManager)
- [x] Suppr / Backspace → modal de confirmation avec liste des éléments à supprimer (actions annulables via Ctrl+Z)
- [x] `deleteKeyCode={null}` sur ReactFlow : empêche les suppressions non confirmées
- [x] Raccourci Espace → fitView (400ms)
- [x] Mode lecture seule : drag, connect, delete et édition désactivés

**Livrable** : Graphe interactif temps réel avec animations, layouts automatiques, optimisé pour projection.

---

## Phase 4 — Panneau de Saisie Rapide (Semaine 6) ✅

### 4.1 — Onglet Application (`QuickAddApp.jsx`)

- [x] Nom avec **autocomplétion** : suggestions filtrées dès 2 caractères, clic remplit les champs compatibles
- [x] Type en **boutons-pills** : 4 types (DPI, Imagerie, Messagerie, Annuaire) + saisie libre pour tout autre type *(réduit depuis 10 types initiaux pour limiter les choix en atelier)*
- [x] Criticité en **3 boutons visuels** : Haute (rouge), Moyenne (orange), Basse (gris) avec dot + bordure colorée
- [x] Périmètre (Global / Multi-sites / Local) affiché uniquement en session multi-sites
- [x] Description repliée par défaut (toggle indépendant)
- [x] Champs supplémentaires (éditeur, version, statut, responsable) repliés derrière un toggle *(couleur retirée — non utilisée dans l'affichage)*
- [x] Touche Entrée = ajouter
- [x] Après ajout : formulaire vidé, focus remis sur le champ Nom
- [x] Objectif ≤ 5 secondes : nom + type + criticité → Entrée
- [x] **Mode édition** : pré-rempli depuis `editingApp` (double-clic nœud), bouton Enregistrer/Annuler
- [x] Guard `readOnly`

### 4.2 — Onglet Flux (`QuickAddFlux.jsx`)

- [x] Source/Cible : dropdowns des apps de la session (cible exclut la source)
- [x] Type en **boutons-pills colorés** : API (bleu), Fichier (jaune), BDD (violet), EDI (vert), Manuel (gris)
- [x] Fréquence en **boutons** : Temps réel, Quotidien, Hebdomadaire, Ponctuel
- [x] Libellé court + description (optionnel) + case flux critique
- [x] Après ajout : source et cible vidés, **type et fréquence conservés**
- [x] Guard : message si moins de 2 applications dans la session
- [x] Guard `readOnly`

### 4.3 — Onglet Établissement (`QuickAddEtablissement.jsx`)

- [x] Affiché uniquement en mode multi-sites (message sinon)
- [x] Ajouter un établissement : nom + couleur (color picker)
- [x] Affecter une app à un établissement : dropdown app + dropdown établissement + environnement
- [x] Liste des déploiements existants avec suppression (× par ligne)
- [x] Guard `readOnly`

### 4.4 — Navigation entre onglets

- [x] Raccourcis clavier F1 / F2 / F3 (câblés dans SessionManager)
- [x] Onglet actif mémorisé dans l'état de SessionManager
- [x] Double-clic nœud → bascule sur onglet App en mode édition
- [x] Double-clic canvas vide → bascule sur onglet App en mode création

**Livrable** : Saisie rapide complète, optimisée clavier, réactive instantanément dans le graphe.

---

## Phase 5 — KPIs, Mode Présentation & Export (Semaine 7) ✅

### 5.1 — Barre de KPIs (`KpiBar.jsx`)

- [x] 3 indicateurs en mode mono-site : Apps recensées, Flux tracés, Apps critiques *(KPI "Couverture" retiré — jugé peu lisible en projection)*
- [x] 4e indicateur en mode multi-sites : Établissements couverts
- [x] Mise à jour instantanée à chaque ajout/suppression
- [x] Animation de transition sur les chiffres (count-up)

### 5.2 — Mode Présentation (`PresentationMode.jsx`)

- [x] Bouton "Présenter" ou raccourci F11
- [x] Masque le panneau de saisie → graphe en plein écran
- [x] KPIs toujours visibles en overlay discret en haut
- [x] Navigation : zoom/pan, clic sur nœud pour surbrillance
- [x] Bouton "Quitter" ou touche Échap pour revenir
- [x] Curseur laser : point coloré qui suit la souris (touche L pour changer la couleur)

### 5.3 — Export (`ExportPanel.jsx`)

- [x] Export image PNG/SVG du graphe (html-to-image)
- [x] Export rapport Markdown : en-tête session, tableau apps, tableau flux, KPIs
- [x] Export JSON brut (applications + flux + positions)
- [x] Export impression (window.print())

**Livrable** : KPIs en direct, mode plein écran pour la revue collective, export post-séance.

---

## Phase 6 — Fusion & Consolidation Multi-Sessions (Semaine 8) ✅

### 6.1 — Vue consolidée (`src/components/consolidated/ConsolidatedView.jsx`)

- [x] Écran "Vue globale" accessible depuis l'accueil (bouton dans SessionSelector)
- [x] Graphe fusionné de toutes les sessions : nœuds dédoublonnés par application, arêtes de flux agrégées
- [x] Filtre par session via pills cliquables (afficher/masquer les éléments d'une session)
- [x] Highlighting au clic sur un nœud (même comportement que la vue session)
- [x] Minimap activée

### 6.2 — Comparaison de sessions (`src/components/consolidated/CompareView.jsx`)

- [x] Sélection de 2 sessions via checkboxes dans SessionSelector + bouton "Comparer les 2 sessions"
- [x] Diff structuré : apps absentes / apps nouvelles, flux supprimés / flux ajoutés, flux communs
- [x] Utile pour mesurer la progression entre deux ateliers

### 6.3 — Vue tableau — Référentiel (`src/components/consolidated/ReferentielTable.jsx`)

- [x] Tableau triable et filtrable : recherche texte, filtre par type, filtre par criticité
- [x] Colonnes dynamiques par établissement (✓ / —)
- [x] Export CSV
- [x] Accessible depuis le bouton "Référentiel" dans SessionSelector

**Livrable** : Vision globale consolidée, référentiel applicatif filtrable, comparaison inter-sessions.

---

## Phase 7 — Tests & Qualité (Semaine 9)

### 7.1 — Tests unitaires

- [x] Client API : mock des appels PostgREST — `api.test.js` (13 tests)
- [x] Store session : ajout/suppression/modification d'apps et flux — `sessionStore.test.js` (17 tests)
- [x] Hook undo/redo : enchaînement d'actions et annulations — couvert dans sessionStore
- [x] Hook autosave : déclenchement, diff de sync, file d'attente offline — `useAutoSave.test.js` (14 tests)
- [x] Fonctions de layout : positionnement des nœuds — `layout.test.js` (11 tests)
- [x] Composants React : QuickAddApp (14 tests), QuickAddFlux (11 tests)

### 7.2 — Tests d'intégration

- [x] Scénario atelier complet : créer session → ajouter apps → tracer flux → sauvegarder — `integration.test.js` (13 tests)
- [ ] Undo/redo sur 10 actions consécutives
- [ ] Mode démo : PostgREST coupé → fallback fonctionnel
- [ ] Données volumineuses : 30 apps, 50 flux (fluidité du graphe)

### 7.3 — Qualité & accessibilité

- [ ] Audit Lighthouse > 80 (performance, accessibilité)
- [ ] Test de lisibilité projection : taille des polices, contraste, sur écran simulé 1920×1080
- [ ] Gestion des états vides (session vierge, aucun flux, backend down)
- [ ] Messages d'erreur clairs et non bloquants

**Livrable** : Suite de tests couvrant le workflow atelier, performance validée.

---

## Phase 8 — Déploiement Production & Documentation (Semaine 10)

### 8.1 — Sécurisation

- [ ] HTTPS via reverse proxy (Traefik ou Nginx + Let's Encrypt)
- [ ] PostgREST non exposé publiquement (réseau Docker interne)
- [ ] Variables d'environnement production séparées
- [ ] Headers sécurité Nginx (CSP, HSTS, X-Frame-Options) *(base déjà dans nginx.conf)*

### 8.2 — Persistance & backup

- [ ] Volumes Docker nommés pour PostgreSQL *(déjà dans docker-compose.yml)*
- [ ] Script backup automatisé (cron + pg_dump)
- [ ] Rétention 7 jours rolling
- [ ] Procédure de restauration testée

### 8.3 — Monitoring & résilience

- [ ] `restart: unless-stopped` sur tous les services *(déjà configuré)*
- [ ] Healthchecks Docker *(déjà sur postgres)*
- [ ] Logs centralisés

### 8.4 — CI/CD

- [ ] Dockerfile multi-stage *(déjà écrit)*
- [ ] Script de déploiement documenté
- [ ] Tag des versions Docker

### 8.5 — Documentation

- [ ] README.md complet : prérequis, variables d'environnement, démarrage rapide, architecture
- [ ] Guide animateur : préparer et mener un atelier de cartographie
- [ ] Guide admin : gestion PostgreSQL/PostgREST, backup, mise à jour
- [ ] FAQ : ajout d'app, gestion des sessions, exports

**Livrable** : Application en production, documentée, prête pour les premiers ateliers.

---

## Fonctionnalités ajoutées hors-plan

Ces évolutions ont été implémentées au fil des phases sans être prévues dans le plan initial.

### Champs supplémentaires sur les applications

- **Hébergement** : On-premise, Cloud public, SaaS, Hybride (champ dans `QuickAddApp`, colonne `hebergement` en base)
- **Portée** : Etablissement / Groupe / Externe (champ dans `QuickAddApp`, colonne `portee` en base, badge coloré sur l'AppNode)

### Actions sur le graphe

- **Suppression d'application** : bouton × au survol d'un nœud `AppNode` (avec confirmation, annulable via Ctrl+Z)
- **Modification et suppression de flux** : liste des flux existants dans l'onglet Flux (`QuickAddFlux`) avec boutons éditer/supprimer par ligne
- **Flèches directionnelles** : `markerEnd` coloré par type de flux sur chaque arête (`MarkerType.ArrowClosed`)
- **Flux animés** : propriété `animated: true` activée sur toutes les arêtes pour matérialiser le sens du flux

### Corrections de bugs

- **Isolation des sessions** : ajout de `session_id` sur la table `applications` — une nouvelle session démarre vide, sans hériter des apps des autres sessions
- **Sauvegarde silencieuse** : remplacement de `createApplication` + `updateApplication` par `upsertApplication` (PostgREST `merge-duplicates`) — corrige les échecs 409 silencieux au premier save
- **Statut d'erreur visible** : ajout d'un état `'error'` distinct dans `SessionManager` (rouge) quand la sauvegarde échoue

### Ajustements UX

- **Types applicatifs** réduits à 4 pills (DPI, Imagerie, Messagerie, Annuaire) + saisie libre, pour limiter le choix en atelier
- **KPI "Couverture"** retiré de `KpiBar` (peu lisible en projection)
- **MiniMap retirée** du graphe (distraction en projection)
- **Badge statut retiré** de l'AppNode (redondant)
- **Champ couleur retiré** des applications (non utilisé dans l'affichage)
- **Port 5432 exposé** dans `docker-compose.yml` pour accès depuis DBeaver ou tout client SQL

### Infrastructure

- **Protection de branche main** : push directs bloqués, tout changement passe par une PR (configuré via l'API GitHub)
- **CI GitHub Actions** : lint ESLint (`--max-warnings 0`), build Vite, tests Vitest sur Node 24

---

## Récapitulatif

| Phase | Contenu | Semaine | Statut |
|-------|---------|---------|--------|
| 0 | Setup & Fondations | S1 | ✅ |
| 1 | Client API & Mode Démo | S2 | ✅ |
| 2 | Gestion des Sessions | S3 | ✅ |
| 3 | Vue Graphe Temps Réel | S4–S5 | ✅ |
| 4 | Panneau de Saisie Rapide | S6 | ✅ |
| 5 | KPIs, Présentation & Export | S7 | ✅ |
| 6 | Fusion & Consolidation | S8 | ✅ |
| 7 | Tests & Qualité | S9 | 🔶 |
| 8 | Production & Documentation | S10 | ⬜ |

**Durée totale estimée : 10 semaines — Phases 0–6 terminées · Phase 7 en cours (93 tests, Lighthouse et volumétrie restants) · MVP complet disponible**

---

## Priorités si temps contraint

1. **Phases 0–6** ✅ → **MVP complet** : sessions, graphe interactif, saisie rapide, sauvegarde, undo/redo, KPIs animés, présentation plein écran, export PNG/SVG/Markdown/JSON, vue consolidée, référentiel et comparaison de sessions.
2. **Phase 7** → Tests, qualité, audit performance.
3. **Phase 8** → Déploiement production, documentation complète. L'outil est industrialisé.
