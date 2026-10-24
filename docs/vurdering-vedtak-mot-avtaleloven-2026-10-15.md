# Vurdering: vedtakene mot NS 8407 og avtaleloven kapittel 1

Dato: 2026-10-15. Kontrollert commit: `89365b3` (`main`). Issue: #504.

## Formål og grunnlag

Oppdragsgiver ba 15.10 om en gjennomgang av vedtakene i 3.1 mot NS 8407 og
avtaleloven kapittel 1, fordi «spørsmålene og svarene er ofte "enklere" enn man
tror». Dokumentet viser for hvert vedtak hjemmelen, prinsippet vedtaket kan føres
tilbake til, og utfallet. Det ender i forslag til prinsippvedtak, listene over
vedtak som kan oppheves eller presiseres og vedtak som strider mot prinsippene, og
spørsmålene samlet for én tilslutning.

Dokumentet er et beslutningsgrunnlag og ikke et vedtak. Vedtakene står i
[3.1 i hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger),
og de føres fra [vedtaksregisteret](vedtaksregister/README.md) etter svaret.

**Premissene oppdragsgiver har satt:**

- [HF-U4](plans/vedtak.md#hf-u4) og
  [HF-U5](plans/vedtak.md#hf-u5) er
  prinsippvedtak etter avtaleloven kapittel 1. Kapittel 1 gjelder direkte for TEs
  krav og byggherrens svar, også for fristforlengelse: «Det er klart at dette er
  tilbud og løfter» (svar 2 i HF-U5).
- Avtaleloven kapittel 3 er ikke relevant og er ikke brukt.

**Kildene** er NS 8407 og avtaleloven kapittel 1 med kommentar i det private
repoet `khjohns/kontrakt`. Bestemmelsene vises det til; teksten gjengis ikke
(#424).

**Fremgangsmåten.** Registeret er delt i åtte grupper etter gruppene i 3.1. Én
subagent per gruppe leste vedtakene i gruppen, HF-U4 og HF-U5, bestemmelsene i
NS 8407 og avtaleloven §§ 1–7 med kommentar, og leverte tabellen under. Utfallene
er kontrollert mot vedtaksteksten for de vedtakene som foreslås opphevet eller som
strider mot et prinsipp. Forslagene til prinsippvedtak er prøvd mot vedtakene i 3.1
én gang (se «Verifikasjon og grenser»).

## Kodene i tabellene

**Hjemmel**, den øverste som bærer vedtaket, i rekkefølgen fra #504:

1. NS 8407 sin uttrykkelige regel, som går foran fordi kapittel 1 viker for det som
   følger av avtalen (avtl. § 1 første ledd);
2. avtaleloven eller alminnelig kontraktsrett;
3. vår tolkning;
4. vedtatt produktavgrensning;
5. teknisk representasjon.

**Prinsipp** viser til forslagene F1–F8 under «Forslag til prinsippvedtak».

**Utfall:**

- **E** – kan erstattes: prinsippet opphever eller presiserer vedtaket (aldri sletting);
- **P** – står som produktvalg under prinsippet;
- **S** – står som eget vedtak (ikke en anvendelse, eller teknisk eller arkitektur);
- **K** – strider mot prinsippet. «K løst» betyr at et senere vedtak alt har snevret
  det inn.

## Hovedfunnet

Vedtakene om krav, svar, aksept og enighet er i hovedsak anvendelser av fem regler i
avtaleloven kapittel 1 og to i NS 8407:

| Regel | Hjemmel | Forslag |
| --- | --- | --- |
| Løfteprinsippet: et utsagn binder fra det er kommet fram, og kan bare kalles tilbake om tilbakekallet kommer fram før eller samtidig | avtl. § 1 første ledd, § 7 | F1 |
| Et svar som ikke stemmer med tilbudet, er avslag i forening med nytt tilbud | avtl. § 6 første ledd | F2 |
| Et avslått tilbud faller bort; akseptfristen; sen aksept er nytt tilbud | avtl. §§ 2–5 | F3 |
| Aksept som stemmer med tilbudet, gir avtale med det innholdet tilbudet hadde | avtl. § 1, § 2 | F4 |
| Avkall på egen rett er et løfte | avtl. § 7 som alminnelig prinsipp (kommentaren) | F5 |
| Innsigelse mot for sent varsel og virkningen av taushet | NS 8407 § 5 tredje ledd og de særlige passivitetsreglene | F6 |
| Endringsordren binder TE uten aksept | NS 8407 § 31.3 annet ledd | F7 |

Den åttende regelen (F8) er ikke en rettsregel, men grensen mellom det partene har
meddelt og appens vurdering av det. Den samler MM-U9, MM-U11, MM-U12, OV-U4 og
flere.

Gjennomgangen viser at **nesten ingen vedtak kan oppheves**. Nesten hvert vedtak har
et eget produktvalg om hva appen viser, avviser eller hvordan den leser et
registrert brev, og et slikt valg utgår ikke fordi rettsregelen er enkel (#504).
Gevinsten ligger i at prinsippet **sies én gang**: rundt femti vedtak kan vise til
ett av F1–F8 i stedet for å begrunne regelen på nytt, og nye domenespørsmål kan
avgjøres ved å slå opp prinsippet. To vedtak kan oppheves (KA-U3 og KA-U5), og tre
strider mot prinsippene eller avhenger av et svar (EO-U5, GR-U9 og raden om frafall
i B-13).

Flere konflikter er alt løst av HF-U4 og HF-U5: GR-U7, OV-U5, VS-U9 og MM-U9. OV-U5
har løst MM-U8 og VS-U7.
Det samme gjelder MM-U4, MM-U5 og MM-U6, som MM-U9 opphevet, og GR-U5, som KA-U13,
KA-U14 og KA-U22 har snevret inn.

## Vurdering per vedtak

Radene følger rekkefølgen i 3.1. En rad uten ID er vist med første ord.

### Krav, kravversjon og trekk

| Vedtak | Hjemmel | Prinsipp | Utfall | Begrunnelse |
| --- | --- | --- | --- | --- |
| SK-02 og SK-03 | 2 (avtl. § 5, § 6); 1 (§ 34.2.2) | F3, F4 | E (presiseres) | En ny kravversjon avslår byggherrens svar, og sporet venter på nytt svar. At «en aksept faller», stred mot F4 og er rettet av KA-U7. At et godtatt svar ikke kan revideres, er et snevrere tilfelle av HF-U5. |
| «Hver oppdatering … er en ny kravversjon» (05.10) | 2 (avtl. § 5, § 6); 4 | F3 | P | En ny versjon avslår svaret også med uendrede verdier. At den er en kravversjon også da, er et produktvalg. |
| «Et krav TE har trukket, kan ikke tas opp igjen» (05.10) | 2 (avtl. § 7); 4 | F5 | P | Trekket er avkall. At et nytt krav går i ny sak, er et produktvalg. |
| KA-U2 | 5; 1 (§ 33.4 mot § 33.6.1) | – | S | Hvilke hendelser som er kravversjoner. Skillet mellom varsel og krav har støtte i NS 8407. |
| KA-U3 | 2 (avtl. § 1) | F4 | E (oppheves) | Hele innholdet dekkes av F4, KA-U7 (spor med enighet), OV-U3 (kravene avgjort, som endret KA-U3) og vedtaket 05.10 (trukne krav). Vedtaket knytter regelen til en sakstatus, i strid med «kontrakten først». |
| KA-U8 | 3 (§ 33.6.1, § 34.2.1); 4 | – | P | Et krav på 0 er ikke et tilbud om noe. Null uttrykkes ved trekk, «ingen krav» eller et godtatt avslag. |
| KA-U33 | 4; 1 (§ 33.6.1, § 33.7) | – | P | Skjemaet krever begrunnelse. Appen vurderer ikke om den holder (MM-U12). |
| KA-U12 | 2 (avkall); 1 (§ 32.3 første ledd a) | F5 | P | «Ingen krav» er avkall som binder TE. Lukkingen og videreføringen i en EO-sak er produktvalg. |
| KA-U15 | 4; 1 (§ 33.4 mot § 33.6.1) | – | S | Rekkefølgen for «ingen krav». |
| KA-U17 | 2 (avkall); 4 | F5, F8 | P | Avkallet rekker så langt brevet sier. |
| KA-U22 | 2; 4 | F4, F5 | P | Brevteksten gjør avkallet entydig. Sperren verner det byggherren har fått i en enighet. |
| KA-U23 | 4; 1 (§ 33.3 femte ledd) | F8 | P | Femte ledd vises som veiledning, og appen trekker ingen slutning. |
| KA-U25 | 2; 4 | F1, F8 | P | Forbeholdet avgrenser løftet og må stå i brevet. |
| KA-U27 | 2; 4 | F4 | P | Trekket sperres når appen ikke vet hva byggherren har fått i en enighet. |
| KA-U30 | 4; 3 | F8 | P | Merkingen gjelder de sporene den viser til. |

### Svar og standpunkt

| Vedtak | Hjemmel | Prinsipp | Utfall | Begrunnelse |
| --- | --- | --- | --- | --- |
| B-13, hovedvalget | 5 (4) | F8 | S | Arkitektur: serveren er sannhetskilden for utledede verdier. |
| B-13, regelversjon | 5 | F8 | S | Teknisk versjonering, snevret inn av MM-U9 og MM-U11. |
| B-13, begrunnelsestekst | 2 (avtl. § 1); 4/5 | F1, F8 | P | Byggherren er bundet av teksten hen sender. Kontrollen av feltene er teknikk. |
| KA-U18 | 1 (§ 32.3 tredje ledd); 4 | F8 | P | At begrunnelsen må stå i samme brev, er appens arbeidsflyt. |
| KA-U21 | 3, med støtte i 2 (avtl. § 6) | F2 | P | Et svar som påberoper preklusjon, stemmer ikke med kravet og er avslag med nytt tilbud. |
| KA-U24 | 4; 1 (§ 32.3) | F2 | P | Utløseren «mindre gunstig for TE enn kravet» er predikatet i avtl. § 6 første ledd. Begrunnelsesplikten er appens. |
| KA-U31 | 5 | – | S | Plassering og lagring av begrunnelsen. |
| KA-U32 | 1 (§ 32.3 første ledd c); 4 | F2 | P | Frafall er en avgrensning som ikke stemmer med kravet. Se spørsmål 4. |
| B-13, «godkjent» bare når hele kravet er godkjent | 2 (avtl. § 2, § 6) | F2 | E (presiseres) | Bare et svar som stemmer med kravet, er aksept. Raden står fordi den opphevet 99 %-terskelen. |
| KA-U9 | 1 (§ 34.1.1, § 34.4); 2; 4 | F2 | P | «Godkjent» ved likhet følger av avtl. § 6. Taket mot et svar gunstigere enn kravet er et produktvalg. |
| B-13, preklusjon trekkes av systemet | 1 (§ 33.4, § 34.1.2, § 34.1.3); 4 | F2, F6 | P | Prinsipalt avslag med subsidiært standpunkt er formen avtl. § 6 gir. HF-U4 presiserer raden. |
| B-13, frist uten fremdriftshindring | 1 (§ 33.7 annet ledd); 4 | F1, F6 | P | Dagene må stå i svaret. Formen er et produktvalg. Se spørsmål 5. |
| KA-U4 | 5 | F6 | S | Ingen standardverdi, så taushet lagres ikke som «i tide». Forutsetningen for HF-U4. |
| KA-U16 | 4 | F8 | P | Et forbehold appen ikke kan uttrykke, bevares og sperrer bindende handlinger. Et svar med forbehold kan likevel gi sammenfall (KA-U26). |
| KA-U19 | 4 | F8 | P | Utdypningen tolkes ikke. |
| KA-U20 | 4 | F4, F8 | P | Hvem som merker, og hvor bred sperren er. |
| KA-U26 | 4 | F2, F4 | P | Sperrelisten er et produktvalg. Om et forbehold er uvesentlig (avtl. § 6 annet ledd), avgjør ikke appen. |
| KA-U34 | 1 (§ 32.3 tredje ledd); 4 | F1, F8 | P | En senere begrunnelse endrer ingen standpunkter. |
| KA-U35 | 1 (§ 5 første ledd); 4 | F8 | P | Et brev utenfor appen er like gyldig. At det kan registreres, er et produktvalg. |
| KA-U36 | 4 | F8 | P | Kontroll i appen, ikke en kontraktsregel. |
| KA-U37, KA-U38, KA-U39 | 5 | – | S | Datoen for et svar fra appen, sendedato som sammenlikningsgrunnlag, og at en bestridelse ikke virker på kontrollen (MM-U7). |

### Aksept og enighet

| Vedtak | Hjemmel | Prinsipp | Utfall | Begrunnelse |
| --- | --- | --- | --- | --- |
| KA-U1 | 2 (avtl. § 5, § 6); 5 | F2, F3, F4 | P | En delvis aksept er et nytt tilbud (§ 6). Et svar på en tidligere kravversjon er bortfalt (§ 5). At appen avviser i stedet for å lagre, er et produktvalg. HF-U5 snevrer inn. |
| KA-U5 | 2 (avtl. § 1, § 6) | F4 | E (oppheves) | Godtar TE et svar som avviker fra kravet, er partene enige om svarets tall. Det står i sin helhet i F4. |
| GR-U7 | 2 (avtl. § 1); 3 | F1, F4 | P (K løst) | Revisjonsretten til ugunst for TE stred mot F1, og HF-U4 og HF-U5 har snevret den inn. Se spørsmål 5 om ordet «avslag». |
| GR-U6 | – | – | Allerede erstattet | Erstattet av GR-U7 08.10. |
| GR-U8 | 2 (avtl. § 1); 4 | F4 | P | Et svar som stemmer med kravet, er aksept. Da har TE ikke noe å godta. |
| KA-U6 | 2 (avkall) | F5 | P | TE kan gi avkall på eget krav også etter en enighet. Grensen og sperren er produktvalg. |
| KA-U7 | 2 (avtl. § 1); 1 (§ 34.2.2) | F4 | P | Ingen part går fra en enighet alene. At en ny kravversjon avvises også når byggherren ville samtykket, er et produktvalg. |
| MM-U3 | 2 (avtl. § 1); 5 | F4, F8 | E (presiseres) | Enigheten har innholdet svaret hadde da den ble inngått. Koblingen til B-13 står. |
| KA-U10 | 2 (avtl. § 1, § 6, § 7); 5 | F4, F8 | P | Partene er enige om svaret slik brevet uttrykker det. HF-U5 utvider. |
| KA-U11 | 4; 2 | F4 | P | Predikatet og listen over avviste kommandoer er produktavgrensning. Se spørsmål 4. |
| KA-U28 | 4 | F1 | P | En avklaring med samme innhold endrer ingen binding. |
| KA-U29 | 1 (§ 5 tredje ledd, § 32.3 annet ledd); 4 | F5, F6 | P | Har TE godtatt avslaget, endrer innsigelser ikke utfallet. Visningen er et produktvalg. |
| KA-U13 | 1 (§ 32.3 første ledd a, § 31.3 annet ledd); 4 | F5, F7 | P | Et trekk opphever ikke endringsordren. Sperren skyldes lagringen. |
| KA-U14 | 2 (avkall); 1 (§ 31.3 annet ledd); 4 | F5 | P | De første setningene er F5. Sperrene og brevteksten står. |
| «Aksept av avslag …» (19.09, TFR-01) | 5 | F4 | S | Statusetikett. Innholdet står i KA-U1 og KA-U7. |

### Grunnlag, frafall og trekk av grunnlaget

| Vedtak | Hjemmel | Prinsipp | Utfall | Begrunnelse |
| --- | --- | --- | --- | --- |
| GR-U1 | 2 (avtl. § 5, § 6); 3 | F3 | P | En ny kravversjon avslår svaret. At vederlag og frist står subsidiært til de besvares igjen, er vår tolkning. |
| GR-U2 | 2 (avtl. § 1) | F4 | E (presiseres) | Godkjent grunnlag er enighet og kan ikke endres ensidig. Avslag, preklusjon og frafall er ikke enighet. |
| GR-U10 | 2 (avtl. § 1, § 7); 1 (§ 32.3 a) | F1, F4 | E (presiseres) | Et svar som stemmer med kravet, er enighet. Spørsmålet om endringsordre bæres av GR-U13. |
| GR-U3 | 4/5 | – | S | Arkitektur og etiketter. |
| GR-U4 | 3 | F1 | P | HF-U5 snevrer inn. Etter en ny grunnlagsversjon er byggherren fri (HF-U1). |
| GR-U5 | 2 (avkall); 3 | F5 | P (K løst) | Trekket binder TE. Ordlyden som kunne fjerne byggherrens avtalte rettigheter, er snevret inn av KA-U13, KA-U14 og KA-U22. |
| GR-U9 | 1 (§ 32.3 c); 3 | F1, F2 | K (avhenger av spørsmål 4) | Frafallet inneholder et løfte om endringsordre for utført arbeid. Etter F1 binder løftet, mens GR-U9 og HF-U5 lar byggherren revidere fritt. |
| GR-U11 | 1 (§§ 14.4, 14.6, 15.2, 21.4, 24.2.2, 26.3, 32.1–32.3) | – | S | Anvender henvisningene i NS 8407. Står mot raden om frafall i B-13 (spørsmål 6). |
| GR-U12 | 1 (§ 32.3 a); 2 | F4 | P | Godkjenner byggherren uten å påberope preklusjon, er partene enige. |
| GR-U13 | 1 (§ 31.3 første ledd, § 32.3 a) | F7 | S | Formkravene til en endringsordre. |
| GR-U14 | 1 (§ 31.3); 4 | F8 | P | Brevteksten er et produktvalg. |
| GR-U15 | 4 | F8 | P | NS 8407 § 32.2 krever ingen beskrivelse. Avvisningen er appens. |
| GR-U16 | 4 | F8 | P | Kravet om dato eller nummer er et produktvalg. |
| B-13, endret underkategori | 2 (avtl. § 5, § 6); 3 | F3 | P | Samme regel som GR-U1. «Låsingen faller bort» er snevret inn av GR-U2. |
| B-13, svar ved avslått eller prekludert grunnlag | 3; 5 | F2 | P | Det subsidiære standpunktet er vår tolkning. HF-U5 binder også det. |
| B-13, `grunnlag_varslet_i_tide` utenfor § 32.2 | 1 (§ 32.2, § 5 tredje ledd) | F6 | S | Innsigelsen forutsetter en varslingsplikt. |
| B-13, frafall bare ved irregulær endring og valgrett | 3 | – | K (mot GR-U11, spørsmål 6) | GR-U11 tar med svarplikten i § 32.3, også bokstav c. |
| Avslått og § 32.2 samtidig | 1 (§ 32.2, § 32.3 b); 3 | F6 | P | Rekkefølgen er visning. |
| #235, frafall og § 32.2 | 1 (§ 32.3 c); 3 | F8 | S | Vår tolkning av § 32.3 c. |
| Frafall som sporstatus, SD-02, TFR-05 | 5 | – | S | Etiketter og samlet status. |
| #213, sak lukket etter godtatt avslag | 2 (avtl. § 1); 4 | F4 | P | TE har godtatt avslaget, så partene er enige. Lukkingen er et produktvalg. |
| SK-01 | 1 (§ 32.2 første ledd); 2 | F4 | E (presiseres) | Godtar TE preklusjonen, er partene enige om virkningen i § 32.2. |

### Varsler, frister og innsigelser

| Vedtak | Hjemmel | Prinsipp | Utfall | Begrunnelse |
| --- | --- | --- | --- | --- |
| SK-12 | 3 (§ 33.4, § 34.1.3) | F8 | P | Et varsel er et eget utsagn med dato. Avvisningen er et produktvalg. |
| MM-U1 | 3 (§ 33.4) | F6, F8 | P | Første registrering er ikke en flytting. Byggherren tar stilling på nytt (OV-U5, HF-U5). |
| MM-U8 | 3 | F6, F8 | P (K løst) | Endret av OV-U5, som forkastet at et varsel registrert etter svaret sperrer TEs aksept. |
| MM-U7 | 4 | F8 | P | En bestridelse registreres uten virkning (MM-U12). |
| VS-U6 | 1 (§ 34.1.2); 4 | F8 | P | Varselet er et eget utsagn. |
| VS-U7 | 3 (§ 34.1) | F6, F8 | P (K løst) | Endret av OV-U5, som MM-U8. |
| VS-U8 | 5 | F8 | S | Hvilken dato appen bruker. |
| VS-U15 | 1 (§ 33.4 første ledd); 4 | F8 | P | TE kan varsle uten dager. Brevteksten er et produktvalg. |
| VS-U16 | 4 | F8 | P | Et faktisk tidligere varsel kan registreres. |
| Nøytralt fristvarsel | 1 (§ 5 tredje ledd, § 33.6.2, § 33.7 første ledd) | F6 | P | Svarplikten utløses først av et krav med dager. |
| VS-U1 | 1 (§ 5 tredje ledd) | F6 | P | Innsigelsen er ett utsagn. HF-U4 snevrer også inn VS-U1 (spørsmål 9). |
| VS-U9 | 1 (§ 5 tredje ledd) | F1, F6 | P (K løst) | En innsigelse etter et «i tide» stred mot F1. HF-U4 har snevret inn. |
| VS-U11 | 2 (avkall); 4 | F1, F5, F6 | P | Et uttrykkelig avkall binder. Taushet og et registrert brev gir ikke avkall. |
| VS-U14 | 1 (§ 5 tredje ledd) | F6 | P | Symmetrien følger av § 5. |
| B-13, passivitet | 1 (§ 32.3 annet ledd); 4 | F6 | P | Rettsvirkningen står i NS 8407. Appen trekker ikke slutningen. |
| VS-U2 | 1 (§ 32.3, § 33.6.2, § 33.7, § 34.3.3); 4 | F6 | P | Samme regel, for flere bestemmelser. |
| VS-U10 | 4 | F6 | P | NS 8407 gir ingen fast frist for «uten ugrunnet opphold». |
| VS-U12 | 1 (§ 32.3 annet ledd); 4 | F6 | P | TEs påberopelse er et utsagn uten automatisk virkning. |
| VS-U3 | 4 | F6 | S | Rammen for de tre behandlingsmåtene. |
| VS-U4 | 1 (§ 33.6.1, § 34.3.3) | F6 | P | Formen prinsipalt og subsidiært er et produktvalg. |
| VS-U5 | 1 (§ 34.1.3) | F6 | P | Begrensningen gir et beløp, ikke et avslag. |
| VS-U13 | 3 (§ 33.3) | – | S | Oppdragsgivers lesning av § 33.3. |
| DRF-03 | 4/5 (§ 34.3.3) | F8 | P | Datoen settes én gang. |
| MP-U4–MP-U7 | 1/3 | F6, F8 | S | Gjelder metodeprøven. |
| VS-U17 | 1 (§ 33.6.2) | F6 | P | Rettsregelen står i NS 8407. Visningen er et produktvalg. |
| VS-U18 | 1 (§ 33.5); 4 | – | P | Veiledning. Appen beregner ikke dager (MM-U12). |
| VS-U19 | 1 (§ 33.6.2 første ledd); 4 | F6, F8 | P | Registreringen er et produktvalg. |
| VS-U20 | 1 (§ 5 tredje ledd); 3 | F1, F6 | P | Påberopelsen gjelder varselet. HF-U4 presiserer. |
| VS-U21 | 4 | F8 | P | Snevret inn av VS-U22. |
| VS-U22, VS-U23 | 4 (OV-U4) | – | S | Produktavgrensning for første versjon. |
| HF-U4 | 2 (avtl. § 1, § 7) | F1 | P | Anvender F1 på rettidigheten. F1 presiserer. |
| HF-U5 | 2 (avtl. §§ 1–7) | F1–F4 | S | Prinsippvedtaket for svaret. F1–F4 presiserer det. |

### Endringsordre og forsering

| Vedtak | Hjemmel | Prinsipp | Utfall | Begrunnelse |
| --- | --- | --- | --- | --- |
| EO-U1 | 5 | – | S | Lagring og kommando. |
| EO-U2 | 4 | F4 | P | Vilkåret for å inngå i en endringsordre. Samme svakhet som EO-U5. |
| EO-U3 | 4; 1 (§ 31.3 annet ledd) | F7 | S | Høyst én endringsordre per KOE-sak. |
| EO-U4 | 1 (§ 31.3 annet ledd); 2 (avtl. § 5) | F7, F1 | P | Endringsordren binder fra den er mottatt. «Én gang per utgave» er et produktvalg. |
| EO-U5 | 2 (avtl. § 2, § 6); 4 | F2, F4 | K (spørsmål 3) | Et delvis godkjent svar teller som enighet, men etter avtl. § 6 og KA-U1 er det enighet først når TE har godtatt det. Ikke snevret inn av HF-U5. |
| EO-U6 | 1 (§ 32.3 a, § 31.3); 2 (avtl. § 6) | F2, F7 | P | Full godkjenning bare når endringsordren dekker grunnlaget. |
| EO-U7 | 4 | – | S | En sak som bare viser til en annen, inngår ikke i den. |
| EO-U8 | 2 (avtl. § 1, § 6); 1 (§ 33.5); 3 | F4, F7 | P | Hvert utsagn godtas eller bestrides for seg. Se spørsmål 2. |
| EO-U9 | 2 (avtl. §§ 1–2); 1 (§ 31.1) | F4 | P | Strengere enn HF-U5, men et produktvalg: en utvidelse kommer som ny endringsordre. |
| «EO-sak kan følge av KOE-sak …» | 5 | – | S | Datamodell. |
| TFR-02 | 1 (§ 31.3 annet ledd); 5 | F7 | S | At en ordre ikke forhandles, følger av § 31.3. |
| FO-U1 | 1 (§ 33.8); 3 | F4 | P | Valgretten følger av § 33.8. Etter godtatt avslag er dagene avtalt. |
| FO-U2 | 1 (§ 33.8 annet ledd) | F1 | P | Varselet med antatt kostnad står i § 33.8. |
| FO-U3 | 1 (§ 33.8, ingen svarplikt) | F6 | P | Taushet får ingen virkning. |
| FO-U4 | 2 (avtl. § 7, gjennom HF-U5) | F1 | P | En revisjon i TEs favør er tillatt. |
| FO-U5 | 4; 2 | F1 | P | TE har erklært avslaget uberettiget. HF-U5 utvider sperren. |
| FO-U6 | 4 | F1 | S | Fullmakten er et produktvalg. |
| «Forsering er utenfor godkjenningsflyten» | 4 | – | S | Endret av FO-U6. |

### Sendte brev, regelendring og saker kjernen ikke forstår

| Vedtak | Hjemmel | Prinsipp | Utfall | Begrunnelse |
| --- | --- | --- | --- | --- |
| B-03, hovedvalget | 1 (§ 5 første ledd); 4 | F8 | P | Brevet er det autoritative uttrykket. Ett brev per innsending er et produktvalg. |
| B-03, dokumentet | 5 | – | S | Levering og representasjon. |
| MM-U9 | 2 (avtl. § 1); 4 | F1, F8 | P (K løst) | Oppfordringen til revisjon gjelder etter HF-U5 bare en revisjon i TEs favør. |
| MM-U10 | 1 (§ 5 første ledd) | F4, F8 | P | Flere spor i ett brev er et produktvalg. |
| MM-U11 | 4; 1 (§ 32.3) | F8 | P | Standpunktene fryses fordi de er det som er meddelt. |
| MM-U12 | 4 | grensen selv | S | Avgrensningen gjennomgangen bruker. |
| MM-U4, MM-U5, MM-U6 | – | F1, F4 | Opphevet (K løst) | Stred mot F1 og F4. Opphevet av MM-U9. |
| MM-U2, MM-U14 | 5 | – | S | Fail-closed når kjernen ikke kan tolke en hendelse. |
| MM-U18, MM-U19, MM-U20 | 5; 2 (avtl. § 1, § 7) | F1, F4, F5 | P | En hendelse som strider mot en enighet eller et avkall, gjør saken ikke forstått. Se spørsmål 4 om MM-U19. |
| HF-U1 | 5; 2 | F8 | S | Lagringsformatet. Hvert utsagn viser til det det gjelder. |
| B-10, MM-U15 | 5 | – | S | Versjonering og visning. |
| MM-U16, MM-U17 | 4; 2 | F1, F8 | P | Det som er meddelt, binder; utledningen kan endres med merknad. |
| LV-U1 | 5 | – | S | Leveringsoppdraget. Se spørsmål 8. |
| LV-U2, LV-U3 | 2; 1 (§ 5 første ledd); 4 | F1, F8 | P | Avsenderen er bundet av teksten hen godkjenner. |
| LV-U4, LV-U5, LV-U6 | 1; 4 | F8 | P | Ordlyden. Punkt 5 i LV-U4 bærer bindingen i HF-U4 (spørsmål 10). |

### Fullmakt, kontrakt, arkitektur, plattform og premissene

| Vedtak | Hjemmel | Prinsipp | Utfall | Begrunnelse |
| --- | --- | --- | --- | --- |
| Godkjenning, GFK-06, ubegrenset fullmakt, B-02 punkt 3–5 | 4 (NS 8407 § 9) | – | S | Fullmaktskjeden er byggherrens interne kontroll før sending. Bindingen overfor TE følger av § 9 når svaret er sendt. |
| KT-U1 | 5 | F2, F3 | S | Aksepten må gjelde svaret mot gjeldende kravversjon. |
| OV-U2 | 4 | F1 | P | TE er bundet av sin aksept av avslaget. |
| OV-U3 | 2 (avtl. § 1, § 2); 4 | F4 | P | «Virksom enighet» er aksept som stemmer med tilbudet. |
| OV-U4 | 1 (§ 5 første ledd); 4 | F8 | P | Et brev på e-post kan være et gyldig varsel, krav eller svar. At appen ikke utleder noe av det, er en produktavgrensning. |
| OV-U5 | 1 (§ 5 tredje ledd, § 33.4, § 34.1); 4 | F1, F6 | P (K løst) | Revisjonsretten er snevret inn av HF-U4 og HF-U5. |
| OV-U6 | 1 (§ 32.3 a, § 31.3) | F4, F7 | P | Endringsordren er byggherrens godkjenning. |
| OV-U7 | 4 | F6 | S | Rekkefølgen i byggingen. |
| OV-U8 | 1 (§ 34.1.3 tredje ledd) | F8 | P | Varselet kan komme etter kravet. |
| OV-U9, OV-U10 | 1 (§ 33.4, § 5); 4 | F8 | P | Datopremisset og at teksten ikke påstår mer enn appen vet. |
| HF-U2, MM-U13, RP-U1, HF-U3 | 3/5 | F8 | S | Appens vurdering holdes atskilt fra partens utsagn. Lagringsform. |
| Policy, KT-U2, API, tilstandsløst endepunkt, B-15, saker fra skjema og Catenda | 4/5 | – | S | Teknisk eller arkitektur. |
| B-14, B-17, OV-U1, B-18, B-19, leveringsmål, worker, utrulling | 4/5 | – | S | Arkitektur, overgang og prosess. |
| PostgREST (opphevet), direkte tilkobling, B-02 alternativ C og punkt 6, plattformuavhengig design, TS2-02, Catenda-innlogging, MG-02, DB-05, webhookens kontraktsside, vedlegg, B-12 | 4/5 | – | S | Plattform, datalag, tilgang og identitet. |
| P1–P7 | 4/5 | – | S | Premissene. |

## Forslag til prinsippvedtak

Forslagene er skrevet slik at de kan stå alene i 3.1. ID-ene settes når vedtakene
føres. Forholdet til andre vedtak står under hvert forslag. Det er prøvd mot 3.1.

**Merknad 15.10:** Vedtakene er ført etter svaret i #504 som HF-U6–HF-U13 (F1–F8), og
som EO-U10, GR-U17, GR-U18, FO-U7, LV-U7, LV-U8 og KA-U40 (spørsmål 3, 4, 6, 7, 8, 10
og 11). Svarene på spørsmål 2 og 5 inngår i HF-U12 og HF-U7. HF-U9 opphever KA-U3 og KA-U5.
Forholdet i spørsmål 9 står i Følge hos HF-U4, fordi forholdene i en merget post ikke
kan endres.
I vedtaksteksten er F1–F8 byttet ut med ID-ene.

### F1 Bindingen

> Appen behandler varsler, krav, svar og avkall en part sender, som løfter etter
> avtaleloven kapittel 1. Et utsagn binder parten fra det er kommet fram til
> motparten (avtaleloven § 1 første ledd og § 7). En senere hendelse fra samme part
> kan ikke ta tilbake eller svekke det parten har gitt motparten. Unntaket er TEs nye
> kravversjon, som er et nytt tilbud (F3). En revisjon av et svar TE ikke har godtatt,
> avvises ikke når den bare endrer i TEs favør (HF-U5). Hvilke hendelser appen avviser
> for å verne bindingen, står i vedtakene om svaret (HF-U4, HF-U5), enigheten (F4) og
> avkallet (F5). Gjelder NS 8407 noe annet, går kontrakten foran (avtaleloven § 1 første
> ledd). Om parten likevel er løst fra utsagnet, avgjør ikke appen (MM-U12).

Forhold: utvider HF-U4 og HF-U5 til varsler og avkall og til begge parter. Følger av
HF-U5 («tilbud og løfter»). Vedtaket 05.10 om at hver oppdatering er en ny
kravversjon, står som unntaket.

### F2 Svar som ikke stemmer med kravet

> Et svar er godkjenning av et standpunkt bare når det stemmer med kravet, i kravets
> egen enhet: krone eller dag (avtaleloven § 2). Et svar som avviker, også med et
> vilkår eller en påberopelse av preklusjon med subsidiært standpunkt, er avslag i forening med nytt tilbud (avtaleloven § 6 første ledd). Et subsidiært
> standpunkt er et betinget tilbud. Sammenligningen gjøres standpunkt for standpunkt,
> slik standpunktene står i brevet (MM-U11). Om et avvik er så lite at det likevel
> blir avtale (avtaleloven § 6 annet ledd), avgjør ikke appen (MM-U12).

Forhold: presiserer raden i B-13 om «godkjent» bare når hele kravet er godkjent,
KA-U9, KA-U21, KA-U24 og raden i B-13 om preklusjon. Et forbehold appen ikke kan
uttrykke, følger KA-U16 og KA-U26, der et svar med forbehold kan gi sammenfall. Presiserer GR-U7 («et
avslag» leses som avslag i forening med et betinget tilbud). Følger av HF-U5 (første
setning etter «fristforlengelse»).

### F3 Bortfall og akseptfrist

> Byggherrens svar faller bort som tilbud når TE sender en ny kravversjon i sporet,
> også med uendrede verdier. Den nye kravversjonen er TEs avslag på svaret og et nytt
> tilbud (avtaleloven § 5 og § 6). I et spor uten enighet, og når kravene i saken
> ikke er avgjort, venter sporet da på nytt svar (KA-U7, OV-U3). Et svar på en
> tidligere kravversjon kan ikke godtas. Har byggherren satt en akseptfrist i svaret,
> faller svaret bort når fristen er ute (avtaleloven § 2). En aksept etter fristen er
> et nytt tilbud fra TE (avtaleloven § 4). Om rimelig tid etter avtaleloven § 3 er ute,
> avgjør ikke appen (MM-U12). Et uttrykkelig standpunkt om at et varsel kom i tide,
> eller et avkall, faller ikke bort med svaret (HF-U4, VS-U20, F5).

Forhold: presiserer SK-02 og SK-03, KA-U1 og vedtaket 05.10 om at hver oppdatering
er en ny kravversjon. Snevrer inn GR-U1 og raden i B-13 om endret underkategori,
fordi et «i tide» ikke faller bort med svaret. KA-U7 og OV-U3 står som grensene. Følger
av HF-U5 (bindingens varighet).

### F4 Enighet

> Partene er enige om et standpunkt når TE har godtatt byggherrens svar slik det står
> i brevet, eller når byggherrens svar stemmer med kravet (avtaleloven § 1 første
> ledd og § 2). Godtar TE et svar som avviker fra kravet, er partene enige om svarets
> beløp eller dager. Godtar TE et avslag eller en påberopelse av preklusjon, er
> partene enige om at kravet ikke fører fram etter det svaret sier. Innholdet i
> enigheten er det svaret og kravet hadde da den ble inngått, og en senere endring av
> appens regler endrer det ikke. Utfallet av saken utledes fortsatt med gjeldende
> regler (MM-U11, MM-U16). Ingen part kan gå fra enigheten alene, men TE kan gi avkall
> på sitt eget krav (F5). En ny kravversjon eller en revisjon i et spor med enighet
> avvises, og et nytt krav om samme forhold går i en ny sak. Et første krav i et spor
> der TE ikke har sendt et krav, går i samme sak (OV-U3). Et brev som viser til en ny
> avtale mellom partene, følger KA-U16, MM-U18 og MM-U19.

Forhold: opphever KA-U3 og KA-U5. Presiserer KA-U6, KA-U7, KA-U10, KA-U11, KA-U14,
GR-U2, GR-U8, GR-U10, SK-01, MM-U3, MM-U11, MM-U16, MM-U18, MM-U19 og OV-U3. Snevrer inn EO-U5 og EO-U2 hvis spørsmål 3 besvares med A.

### F5 Avkall

> En part kan alene gi avkall på sitt eget krav eller sin egen rett. TE gjør det ved å
> trekke et krav, ved å svare «ingen krav» eller ved å godta et avslag. Byggherren
> gjør det ved uttrykkelig å gi opp en innsigelse. Avkallet binder parten fra det er
> kommet fram (avtaleloven § 7) og rekker så langt brevet sier. Det rører ikke
> motpartens rettigheter etter en enighet eller en endringsordre (NS 8407 § 31.3
> annet ledd). Kan appen ikke gjennomføre avkallet uten å røre slike rettigheter,
> avvises det. Det avvises også der et vedtak sperrer det: når kravene er avgjort
> (OV-U3), etter et godtatt avslag av grunnlaget (SK-01, KA-U13) og mens en
> forseringssak viser til avslaget (FO-U5). Om et senere krav er avskåret, avgjør ikke appen (MM-U12).

Forhold: presiserer KA-U6, KA-U12, KA-U13, KA-U14, KA-U17, KA-U22, KA-U25, KA-U27,
GR-U5, VS-U11, VS-U20 og vedtaket 05.10 om at et trukket krav ikke kan tas opp
igjen. Følger av HF-U4 («uttrykkelig gitt opp sin innsigelse»). OV-U3, KA-U11, SK-01
og FO-U5 står som sperrene.

### F6 Innsigelse og taushet etter NS 8407

> En påberopelse av at motparten har varslet, krevd eller svart for sent etter NS 8407
> § 5 tredje ledd, eller av virkningen av taushet etter de særlige reglene i
> kontrakten (blant annet § 32.3 annet ledd, § 33.7 og § 34.3.3), er et utsagn fra
> parten. Appen registrerer det med sendetid og viser hvilken bestemmelse det
> gjelder, og utleder virkningen på partens premisser der VS-U3 sier det. Appen trekker ikke selv slutningen om at en frist er oversittet, at en
> innsigelse kom i tide, eller at taushet har gitt virkning (MM-U12). Taushet er ikke
> et uttrykkelig standpunkt og binder ikke som et slikt (HF-U4).

Forhold: presiserer VS-U1, VS-U2, VS-U10, VS-U12, VS-U14, VS-U17 og raden i B-13 om
passivitet. VS-U3 står som rammen for behandlingen.

### F7 Endringsordren

> En endringsordre etter NS 8407 § 31.3 er byggherrens pålegg. Når den oppfyller
> § 31.3 første ledd (GR-U13), binder den TE fra den er mottatt (§ 31.3 annet ledd),
> uten aksept, og den er ikke et tilbud. Er TE uenig, føres uenigheten i en ny KOE-sak.
> Er et utsagn i endringsordren om vederlag eller fristforlengelse byggherrens
> standpunkt eller et tilbud (EO-U8), er det et løfte: svarer utsagnet på en
> kravversjon i en KOE-sak, gjelder HF-U5 for det, ellers binder det byggherren som et
> tilbud (F1). En gjengivelse av noe partene har avtalt, følger F4.

Forhold: presiserer EO-U1, EO-U3, EO-U4, EO-U8, EO-U9, GR-U13, TFR-02 og KA-U13. Siste setning avhenger
av spørsmål 2.

### F8 Det meddelte og appens vurdering

> Det en part har meddelt skriftlig etter NS 8407 § 5, binder slik det sto da det
> ble sendt. Det som ikke står i teksten, er ikke meddelt (LV-U3). Appens vurdering
> av utsagnene binder ingen av partene. Vurderingen som er frosset i et sendt brev,
> står (MM-U9), mens appens utledning av utfallet på tvers av brev kan endres med nye
> regler (MM-U11, MM-U16). Et brev sendt utenfor appen kan ha full virkning etter
> kontrakten, men appen utleder ingen virkning av et registrert brev (OV-U4), unntatt
> etter OV-U5 og OV-U6, og visningen påstår ikke mer enn appen vet. Et varsel er et eget utsagn med datoen det
> ble sendt, og datoen settes én gang.

Forhold: presiserer MM-U1, MM-U12, MM-U16, MM-U17, LV-U3, OV-U4, OV-U8, OV-U10,
VS-U8 og SK-12. OV-U5 og OV-U6 står som unntakene.

## Vedtak som kan oppheves eller presiseres

Henvisningene i koden er telt med `grep -rwi` på ID-en i `kjerne/`, `server/` og
`src/` på commit `89365b3`.

| Vedtak | Forhold | Av | Henvisninger i `kjerne/`, `server/`, `src/` |
| --- | --- | --- | --- |
| KA-U3 | opphever | F4 | 0, 0, 0 |
| KA-U5 | opphever | F4 | 0, 0, 0 |
| SK-02 og SK-03 | presiserer | F3, F4 | ikke telt (presisering) |
| B-13, «godkjent» bare når hele kravet er godkjent | presiserer | F2 | – |
| GR-U2, GR-U10, SK-01, MM-U3 | presiserer | F4 | – |

De to opphevelsene har ingen henvisninger i koden, så flyttingen av henvisningene er
tom for dem. En presisering krever ingen flytting. Vedtakene som får P i tabellene,
står som produktvalg; F1–F8 presiserer dem i begrunnelsen, ikke i innholdet.

## Vedtak som strider mot prinsippene

| Vedtak | Strider mot | Hvordan | Løsning |
| --- | --- | --- | --- |
| EO-U5 (og EO-U2) | F2, F4 | Et delvis godkjent svar regnes som enighet før TE har godtatt det. | Spørsmål 3 |
| GR-U9 (og MM-U19, KA-U11) | F1 | Frafallet inneholder et løfte om endringsordre for utført arbeid, men kan revideres fritt. | Spørsmål 4 |
| Raden i B-13 om frafall bare ved irregulær endring og valgrett | GR-U11 | To vedtak sier ulikt om hvor § 32.3 c gjelder. Ikke en konflikt med et prinsipp. | Spørsmål 6 |

**Alt løst, ingen handling trengs:** MM-U8 og VS-U7 (endret av OV-U5), GR-U7, OV-U5, VS-U9 og MM-U9 (snevret inn av
HF-U4 og HF-U5), MM-U4, MM-U5 og MM-U6 (opphevet av MM-U9), GR-U5 (snevret inn av
KA-U13, KA-U14 og KA-U22) og setningen i SK-03 om at aksepten faller (rettet av
KA-U7).

## Spørsmålene samlet

Svar «ja» gir tilslutning til alle anbefalingene, med rettelser per punkt.

**Merknad 15.10:** Oppdragsgiver svarte «Ja til alle anbefalingene» (#504). Vedtakene
er ført (se «Forslag til prinsippvedtak»).

1. **Prinsippvedtakene.** Kan F1–F8 føres som prinsippvedtak med forholdene som står
   under hvert forslag? *Anbefaling: ja.*
2. **Utsagnene i en endringsordre (F7, EO-U8).** Er byggherrens utsagn om vederlag og
   fristforlengelse i en endringsordre svar etter HF-U5 når de svarer på en
   kravversjon, og ellers tilbud som binder byggherren?
   A: ja, som i F7. B: nei, endringsordren følger bare EO-U4.
   *Anbefaling: A.* Det følger av at krav og svar er tilbud og løfter (HF-U5).
3. **EO-U5.** Skal «byggherren har godkjent kravet delvis» snevres inn til et delvis
   godkjent svar som TE har godtatt?
   A: ja (avtl. § 6, KA-U1, KA-U5). B: nei, byggherrens binding etter HF-U5 er nok.
   *Anbefaling: A.* B gjør et ensidig løfte til enighet i en endringsordre.
4. **Frafall etter § 32.3 c (GR-U9, KA-U32, MM-U19, KA-U11, detalj 1 i HF-U5).**
   Binder løftet om endringsordre for utført arbeid byggherren?
   A: som i dag. Frafallet kan revideres fritt, og TE kan ikke godta det.
   B: frafallet er avslag med nytt tilbud. TE kan godta det, og det kan ikke
   revideres til ugunst for TE.
   C: TE kan fortsatt ikke godta frafallet, men byggherren er bundet av løftet. En
   revisjon til avslag eller til påberopelse etter § 32.2 avvises, mens en revisjon
   til endringsordre er tillatt. Når kravene er avgjort, går KA-U11 foran.
   *Anbefaling: C.* Den følger av F1 og endrer GR-U9 minst. C snevrer inn GR-U9 og
   detalj 1 i HF-U5.
5. **Subsidiære standpunkter (GR-U7, raden i B-13 om frist uten
   fremdriftshindring).** Er et subsidiært standpunkt, også de videre subsidiære
   dagene, et betinget tilbud som binder byggherren etter HF-U5?
   A: ja, standpunkt for standpunkt (F2). B: bare de prinsipale og subsidiære dagene.
   *Anbefaling: A.* HF-U5 sammenlikner standpunkt for standpunkt, og dagene er etter
   § 33.7 annet ledd byggherrens innsigelse mot omfanget.
6. **Hvor frafall er tillatt (B-13 24.09 mot GR-U11).**
   A: i alle underkategoriene GR-U11 nevner.
   B: der pålegget er byggherrens eget (irregulær endring, valgrett, samordning og
   svar på varsel), ikke der endringen kommer av offentlig myndighet eller gebyr.
   C: B-13 står, og GR-U11 presiseres.
   *Anbefaling: B.* Byggherren kan bare frafalle et pålegg byggherren selv råder over.
   Dette er en tolkning av § 32.3 c og ikke en følge av avtaleloven.
7. **Forsering og bindingen (FO-U1, HF-U5).** Gjør TEs valg om å forsere for de
   avslåtte dagene slutt på at byggherren er bundet av de dagene hen har godkjent?
   A: nei. § 33.8 forutsetter at svaret står, og NS 8407 går foran (avtl. § 1).
   B: ja, valget er et avslag etter avtl. § 5.
   *Anbefaling: A.*
8. **Når et brev fra appen er kommet fram (LV-U1, HF-U4, HF-U5).** Det avgjør når
   bindingen inntrer og når en akseptfrist løper ut.
   A: når brevet er sendt og tilgjengelig for motparten i appen, slik spørsmålet i
   HF-U4 la til grunn.
   B: når Catenda har kvittert for leveringen.
   C: appen regner fra sendingen og viser leveringskvitteringen ved siden av, uten å
   avgjøre spørsmålet (MM-U12).
   *Anbefaling: C.* Den gir samme utregning som A, uten at appen avgjør om appen er
   en avtalt adresse etter § 5 første ledd.
9. **Forholdene til HF-U4.** HF-U4 avviser en senere påberopelse, også en innsigelse
    etter VS-U1. Skal «snevrer inn VS-U1» føres i forholdene, slik OV-U5 ble lagt
    til? *Anbefaling: ja.*
10. **Ordlyden som bærer HF-U4 (LV-U4 punkt 5).** Er «byggherren gjør ikke gjeldende
    at … kom for sent» et uttrykkelig «i tide» etter HF-U4?
    A: ja, teksten står. B: ny tekst for nye brev. *Anbefaling: A.* B gir to tekster
    med samme virkning.
11. **TEs eget krav før byggherren har svart.** Etter avtl. § 7 kan en tidligere,
    lavere kravversjon fortsatt binde TE når TE hever kravet før svaret.
    A: byggherren svarer bare på gjeldende kravversjon, og appen avgjør ikke om den
    tidligere binder TE (MM-U12).
    B: byggherren kan godta en tidligere kravversjon innen rimelig tid.
    C: en hevet kravversjon avvises før byggherren har svart.
    *Anbefaling: A.* B gjør logikken vesentlig mer innviklet, og C stenger for vanlig
    spesifisering etter § 33.6.1 og § 34.

## Verifikasjon og grenser

**Lest:** vedtaksregisteret på `89365b3`, alle 209 poster, fordelt på åtte
subagenter. NS 8407 og avtaleloven §§ 1–7 med kommentar fra `khjohns/kontrakt`.
Vedtaksteksten er lest i egen kontekst for KA-U1, KA-U3, KA-U5, GR-U2, GR-U9, SK-01,
MM-U8, VS-U1, EO-U5 og raden i B-13 om «godkjent».

**Kjørt:** tellingen av henvisninger med `grep -rwi` i `kjerne/`, `server/` og
`src/`. `python3 docs/verktoy/vedtakshenvisninger.py` og
`python3 docs/verktoy/lenkekontroll.py` på dette dokumentet.

**Ikke kontrollert:**

- Hjemmel og utfall for postene med S og P er subagentenes vurdering og er ikke lest
  i egen kontekst. De tekniske radene er gruppert.
- Kontrollen av forslagene mot 3.1 er gjort én gang. Rettelsene etter den er
  innarbeidet i F1–F8, og spørsmålet om MM-U8 og VS-U7 er tatt ut fordi OV-U5 alt har
  avgjort det. Rettelsene er ikke prøvd på nytt.
- Avtaleloven kapittel 3 er ikke brukt, etter oppdragsgivers avgjørelse.
- Byggestatus er ikke vurdert. Gjennomgangen gjelder vedtakenes innhold.
