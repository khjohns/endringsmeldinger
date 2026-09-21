-- Anvendt mot gwdxadexwktegkklyobv 2026-09-21 som versjon 20260921153900.
--
-- MS-05: interne notater ut av den uforanderlige journalen.
--
-- Et internt notat er ikke et kontraktsvarsel (AGENTS.md). Det trenger derfor
-- ikke journalens permanens — men i dag arver det den, fordi det er en
-- hendelsestype i `hendelse`. Samtidig er det nettopp interne notater som er
-- fritekst om navngitte personer.
--
-- Denne tabellen er bevisst *ikke* append-only. `hendelse` skal etter planen
-- få REVOKE UPDATE, DELETE og en append-only-trigger; `notat` skal ikke. Det
-- er hele hensikten: her kan en oppbevaringsregel faktisk gjennomføres.
-- Se docs/design-maalskjema-database-2026-09-20.md (MS-05).
--
-- aktor_team_id er NOT NULL. Skjermingen av notater går på Catenda-team, og
-- et notat uten entydig team kan ingen lese — heller ikke forfatteren. I
-- journalen var kolonnen nullbar, og regelen levde bare i Python. Her avviser
-- basen raden.
--
-- Ingen datamigrering: hendelse hadde null rader ved anvendelse, kontrollert
-- mot prosjektet umiddelbart før.

CREATE TABLE IF NOT EXISTS public.notat (
    notat_id UUID PRIMARY KEY,

    sak_id TEXT NOT NULL,
    prosjekt_id TEXT NOT NULL,

    aktor_id TEXT NOT NULL,
    aktor_rolle TEXT NOT NULL CHECK (aktor_rolle IN ('TE', 'BH')),
    aktor_team_id TEXT NOT NULL CHECK (length(aktor_team_id) > 0),

    tekst TEXT NOT NULL,
    spor TEXT CHECK (spor IS NULL OR spor IN ('grunnlag', 'vederlag', 'frist')),
    kommentar TEXT,

    -- Notatet viser til hendelsen det gjelder, der det gjelder et bestemt
    -- varsel. Ingen fremmednøkkel til hendelse: et notat skal kunne slettes
    -- uten å røre journalen, og journalen skal kunne stå uten notatet.
    refererer_til_event_id UUID,

    opprettet TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    endret TIMESTAMPTZ,

    CONSTRAINT fk_notat_sak FOREIGN KEY (sak_id)
        REFERENCES public.sak_metadata(sak_id) ON DELETE CASCADE
);

-- Lesestien henter alltid alle notater for én sak og fletter dem inn i
-- tidslinjen; prosjektfilteret legges på i tillegg ved hvert lesepunkt.
CREATE INDEX IF NOT EXISTS idx_notat_sak_id ON public.notat (sak_id);
CREATE INDEX IF NOT EXISTS idx_notat_prosjekt_id ON public.notat (prosjekt_id);

ALTER TABLE public.notat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on notat" ON public.notat;
CREATE POLICY "Service role full access on notat"
    ON public.notat FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Samme sett som hendelse-tabellen fikk, og av samme grunn: rettigheten
-- skrives ned framfor å arves fra plattformen. ALL er unngått med vilje.
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON public.notat TO service_role;

-- anon og authenticated er stengt ute av 20260918131137, også for tabeller
-- opprettet senere. Tatt med som vern mot at en framtidig
-- ALTER DEFAULT PRIVILEGES gir dem tilbake.
REVOKE ALL ON public.notat FROM anon, authenticated;
