-- Ikke anvendt mot noen delt base. Bygges i testbasen og i CI-jobben database
-- (B-12: Supabase-prosjektene brukes ikke inntil videre).
--
-- B-10 (#316): bufferen TS-kjernen regner ut av journalen, med versjonene den er
-- regnet med. Saksversjonen står i hendelse.versjon og formatet i
-- hendelse.format; regelversjonen et brev er fryst med, står i brevet. Disse
-- kolonnene sier hvilke versjoner det lagrede resultatet er regnet med, så en
-- utdatert buffer kan finnes med en spørring og bygges på nytt.
--
-- Bufferen er avledet. Den kan slettes og regnes ut på nytt fra journalen uten
-- tap, og ingen regel og ingen bindende kommando leser den. Kjernen bruker den
-- bare når alle fire versjonene er lik kjernens og sakens (kjerne/buffer.ts).
--
-- Kolonnene er nullbare uten standardverdi: en sak kjernen ikke har regnet ut,
-- har ingen buffer. Enten er alle satt, eller ingen. Python-kolonnene cached_*
-- røres ikke.

ALTER TABLE public.sak_metadata
    ADD COLUMN IF NOT EXISTS kjerne_visning JSONB,
    ADD COLUMN IF NOT EXISTS kjerne_projeksjonsversjon INTEGER,
    ADD COLUMN IF NOT EXISTS kjerne_regelversjon INTEGER,
    ADD COLUMN IF NOT EXISTS kjerne_leserformat INTEGER,
    ADD COLUMN IF NOT EXISTS kjerne_saksversjon INTEGER;

ALTER TABLE public.sak_metadata
    DROP CONSTRAINT IF EXISTS sak_metadata_kjernebuffer_samlet,
    ADD CONSTRAINT sak_metadata_kjernebuffer_samlet CHECK (
        (kjerne_visning IS NULL) = (kjerne_projeksjonsversjon IS NULL)
        AND (kjerne_visning IS NULL) = (kjerne_regelversjon IS NULL)
        AND (kjerne_visning IS NULL) = (kjerne_leserformat IS NULL)
        AND (kjerne_visning IS NULL) = (kjerne_saksversjon IS NULL)
    );

COMMENT ON COLUMN public.sak_metadata.kjerne_visning IS
    'Visningen TS-kjernen regnet ut av journalen (B-10, #316). Avledet; NULL: ikke regnet ut.';
COMMENT ON COLUMN public.sak_metadata.kjerne_projeksjonsversjon IS
    'PROJEKSJONSVERSJON i kjernen som regnet ut kjerne_visning (B-10, #316).';
COMMENT ON COLUMN public.sak_metadata.kjerne_regelversjon IS
    'REGELVERSJON i regelsettet kjerne_visning er regnet med (B-10, #316).';
COMMENT ON COLUMN public.sak_metadata.kjerne_leserformat IS
    'Høyeste hendelsesformat kjernen som regnet ut kjerne_visning, leser (B-10, #316).';
COMMENT ON COLUMN public.sak_metadata.kjerne_saksversjon IS
    'Saksversjonen (hendelse.versjon) kjerne_visning er regnet ut fra (B-10, #316).';
