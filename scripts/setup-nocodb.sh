#!/usr/bin/env bash
# setup-nocodb.sh — Creates NocoDB tables and seeds demo data
# Usage: NOCODB_URL=http://localhost:8080 NOCODB_TOKEN=<token> ./scripts/setup-nocodb.sh

set -euo pipefail

NOCODB_URL="${NOCODB_URL:-http://localhost:8080}"
NOCODB_TOKEN="${NOCODB_TOKEN:-}"

if [ -z "$NOCODB_TOKEN" ]; then
  echo "Error: NOCODB_TOKEN is required."
  echo "Usage: NOCODB_URL=http://localhost:8080 NOCODB_TOKEN=<token> $0"
  exit 1
fi

BASE_ID="${NOCODB_BASE_ID:-}"

# Helper: authenticated curl
nc_curl() {
  curl -s -H "xc-token: ${NOCODB_TOKEN}" -H "Content-Type: application/json" "$@"
}

echo "==> Connecting to NocoDB at ${NOCODB_URL}..."

# Retrieve first base if BASE_ID not set
if [ -z "$BASE_ID" ]; then
  echo "==> Fetching available bases..."
  BASES=$(nc_curl --max-time 10 "${NOCODB_URL}/api/v1/db/meta/projects/")
  if [ -z "$BASES" ]; then
    echo "Error: No response from NocoDB. Check NOCODB_URL and that the server is running."
    exit 1
  fi
  # Support both compact JSON ("id":"...") and spaced JSON ("id": "...")
  BASE_ID=$(echo "$BASES" | grep -o '"id": *"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"' || true)
  if [ -z "$BASE_ID" ]; then
    echo "Error: Could not determine BASE_ID from response: ${BASES}"
    echo "       Set NOCODB_BASE_ID env var to bypass auto-detection."
    exit 1
  fi
  echo "    Using base: ${BASE_ID}"
  echo "    Tip: set NOCODB_BASE_ID=${BASE_ID} to target a specific base next time."
fi

API_BASE="${NOCODB_URL}/api/v1/db/meta/projects/${BASE_ID}"

# Create a table — echo to stderr so it doesn't pollute the captured return value
create_table() {
  local TABLE_NAME="$1"
  local FIELDS_JSON="$2"
  echo "==> Creating table: ${TABLE_NAME}" >&2
  local RESP
  RESP=$(nc_curl -X POST "${API_BASE}/tables" -d "{\"title\": \"${TABLE_NAME}\", \"columns\": ${FIELDS_JSON}}")
  local TID
  TID=$(echo "$RESP" | grep -o '"id": *"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"' || true)
  if [ -z "$TID" ]; then
    echo "Error creating table '${TABLE_NAME}'. API response: ${RESP}" >&2
    exit 1
  fi
  echo "$TID"
}

# ---- Sessions ----
SESSIONS_TABLE_ID=$(create_table "Sessions" '[
  {"title": "nom", "uidt": "SingleLineText"},
  {"title": "date", "uidt": "Date"},
  {"title": "perimetre", "uidt": "SingleLineText"},
  {"title": "etablissementCible", "uidt": "SingleLineText"},
  {"title": "statut", "uidt": "SingleLineText"}
]')
echo "    Sessions table id: ${SESSIONS_TABLE_ID}"

# ---- Etablissements ----
ETAB_TABLE_ID=$(create_table "Etablissements" '[
  {"title": "nom", "uidt": "SingleLineText"},
  {"title": "couleur", "uidt": "SingleLineText"},
  {"title": "description", "uidt": "LongText"}
]')
echo "    Etablissements table id: ${ETAB_TABLE_ID}"

# ---- Applications ----
APPS_TABLE_ID=$(create_table "Applications" '[
  {"title": "nom", "uidt": "SingleLineText"},
  {"title": "type", "uidt": "SingleLineText"},
  {"title": "editeur", "uidt": "SingleLineText"},
  {"title": "version", "uidt": "SingleLineText"},
  {"title": "criticite", "uidt": "SingleLineText"},
  {"title": "description", "uidt": "LongText"},
  {"title": "responsable", "uidt": "SingleLineText"},
  {"title": "statut", "uidt": "SingleLineText"},
  {"title": "couleur", "uidt": "SingleLineText"}
]')
echo "    Applications table id: ${APPS_TABLE_ID}"

# ---- Deploiements ----
DEPLOY_TABLE_ID=$(create_table "Deploiements" '[
  {"title": "sessionId", "uidt": "SingleLineText"},
  {"title": "applicationId", "uidt": "SingleLineText"},
  {"title": "etablissementId", "uidt": "SingleLineText"},
  {"title": "environnement", "uidt": "SingleLineText"}
]')
echo "    Deploiements table id: ${DEPLOY_TABLE_ID}"

# ---- Flux ----
FLUX_TABLE_ID=$(create_table "Flux" '[
  {"title": "sessionId", "uidt": "SingleLineText"},
  {"title": "sourceId", "uidt": "SingleLineText"},
  {"title": "cibleId", "uidt": "SingleLineText"},
  {"title": "type", "uidt": "SingleLineText"},
  {"title": "label", "uidt": "SingleLineText"},
  {"title": "description", "uidt": "LongText"},
  {"title": "frequence", "uidt": "SingleLineText"},
  {"title": "volume", "uidt": "SingleLineText"},
  {"title": "critique", "uidt": "Checkbox"}
]')
echo "    Flux table id: ${FLUX_TABLE_ID}"

# ---- Positions ----
POSITIONS_TABLE_ID=$(create_table "Positions" '[
  {"title": "sessionId", "uidt": "SingleLineText"},
  {"title": "applicationId", "uidt": "SingleLineText"},
  {"title": "x", "uidt": "Number"},
  {"title": "y", "uidt": "Number"}
]')
echo "    Positions table id: ${POSITIONS_TABLE_ID}"

echo ""
echo "==> All tables created successfully!"
echo ""
echo "==> Seeding demo data..."

DATA_API="${NOCODB_URL}/api/v1/db/data/noco/${BASE_ID}"

# Seed session
nc_curl -X POST "${DATA_API}/${SESSIONS_TABLE_ID}" -d '{
  "nom": "Atelier Démo — Mai 2024",
  "date": "2024-05-15",
  "perimetre": "multi-sites",
  "statut": "en cours"
}' > /dev/null
echo "    Seeded demo session."

# Seed etablissements
nc_curl -X POST "${DATA_API}/${ETAB_TABLE_ID}" -d '{"nom": "CHU Central", "couleur": "#3b82f6"}' > /dev/null
nc_curl -X POST "${DATA_API}/${ETAB_TABLE_ID}" -d '{"nom": "Clinique Sud", "couleur": "#22c55e"}' > /dev/null
echo "    Seeded 2 etablissements."

# Seed applications
for APP in \
  '{"nom":"SAP ERP","type":"ERP","editeur":"SAP","criticite":"haute","statut":"production","couleur":"#3b82f6"}' \
  '{"nom":"Mediboard","type":"DPI","editeur":"Mediboard","criticite":"haute","statut":"production","couleur":"#ef4444"}' \
  '{"nom":"PACS","type":"Imagerie","editeur":"Sectra","criticite":"haute","statut":"production","couleur":"#8b5cf6"}' \
  '{"nom":"Messagerie Exchange","type":"Messagerie","editeur":"Microsoft","criticite":"moyenne","statut":"production","couleur":"#0ea5e9"}' \
  '{"nom":"Annuaire LDAP","type":"Annuaire","editeur":"OpenLDAP","criticite":"haute","statut":"production","couleur":"#f59e0b"}' \
  '{"nom":"DPI Web","type":"DPI","editeur":"McKesson","criticite":"haute","statut":"production","couleur":"#10b981"}' \
  '{"nom":"BI Tableau","type":"BI","editeur":"Salesforce","criticite":"basse","statut":"production","couleur":"#6366f1"}' \
  '{"nom":"Orbis","type":"SIH","editeur":"Dedalus","criticite":"haute","statut":"production","couleur":"#f97316"}'; do
  nc_curl -X POST "${DATA_API}/${APPS_TABLE_ID}" -d "$APP" > /dev/null
done
echo "    Seeded 8 applications."

echo ""
echo "==> Setup complete!"
echo "    Update your .env with:"
echo "    VITE_NOCODB_BASE_ID=${BASE_ID}"
