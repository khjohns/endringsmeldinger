---
name: uu-sjekk
description: Sjekklisten for universell utforming (WCAG 2.1 A og AA) i visningen i endringsmeldinger, i tre lister - «Tidlig sjekk» mens en komponent bygges, «Siste sjekk» før PR-en meldes klar og «Sjekk igjen» etter en retting. Bygger på sjekklisten og rådene i Punkt, designsystemet til Oslo kommune, med egne ord. Brukes fra grensesnitt, design-review og design-deslop.
---

# Sjekk for universell utforming

Lista bygger på [sjekklisten for UU](https://punkt.oslo.kommune.no/latest/god-praksis/sjekkliste-uu/)
i Punkt, med egne ord og tilpasset en innlogget fagapplikasjon med skjemaer,
tabeller, dialoger og brevtekst, i lys og mørk modus og på smal skjerm. Punkt
oppgir ingen lisens for teksten på sidene, så den er ikke tatt inn ordrett (#1187).
Kravet er WCAG 2.1 A og AA.

**Automatikken finner bare en del.** [Testverktøysida i Punkt](https://punkt.oslo.kommune.no/latest/universell-utforming/testverktoy/)
anslår om lag 30 % av feilene. `uu.mjs` i skillen [`mockup-nettleser`](../mockup-nettleser/SKILL.md)
kjører axe-core mot `/mockup`. Resten av lista kontrolleres for hånd: med
tastaturet, med Playwright der det er raskere, og ved å lese koden.

Beslutningene om knapper, skjemaer og feilmeldinger står i
[systemfila](../../../docs/design/system.md), og målene for treffflate og animasjon
i [grensesnitt-skillen](../grensesnitt/SKILL.md). Lista gjentar dem ikke.

## Tidlig sjekk

Mens komponenten planlegges og bygges. Ta med gruppene komponenten har.

**Grunnlaget**
- Teksten tåler 200 % zoom, og visningen tåler 320 px bredde uten vannrett rulling og
  uten at innhold eller handlinger forsvinner.
- Farge står aldri alene: tekst, ikon eller mønster sier det samme (systemfila,
  «Farge som betyr noe»).
- Visningen virker i lys og mørk modus og på smal skjerm.

**Struktur**
- Landemerker der de hører hjemme: `header`, `nav`, `main`, `aside`, `form`.
- Overskriftene kommer i rekkefølge uten hopp. En komponent som kan stå på flere
  nivåer, tar nivået som egenskap.
- Det naturlige HTML-elementet først. Trengs et annet, står grunnen i en kommentar
  eller i issuet.
- En egen kontroll har riktig navn, rolle og verdi. ARIA brukes bare når HTML ikke
  sier nok, og egne kontroller følger mønstrene i
  [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/).
  Kontrollene fra bits-ui gjør det allerede.

**Tastatur og fokus**
- Alt kan gjøres med tastaturet, og fokus blir aldri fanget utenfor et overlegg.
- Fokus synes (`:focus-visible`), og tab-rekkefølgen følger leserekkefølgen og
  DOM-en.
- Fokus alene endrer ikke konteksten: ingen navigasjon eller sending når et felt får
  fokus.
- En lenke til hovedinnholdet er første fokuserbare element og synes når den har
  fokus.

**Knapper og lenker**
- En nedtrekksliste eller meny har `aria-expanded`, og `aria-haspopup` der det
  passer.
- Teksten sier hva som skjer. Har knappen bare et ikon, har den `aria-label`.
- Fokus, hover og aktiv synes, i begge modi.

**Skjemaer**
- Hvert felt har en `label` koblet med `for` og `id`. Plassholdertekst bærer aldri
  mening.
- Riktig `type`, `inputmode` og `autocomplete`, så tastaturet på mobil passer.
- Radioknapper, avkrysningsbokser og felt som hører sammen, står i `fieldset` med
  `legend`.
- Feilmeldingen sier hva som hindrer, og er koblet til feltet med
  `aria-describedby`. Feltet har `aria-invalid` mens feilen står.
- En feil vises ikke bare med farge.
- Dato og tall kan skrives inn, ikke bare velges.

**Dialoger og overlegg**
- Fokus flyttes inn, holdes der og føres tilbake til elementet som åpnet
  dialogen.
- Bakgrunnen kan ikke fokuseres, brukes eller rulles mens dialogen er åpen, heller
  ikke på smal skjerm.
- Escape lukker, og lukker med det minst inngripende valget.

**Tabeller**
- Overskriftene er `<th>` med `scope`.
- En tabell med tittel har `caption`.

**Bilder og ikoner**
- Et ikon som bærer mening, har et tilgjengelig navn. Et ikon som er pynt, har
  `aria-hidden="true"`.
- Ingen tekst i bilder, og ingen meningsbærende bilder i CSS.

**Animasjon**
- `prefers-reduced-motion` respekteres.
- Ingenting blinker mer enn tre ganger i sekundet.

**Visuelt**
- Kontrasten holder WCAG AA: 4,5:1 for tekst og 3:1 for stor tekst, ikoner,
  feltkanter og fokusmarkering. Begge modi, også på smal skjerm.
- Treffflaten følger grensesnitt-skillen.

**Skjermleser og tilstand**
- Det som betyr noe, leses opp i logisk rekkefølge.
- Fokus starter et fornuftig sted etter navigasjon og når et steg byttes.
- En endring som skjer uten at parten flytter fokus, kunngjøres med `aria-live`:
  at et svar er sendt, en lagring eller en feil fra serveren. Kunngjøringen tar
  ikke fokus.
- Parten varsles før sesjonen går ut, så et utkast ikke går tapt.

## Siste sjekk

Før PR-en meldes klar, på det diffen endrer.

1. **Semantikk:** `<button>` for handlinger, `<a>` for navigasjon, overskrifter og
   landemerker i orden.
2. **Tastatur:** hele flyten med Tab, Shift+Tab, Enter, mellomrom, piltaster og
   Escape, uten feller og med synlig fokus.
3. **Navn, rolle og tilstand:** også `aria-expanded`, `aria-pressed`,
   `aria-selected` og `aria-invalid` der de gjelder.
4. **Ikoner:** pynt er skjult, og meningsbærende ikoner har navn.
5. **Skjemaer:** label, `type` og `autocomplete`. Feil står som tekst ved feltet og
   er koblet til det.
6. **Kontrast og størrelse:** WCAG AA i begge modi, treffflaten etter
   grensesnitt-skillen, og 200 % zoom.
7. **Overlegg:** fokus holdes i dialogen, bakgrunnen kan ikke brukes, og Escape
   lukker.
8. **Smal skjerm:** ingenting forsvinner, og ingen vannrett rulling.
9. **Automatikken:** `node .claude/skills/mockup-nettleser/uu.mjs` uten brudd i det diffen
   endrer. Et brudd som også finnes på `main`, føres i et issue.
   Resultatet står i PR-en, og det står hva som er kontrollert for hånd.

## Sjekk igjen

Etter en retting, på elementene rettingen rører.

1. **Tastatur og fokus:** flyten virker fortsatt med tastaturet, og fokus står der
   det gir mening før, under og etter handlingen.
2. **Navn, rolle og tilstand** er fortsatt riktige.
3. **Visuelt:** ingen ny kontrastfeil i noen av modiene, og ingenting nytt som
   brekker på smal skjerm. Kjør `uu.mjs` igjen når rettingen endrer farge, struktur
   eller et skjema.
