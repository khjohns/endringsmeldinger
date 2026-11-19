# Spørsmålene fra reviewet av stabelen #2237–#2241

Spørsmålene til oppdragsgiver fra reviewet 19.11 av PR-ene i designarbeidet i #2163, lagret ordrett
([vedtaksskillen](../../../.claude/skills/vedtak/SKILL.md)). De ble stilt i chatten 19.11. Svarene føres i
denne fila. Spørsmål 1 berører en rettsregel og føres som vedtak når svaret kommer. Spørsmål 2–4 er valg
om visningen. Spørsmål 4 er lagt til i økta som fortsatte reviewet, og er ikke stilt i chatten 19.11.

## Spørsmålene

**1. Juridisk, #2237. Innsigelsen etter punkt 33.6.2 og innsigelsen etter punkt 33.4.** #2237 lar
innsigelsen om at kravet er fremsatt for sent etter punkt 33.6.2, være subsidiær til innsigelsen om at
varselet etter punkt 33.4 kom for sent. Før sto begge prinsipalt
([OV-U32](../../plans/vedtak.md#ov-u32), vedtaket 05.10). Er bare 33.6.2 påberopt, står de øvrige
standpunktene uten vilkår.

- **A (anbefalt).** Begge innsigelsene står prinsipalt, og de øvrige standpunktene er subsidiære når én av
  dem er påberopt.
- **B.** Som bygget: 33.6.2 er subsidiær til 33.4, og de øvrige standpunktene står uten vilkår når bare
  33.6.2 er påberopt.
- **C.** 33.6.2 er subsidiær, og de øvrige standpunktene er subsidiære også når bare 33.6.2 er påberopt.

Svaret styrer `virkningerIForholdetOgFristen` i `kjerne/frosset/byggeklosser.ts`, 0-raden i `regnUtFristen`
(`kjerne/spor/frist/frysing.ts`), feilinnføringen F755, docstringen i `kjerne/frosset/standpunkt.ts` og
regelversjonen. Det avgjør også funnet om tilfellet der varselet etter 33.4 kom i tide og kravet etter
33.6.2 for sent.

**2. Design, #2240. Radene per frist i «Kravet og svaret».** Radene per frist heter alle «Byggherren
godkjenner», uten vilkår. Avslaget i et senere lag står også uten vilkår.

- **A.** Vilkåret står over hvert lag, som i vederlaget.
- **B (anbefalt).** Vilkåret i kortform er navnet på raden.
- **C.** Behold.

**3. Design, #2240. Kolonnene i tabellen per post for vederlaget.** Tabellen har kolonnene «Prinsipalt»,
«Subsidiært» og «Videre subsidiært», mot svar 4B.

- **A (anbefalt).** Behold, fordi tabellen gjengir brevet ([OV-U73](../../plans/vedtak.md#ov-u73)), og før
  unntaket i BF-44 U-2.
- **B.** Navn i klarspråk.

**4. Design, #2239. Størrelsen på datolinja i brevtråden.** #2180 bestiller datolinja i 13 px
(«1. okt. 2026 · brev 4», 13 px `--ink-3`), og det er bygget. Systemfila har fem størrelser, 12, 14, 16, 20
og 24 px, og 12 px er etiketter og metadata.

- **A (anbefalt).** 12 px, fordi datolinja er metadata og skalaen i systemfila holder.
- **B.** Behold 13 px, og før en sjette størrelse i systemfila.

## Svarene

Oppdragsgiver 19.11, ordrett:

- 1: «Angående juridisk #2237. Les reglene i kontrakt khjohns/kontrakt. Slik jeg ser det kan BH mene kravet
  er fremsatt for sent, men av hensyn til forutsigbarhet - evt av taktiske grunner - fortsatt ønske at TE
  spesifiserer krav etter 33.6.2. Denne forespørselen vil da måtte vise til at BH prinsipalt mener kravet er
  fremsatt for sent, tenker jeg.»
- 2: «B - hvordan blir det seende ut?»
- 3: «A - men vil gjerne ha eksempler på B før Vi beslutter»
- 4: ikke besvart.

Svar 1 passer ikke på et av alternativene og gir oppfølgingsspørsmålene 1a, 1b og 5. Svar 2 og 3 er ikke
endelige: skissen med B for spørsmål 2 og eksemplene på B for spørsmål 3 er vist i chatten 19.11.

## Oppfølgingsspørsmålene

Belegget er NS 8407 punkt 33.4, 33.6.1 og 33.6.2. Etter punkt 33.6.2 fjerde ledd kan byggherren ikke påberope at
fristen i 33.6.1 er oversittet når totalentreprenøren svarer på forespørselen med dager. Bestemmelsen sier ikke
noe om varselet etter 33.4.

**1a. Rekkefølgen.** Svar 1 leses slik: forespørselen sendes under forbehold om innsigelsen etter 33.4.
Innsigelsen om at totalentreprenøren ikke svarte på forespørselen, står derfor subsidiært til innsigelsen etter
33.4. Det er rekkefølgen #2237 har bygget, og alternativ A i spørsmål 1 faller bort.

- **Ja (anbefalt).** 33.4 prinsipalt, 33.6.2 subsidiært.
- **Nei.** Oppdragsgiver retter lesningen.

**1b. Når bare innsigelsen etter 33.6.2 er påberopt.** Varselet etter 33.4 er ikke påberopt, men byggherren gjør
gjeldende at totalentreprenøren ikke svarte på forespørselen i tide. Byggherren er enig i at fremdriften er
hindret.

- **C (anbefalt).** De øvrige standpunktene, også at fremdriften er hindret, gjelder bare hvis innsigelsen etter
  33.6.2 ikke fører frem, som etter KA-U84 for 33.4. Begge innsigelsene gjør at kravet tapes helt.
- **B.** Som bygget: de øvrige standpunktene gjelder uten vilkår.

**5. Forbeholdet i forespørselen etter 33.6.2.** Forespørselen fra løsningen (LV-U18) har ikke noe forbehold.
Etter fjerde ledd mister byggherren innsigelsen om at kravet ble spesifisert for sent (33.6.1) når
totalentreprenøren svarer med dager. Forbeholdet kan derfor bare gjelde varselet etter 33.4.

- **A (anbefalt).** Har byggherren påberopt at varselet etter 33.4 kom for sent, sier forespørselen at byggherren
  fastholder det prinsipalt, og at forespørselen sendes for det tilfellet at innsigelsen ikke fører frem. For
  eksempel: «Byggherren fastholder at varselet etter NS 8407 punkt 33.4 i brev 2 kom for sent. Forespørselen
  sendes for det tilfellet at innsigelsen ikke fører frem.»
- **B.** Byggherren velger i skjemaet om forbeholdet tas med.
- **C.** Ingen endring.

Svaret styrer LV-U18 og brevteksten for forespørselen. Det bygges ikke i stabelen.
