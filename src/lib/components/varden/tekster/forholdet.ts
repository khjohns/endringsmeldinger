import { PARTEN, stor } from '#kjerne/frosset/brevdeler.ts';
import type { Subsidiaergrunn } from '#kjerne/regler/forhold.ts';
import type { Part, Spor, Standpunkt } from '#kjerne/typer.ts';
import type { Forholdsordene } from '#kjerne/spor/forhold/tekst.ts';
import type { Brevref, Datoopplysningen, Innlegget } from '../lesing';
import {
  I_FORHOLDET,
  iSvaretPaaForholdet,
  medLaget,
  radeneSomSies,
  setningene,
  standpunkttekst,
  utsagnet,
} from './standpunkt';
import { SAKSDELEN, brevref, brevrefStor } from './felles';
import { dato, haerdet } from './format';

/** Siden for forholdet (#1449, prototypen `grunnlagsoversikt.html`, OV-U76–OV-U78). */
/** Korrigeringen i en lukket sak (D-6 og U-6 i BF-02A; oppdragsgiver 06.11, #1646). */
const KORRIGERT_I_LUKKET =
  'Saken står lukket, og korrigeringen endrer ikke utfallet. Byggherren kan ta stilling til den nye datoen i et innlegg. Innlegg kan ikke sendes fra løsningen ennå.';

export const FORHOLDET = haerdet({
  utenNavn: 'Forholdet',
  registrertTittel: (part: Part) => `Korrespondanse fra ${PARTEN[part]}`,
  tilbake: 'Tilbake til forholdet',
  svarIkkeRegistrert: 'Svar ikke registrert.',
  trukket: (b: Brevref | null) =>
    b ? `Påberopelsen er trukket i ${brevref(b)}.` : 'Påberopelsen er trukket.',
  omKorrespondansen: 'Om korrespondansen',
  omKorrespondansenTekst:
    'Løsningen vurderer ikke innholdet i dokumentet, og avgjør ikke hvilken betydning det har for partenes rettigheter og plikter.',
  tilknyttede: 'Tilknyttede krav',
  tilknyttedeKilde: 'Kravene som bygger på forholdet',
  ingenKrav: 'Ingen krav om vederlagsjustering eller fristforlengelse ennå.',
  aapne: 'Åpne',
  /** Navnet på lenken for skjermleseren sier hvor den fører (språkfila), og begynner med «Åpne». */
  aapneNavn: (spor: Spor) => `Åpne ${SAKSDELEN[spor]}`,
  krevd: 'Krevd',
  byggherren: 'Byggherren',
  ikkeSvart: 'Svar ikke registrert',
  /** En frist byggherrens svar ikke har dager for (KA-U74). */
  ikkeISvaret: 'Ikke i svaret',
  /** Forholdet med standpunktene i svaret, med setningene i statuslinjen (#2040). */
  forholdsrot: (navn: string, svar: { rader: Innlegget['standpunkter']; brev: Brevref } | null) => {
    const s = svar ? setningene(svar.rader) : [];
    return svar && s.length
      ? `${navn} · ${brevrefStor(svar.brev)}: ${s.map((x, i) => (i ? stor(x) : x)).join('. ')}`
      : navn;
  },
  /** Hvorfor svaret er subsidiært til forholdet (vedtaket 05.10), som vilkår. */
  gjelderHvis: (grunner: Subsidiaergrunn[]) =>
    `Gjelder hvis ${[
      ...(grunner.includes('prekludert') ? ['varselet om forholdet kom i tide'] : []),
      ...(grunner.includes('avslaatt') ? ['forholdet gir grunnlag for kravet'] : []),
    ].join(' og ')}.`,
  blirSubsidiaert: (b: Brevref) =>
    `Et svar blir subsidiært så lenge byggherren står fast på ${brevref(b)}.`,
  trekk: 'Trekk påberopelsen',
  /**
   * Den nye versjonen av påberopelsen, før og etter byggherrens svar (oppdragsgiver 06.11, #1631,
   * og 07.11, PR 1650).
   */
  oppdater: 'Oppdater påberopelse',
  /**
   * Hvor saken står, under tittelen på oversikten (oppdragsgiver 06.11, PR 1650), med kontraktens
   * ord etter forholdet, som `standpunkt`.
   */
  utfall: (rader: Innlegget['standpunkter'], d: string): string => {
    const med = radeneSomSies(rader);
    const svarte = `Byggherren svarte ${dato(d)}`;
    // Den første linja står etter «svarte» når den ikke er subsidiær; ellers står hver linje for seg.
    const foerste = med[0];
    const iStarten = foerste && (foerste.lag === null || foerste.lag === 'prinsipalt');
    const setninger = med.map((r, i) => {
      const u = iSvaretPaaForholdet(r.standpunkt, null, r.ordene);
      if (i === 0 && iStarten) {
        if (!u) return `${svarte}. ${standpunkttekst(r.standpunkt, false)}.`;
        const eo = r.standpunkt.art === 'forhold' && u === I_FORHOLDET.endringsordre;
        return eo && med.length === 1
          ? `${svarte} med en endringsordre (punkt 32.3 første ledd a).`
          : `${svarte} og ${utsagnet(u)}.`;
      }
      if (!u) return `${standpunkttekst(r.standpunkt, false)}.`;
      return `${stor(medLaget(r.lag, u))}.`;
    });
    return iStarten ? setninger.join(' ') : [`${svarte}.`, ...setninger].join(' ');
  },
  venter: (d: string) => `Sendt til byggherren ${dato(d)}. Svar ikke registrert.`,
  /** BF-10 U-2: en annen hjemmel eller endringsordre går i en ny sak (GR-U22, OV-U57). */
  annen: 'Annen hjemmel eller endringsordre?',
  annenLenke: 'Opprett ny sak',
  nyFane: '(åpnes i ny fane)',
  /** BHs primærhandling i forholdet (oppdragsgiver 06.11, #1649). */
  svar: 'Svar på påberopelsen',
  svarNyVersjon: 'Svar på det nye brevet',
  // #2104.
  svaretUtenPaaberopelse: (lagtTil: boolean) =>
    `Totalentreprenøren har trukket påberopelsen, så svaret kan ikke ${lagtTil ? 'legges til' : 'sendes'}. Utkastet står til du forkaster det.`,
  forkastSvaret: 'Det du har fylt ut i svaret, slettes. Det kan ikke gjøres om.',
  handlinger: 'Det du kan gjøre nå',
  beskrivelse: (paalegg: boolean) => `Beskrivelse av ${paalegg ? 'pålegget' : 'forholdet'}`,
  begrunnelsen: 'Begrunnelsen',
  forklaringen: 'Forklaringen',
  oppgitt: (hva: 'paalegg_mottatt' | 'klar_over_forholdet', d: string, part: Part) =>
    `${hva === 'paalegg_mottatt' ? 'Pålegget mottatt' : 'Klar over forholdet'} ${dato(d)}, ifølge ${PARTEN[part]}.`,
  // Korrigeringen av datoen (BF-02A, MM-U55 punkt 10 og designdelen).
  korriger: 'Korriger datoen',
  korrigerNavn: (hva: 'paalegg_mottatt' | 'klar_over_forholdet') =>
    `Korriger datoen ${hva === 'paalegg_mottatt' ? 'pålegget ble mottatt' : 'du ble klar over forholdet'}`,
  korrigerer: (forrige: { dato: string; brev: Brevref }) =>
    `Korrigerer ${dato(forrige.dato)}, oppgitt i ${brevref(forrige.brev)}.`,
  korrigertI: (b: Brevref) => `Korrigert i ${brevref(b)}.`,
  /** Ved et svar når TE har korrigert datoen etter svaret (designdelen i MM-U55, U-5 i BF-02A). */
  sisteOpplysningVedSvaret: (o: Pick<Datoopplysningen, 'hva' | 'dato' | 'brev'>) =>
    `Da svaret ble sendt, var totalentreprenørens siste opplysning at ${o.hva === 'paalegg_mottatt' ? 'pålegget ble mottatt' : 'totalentreprenøren ble klar over forholdet'} ${dato(o.dato)}, oppgitt i ${brevref(o.brev)}.`,
  korrigerILukket: KORRIGERT_I_LUKKET,
  omKorrigeringen: 'Om korrigeringen',
  avgjoerIkke:
    'Løsningen avgjør ikke hvilken dato som er riktig, når varslingsfristen begynte å løpe eller om varselet kom i tide.',
  /**
   * Hva korrigeringen gjør med saken (D-2, D-6 og U-6 i BF-02A; oppdragsgiver 06.11, #1646),
   * og `null` når byggherren ikke har svart.
   */
  korrigeringenStaar: (lukket: boolean, svar: Brevref | null): string | null =>
    lukket
      ? KORRIGERT_I_LUKKET
      : svar
        ? `Svaret i ${brevref(svar)} står som det ble sendt. Byggherren kan ta stilling til den nye datoen i et senere svar.`
        : null,
  lagene: 'Standpunktene i svaret',
  /**
   * Byggherrens standpunkt i svaret på forholdet, som setning (språkfila: partene fullt ut), med
   * kontraktens ord etter forholdet.
   */
  standpunkt: (s: Standpunkt, brev: Brevref | null, f: Forholdsordene): string => {
    const u = iSvaretPaaForholdet(s, brev, f);
    return u ? `Byggherren ${utsagnet(u)}.` : `${standpunkttekst(s, false)}.`;
  },
  /** Antallet poster uten fast beløp ved summen (KA-U61, KA-U72; oppdragsgiver 12.11 i #1752). */
  utenFastBeloep: (n: number) => `${n} ${n === 1 ? 'post' : 'poster'} uten fast beløp`,
  ingenFastBeloep: 'Ingen poster med fast beløp',
});
