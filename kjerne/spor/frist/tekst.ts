/**
 * Teksten i fristsporet: kravet og standpunktene i svaret i brevteksten, ordene brevet bruker om
 * sporet, og leddene i linjen for byggherrens standpunkt. `frosset/brevtekst.ts` slår opp her
 * gjennom `BREVTEKST` og `I_SPORENE`, og `frosset/linje.ts` gjennom `LINJE` (#1783).
 */

import {
  KanIkkeUttrykkes,
  opplistet,
  tidligere,
  utenOverskrift,
  type Brevpunkt,
  type Kravsporsbrevtekst,
  type Standpunktstekster,
  type Tekst,
} from '../../frosset/brevdeler.ts';
import { standpunktet, virkningen } from '../../frosset/byggeklosser.ts';
import type { Sporslinje } from '../../frosset/linje.ts';
import { dager } from '../../frosset/tekst.ts';
import { innholdIForholdet, kategori } from '../forhold/format.ts';
import { betegnelsen, innholdIFristen, type FristIKravet } from './format.ts';
import { fristnoekkel } from './utledning.ts';
import type { Krav } from '../../typer.ts';

/** Fristen `gjelder` i kravet (KA-U74). */
function fristenI(krav: Krav, gjelder: string): FristIKravet {
  const f = innholdIFristen(krav).frister.find((x) => x.id === gjelder);
  if (!f) throw new KanIkkeUttrykkes(`kravet har ikke fristen ${gjelder}`);
  return f;
}

/** Fristene og dagene i kravet, som brevet omtaler kravet med i trekket (KA-U22). */
const fristeneMedDager = (krav: Krav): string =>
  opplistet(
    innholdIFristen(krav).frister.map((f) => `${dager(f.dager)} for frist ${betegnelsen(f)}`)
  );

/**
 * Fristkravet (LV-U4 punkt 2–3): ett punkt per frist med dagene for den, og uten sum (KA-U74,
 * U-1). Brevet angir ikke datoen (KA-U77). En frist fra forrige versjon som ikke er med, er
 * trukket (KA-U76), og en frist som ikke er registrert og får en annen frist i samme rad, er
 * erstattet (KA-U79).
 */
function fristkravtekst(k: Krav, { j }: Tekst): Brevpunkt[] {
  const deler = [
    'Totalentreprenøren krever fristforlengelse for fristene i kontrakten under, med antall dager etter NS 8407 punkt 33.6.1. Dagene gjelder hver frist for seg.',
  ];
  // LV-U18 setning 3: kravet som viser til forespørselen, sier det (HF-U1).
  if (k.gjelder)
    deler.push(
      `Kravet er svar på byggherrens forespørsel etter NS 8407 punkt 33.6.2 i ${j.brevet(j.dokumentetTil(k.gjelder))}.`
    );
  const forrige = tidligere(k, j).at(-1);
  const foer = new Map(forrige ? innholdIFristen(forrige).frister.map((f) => [f.id, f]) : []);
  const punkter: Brevpunkt[] = [utenOverskrift(deler)];
  for (const f of innholdIFristen(k).frister) {
    const var_ = foer.get(f.id);
    const setninger = [`Frist ${betegnelsen(f)}: ${dager(f.dager)}.`];
    if (var_ && forrige && fristnoekkel(var_) !== fristnoekkel(f))
      setninger.push(
        `Fristen erstatter frist ${betegnelsen(var_)} i ${j.brevet(forrige.dokument)}.`
      );
    punkter.push({ punkt: f.id, overskrift: null, avsnitt: [setninger.join(' ')] });
  }
  for (const id of innholdIFristen(k).trekker) {
    const f = foer.get(id);
    if (!f || !forrige)
      throw new KanIkkeUttrykkes(
        `trekket gjelder fristen ${id}, som ikke står i forrige kravversjon`
      );
    punkter.push({
      punkt: f.id,
      overskrift: null,
      avsnitt: [
        `Frist ${betegnelsen(f)}: Totalentreprenøren trekker kravet om forlengelse av fristen, fremsatt i ${j.brevet(forrige.dokument)}.`,
      ],
    });
  }
  return punkter;
}

/** Dagene byggherren godtar for fristen, som en setning med liten forbokstav (KA-U74). */
function dagerForFristen(resultat: string, frist: FristIKravet, vurdert: number): string {
  const navn = `frist ${betegnelsen(frist)}`;
  if (resultat === 'godkjent') return `for ${navn} godkjenner byggherren ${dager(vurdert)}.`;
  if (resultat === 'delvis_godkjent')
    return `for ${navn} godkjenner byggherren ${dager(vurdert)} av de krevde ${dager(frist.dager)}.`;
  if (resultat === 'avslaatt') return `for ${navn} avslår byggherren kravet.`;
  throw new KanIkkeUttrykkes(`standpunktet ${resultat} har ingen brevtekst`);
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
  trukket: fristeneMedDager,
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
  spesifisering: (p, krav) =>
    p.iTide
      ? 'byggherren gjør ikke gjeldende at kravet om fristforlengelse ble spesifisert for sent (NS 8407 § 33.6.1).'
      : `byggherren gjør gjeldende at kravet om fristforlengelse ble spesifisert for sent, og at TE bare har krav på den fristforlengelsen byggherren måtte forstå at TE hadde krav på: ${opplistet(
          p.maatteForstaa!.map(
            (m) => `${dager(m.dager)} for frist ${betegnelsen(fristenI(krav, m.frist))}`
          )
        )} (NS 8407 § 33.6.1).`,
  dager: (p, krav) => dagerForFristen(p.resultat, fristenI(krav, p.gjelder), p.vurdert),
} satisfies Standpunktstekster<'hindring' | 'spesifisering' | 'dager'>;

export const LINJEN_I_FRISTEN = {
  grunner: (svar, paaberopelse) => {
    const spesifisert = standpunktet(svar, 'spesifisering');
    const maatteForstaa = spesifisert?.maatteForstaa;
    return {
      // Som brevteksten: § 33.1 krever at fremdriften hindres «som følge av» forholdet.
      hindring: `avslått: fremdriften er ikke hindret som følge av forholdet (§ ${
        kategori(paaberopelse).hovedkategori === 'force_majeure' ? '33.3' : '33.1'
      })`,
      spesifisering: maatteForstaa?.some((m) => m.dager > 0)
        ? `godkjent med ${maatteForstaa.map((m) => m.dager).join(', ')} dager (§ 33.6.1)`
        : 'avslått (§ 33.6.1)',
    };
  },
  egetLedd: () => undefined,
  ledd: (svar, v) =>
    svar.standpunkter.flatMap((d) =>
      d.art === 'dager'
        ? [
            {
              tekst: d.resultat === 'avslaatt' ? 'avslått' : `godkjent med ${d.vurdert} dager`,
              virkning: virkningen(v, d.id),
            },
          ]
        : []
    ),
} satisfies Sporslinje;
