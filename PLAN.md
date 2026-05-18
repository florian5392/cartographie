# Plan de Développement — Cartographie Applicative SI v3 (Atelier)

**Projet** : Outil d'atelier de cartographie applicative en temps réel
**Stack** : React + React Flow / NocoDB + PostgreSQL / Docker / Nginx
**Durée estimée** : 10 semaines

---

## Phase 0 — Setup & Fondations (Semaine 1)

### 0.1 — Initialisation du projet

- [x] Créer le dépôt Git (privé)
- [x] Initialiser le projet React (Vite recommandé pour la vitesse de build)
- [x] Installer les dépendances : `reactflow`, `axios`, `tailwindcss`
- [x] Mettre en place ESLint + Prettier
- [x] Créer `.gitignore`, `.env.example` documenté
- [x] Définir l'arborescence du projet

### 0.2 — Docker & infrastructure locale

- [x] Rédiger `docker-compose.yml` : 3 services (postgres, nocodb, dashboard)
- [x] Écrire le Dockerfile (build React + Nginx)
- [x] Configurer `nginx.conf` (SPA fallback, gzip, headers cache)

### 0.3 — Modèle de données NocoDB

- [x] Créer les 6 tables : Sessions, Établissements, Applications, Déploiements, Flux, Positions
- [x] Écrire `scripts/setup-nocodb.sh`

## Phase 1 — Client API & Mode Démo (Semaine 2)

### 1.1 — Client API NocoDB

- [x] CRUD Applications, Flux, Établissements, Déploiements, Sessions, Positions
- [x] Gestion pagination, erreurs réseau, retries

### 1.2 — Mode démo (fallback)

- [x] Jeu de données statique : 2 établissements, 8 applications, 10 flux, 1 session exemple
- [x] Switch automatique si NocoDB injoignable
- [x] Badge "Mode démo" visible à l'écran

### 1.3 — State management local

- [x] Store Zustand avec toutes les actions
- [x] Historique undo/redo (50 actions)

## Phases suivantes

- [ ] Phase 2 — Gestion des Sessions (S3)
- [ ] Phase 3 — Vue Graphe Temps Réel (S4-S5)
- [ ] Phase 4 — Panneau de Saisie Rapide (S6)
- [ ] Phase 5 — KPIs, Présentation & Export (S7)
- [ ] Phase 6 — Fusion & Consolidation (S8)
- [ ] Phase 7 — Tests & Qualité (S9)
- [ ] Phase 8 — Production & Documentation (S10)
