# CLAUDE.md

## Prosjekt

KOE (Krav om Endringsordre) — SvelteKit-frontend for NS 8407-forhandlinger. Greenfield-rewrite fra React (unified-timeline).

All UI-tekst er på **norsk (bokmål)**.

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

## Designsystem — Analysebordet

- Dark-only theme med tokens i `src/app.css` (`@theme inline`)
- Spacing: 4px grid (spacing-1=4, spacing-2=8, ..., spacing-12=48)
- Radius: sm=2px, md=4px, lg=6px (skarpere enn standard)
- Typografi: Inter (UI), IBM Plex Sans (prosa/skriving), IBM Plex Mono (data/tall)
- Farger: canvas/felt/ink/wire/vekt-hierarki
- INGEN skygger — borders-only + surface shifts

## Konvensjoner

- Domenelogikk i `$lib/domain/` — ren TypeScript, aldri endre uten å forstå NS 8407
- Frontend-komponenter bruker scoped `<style>` med CSS custom properties
- Tailwind v4 med `@theme inline`-tokens
- Rich text: Tipex (`@friendofsvelte/tipex`)

## Planer

- Metaplan: `docs/PLAN_SVELTE_GREENFIELD.md`
- Fase 0-implementering: `docs/plans/2026-03-04-fase0-prosjektoppsett.md`
