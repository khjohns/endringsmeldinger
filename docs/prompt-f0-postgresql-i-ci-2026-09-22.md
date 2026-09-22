# Oppdrag: PostgreSQL 17 i CI og de første databasetestene (F0)

**Dato:** 2026-09-22. **Utgangspunkt:** `main` etter sluttredigeringen av
hovedplanen (ucommittet ved skriving; kontroller HEAD og Git-status selv).
Dette er en arbeidsinstruks. Den endrer ikke funnstatus eller beslutninger.

Forrige ledd: [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
særlig F0 i avsnitt 5 og avsnitt 6, og
[redaksjonsprotokollen](sluttredigering-hovedplan-2026-09-22.md).

## 1. Mål

Gi repoet en automatisk kontroll mot ekte PostgreSQL. Alle senere akseptkriterier
i planen — rettigheter, transaksjoner, samtidighet — skal kjøres på dette
grunnlaget. Oppgaven krever ingen åpen beslutning.

Ferdig når:

1. En CI-jobb starter PostgreSQL 17, oppretter plattformstubben, kjører alle
   `supabase/migrations/*.sql` i sortert rekkefølge med `ON_ERROR_STOP`, og kjører
   deretter databasetestene.
2. Databasetestene er et eget, avgrenset sett. Standard `pytest` uten
   databasemiljø hopper over dem og forblir uten nettverk (RV-16).
3. De første testene kontrollerer katalogen:
   - `sak_metadata.prosjekt_id` har ingen default (DB-03);
   - `sak_bim_links.properties` finnes (DB-07);
   - `prosjekt_id` på `hendelse` og `sak_relations` er `NOT NULL` uten default;
   - `anon` og `authenticated` har ingen tabellrettigheter og ingen `EXECUTE` på
     funksjoner i `public`.
4. Den ene strenge `xfail` uten `raises=` har fått det (T-5, RV-17).

## 2. Les først, og bare dette

- `AGENTS.md` i sin helhet. Særlig avsnittene om migrasjoner, plattformstubben,
  PG18 og at en grønn suite ikke beviser at basen er enig med repoet.
- Hovedplanen: avsnitt 1.3, 2.2, F0 i avsnitt 5, avsnitt 6, og radene DB-03,
  DB-04, DB-07, RV-16, RV-17, DA-03 og AR-05 i registeret.
- `.github/workflows/ci.yml`, `supabase/config.toml`, `supabase/migrations/`,
  `backend/tests/test_security/test_database_arkitektur_20260920.py` og
  `backend/tests/test_security/test_database_rls_audit_20260918.py`.

Ikke les auditkjeden eller konsolideringene. Trenger du dem for en konkret
uklarhet, slå opp det ene stedet planen viser til.

## 3. Kontroller databasen før du bygger på den

Påstander merket D i hovedplanen er historiske. Før du skriver en test som
forventer en katalogtilstand, kontroller den levende katalogen med Supabase-MCP
(prosjekt `gwdxadexwktegkklyobv`):

- bare lesende katalogspørringer (`information_schema`, `pg_catalog`,
  `list_migrations`);
- ingen `apply_migration`, ingen DDL, ingen skriving;
- ingen saksdata.

Er MCP utilgjengelig, skriv det, og la testene gjelde det migrasjonene bygger.
Finner du avvik mellom basen og migrasjonene, rapporter det — ikke rett det.

## 4. Føringer

- **Stubben må være ærlig.** Den gir `service_role` de rettighetene Supabase gir
  ved prosjektoppsett (se `AGENTS.md`). Skriv i stubben at disse kommer fra
  plattformen og ikke fra migrasjonene. Stubben er ikke modellen for den
  framtidige runtime-rollen; den rollen avgjøres i B-02.
- **PostgreSQL 17 i CI, uansett hva du har lokalt.** Bygger du lokalt med 18,
  husk NOT NULL-oppføringene i `pg_constraint`.
- **Testene kobler til en database de får oppgitt**, for eksempel gjennom en
  miljøvariabel. Ingen standardverdi som peker på noe eksternt. Mangler
  variabelen, hoppes testene over med en tydelig grunn.
- **Ikke endre assertions i eksisterende tester.** De strenge reproduksjonene for
  DB-03 og DB-07 leser migrasjonsfiler og er foreldet (T-2). Du kan erstatte dem
  med de nye katalogtestene etter presedensen fra FE-01 20.09: den gamle testen
  fjernes først når den nye er grønn, og begrunnelsen står datert i den nye
  testen. DB-04s reproduksjon blir stående; fremmednøklene venter på B-01.
- **Ingen produksjonskode**, ingen nye migrasjoner, ingen endring av
  avhengigheter utover det CI-jobben selv trenger.
- **Påkrevde sjekker i GitHub og migrasjonshistorikken i basen (DA-03)** er ikke
  en del av oppdraget. Begge krever tilgang eller legitimasjon. Skriv hva som
  må gjøres, og hvem som må gjøre det.

## 5. Arbeidsform

- Lag en egen gren. Commit når suiten og lint er grønne. Ikke push og ikke åpne
  PR uten å spørre; CI-jobben kan da ikke observeres i GitHub, så kjør samme
  skript lokalt og si tydelig at CI-kjøringen ikke er observert.
- Kjør `cd backend && python -m pytest -q` og `ruff check backend/` før hver
  commit. Kjør databasetestene mot et lokalt kastbart cluster.
- Oppdater hovedplanen med en datert merknad: F0-status, og radene du har endret
  (DB-03, DB-07, RV-17). Endre ikke andre statuser.

## 6. Lever

1. Endringene på grenen, med commit-meldinger etter `AGENTS.md`.
2. Et kort notat, `docs/gjennomforing-f0-postgresql-ci-2026-09-22.md` (bruk faktisk
   dato), med det repoets konvensjoner krever: dato og commit, forrige ledd, hva
   som er gjort, og **«Verifikasjon og grenser»** som skiller kjørt lokalt,
   observert i CI, kontrollert i den levende katalogen og ikke kontrollert.
3. Til oppdragsgiver: hva som er levert, hva katalogkontrollen viste, hva som må
   gjøres av noen med tilgang (påkrevde sjekker, migrasjonshistorikk), og hva
   som er naturlig neste steg i F0 (T-1, T-3, T-4) eller parallelt.

Ikke begynn på F1 eller B-02 i denne runden.
