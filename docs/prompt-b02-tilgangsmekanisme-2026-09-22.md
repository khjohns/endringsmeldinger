# Oppdrag: designgrunnlag for B-02 (tilgangsmekanisme i datalaget)

**Dato:** 2026-09-22. **Utgangspunkt:** `main` etter PR #36. Kontroller HEAD og
Git-status selv. Dette er en arbeidsinstruks. Den endrer ikke funnstatus eller
beslutninger. **B-02 avgjøres av oppdragsgiver etter uavhengig review, ikke av deg.**

**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
B-02 i 3.4, AF-01/AF-02 i 3.2, F1 i avsnitt 5.

**Levert:** [designgrunnlaget](design-b02-tilgangsmekanisme-2026-09-22.md).

## 1. Mål
Et designdokument som gjør B-02 avgjørbart: hvilke roller runtime, worker,
drift, migrering og break-glass skal ha, hvordan identitet, prosjekt, side og
team føres inn i basen og av hvem, og om vernet skal være RLS med kontekst,
avgrensede funksjoner eller begge. Ferdig når:
1. Minst to alternativer er sammenliknet mot trusselmodellen (glemt filter,
   ondsinnet bruker, kompromittert runtime/worker, databaseadministrator) og mot
   akseptkriteriene i F1, med en anbefaling.
2. Hvert alternativ viser hvordan det virker med RPC over PostgREST (3.1), med
   gjenbrukte forbindelser, og med dagens `koe_resolve_identity` og
   `koe_reconcile_memberships`.
3. En testplan: hvilke negative tester mot ekte PostgreSQL som beviser hvert
   kriterium, og hva CI trenger (skrivbar testbase, innlogging som avgrenset rolle).
4. Et prototypebevis i en kastbar lokal PostgreSQL 17, ikke i prosjektet, for
   det anbefalte alternativet: én tabell, to prosjekter, to team, og at en
   direkte spørring med prosjekt A i kontekst gir null rader fra B.

## 2. Oppdragsgivers svar

Besvart 22.09, før designarbeidet begynte.

- **Plattform:** Supabase (PostgreSQL 17 + PostgREST), backend på Cloud Run.
  Vernet skal ligge i roller, RLS og funksjoner i ren PostgreSQL, ikke i
  Supabase-særtrekk som JWT-signering, Supavisor eller plattformens
  standardrettigheter. Da kan det flyttes til en annen PostgreSQL.
  Azure SQL-skissen i `docs/arkitektur-diagrammer.md` er historikk og strider
  mot 3.1.

  > **Merknad 2026-09-23 til plattformsvaret:** Foreløpig målplattform er nå
  > Azure Database for PostgreSQL (Flexible Server, versjon 17), med backend i
  > Azure Container Apps eller App Service. Endelig valg er B-12 i
  > [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger).
  > Portabilitetskravet over står: vernet skal ligge i ren PostgreSQL og kunne
  > flyttes. Oppdragsgiver har valgt alternativ C med direkte tilkobling (T2),
  > så backend skal ikke lenger gå gjennom PostgREST. Når byttet er gjort,
  > faller begrunnelsen for at Data API-et forblir på, bort; om det kan slås av så lenge basen
  > ligger hos Supabase, er ikke avgjort.
- **Klienttilgang til Data API:** Nei. Bare backend snakker med basen. `anon`
  og `authenticated` skal ha null rettigheter på tabeller og funksjoner, og en
  test skal håndheve det. Data API-et forblir på, fordi backendens RPC går
  gjennom PostgREST. (Spurt i katalogen 22.09: ingen rettigheter for `anon`
  eller `authenticated` i `public`, RLS på alle tabeller.)
- **Trusler som må holde før produksjon:** glemt filter og ondsinnet bruker,
  fullt. Kompromittert runtime/worker: integriteten skal holde. Runtime skal
  ikke kunne omskrive journalen, omgå godkjenning eller skrive direkte til
  `hendelse`. Lesing på tvers av prosjekter med en overtatt runtime godtas som
  restrisiko. Databaseadministrator og plattform godtas også som restrisiko, og
  håndteres i F4 med uavhengig integritetsbevis.
- **Uavhengig review:** en annen agent enn den som skrev designet, før de
  første migrasjonene i F1. En ekstern sikkerhetsvurdering av det som er
  bygget, kommer i F5.

## 3. Les først
`AGENTS.md` i sin helhet. Hovedplanen: 2.2, 3.1–3.4, F1, AR-01, AR-02, MS-02,
DB-05, TS2-02. `docs/arkitekturforinger-2026-09-21.md`. Katalogen over
Supabase-MCP (`pg_proc`, `pg_policy`, `pg_trigger`, rettigheter), ikke
migrasjonsfilene alene. Les ikke auditkjeden utover det planen viser til.

## 4. Føringer
- Ingen migrasjoner mot prosjektet og ingen produksjonskode. Prototypen kjører lokalt.
- Skill mellom «kjørt og observert» og «lest ut av koden».
- Runtime bygges ikke på ubegrenset `service_role` (F1).
- Ta med B-04 (tilbakekalling) der den påvirker valget, men avgjør den ikke.
- TS2-02 (reservelagrene ut, tester mot PostgreSQL) skal vurderes her.

## 5. Lever
Designdokumentet `docs/design-b02-tilgangsmekanisme-<dato>.md` etter repoets form,
med «Verifikasjon og grenser». En gren og en PR. En datert merknad under B-02 i
hovedplanen om at grunnlaget finnes, men uten å endre beslutningsstatus.
