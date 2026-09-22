-- MS-10: organisasjon_id på projects.
--
-- projects.id er 'oslobygg' — organisasjonsnavnet brukt som prosjekt-ID. Så
-- lenge de to er samme verdi, arver enhver ny virksomhet Oslobyggs identitet
-- gjennom prosjektet sitt, og det lar seg ikke skille i ettertid når saker
-- først viser til prosjektet. Kolonnen skiller dem nå, mens basen er tom.
-- Org-laget bygges ikke: ingen organisasjonstabell, ingen organisasjonspolicy.
-- Se docs/design-maalskjema-database-2026-09-20.md (MS-10).
--
-- Ingen DEFAULT, med vilje. En defaultverdi ville gjort organisasjons-
-- tilhørigheten like uetterprøvbar som prosjekt_id var før 20260920053427.
-- Den ene raden som finnes, navngis eksplisitt under; finnes det andre rader
-- uten organisasjon, skal SET NOT NULL feile framfor å tilskrive dem Oslobygg.

ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS organisasjon_id TEXT;

UPDATE public.projects
SET organisasjon_id = 'oslobygg'
WHERE id = 'oslobygg' AND organisasjon_id IS NULL;

ALTER TABLE public.projects
    ALTER COLUMN organisasjon_id SET NOT NULL;;
