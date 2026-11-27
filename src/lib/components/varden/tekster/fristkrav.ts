import { liste, stor } from '#kjerne/frosset/brevdeler.ts';
import { dager } from '#kjerne/frosset/tekst.ts';
import type { Brevref } from '../lesing';
import { BREVSTEG, brevref } from './felles';
import { dato, haerdet } from './format';

/** TEs krav om fristforlengelse (G-3 i BF-20, prototypen `fristkrav-te.html#nytt-krav`). */
const DAGMULKT = 'dagmulkt';

/** Første bokstav liten, ikke i en forkortelse som «PBE». */
export const liten = (t: string) =>
  t.length > 1 && t[1] === t[1]!.toUpperCase() ? t : t.charAt(0).toLowerCase() + t.slice(1);

export const FRISTKRAV = haerdet({
  titler: {
    krav: 'Krav om fristforlengelse',
    varsel: 'Varsel om fristforlengelse etter punkt 33.4',
    svar: 'Svar på byggherrens forespørsel etter punkt 33.6.2',
  },
  nyVersjon: (krav: Brevref) => `Oppdaterer kravet i ${brevref(krav)}`,
  // 1. Varselet.
  varselTittel: 'Varselet om fristforlengelse',
  varselHjelp:
    'Varselet skal gis uten ugrunnet opphold etter at du ble eller burde ha blitt klar over forholdet, også før du kan angi antall dager. Varsles det for sent, tapes kravet. Varselet gjelder hele kravet, med alle fristene.',
  kravetErVarselet: 'Gis i dette brevet.',
  /** Med kalenderdagene etter datoen TE oppgir at TE ble klar over forholdet, som i prototypen. */
  varseletSendt: (b: Brevref & { sendt: string | null }, etter: number | null) =>
    `Varselet ble sendt ${dato(b.sendt ?? b.registrert)} i ${brevref(b)}.${etter === null ? '' : ` Det var ${etter} kalenderdager etter at du ble klar over forholdet.`}`,
  // U-13: varselet alene, uten dager (VS-U15).
  kravMedDager: 'Du krever et antall dager for hver frist.',
  varsleSenere: 'Varsle nå, og krev dagene senere',
  bareVarsel: 'Du varsler om fristforlengelse uten å kreve et antall dager nå.',
  krevDager: 'Krev et antall dager for hver frist',
  hvaHjelp:
    'Du skal varsle uten ugrunnet opphold, også før du kan angi antall dager (punkt 33.4). Har du ikke varslet før, gis varselet i dette brevet.',
  varselAleneHjelp:
    'Varsles det for sent, tapes kravet på fristforlengelse. Når du har grunnlag for å beregne omfanget, skal du uten ugrunnet opphold angi og begrunne antall dager (punkt 33.6.1).',
  hvordanVarsler: 'Hvordan varsler du?',
  varselmaate: {
    send: 'Send varselet nå',
    registrer: 'Legg til et varsel du har sendt før',
  },
  registrer: 'Registrer varselet',
  registrert: 'Varselet er registrert.',
  // U-6: varselet gitt før, utenfor løsningen (OV-U5, VS-U16).
  gittFoer: 'Varselet er gitt før',
  gittFoerHjelp: 'Brevet sier når varselet ble gitt. Dokumentet du varslet i, legges ved.',
  likevel: 'Gi varselet i dette brevet',
  // Datoen TE ble klar over forholdet, fra påberopelsen eller korrigeringen (`klarOverForholdet`).
  klarOver: 'Når ble du klar over forholdet?',
  oppgittI: (b: Brevref) => `Oppgitt i ${brevref(b)}.`,
  dagerTilIDag: (d: string, n: number) =>
    `Du oppgir at du ble klar over forholdet ${dato(d)}. Sendes varselet i dag, er det ${n} kalenderdager etter.`,
  dagerTilVarselet: (d: string, varslet: string, n: number) =>
    `Du oppgir at du ble klar over forholdet ${dato(d)}. Varselet ble gitt ${dato(varslet)}, ${n} kalenderdager etter.`,
  // U-11: svaret på forespørselen etter punkt 33.6.2 (VS-U17, VS-U19).
  // #2485: dagene regnes fra datoen brevet ble sendt, og et brev lagt til har også datoen det ble
  // lagt til (designdelen i VS-U97). Løsningen sier ikke når brevet kom fram (LV-U86 punkt 1).
  foresporsel: (b: Brevref, sendt: string, dagerSiden: number, lagtTil: string | null) =>
    `Byggherren ber deg angi og begrunne antall dager (${brevref(b)}, sendt ${dato(sendt)}, ${dagerSiden <= 0 ? 'i dag' : `for ${dagerSiden} ${dagerSiden === 1 ? 'dag' : 'dager'} siden`}${lagtTil ? `, lagt til ${dato(lagtTil)}` : ''}). Svarer du ikke uten ugrunnet opphold, tapes kravet på fristforlengelse (punkt 33.6.2 tredje ledd).`,
  hvordanSvarer: 'Hvordan svarer du?',
  bokstavValg: [
    { verdi: 'a' as const, tekst: 'Angi og begrunne dagene (bokstav a)' },
    { verdi: 'b' as const, tekst: 'Begrunne hvorfor du ennå ikke kan beregne dagene (bokstav b)' },
  ],
  grunnBTittel: 'Hvorfor du ennå ikke kan beregne dagene',
  grunnBHjelp:
    'Når du kan beregne dagene, skal du uten ugrunnet opphold angi og begrunne dem. Da gjelder punkt 33.6.1 for kravet (punkt 33.6.2 femte ledd).',
  /** Linja i panelet og «Dette sender du» for varselet alene og svaret etter bokstav b. */
  dette: {
    varsel: 'Varselet etter punkt 33.4. Antall dager er ikke oppgitt.',
    svar: 'Begrunnelse etter punkt 33.6.2 annet ledd b',
  },
  virkningB:
    'Svaret er en begrunnelse etter punkt 33.6.2 annet ledd b. For kravet du sender senere, gjelder punkt 33.6.1 (punkt 33.6.2 femte ledd).',
  virkningVarsel: (n: number | null) =>
    n === null
      ? 'Varselet etter punkt 33.4 sendes i dag. Varsles det for sent, tapes kravet.'
      : `Varselet etter punkt 33.4 sendes i dag, ${n} kalenderdager etter at du ble klar over forholdet. Varsles det for sent, tapes kravet.`,
  // 2. Fristene.
  fristerTittel: 'Fristforlengelse',
  fristerHjelp:
    'Angi antall dager for hver frist kravet gjelder. Fristene står i kontrakten (Del II punkt E.1). Dagene gjelder hver frist for seg og legges ikke sammen. Dagene er kalenderdager (punkt 1.2).',
  delAvArbeidene:
    'Gjelder forlengelsen bare deler av arbeidene, beskriv det i begrunnelsen. Andelen av rigg og drift oppgis i posten for rigg og drift i vederlagskravet (Del II, tillegget til punkt 34.1.3).',
  fristEtikett: 'Fristen',
  ikkeRegistrert: 'En frist som ikke er registrert',
  // Hvorfor fristen ikke har ny dato, står ved den (`FRISTEN.ikkeRegistrert`, KA-U79).
  ikkeRegistrertHjelp: 'Skriv nummeret og navnet kontrakten gir den.',
  /** Cellen for ny dato i raden for en frist som ikke er registrert (KA-U79). */
  ikkeRegistrertKort: 'Ikke registrert',
  /** Cellen for ny dato når gjeldende frist ikke kan regnes (MM-U2). */
  kanIkkeRegnes: 'Kan ikke regnes nå',
  nummerEtikett: 'Nummer i kontrakten',
  navnEtikett: 'Navnet i kontrakten',
  dagerEtikett: 'Antall dager du krever',
  kalenderdager: 'Kalenderdager.',
  /** Raden før fristen er valgt, uten et tall som kan leses som nummeret i E.1 (U-1). */
  nyFrist: (n: number, av: number) => (av === 1 ? 'Ny frist' : `Ny frist ${n}`),
  nyIBrevet: 'Ny i dette brevet',
  trekkes: 'Trekkes',
  trekk: (navn: string) => `Trekk fristen ${navn}`,
  trekkTekst: 'Trekk fristen',
  // OV-U118: et krav lagt til, sendt før det siste kravet i saken.
  eldre: (forrige: Brevref | null, sendt: string) =>
    forrige
      ? `Fristene er hentet fra ${brevref(forrige)}, det siste kravet sendt før ${dato(sendt)}. Trekk en frist bare når dokumentet du legger til, sier at den er trukket.`
      : `Ingen krav var sendt før ${dato(sendt)}, så kravet har ingen frister å ta med eller trekke.`,
  angre: 'Angre',
  angreTrekk: (navn: string) => `Angre trekket av ${navn}`,
  fjern: 'Fjern',
  fjernFrist: (navn: string) => `Fjern ${navn}`,
  leggTil: 'Legg til frist',
  // Tabellen med fristene, én åpen rad om gangen (prototypen `#nytt-krav`).
  kolonner: ['Nr.', 'Frist', 'Gjeldende', 'Dager', 'Ny dato'],
  dagmulkt: DAGMULKT,
  dagmulktMerke: stor(DAGMULKT),
  endre: 'Endre',
  endreFrist: (navn: string) => `Endre ${navn}`,
  ferdig: 'Ferdig',
  dagerMangler: 'Ikke oppgitt',
  /** Etter forlengelsene i andre saker ved gjeldende frist (U-2, D-9, prototypen). */
  iTillegg:
    'Den nye datoen forutsetter at dagene du krever, kommer i tillegg til forlengelsen som er avtalt.',
  /** Forlengelsene i andre saker under navnet i raden (U-2, prototypen): «forlenget 10 dager i sak KOE-2». */
  forlengetI: (f: { dager: number; sak: string }[]) =>
    `forlenget ${liste(f.map((x) => `${dager(x.dager)} i sak ${x.sak}`))}`,
  /** I tidslinja når gjeldende frist ikke kan regnes (MM-U2). */
  nyDatoUkjent: 'ny dato kan ikke regnes nå',
  /** Ny dato ved dagene, regnet fra gjeldende frist (U-1, D-9). */
  nyDato: (d: string, dagmulkt: boolean) =>
    `Ny dato: ${dato(d)}.${dagmulkt ? ' Fristen er dagmulktbelagt.' : ''}`,
  fristvalg: (navn: string, d: string, dagmulkt: boolean) =>
    `${navn} · ${dato(d)}${dagmulkt ? ` · ${DAGMULKT}` : ''}`,
  trukketMerk: (navn: string) =>
    `Kravet om forlengelse av ${navn} trekkes i dette brevet. Brevet sier det uttrykkelig.`,
  /** Fristen omtalt i en setning: «frist 2 (overtakelse)». */
  omtale: (nummer: string | null, navn: string) =>
    nummer ? `frist ${nummer} (${liten(navn)})` : liten(navn),
  // U-4: snarveien for de senere fristene i kontrakten.
  snarvei: (d: string, senere: string[], kilde: string) =>
    `Krev også ${d} for ${liste(senere)}, som for ${kilde}`,
  // U-5: fristene i tidslinja, med datoen den nye datoen er regnet fra.
  krevd: (d: string, fra: string | null) => `krevd forlenget ${d}${fra ? ` fra ${dato(fra)}` : ''}`,
  trekkHjelp:
    'En frist du tar ut, trekkes uttrykkelig. Brevet sier det. Fristen kan tas med igjen i et senere brev.',
  // 3. Begrunnelsen.
  begrunnelseTittel: 'Begrunnelse',
  begrunnelseHjelp:
    'Kravet skal begrunnes. Fristforlengelsen skal svare til virkningen forholdet har hatt på fremdriften. Det tas blant annet hensyn til',
  hensyn: [
    'nødvendig avbrudd',
    'forskyvning av arbeidet til en ugunstigere eller gunstigere årstid',
    'den samlede virkningen av tidligere varslede forhold.',
  ],
  fremdriftsplan: 'Vis gjerne til fremdriftsplanen med kritisk linje (Del II punkt 172).',
  // Panelet.
  punktene: BREVSTEG.punktene,
  ingenFrister: 'Legg til en frist, så står dagene her.',
  linje: (navn: string, d: string) => `${navn}: ${d}`,
  ikkeOppgitt: 'dagene er ikke oppgitt',
  trukketLinje: (navn: string) => `${navn}: trekkes`,
  // Det som mangler.
  manglerFrist: 'Velg fristen kravet gjelder.',
  toGanger: 'Fristen står allerede i kravet. Velg en annen frist, eller fjern denne raden.',
  ingenFristtabell:
    'Fristtabellen for prosjektet kunne ikke hentes. Last saken på nytt for å velge en frist fra den.',
  manglerNavn: 'Skriv navnet kontrakten gir fristen.',
  manglerDager: 'Skriv et helt antall dager.',
  nullDager: 'Et krav på 0 dager er ikke et krav. Skriv dagene du krever.',
  manglerBegrunnelse: 'Skriv begrunnelsen for kravet.',
  manglerGrunnB: 'Skriv hvorfor du ennå ikke kan beregne dagene.',
  ingenFristerMangler: 'Kravet må gjelde minst én frist.',
  forkastTekst:
    'Fristene og begrunnelsen du har skrevet i utkastet, slettes. Det kan ikke gjøres om.',
  // «Når du sender» (U-9, U-10).
  virkningVarseletIBrevet:
    'Varselet etter punkt 33.4 gis i dette brevet. Varsles det for sent, tapes kravet på fristforlengelse.',
  /** MM-U34 punkt 1. */
  virkningNyttBrev: (svar: Brevref) =>
    `Når du sender brevet, kan du ikke godta svaret i ${brevref(svar)} her.`,
});
