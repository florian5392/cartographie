-- Role for PostgREST anonymous access
CREATE ROLE web_anon NOLOGIN;

-- Schema
CREATE SCHEMA IF NOT EXISTS api;
GRANT USAGE ON SCHEMA api TO web_anon;

-- Sessions
CREATE TABLE api.sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  nom TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  perimetre TEXT NOT NULL DEFAULT 'mono-site',
  statut TEXT NOT NULL DEFAULT 'en cours',
  etablissement_cible TEXT
);

-- Etablissements
CREATE TABLE api.etablissements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  nom TEXT NOT NULL,
  couleur TEXT DEFAULT '#6b7280'
);

-- Applications
CREATE TABLE api.applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  session_id TEXT REFERENCES api.sessions(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type TEXT,
  editeur TEXT,
  version TEXT,
  criticite TEXT DEFAULT 'basse',
  perimetre TEXT,
  statut TEXT DEFAULT 'production',
  description TEXT,
  couleur TEXT,
  responsable TEXT,
  hebergement TEXT,
  portee TEXT
);
-- Migration pour bases existantes :
-- ALTER TABLE api.applications ADD COLUMN IF NOT EXISTS hebergement TEXT;
-- ALTER TABLE api.applications ADD COLUMN IF NOT EXISTS portee TEXT;
-- ALTER TABLE api.applications ADD COLUMN IF NOT EXISTS session_id TEXT REFERENCES api.sessions(id) ON DELETE CASCADE;

-- Flux
CREATE TABLE api.flux (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  session_id TEXT REFERENCES api.sessions(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES api.applications(id) ON DELETE CASCADE,
  cible_id TEXT REFERENCES api.applications(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'API',
  label TEXT,
  description TEXT,
  frequence TEXT,
  critique BOOLEAN DEFAULT FALSE
);

-- Deploiements
CREATE TABLE api.deploiements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  session_id TEXT REFERENCES api.sessions(id) ON DELETE CASCADE,
  application_id TEXT REFERENCES api.applications(id) ON DELETE CASCADE,
  etablissement_id TEXT REFERENCES api.etablissements(id) ON DELETE CASCADE,
  environnement TEXT DEFAULT 'production'
);

-- Positions — composite PK for PostgREST upsert
CREATE TABLE api.positions (
  session_id TEXT REFERENCES api.sessions(id) ON DELETE CASCADE,
  application_id TEXT REFERENCES api.applications(id) ON DELETE CASCADE,
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, application_id)
);

-- View: sessions with flux and app counts
CREATE VIEW api.sessions_view AS
SELECT
  s.id, s.nom, s.date, s.perimetre, s.statut, s.etablissement_cible,
  COALESCE(fc.flux_count, 0) AS flux_count,
  COALESCE(ac.app_count, 0) AS app_count
FROM api.sessions s
LEFT JOIN (
  SELECT session_id, COUNT(*) AS flux_count FROM api.flux GROUP BY session_id
) fc ON fc.session_id = s.id
LEFT JOIN (
  SELECT session_id, COUNT(*) AS app_count FROM api.applications WHERE session_id IS NOT NULL GROUP BY session_id
) ac ON ac.session_id = s.id;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA api TO web_anon;
GRANT SELECT ON api.sessions_view TO web_anon;
