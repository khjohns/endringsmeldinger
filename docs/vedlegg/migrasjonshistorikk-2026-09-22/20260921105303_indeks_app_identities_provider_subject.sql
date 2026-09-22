-- Anvendt mot gwdxadexwktegkklyobv 2026-09-21 som versjon 20260921102148.
--
-- KR-11: identitetsoppslaget filtrerer på (provider, subject). Eneste indeks
-- er UNIQUE (provider, issuer, subject) fra 20260912150635, og provider har to
-- verdier — så bare ledekolonnen avgrenser. Den vanlige veien er dessuten bom:
-- en Catenda-forfatter som aldri har logget inn finnes ikke i tabellen, og da
-- skannes hele provider-partisjonen. Oppslaget skjer én gang per hendelse på
-- navnestien (lib/aktor_navn) og på mottaksstien.
-- Se docs/audit-korrekthet-2026-09-21.md (KR-11).
--
-- Ikke unik: unikheten ligger på (provider, issuer, subject), og to utstedere
-- kan i prinsippet bruke samme subject.

CREATE INDEX IF NOT EXISTS idx_app_identities_provider_subject
    ON public.app_identities (provider, subject);;
