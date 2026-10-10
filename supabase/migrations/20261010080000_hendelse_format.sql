-- Ikke anvendt mot noen delt base. Bygges i testbasen og i CI-jobben database
-- (B-12: Supabase-prosjektene brukes ikke inntil videre).
--
-- B-10 (#273): formatversjonen for hendelsene TS-kjernen skriver, etter
-- docs/design-hendelsesformat-2026-10-09.md, 4.4.
--
-- Formatet står i en kolonne og ikke i data, fordi kjernen må kunne lese det
-- før data tolkes, og fordi en spørring da kan liste sakene med en rad i et
-- nyere format før en tilbakerulling (#316). Kjernen leser en rad bare når
-- format er satt og ikke høyere enn formatet den selv leser.
--
-- Kolonnen er nullbar og har ingen standardverdi. Python setter den ikke, og
-- en rad uten format er ikke skrevet av TS-kjernen (B-17). En standardverdi
-- ville gitt en rad et format ingen skriver har valgt.

ALTER TABLE public.hendelse ADD COLUMN IF NOT EXISTS format INTEGER
    CONSTRAINT hendelse_format_minst_1 CHECK (format >= 1);

COMMENT ON COLUMN public.hendelse.format IS
    'Formatversjonen for raden, satt av TS-kjernen som skrev den (B-10, #273). NULL: raden er ikke skrevet av TS-kjernen.';
