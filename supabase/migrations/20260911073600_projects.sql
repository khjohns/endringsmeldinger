-- Flyttet fra backend/migrations/004_projects_table.sql 2026-09-20 (DA-03).
-- Migrasjonsmappa skal være eneste kilde; den gamle mappa kunne ikke
-- kjøres fra filnavnrekkefølge, og fire av filene der var likevel
-- nødvendige for å bygge basen. Policyene er gjort idempotente.
-- Backfill-seksjonen er utelatt: den er et nullsteg mot kjerneskjemaet, som
-- allerede oppretter prosjekt_id som NOT NULL. Den inneholdt dessuten
-- ALTER COLUMN prosjekt_id SET DEFAULT 'oslobygg' — en defaultverdi
-- 20260920053427 uansett fjerner, og som AGENTS.md er uttrykkelig om at
-- ikke skal gjeninnføres. Å bære den videre er ren risiko uten virkning.
--

-- ============================================================
-- Projects Table - Multi-Project Support (Fase 1)
--
-- Enables organizations to manage multiple isolated projects.
-- Each project has its own set of cases (sak_metadata).
--
-- Architecture: Projects are top-level entities. All case data
-- is scoped to a project via sak_metadata.prosjekt_id.
-- ============================================================

-- 1. Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active) WHERE is_active = TRUE;

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Service role (backend) has full access
DROP POLICY IF EXISTS "Service role full access on projects" ON projects;
CREATE POLICY "Service role full access on projects"
ON projects FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can read active projects
DROP POLICY IF EXISTS "Authenticated users can read active projects" ON projects;
CREATE POLICY "Authenticated users can read active projects"
ON projects FOR SELECT
USING (auth.role() = 'authenticated' AND is_active = TRUE);

-- 2. Insert default project
INSERT INTO projects (id, name, description, created_by)
VALUES ('oslobygg', 'Oslobygg', 'Standard prosjekt', 'system')
ON CONFLICT (id) DO NOTHING;
