---
name: brukerforlop
description: Designsløyfa i endringsmeldinger, der brukerhistorien, prototypen og vedtakene avklares og skrives ned før grundig bygging. Bestillingen for et brukerforløp (mål, designmål, domeneforventninger, gjennomføring og spørsmål), den klikkbare prototypen, avvikene mot dagens løsning, kontrollene som gjelder, kriteriene for «klar til bygging» og overgangen til leveranseskillen. Også sammenligningen av en bygget visning med prototypen eller konseptet. Brukes når en brukeroppgave skal designes eller endres før den bygges, og for issues med etiketten `bestilling`.
---

# Brukerforløp og bestilling før bygging

Målet er å vite hva vi vil ha, og ha det skrevet ned, før noe bygges grundig.
Resultatet er én bestilling: ønsket brukerforløp, en godkjent prototype, vedtakene
den bygger på, forventninger byggingen kan prøves mot, og avgrensede restpunkter.
Kjernen er en kilde til hvordan løsningen virker i dag, ikke grensen for hva som kan
designes. En upraktisk arbeidsflyt bevares ikke fordi kjernen allerede har den.

Første prøve var BF-03 (#1336, oppdragsgiver 27.10). Skillen rettes etter brukerprøven.

## Hjemmene

| Hva | Hvor |
| --- | --- |
| Brukerforløpet: ID, status, kilder, steg og kontroller når det er kjørbart | `docs/domenetabell/brukerforlop/BF-xx.json`, med formatet i [README](../../../docs/domenetabell/brukerforlop/README.md) |
| Bestillingen: målene, designmålene, forventningene, gjennomføringen og spørsmålene | `docs/domenetabell/brukerforlop/BF-xx.md`, som forløpsfila viser til med `bestilling` |
| Prototypen | `docs/design/prototyper/`, én fil per forløp |
| Vedtakene | Vedtaksregisteret, gjennom [vedtaksskillen](../vedtak/SKILL.md) |
| Arbeidet som pågår | Et issue med etiketten `bestilling` |

Et ord står ett sted. Bestillingen viser til vedtaks-ID-en og skriver ikke vedtaket om.
Prototypen viser til punktene i bestillingen og gjentar dem ikke.

## Sløyfa

1. **Velg én brukeroppgave.** Begynn med hva brukeren vil oppnå (M), ikke med
   handlingene kjernen har i dag. Skriv utgangspunktet og avgrensningen: hva oppgaven
   ikke dekker, og produktspørsmål som hører til andre forløp (P).
2. **Skisser.** Lag eller endre prototypen. Den kan vise handlinger og tilstander som
   ikke finnes. Er spørsmålet bare plassering eller ordlyd i en visning som er bygget,
   kan det prøves der i stedet.
3. **Kontroller forskjellene** mellom ønsket og dagens løsning. Lag en kort liste, ikke
   en kartlegging av hvert element. Se særlig på brev, beløp, statuser, virkninger og
   handlinger. Marger, kortplassering og typografi trenger ingen kobling til kjernen.
4. **Avklar** det som trengs for akkurat denne oppgaven: D- og S-punktene etter
   vedtaksskillen, U-punktene som designmål. Resten merkes som foreslått eller ikke
   støttet.
5. **Prøv** prototypen på brukere mot U-punktene. Funnene går tilbake til steg 1–4, ikke
   til hele konseptet.

| Avviket mellom ønsket og dagens løsning | Neste steg |
| --- | --- |
| Opplysningen finnes, men vises dårlig | Endre visningen |
| Opplysningen finnes i kjernen, men når ikke visningen | Utvid grensesnittet mot kjernen |
| Et gjeldende vedtak krever noe som ikke er bygget | Bygg vedtaket |
| Ønsket arbeidsmåte strider mot et vedtak | Legg fram et konkret vedtaksvalg |
| Arbeidsmåten er ikke avklart | Prøv alternativer, og fatt vedtak der det trengs |

Ikke alle funn skal bli vedtak, og ikke alle skal presses inn som endringer i visningen.
En ny handling, eller noe som endrer hva en part godtar eller er bundet av, er domene.
Hvordan handlingene samles og vises, er design.

## Bestillingen

Hvert punkt har en ID, så prototypen, issuet og byggingen kan vise til det.

- **M, målene:** hva brukeren vil oppnå, med brukerens ord.
- **Avgrensningen:** hva forløpet ikke dekker, og hvorfor. Den står også i grensesnittet
  når brukeren ellers kan tro at en vei løser mer enn den gjør.
- **U, det brukeren skal finne og forstå:** designmål. De prøves på brukere og trenger
  ikke vedtak.
- **D, domeneforventningene:** hva som sendes og aksepteres, og hvilke bindinger som
  påvirkes, med vedtaksbelegg som lenker til vedtaksfila. Til sammen sier de hvilket brev
  eller utsagn hver handling lager, hvilke virkninger som oppstår og består, og hva som
  skjer ved et ugyldig valg og ved avbrudd. Byggeøkta skal ikke måtte finne på forventet
  atferd. En virkning gjengis med alle vilkårene i vedtaket.
- **G, gjennomføringen:** hva som finnes, hva som mangler, og hva som må prøves teknisk.
- **S, spørsmålene:** stilles og lagres ordrett etter vedtaksskillen. Et svar som følger
  av et vedtak, føres som arbeidsvalg i bestillingen. Et svar som endrer et vedtak, føres
  i vedtaksregisteret.
- **P, produktspørsmål utenfor forløpet:** står der til de tas opp i et eget issue.
- **Endringer:** dato, grunnlag og hva som er endret, per versjon.

## Prototypen

- Én klikkbar fil per forløp, med tilstandene som ankre (`#mottatt`, `#protest`).
  Bestillingen viser til tilstandene. Brukeren skal kunne åpne brevet, velge en vei, gå
  tilbake og kontrollere det som sendes. Stillbilder prøver ikke en arbeidsmåte.
- «Vis sporbarhet» viser punktene i bestillingen på elementene (`data-spor`).
- Versjonen står i prototypen og i bestillingen. En godkjent versjon er en commit.
- Teksten er prototypetekst. En vedtatt brevtekst står ordrett.
- Stilen er Varden-skissenes (`docs/design/konsept-varden/skjermer/stil.css`). Ingenting
  sendes, og ingen data lagres.

## Kontrollene

En iterasjon som bare rører `docs/`, krever ingen `/code-review`, `design-review`,
`design-deslop`, feilinnføring eller kjøring av saksruta. Den kjører:

- `python3 docs/verktoy/lenkekontroll.py` på de endrede Markdown-filene;
- `node kjerne/tester/brukerforloep.ts --skriv` og
  `npx vitest run kjerne/tester/brukerforloep.test.ts` når en forløpsfil er endret;
- en gjennomklikking av prototypen i Chromium når den er endret. Kjør aldri
  `playwright install`; se skillen `mockup-nettleser`.

En endring i formatet, i `kjerne/tester/`, følger de vanlige reglene i `AGENTS.md`,
«Arbeidsform».

## Klar til bygging

Forløpet er klart når arbeidsmåten og de vesentlige virkningene er avklart, prototypen
er godkjent og prøvd, og ingen åpne spørsmål hindrer leveransen. Et spørsmål som står
igjen, er avgrenset og har et tidspunkt for avklaring. Én brukerprøve er en første
kontroll, ikke bevis: funnene vurderes, og det kontrolleres at ingen vesentlige spørsmål
blokkerer leveransen. Et vedtak et svar krever, er ført før byggingen bestilles.

## Overgangen til bygging

- Byggeissuet viser til bestillingen og den godkjente commiten av prototypen.
- Bestillingen er akseptkriteriene i [leveranseskillen](../leveranse/SKILL.md).
  D-punktene blir kontroller i forløpsfila, og U-punktene blir `forstaaelse` med kilde.
- Byggingen viser hvert avvik fra bestillingen som uferdig arbeid eller som et nytt
  valg. Et nytt valg går tilbake til sløyfa.
- PR-en sammenligner med prototypen etter «Sammenligne en bygget visning» under.

## Sammenligne en bygget visning

Når en bygget visning skal vurderes mot prototypen eller et HTML-konsept:

1. Angi referansen med en bestemt commit, så målbildet ikke flytter seg.
2. Vis de to side om side, med samme skjermbredde og så langt det går samme rolle, data
   og situasjon. Merk det der situasjonen er ulik.
3. Før de vesentlige avvikene i en kort tabell:

| Avvik | Klassifisering | Videre |
| --- | --- | --- |
| Plasseringen eller funksjonen i referansen mangler | Ikke gjennomført ennå | Bygges eller avgrenses uttrykkelig |
| Visningen bruker en annen løsning | Bevisst endring | Begrunnelsen og hvem som valgte den |
| Kjernen støtter ikke handlingen i referansen | Domenegap | Eget spørsmål. Referansen forkastes ikke automatisk |
| Forskjellen skyldes eksempeldata | Ikke et designavvik | Sammenlign med tilsvarende data |
| Årsaken er ukjent | Uavklart | Undersøkes før vurdering |

En bevisst endring er ikke det samme som en godkjent endring. Et forståelig kompromiss i
byggeøkta skal fortsatt vurderes.
