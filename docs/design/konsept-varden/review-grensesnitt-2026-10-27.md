# Review av Varden etter grensesnitt-skillen, 27.10.2026

Kontrollert commit: `565beca` på `claude/konsept-varden` (PR #1329), versjon 3 av
konseptet. Kildegrunnlaget er [grensesnitt-skillen](https://github.com/khjohns/endringsmeldinger/blob/953aba3/.claude/skills/grensesnitt/SKILL.md):
hensikten, hierarkiet, «Bruk det som finnes», tilstandene, animasjonen og kontrollene
før visning. Grunnlaget er de åtte skjermene i [`skjermer/`](skjermer/) og teksten i
[README](README.md).

Varden er et tenkt konkurrerende produkt med eget visuelt språk. Tokenene i
`theme.css` og beslutningene i [designsystemet](https://github.com/khjohns/endringsmeldinger/blob/6d2d895/docs/design/system.md) gjelder derfor ikke
skissene. Tokentesten er prøvd mot konseptets egne tokens i `:root` i `stil.css`.
Skissene er statisk HTML uten brukere. Alvorligheten sier hvor mye et funn betyr for
konseptet, ikke at noe har skjedd.

**Alvorlighet:** *blokker* må rettes før konseptet prøves med brukere, *bør* rettes i
neste runde, og *merknad* tas med når skjermen likevel endres.
**Belegg** som i [hovedplanen, 1.3](../../plans/2026-09-16-godkjenning-og-varig-levering.md#13-begreper-som-holdes-adskilt):
**K** kjørt og observert (gjengitt i Chromium 27.10), **L** lest i HTML eller CSS.

## Funn

*Merknad 27.10.2026:* KV-01 og KV-08 er rettet i versjon 4, der fargene ble byttet til Punkt (fra versjon 7 er de tokenene i dagens app), og KV-02 til KV-07 i versjon 5. KV-09 til KV-14 står åpne. Se [endringsloggen](endringslogg.md). Tabellen under gjelder versjon 3.

| ID | Alvorlighet | Funn | Hvor | Belegg | Forslag |
| --- | --- | --- | --- | --- | --- |
| KV-01 | Blokker | «Ingen brev» og «—» står i #A3AAB6 på hvitt. Det gir 2,3:1, under 4,5:1 i WCAG 1.4.3, og teksten bærer mening | `.dash` i `stil.css`; A, F | L, K | Bruk `--muted` (6,0:1). Skilletegnet i brødsmulene kan beholde den lyse fargen, fordi det er pynt |
| KV-02 | Bør | Tre spor kan ikke sees samtidig. Hensikten i skillen er at visningen er «tett nok til at tre spor kan sees samtidig». Fanene viser ett spor om gangen, og fanetekstene viser bare siste brev | B, D | K | En første fane, «Oversikt», med tre kolonner: siste krav og siste svar i hvert spor, med dato, brev og hovedlinjene fra kjernen |
| KV-03 | Bør | Dokumenter og Hendelser står blant sporene. «Skriv brev i sporet» vises også der, uten at det er klart hvilket spor brevet gjelder. H kaller alle fanene «Sporene». I domenet er sporene grunnlag, vederlag og frist | Fanefeltet i B, D, F og G; H | K | Skillelinje mellom sporene og saksflatene i fanefeltet. På F og G heter knappen «Skriv brev» og spør om spor først. Rett overskriften i H |
| KV-04 | Bør | Kilden er satt på det svakeste nivået: 12–12,5 px i `--muted`, for eksempel «Oppgitt av TE i brev 1» og kildene på datolinja. Prinsipp 2 sier at kilden bærer mening | B, D, F, G; `.dateline i`, `.vdl .s`, `.tl .src` | L, K | Kilden er en etikett, ikke metadata: minst 13 px og vekt 500. Bare tidspunkter og tellinger står på metadatanivå |
| KV-05 | Bør | Datolinja i B og D sier «oppgitt av TE, brev 1», men ikke at datoen ble korrigert 5. okt, slik G gjør | B, D, G | K | Datoen og hele kilden står likt overalt: «oppgitt av TE i brev 1, korrigert 5. okt» |
| KV-06 | Bør | Tilstandene for data er ikke tegnet. E viser feil og konflikt, men ikke at sendingen pågår, et tomt spor (Frist har «Ingen brev»), at autolagringen feilet, eller manglende tilgang | E; B | K | Legg til i E: «Sender …» med skjemaet beholdt, tomt spor, «Utkastet er ikke lagret» med nytt forsøk, og «Du har ikke tilgang til saken» |
| KV-07 | Bør | Flere treffflater er under 40 × 40 px: hjemmelsbrikken (om lag 22 px høy), «Utdyp» og «Oppgi korrigert opplysning» (om lag 18 px), ikonknappene i toppfeltet (36 px) og filterknappene (34 px). README lover 44 px | `.chip`, `.rowlinks a`, `.iconbtn`, `.fbtn` | L | Minst 40 px høyde for alt som kan trykkes, helst 44. Brikken kan beholde det visuelle uttrykket med en større treffflate rundt |
| KV-08 | Bør | Tokentesten feiler mot konseptets egne tokens: 15 ulike fargeverdier står rått utenfor `:root`, to av dem med samme verdi som et token, og skjermene har 65 `style`-attributter, flere av dem gjentatt. Avstand som 6, 10, 14 og 18 px er utenfor rutenettet på 4 px | `stil.css`, alle skjermene | L | Alle farger som tokens. Gjentatte stiler som klasser, for eksempel underteksten i `.letter-row`. Avstand på trinn av 4. Det gir også mindre støy i diffen mellom rundene |
| KV-09 | Merknad | README beskriver et fargeskifte på 150 ms når en linje i panelet endres. Skillen sier at bare `transform` og `opacity` animeres | README, «Visuelt språk» | L | Et markeringslag som tones inn og ut med `opacity`. Endringen leses også opp, så markeringen er bare en støtte |
| KV-10 | Merknad | Faktarutene med tall på 22 px leses som et dashbord og konkurrerer med tabellen ved skvisetesten | A | K | Én linje med tallene over tabellen |
| KV-11 | Merknad | «Utkast» står tre ganger i B: på fanen, under «Skriv brev i sporet» og i hodet på skjemaet | B | K | Behold merket på fanen og i skjemahodet, og fjern teksten under knappen |
| KV-12 | Merknad | Eksempelet «Grunnlaget: partene er uenige» i E viser brev 2 av 12. okt, brev 3 av 15. okt og brev 6. Det stemmer ikke med sak E-021 etter omnummereringen i versjon 3 | E | K | Merk kortet som en annen sak, eller bruk brevene i E-021 |
| KV-13 | Merknad | Faner, valgkort, menyer og knapper er `div` og `span` i skissene. Det holder for skisser, men markupen må ikke kopieres | Alle skjermene | L | Ved bygging: native `input` og `button`, og bits-ui for faner, meny og leseflaten for brevet (dialog med fokusfangst) |
| KV-14 | Merknad | Mørk modus og smal skjerm er ikke tegnet. README beskriver hva panelet gjør under 1024 px, og nettlesersjekken i skillen krever begge | README; alle skjermene | L | Tegn B og D på 390 px og 1024 px. Mørk modus kan vente til fargene er tokens (KV-08) |

## Det som holder

- **Ett fokuspunkt per visning.** Skjemaet i B, brevet i C og D, tabellen i F og
  hendelsene i G. Det andre er dempet og står i høyre kolonne.
- **Farge bærer ingen vurdering.** Amber, blågrønn og rød brukes bare for utkast,
  sendt og feil, og alltid med ord.
- **Vekt og blekk før størrelse.** I hovedlinjene skilles krevd og standpunkt med vekt
  og blekk i samme størrelse.
- **Teksten har ett sted.** Bindingen, «tolkes ikke» og det som mangler står hver sin
  gang, ved beslutningen den gjelder.
- **Ingen handling er fremhevet.** Brevtypene står i fast rekkefølge bak én knapp.

## Verifikasjon og grenser

- **Kjørt og observert (K):** alle åtte skjermene er gjengitt i Chromium ved 1440 px
  27.10, og bildene i [`bilder/`](bilder/) er kontrollert.
- **Lest (L):** `stil.css` og HTML-filene. Kontrasten er regnet ut fra fargeverdiene
  med formelen i WCAG. Antall rå farger og `style`-attributter er talt med `grep`.
- **Ikke kontrollert:** axe og `uu.mjs`, tastatur, skjermleser, 200 % zoom, mørk modus
  og smal skjerm. `design-review` og `design-deslop` er ikke kjørt, fordi diffen ikke
  rører `src/`.
