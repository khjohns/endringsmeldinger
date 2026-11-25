import { liste } from '#kjerne/frosset/brevdeler.ts';
import { kroner } from '#kjerne/frosset/tekst.ts';
import type { Oppgjoersform, Standpunkt } from '#kjerne/typer.ts';
import type { Brevref } from '../lesing';
import type { Innsigelsen, Svarlaget } from '../svarlagene';
import { SKJEMA, innsigelsenOmVarselet } from './svaret';
import { brevref, brevrefStor } from './felles';
import { dato, hjemmelsmerke, punkt, haerdet } from './format';
import { grunntekst, standpunkttekst } from './standpunkt';

const MOT_BEREGNINGSREGELEN = 'innsigelsen mot beregningsregelen';

/** Hva hver oppgjørsform heter i en tabellcelle, med «pkt.» der hjemmelen står (OV-U75). */
const OPPGJOERSFORMEN: Record<Oppgjoersform, string> = {
  tilbud: 'Tilbud om fast sum (pkt. 34.2.1)',
  enhetspriser: 'Enhetspriser (pkt. 34.3)',
  regningsarbeid: 'Regningsarbeid (pkt. 34.4)',
};

/** Siden for vederlaget (BF-44, prototypen `vederlagsoversikt.html` v3, oppsett B). */
export const VEDERLAGET = haerdet({
  tittel: 'Vederlagsjustering',
  hjemmel: hjemmelsmerke('34'),
  kortet: 'Kravet og svaret',
  /** Brevene kortet leser kravet og svaret av (U-2). */
  kilde: (krav: Brevref, svar: Brevref | null) =>
    svar ? `Kravet i ${brevref(krav)} og svaret i ${brevref(svar)}` : `Kravet i ${brevref(krav)}`,
  krever: 'Totalentreprenøren krever',
  godkjenner: 'Byggherren godkjenner',
  ikkeSvart: 'Byggherren har ikke svart på dette kravet.',
  /** Beløpet i et krav ved brevet i tråden, med hjemlene kravet også varsler etter (U-12). */
  kravbeloep: (beloep: number, varsler: readonly string[] = []) =>
    varsler.length
      ? `${kroner(beloep)}, med varsel etter ${punkt(...varsler)}.`
      : `${kroner(beloep)}.`,
  /** Innsigelsen et senere lag gjelder hvis ikke fører frem (U-2), med brevets ord. */
  innsigelsen: (i: Innsigelsen) =>
    i.art === 'grunn'
      ? SKJEMA.grunnen(i.grunn, i.brev)
      : i.art === 'varsel'
        ? i.hjemmel === '33.6.2'
          ? 'innsigelsen om at svaret på forespørselen kom for sent'
          : innsigelsenOmVarselet(i.hjemmel)
        : i.art === 'beregningsregel'
          ? MOT_BEREGNINGSREGELEN
          : `innsigelsen om ${i.art === 'spesifisering' ? 'spesifiseringen' : 'hindringen'}`,
  /** Vilkåret ved beløpet i et lag: «Hvis innsigelsen … ikke fører frem» (U-2, LV-U4 punkt 4). */
  vilkaar: (innsigelser: string[], heller: boolean) =>
    heller
      ? `Hvis heller ikke ${liste(innsigelser)} fører frem`
      : `Hvis ${liste(innsigelser)} ikke fører frem`,
  lagetVilkaar: (innsigelser: readonly Innsigelsen[], heller = false): string =>
    VEDERLAGET.vilkaar(innsigelser.map(VEDERLAGET.innsigelsen), heller),
  /** Et standpunkt et lag bygger på, med brevet med varselet en påberopelse gjelder. */
  standpunkt: (s: Standpunkt, varselbrev: Brevref | null) =>
    s.art === 'rettidighet' && !s.iTide && varselbrev && s.hjemmel !== '34.4'
      ? `Byggherren gjør gjeldende at varselet etter ${punkt(s.hjemmel)} i ${brevref(varselbrev)} kom for sent` +
        (s.begrenset !== undefined
          ? `, og godkjenner ${kroner(s.begrenset)} etter begrensningen`
          : '')
      : standpunkttekst(s, false),
  /** Standpunktene som står under vilkåret i oversikten (BF-44 U-2, #2182). */
  laget: (l: Svarlaget): string[] =>
    [
      ...l.grunner.map((g) => grunntekst(g.grunn, false, g.brev)),
      ...l.standpunkter.map((s) => VEDERLAGET.standpunkt(s.standpunkt, s.brev)),
    ].map((t) => `${t}.`),
  /** Hva som skiller svaret fra kravet om ingen av innsigelsene fører frem (U-2). */
  skiller: (beloep: number, flereLag: boolean) =>
    flereLag
      ? `Hvis ingen av byggherrens innsigelser fører frem, er svaret ${kroner(beloep)} lavere enn kravet.`
      : `Svaret er ${kroner(beloep)} lavere enn kravet.`,
  eksMva: 'Beløpene er eks. mva.',
  perPost: 'Per post',
  /**
   * Vilkåret ved en post i tabellen «Per post» når byggherren ikke godtar beregningsregelen for
   * posten (svar A 24.11 i #2242, OV-U32).
   */
  postvilkaar: (innsigelser: readonly 'beregningsregel'[]) =>
    VEDERLAGET.vilkaar(
      innsigelser.map(() => MOT_BEREGNINGSREGELEN),
      false
    ),
  post: 'Post',
  krevd: 'Krevd',
  oppgjoersform: (f: Oppgjoersform | null) =>
    f === null ? 'Nedsatt produktivitet · tilbud om fast sum' : OPPGJOERSFORMEN[f],
  /** Forbeholdet etter GR-U34, som svaret ble sendt med, og stillingen i forholdet nå (U-3, D-3). */
  forbehold: (svar: Brevref, forholdssvar: Brevref | null) =>
    `Svaret i ${brevref(svar)} gis under forutsetning av at forholdet gir grunnlag for kravet. ` +
    (forholdssvar
      ? `Byggherren har senere svart på forholdet i ${brevref(forholdssvar)}.`
      : 'Svar på forholdet er ikke registrert.'),
  tilForholdet: 'Gå til forholdet',
  /** Regningsarbeid som liste, uten tabell (U-13). */
  regning: {
    oppgjoersform: 'Oppgjørsform',
    regningsarbeid: 'Regningsarbeid etter punkt 34.4.',
    godkjent: (svar: Brevref) => `Byggherren godtar regningsarbeid i ${brevref(svar)}.`,
    ikkeGodkjent: (svar: Brevref) => `Byggherren godtar ikke regningsarbeid i ${brevref(svar)}.`,
    varsel: 'Varsel før arbeidet',
    varselet: (b: Brevref) => `${brevrefStor(b)}, ${dato(b.registrert)} (pkt. 34.4 første ledd)`,
    overslag: 'Kostnadsoverslag',
    overslaget: (beloep: number, krav: Brevref) =>
      `${kroner(beloep)} ifølge totalentreprenøren i ${brevref(krav)}, ${dato(krav.registrert)}`,
  },
});
