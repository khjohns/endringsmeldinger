---
name: subagenter
description: Når en subagent brukes i endringsmeldinger, og hvordan: de tre tilfellene der den sparer mer enn den koster, hva økta gjør selv, hva hovedtråden leser, modellen, størrelsen og bestillingen. Brukes før en subagent startes med Agent-verktøyet, i alle økter, også en direkte økt som ikke er orkestrert.
---

# Subagenter

Reglene gjelder alle øktene, også en direkte økt. En subagent har egen kontekst. Den
betaler grunnkonteksten på nytt, med systemprompten, verktøyene og `AGENTS.md`, og leverer
et sammendrag tilbake. Et sammendrag kan miste det ordrette. Hver overlevering koster
altså noe, og en subagent brukes bare når den sparer mer enn den koster (oppdragsgiver
06.11, etter vurderingen av når subagenter bør foldes inn i hovedløkka).

- **Når.** En subagent brukes i tre tilfeller:
  1. **Store rådata, kort svar.** Arbeidet leser mye som økta ikke trenger etterpå: en
     CI-logg (`ci-logg`), fullt testutdata, et søk over mange filer eller hele registeret,
     transkripsjonene i forbruksskillen.
  2. **Uavhengig kontroll.** Kontrollen skal ikke farges av det økta tror: diffen mot
     bestillingen (`diffkontroll`), sikkerhetsinvariantene før merge («3. Gjennomgang» i
     [orkestreringsskillen](../orkestrering/SKILL.md#3-gjennomgang-når-øktene-er-ferdige)),
     og kontrollene i [vedtaksskillen](../vedtak/SKILL.md). Episodene der kontrollen
     endret utfallet, står i episodefilene for [orkestreringen](../orkestrering/episoder.md)
     og [vedtakene](../vedtak/episoder.md).
  3. **Parallelt arbeid.** Flere uavhengige spørsmål som kan gå samtidig.
- **Ellers gjør økta det selv.** Et oppslag som krever under om lag fem verktøykall og gir
  et lite svar, gjør økta selv. Det gjelder én post eller kjede i vedtaksregisteret
  (`vedtaksregister.py --vis` og `--kjede`), et `grep -c` og én funksjon. Innsamling et
  skript kan gjøre, som tekstene til postene, `folge`-kjedene, radene i
  `KJENTE_FORHOLD_TIL_OPPHEVET`, henvisningene i koden og telling, gjøres med skriptet, ikke av en modell. Orkestratoren leser likevel ikke kode
  eller differ selv ([orkestreringsskillen, punkt 1](../orkestrering/SKILL.md#1-kartlegg-før-du-fordeler)).
- **Hva hovedtråden leser.** Økta leser ikke store filer selv: hele `vedtak.md` eller
  `vedtak.toml`, store vurderingsfiler og store logger. Den slår opp postene den skal
  sitere, ordrett med skriptet. Det en subagent har lest, leser ikke økta på nytt. Skal en
  rapport kontrolleres, gjør en ny subagent det (oppdragsgiver 17.10 og 05.11, #1065).
- **Modell.** Mekaniske kontroller går på `model: "haiku"` med `effort: "medium"`, eller
  `"high"` når kontrollen har flere steg (oppdragsgiver 10.10). Det gjelder polling av CI,
  sammenligning med skript av kolonner, ankre og tokens, lenkekontroll
  og kontroll av at en diff bare inneholder de bestilte endringene. Kontroll av juss, vedtak og kode og det som krever skjønn går på
  standardmodellen: prøving av alternativene mot vedtakene, forslaget og spørsmålene.
  En agent i `.claude/agents/`, som `ci-logg` og `diffkontroll`, har modellen og
  innsatsen i sin egen definisjon.
- **Størrelse.** En subagent får en bestilling den kan gjøre ferdig på om lag 80 kall og
  under 150 000 tokens, uavhengig av grensen for økta: én fil, én gruppe bevis-saker eller ett spørsmål. Større arbeid
  deles på flere subagenter (oppdragsgiver 17.10). Uavhengige subagenter startes i samme
  melding, og de andre tett etter hverandre, så hurtigbufferen holder seg varm. Ingen
  subagent venter på noe utenfor seg selv (oppdragsgiver 05.11, #1065).
- **Bestillingen** sier nøyaktig hva som skal gjøres eller kontrolleres, hva sluttrapporten
  skal inneholde, og at den ikke gjengir filer, differ eller testutdata. Trenger økta en tekst ordrett, ber bestillingen om ID og sted,
  og økta slår opp teksten selv. Bestillingen har også med setningen «Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.», ordrett og på engelsk, for bedre balanse mellom grundighet og tid (kilde: Claude Code 2.1.299, oppdragsgiver 18.10, #779).
