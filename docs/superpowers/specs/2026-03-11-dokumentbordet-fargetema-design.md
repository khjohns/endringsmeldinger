# Dokumentbordet — Fargetema Design

**Dato:** 2026-03-11
**Status:** Godkjent

## Bakgrunn

KOE brukte zinc-baserte fargetokens som ga 29 (lys) og 24 (mørk) WCAG AA-feil i kontrastsjekk. Fargene var kalde og upersonlige. Brukeren ønsket et varmere, papir-inspirert tema med blekk-hierarki — "Dokumentbordet".

## Retning

**B: Dokumentbordet** — papir-inspirerte overflater, jernblekk-hierarki, gylden amber-aksent. Varmt og substansielt uten å bli "beige". Narrativet passer alle tre nivåer: saksoversikten er kontrollrommet med dokumenter spredt ut, saksmappen er en fysisk mappe, arbeidsflaten er skrivebordet der du signerer med blekk.

## Tokens

### Overflater (Surfaces)

| Token | Light | Dark | Rolle |
|-------|-------|------|-------|
| `canvas` | `#f3f1ec` | `#0f0d0a` | Bakgrunn |
| `felt` | `#faf8f4` | `#16140f` | Kort, paneler |
| `felt-raised` | `#f3f1ec` | `#1e1b16` | Toolbar, headers |
| `felt-hover` | `#efede7` | `#1a1815` | Hover |
| `felt-active` | `#e5e2da` | `#282520` | Aktiv/trykket |

### Blekk (Ink)

Kontrastverdier er maalt mot `felt` (#faf8f4 lys / #16140f moerk) — den vanligste bakgrunnen for tekst. Eksakte verdier verifiseres i contrast-check.js under implementering.

| Token | Light | Dark | Rolle |
|-------|-------|------|-------|
| `ink` | `#21201c` | `#f5f3ee` | Primaertekst (AA+) |
| `ink-secondary` | `#57524b` | `#a8a29a` | Stoettetekst (AA+) |
| `ink-muted` | `#655f56` | `#908b82` | Labels, metadata med mening (AA 4.5:1+) |
| `ink-ghost` | `#8d8578` | `#666157` | KUN dekorativt (~3:1, under AA) |

### Wire (borders)

| Token | Light | Dark |
|-------|-------|------|
| `wire` | `rgba(33,28,18, 0.06)` | `rgba(245,235,220, 0.08)` |
| `wire-strong` | `rgba(33,28,18, 0.12)` | `rgba(245,235,220, 0.15)` |
| `wire-focus` | `rgba(33,28,18, 0.20)` | `rgba(245,235,220, 0.25)` |

### Vekt (amber accent)

I lyst tema er `vekt-dim` moerkere enn `vekt` — "dim" betyr lavere visuell fremtredenhet, som paa lyse flater oppnaas med moerkere/brunere toner. I moerkt tema er dim lysere (naermere bakgrunn).

| Token | Light | Dark | Rolle |
|-------|-------|------|-------|
| `vekt` | `#925609` | `#f59e0b` | Primaeraksent |
| `vekt-dim` | `#7c4a0a` | `#d97706` | Dempet aksent |
| `vekt-bg` | `rgba(146,86,9, 0.06)` | `rgba(245,158,11, 0.08)` | Aksent-bakgrunn |
| `vekt-bg-strong` | `rgba(146,86,9, 0.12)` | `rgba(245,158,11, 0.14)` | Sterkere aksent-bg |

### Score (semantisk)

Merk: `score-high-bg` lys bruker solid hex (forhåndskomposittert), mens moerke bg-verdier bruker rgba for komposisjon mot ulike overflater.

| Token | Light | Dark | Rolle |
|-------|-------|------|-------|
| `score-high` | `#047d56` | `#10b981` | Godkjent, positiv |
| `score-high-bg` | `#eff5ee` | `rgba(16,185,129, 0.10)` | Groenn bakgrunn |
| `score-mid` | `#655f56` | `#908b82` | Noytral (= ink-muted) |
| `score-low` | `#c01b3d` | `#f03e5f` | Avvist, frist |
| `score-low-bg` | `#f5eeef` | `rgba(240,62,95, 0.08)` | Roed bakgrunn |

## ink-ghost policy

ink-ghost (~3:1) er bevisst under WCAG AA. Tillatt kun for:
- Timestamps som ogsaa vises i kontekst (tidslinje-posisjon)
- Dekorative divider-labels

IKKE tillatt for placeholder-tekst — WCAG krever 4.5:1 for placeholders. Bruk ink-muted for placeholders.

All tekst med selvstendig informasjonsverdi maa bruke ink-muted (4.5:1+) eller hoeyere.

## Hva endres

1. `src/app.css` — alle fargetokens i `:root` og `.dark` (overflater, blekk, wire, vekt, score)
2. `src/contrast-check.js` — oppdater hex-verdier, verifiser 0 AA-feil for informativ tekst
3. `.interface-design/system.md` — dokumenter nye tokens og Dokumentbordet-narrativet
4. Audit ink-ghost-bruk i komponenter — flytt til ink-muted der ghost baerer selvstendig info

## Hva endres IKKE

- Spacing (4px grid), radius (sm/md/lg), typografi (Inter/JetBrains Mono)
- Dybdemodell (borders-only, ingen skygger)
- Komponentstruktur, layout, grid
