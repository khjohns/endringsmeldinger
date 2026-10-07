# Oppdrag: strukturkartlegging av spor D

**Dato:** 2026-10-05. **Utgangspunkt:** `main` etter runde 5 (PR #245, #247,
#251, #254). Kontroller HEAD og Git-status selv. Dette er en arbeidsinstruks
for en kartlegging. Den endrer ingen beslutninger og ingen produksjonskode.

**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md)
(B-13 i 3.1 og 4.2), [designnotatet for B-13](design-b13-sannhetskilde-2026-09-23.md),
[kartleggingen av domenereglene i frontend](kartlegging-domeneregler-frontend-2026-09-23.md)
og [oppdraget for spor D](prompt-spor-d-br01-2026-09-23.md).

Commit denne fila som `docs/prompt-strukturkartlegging-spor-d-2026-10-05.md` i
samme PR som leveransen, slik de andre oppdragene står i `docs/`.

## 1. Bakgrunn

Fem retterunder i spor D har lukket mange issues, men hver runde gir nesten like
mange nye. Siden 20.09 er det opprettet rundt 50 issues med `spor-d`. Oppdragsgiver
spør om det er noe galt med datamodellen eller logikken, og vil ha det avklart
før flere retterunder.

Orkestratoren har sortert issuene etter titler og issuetekst, **ikke etter
koden**. Resultatet er en hypotese: hendelsesloggen er ikke problemet. Feilene
samler seg om fem mønstre, der samme slutning regnes ut på flere steder som
glir fra hverandre.

| # | Mønster | Issues som ser ut til å høre hjemme her |
| --- | --- | --- |
| M1 | «Er svaret subsidiært, hvorfor, og hva er resultatet?» regnes ut i backend-reglene, frontend-speilet, projeksjonen, brevet, fullmakten, saksvisningen og mockup | #168, #186, #187, #211, #214, #220, #234, #235, #236, #250, #252 |
| M2 | Projeksjonen har ingen klar eier per felt i tilstanden. Handlerne kopierer felt, så én hendelse kan overskrive det en annen eier, og verdier blir hengende igjen eller fryses | #76, #94, #97, #182, #215, #233, #238 |
| M3 | Datamodellen for hendelsene tillater kombinasjoner domenet forbyr, og varseltypene er ikke skilt | #172, #173, #189, #237 |
| M4 | Statusmengdene og rollupene («lukket», `overordnet_status`) finnes i flere kopier i backend og frontend | #213, #229, #230, #231 |
| M5 | Frontendtypene for API-et er skrevet for hånd og avviker fra det serveren sender (null mot undefined, felt som er fjernet) | #184, #239, #241 |

Hypotesen kan være feil, helt eller delvis. Oppdraget er å prøve den mot koden.

## 2. Hva som skal leveres

Ett dokument: `docs/kartlegging-struktur-spor-d-2026-10-05.md`, i formen
[`.claude/rules/dokumentasjon.md`](../.claude/rules/dokumentasjon.md) beskriver.
Det skal ha dato og commit i åpningen, lenker til forrige ledd og
**«Verifikasjon og grenser»** til slutt. Skill hele veien mellom «Kjørt og
observert» og «Lest ut av koden».

Dokumentet skal ha:

1. **Kart over slutningene (M1 og M4).** Én tabell per slutning: subsidiært
   eller prinsipalt, årsaken (avslag, § 32.2-preklusjon, frafall, preklusjon
   etter § 33.4 / § 34.1.2 / § 34.1.3), resultatet, låsing, lukket/åpen og
   neste handling. Hver rad er ett sted slutningen regnes ut: fil og symbol,
   lag (regler, projeksjon, forretningsregler, frontend-domene, komponent,
   brev, fullmakt, mockup), hva den leser (hendelsesfelt, tilstand, gjeldende
   underkategori) og om den er regelversjonsbundet. Marker stedene som gir
   ulikt svar på samme input, og vis det med en test eller et konkret
   hendelsesforløp der det lar seg gjøre.
2. **Eierskap i projeksjonen (M2).** For hver tilstandsmodell i
   `backend/models/sak_state.py`: hvilke hendelsestyper skriver hvert felt i
   `backend/services/timeline_service.py`, og om flere gjør det. Skill mellom
   felt som er hendelsens eget innhold og felt som er avledet. Merk felt som
   er avledet ved skrivetid, men regnes av gjeldende tilstand ved lesetid (det
   var feilen i #215).
3. **Datamodellen for hendelsene (M3).** For hver `*Data`-modell i
   `backend/models/events.py`: hvilke kombinasjoner av felt er lovlige etter
   domenet, hvilke håndheves av modellen, av forretningsreglene, eller ikke i
   det hele tatt. Vurder om en modell per varseltype, eller en diskriminert
   union, ville gjort ulovlige kombinasjoner umulige.
4. **Kontrakten mellom API og frontend (M5).** Hvordan typene i `src/lib/types/`
   holdes i takt med Pydantic-modellene i dag, og hva det vil koste å generere
   dem.
5. **Issueregister.** Alle åpne issues med `spor-d`, hver med mønsteret den
   hører til (eller «ingen»), og om den forsvinner med den foreslåtte formen
   eller må rettes uansett. Si fra der hypotesen i avsnitt 1 plasserer et issue
   feil, eller der et mønster ikke holder.
6. **Forslag.** For hvert mønster som holder: en målform, hva den erstatter,
   hvor mye av frontend-speilet som da blir veiledning og hva som må være
   igjen, og en rekkefølge som kan gjøres i små PR-er. Ta stilling til
   alternativene orkestratoren skisserte, og forkast dem som ikke holder:
   - M1: backend regner ut ett standpunkt per spor (prinsipalt eller
     subsidiært, årsaken og resultatet) og sender det i API-et. Brevet,
     fullmakten og visningen leser det i stedet for å regne selv.
   - M2: en eierskapstabell for feltene i tilstanden, håndhevet av en test.
   - M3: en datamodell per varseltype.
   - M4: statusmengdene ligger i backend og eksporteres til frontend, slik
     `backend/constants/frist_foresporsel.json` gjør.
   - M5: genererte frontendtyper.
   Husk B-13-vedtakene: backend eier det som lagres med rettsvirkning, og
   brevteksten er BHs og låses av klienten (T-a). En målform må gå opp med dem,
   eller si eksplisitt hvilket vedtak den krever endret.

## 3. Arbeidsform

- Les `AGENTS.md` først, særlig resonneringsreglene. Les hele stedet, ikke et
  `grep`-vindu. Har du funnet ett sted en slutning regnes ut, har du ikke funnet
  alle. Skriv hvilke former du søkte etter: navnene `subsidiaer`, `prekluder`,
  `varslet_i_tide`, `erGrunnlaget`, `LUKKEDE_STATUSER`, `closed` og så videre,
  både i Python, TypeScript og Svelte.
- Kartleggingen kan fordeles på Explore-subagenter, én per mønster, men du
  kontrollerer selv hver påstand som skal stå i dokumentet.
- Ingen produksjonskode endres. Reproduksjonstester er lov og ønsket. De står som
  strenge `xfail` (backend) eller `it.fails` (frontend) med issuenummer eller
  funn-ID i begrunnelsen.
- Nye funn som ikke har et issue, får funn-ID i dokumentet (prefiks `SK-`) og
  et issue med `spor-d` og `review-oppfølging`. Funn som er dekket av et
  eksisterende issue, får en kommentar der i stedet.
- Oppdragsgiver følger økta. Still spørsmålene samlet med `AskUserQuestion`
  når kartet er ferdig og før forslagene skrives, med alternativer og en
  anbefaling. Det gjelder tiltenkt atferd, NS 8407 og prioritering.
  `docs/NS_8407.md` finnes ikke i containeren og skal aldri committes;
  oppdragsgiver gir deg kontraktsteksten.
- Krever forslagene en beslutning, før den opp som ny B-ID (neste ledige etter
  B-13) med status «åpen» i hovedplanen, med en datert merknad, og lag et issue
  med etiketten `beslutning` som samler grunnlaget. Skriv ikke arbeidsstatus i
  hovedplanen.
- Legg dokumentet inn i indeksen i `docs/README.md`.

## 4. Levering

- Branch `claude/strukturkartlegging-spor-d`. Én PR mot `main` med dokumentet,
  denne fila, reproduksjonstestene og endringene i hovedplanen og
  `docs/README.md`. Ikke merge.
- Sjekker før push: `cd backend && /tmp/venv/bin/python -m pytest -q`,
  `npm test`, `npm run check:error` (0 errors), `ruff check backend/` og
  `python docs/verktoy/lenkekontroll.py`.
- Diffen rører bare `docs/` og tester, så `/code-review` trengs ikke. Be heller
  en subagent i egen kontekst lese dokumentet mot koden og kontrollere et utvalg
  av påstandene, minst én rad per tabell. Før resultatet inn under
  «Verifikasjon og grenser».
- PR-beskrivelsen er rapporten: konklusjonen i tre–fem setninger (holder
  hypotesen?), hva som er kjørt og hva som er lest, nye issues, og «Åpne
  spørsmål».
- Abonner på PR-en og driv den til grønn CI. Ingen push etter at den er meldt
  klar uten at oppdragsgiver ber om det.
- Retterunder i spor D står på vent til dokumentet er gjennomgått. Ta ingen
  rettinger i denne økta.
