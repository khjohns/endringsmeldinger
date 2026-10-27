---
name: grensesnitt
description: Arbeidsmetoden for visningen i endringsmeldinger, med hensikten, sjekklisten før hver komponent, hva som gjenbrukes, tilstandene, animasjonen og kontrollene. Leser beslutningene i docs/design/system.md. Brukes før en .svelte- eller CSS-fil i src/ endres synlig, og når en ny visning eller komponent skal bygges. Rydding og review av en ferdig diff gjøres med design-deslop og design-review.
---

# Grensesnittet

Metoden bygger på [interface-design](https://github.com/Dammyjay93/interface-design)
(MIT, commit `2f9be32`; lisensen står i [LISENS.md](LISENS.md)). Den er tilpasset et
juridisk verktøy: målet er at visningen er forutsigbar og sier det partene sa, ikke at
den skiller seg ut.

**Beslutningene står i [`docs/design/system.md`](../../../docs/design/system.md).
Verdiene står i `src/lib/components/kontraktsbord/theme.css`, og avstand og radius i
`@theme` i `src/app.css`.** Les systemfila før du endrer visningen. Det den har
avgjort, er avgjort. Et nytt mønster eller et nytt valg føres der, i samme PR.

Prototypene i `docs/design/prototyper/` følger [brukerforlop](../brukerforlop/SKILL.md),
ikke denne skillen, `design-deslop` eller `design-review`.

## Hensikten

Brukeren er prosjektleder eller byggeleder hos TE eller BH, eller en som godkjenner
et brev. Hen har et varsel eller et krav foran seg og skal finne ut hva som
foreligger, og svare innen en frist. Det som leder, er partenes siste krav og svar i
hvert spor, med dato og brev. Visningen skal oppleves som et saksdokument på et
skrivebord: rolig og presis, og tett nok til at tre spor kan sees samtidig. Den er
ikke et dashbord.

Visningen avgjør ikke noe kontrakten overlater til partene. Hvilke betegnelser,
farger og ord som er tillatt for krav, svar og frister, står i vedtakene som
systemfila viser til. En regel om hva som vises, hentes fra kjernen (`AGENTS.md`,
«Domenekjernen»), aldri fra en status i komponenten.

## Før hver komponent

Skriv dette i arbeidsplanen før koden, også for en liten tilføyelse:

```
Hensikt:    hvem, hva hen skal gjøre her, hva som skal lede
Hierarki:   fokuselementet, og hvordan det vinner (vekt, blekknivå, plass, størrelse)
Flater:     hvilke tokens for flate, kant og blekk, og hvorfor
Typografi:  skrift (UI, kontraktstekst eller tall) og nivå
Avstand:    trinn på 4 px-rutenettet og tettheten i sonen
Tilstander: hvilke av tilstandene under komponenten har
Gjenbruk:   komponenten eller klassen som finnes, eller hvorfor den ikke passer
```

Kan du ikke si hvorfor for hvert punkt, har du valgt en standard. Stopp og tenk.

Mens du bygger, følg «Tidlig sjekk» i [`uu-sjekk`](../uu-sjekk/SKILL.md).

## Hierarki

- **Ett fokuspunkt per visning.** Navngi det før du bygger, og gjør det tydeligst.
  Det andre dempes med vilje.
- **Vekt og blekknivå før størrelse.** Samme størrelse kan bære tre nivåer:
  verdi med vekt 600 og `--ink`, etikett med 500 og `--ink-2`, metadata med 400 og
  `--ink-3`. `--ink-ghost` er bare til pynt og bærer aldri mening.
- **Tetthet er et valg.** Tett i sporoversikten og skjemaene, mer luft rundt
  brevteksten. Grupper det som hører sammen, og sett tydelig avstand mellom gruppene.
- **Farge betyr noe.** De grønne nyansene bygger strukturen. Statusfargene brukes bare
  der systemfila sier det. En farge for pynt er støy.

## Bruk det som finnes

Det vanligste en agent ødelegger, er å lage på nytt det som allerede finnes.

1. **Native HTML først.** `<button>`, `<a>`, `<input>`, `<dialog>`, `<details>`. Aldri
   `<div onclick>`.
2. **bits-ui** for det som har tilstand og er vanskelig å få riktig: select,
   combobox, dialog, popover, tooltip, meny og faner. Stil den med tokenene.
3. **Komponentene og klassene som finnes:** `src/lib/components/primitives/`,
   `src/lib/components/patterns/` og klassene i `theme.css`. Systemfila sier hvilke
   som gjelder.
4. **Egen kode bare som siste utvei.** Da skal du levere hele atferden: tastatur
   (piltaster, Enter, Escape), fokus som fanges og føres tilbake, ARIA, klikk utenfor
   og låst rulling for overlegg.

For stilene: bruk tokens, ikke rå verdier. `var(--rule)`, ikke `1px solid #e1e5de`.
Et token som ikke finnes, gir en ugyldig deklarasjon uten feilmelding. Kontroller at
tokenet er definert (#1184). Gjentas samme stil for andre gang, lag en komponent
eller en klasse.

## Tilstander

Hvert interaktive element har standard, hover, aktiv, fokus (`:focus-visible`) og
deaktivert. Data har lasting, tom, feil og konflikt. En handling som venter på
serveren, viser at den venter, og beholder skjemaet ved feil. Treffflaten er minst
40 × 40 px, helst 44.

## Animasjon

Animasjonen skal merkes, ikke sees.

- Ingen animasjon på det som gjentas ofte, som navigasjon med tastaturet og bytte av
  fane.
- Under 300 ms: trykk 100–160 ms, tooltip og popover 125–200 ms, nedtrekk
  150–250 ms, dialog og skuff 200–300 ms.
- Ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`) inn, aldri `ease-in`. Animer bare
  `transform` og `opacity`, og aldri `transition: all`.
- Bruk keyframes-animasjonene i `theme.css` før du lager nye.
- `prefers-reduced-motion` respekteres. `theme.css` slår av varigheten under
  `.mockup`.

## Kontrollene før du viser fram

- **Skvisetesten.** Myser du, ser du fortsatt hva som er over hva, uten at noe
  roper?
- **Tokentesten.** Hver farge, kant og flate er et token fra `theme.css`. Avstand er
  på rutenettet.
- **Vedtakstesten.** Hver betegnelse, farge og frist i visningen tåler vedtakene
  systemfila viser til.
- **Nettleseren.** Se visningen i lys og mørk modus og på smal skjerm med skillen
  `mockup-nettleser`, og den ekte saksruta når diffen rører saksvisningen (`AGENTS.md`,
  «Arbeidsform»).
- `npm run lint`, `npx svelte-check` og `npm run build` etter miljø-skillen.

## Etter oppgaven

Har du laget et mønster som brukes to ganger, eller tatt et nytt valg for visningen,
før det i systemfila: mønsteret i tabellen med komponenten eller klassen det bor i,
og valget med grunnen i avsnittet det gjelder. Verdiene skrives ikke av; de står i `theme.css`. Et valg bare oppdragsgiver
kan ta, føres der svarene hører hjemme (`AGENTS.md`, «Arbeidsform»).

Diffen ryddes så med skillen `design-deslop`, og reviewes med `design-review`, i den
rekkefølgen `AGENTS.md` sier.
