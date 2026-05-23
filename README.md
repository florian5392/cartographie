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
- **Export** : PNG, SVG, Markdown, JSON, Impression
- **Mode démo** : fonctionne sans backend (données hospitalières pré-chargées)
- **Périmètre mono-site ou multi-sites** : layout colonnes par établissement
- **Vue consolidée** : graphe fusionné de toutes les sessions avec filtre par session
- **Référentiel applicatif** : tableau filtrable (type, criticité, recherche texte) avec colonnes par établissement et export CSV
- **Comparaison de sessions** : diff apps/flux entre deux ateliers (ajouts, suppressions, communs)
- **Hébergement et portée** : champs supplémentaires sur chaque application (On-premise/Cloud/SaaS/Hybride, Etablissement/Groupe)

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Docker | 24+ |
| Docker Compose | v2 (plugin intégré) |
| Node.js | 20+ (dev uniquement) |
| npm | 9+ (dev uniquement) |

---

## Image Docker pré-construite

L'image est publiée automatiquement sur **GitHub Container Registry** à chaque push sur `main` :

```
ghcr.io/florian5392/cartographie:latest
```

Aucun build local nécessaire — le `docker-compose.yml` l'utilise directement.

---

## Démarrage rapide (Docker — recommandé)

### 1. Récupérer le fichier de configuration

Clonez le dépôt (pour avoir le `docker-compose.yml` et le script SQL d'initialisation) :

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
```

### 3. Lancer les services

```bash
docker compose up -d
```

L'image du dashboard est téléchargée automatiquement depuis `ghcr.io`. Trois services démarrent :

| Service | Port | Rôle |
|---------|------|------|
| `postgres` | 5432 | Base de données (accessible depuis DBeaver ou tout client SQL) |
| `postgrest` | 3001 (dev) / interne (prod) | API REST auto-générée |
| `dashboard` | 80 | Application React (image GHCR) |

Vérifiez que tout est sain :

```bash
docker compose ps
```

### 4. Accéder à l'outil

Ouvrez **http://localhost** dans votre navigateur.

> **Sans PostgREST joignable**, l'outil bascule automatiquement en **Mode démo** avec des données pré-chargées. Toutes les fonctionnalités sont disponibles, mais rien n'est persisté.

---

## Démarrage en mode développement

```bash
npm install
cp .env.example .env
docker compose up -d postgres postgrest
npm run dev
```

L'application démarre sur **http://localhost:3000** avec hot-reload.  
Le dev server proxifie `/api/*` vers PostgREST sur `http://localhost:3001`.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Navigateur                     │
│  React + React Flow + Zustand + Tailwind CSS     │
└────────────────────┬─────────────────────────────┘
                     │ HTTP /api/* (Nginx proxy)
                     ▼
┌──────────────────────────────────────────────────┐
│               PostgREST :3000                    │
│  API REST auto-générée depuis le schéma SQL      │
└────────────────────┬─────────────────────────────┘
                     │ SQL
                     ▼
┌──────────────────────────────────────────────────┐
│              PostgreSQL (interne)                │
│  Schéma api : Sessions · Applications · Flux     │
│               Établissements · Déploiements       │
│               Positions · sessions_view          │
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
- **PNG** : capture bitmap du graphe tel qu'affiché
- **SVG** : export vectoriel (qualité illimitée, éditable)
- **Markdown** : rapport complet — en-tête session, tableau des applications, tableau des flux, KPIs
- **JSON** : données brutes complètes (applications + flux + positions, réimportables)
- **Imprimer** : dialogue impression système

### Clôturer la session

Dans la barre du haut, cliquez sur le badge **● En cours** pour passer la session en **🔒 Terminée** :
- La session devient lecture seule (aucune modification accidentelle)
- Elle reste consultable depuis l'écran d'accueil

### Vue globale & Référentiel

Depuis l'écran d'accueil **Sessions**, deux boutons dans l'en-tête donnent accès aux vues de consolidation :

- **Vue globale** : graphe fusionné de toutes les sessions. Utilisez les pills en haut pour afficher ou masquer les éléments d'une session particulière. Cliquez un nœud pour mettre ses connexions en surbrillance.
- **Référentiel** : tableau de toutes les applications recensées. Filtrez par type ou criticité, effectuez une recherche texte, et exportez le résultat en CSV via le bouton dédié.

Pour **comparer deux sessions**, cochez les deux sessions souhaitées dans la liste (cases à cocher à gauche de chaque ligne), puis cliquez **Comparer les 2 sessions**. L'écran affiche le diff : applications absentes ou nouvelles, flux supprimés ou ajoutés, flux communs.

---

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `changeme` |

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

# Mettre à jour l'image dashboard (dernière version GHCR)
docker compose pull dashboard && docker compose up -d dashboard

# Voir les logs en temps réel
docker compose logs -f

# Arrêter sans supprimer les données
docker compose stop

# Arrêter et supprimer les conteneurs (données préservées dans les volumes)
docker compose down

# Supprimer complètement (ATTENTION : efface les données)
docker compose down -v

# Voir le statut des services
docker compose ps
```

### Construire l'image localement (développement)

Si vous modifiez le code source et souhaitez tester sans passer par GHCR :

```bash
# Remplacez temporairement dans docker-compose.yml :
#   image: ghcr.io/florian5392/cartographie:latest
# par :
#   build: .

docker compose up -d --build dashboard
```

---

## Déploiement derrière Cloudflare Tunnel

Le `docker-compose.yml` intègre nativement le support d'un réseau Cloudflare Tunnel externe. Le réseau est **optionnel** (requiert Docker Compose ≥ 2.22) : si la stack cloudflared n'est pas présente, le dashboard reste accessible via le port 80 local.

### Principe

```
Internet → Cloudflare → cloudflared (stack séparée)
                              │ réseau Docker externe
                              ▼
                        dashboard:80 (cette stack)
```

### 1. Stack cloudflared (autre dépôt / autre compose)

Votre stack cloudflared doit déclarer un réseau nommé explicitement :

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    networks:
      - tunnel

networks:
  tunnel:
    name: cloudflare_tunnel   # ce nom est référencé dans .env
```

Dans le dashboard Cloudflare (Zero Trust → Tunnels), pointez le service public vers :

```
http://dashboard:80
```

### 2. Configurer le nom du réseau

Dans `.env`, ajoutez (si différent de la valeur par défaut) :

```env
CLOUDFLARE_NETWORK_NAME=cloudflare_tunnel
```

### 3. Lancer

```bash
docker compose up -d
```

Seul `dashboard` rejoint le réseau Cloudflare. `postgres` et `postgrest` restent sur le réseau interne uniquement.

---

## Sauvegarde et restauration

### Sauvegarder la base PostgreSQL

```bash
docker compose exec postgres pg_dump -U postgres cartographie > backup_$(date +%Y%m%d).sql
```

### Restaurer

```bash
docker compose exec -T postgres psql -U postgres cartographie < backup_20250101.sql
```

### Automatiser avec cron

```bash
# Ajouter au crontab (crontab -e)
0 2 * * * cd /opt/cartographie && docker compose exec -T postgres pg_dump -U postgres cartographie > /opt/backups/carto_$(date +\%Y\%m\%d).sql
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

Dans `docker-compose.yml`, le service `postgrest` n'expose pas de port public — il communique uniquement sur le réseau interne Docker. Le dashboard Nginx proxifie `/api/` vers `postgrest:3000`.

### 3. Variables d'environnement de production

Ne committez jamais `.env`. Utilisez un gestionnaire de secrets (Vault, Docker Secrets, ou variables d'environnement système).

---

## Dépannage

**L'application affiche "Mode démo"**
→ PostgREST n'est pas joignable. Vérifiez que les services sont démarrés (`docker compose ps`). En mode développement, assurez-vous que PostgREST tourne (`docker compose up postgrest`) et que le dev server a bien été relancé après le démarrage.

**Le graphe ne s'affiche pas**
→ Vérifiez la console navigateur (F12). Si des erreurs réseau apparaissent, assurez-vous que les services sont démarrés et que le proxy Nginx fonctionne correctement.

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
| Backend API | PostgREST |
| Base de données | PostgreSQL 15 |
| Serveur web | Nginx Alpine |
| Conteneurisation | Docker + Docker Compose |
