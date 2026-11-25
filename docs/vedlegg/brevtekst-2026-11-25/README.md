# Brevteksten med lag og forbehold: innsamlingen

Underlaget for sparringsrunden om brevteksten i [#2337](https://github.com/khjohns/endringsmeldinger/issues/2337),
steg 1 i planen fra oppdragsgiver 25.11. Mappa har brevene slik kjernen skriver dem i dag,
oppdragsgivers forslag til struktur, vedtakene for lagene og forbeholdene og den felles
bestillingen til sparringen. Dette er kartlegging, ikke vurdering.

| Fil | Hva |
| --- | --- |
| [`bestilling.md`](bestilling.md) | Den felles bestillingen, som Fable, Codex (Astra) og Gemini (Argon) får ordrett |
| [`brevforslag-vederlagssvar-v4.html`](brevforslag-vederlagssvar-v4.html) | Oppdragsgivers forslag til brevstruktur for et vederlagssvar med tre lag, versjon 4 |
| [`vedtakene.md`](vedtakene.md) | Vedtakene for lagene og forbeholdene, ordrett fra vedtaksfila |
| `brev-NN-*.md` | Tolv brev slik kjernen skriver dem i dag, ett tilfelle per fil |
| [`lag-brevene.ts`](lag-brevene.ts) | Skriptet som lager brevene og kartleggingen under |

## Slik lages brevene

Fra roten av repoet:

```sh
node docs/vedlegg/brevtekst-2026-11-25/lag-brevene.ts
```

Skriptet bygger hver sak i minnet med `sak()` i
[`kjerne/tester/brevsak.ts`](../../../kjerne/tester/brevsak.ts) og sender kommandoene gjennom
`vurder`, som klienten gjør. Brevet er den frosne brevteksten (`brevtekst`) i journalraden.
Skriptet skriver `brev-NN-*.md` og tabellene mellom merkene under. Brevene ble laget
25.11.2026 på grenen `claude/brevtekst-sparring-2337`, med kjernen fra `main` etter #2344.
Lages de på nytt etter en endring i kjernen, kan teksten avvike.

Byggherrens og totalentreprenørens begrunnelser er plassholdere. Gjengivelsen setter
overskriften i hvert punkt som en overskrift i Markdown og begrunnelsen i kursiv der kjernen
setter den. Brevhodet har bare tittelen, merkingen og Deres ref.; hodet og underskriften fra
Oslo-brevmalen står i forslaget, ikke her.

## Tilfellene

| Brev | Tilfellet | Dekker |
| --- | --- | --- |
| [01](brev-01-vederlagssvar-2337.md) | Forholdet avslått og vederlagskravet besvart i samme brev. P1 med innsigelse etter punkt 34.3.3, P2 uten | Tilfellet i #2337, flere kravposter og flere lag |
| [02](brev-02-vederlagssvar-forbehold.md) | Vederlagssvar med fast sum, regningsarbeid og særskilt vederlagsjustering. Forholdet ubesvart | Forbeholdet om forholdet, flere kravposter, oversikten over beløpene |
| [03](brev-03-vederlagssvar-etter-avslag.md) | Vederlagssvar etter at forholdet er avslått i et tidligere brev, med varselet etter punkt 34.1.2 for sent | Forholdet avslått, tre lag |
| [04](brev-04-forholdet-avslaatt.md) | Svaret på påberopelsen: varselet etter punkt 32.2 for sent, og forholdet avslått | Forholdet avslått |
| [05](brev-05-fristsvar-lag.md) | Fristsvar med fire lag. Forholdet ubesvart | Fristen med lag, forbeholdet |
| [06](brev-06-samlet-svar.md) | Svaret på forholdet, vederlaget og fristen i samme brev | Mange henvisninger fram og tilbake |
| [07](brev-07-varselsvar-alene.md) | Svaret på et varsel etter punkt 34.3.3 som står alene. Forholdet ubesvart | Varselet alene (G-9, #2344), forbeholdet |
| [08](brev-08-varselsvar-etter-avslag.md) | Som 07, etter at forholdet er avslått | Varselet alene, forholdet avslått |
| [09](brev-09-vederlagssvar-uten-lag.md) | Vederlagssvar uten lag etter godkjent forhold | Kontrolltilfellet |
| [10](brev-10-paaberopelse.md) | Totalentreprenørens påberopelse | Krav fra totalentreprenøren |
| [11](brev-11-vederlagskrav.md) | Totalentreprenørens vederlagskrav med fire kravposter og særskilt vederlagsjustering | Krav fra totalentreprenøren |
| [12](brev-12-fristkrav.md) | Totalentreprenørens krav om fristforlengelse | Krav fra totalentreprenøren |

## Hva brevene viser i dag

Lest ut av brevene over. Ingen av punktene er vurdert.

- **Forbeholdet om forholdet** står i punktet «Forbehold», sist i svaret på sporet
  (brev 02, 05 og 07). I forslaget står det også sist, som punkt 6.
- **Punktet «Forbehold» står også når forholdet er besvart.** Det har da bare overskriften og
  byggherrens begrunnelse for hele svaret (brev 01, 03, 06 og 09). Byggherrens begrunnelse for
  hele svaret på vederlaget eller fristen står alltid der. Begrunnelsen for svaret på forholdet
  står under punktet «Forholdet» (brev 01, 04 og 06). I forslaget står begrunnelsen under
  punktet den gjelder.
- **Et brev med svar på flere krav har ett punkt «Forbehold» per svar** (brev 06: punkt 5 og
  10). Svaret på hvert krav har sin egen innledning, og punktene er nummerert gjennom hele
  brevet.
- **Tittelen i brev 01 og 06 er «Svar på forholdet»**, selv om brevet også svarer på
  vederlagskravet og fristkravet.
- **Lagslinjen viser til punktet med innsigelsen** («hvis innsigelsen i punkt 2 ovenfor ikke
  fører frem»). Står innsigelsen i samme punkt, sier den bare «ovenfor» (brev 01, punkt 3).
- **Avslaget i et tidligere brev står som eget punkt 1 «Forholdet»** med «Prinsipalt», og
  viser til brevet med avslaget (brev 03 og 08).
- **Andre henvisninger framover og bakover:** «med beløpet og forbeholdene som fremgår av
  svaret» (brev 02, 06 og 09), «etter begrensningen i punkt 1 ovenfor» (brev 02) og
  «Standpunktene ovenfor» i forbeholdet (brev 02, 05 og 07). Brevene sier aldri «nedenfor».
- **Totalentreprenørens krav har ingen henvisninger til egne punkter** (brev 10–12).

## Kartleggingen

<!-- kartleggingen: lages av lag-brevene.ts -->

| Brev | Avsender | Punkter | Punktet «Forbehold» | Henvisninger i brevet |
| --- | --- | --- | --- | --- |
| [01-vederlagssvar-2337](brev-01-vederlagssvar-2337.md) | byggherren | 4 | 4. Forbehold, sist i brevet: bare overskriften og begrunnelsen for svaret | 2 |
| [02-vederlagssvar-forbehold](brev-02-vederlagssvar-forbehold.md) | byggherren | 6 | 6. Forbehold, sist i brevet: forbeholdet om forholdet og begrunnelsen for svaret | 4 |
| [03-vederlagssvar-etter-avslag](brev-03-vederlagssvar-etter-avslag.md) | byggherren | 4 | 4. Forbehold, sist i brevet: bare overskriften og begrunnelsen for svaret | 2 |
| [04-forholdet-avslaatt](brev-04-forholdet-avslaatt.md) | byggherren | 2 | ingen | 1 |
| [05-fristsvar-lag](brev-05-fristsvar-lag.md) | byggherren | 5 | 5. Forbehold, sist i brevet: forbeholdet om forholdet og begrunnelsen for svaret | 4 |
| [06-samlet-svar](brev-06-samlet-svar.md) | byggherren | 10 | 5. Forbehold: bare overskriften og begrunnelsen for svaret; 10. Forbehold, sist i brevet: bare overskriften og begrunnelsen for svaret | 8 |
| [07-varselsvar-alene](brev-07-varselsvar-alene.md) | byggherren | 3 | 3. Forbehold, sist i brevet: forbeholdet om forholdet | 2 |
| [08-varselsvar-etter-avslag](brev-08-varselsvar-etter-avslag.md) | byggherren | 3 | ingen | 2 |
| [09-vederlagssvar-uten-lag](brev-09-vederlagssvar-uten-lag.md) | byggherren | 3 | 3. Forbehold, sist i brevet: bare overskriften og begrunnelsen for svaret | 1 |
| [10-paaberopelse](brev-10-paaberopelse.md) | totalentreprenøren | 0 | ingen | 0 |
| [11-vederlagskrav](brev-11-vederlagskrav.md) | totalentreprenøren | 4 | ingen | 0 |
| [12-fristkrav](brev-12-fristkrav.md) | totalentreprenøren | 3 | ingen | 0 |

### Henvisningene i hvert brev

Hver setning eller linje som viser til et annet sted i samme brev: «ovenfor», «nedenfor», «fremgår av svaret» eller et nummerert punkt i brevet. Henvisninger til NS 8407 og til andre brev er ikke tatt med.

**[brev-01-vederlagssvar-2337](brev-01-vederlagssvar-2337.md)**

- punkt 3: «Subsidiært, hvis innsigelsen i punkt 2 ovenfor ikke fører frem»
- punkt 3: «Videre subsidiært, hvis heller ikke innsigelsen ovenfor fører frem»

**[brev-02-vederlagssvar-forbehold](brev-02-vederlagssvar-forbehold.md)**

- punkt 2: «Byggherren godkjenner oppgjør som fast sum for P1 med beløpet og forbeholdene som fremgår av svaret.»
- punkt 4: «Byggherren godkjenner 10 000 kr etter begrensningen i punkt 1 ovenfor.»
- punkt 4: «Subsidiært, hvis innsigelsen i punkt 1 ovenfor ikke fører frem»
- punkt 6: «Standpunktene ovenfor gjelder under forutsetning av at forholdet gir grunnlag for kravet.»

**[brev-03-vederlagssvar-etter-avslag](brev-03-vederlagssvar-etter-avslag.md)**

- punkt 2: «Subsidiært, hvis innsigelsen i punkt 1 ovenfor ikke fører frem»
- punkt 3: «Videre subsidiært, hvis heller ikke innsigelsen i punkt 2 ovenfor fører frem»

**[brev-04-forholdet-avslaatt](brev-04-forholdet-avslaatt.md)**

- punkt 2: «Subsidiært, hvis innsigelsen i punkt 1 ovenfor ikke fører frem»

**[brev-05-fristsvar-lag](brev-05-fristsvar-lag.md)**

- punkt 2: «Subsidiært, hvis innsigelsen i punkt 1 ovenfor ikke fører frem»
- punkt 3: «Videre subsidiært, hvis heller ikke innsigelsen i punkt 2 ovenfor fører frem»
- punkt 4: «Videre subsidiært, hvis heller ikke innsigelsen i punkt 3 ovenfor fører frem»
- punkt 5: «Standpunktene ovenfor gjelder under forutsetning av at forholdet gir grunnlag for kravet.»

**[brev-06-samlet-svar](brev-06-samlet-svar.md)**

- punkt 2: «Subsidiært, hvis innsigelsen i punkt 1 ovenfor ikke fører frem»
- punkt 3: «Subsidiært, hvis innsigelsen i punkt 1 ovenfor ikke fører frem»
- punkt 3: «Byggherren godkjenner oppgjør som fast sum med beløpet og forbeholdene som fremgår av svaret.»
- punkt 4: «Subsidiært, hvis innsigelsen i punkt 1 ovenfor ikke fører frem»
- punkt 6: «Subsidiært, hvis innsigelsen i punkt 1 ovenfor ikke fører frem»
- punkt 7: «Videre subsidiært, hvis heller ikke innsigelsen i punkt 6 ovenfor fører frem»
- punkt 8: «Videre subsidiært, hvis heller ikke innsigelsen i punkt 7 ovenfor fører frem»
- punkt 9: «Videre subsidiært, hvis heller ikke innsigelsen i punkt 7 ovenfor fører frem»

**[brev-07-varselsvar-alene](brev-07-varselsvar-alene.md)**

- punkt 2: «Subsidiært, hvis innsigelsen i punkt 1 ovenfor ikke fører frem»
- punkt 3: «Standpunktene ovenfor gjelder under forutsetning av at forholdet gir grunnlag for kravet.»

**[brev-08-varselsvar-etter-avslag](brev-08-varselsvar-etter-avslag.md)**

- punkt 2: «Subsidiært, hvis innsigelsen i punkt 1 ovenfor ikke fører frem»
- punkt 3: «Videre subsidiært, hvis heller ikke innsigelsen i punkt 2 ovenfor fører frem»

**[brev-09-vederlagssvar-uten-lag](brev-09-vederlagssvar-uten-lag.md)**

- punkt 1: «Byggherren godkjenner oppgjør som fast sum med beløpet og forbeholdene som fremgår av svaret.»

**[brev-10-paaberopelse](brev-10-paaberopelse.md)**

- ingen

**[brev-11-vederlagskrav](brev-11-vederlagskrav.md)**

- ingen

**[brev-12-fristkrav](brev-12-fristkrav.md)**

- ingen

<!-- kartleggingen slutter -->
