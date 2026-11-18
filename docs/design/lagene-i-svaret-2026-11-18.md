# Lagene i svaret

Kartlegging for #2182 etter designgjennomgangen i #2163 og samle-PR #2211.
Forslagene gjelder visningen. Ordlyden i et sendt brev følger MM-U50.

| Sted | Dagens form | Forslag til brukerprøven | Kilde |
| --- | --- | --- | --- |
| Svarskjemaet | «Gjelder hvis» står over spørsmålet. Hver linje lenker til innsigelsen eller brevet om forholdet. | Vis samme lagnavn som i brevet der flere lag må skilles. Behold feltlenken. Bruk brevets punktnummer når skjemaet har det fra kjernen. | `Gjelderhvis.svelte`, systemfila, BF-08 og BF-20 |
| Panelet i skjemaet | Hovedlinjene viser standpunktene med laget der det finnes. Standpunkter uten lag står uten lagnavn. | Behold rekkefølgen fra kjernen. Vis ett standpunkt per linje under det samme vilkåret. | `Hovedlinjer.svelte`, systemfila |
| Brevkontrollen | «Dette sender du» viser standpunkter med lagnavn. «Når du sender» viser virkningen. | I «Punktene i brevet» står ett punkt per linje. Hvis et punkt viser flere lag, står hvert standpunkt på en egen linje under laget sitt. | `Brevkontroll.svelte`, systemfila, #2190 |
| Brevet | «Prinsipalt», «Subsidiært, hvis … ikke fører frem» og «Videre subsidiært, hvis heller ikke … fører frem» står som egne linjer når kjernen har flere lag. | Bruk brevet som kilde for rekkefølge, lagnavn og vilkår. | `kjerne/frosset/brevtekst.ts`, OV-U32 og MM-U50 |
| «Kravet og svaret» | Det første laget leder. Fristen viser vilkår og standpunkt i samme linje, blant annet når hindringen er bestridt. | Behold vekten fra systemfila. Bruk én linje per standpunkt, med vilkår fra samme lag som i brevet. | `KravetOgSvaret.svelte`, `FristkravetOgSvaret.svelte`, U-2 i BF-44 og U-3 i BF-45 |
| Brevtråden | Leselinja viser standpunktet først i det første laget. Senere lag innledes med vilkåret. | Behold leselinja. Vis hvert standpunkt på egen linje der flere står under samme vilkår. | `Brevtraad.svelte`, systemfila, U-16 i BF-44 |

## Hindringen i fristsvaret

BF-45 U-3 beskriver en oversikt der svaret på hindringen opptrer med vilkår.
BF-20 og det frosne brevet uttrykker hindringen som ett standpunkt for hele
kravet. Kjernens lag avgjør hvilke senere standpunkter innsigelsen bærer,
jf. KA-U78. Før ordlyden endres, må det avklares om oversikten skal gjengi
hindringen for seg slik brevet gjør, eller også vise vilkåret som hører til
et annet standpunkt. Et valg som endrer budskapet i brevet, går gjennom
vedtaksregisteret.

## Målestokken når byggherren krever

U-2 i BF-44 knytter åpent og fylt til ringene i tråden. Et krav fra byggherren
etter punkt 34.3.3 vises i dag uten egen målestokk. Før en slik målestokk bygges,
må formen velges. Dagens usikkerhet og begge alternativer er ført i
[kommentaren i #2182](https://github.com/khjohns/endringsmeldinger/issues/2182#issuecomment-6960998616).
