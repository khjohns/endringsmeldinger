/**
 * Teksten i fristsporet: kravet og standpunktene i svaret i brevteksten, ordene brevet bruker om
 * sporet, og leddene i linjen for byggherrens standpunkt. `frosset/brevtekst.ts` slår opp her
 * gjennom `BREVTEKST` og `I_SPORENE`, og `frosset/linje.ts` gjennom `LINJE` (#1783).
 */

import {
  gitt,
  KanIkkeUttrykkes,
  kravetErstatter,
  opplistet,
  tidligere,
  type Brevpunkt,
  type Kravsporsbrevtekst,
  type Standpunktstekster,
  type Tema,
  type Tekst,
} from '../../frosset/brevdeler.ts';
import { standpunktet, virkningen } from '../../frosset/byggeklosser.ts';
import type { Sporslinje } from '../../frosset/linje.ts';
import { dager } from '../../frosset/tekst.ts';
import { Uforstaatt } from '../../format/skjema.ts';
import { betegnelsen, hindringenEtter, innholdIFristen, type FristIKravet } from './format.ts';
import { fristnoekkel } from './utledning.ts';
import type { Krav } from '../../typer.ts';

/** Fristen `gjelder` i kravet (KA-U74). */
function fristenI(krav: Krav, gjelder: string): FristIKravet {
  const f = innholdIFristen(krav).frister.find((x) => x.id === gjelder);
  if (!f) throw new KanIkkeUttrykkes(`kravet har ikke fristen ${gjelder}`);
  return f;
}

/** Dagene byggherren måtte forstå for én frist, med fristens betegnelse (VS-U4). */
const maatteForstaaForFristen = (krav: Krav, frist: string, antall: number): string =>
  `${dager(antall)} for frist ${betegnelsen(fristenI(krav, frist))}`;

/** Fristene og dagene i kravet, som brevet omtaler kravet med i trekket (KA-U22). */
const fristeneMedDager = (krav: Krav): string =>
  opplistet(
    innholdIFristen(krav).frister.map((f) => `${dager(f.dager)} for frist ${betegnelsen(f)}`)
  );

/**
 * Varselet etter § 33.4 i kravet: brevet det ble gitt i (`gitt`), eller at kravet varsler nå
 * (VS-U15, prototypen `fristkrav-te.html`). Et varsel sendt utenfor løsningen før kravet står i
 * opplysningen om varselet i samme brev, så punktet står ikke da. Ordlyden er design.
 */
function varselpunkt(t: Tekst): Brevpunkt[] {
  const foer = t.saken.varsletFoer['33.4'];
  if (foer === undefined && t.nytt.utsagn.some((u) => u.art === 'varsel' && u.hjemmel === '33.4'))
    return [];
  return [
    {
      punkt: '33.4',
      overskrift: 'Varselet om fristforlengelse',
      avsnitt: [
        foer === undefined
          ? 'Totalentreprenøren varsler krav om fristforlengelse etter NS 8407 punkt 33.4.'
          : gitt(foer, 'Varsel om fristforlengelse etter NS 8407 punkt 33.4', t),
      ],
    },
  ];
}

/**
 * Fristkravet i punkter (LV-U4 punkt 2–3, prototypen `fristkrav-te.html`): forespørselen kravet
 * svarer på og kravet det erstatter, varselet etter § 33.4, og fristene med dagene for hver, uten
 * sum (KA-U74, U-1). Brevet angir ikke datoen (KA-U77). En frist fra forrige versjon som ikke er
 * med, er trukket (KA-U76), og en frist som ikke er registrert og får en annen frist i samme
 * rad, er erstattet (KA-U79). Begrunnelsen står i punktet `utdypningensPunkt`.
 */
function fristkravtekst(k: Krav, t: Tekst): Brevpunkt[] {
  const { j } = t;
  const innledning: string[] = [];
  // LV-U18 setning 3: kravet som viser til forespørselen, sier det (HF-U1).
  if (k.gjelder)
    innledning.push(
      `Kravet er svar på byggherrens forespørsel etter NS 8407 punkt 33.6.2 i ${j.brevet(j.dokumentetTil(k.gjelder))}.`
    );
  // KA-U52 punkt 4, LV-U56: setningen om kravet det erstatter står før fristene.
  if (k.erstatter) innledning.push(kravetErstatter(k.erstatter, j));
  const versjoner = tidligere(k, j);
  const forrige = versjoner.at(-1);
  const foer = new Map(forrige ? innholdIFristen(forrige).frister.map((f) => [f.id, f]) : []);
  // KA-U79: en frist som er trukket og tatt med igjen, sammenliknes med den siste formen den hadde.
  const sisteForm = new Map<string, FristIKravet>();
  const sisteKrav = new Map<string, Krav>();
  for (const v of versjoner)
    for (const frist of innholdIFristen(v).frister) {
      sisteForm.set(frist.id, frist);
      sisteKrav.set(frist.id, v);
    }
  const avsnitt = [
    'Totalentreprenøren krever fristforlengelse for fristene i kontrakten under, med antall dager etter NS 8407 punkt 33.6.1. Dagene gjelder hver frist for seg.',
  ];
  for (const f of innholdIFristen(k).frister) {
    const siste = sisteForm.get(f.id);
    const setninger = [`Frist ${betegnelsen(f)}: ${dager(f.dager)}.`];
    if (siste && fristnoekkel(siste) !== fristnoekkel(f))
      setninger.push(
        `Fristen erstatter frist ${betegnelsen(siste)} i ${j.brevet(sisteKrav.get(f.id)!.dokument)}.`
      );
    avsnitt.push(setninger.join(' '));
  }
  for (const id of innholdIFristen(k).trekker) {
    const f = foer.get(id);
    if (!f || !forrige)
      throw new KanIkkeUttrykkes(
        `trekket gjelder fristen ${id}, som ikke står i forrige kravversjon`
      );
    avsnitt.push(
      `Frist ${betegnelsen(f)}: Totalentreprenøren trekker kravet om forlengelse av fristen, fremsatt i ${j.brevet(forrige.dokument)}.`
    );
  }
  return [
    ...(innledning.length
      ? [{ punkt: 'innledning', overskrift: null, avsnitt: [innledning.join(' ')] }]
      : []),
    ...varselpunkt(t),
    { punkt: 'frister', overskrift: 'Fristforlengelse', avsnitt },
  ];
}

/**
 * Temaene i byggherrens svar i skjemaets rekkefølge (LV-U34, KA-U78, prototypen
 * `fristsvar.html`): varslene, hindringen, spesifiseringen og dagene for hver frist.
 */
function temaer(krav: Krav): Tema[] {
  return [
    { punkt: 'forholdet', overskrift: 'Forholdet' },
    { punkt: '33.4', overskrift: 'Varselet om fristforlengelse (punkt 33.4)' },
    { punkt: '33.6.2', overskrift: 'Svaret på forespørselen (punkt 33.6.2)' },
    // Bestemmelsen står i teksten, som leser den av påberopelsen svaret gjelder.
    { punkt: 'hindring', overskrift: 'Hindringen' },
    { punkt: 'spesifisering', overskrift: 'Spesifiseringen av kravet (punkt 33.6.1)' },
    // KA-U74: ett punkt for dagene i hver frist, med fristens `id`.
    ...innholdIFristen(krav).frister.map((f) => ({
      punkt: f.id,
      overskrift: `Dagene for frist ${betegnelsen(f)}`,
    })),
  ];
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

/** Kravet i sporet med kontraktens ord (`kravetOm`). */
const KRAVET_OM = 'fristforlengelse';

export const BREVTEKSTEN_I_FRISTEN = {
  navn: 'fristen',
  svaretGjelder: `kravet om ${KRAVET_OM}`,
  krav: fristkravtekst,
  // VS-U29: også påberopelsen etter § 33.6.2 mot begrunnelsen.
  ogsaaInnsigelserEtter: ['33.6.2'],
  nevnerErstattet: false,
  // KA-U33: kravet begrunner antallet dager.
  utdypningensPunkt: { punkt: 'begrunnelse', overskrift: 'Begrunnelse' },
  kravetOm: KRAVET_OM,
  innledning: (krav, { j }) =>
    `Byggherren svarer på totalentreprenørens krav om ${KRAVET_OM} i ${j.brevet(krav.dokument)}.`,
  temaer,
  punktet: (p) => {
    switch (p.art) {
      case 'hindring':
      case 'spesifisering':
        return p.art;
      case 'dager':
        return p.gjelder;
      default:
        return undefined;
    }
  },
  enigI: 'antallet dager',
  trukket: fristeneMedDager,
  ingenKrav: (sak) =>
    `Totalentreprenøren krever ikke fristforlengelse som følge av forholdet i ${sak}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag.`,
} satisfies Kravsporsbrevtekst;

/** Standpunktene bare fristen har, som en setning med liten forbokstav (LV-U4 punkt 5). */
export const STANDPUNKTENE_I_FRISTEN = {
  // KA-U81: ett standpunkt, og teksten nevner begge vilkårene. Ordlyden er design.
  hindring: (p, _krav, s, j) => {
    const hjemmel = hindringenEtter(s.paaberopelse ? j.krav(s.paaberopelse) : null);
    return p.oppfylt
      ? `byggherren legger til grunn at fremdriften er hindret, og at hindringen skyldes forholdet (NS 8407 punkt ${hjemmel}).`
      : `byggherren legger ikke til grunn at fremdriften er hindret, eller at en hindring skyldes forholdet (NS 8407 punkt ${hjemmel}).`;
  },
  spesifisering: (p, krav) =>
    p.iTide
      ? 'byggherren gjør ikke gjeldende at kravet om fristforlengelse ble spesifisert for sent (NS 8407 punkt 33.6.1).'
      : `byggherren gjør gjeldende at kravet om fristforlengelse ble spesifisert for sent, og at totalentreprenøren bare har krav på den fristforlengelsen byggherren måtte forstå at totalentreprenøren hadde krav på: ${opplistet(
          p.maatteForstaa!.map((m) => maatteForstaaForFristen(krav, m.frist, m.dager))
        )} (NS 8407 punkt 33.6.1).`,
  dager: (p, krav) => dagerForFristen(p.resultat, fristenI(krav, p.gjelder), p.vurdert),
} satisfies Standpunktstekster<'hindring' | 'spesifisering' | 'dager'>;

/**
 * Kravet svaret gjelder, med fristene `frister`. Et fristsvar uten kjent krav, eller med en frist
 * kravet ikke har, kan ikke leses (MM-U2).
 */
function kravetMedFristene(kravet: Krav | null | undefined, frister: string[]): Krav {
  if (!kravet) throw new Uforstaatt('fristsvaret gjelder et krav som ikke er kjent');
  const ider = new Set(innholdIFristen(kravet).frister.map((f) => f.id));
  const ukjent = frister.find((f) => !ider.has(f));
  if (ukjent !== undefined) throw new Uforstaatt(`kravet har ikke fristen ${ukjent}`);
  return kravet;
}

export const LINJEN_I_FRISTEN = {
  grunner: (svar, paaberopelse, kravet) => {
    const spesifisert = standpunktet(svar, 'spesifisering');
    const medDager = spesifisert?.maatteForstaa?.filter((m) => m.dager > 0) ?? [];
    const krav = () =>
      kravetMedFristene(
        kravet,
        medDager.map((m) => m.frist)
      );
    return {
      // KA-U81: som brevteksten nevner linjen begge vilkårene.
      hindring: `avslått: fremdriften er ikke hindret, eller hindringen skyldes ikke forholdet (§ ${hindringenEtter(paaberopelse)})`,
      // Bare fristene med dager, med fristens betegnelse som i brevteksten (#1931).
      spesifisering: medDager.length
        ? `godkjent med ${opplistet(
            medDager.map((m) => maatteForstaaForFristen(krav(), m.frist, m.dager))
          )} (§ 33.6.1)`
        : 'avslått (§ 33.6.1)',
    };
  },
  egetLedd: () => undefined,
  // Hvert ledd for dagene nevner fristen, også når kravet har én frist (#1943).
  ledd: (svar, v, kravet) => {
    const dagene = svar.standpunkter.filter((d) => d.art === 'dager');
    if (!dagene.length) return [];
    const krav = kravetMedFristene(
      kravet,
      dagene.map((d) => d.gjelder)
    );
    return dagene.map((d) => {
      const frist = `for frist ${betegnelsen(fristenI(krav, d.gjelder))}`;
      return {
        tekst:
          d.resultat === 'avslaatt'
            ? `avslått ${frist}`
            : `godkjent med ${dager(d.vurdert)} ${frist}`,
        virkning: virkningen(v, d.id),
      };
    });
  },
} satisfies Sporslinje;
