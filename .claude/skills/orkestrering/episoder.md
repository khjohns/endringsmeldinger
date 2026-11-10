# Episodene bak reglene for orkestreringen og arbeidsøktene

Reglene står i [orkestreringsskillen](SKILL.md) og
[arbeidsøkt-skillen](../arbeidsokt/SKILL.md). Her står episodene som ga dem, under
navnet på regelen de viser.

## «Hvorfor grensene finnes» (arbeidsøkt-skillen)

I en byggeøkt 16.10 sto én subagent, med 115 kall og en kontekst som vokste til
356 000 tokens, for om lag 60 % av kostnaden.

## «2. Oppdraget til hver økt»: fordelingen av filer opphører ved merge

I FK runde 2 nektet tillatelsessystemet i en økt den å tilpasse seg etterpå. Det
gjaldt arkitekturtesten.

## «Orkestratoren overleverer etter en time»

I runde 13 ventet begge orkestratorene i 3 og 6,7 timer med sjekker, og hver
sjekk leste hele konteksten på nytt (oppdragsgiver 20.10).

## «Passerer en økt grensen sin uten å stoppe»

Hver melding leser hele den store konteksten på nytt. Reviewøkta for #978 i runde 13 vokste slik til
321 000 tokens og kostet mer enn de andre øktene i det tekniske sporet til
sammen (oppdragsgiver 20.10).

## «3. Gjennomgang»: kontrollen av sikkerhetsinvariantene

I FK runde 5 fant subagenten et hull i rettighetene som to runder
`/code-review high` hadde oversett (PR #372).
