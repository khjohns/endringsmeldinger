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

Ikke kommet.
