# Brev-generator (Mockup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La alle hendelser i mockup-historikken kunne generere formelle brev med A4-forhåndsvisning, redigerbare seksjoner, og PDF-nedlasting.

**Architecture:** LetterPreviewModal åpnes fra historikk-events i RightSidebar. Modalen har to tabs (Rediger/Forhåndsvis). Content builder genererer brevinnhold fra event + sakState. PDF-nedlasting via eksisterende backend-API (`POST /api/letter/generate`).

**Tech Stack:** Svelte 5, TypeScript, eksisterende ReportLab backend for PDF.

---

## File Structure

| Fil | Ansvar |
|-----|--------|
| `src/lib/mockup/letterTypes.ts` | TypeScript-typer: BrevInnhold, BrevSeksjon, BrevPart, etc. |
| `src/lib/mockup/letterContentBuilder.ts` | Bygger BrevInnhold fra TimelineEvent + SakState |
| `src/lib/mockup/LetterHtmlPreview.svelte` | A4-simulering med inline styles |
| `src/lib/mockup/LetterPreviewModal.svelte` | Modal med Rediger/Forhåndsvis tabs + PDF-nedlasting |
| `src/lib/mockup/RightSidebar.svelte` | Modify: legg til «Generer brev»-knapp per event |
| `src/lib/mockup/Kontrollrommet.svelte` | Modify: modal-state for brev |

---

### Task 1: Letter Types

**Files:**
- Create: `src/lib/mockup/letterTypes.ts`

- [ ] **Step 1: Create letter types**

```typescript
import type { SporType } from '$lib/types/timeline';

export interface BrevSeksjon {
  tittel: string;
  originalTekst: string;
  redigertTekst: string;
}

export interface BrevSeksjoner {
  innledning: BrevSeksjon;
  begrunnelse: BrevSeksjon;
  avslutning: BrevSeksjon;
}

export interface BrevPart {
  navn: string;
  rolle: 'TE' | 'BH';
  adresse?: string;
  orgnr?: string;
}

export interface BrevReferanser {
  sakId: string;
  sakstittel: string;
  eventId: string;
  sporType: SporType;
  dato: string;
  kravDato?: string;
}

export interface BrevInnhold {
  tittel: string;
  mottaker: BrevPart;
  avsender: BrevPart;
  referanser: BrevReferanser;
  seksjoner: BrevSeksjoner;
}

export function isSeksjonEdited(seksjon: BrevSeksjon): boolean {
  return seksjon.redigertTekst !== seksjon.originalTekst;
}

export function resetSeksjon(seksjon: BrevSeksjon): BrevSeksjon {
  return { ...seksjon, redigertTekst: seksjon.originalTekst };
}

export function hasEdits(seksjoner: BrevSeksjoner): boolean {
  return (
    isSeksjonEdited(seksjoner.innledning) ||
    isSeksjonEdited(seksjoner.begrunnelse) ||
    isSeksjonEdited(seksjoner.avslutning)
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx svelte-check --output human 2>&1 | grep -i error`
Expected: 0 errors

---

### Task 2: Letter Content Builder

**Files:**
- Create: `src/lib/mockup/letterContentBuilder.ts`

- [ ] **Step 1: Create content builder**

The builder takes a TimelineEvent + SakState and generates BrevInnhold.

Key logic:
- Determine spor type from `event.spor` or parse from `event.type`
- Build mottaker/avsender from party names (swap based on actor role)
- Generate innledning from event summary + referanser
- Generate begrunnelse from event data fields (beskrivelse, begrunnelse)
- Generate avslutning with formal closing

Use `store.teNavn` / `store.bhNavn` for party names. Access `sak.grunnlag`, `sak.vederlag`, `sak.frist` for track-specific data.

```typescript
import type { TimelineEvent, SakState, SporType } from '$lib/types/timeline';
import type { BrevInnhold, BrevSeksjoner, BrevSeksjon, BrevPart, BrevReferanser } from './letterTypes';
import { getEventTypeLabel } from '$lib/constants/eventTypeLabels';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function makeSeksjon(tittel: string, tekst: string): BrevSeksjon {
  return { tittel, originalTekst: tekst, redigertTekst: tekst };
}

function getSporLabel(spor: SporType): string {
  const labels: Record<string, string> = {
    grunnlag: 'ansvarsgrunnlag', vederlag: 'vederlagsjustering', frist: 'fristforlengelse',
  };
  return labels[spor] ?? spor;
}

function extractBegrunnelse(event: TimelineEvent): string {
  if (!event.data || typeof event.data !== 'object') return event.summary ?? '';
  const d = event.data as Record<string, unknown>;
  return (d.begrunnelse ?? d.beskrivelse ?? d.endrings_begrunnelse ?? event.summary ?? '') as string;
}

export function buildLetterContent(
  event: TimelineEvent,
  sak: SakState,
): BrevInnhold {
  const sporType: SporType = event.spor ?? 'grunnlag';
  const dato = event.time ? formatDate(event.time) : formatDate(new Date().toISOString());
  const eventLabel = getEventTypeLabel(event.type?.replace('no.oslo.koe.', '') ?? '');
  const sporLabel = getSporLabel(sporType);

  const isTE = event.actorrole === 'TE';
  const avsenderNavn = isTE ? (sak.entreprenor ?? 'Totalentreprenør') : (sak.byggherre ?? 'Byggherre');
  const mottakerNavn = isTE ? (sak.byggherre ?? 'Byggherre') : (sak.entreprenor ?? 'Totalentreprenør');

  const innledningTekst =
    `Vi viser til ${sporLabel} i sak ${sak.sak_id} — «${sak.grunnlag.tittel ?? 'Endringsmelding'}».\n\n` +
    `Denne hendelsen gjelder: ${eventLabel} (${dato}).`;

  const begrunnelseTekst = extractBegrunnelse(event);

  const avslutningTekst =
    `Med vennlig hilsen\n${avsenderNavn}\n\n${dato}`;

  return {
    tittel: `Vedr: ${eventLabel} — ${sak.grunnlag.tittel ?? sak.sak_id}`,
    mottaker: { navn: mottakerNavn, rolle: isTE ? 'BH' : 'TE' },
    avsender: { navn: avsenderNavn, rolle: isTE ? 'TE' : 'BH' },
    referanser: {
      sakId: sak.sak_id,
      sakstittel: sak.grunnlag.tittel ?? sak.sak_id,
      eventId: event.id,
      sporType,
      dato,
    },
    seksjoner: {
      innledning: makeSeksjon('Innledning', innledningTekst),
      begrunnelse: makeSeksjon('Begrunnelse', begrunnelseTekst),
      avslutning: makeSeksjon('Avslutning', avslutningTekst),
    },
  };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx svelte-check --output human 2>&1 | grep -i error`
Expected: 0 errors

---

### Task 3: A4 HTML Preview Component

**Files:**
- Create: `src/lib/mockup/LetterHtmlPreview.svelte`

- [ ] **Step 1: Create the A4 preview component**

Pure visual component — renders a BrevInnhold as an A4 paper simulation with inline styles. No interactivity.

Layout: Logo + header → mottaker → tittel (med underline) → tre seksjoner → footer.

Palette: dark blue `#2A2859` for tittel, `#2C2C2C` for text, `#E6E6E6` for borders.

Props: `brevInnhold: BrevInnhold`

Render `redigertTekst` for each section. Preserve newlines with `white-space: pre-wrap`.

- [ ] **Step 2: Verify no errors**

Run: `npx svelte-check --output human 2>&1 | grep -i error`

---

### Task 4: Letter Preview Modal

**Files:**
- Create: `src/lib/mockup/LetterPreviewModal.svelte`

- [ ] **Step 1: Create modal with two tabs**

Props: `brevInnhold: BrevInnhold`, `onclose: () => void`

State:
- `activeTab: 'editor' | 'preview'` (default: 'editor')
- `seksjoner: BrevSeksjoner` (mutable copy from brevInnhold)
- `isDownloading: boolean`

**Rediger tab:** Three section editors — each with textarea + reset button (visible only when edited). Show section title as label.

**Forhåndsvis tab:** Render `LetterHtmlPreview` with current seksjoner.

**Footer:** «Lukk» (secondary) + «Last ned PDF» (primary, calls backend API). Show error toast on failure.

**PDF download handler:**
```typescript
async function downloadPdf() {
  isDownloading = true;
  try {
    const resp = await fetch('/api/letter/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brev_innhold: {
          tittel: brevInnhold.tittel,
          mottaker: brevInnhold.mottaker,
          avsender: brevInnhold.avsender,
          referanser: {
            sak_id: brevInnhold.referanser.sakId,
            sakstittel: brevInnhold.referanser.sakstittel,
            event_id: brevInnhold.referanser.eventId,
            spor_type: brevInnhold.referanser.sporType,
            dato: brevInnhold.referanser.dato,
          },
          seksjoner: {
            innledning: seksjoner.innledning.redigertTekst,
            begrunnelse: seksjoner.begrunnelse.redigertTekst,
            avslutning: seksjoner.avslutning.redigertTekst,
          },
        },
      }),
    });
    if (!resp.ok) throw new Error(`${resp.status}`);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brev-${brevInnhold.referanser.sakId}-${brevInnhold.referanser.sporType}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Silently fail in mockup — backend may not be running
  } finally {
    isDownloading = false;
  }
}
```

- [ ] **Step 2: Verify no errors**

Run: `npx svelte-check --output human 2>&1 | grep -i error`

---

### Task 5: Wire Up — RightSidebar + Kontrollrommet

**Files:**
- Modify: `src/lib/mockup/RightSidebar.svelte`
- Modify: `src/lib/mockup/Kontrollrommet.svelte`

- [ ] **Step 1: Add brev button to historikk events**

In RightSidebar, add a new callback prop `onletterclick?: (ev: TimelineEvent) => void`. Add a small «Brev»-knapp (FileText icon) on each event row, visible on hover.

- [ ] **Step 2: Add modal state to Kontrollrommet**

Add `letterEvent: TimelineEvent | null` state. When set, render LetterPreviewModal with `buildLetterContent(letterEvent, store.sak)`. Pass `onletterclick` callback to RightSidebar that sets `letterEvent`.

- [ ] **Step 3: Verify everything works**

Run: `npx svelte-check --output human 2>&1 | grep -i error`
Then: `npx vite build --logLevel error`

- [ ] **Step 4: Visual test**

Start dev server and verify:
1. Historikk tab → hover over event → «Brev» button appears
2. Click → modal opens with Rediger tab
3. Edit a section → reset button appears
4. Switch to Forhåndsvis → A4 preview renders
5. Close modal

---
