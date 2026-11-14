# Episodene bak reglene for orkestreringen og arbeidsøktene

Reglene står i [orkestreringsskillen](SKILL.md) og
[arbeidsøkt-skillen](../arbeidsokt/SKILL.md). Her står episodene som ga dem, under
navnet på regelen de viser.

## «Hvorfor grensene finnes» (arbeidsøkt-skillen)

I en byggeøkt 16.10 sto én subagent, med 115 kall og en kontekst som vokste til
356 000 tokens, for om lag 60 % av kostnaden.

## «Oppdraget»: fordelingen av filer opphører ved merge

Sies det ikke uttrykkelig, kan tillatelsessystemet i økta nekte den å tilpasse seg
etterpå. I FK runde 2 skjedde det, og det gjaldt arkitekturtesten.

## «Orkestratorens kontekst»

I runde 13 ventet begge orkestratorene i 3 og 6,7 timer med sjekker, og hver
sjekk leste hele konteksten på nytt.

## «En økt over grensen»

Hver melding leser hele den store konteksten på nytt. Reviewøkta for #978 i runde 13 vokste slik til
321 000 tokens og kostet mer enn de andre øktene i det tekniske sporet til
sammen.

## «Gjennomgang av hver PR»: kontrollen av sikkerhetsinvariantene

I FK runde 5 fant subagenten et hull i rettighetene som to runder
`/code-review high` hadde oversett (PR #372).

## «Kjernen før visningen»

I runde C 14.11 stoppet byggingen av fristskjemaene i Varden seks ganger på mangler i
kjernen eller på serveren, som bestillingen BF-20 ikke hadde i G-tabellen: fristtabellen
for visningen (#1923), datoen per frist (#1936), vedlegg og forbehold ved kravet (#1823),
datoen etter forlengelsene i andre saker (#1946), og tekster fra kjernen (#1931, #1943).
Hver mangel ble funnet midt i byggingen, ga et spørsmål til orkestratoren og et avvik til
oppdragsgiver, og fire Varden-økter brukte om lag 330 000–570 000 tokens hver på ett eller
to skjemaer.

## «Gjennomgang av hver PR»: spørsmålene fra en byggeøkt

I runde C 14.11 sendte orkestratoren kjerneøktas spørsmål om forlengelsene videre uten at
en subagent hadde prøvd alternativene mot vedtakene («Prøv hvert alternativ» i
vedtaksskillen). To premisser var feil: at byggherren som godkjenner hele kravet, trenger
totalentreprenørens svar (GR-U7), og at totalentreprenøren godtar en endringsordre
(EO-U39). Oppdragsgiver måtte rette dem, og spørsmålene ble stilt tre ganger.

## Hvorfor reglene i orkestreringsskillen er som de er

- **Filoverlapp (punkt 1).** Parallelle PR-er i samme fil gir konflikter ved hver
  merge. `get_files` fra GitHub-MCP har patchene med og blir for stort på en stor PR.
- **Størrelsen på runden** (#425, #491).
- **Fordelingen (punkt 2).** Relaterte issues går til samme økt, så konteksten den har
  bygget, brukes på nytt. Et urelatert issue får ny økt fordi hvert kall leser hele
  den voksende konteksten. Arbeid som gir en PR, får egen økt fordi den må følge CI og
  rettinger over timer, og en subagent deler i tillegg checkout med orkestratoren.
- **Nettleserkontrollen i oppdraget.** Demoruta har en journal i minnet.
- **Meldinger (punkt 3).** Hver melding til en stor økt koster en ny lesing av hele
  konteksten, og meldinger som krysser hverandre, gir dobbelt arbeid. Én samlet
  CI-sjekk gjør at orkestratoren vekkes sjeldnere.
- **Oppdater mot `main` (punkt 4).** Regelsettet krever ikke at grenen er à jour, og
  ingen konflikt betyr ikke at kombinasjonen er testet: to PR-er uten felles filer kan
  endre hverandres oppførsel. Unntaket for tekst gjelder ikke vedtaksregisteret,
  domenetabellen, brukerforløpene og skriptene fordi vakttestene leser dem.
- **Feilinnføringene etter oppdateringen.** De prøver om testene i kjernen fanger feil,
  og det kan bare endringer i `kjerne/`, `sprakprove/kjernelagring/` eller verktøyet
  flytte.
- **`/simplify`.** Det den finner, avhenger av hva grenen legger til, ikke av hvor
  stor diffen er. Funnene om duplisering og to kilder i runde B og C kom fra PR-er på
  25 linjer og på 900 (#1845, #1848, #1856, #1861). Den koster flere subagenter og ett
  `/code-review` til.
- **Modell for mekaniske arbeidsøkter** (#425, #439).
