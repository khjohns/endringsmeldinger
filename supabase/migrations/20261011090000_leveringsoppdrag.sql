-- Ikke anvendt mot noen delt base. Bygges i testbasen og i CI-jobben database
-- (B-12: Supabase-prosjektene brukes ikke inntil videre).
--
-- LV-U1 og B-03, dokumentet (skiva i #347): leveringsoppdraget for et brev TS
-- skriver. Det som skal leveres til Catenda, fryses i `innhold` i samme
-- transaksjon som hendelsen. Python leverer oppdraget uten å lese journalen
-- (B-17).
--
-- - Én rad per brev, og ett brev er ett dokument i Catenda: `event_id` og
--   `dokumentnoekkel` er unike.
-- - Oppdraget er uforanderlig. Et nytt leveringsforsøk sender samme innhold, og
--   forsøkene, feilene og kvitteringene føres for seg, ikke her. Et lagret
--   oppdrag beviser ikke at brevet er sendt eller mottatt.
-- - `prosjekt_id` har ingen standardverdi. Triggeren avviser et oppdrag der
--   saken eller prosjektet ikke er hendelsens, så oppdraget ikke kan føres til
--   et annet prosjekt enn brevet.
-- - Radene slettes bare med saken eller hendelsen (kaskade). Plattformen gir
--   service_role alle rettigheter på nye tabeller (scripts/testbase/plattformstubb.sql,
--   Supabase likt), så rettighetene tilbakekalles uttrykkelig. Triggeren stopper i
--   tillegg UPDATE, en DELETE som ikke kommer fra kaskaden og TRUNCATE, også for
--   eieren. Kaskaden kjører triggeren fra fremmednøkkelens egen trigger, altså på
--   dybde 2 eller mer.

CREATE TABLE IF NOT EXISTS public.leveringsoppdrag (
    id UUID PRIMARY KEY,
    prosjekt_id TEXT NOT NULL,
    sak_id TEXT NOT NULL,
    event_id UUID NOT NULL UNIQUE,
    dokumentnoekkel TEXT NOT NULL UNIQUE CHECK (length(dokumentnoekkel) > 0),
    innhold JSONB NOT NULL,
    innhold_sha256 TEXT NOT NULL CHECK (innhold_sha256 ~ '^[0-9a-f]{64}$'),
    opprettet TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_leveringsoppdrag_sak FOREIGN KEY (sak_id)
        REFERENCES public.sak_metadata(sak_id) ON DELETE CASCADE,
    CONSTRAINT fk_leveringsoppdrag_hendelse FOREIGN KEY (event_id)
        REFERENCES public.hendelse(event_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leveringsoppdrag_sak_id ON public.leveringsoppdrag (sak_id);
CREATE INDEX IF NOT EXISTS idx_leveringsoppdrag_prosjekt_id ON public.leveringsoppdrag (prosjekt_id);

CREATE OR REPLACE FUNCTION public.leveringsoppdrag_vakt()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP IN ('UPDATE', 'TRUNCATE') OR (TG_OP = 'DELETE' AND pg_trigger_depth() < 2) THEN
        RAISE EXCEPTION 'leveringsoppdrag er uforanderlig (LV-U1)'
            USING ERRCODE = 'check_violation';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.hendelse h
         WHERE h.event_id = NEW.event_id
           AND h.sak_id = NEW.sak_id
           AND h.prosjekt_id = NEW.prosjekt_id
    ) THEN
        RAISE EXCEPTION 'leveringsoppdraget gjelder ikke hendelsens sak og prosjekt'
            USING ERRCODE = 'foreign_key_violation';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leveringsoppdrag_vakt ON public.leveringsoppdrag;
CREATE TRIGGER leveringsoppdrag_vakt
    BEFORE INSERT OR UPDATE OR DELETE ON public.leveringsoppdrag
    FOR EACH ROW EXECUTE FUNCTION public.leveringsoppdrag_vakt();

DROP TRIGGER IF EXISTS leveringsoppdrag_vakt_truncate ON public.leveringsoppdrag;
CREATE TRIGGER leveringsoppdrag_vakt_truncate
    BEFORE TRUNCATE ON public.leveringsoppdrag
    FOR EACH STATEMENT EXECUTE FUNCTION public.leveringsoppdrag_vakt();

ALTER TABLE public.leveringsoppdrag ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on leveringsoppdrag" ON public.leveringsoppdrag;
CREATE POLICY "Service role full access on leveringsoppdrag"
    ON public.leveringsoppdrag FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Lese og skrive, ikke endre. Slettingen skjer med saken eller hendelsen.
REVOKE ALL ON public.leveringsoppdrag FROM service_role;
GRANT SELECT, INSERT, REFERENCES ON public.leveringsoppdrag TO service_role;

REVOKE ALL ON public.leveringsoppdrag FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.leveringsoppdrag_vakt() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.leveringsoppdrag IS
    'Leveringsoppdraget for et brev TS skriver, frosset med hendelsen (LV-U1, B-03). Uforanderlig.';
COMMENT ON COLUMN public.leveringsoppdrag.innhold IS
    'Det som leveres: brevet, målet i Catenda, statusetiketten og versjonene (server/levering.ts).';
COMMENT ON COLUMN public.leveringsoppdrag.innhold_sha256 IS
    'SHA-256 av innhold som JSON med sorterte nøkler (kanonisk i server/levering.ts).';
