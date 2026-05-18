# Plan de Développement — Cartographie Applicative SI v3 (Atelier)

**Projet** : Outil d'atelier de cartographie applicative en temps réel
**Stack** : React + React Flow / NocoDB + PostgreSQL / Docker / Nginx
**Durée estimée** : 10 semaines

---

## Phase 0 — Setup & Fondations (Semaine 1) ✅

### 0.1 — Initialisation du projet

- [x] Créer le dépôt Git (privé)
- [x] Initialiser le projet React (Vite + plugin-react)
- [x] Installer les dépendances : `reactflow`, `axios`, `tailwindcss`, `zustand`
- [x] Configurer ESLint
- [x] Créer `.gitignore`, `.env.example` documenté (`VITE_NOCODB_URL`, `VITE_NOCODB_TOKEN`, `VITE_NOCODB_BASE_ID`)
- [x] Arborescence complète créée : `src/api/`, `src/hooks/`, `src/stores/`, `src/components/graph|panel|session/`, `src/data/`

### 0.2 — Docker & infrastructure locale

- [x] `docker-compose.yml` : 3 services (postgres:15-alpine, nocodb:latest, dashboard) avec healthchecks et `restart: unless-stopped`
- [x] `Dockerfile` multi-stage : build Vite → image Nginx Alpine
- [x] `nginx.conf` : SPA fallback (`try_files`), gzip, cache 1 an sur les assets, headers sécurité (X-Frame-Options, X-Content-Type-Options)
- [ ] Valider `docker compose up -d` sur les 3 services *(à tester en environnement cible)*

### 0.3 — Modèle de données NocoDB

- [x] 6 tables définies : Sessions, Établissements, Applications, Déploiements, Flux, Positions
- [x] `scripts/setup-nocodb.sh` : création des tables via API REST NocoDB + injection des données démo (idempotent, paramétrable via `NOCODB_URL` / `NOCODB_TOKEN`)
- [ ] Générer un API Token NocoDB et documenter la procédure *(procédure dans `.env.example`)*

**Livrable** : Environnement local défini, modèle 6 tables, script de seed.

---

## Phase 1 — Client API & Mode Démo (Semaine 2) ✅

### 1.1 — Client API NocoDB (`src/api/nocodb.js`)

- [x] CRUD Applications : `getApplications()`, `createApplication()`, `updateApplication()`, `deleteApplication()`
- [x] CRUD Flux : `getFlux(sessionId?)`, `createFlux()`, `updateFlux()`, `deleteFlux()`
- [x] CRUD Établissements : `getEtablissements()`, `createEtablissement()`
- [x] CRUD Déploiements : `getDeploiements(sessionId?)`, `createDeploiement()`, `deleteDeploiement()`
- [x] CRUD Sessions : `getSessions()`, `createSession()`, `updateSession()`
- [x] CRUD Positions : `getPositions(sessionId)`, `savePositions(sessionId, positions)` (upsert par applicationId)
- [x] Retry exponentiel sur erreurs réseau (3 tentatives : 1 s → 2 s → 4 s, pas de retry sur 4xx)
- [x] `isNocoDBReachable()` : retourne `true` si le serveur répond (même 4xx), `false` si injoignable

### 1.2 — Mode démo (`src/data/demoData.js`)

- [x] 2 établissements : CHU Central, Clinique Sud
- [x] 8 applications (contexte SI hospitalier FR) : SAP ERP, Mediboard, PACS, Messagerie Exchange, Annuaire LDAP, DPI Web, BI Tableau, Orbis
- [x] 10 flux typés (API, Fichier, BDD, EDI, Manuel) avec description, fréquence, flag critique
- [x] 1 session démo multi-sites avec positions et déploiements
- [x] Switch automatique dans `initStore()` si NocoDB injoignable
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
- [x] Mini-map toggleable via bouton Panel en haut à droite

### 3.2 — Nœuds applicatifs (`AppNode.jsx`)

- [x] Nom de l'app en 15px bold, sous-titre type, éditeur en gris
- [x] Bordure gauche colorée selon criticité : rouge (haute), orange (moyenne), gris (basse)
- [x] Badge périmètre (Global / Multi-sites / Local) affiché uniquement en mode multi-sites
- [x] Pastilles couleur des établissements déployés (via `appEtabsMap` calculé depuis les déploiements)
- [x] Badge statut (production / recette / pilote) en coin droit
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

## Phase 4 — Panneau de Saisie Rapide (Semaine 6)

### 4.1 — Onglet Application (`QuickAddApp.jsx`)

- [ ] Formulaire minimaliste :
  - Nom avec autocomplétion sur les apps existantes
  - Type (boutons-pills : ERP, CRM, Métier, Messagerie, Annuaire, Autre)
  - Criticité (3 boutons visuels : Haute 🔴, Moyenne 🟠, Basse ⚪)
  - Périmètre (Global / Multi-sites / Local — uniquement en multi-sites)
  - Description (textarea optionnel, replié par défaut)
- [ ] Raccourci Entrée = ajouter
- [ ] Après ajout : formulaire vidé, focus remis sur le champ Nom
- [ ] Objectif : saisie complète en < 5 secondes
- [ ] Mode édition : même formulaire pré-rempli sur double-clic d'un nœud existant

### 4.2 — Onglet Flux (`QuickAddFlux.jsx`)

- [ ] Source : dropdown des apps de la session OU clic sur un nœud du graphe
- [ ] Cible : idem
- [ ] Type (boutons-pills : API, Fichier, BDD, EDI, Manuel, Autre)
- [ ] Description courte (optionnel)
- [ ] Fréquence (boutons : Temps réel, Quotidien, Hebdomadaire, Ponctuel)
- [ ] Après ajout : source et cible vidés, type conservé

### 4.3 — Onglet Établissement (`QuickAddEtablissement.jsx`)

- [ ] Affiché uniquement en mode multi-sites
- [ ] Ajouter un établissement : nom + couleur (palette prédéfinie)
- [ ] Affecter une app à un établissement : dropdown app + dropdown établissement + "Déployer"
- [ ] Liste des déploiements existants avec suppression

### 4.4 — Navigation entre onglets

- [ ] Raccourcis clavier : F1 = App, F2 = Flux, F3 = Établissement
- [ ] L'onglet actif est mémorisé

**Livrable** : Saisie rapide complète, optimisée clavier, réactive instantanément dans le graphe.

---

## Phase 5 — KPIs, Mode Présentation & Export (Semaine 7)

### 5.1 — Barre de KPIs (`KpiBar.jsx`)

- [ ] 4 indicateurs en mode mono-site : Apps recensées, Flux tracés, Apps critiques, Couverture (% apps avec ≥ 1 flux)
- [ ] 5e indicateur en mode multi-sites : Établissements couverts
- [ ] Mise à jour instantanée à chaque ajout/suppression
- [ ] Animation de transition sur les chiffres (count-up)

### 5.2 — Mode Présentation (`PresentationMode.jsx`)

- [ ] Bouton "Présenter" ou raccourci F11
- [ ] Masque le panneau de saisie → graphe en plein écran
- [ ] KPIs toujours visibles en overlay discret en haut
- [ ] Navigation : zoom/pan, clic sur nœud pour surbrillance
- [ ] Bouton "Quitter" ou touche Échap pour revenir
- [ ] Curseur laser : point coloré qui suit la souris (touche L pour changer la couleur)

### 5.3 — Export (`ExportPanel.jsx`)

- [ ] Export image PNG/SVG du graphe (html-to-image)
- [ ] Export rapport Markdown : en-tête session, tableau apps, tableau flux, KPIs
- [ ] Export JSON brut (applications + flux + positions)
- [ ] Export impression (window.print())

**Livrable** : KPIs en direct, mode plein écran pour la revue collective, export post-séance.

---

## Phase 6 — Fusion & Consolidation Multi-Sessions (Semaine 8)

### 6.1 — Vue consolidée

- [ ] Écran "Cartographie globale" accessible depuis l'accueil
- [ ] Agrège toutes les sessions terminées en une seule vue
- [ ] Dédoublonnage des applications (même id = même nœud)
- [ ] Fusion des flux issus de différentes sessions
- [ ] Layout multi-sites complet

### 6.2 — Comparaison de sessions

- [ ] Sélectionner 2 sessions → afficher les différences (apps et flux ajoutés/supprimés)
- [ ] Utile pour mesurer la progression entre deux ateliers

### 6.3 — Vue tableau (référentiel)

- [ ] Tableau consolidé : Nom, Type, Périmètre, Criticité + colonnes dynamiques par établissement (✓/✗)
- [ ] Tri, recherche, filtres
- [ ] Export CSV

**Livrable** : Vision globale consolidée, comparaison inter-sessions.

---

## Phase 7 — Tests & Qualité (Semaine 9)

### 7.1 — Tests unitaires

- [ ] Client API : mock des appels NocoDB (CRUD 6 tables)
- [ ] Store session : ajout/suppression/modification d'apps et flux
- [ ] Hook undo/redo : enchaînement d'actions et annulations
- [ ] Hook autosave : déclenchement, diff de sync, file d'attente offline
- [ ] Fonctions de layout : positionnement des nœuds

### 7.2 — Tests d'intégration

- [ ] Scénario atelier complet : créer session → ajouter 5 apps → tracer 4 flux → déplacer nœuds → sauvegarder → recharger → vérifier données + positions
- [ ] Undo/redo sur 10 actions consécutives
- [ ] Mode démo : NocoDB coupé → fallback fonctionnel
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
- [ ] NocoDB non exposé publiquement (réseau Docker interne)
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
- [ ] Guide admin : gestion NocoDB, backup, mise à jour
- [ ] FAQ : ajout d'app, gestion des sessions, exports

**Livrable** : Application en production, documentée, prête pour les premiers ateliers.

---

## Récapitulatif

| Phase | Contenu | Semaine | Statut |
|-------|---------|---------|--------|
| 0 | Setup & Fondations | S1 | ✅ |
| 1 | Client API & Mode Démo | S2 | ✅ |
| 2 | Gestion des Sessions | S3 | ✅ |
| 3 | Vue Graphe Temps Réel | S4–S5 | ✅ |
| 4 | Panneau de Saisie Rapide | S6 | ⬜ |
| 5 | KPIs, Présentation & Export | S7 | ⬜ |
| 6 | Fusion & Consolidation | S8 | ⬜ |
| 7 | Tests & Qualité | S9 | ⬜ |
| 8 | Production & Documentation | S10 | ⬜ |

**Durée totale estimée : 10 semaines — 5 semaines réalisées (Phases 0–3)**

---

## Priorités si temps contraint

1. **Phases 0 + 1 + 3 + 4** ✅ (0, 1 faits) → MVP atelier : saisir des apps et flux en live.
2. **Phase 2** ✅ → Sessions et autosave. L'outil est fiable pour un usage récurrent.
3. **Phase 5** → KPIs et export. L'outil produit des livrables post-séance.
4. **Phases 6–8** → Consolidation, tests, prod. L'outil est industrialisé.
