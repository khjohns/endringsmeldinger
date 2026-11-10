---
name: subagenter
description: Hvordan en subagent bestilles i endringsmeldinger, med eksempler på når den brukes, hva hovedtråden leser, modellen, størrelsen og bestillingen. Når en subagent brukes, står i AGENTS.md. Brukes når en subagent skal startes med Agent-verktøyet, i alle økter, også en direkte økt som ikke er orkestrert.
---

# Subagenter

Når en subagent brukes, står i `AGENTS.md`, «Arbeidsform»: de tre tilfellene, og hva økta
gjør selv. Her står hvordan den bestilles, i alle økter.

- **Eksempler på de tre tilfellene.** Store rådata: en CI-logg (`ci-logg`), fullt
  testutdata, et søk over hele registeret, transkripsjonene i forbruksskillen. Uavhengig
  kontroll: diffen mot bestillingen (`diffkontroll`), sikkerhetsinvariantene før merge
  («3. Gjennomgang» i
  [orkestreringsskillen](../orkestrering/SKILL.md#3-gjennomgang-når-øktene-er-ferdige)) og
  kontrollene i [vedtaksskillen](../vedtak/SKILL.md). Episodene der kontrollen endret
  utfallet, står i episodefilene for [orkestreringen](../orkestrering/episoder.md) og
  [vedtakene](../vedtak/episoder.md).
- **Eksempler på det økta gjør selv.** Én post eller kjede i vedtaksregisteret
  (`vedtaksregister.py --vis` og `--kjede`), et `grep -c` og én funksjon. Tekstene til
  postene, `folge`-kjedene, radene i `KJENTE_FORHOLD_TIL_OPPHEVET`, henvisningene i koden
  og telling samles med skriptet, ikke av en modell. Orkestratoren leser likevel ikke kode
  eller differ selv ([orkestreringsskillen, punkt 1](../orkestrering/SKILL.md#1-kartlegg-før-du-fordeler)).
- **Hva hovedtråden leser.** Økta leser ikke store filer selv: hele `vedtak.md` eller
  `vedtak.toml`, store vurderingsfiler og store logger. Den slår opp postene den skal
  sitere, ordrett med skriptet. Det en subagent har lest, leser ikke økta på nytt. Skal en
  rapport kontrolleres, gjør en ny subagent det.
- **Modell.** Mekaniske kontroller går på `model: "haiku"` med `effort: "medium"`, eller
  `"high"` når kontrollen har flere steg. Det gjelder polling av CI,
  sammenligning med skript av kolonner, ankre og tokens, lenkekontroll
  og kontroll av at en diff bare inneholder de bestilte endringene. Kontroll av juss, vedtak og kode og det som krever skjønn går på
  standardmodellen: prøving av alternativene mot vedtakene, forslaget og spørsmålene.
  En agent i `.claude/agents/`, som `ci-logg` og `diffkontroll`, har modellen og
  innsatsen i sin egen definisjon.
- **Størrelse.** En subagent får en bestilling den kan gjøre ferdig på om lag 80 kall og
  under 150 000 tokens, uavhengig av grensen for økta: én fil, én gruppe bevis-saker eller ett spørsmål. Større arbeid
  deles på flere subagenter. Uavhengige subagenter startes i samme
  melding, og de andre tett etter hverandre, så hurtigbufferen holder seg varm. Ingen
  subagent venter på noe utenfor seg selv.
- **Bestillingen** sier nøyaktig hva som skal gjøres eller kontrolleres, hva sluttrapporten
  skal inneholde, og at den ikke gjengir filer, differ eller testutdata. Trenger økta en tekst ordrett, ber bestillingen om ID og sted,
  og økta slår opp teksten selv. Bestillingen har også med setningen «Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.», ordrett og på engelsk, for bedre balanse mellom grundighet og tid (kilde: Claude Code 2.1.299).
