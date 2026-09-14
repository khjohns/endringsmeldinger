# CLAUDE.md

## Prosjekt

KOE (Krav om Endringsordre) — SvelteKit-frontend for NS 8407-forhandlinger. Greenfield-rewrite fra React (unified-timeline).

All UI-tekst er på **norsk (bokmål)**.

## Codegrasp

Bruk codegrasp MCP-server aktivt for kodebase-utforskning og kontekst:
- `run_pipeline` / `get_context_capsule` — foretrekk fremfor Explore-agent (sparer tokens)
- `save_observation` — lagre arkitekturelle innsikter linket til symboler
- `search_memory` / `get_session_context` — hent tidligere observasjoner

## Kommandoer

```bash
npm run dev          # Dev server på :5173 (proxy /api → Flask :5001)
npm run build        # Produksjonsbuild (adapter-static → build/)
npm run check        # Type-check
npm run test         # Vitest (domenetester)
npm run lint         # ESLint
```

## Arkitektur

SvelteKit 2 SPA (`adapter-static`, `ssr: false`) med Svelte 5 runes. Snakker til unified-timeline Flask-backend via API.

### Rutingstruktur

```
/[prosjektId]                    → Saksliste
/[prosjektId]/[sakId]            → Forhandlingsbordet (CasePage)
/[prosjektId]/[sakId]/[spor]     → Spordetalj (grunnlag/vederlag/frist)
```

### Kodestruktur

```
src/lib/
├── domain/     # NS 8407 forretningslogikk (ren TypeScript, kopiert fra unified-timeline)
├── types/      # Domenetyper
├── constants/  # NS 8407-regler og UI-konstanter
├── utils/      # Formattering og domenehjelpere
└── api/        # HTTP-klient mot Flask-backend
```

## Svelte 5 — VIKTIG

```
- Bruk runes ($state, $derived, $effect), IKKE legacy $: syntaks
- Bruk $props(), IKKE export let
- Bruk snippets og {@render}, IKKE <slot>
- Bruk onclick, IKKE on:click
- Bruk callback-props, IKKE createEventDispatcher
- Bruk $state.snapshot() ved sending til API
- Bruk onMount eller +page.ts load for data-henting, IKKE $effect
- Bruk import { browser } from '$app/environment' for localStorage-guard
```

## Svelte 5 Reference

Key Svelte 5 docs relevant to this project's patterns. Consult these before generating Svelte code.

**Runes (core reactivity):**
- `$state`: https://svelte.dev/docs/svelte/$state — deep reactive state via proxies. Use only POJOs, not classes, for reactive data. Use `$state.snapshot()` before serialization, `$state.raw` for read-only datasets.
- `$derived` / `$derived.by`: https://svelte.dev/docs/svelte/$derived — all computed values. `$derived.by(() => ...)` for multi-statement computations. Never use `$effect` for calculations.
- `$effect`: https://svelte.dev/docs/svelte/$effect — only for true side effects (API calls, DOM, localStorage). Never update `$state` inside `$effect` without `untrack`. `$effect.root()` for effects outside component lifecycle.
- `$bindable`: https://svelte.dev/docs/svelte/$bindable — two-way binding in custom components.
- `$inspect`: https://svelte.dev/docs/svelte/$inspect — debugging reactive values. `$inspect.trace()` for tracing updates.

**Snippets (replaces slots):**
- `{#snippet}` + `{@render}`: https://svelte.dev/docs/svelte/snippet — reusable markup blocks within/between components. Typed via `Snippet<[ParamTypes]>` from `'svelte'`. Used for shared markup (weight editors, score cells) across mode-specific components.

**Store composition pattern:**
- Runes work in `.svelte.ts` files. Pure computation functions go in regular `.ts` files — the store wraps them in `$derived`.
- Class-based singleton: export `const store = new StoreClass()` at module level.
- Break large stores into focused delegate modules with pure functions taking `data` as parameter.
- `$derived` is shallow-reactive — pass all dependencies as explicit arguments to extracted functions.
- Migration guide: https://svelte.dev/docs/svelte/v5-migration-guide

## Designsystem

Verifisert mot koden 2026-09-14. Det finnes **to parallelle tokensystemer**. Sjekk
hvilket som gjelder for flaten du endrer før du rører farger.

### 1. `mockup.css` — arbeidsflatene (gjeldende design)

`src/lib/components/kontraktsbord/mockup.css`. Filnavnet er misvisende: dette er
produksjonsdesignet, ikke en mockup. Det importeres av `CaseWorkspace.svelte` og av
rutene `/[prosjektId]/ny` og `/[prosjektId]/endringsordre/ny`, i tillegg til
`/mockup`-rutene.

- ~90 tokens på `:root`. Eget vokabular: `--brand`, `--surface`, `--surface-warm`,
  `--surface-inset`, `--ink` / `--ink-2` / `--ink-3` / `--ink-4`, `--rule`,
  `--danger`, `--success`, `--warning`, `--draft`, `--green`, `--gold`
- Aksent: grønn `--brand: #2d4a3b`
- **Lys er standard.** Mørkt tema er varianten `.mockup.dark`
- Typografi: `--font-sans` Inter, `--font-mono` JetBrains Mono (IBM Plex Mono som
  fallback), `--font-legal` IBM Plex Sans
- Radius settes med literalverdier (2px, 4px, 12px, 999px), ikke tokens
- Broen til `--color-*`-navnene finnes bare i `.mockup .editor-wrapper`, for at
  rik-tekst-editoren skal arve paletten. Den er ikke global.

### 2. `src/app.css` — `@theme inline` (eldre vokabular)

- `--koe-*` → `--color-canvas` / `--color-felt` / `--color-ink` / `--color-wire` /
  `--color-vekt`. Aksent: stålblå `--koe-vekt: #2c5a8c`
- **Lys er standard**, `.dark` er varianten
- Spacing: 4px-grid (`--spacing-1` = 4px … `--spacing-12` = 48px). Gjelder begge systemer
- Radius: `--radius-sm` 2px, `--radius-md` **2px**, `--radius-lg` 6px
- Typografi: `--font-ui` Inter, `--font-prose` IBM Plex Sans, `--font-data` IBM Plex Mono
- I praksis maler denne paletten bare `/login` og `/showcase`. Alt annet laster enten
  `mockup.css` eller overstyrer tokenene lokalt.

### Kjente avvik

- `ProjectOverview.svelte` (oversikten «Krav og endringer», live på `/[prosjektId]`)
  importerer ikke `mockup.css`. Den redeklarerer `--color-*`-navnene med hardkodede
  grønnverdier og har 12 rå hex i sidepanelet. Åtte kjerneverdier er håndduplikater
  av `mockup.css` — endres paletten ett sted, følger ikke det andre etter.
- Skygger er i bruk: 38 forekomster av `box-shadow`. En tidligere regel om
  «ingen skygger, borders-only» stemmer ikke med koden.
- `.interface-design/system.md` beskriver et eldre stålblått fargesystem
  («Dokumentbordet») og er utdatert på farger. Se statusnotisen øverst i filen.

## Konvensjoner

- Domenelogikk i `$lib/domain/` — ren TypeScript, aldri endre uten å forstå NS 8407
- Frontend-komponenter bruker scoped `<style>` med CSS custom properties
- Tailwind v4 med `@theme inline`-tokens
- Rich text: Tipex (`@friendofsvelte/tipex`)
- Derived scores display with `.toFixed(1)`, integer scores as-is
- Python uses `ruff` for linting/formatting, no type checker configured
- ADRs live in `docs/adr-*.md`, implementation plans in `docs/plans/`
- Interface design specs and critiques live in `.interface-design/`

## Planer

- Metaplan: `docs/PLAN_SVELTE_GREENFIELD.md`
- Fase 0-implementering: `docs/plans/2026-03-04-fase0-prosjektoppsett.md`
