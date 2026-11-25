# Bestilling: strukturen i brevene med lag og forbehold

Felles bestilling til sparringen i [#2337](https://github.com/khjohns/endringsmeldinger/issues/2337),
steg 2. Tre modeller får den ordrett og svarer hver for seg. Hvert svar postes ordrett i #2337.

## Oppgaven

Foreslå hvordan brevene mellom byggherren og totalentreprenøren skal bygges opp, så de er
presise og lette å følge. Spørsmålet gjelder særlig byggherrens svar med flere lag
(prinsipalt, subsidiært, videre subsidiært), flere kravposter og forbeholdet om forholdet.
Det gjelder ordlyden og strukturen, ikke rettsreglene.

## Hva brevene er, og hvem som leser dem

Brevene er formelle meldinger mellom partene i en totalentreprise etter NS 8407. De har
juridisk vekt: et varsel eller en innsigelse som ikke står klart i brevet, kan gå tapt.
Brevet leses av motpartens prosjektleder og ofte av en jurist, og senere kanskje av en
oppmann eller en domstol. Leseren har brevet foran seg, ikke skjemaet det ble laget i. Et
sendt brev endres ikke.

Byggherren svarer i et skjema. Ut fra valgene lager løsningen en låst tekst for hvert punkt,
og parten skriver sin egen begrunnelse. Den låste teksten lages for alle tilfeller av den
samme koden. Et forslag må derfor gi regler for strukturen som virker for alle tilfellene,
ikke bare teksten i ett brev. Det løsningen vet om hvert standpunkt, er blant annet
kravposten det gjelder, laget det står i, og hvilke innsigelser i lagene foran som er vilkår
for det. Det står i vedtakene under.

## Føringene fra oppdragsgiver

Oppdragsgiver 25.11, ordrett:

> «Når det gjelder brevteksten er jeg usikker. Brevet som helhet burde kunne skrives presist,
> men være lett å følge: det innebærer blant annet færrest mulige henvisninger frem og tilbake
> i samme tekst. Kanskje lurt med en skikkelig sparringsrunde mellom Fable, Astra (codex) og
> Argon (gemini) etter at noen andre sgenter har samlet inn flere eksempler med brevtekst. En
> ting jeg vil ha: forbehold knyttet til forholdet er nederst, slik vedlagt brev vises.»

Føringene for runden, ordrett fra [kommentaren i #2337](https://github.com/khjohns/endringsmeldinger/issues/2337#issuecomment-7155760513):

> - brevet skal være presist og lett å følge, med færrest mulige henvisninger fram og tilbake;
> - forbeholdet knyttet til forholdet står nederst, som i forslaget;
> - ordlyden er design eller beslutning, og budskapet i vedtakene står;
> - et sendt brev endres ikke (MM-U9).

## Budskapet i vedtakene står

Et vedtak angir budskapet, ikke ordlyden. Forslaget kan endre ordlyden og strukturen, men hvert
brev skal fortsatt si det vedtakene sier. Vedtakene for lagene og forbeholdene står ordrett i
[`vedtakene.md`](vedtakene.md). Vedtaksfila på `main` er kilden.

| Vedtak | Hva det styrer |
| --- | --- |
| OV-U32, med OV-U33 | Lagene, etikettene og når et standpunkt er upåvirket |
| OV-U117 | En innsigelse for én kravpost og standpunktet til en annen kravpost |
| VS-U4, KA-U84 | Innsigelsen mot et varsel eller en spesifisering for sent, og det som står subsidiært etter den |
| LV-U34, LV-U37, LV-U40 | Strukturen i byggherrens svar: innledningen, punktene, lagslinjen og henvisningene til egne punkter |
| LV-U70, LV-U71 | Ett avsnitt per punkt, med partens begrunnelse under punktet |
| GR-U34 | Forbeholdet når forholdet er ubesvart |
| OV-U73 | Oversikten over beløpene |
| MM-U9 | Et sendt brev beholder virkningen. Endret tekst gjelder bare nye brev |

Noen av postene fastsetter også ordlyd, for eksempel lagslinjen med «ovenfor» i LV-U40. Krever
forslaget en annen ordlyd eller struktur enn en post fastsetter, sier svaret hvilken post og
hva som må endres. Oppdragsgiver avgjør det.

## Språket

[`docs/sprak.md`](../../sprak.md) gjelder: klarspråk, ett utsagn per setning, partene skrevet
fullt ut, «punkt 34.3.3» om NS 8407, og ordene i brevene og skjemaene i tabellen der.

## Materialet

- [README](README.md): tilfellene, hvor forbeholdet står i hvert brev i dag, og hver henvisning
  fram og tilbake i brevene.
- `brev-01` til `brev-12`: tolv brev slik løsningen skriver dem i dag, laget av koden. Brev 01
  er tilfellet i #2337. Brev 06 har flest henvisninger.
- [`brevforslag-vederlagssvar-v4.html`](brevforslag-vederlagssvar-v4.html): oppdragsgivers
  forslag til struktur for et vederlagssvar med tre lag. Forbeholdet om forholdet står
  nederst, som oppdragsgiver vil ha det.
- Alternativene A–D i [spørsmålet i #2337](https://github.com/khjohns/endringsmeldinger/issues/2337#issuecomment-7154481147),
  for lagslinjen når kravpostene i samme lag har ulike vilkår: (A) lagslinjen nevner vilkåret
  for hver kravpost, (B) lagslinjen har det felles vilkåret og setningen for kravposten sitt
  eget, (C) laget deles i én gruppe per kravpost med samme etikett, og (D) én lagslinje med et
  generelt vilkår om «innsigelsen ovenfor mot samme kravpost». Alternativene er et
  utgangspunkt, ikke en ramme. Et forslag kan bygge på ett av dem, kombinere dem eller gå en
  annen vei.

## Hva svaret skal inneholde

1. **Prinsippene for brevets struktur.** Nummererte regler som til sammen avgjør hvordan et
   brev bygges opp: rekkefølgen på punktene, hvor vilkåret for et lag står, hvordan et vilkår
   per kravpost uttrykkes, hvor begrunnelsen og forbeholdet om forholdet står, og når brevet
   viser til et annet punkt. Hver regel har én setning om hvorfor.
2. **Minst tre av brevene skrevet om i sin helhet** etter prinsippene, med hele den låste
   teksten og plassholderne for begrunnelsene. Ta med brev 01 og brev 06, og et brev med
   forbeholdet om forholdet (02, 05 eller 07). Merk ikke endringene. Brevet skal kunne leses
   alene.
3. **Endringene i vedtakene forslaget krever**, hvis noen: posten, hva som må endres, og
   hvorfor. Står budskapet i en post ikke lenger i et omskrevet brev, er det en feil i
   forslaget, ikke en endring.
4. **Det forslaget ikke løser**, eller tilfeller der prinsippene gir et tungt brev.

## Lengden

Prinsippene og punkt 3 og 4 til sammen høyst om lag 1 200 ord. De omskrevne brevene kommer i
tillegg. Hele svaret høyst om lag 4 000 ord, i Markdown.

## Rammene

- Endre ingen filer i repoet. Svaret er tekst.
- Foreslå ikke nye rettsregler eller andre virkninger. Spørsmålet er hvordan brevet sier det
  vedtakene sier.
- Ta ikke med saksdata, personnavn fra prosjekter eller annet som ikke står i materialet.
