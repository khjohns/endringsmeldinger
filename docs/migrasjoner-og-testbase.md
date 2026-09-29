# Migrasjoner og testbase: verifikasjon uten å røre basen

**Dato:** 2026-09-29. **Commit:** `main` på `6bb2e33`.
Teksten er flyttet ordrett fra `AGENTS.md`, der den lastes i hver økt.
`AGENTS.md` beholder reglene og viser hit for framgangsmåten. Den beskriver
dagens oppsett på Supabase; plattformen er ikke valgt (B-12 i
[hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md)).

**Migrasjonene kan verifiseres uten å røre basen.** Målversjonen er
PostgreSQL 17 (`supabase/config.toml`), og testbasen skal kjøre på 17, som
CI-jobben `database`. Versjonen er ikke likegyldig: `transaction_timeout`
finnes fra 17, og 18 gir andre katalogsummer (under). På macOS gir
`scripts/testbase/lokal_testbase.sh` en base med Homebrews 17. Uten 17
installert gir `scripts/testbase/docker_testbase.sh` en base i bildet
`postgres:17`. `bygg_testbase.sh` sjekker ikke versjonen selv. Den stubber
Supabase-plattformen (rollene `anon`, `authenticated`, `service_role`,
skjemaet `auth` med `users`, `auth.role()` og `auth.email()`) og kjører
migrasjonene mot en tom base. Sammenlikn så katalogen med prosjektet ved å ta
`md5(string_agg(...))` over kolonner, skranker, indekser, policyer og
rettigheter på begge sider. Det fanger ting lesing ikke gjør: sirkulære
avhengigheter, manglende kolonner, policyer i feil form.

**Fra PostgreSQL 18 ligger NOT NULL-skranker i `pg_constraint`** (`contype = 'n'`).
En skrankesum fra PG18 blir derfor ulik en fra 16 eller 17 på identisk skjema.
Filtrer på `contype <> 'n'` og kontroller nullbarhet gjennom kolonnesummen.

**Filnavnrekkefølgen *er* apply-rekkefølgen** — men det er en fersk skranke, ikke
en naturlov. `backend/migrations/` er tømt (20.09); all DDL ligger i
`supabase/migrations/`, og `supabase/config.toml` peker på prosjektet.
Avhengighetene er reelle: `project_memberships` har fremmednøkkel til
`projects` og må komme etter den. Legger du inn en migrasjon med et
versjonsnummer som sorterer feil, bygger ikke basen fra tom — og det fanges av
CI-jobben `database`, som bygger hele settet mot PostgreSQL 17 ved hver PR.
Tekstvaktene i `tests/test_security/test_database_arkitektur_20260920.py` er
et tillegg, ikke beviset.

**Versjonen i basen skal være versjonen i filnavnet.** Historikken ble avstemt
22.09 (DA-03): hver fil i `supabase/migrations/` har én rad med samme versjon.
Anvend med `supabase db push` (etter `supabase login` og `supabase link`;
databasepassord trengs ikke), ikke `apply_migration` over MCP. MCP stempler sitt
eget tidsstempel, og da er fil og base uenige igjen. `supabase migration list`
viser avviket. Radene som ble slettet i avstemmingen, ligger i
[`vedlegg/migrasjonshistorikk-2026-09-22/`](vedlegg/migrasjonshistorikk-2026-09-22/), med den eneste kopien av
originalteksten bak kjerneskjemaet.

**Stubben må gi `service_role` fulle rettigheter,** ellers er sammenlikningen
ikke tro: `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role` pluss
`ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES TO service_role`. Supabase gjør
dette ved prosjektoppsett, ikke i migrasjonene — og **åtte av nitten tabeller har
ingen eksplisitt `GRANT` i repoet i det hele tatt.** De virker bare fordi
plattformen deler ut rettigheter. Flyttes basen bort fra Supabase, forsvinner
de.
