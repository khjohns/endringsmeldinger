-- Anvendt mot gwdxadexwktegkklyobv 2026-09-20 som versjon 20260920193558.
--
-- MS-01: én hendelsestabell i stedet for tre.
--
-- koe_events, forsering_events og endringsordre_events var identiske: samme
-- nitten kolonner med samme type, nullbarhet og default, samme skranker og
-- samme fremmednøkkel. Sakstypen ligger på sak_metadata.sakstype, så
-- tabellvalget bar ingen informasjon raden ikke allerede hadde. Prisen var at
-- alt sikkerhetsarbeid måtte gjøres tre ganger — én policy, ett sted å
-- tilbakekalle UPDATE/DELETE og én append-only-trigger per tabell. Se
-- docs/design-maalskjema-database-2026-09-20.md (MS-01).
--
-- Kolonnen heter actorid, ikke actor (MS-04). En ny tabell skal fødes med
-- riktig navn framfor å døpes om en migrasjon senere. Journalen bærer
-- identiteten til den som handlet — app_users.id, eller catenda:<subject> for
-- en forfatter som bare finnes i Catenda — aldri personnavnet.
--
-- De tre tabellene har null rader (kontrollert mot prosjektet umiddelbart før
-- denne migrasjonen), så sammenslåingen koster ingen datamigrasjon.

CREATE TABLE IF NOT EXISTS public.hendelse (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- CloudEvents v1.0, påkrevde attributter
    specversion TEXT NOT NULL DEFAULT '1.0',
    event_id UUID NOT NULL UNIQUE,
    source TEXT NOT NULL,
    type TEXT NOT NULL,

    -- CloudEvents, valgfrie attributter
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subject TEXT NOT NULL,
    datacontenttype TEXT DEFAULT 'application/json',

    -- CloudEvents, utvidelser. Settes av serveren, aldri av klienten.
    actorid TEXT NOT NULL,
    actorrole TEXT NOT NULL CHECK (actorrole IN ('TE', 'BH')),
    actorteam TEXT,
    comment TEXT,
    referstoid UUID,

    data JSONB NOT NULL,

    sak_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    versjon INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    prosjekt_id TEXT NOT NULL,

    CONSTRAINT unique_hendelse_sak_versjon UNIQUE (sak_id, versjon),
    CONSTRAINT fk_hendelse_sak FOREIGN KEY (sak_id)
        REFERENCES public.sak_metadata(sak_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hendelse_sak_id ON public.hendelse (sak_id);
CREATE INDEX IF NOT EXISTS idx_hendelse_prosjekt_id ON public.hendelse (prosjekt_id);
CREATE INDEX IF NOT EXISTS idx_hendelse_time ON public.hendelse ("time");

ALTER TABLE public.hendelse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on hendelse" ON public.hendelse;
CREATE POLICY "Service role full access on hendelse"
    ON public.hendelse FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Eksplisitt GRANT, ikke arvet fra plattformen. Åtte av tjue tabeller virker i
-- dag bare fordi Supabase deler ut rettigheter ved prosjektoppsett; flyttes
-- basen dit, forsvinner de uten at noen migrasjon sier fra. Settet er det
-- samme som plattformen gir, så dette endrer ingen rettighet — det skriver den
-- ned. ALL er unngått med vilje: på PostgreSQL 17 ville det også gitt
-- MAINTAIN, som søskentabellene ikke har.
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON public.hendelse TO service_role;

-- anon og authenticated er stengt ute av 20260918131137, også for tabeller
-- opprettet senere. Tatt med som vern mot at en framtidig
-- ALTER DEFAULT PRIVILEGES gir dem tilbake.
REVOKE ALL ON public.hendelse FROM anon, authenticated;

DROP TABLE IF EXISTS public.koe_events;
DROP TABLE IF EXISTS public.forsering_events;
DROP TABLE IF EXISTS public.endringsordre_events;
