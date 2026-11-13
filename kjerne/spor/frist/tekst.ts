/**
 * Teksten i fristsporet: kravet og standpunktene i svaret i brevteksten, ordene brevet bruker om
 * sporet, og leddene i linjen for byggherrens standpunkt. `frosset/brevtekst.ts` slår opp her
 * gjennom `BREVTEKST` og `I_SPORENE`, og `frosset/linje.ts` gjennom `LINJE` (#1783).
 */

import {
  utenOverskrift,
  verdi,
  type Brevpunkt,
  type Kravsporsbrevtekst,
  type Standpunktstekster,
  type Tekst,
} from '../../frosset/brevdeler.ts';
import { standpunktet, virkningen } from '../../frosset/byggeklosser.ts';
import type { Sporslinje } from '../../frosset/linje.ts';
import { dager } from '../../frosset/tekst.ts';
import { innholdIForholdet, kategori } from '../forhold/format.ts';
import { innholdIFristen } from './format.ts';
import type { Krav } from '../../typer.ts';

/** Fristkravet (LV-U4 punkt 2–3). */
function fristkravtekst(k: Krav, { j }: Tekst): Brevpunkt[] {
  const deler = [
    `TE krever fristforlengelse på ${dager(innholdIFristen(k).dager)} (NS 8407 § 33.6.1).`,
  ];
  // LV-U18 setning 3: kravet som viser til forespørselen, sier det (HF-U1).
  if (k.gjelder)
    deler.push(
      `Kravet er svar på byggherrens forespørsel etter NS 8407 § 33.6.2 i ${j.brevet(j.dokumentetTil(k.gjelder))}.`
    );
  return [utenOverskrift(deler)];
}

export const BREVTEKSTEN_I_FRISTEN = {
  navn: 'fristen',
  svaretGjelder: 'kravet om fristforlengelse',
  krav: fristkravtekst,
  // VS-U29: også påberopelsen etter § 33.6.2 mot begrunnelsen.
  ogsaaInnsigelserEtter: ['33.6.2'],
  nevnerErstattet: true,
  kravetOm: 'fristforlengelse',
  enigI: 'antallet dager',
  trukket: (krav) => dager(innholdIFristen(krav).dager),
  ingenKrav: (sak) =>
    `TE krever ikke fristforlengelse som følge av forholdet i ${sak}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag.`,
} satisfies Kravsporsbrevtekst;

/** Standpunktene bare fristen har, som en setning med liten forbokstav (LV-U4 punkt 5). */
export const STANDPUNKTENE_I_FRISTEN = {
  hindring: (p, _krav, s, j) => {
    const paaberopelse = s.paaberopelse ? j.krav(s.paaberopelse) : null;
    const hjemmel =
      innholdIForholdet(paaberopelse).hovedkategori === 'force_majeure' ? '§ 33.3' : '§ 33.1';
    return `byggherren ${p.oppfylt ? 'legger til grunn' : 'legger ikke til grunn'} at fremdriften hindres som følge av forholdet (NS 8407 ${hjemmel}).`;
  },
  spesifisering: (p) =>
    p.iTide
      ? 'byggherren gjør ikke gjeldende at kravet om fristforlengelse ble spesifisert for sent (NS 8407 § 33.6.1).'
      : `byggherren gjør gjeldende at kravet om fristforlengelse ble spesifisert for sent, og at TE bare har krav på den fristforlengelsen byggherren måtte forstå at TE hadde krav på, ${dager(p.dager!)} (NS 8407 § 33.6.1).`,
  dager: (p, krav) => verdi(p.resultat, dager(p.vurdert), dager(innholdIFristen(krav).dager)),
} satisfies Standpunktstekster<'hindring' | 'spesifisering' | 'dager'>;

export const LINJEN_I_FRISTEN = {
  grunner: (svar, paaberopelse) => {
    const spesifisert = standpunktet(svar, 'spesifisering');
    return {
      // Som brevteksten: § 33.1 krever at fremdriften hindres «som følge av» forholdet.
      hindring: `avslått: fremdriften er ikke hindret som følge av forholdet (§ ${
        kategori(paaberopelse).hovedkategori === 'force_majeure' ? '33.3' : '33.1'
      })`,
      spesifisering: spesifisert?.dager
        ? `godkjent med ${spesifisert.dager} dager (§ 33.6.1)`
        : 'avslått (§ 33.6.1)',
    };
  },
  egetLedd: () => undefined,
  ledd: (svar, v) => {
    const d = standpunktet(svar, 'dager')!;
    return [
      {
        tekst: d.resultat === 'avslaatt' ? 'avslått' : `godkjent med ${d.vurdert} dager`,
        virkning: virkningen(v, d.id),
      },
    ];
  },
} satisfies Sporslinje;
