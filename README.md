# Cartographie SI — Atelier

Outil d'atelier de cartographie applicative en temps réel.  
Conçu pour animer des séances de recensement du SI : saisie rapide des applications, traçage des flux, visualisation graphe projetée sur écran.

---

## Fonctionnalités

- **Graphe interactif** : nœuds applicatifs, arêtes flux, drag-and-drop, zoom/pan
- **Saisie rapide** : formulaire optimisé clavier, autocomplétion, ≤ 5 secondes par application
- **Mode multi-sessions** : créer, reprendre, dupliquer des sessions d'atelier
- **Sauvegarde automatique** : toutes les 30 secondes, indicateur visuel
- **Undo / Redo** : historique 50 actions (Ctrl+Z / Ctrl+Shift+Z)
- **Mode présentation** : graphe plein écran, KPIs en overlay, pointeur laser
- **Export** : PNG, Markdown, JSON
- **Mode démo** : fonctionne sans backend (données hospitalières pré-chargées)
- **Périmètre mono-site ou multi-sites** : layout colonnes par établissement

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Docker | 24+ |
| Docker Compose | v2 (plugin intégré) |
| Node.js | 20+ (dev uniquement) |
| npm | 9+ (dev uniquement) |

---

## Démarrage rapide (Docker — recommandé)

### 1. Cloner le dépôt

```bash
git clone https://github.com/florian5392/cartographie.git
cd cartographie
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```

Éditez `.env` :

```env
# Mot de passe PostgreSQL (changez en production)
POSTGRES_PASSWORD=mon_mot_de_passe_securise

# Secret JWT NocoDB (changez en production)
NC_JWT_SECRET=mon_secret_jwt_long_et_aleatoire

# Ces variables sont injectées dans le build React
VITE_NOCODB_URL=http://localhost:8080
VITE_NOCODB_TOKEN=           # à remplir après étape 4
VITE_NOCODB_BASE_ID=         # à remplir après étape 4
```

### 3. Lancer les services

```bash
docker compose up -d
```

Trois services démarrent :

| Service | Port | Rôle |
|---------|------|------|
| `postgres` | — (interne) | Base de données |
| `nocodb` | 8080 | API REST + interface d'administration |
| `dashboard` | 80 | Application React (interface atelier) |

Vérifiez que tout est sain :

```bash
docker compose ps
```

### 4. Configurer NocoDB

Ouvrez **http://localhost:8080** dans votre navigateur.

1. Créez un compte administrateur (premier lancement uniquement)
2. Créez une nouvelle **Base** nommée `cartographie`
3. Allez dans **Team & Auth → API Tokens → Add token** → copiez le token
4. Notez l'**ID de la base** visible dans l'URL : `http://localhost:8080/nc/{BASE_ID}/...`

Renseignez ces valeurs dans `.env` :

```env
VITE_NOCODB_TOKEN=votre_token
VITE_NOCODB_BASE_ID=votre_base_id
```

### 5. Créer les tables et injecter les données de démo

```bash
chmod +x scripts/setup-nocodb.sh
NOCODB_URL=http://localhost:8080 \
NOCODB_TOKEN=votre_token \
bash scripts/setup-nocodb.sh
```

Le script crée les 6 tables (Sessions, Applications, Flux, Établissements, Déploiements, Positions) et injecte un jeu de données hospitalier de démonstration.

### 6. Rebuilder le dashboard avec les variables d'environnement

```bash
docker compose up -d --build dashboard
```

### 7. Accéder à l'outil

Ouvrez **http://localhost** dans votre navigateur.

> **Sans NocoDB configuré**, l'outil bascule automatiquement en **Mode démo** avec des données pré-chargées. Toutes les fonctionnalités sont disponibles, mais rien n'est persisté.

---

## Démarrage en mode développement

```bash
npm install
cp .env.example .env   # renseigner les variables si NocoDB est disponible
npm run dev
```

L'application démarre sur **http://localhost:3000** avec hot-reload.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Navigateur                     │
│  React + React Flow + Zustand + Tailwind CSS     │
└────────────────────┬─────────────────────────────┘
                     │ HTTP (API REST)
                     ▼
┌──────────────────────────────────────────────────┐
│                   NocoDB :8080                   │
│  API REST auto-générée · Interface d'admin       │
└────────────────────┬─────────────────────────────┘
                     │ SQL
                     ▼
┌──────────────────────────────────────────────────┐
│              PostgreSQL (interne)                │
│  6 tables : Sessions · Applications · Flux       │
│             Établissements · Déploiements         │
│             Positions                            │
└──────────────────────────────────────────────────┘
```

---

## Utilisation — Guide de l'animateur

### Préparer une session

1. Ouvrez l'outil → écran d'accueil **Sessions**
2. Cliquez **+ Créer** → renseignez :
   - **Nom** : ex. "Atelier cartographie SI — Juin 2025"
   - **Périmètre** : *Mono-site* (un seul établissement) ou *Multi-sites*
   - **Établissement cible** (mono-site) : nom de la structure
   - **Pré-charger les apps** : cochez pour repartir d'une cartographie existante
3. Cliquez **Créer et ouvrir**

### Déroulement de l'atelier

#### Panneau gauche — Saisie rapide

**Onglet Applications** (F1) :
- Tapez le nom → autocomplétion sur les apps déjà connues
- Sélectionnez le **type** (pill) et la **criticité** (bouton rouge/orange/gris)
- Appuyez sur **Entrée** ou cliquez **Ajouter**
- L'application apparaît instantanément sur le graphe
- Double-cliquez un nœud pour modifier une application

**Onglet Flux** (F2) :
- Sélectionnez **Source** puis **Cible** dans les dropdowns
- Choisissez le **type de flux** (pill coloré) et la **fréquence**
- Cliquez **Tracer** (ou Entrée)
- Le type et la fréquence sont mémorisés pour l'entrée suivante
- Vous pouvez aussi **connecter deux nœuds à la souris** en tirant depuis le bas d'un nœud vers le haut d'un autre

**Onglet Établissements** (F3, multi-sites uniquement) :
- Créez les établissements avec leur couleur
- Assignez les applications à leurs établissements → les nœuds affichent des pastilles de couleur

#### Zone graphe

| Action | Résultat |
|--------|----------|
| Clic sur un nœud | Surbrillance des connexions |
| Double-clic sur un nœud | Ouvre l'édition dans le panneau |
| Double-clic sur le fond | Ouvre l'onglet Applications |
| Drag d'un nœud | Repositionne, sauvegardé automatiquement |
| Suppr / Backspace | Supprime la sélection (avec confirmation) |
| Espace | Recadre sur tout le graphe |
| Ctrl+Z / Ctrl+Shift+Z | Annuler / Rétablir |
| F11 | Mode présentation plein écran |

### Mode présentation

Cliquez **Présenter** dans la barre du haut (ou F11) :
- Le panneau de saisie disparaît, le graphe prend tout l'écran
- Les KPIs restent visibles en haut
- Bougez la souris → **pointeur laser** rouge (touche **L** pour changer la couleur)
- **Échap** pour revenir à la saisie

### Exporter les résultats

Cliquez **Exporter** dans la barre du haut :
- **PNG** : capture du graphe tel qu'affiché (nécessite html-to-image)
- **Markdown** : tableau des applications + tableau des flux (pour compte-rendu)
- **JSON** : données complètes (réimportables)
- **Imprimer** : dialogue impression système

### Clôturer la session

Dans la barre du haut, cliquez sur le badge **● En cours** pour passer la session en **🔒 Terminée** :
- La session devient lecture seule (aucune modification accidentelle)
- Elle reste consultable depuis l'écran d'accueil

---

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `VITE_NOCODB_URL` | URL du serveur NocoDB | `http://localhost:8080` |
| `VITE_NOCODB_TOKEN` | Token API NocoDB | *(vide — mode démo)* |
| `VITE_NOCODB_BASE_ID` | ID de la base NocoDB | *(vide — mode démo)* |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `nocodb_secret` |
| `NC_JWT_SECRET` | Secret JWT NocoDB | `change_me_in_production` |

---

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| F1 | Onglet Applications |
| F2 | Onglet Flux |
| F3 | Onglet Établissements |
| F11 | Mode présentation |
| Espace | Recadrer le graphe (fit-to-view) |
| Ctrl+Z | Annuler |
| Ctrl+Shift+Z | Rétablir |
| Suppr / Backspace | Supprimer la sélection |
| Échap | Quitter le mode présentation |
| L | Changer la couleur du laser (mode présentation) |
| Entrée | Valider un formulaire |

---

## Commandes Docker utiles

```bash
# Démarrer tous les services
docker compose up -d

# Voir les logs en temps réel
docker compose logs -f

# Arrêter sans supprimer les données
docker compose stop

# Arrêter et supprimer les conteneurs (données préservées dans les volumes)
docker compose down

# Supprimer complètement (ATTENTION : efface les données)
docker compose down -v

# Rebuilder l'image dashboard après modification du .env ou du code
docker compose up -d --build dashboard

# Voir le statut des services
docker compose ps
```

---

## Sauvegarde et restauration

### Sauvegarder la base PostgreSQL

```bash
docker compose exec postgres pg_dump -U nocodb nocodb > backup_$(date +%Y%m%d).sql
```

### Restaurer

```bash
docker compose exec -T postgres psql -U nocodb nocodb < backup_20250101.sql
```

### Automatiser avec cron

```bash
# Ajouter au crontab (crontab -e)
0 2 * * * cd /opt/cartographie && docker compose exec -T postgres pg_dump -U nocodb nocodb > /opt/backups/carto_$(date +\%Y\%m\%d).sql
# Garder 7 jours
0 3 * * * find /opt/backups -name 'carto_*.sql' -mtime +7 -delete
```

---

## Déploiement en production

### 1. HTTPS avec Nginx + Certbot (hors Docker)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d cartographie.mondomaine.fr
```

Modifiez `nginx.conf` pour ajouter le bloc HTTPS et rediriger HTTP → HTTPS.

### 2. Exposer uniquement le dashboard

Dans `docker-compose.yml`, retirez le port `8080:8080` de NocoDB pour que l'API ne soit accessible que depuis le réseau interne Docker. Ajoutez un proxy Nginx vers NocoDB si nécessaire depuis l'app.

### 3. Variables d'environnement de production

Ne committez jamais `.env`. Utilisez un gestionnaire de secrets (Vault, Docker Secrets, ou variables d'environnement système).

---

## Dépannage

**L'application affiche "Mode démo"**
→ NocoDB n'est pas joignable. Vérifiez que le service `nocodb` est démarré (`docker compose ps`) et que `VITE_NOCODB_TOKEN` et `VITE_NOCODB_BASE_ID` sont renseignés dans `.env`, puis rebuildez le dashboard.

**Les tables n'existent pas dans NocoDB**
→ Relancez `scripts/setup-nocodb.sh` avec les bonnes variables d'environnement.

**Le graphe ne s'affiche pas**
→ Vérifiez la console navigateur (F12). Si des erreurs CORS apparaissent, assurez-vous que `VITE_NOCODB_URL` pointe vers l'URL accessible depuis le navigateur (pas `nocodb:8080` qui est interne Docker).

**Les positions ne sont pas sauvegardées**
→ L'autosave se déclenche toutes les 30 secondes. Le bouton "Sauv." dans le bas du panneau force une sauvegarde immédiate. En mode démo, rien n'est persisté.

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18 + Vite |
| Graphe | React Flow 11 |
| État | Zustand |
| Style | Tailwind CSS |
| API client | Axios |
| Backend API | NocoDB (no-code) |
| Base de données | PostgreSQL 15 |
| Serveur web | Nginx Alpine |
| Conteneurisation | Docker + Docker Compose |
