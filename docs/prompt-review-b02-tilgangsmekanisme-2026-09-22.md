# Oppdrag: uavhengig review av designgrunnlaget for B-02

**Dato:** 2026-09-22. **Utgangspunkt:** gren `b02-designgrunnlag` (PR #37), eller
`main` hvis PR-en er merget. Kontroller HEAD og Git-status selv. Dette er en
arbeidsinstruks. Den endrer ikke funnstatus eller beslutninger.

**Forrige ledd:** [designgrunnlaget](design-b02-tilgangsmekanisme-2026-09-22.md)
og [oppdraget det svarte på](prompt-b02-tilgangsmekanisme-2026-09-22.md), med
oppdragsgivers svar i avsnitt 2 der.

**Hvem:** en annen agent enn den som skrev designet. Oppdragsgiver har bestemt
at reviewet skal gjøres før de første migrasjonene i F1. En ekstern
sikkerhetsvurdering av det som bygges, kommer senere, i F5.

## 1. Mål

Gi oppdragsgiver et grunnlag for å avgjøre B-02. Reviewet svarer på tre
spørsmål:

1. **Holder anbefalingen** (alternativ C: RLS for lesing, `SECURITY DEFINER`-kommandoer
   for bindende skriving, skrivevakt på journalen) mot trusselmodellen i
   designets avsnitt 1 og mot F1-kriteriene?
2. **Er beviset det påstår å være?** Stemmer beleggmerkingen (K, L, D,
   dokumentasjon)? Prøver sjekkene det navnet sier, og ville de blitt røde hvis
   regelen brytes?
3. **Hva mangler** før designet kan bli migrasjoner i F1?

Konklusjonen skal være én av tre: anbefalingen kan legges til grunn; den kan
legges til grunn med navngitte endringer; eller den kan ikke legges til grunn.
Begrunn konklusjonen.

## 2. Les først

- [`AGENTS.md`](../AGENTS.md) i sin helhet, særlig resonneringsreglene.
- Designgrunnlaget i sin helhet, prototypen i
  [`vedlegg/b02-prototype-2026-09-22/`](vedlegg/b02-prototype-2026-09-22/kjor.sh)
  og reviewoppdraget over.
- Hovedplanen: invariantene i 2.3, 3.1, B-02 og B-04 i 3.4, og F1 i avsnitt 5.
- [Arkitekturføringene](arkitekturforinger-2026-09-21.md), AF-01 og AF-02.

Les ikke resten av auditkjeden. Trenger du noe derfra, noter at du brukte det.

## 3. Kjør beviset selv

Kjør `kjor.sh` som beskrevet i designets avsnitt 9. Du trenger PostgreSQL 17 og
en PostgREST-binær. Skriv opp hvilken PostgREST-versjon du brukte. Kjør også
de tre mutasjonene. Det er ikke nok at beviset er grønt: les `bevis.py` og
`02_b02_lag.sql`, og kontroller at hver sjekk faktisk prøver regelen den er
oppkalt etter.

Lag gjerne egne mutasjoner. En regel som ingen mutasjon dekker, er en regel
beviset ikke beviser. Kandidater:

- `har_handlingsrett()` i kommandoen;
- worker-rollens kolonnerettigheter;
- `nullif(..., '')` i `koe_privat.krav`;
- `FORCE ROW LEVEL SECURITY`;
- rettighetene på identitetsfunksjonene.

Legg dem under `vedlegg/b02-prototype-2026-09-22/mutasjoner/` med samme form.

Katalogen i `gwdxadexwktegkklyobv` kan leses over Supabase-MCP, men bare
katalogtabeller. Saksdata er konfidensielt.

## 4. Vinkler som skal prøves

Designet er skrevet av én agent i én økt. Angrip det der det er tynnest.

**Skrivevakten (TM-01, avsnitt 3 C).** Kan noen annen rolle enn eieren få
`current_user = 'koe_kommando'`, eller omgå triggeren? Se blant annet etter:

- en kommando som kjører dynamisk SQL;
- `TRIGGER`-rettigheten `service_role` har (TM-07), sammen med en
  triggerfunksjon rollen får kjøre;
- standardrettighetene som gir `service_role` `EXECUTE` på nye funksjoner i
  `public`;
- `postgres`, som har `ADMIN` og `CREATEROLE`, og som kan gi seg selv medlemskap
  i rollene den har opprettet (PG16+);
- `ON CONFLICT`, `COPY`, `MERGE`, logisk replikering og
  fremmednøkkelhandlinger andre enn `CASCADE`.

**TM-01 selv.** Stemmer det at et selvsignert token kan velge `service_role` på
hostet Supabase? Finnes det en støttet måte å hindre det på? Kryss av mot
Supabase-dokumentasjonen, ikke mot designets gjengivelse av den.

**RLS og sidekanaler.** Kan en avgrenset runtime lære noe om prosjekt B gjennom
feil og ikke rader?

- En unik-skranke: `INSERT` i `notat` med en `notat_id` som finnes i B.
- Fremmednøkkelfeil: `sak_id` fra B.
- Telling, tidsforskjeller og feilmeldingstekster fra kommandoene.

Vurder om funnet angår «ondsinnet bruker», som skal holde fullt, eller bare en
overtatt runtime.

**Kontekstkontrakten (avsnitt 4).**

- Hva skjer med uventede verdier: store bokstaver i UUID-en, feil JSON-type,
  ekstra krav, en tom streng, en `koe_side` som ikke er `TE` eller `BH`?
- Er fail-closed faktisk fail-closed, eller bare null rader der det burde vært
  en avvisning?
- Holder transaksjonslokal kontekst med Supavisor i transaksjonsmodus? Det er
  ikke prøvd.

**Identitetsfunksjonene (TM-02).** Å gjøre dem til `SECURITY DEFINER` gir runtime
en skrivevei inn i identiteter og medlemskap. Er det akseptabelt under
trusselmodellen? Bør `p_provider` og `p_issuer` låses inne i funksjonen, jf.
issuerregelen i `AGENTS.md`?

**Alternativene.** Er B og transporten T2 (direkte innlogging) vurdert rettferdig,
eller er de avvist for raskt? Svekker TM-01 premisset i 3.1 om RPC over PostgREST
nok til at det må tas opp igjen? Svar ja eller nei, med begrunnelse.

**Invariantene.** Bryter prototypen eller designet noe i `AGENTS.md` eller 2.3?
Sjekk særlig:

- at `aktor_id` er `app_users.id` og ingenting annet;
- at det ikke finnes noe defaultprosjekt;
- at ingen verdi kommer fra klienten;
- at private data ikke går ut gjennom outbox.

**TS2-02 og testplanen (avsnitt 7–8).**

- Er rekkefølgen gjennomførbar med dagens CI?
- Fixturen i `tests/test_database/conftest.py` er lesende. Hva må til?
- Mangler testplanen et F1-kriterium?

**B-04 (avsnitt 6).** Stemmer det at designet ikke låser noen av B-04-alternativene?

## 5. Føringer

- Ingen produksjonskode, ingen migrasjoner og ingen skriving mot prosjektet.
  Prototypen og egne forsøk kjører lokalt.
- Skill mellom «kjørt og observert», «lest ut av koden» og «lest i
  dokumentasjon». En påstand om at noe «omgår», «lekker» eller «avvises», skal
  være kjørt, eller merket som ikke kjørt.
- Les hele stedet, ikke et utsnitt: hele funksjonen, hele policyen, hele
  migrasjonen.
- Du avgjør ikke B-02. Du skriver ikke om designdokumentet. Blir en påstand der
  feil, skriver du en datert merknad inn i det («Merknad 2026-09-2x fra
  reviewet: …»).

## 6. Lever

- `docs/review-b02-tilgangsmekanisme-<dato>.md` etter repoets form:
  - dato og commit i åpningen, og lenke til designet og dette oppdraget;
  - funntabell med ID (`RB2-01` …), alvorlighet og belegg;
  - én seksjon per funn med fil og symbol;
  - konklusjonen fra avsnitt 1;
  - «Verifikasjon og grenser» til slutt.
- Eventuelle nye mutasjoner eller forsøk under
  `vedlegg/b02-prototype-2026-09-22/`. Kjøres de med `kjor.sh`, skal de gå der.
- Daterte merknader i designdokumentet der en påstand ikke holder.
- En datert merknad under B-02 i hovedplanen om at reviewet finnes og hva det
  konkluderte, uten å endre beslutningsstatus.
- En rad i `docs/README.md`, en gren og en PR.
