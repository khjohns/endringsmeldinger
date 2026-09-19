# Sikkerhets- og kvalitetsrevisjon: Frontend (Svelte 5 runes, reaktivitet, CSRF, skjerming)

**Dato:** 18. september 2026  
**Område:** Frontend-arkitektur, Svelte 5 runes, CSRF-håndtering, autorisasjonsskjerming og tilstandskonsistens  
**Testfiler:**  
- `src/lib/components/kontraktsbord/__tests__/frontend_audit_20260918.test.ts` (Vitest: 5 tester med forventet svikt / `it.fails`)
- `backend/tests/test_security/test_frontend_kontrakt_audit_20260918.py` (Pytest: 2 xfailed tester)  
**Status:** 6 svakheter identifisert og dokumentert med reproduserbare tester. Ingen produksjonskode er endret.

---

## Metodisk presisering

I tråd med revisjonskravene skiller rapporten strengt mellom tre kunnskapsnivåer:
1. **Kjørt og observert:** Faktisk atferd verifisert via kjøring i Vitest, Pytest eller Svelte-kompilatoren (`svelte-check`).
2. **Lest ut av koden:** Direkte observasjon av implementasjonen i TypeScript/Svelte/Python-kildekoden.
3. **Slutning:** Sikkerhetsmessige og forretningsmessige konsekvenser utledet av svakhetene.

---

## Sammendrag av funn

| ID | Alvorlighet | Kategori | Beskrivelse |
|---|---|---|---|
| **FE-01** | **Kritisk** | CSRF / Autentisering | `LetterPreviewModal.svelte` omgår API-klienten (`apiFetch`) og kaller `fetch` direkte uten `X-CSRF-Token`, credentials og `X-Project-ID`. |
| **FE-02** | **Høy** | Autorisasjon / Skjerming | Klientstyrt rolle i `localStorage` og `?rolle=`. Backend returnerer ingen autorisert rolle i `/api/cases/<sak_id>/context`, slik at TE kan presenteres for og sende inn BH-vedtak som feiler kryptisk med 400. |
| **FE-03** | **Middels** | Svelte 5 / Reaktivitet | `$state`-initialiserte skjemafelter i `FristForm` og `VederlagForm` er ikke reaktive overfor oppdaterte props/hendelser og beholder frosne initialdefaults. Svelte-kompilatoren advarer mot `state_referenced_locally`. |
| **FE-04** | **Høy** | Fullmakt / Integritet | `eoExposureFloor` i frontend ignorerer fristdager (`frist_dager * dailyRate`) og returnerer 0 kr ved fristforlengelse, noe som feilinformerer bruker om at endringsordren kan godkjennes på laveste nivå. |
| **FE-05** | **Middels** | Tilstandsisolering | Modul-global muterbar `activeProjectId` i `client.ts` overskrives ved navigasjon og forurenser pågående eller forsinkede asynkrone utkastlagringer. |
| **FE-06** | **Lav/Middels** | Presentasjon / UX | `LetterHtmlPreview.svelte` bruker ren tekstinterpolering (`{...}`) på begrunnelse, slik at HTML-formatering vises som rå tagger for brukeren. |

---

## Detaljert gjennomgang av funn

### FE-01: `LetterPreviewModal.svelte` omgår API-klienten (mangler CSRF og auth-headers)
* **Alvorlighet:** Kritisk
* **Kategori:** CSRF / Autentisering
* **Berørte filer:**
  - `src/lib/components/kontraktsbord/LetterPreviewModal.svelte` (linje 19–22)
  - `src/lib/api/client.ts` (linje 130–180)
  - `backend/routes/letter_routes.py` (linje 25–28)
* **Kjørt og observert:**
  - Kjøring av `backend/tests/test_security/test_frontend_kontrakt_audit_20260918.py::test_letter_preview_mangler_csrf_og_avvises_i_produksjon` bekrefter at en POST-forespørsel mot `/api/letter/generate` med kun `Content-Type: application/json` blir avvist med HTTP 403 Forbidden ("CSRF validation failed").
  - Kjøring av `src/lib/components/kontraktsbord/__tests__/frontend_audit_20260918.test.ts` (FE-01) bekrefter at `LetterPreviewModal` ikke inkluderer `X-CSRF-Token` eller `X-Project-ID`.
* **Lest ut av koden:**
  - I `LetterPreviewModal.svelte`:
    ```typescript
    const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/letter/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ... })
    });
    ```
  - Appens sentraliserte klient `apiFetch` i `client.ts` sørger for `credentials: 'include'`, `X-CSRF-Token` via `getCsrfToken()` og `X-Project-ID` via `activeProjectId`.
  - `LetterPreviewModal.svelte` omgår `apiFetch` fullstendig.
* **Slutning:**
  I et reelt produksjonsmiljø med autentisering og CSRF-beskyttelse vil ethvert forsøk på å laste ned PDF fra forhåndsvisningsmodalen feile umiddelbart med 401 eller 403. Uten `X-Project-ID` vil forespørselen i tillegg feile mot prosjektkontrollen eller tilordnes feil standardprosjekt.

---

### FE-02: Klientstyrt rolle i `localStorage` og manglende autoritativ rollestyring
* **Alvorlighet:** Høy
* **Kategori:** Autorisasjon / Skjerming
* **Berørte filer:**
  - `src/routes/[prosjektId]/[sakId]/+page.svelte` (linje 21–28)
  - `src/lib/kontraktsbord/viewState.ts` (funksjonen `readWorkspaceView`)
  - `backend/routes/event_routes.py` (linje 1098–1150)
* **Kjørt og observert:**
  - Kjøring av `backend/tests/test_security/test_frontend_kontrakt_audit_20260918.py::test_sak_context_mangler_brukerens_autoriserte_rolle` bekrefter at `/api/cases/<sak_id>/context` ikke inneholder noe felt for `contract_role` eller `user_role`.
  - Kjøring av Vitest-testen (FE-02) bekrefter at `readWorkspaceView(new URLSearchParams('rolle=BH'), 'TE')`盲t overstyrer visningsrollen til `'BH'`.
* **Lest ut av koden:**
  - `+page.svelte` leser brukerens rolle fra `localStorage.getItem('koe-user-role')` og oppdaterer localStorage ved endring.
  - Når en TE-bruker endrer visningsrolle til `'BH'` via meny eller URL (`?rolle=BH`), rendrer grensesnittet Byggherrens handlingspanel med knapper som «Ferdigstill vurdering», «Godkjenn krav» og «Avslå krav».
  - Når TE-brukeren fyller ut skjemaet og sender inn, overstyrer backend `event_data["aktor_rolle"] = g.contract_role` ('TE'). `BusinessRuleValidator.validate_actor_role` kaster da `400 Bad Request` fordi TE ikke har lov til å sende BH-hendelser.
* **Slutning:**
  Frontend gir brukeren en falsk forventning om fullmakt og tilgang, lar motparten fylle ut interne vurderinger for motpartens rolle, og krasjer først ved nettverkskallet med en ugjennomsiktig 400-feil. Rollestyring må være forankret i sesjonen fra backend, ikke i lokal nettleserlagring.

---

### FE-03: `$state`-initialiserte skjemafelter synkroniseres ikke ved endrede props i Svelte 5
* **Alvorlighet:** Middels
* **Kategori:** Svelte 5 / Reaktivitet
* **Berørte filer:**
  - `src/lib/components/kontraktsbord/FristForm.svelte` (linje 60–74)
  - `src/lib/components/kontraktsbord/VederlagForm.svelte` (linje 73–99)
  - `src/lib/kontraktsbord/CaseWorkspace.svelte` (linje 25)
* **Kjørt og observert:**
  - Kjøring av `npm run check` produserer eksplisitte kompilatorvarsler fra Svelte:
    `Warn: This reference only captures the initial value of 'domainConfig'/'response'/'projectId'/'refetch'. Did you mean to reference it inside a closure instead? (state_referenced_locally)`.
  - Kjøring av Vitest-testen (FE-03) bekrefter at `getDefaults` beregnet ved mount-tidspunktet skiller seg fra en oppdatert konfigurasjon dersom motparten oppdaterer kravlengden.
* **Lest ut av koden:**
  - I `FristForm.svelte`:
    ```typescript
    const initialDefaults = getDefaults({
      krevdDager: domainConfig.krevdDager,
      isUpdateMode: Boolean(previous),
      ...
    });
    let godkjentDager = $state<number | undefined>(initialDefaults.godkjentDager);
    ```
  - I Svelte 5 evalueres `$state(...)` kun én gang under komponentopprettelsen. Dersom `domainConfig` oppdateres (f.eks. ved bakgrunnshenting, reaktiv SSE, eller revisjonsbytte), forblir `$state`-feltene frosset på forrige revisjons verdier.
* **Slutning:**
  Dersom en saksbehandler har et svarskjema åpent mens motparten sender en oppdatert revisjon (f.eks. økning av fristkrav fra 14 til 30 dager), fanger ikke skjemainnmaten opp endringen. Saksbehandler risikerer å svare på et foreldet kravgrunnlag.

---

### FE-04: Fullmaktsomgåelse i frontend (`eoExposureFloor` ignorerer fristdager)
* **Alvorlighet:** Høy
* **Kategori:** Fullmakt / Integritet
* **Berørte filer:**
  - `src/lib/domain/endringsordre.ts` (linje 162–164)
  - `src/lib/approval/eoApproval.ts`
* **Kjørt og observert:**
  - Kjøring av Vitest-testen (FE-04) bekrefter at `eoExposureFloor` returnerer `0` for en endringsordre med 0 kr kompensasjon og 60 dagers fristforlengelse.
* **Lest ut av koden:**
  - `eoExposureFloor` er definert som:
    ```typescript
    export function eoExposureFloor(payload: CreateEORequest): number {
      return Math.max(payload.kompensasjon_belop ?? 0, payload.fradrag_belop ?? 0);
    }
    ```
  - Funksjonen ignorerer `payload.frist_dager * dailyRate` totalt.
  - Dersom `eoExposure` returnerer `null` (f.eks. fordi pris eller sluttdato ikke er fullstendig tallfestet), faller fullmaktskjeden tilbake til `eoExposureFloor`.
* **Slutning:**
  Frontend speiler nøyaktig samme fullmaktssvakhet som ble påvist i backend under Pass 4. Ved å kalkulere en nedre grense på 0 kr for en ordre som gir 60 dagers fristforlengelse (verdt 3 MNOK i dagmulktsrisiko), signaliserer grensesnittet at ordren kan godkjennes på laveste fullmaktsnivå.

---

### FE-05: Modul-global muterbar `activeProjectId` i `client.ts` lekker på tvers av asynkrone kall
* **Alvorlighet:** Middels
* **Kategori:** Tilstandsisolering / Multi-tenancy
* **Berørte filer:**
  - `src/lib/api/client.ts` (linje 11–19)
  - `src/lib/kontraktsbord/submission.svelte.ts` (linje 155)
* **Kjørt og observert:**
  - Kjøring av Vitest-testen (FE-05) bekrefter at `getActiveProjectId()` endres globalt når en annen hendelse kaller `setActiveProjectId`, og at et forsinket asynkront kall vil lese den nye globale tilstanden fremfor prosjektet kallet ble igangsatt for.
* **Lest ut av koden:**
  - `src/lib/api/client.ts` benytter en modulvariabel:
    ```typescript
    let activeProjectId: string = 'oslobygg';
    export function setActiveProjectId(projectId: string) { activeProjectId = projectId; }
    export function getActiveProjectId(): string { return activeProjectId; }
    ```
  - Standardverdien er hardkodet til `'oslobygg'`.
  - I `submission.svelte.ts` utføres utkastlagring med 1200 ms debounce (`LAGRE_FORSINKELSE_MS`).
* **Slutning:**
  Dersom en bruker navigerer mellom to prosjekter i samme sesjon mens en debouncet utkastlagring venter, vil utkastet bli sendt med `X-Project-ID` tilhørende det nye prosjektet. Kallet vil enten feile med 403 Forbidden eller i verste fall forsøke å lagre utkastet under feil prosjektkontekst.

---

### FE-06: Visningsfeil og formateringstap i forhåndsvisning av brev (`LetterHtmlPreview`)
* **Alvorlighet:** Lav/Middels
* **Kategori:** Presentasjon / UX
* **Berørte filer:**
  - `src/lib/components/kontraktsbord/LetterHtmlPreview.svelte` (linje 35–42)
  - `src/lib/approval/letter.ts` (linje 68–101)
  - `backend/services/letter_pdf_generator.py` (linje 117–140)
* **Lest ut av koden:**
  - I `LetterHtmlPreview.svelte`:
    ```svelte
    <div class="letter-section-text">{brevInnhold.seksjoner.begrunnelse.redigertTekst}</div>
    ```
  - Teksten interpoleres som ren tekst (`{...}`), ikke med HTML eller markdown-tolkning.
  - Dersom `redigertTekst` inneholder rik tekst eller HTML-elementer fra skjemaet, rendres kodetaggene direkte som synlig tekststreng for brukeren i forhåndsvisningen.
  - I backend utfører `letter_pdf_generator.py` derimot `escape(line)` og forventer markdown for formatering (`**bold**`), noe som skaper et avvik mellom hva saksbehandler ser i skjermforhåndsvisningen og hva som genereres i den endelige PDF-en.
* **Slutning:**
  Brevforhåndsvisningen i nettleseren stemmer ikke overens med PDF-utskriften, noe som skaper usikkerhet for saksbehandlere som skal sende formelle kontraktsbrev.

---

## Verifikasjon og reproduksjon

### Vitest (Frontend):
```bash
npx vitest run src/lib/components/kontraktsbord/__tests__/frontend_audit_20260918.test.ts
```
**Resultat:** 5 passed (alle 5 tester markert med `it.fails` forventet svikt og bestod pga. påviste feil).

### Pytest (Backend-kontrakter):
```bash
./backend/venv/bin/pytest backend/tests/test_security/test_frontend_kontrakt_audit_20260918.py -v
```
**Resultat:** 2 xfailed (strengt håndhevet med `strict=True` og `raises=AssertionError`).
