# Brevteksten side om side

Steg 3 i [#2337](https://github.com/khjohns/endringsmeldinger/issues/2337): forslagene fra
sparringen som hele brev, med dagens brev ved siden av. Svarene står ordrett i
[`sparring-fable.md`](sparring-fable.md), [`sparring-codex.md`](sparring-codex.md) og
[`sparring-gemini.md`](sparring-gemini.md), og i #2337. Dagens brev er laget av kjernen med
[`lag-brevene.ts`](lag-brevene.ts). Fila lages av
[`lag-sammenstillingen.py`](lag-sammenstillingen.py) fra [`sammenstilling-tekst.md`](sammenstilling-tekst.md).
Forslagene er kontrollert én gang av en subagent mot [vedtakene](vedtakene.md) og
[språkfila](../../sprak.md). Funnene står under hvert brev og samlet nederst.

**Les først:** brevene er av to slag. **Forholdet er avslått i samme brev** (brev 01) eller
**byggherren gjør gjeldende at varselet etter punkt 32.2 kom for sent** (brev 06): da er det
byggherrens standpunkt og står først, og lagene under bygger på det. **Forholdet er ubesvart**
(brev 02 og 05): da står forbeholdet om forholdet sist i brevet. Det er svaret «A» fra
oppdragsgiver 25.11 ([7156411576](https://github.com/khjohns/endringsmeldinger/issues/2337#issuecomment-7156411576)).

**Én feil i materialet.** Sparringen fikk brev der teksten under «Forbehold» het «Byggherrens
begrunnelse for svaret på …». Teksten er byggherrens forbehold for hele svaret: vilkår og
forbehold som gjelder hele svaret, står under «Forbehold» (KA-U50, KA-U49 punkt 1). Begrunnelsen
står under hvert punkt (LV-U71). Kolonnen «I dag» viser den rettede plassholderen. Fable og
Gemini flytter «begrunnelsen» ut av «Forbehold». Det bygger på den gale plassholderen og er ikke
tatt med i anbefalingen.

## Kort fortalt

**De tre er enige om dette:**

- Lagslinjen nevner innsigelsen med navn, ikke med punktnummer: «Subsidiært, hvis innsigelsen
  mot varselet etter punkt 32.2 ikke fører frem». Codex tillater punktnummeret der navnet ikke er
  entydig.
- Lagslinjen nevner bare innsigelsene som rammer standpunktet (OV-U117).
- Et brev med svar på flere krav har en tittel som nevner alle kravene.
- «Forbehold» står én gang, sist i brevet, og bare når det har innhold.
- «Etter begrensningen i punkt 1 ovenfor» faller bort. Beløpet etter begrensningen står i samme
  punkt som innsigelsen.

**De er uenige om dette:**

| Spørsmålet | Fable | Codex (Astra) | Gemini (Argon) |
| --- | --- | --- | --- |
| Vilkåret når kravpostene i samme lag har ulike vilkår | Ett punkt per kravpost, med alt om posten. Innsigelsen for posten står rett over det som er subsidiært til den | Alternativ B: lagslinjen har det felles vilkåret, og vilkåret for kravposten står først i setningen | Som Fable |
| Punktet «Beregningsmetode» | Faller bort | Står | Faller bort |
| Hvilke innsigelser lagslinjen nevner | Den nærmeste, med «heller ikke» | Alle, også som en liste under linjen | Den nærmeste, med «heller ikke» |
| Navnene på innsigelsene | Faste navn i en tabell | Fritt, med punktnummer der det trengs | Fritt |
| Brev med svar på flere krav | Én del per krav med overskrift og innledning | Innledning foran hvert svar, og overskrifter uten nummer i brev 06 | Alle innledningene samlet øverst |
| Byggherrens forbehold for hele svaret | Eget punkt «Begrunnelse» (bygger på feilen over) | Under «Forbehold», foran forbeholdet om forholdet | Under det siste punktet, eller tatt ut |
| «Prinsipalt» på avslaget av forholdet i brev 01 | Som i dag, uten | Legger til | Legger til |

**Anbefalingen**, utdypet i [spørsmålene](https://github.com/khjohns/endringsmeldinger/issues/2337):
Fables struktur med ett punkt per kravpost og faste navn på innsigelsene, én del per krav, og
punktet «Forbehold» én gang sist med forbeholdet om forholdet først og byggherrens forbehold for
hele svaret etter, som i oppdragsgivers forslag v4. Lagene endres ikke.

## Brev 01: forholdet avslått i samme brev, to kravposter med ulike vilkår

**Tilfellet:** forholdet er avslått i samme brev og står først. Det er ikke et forbehold.
P1 og P2 har ulike vilkår i samme lag (#2337).

<!-- brev 01 -->

**Kontrollen fant:**

- **Fable:** OV-U117 holder. Hvert lag har riktig vilkår. Brevet har et punkt «Begrunnelse» med
  overskrift; LV-U34 sier at begrunnelsen står uten den overskriften.
- **Codex:** lagslinjen for «Videre subsidiært» har samme vilkår som «Subsidiært», uten «heller
  ikke», så forskjellen mellom lagene står bare i setningene. Vilkåret for P2 («Hvis enhetspriser
  likevel skal legges til grunn») navngir ikke innsigelsen. Etter VS-U4 *gjør* byggherren
  *gjeldende* hva totalentreprenøren har krav på; Codex skriver «mener derfor». «Hvis byggherren
  ikke får medhold» gjør vilkåret til et spørsmål om en avgjørelse, der LV-U34 har «fører frem».
- **Gemini:** flytter «gjør ikke gjeldende at varselet for P2 kom for sent» inn i laget «Videre
  subsidiært». Det endrer laget standpunktet står i, og er ikke en ren ordlyd. Lagslinjen for P1
  mangler «for P1».
- **Alle:** byggherrens forbehold for hele svaret er borte (Gemini) eller flyttet (Fable).

## Brev 06: svar på tre krav i samme brev, med mange henvisninger

**Tilfellet:** byggherren gjør gjeldende at varselet etter punkt 32.2 kom for sent. Det er
byggherrens standpunkt og står først. Forholdet er besvart, så brevet har ikke noe forbehold om
forholdet.

<!-- brev 06 -->

**Kontrollen fant:**

- **Fable:** ingen henvisninger til punktnumre igjen. Byggherrens forbehold for hele vederlags-
  og fristsvaret er erstattet av nye plassholdere per punkt.
- **Codex:** standpunktet til hindringen er skrevet om til «bestrider at forholdet har hindret
  fremdriften». Dagens brev har to alternativer: fremdriften er ikke hindret, eller hindringen
  skyldes ikke forholdet. «Bestrider» brukes etter språkfila om beregningsregelen og justeringen.
  Hjemmelen er tatt ut av setningen om varselet etter punkt 32.2, der den er selve påberopelsen
  (LV-U34). Byggherrens forbehold står under «Forbehold», som i dag.
- **Gemini:** innledningene står samlet øverst, så «Beløpene i brevet er eks. mva.» står over
  forholdet. Byggherrens forbehold for hele fristsvaret står under punktet om dagene og ser ut til
  å gjelde bare dem.

## Brev 02: forholdet ubesvart, tre poster

**Tilfellet:** forholdet er ubesvart, så forbeholdet om forholdet står sist i brevet.

<!-- brev 02 -->

**Kontrollen fant:**

- **Fable:** forbeholdet etter GR-U34 står ordrett og sist. Byggherrens forbehold for hele svaret
  er erstattet av «Byggherrens egne forbehold», som Fable selv sier ikke finnes som felt i dag.
- **Codex:** byggherrens forbehold for hele svaret står foran forbeholdet om forholdet, så
  forbeholdet om forholdet står sist.
- **Gemini:** forbeholdet etter GR-U34 står ordrett og sist. Byggherrens forbehold for hele
  svaret er tatt ut. Gemini påpeker at oversikten ikke viser P2, som er regningsarbeid uten
  beløp (OV-U73).

## Brev 05: fristsvaret med fire lag, forholdet ubesvart

**Tilfellet:** forholdet er ubesvart, så forbeholdet om forholdet står sist. Bare Gemini skrev
brevet om. Fable beholder strukturen og bytter bare lagslinjen.

<!-- brev 05 -->

**Kontrollen fant:** Gemini bevarer KA-U84 og VS-U4. Byggherrens forbehold for hele fristsvaret
står under punktet om dagene.

## Lagene endres ikke

To av forslagene endrer hvilket lag et standpunkt står i. Det er ikke ordlyd, og det er ikke tatt
med i anbefalingen:

- Gemini flytter «gjør ikke gjeldende at varselet kom for sent» for P2 i brev 01 fra å stå uten
  etikett til det tredje laget. Kjernen gir et slikt standpunkt ingen virkning og intet lag.
  Unntaket er spesifiseringen etter punkt 33.6.1, som følger innsigelsene (KA-U84, brev 06).
- Codex og Gemini legger «Prinsipalt» på avslaget av forholdet i brev 01. Det er spørsmål 5.

## Vedtakene forslagene rører

| Post | Hva | Fable | Codex | Gemini |
| --- | --- | --- | --- | --- |
| LV-U34 | Ett punkt per tema, eksemplene på lagslinjen, innledningen per svar | Endres | Endres | Endres |
| LV-U40 | Lagslinjen viser til punktet med «ovenfor» | Endres | Presiseres | Endres |
| OV-U32 | «Standpunktene i samme lag står under én etikett» | Leses som én etikett per punkt | Ingen endring | Presiseres |
| OV-U33 og OV-U32 | «Prinsipalt» på avslaget av forholdet | Ingen endring | Ikke nevnt | Presiseres |
| GR-U34, KA-U49 og KA-U50 | Hvor «Forbehold» står, og hva som står der | Endres | Presiseres | Endres |
| LV-U70 og LV-U71 | Avsnittene og partens tekst per punkt | Endres | Presiseres | Endres |
| OV-U28 | Setningen om innsigelsen mot det særskilte varselet | Ingen endring | Endres | Ingen endring |

Ingen av forslagene endrer budskapet i OV-U117, VS-U4, KA-U84, OV-U73 eller MM-U9. Et sendt brev
endres ikke.
