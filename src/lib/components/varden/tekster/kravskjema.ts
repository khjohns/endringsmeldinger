import { opplistet } from '#kjerne/frosset/brevdeler.ts';
import { KORRESPONDANSETYPEN, kroner } from '#kjerne/frosset/tekst.ts';
import type { Korrespondansetype } from '#kjerne/typer.ts';
import type { Brevref } from '../lesing';
import { BREVSTEG, brevref, brevrefStor } from './felles';
import { dato, kortDato, punkt, haerdet } from './format';

/**
 * TEs krav om vederlagsjustering (BF-14, prototype v4, økt 3 i #1663). Ordene følger språkfila:
 * «vederlagsjustering» og «særskilt vederlagsjustering», partene fullt ut, «brev» og ikke
 * «versjon», og et trekk kalles ikke avkall (KA-U75, D-18).
 */
export const KRAVSKJEMA = haerdet({
  forholdet: (navn: string, b: Brevref) =>
    `Forholdet: ${navn}, påberopt i ${brevref(b)} · ${kortDato(b.registrert)}`,
  paaberoptI: (b: Brevref) => `Forholdet er påberopt i ${brevref(b)}`,
  folgerOpp: (krav: Brevref, svar: Brevref | null) =>
    `Oppdaterer kravet i ${brevref(krav)}.${svar ? ` Byggherren svarte i ${brevref(svar)}. Når du sender brevet, kan du ikke godta det svaret her. Har byggherren gitt et tilbud? Skriv i begrunnelsen om du godtar tilbudet, avslår det eller tar forbehold.` : ''}`,
  /** Den nye påberopelsen: påminnelsen om tilbudet gjelder kravene (MM-U34 punkt 1). */
  folgerOppPaaberopelsen: (paaberopelse: Brevref, svar: Brevref | null) =>
    `Oppdaterer påberopelsen i ${brevref(paaberopelse)}.${svar ? ` Byggherren svarte i ${brevref(svar)}.` : ''}`,
  // 1. Vederlagsjusteringen.
  postene: 'Vederlagsjustering',
  posteneHjemmel: ['34.1.1', '34.1.2'],
  posteneIntro:
    'Del kravet i kravposter. Kravpostene får betegnelser som P1 og P2. Betegnelsene står også i nye brev og i endringsordren. Beløpene er eks. mva.',
  kolonner: ['Post', 'Oppgjørsform', 'PNS', 'Beløp'],
  nyPost: 'Ny kravpost',
  // Kjernen gir betegnelsen når kravet sendes (KA-U53).
  nyBetegnelse: 'Ny',
  beskrivelse: 'Beskrivelse av posten',
  beskrivelseHjelp: 'Står i brevet og i endringsordren.',
  form: 'Oppgjørsform',
  former: [
    {
      verdi: 'tilbud' as const,
      tekst: 'Fast sum',
      forklaring:
        'Beløpet du krever, er et tilbud etter punkt 34.2.1, som byggherren kan akseptere.',
    },
    {
      verdi: 'enhetspriser' as const,
      tekst: 'Enhetspriser',
      forklaring:
        'Oppgjør etter utførte mengder med kontraktens eller justerte enhetspriser (punkt 34.3). Posten har ikke et krevd beløp.',
    },
    {
      verdi: 'regningsarbeid' as const,
      tekst: 'Regningsarbeid',
      forklaring:
        'Kostnader og påslag etter punkt 30. Skal varsles før arbeidet settes i gang (punkt 34.4). Posten har ikke et krevd beløp.',
    },
  ],
  formnavn: { tilbud: 'Fast sum', enhetspriser: 'Enhetspriser', regningsarbeid: 'Regningsarbeid' },
  beloep: 'Beløpet du krever',
  beloepHjelp: 'Eks. mva.',
  justert: 'Enhetsprisene',
  justeringer: [
    { verdi: false, tekst: 'Kontraktens enhetspriser' },
    { verdi: true, tekst: 'Justerte enhetspriser (punkt 34.3.2)' },
  ],
  anslag: 'Anslag',
  anslagHjelp: 'En opplysning, ikke et tilbud.',
  overslag: 'Kostnadsoverslag',
  overslagHjelp:
    'En opplysning, ikke et tilbud (punkt 30.2). Ser det ut til å bli overskredet, skal du varsle byggherren.',
  pns: 'PNS',
  pnsHjelp: 'Byggherren kan velge en annen PNS-kode i endringsordren.',
  varsellinje: (hjemmel: string, tekst: string) => `Varsel etter ${punkt(hjemmel)}: ${tekst}`,
  tilVarslene: 'Se under Varslene',
  ferdig: 'Ferdig',
  endre: 'Endre',
  endrePost: (post: string) => `Endre ${post}`,
  fjernNy: 'Fjern posten',
  trekk: (post: string) => `Trekk ${post}`,
  trekkes: 'Trekkes',
  trekket: (post: string) =>
    `Kravet i ${post} trekkes i dette brevet. Brevet sier det. Du kan angre før du sender.`,
  angre: 'Angre',
  angreTrekk: (post: string) => `Angre trekket av ${post}`,
  utenBeloep: 'Uten beløp',
  anslaatt: (b: string) => `anslag ${b}`,
  overslaget: (b: string) => `overslag ${b}`,
  justerte: 'justerte',
  endretFra: (brev: Brevref, foer: string, naa: string) =>
    `Endret fra ${brevref(brev)}: ${foer} → ${naa}`,
  ny: 'Ny post i dette brevet',
  sumFaste: 'Sum faste beløp i kravpostene',
  leggTil: 'Legg til kravpost',
  taMedIgjen: (post: string, beskrivelse: string) => `Ta med igjen ${post} ${beskrivelse}`,
  // 2. Den særskilte vederlagsjusteringen (OV-U89, OV-U115 punkt 3).
  saerskilt: 'Særskilt vederlagsjustering',
  saerskiltKort: 'Særskilt',
  saerskiltHjemmel: ['34.1.3 annet ledd'],
  saerskiltIntro:
    'Økte utgifter på grunn av nedsatt produktivitet eller forstyrrelser på annet arbeid.',
  saerskiltBeloep: 'Beløpet du krever',
  saerskiltHjelp: 'Fast sum, eks. mva.',
  leggTilSaerskilt: 'Legg til særskilt vederlagsjustering',
  fjernSaerskilt: 'Fjern den særskilte vederlagsjusteringen',
  trekkSaerskilt: 'Trekk den særskilte vederlagsjusteringen',
  saerskiltEneste:
    'Den særskilte vederlagsjusteringen er den eneste posten i kravet. Vil du ikke lenger kreve den, trekker du kravet på siden for vederlaget.',
  // 3. Varslene (prototype v4).
  varslene: 'Varslene',
  varsleneIntro:
    'Varslene kravet trenger, ut fra postene over. Har du ikke varslet før, gis varselet i dette brevet.',
  varselkolonner: ['Punkt', 'Varselet', 'Slik står det i brevet'],
  // OV-U80: et krav lagt til har ingen brevtekst, så varselet står i dokumentet.
  varsleneIntroLagtTil:
    'Varslene kravet trenger, ut fra postene over. Har du ikke varslet før, er varselet gitt i dokumentet du legger til.',
  varselkolonnerLagtTil: ['Punkt', 'Varselet', 'Slik står det i dokumentet'],
  varselnavn: {
    '34.1.2': 'Varsel om vederlagsjustering',
    '34.1.3': 'Varsel om særskilt vederlagsjustering',
    '34.3.3': 'Varsel om justering av enhetsprisene',
    '34.4': 'Varsel før regningsarbeidet settes i gang',
  } as Record<string, string>,
  gjelderHele: 'Gjelder hele kravet',
  gjelderSaerskilt: 'Gjelder den særskilte posten',
  gjelderPost: (post: string) => `Gjelder ${post}`,
  ingenPostViserTil: 'Ingen kravpost viser til det',
  gisIBrevet: 'Gis i dette brevet.',
  // Typen som i omtalen etter LV-U42 (arbeidsvalget 1 A 16.11 i #807).
  gittIDokumentet: (type: Korrespondansetype | null, d: string) =>
    `Gitt i ${KORRESPONDANSETYPEN[type ?? 'brev'].bestemt} av ${dato(d)}, som legges ved kravet.`,
  sammeDokument: (d: string) =>
    d ? `Dokumentet av ${dato(d)} legges ved én gang.` : 'Dokumentet legges ved én gang.',
  denSaerskilte: 'den særskilte vederlagsjusteringen',
  gittI: (b: Brevref) => `Gitt i ${brevref(b)}.`,
  gittMedKravet: (b: Brevref) => `Gitt med kravet i ${brevref(b)}.`,
  dagerEtterKlarOver: (dager: number, d: string) =>
    `${dager} kalenderdager etter at du ble klar over forholdet ${dato(d)}`,
  utenKravpost: (hjemmel: string) =>
    `Saken har et varsel etter ${punkt(hjemmel)} som ingen kravpost viser til.`,
  seVarselet: (post: string) => `Se på varselet for ${post}`,
  endreVarselet: (post: string) => `Endre varselet for ${post}`,
  gittFoer: (post: string) => `Varselet for ${post} er gitt før`,
  hvorGitt: (post: string) => `Hvor ble varselet for ${post} gitt?`,
  varselvalg: {
    kravet: 'I dette brevet',
    saken: 'I et varsel som står i saken',
    dokument: 'I et brev, en e-post eller et referat',
    samme: (post: string) => `Samme dokument som for ${post}`,
  },
  hvilketVarsel: 'Varselet i saken',
  varseletI: (b: Brevref) => (b.nummer === null && b.omtale ? b.omtale : brevrefStor(b)),
  ingenVarslerISaken: (hjemmel: string) =>
    `Saken har ikke noe varsel etter ${punkt(hjemmel)}. Legg til dokumentet i stedet.`,
  // 4. Forbeholdet, i kravets eget felt (LV-U74).
  forbeholdHjelp: 'Står i brevet under kravet.',
  // Det som mangler, med feltet (MM-U32, språkfila: «<Verb> <feltet>.»).
  mangler: 'Dette mangler før brevet kan lages:',
  iPosten: (post: string, tekst: string) => `${post}: ${tekst}`,
  iSaerskilt: (tekst: string) => `Særskilt vederlagsjustering: ${tekst}`,
  ingenPoster: 'Legg til en kravpost eller den særskilte vederlagsjusteringen.',
  manglerBeskrivelse: 'Beskriv posten.',
  manglerForm: 'Velg oppgjørsformen.',
  manglerBeloep: 'Skriv beløpet.',
  manglerJustert: 'Velg kontraktens eller justerte enhetspriser.',
  merEnnNull: 'Beløpet må være mer enn 0 kr.',
  manglerVarselet: 'Velg varselet i saken.',
  manglerSamme: 'Legg til dokumentet i den andre posten, eller velg et annet svar.',
  // Panelet til høyre (U-15, U-16).
  punktene: BREVSTEG.punktene,
  punkteneHjelp: 'Beløp eks. mva. Oppdateres mens du skriver.',
  antallPoster: (n: number) => (n === 1 ? '1 kravpost' : `${n} kravposter`),
  antallVarsler: (n: number, iBrevet: number, lagtTil = false) =>
    `${n === 1 ? '1 varsel' : `${n} varsler`} · ${iBrevet} ${lagtTil ? 'gitt i dokumentet' : 'gis i dette brevet'}`,
  skrevet: 'Skrevet',
  ikkeSkrevet: 'Ikke skrevet',
  forbeholdPunkt: 'Forbehold',
  fasteBeloep: 'Faste beløp',
  anslagIkkeKrevd: 'Anslag og overslag, ikke krevd',
  fordelingPns: 'Fordeling på PNS',
  pnsRad: (faste: number, anslag: number) =>
    anslag ? `${kroner(faste)} + ${kroner(anslag)} anslått` : kroner(faste),
  // U-3: veiledningen etter Del II punkt 184 stopper ikke kravet.
  pnsOver: (pns: string[], grense: number) =>
    `${pns.length === 1 ? `PNS ${pns[0]} har` : `PNS ${pns.join(' og ')} har hver`} over ${kroner(grense)}. Ved fakturering etter endringsordren skal endringen da fordeles på PNS-kodene (Del II punkt 184). Byggherren kan velge en annen PNS-kode i endringsordren.`,
  tilbudet: (poster: string[]) =>
    `Kravet for ${opplistet(poster)} er et tilbud etter punkt 34.2.1. Byggherren kan akseptere det.`,
  regelen: (poster: string[]) =>
    `${opplistet(poster)} gjøres opp etter en beregningsregel og har ikke et krevd beløp.`,
  trekkesListe: (poster: string[]) => `${opplistet(poster)} trekkes.`,
  // Tidslinja (U-17).
  tidslinjeVarselet: (post: string) => `Varselet for ${post}`,
  oppgisIKravet: 'Oppgis i kravet',
  tidslinjeSendes: 'Kravet sendes',
  naarDuSender: 'I dag, når du sender',
  // Brevkontrollen og kvitteringen.
  forrigeKravet: (krav: Brevref) => `Kravet i ${brevref(krav)}`,
  seBrevet: 'Se brevet før sending',
  sendTekst: 'Send til byggherren',
  tilbakeTil: 'utkastet',
  kvittering: 'Brevet er sendt til byggherren.',
  kanIkkeLages: 'Brevet kan ikke lages ennå.',
  forkastTekst:
    'Kravpostene og forbeholdet du har skrevet i utkastet, slettes. Det kan ikke gjøres om.',
});
