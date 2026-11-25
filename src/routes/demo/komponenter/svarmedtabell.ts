/**
 * Byggherrens svar med tre lag og oversiktstabellen (#1433), i formen kjernen lager for tilfellet
 * i `kjerne/tester/saerskilt.test.ts` («det særskilte kravet etter § 34.1.3 annet ledd»): ett punkt
 * per post og lagslinjen med navnet på innsigelsen (LV-U78, LV-U79). Begrunnelsene er eksempler.
 */
import { FORBEHOLDET, INNLEDNINGEN, INNSIGELSEN_MOT } from '#kjerne/frosset/tekst.ts';
import type { Avsnitt } from '#kjerne/typer.ts';

const kr = (n: string) => `${n.replace(/ /g, '\u00a0')}\u00a0kr`;
const sub = `Subsidiært, hvis ${INNSIGELSEN_MOT.varselet('34.1.2')} ikke fører frem`;

export const SVAR_MED_TABELL: Avsnitt[] = [
  {
    gjelder: 's',
    punkt: INNLEDNINGEN,
    laast:
      'Byggherren svarer på totalentreprenørens krav om justering av vederlaget i brev K201-KOE-017-05 av 20. oktober 2026. Beløpene i brevet er eks. mva.',
  },
  {
    gjelder: 's',
    punkt: '34.1.2',
    overskrift: '1. Varselet om vederlagsjustering (punkt 34.1.2)',
    laast:
      '1. Varselet om vederlagsjustering (punkt 34.1.2)\n\nPrinsipalt\n\nByggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 punkt 34.1.2 i brev K201-KOE-017-03 av 6. oktober 2026 kom for sent.',
    utdypning:
      'Forholdet ble oppdaget ved pelingen 12. september, jf. totalentreprenørens dagbok samme dag. Varselet kom 6. oktober, mer enn tre uker senere.',
  },
  {
    gjelder: 's',
    punkt: 'P1',
    overskrift: '2. Vederlagsjustering for P1 Peling i akse D (punkt 34.1.2)',
    laast: `2. Vederlagsjustering for P1 Peling i akse D (punkt 34.1.2)\n\n${sub}\n\nByggherren godkjenner oppgjør som fast sum med beløpet og forbeholdene som fremgår av svaret. Byggherren godkjenner ${kr('100 000')} av de krevde ${kr('150 000')}.`,
    utdypning:
      'Beløpet bygger på enhetsprisene for peling i kontrakten. Det er trukket fra 50 000 kr for rigg som allerede er dekket i kontraktssummen.',
  },
  {
    gjelder: 's',
    punkt: 'produktivitet',
    overskrift: '3. Særskilt vederlagsjustering (punkt 34.1.3 annet ledd)',
    laast: `3. Særskilt vederlagsjustering (punkt 34.1.3 annet ledd)\n\n${sub}\n\nByggherren gjør gjeldende at varselet om særskilt justering for nedsatt produktivitet eller forstyrrelser etter punkt 34.1.3 tredje ledd i brev K201-KOE-017-05 av 20. oktober 2026 kom for sent, og at totalentreprenøren har tapt retten til å påberope seg påløpte utgifter som grunnlag for kravet. Byggherren godkjenner etter dette ${kr('10 000')} av de krevde ${kr('40 000')}.\n\nVidere subsidiært, hvis heller ikke ${INNSIGELSEN_MOT.varselet('34.1.3')} fører frem\n\nByggherren godkjenner ${kr('30 000')} av de krevde ${kr('40 000')}.`,
  },
  {
    gjelder: 's',
    punkt: 'oversikt',
    overskrift: '4. Oversikt',
    laast: [
      '4. Oversikt',
      [
        'Post\tKrevd\tPrinsipalt\tSubsidiært\tVidere subsidiært',
        `Vederlagsjustering\t${kr('150 000')}\t${kr('0')}\t${kr('100 000')}\t${kr('100 000')}`,
        `Særskilt vederlagsjustering\t${kr('40 000')}\t${kr('0')}\t${kr('10 000')}\t${kr('30 000')}`,
        `Sum\t${kr('190 000')}\t${kr('0')}\t${kr('110 000')}\t${kr('130 000')}`,
      ].join('\n'),
    ].join('\n\n'),
  },
  {
    gjelder: 's',
    punkt: FORBEHOLDET,
    overskrift: '5. Forbehold',
    laast:
      '5. Forbehold\n\nByggherren har ennå ikke svart på totalentreprenørens påberopelse av uforutsette forhold ved grunnen i brev K201-KOE-017-01 av 2. oktober 2026. Standpunktene ovenfor gjelder under forutsetning av at forholdet gir grunnlag for kravet.',
    utdypning:
      'Byggherren tar forbehold om å justere mengden peler i punkt 2 når sluttoppmålingen foreligger.',
  },
];
