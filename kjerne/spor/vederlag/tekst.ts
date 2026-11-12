/**
 * Teksten i vederlagssporet: kravet og standpunktene i svaret i brevteksten, ordene brevet
 * bruker om sporet, og leddene i linjen for byggherrens standpunkt. `frosset/brevtekst.ts` slår
 * opp her gjennom `BREVTEKST` og `I_SPORENE`, og `frosset/linje.ts` gjennom `LINJE` (#1783).
 */

import { beloep, tilTall, type Oere } from '../../regler/beloep.ts';
import { erBeloepetGodkjentFullt } from '../../regler/vederlag.ts';
import {
  eksMva,
  KanIkkeUttrykkes,
  kravpostenI,
  opplistet,
  PRODUKTIVITET,
  punktum,
  tidligere,
  verdi,
  type Brevpunkt,
  type Lagbeloep,
  stor,
  type Tema,
  type Kravsporsbrevtekst,
  type Standpunktstekster,
  type Tekst,
} from '../../frosset/brevdeler.ts';
import {
  etikett,
  hjemmelenGjelder,
  laget,
  virkningen,
  type Svarinnhold,
} from '../../frosset/byggeklosser.ts';
import type { Regelsett } from '../../regler/regelsett.ts';
import type { Linjeledd, Sporslinje } from '../../frosset/linje.ts';
import { kroner, SENT_I_LINJEN } from '../../frosset/tekst.ts';
import { begrensningen } from './frysing.ts';
import {
  innholdIVederlaget,
  krevdIKravposten,
  krevdProduktivitet,
  krevdRigg,
  kravposterI,
} from './format.ts';
import { utenGren } from '../../typer.ts';
import type {
  Krav,
  Kravpost,
  Kravpostvarselet,
  Standpunkt,
  Standpunktsvirkning,
} from '../../typer.ts';

// ---------- Brevteksten (LV-U4) ----------

/** Metoden byggherren mener vederlaget skal justeres etter, når tilbudet ikke er akseptert. */
const METODEN = {
  enhetspriser: 'etter enhetspriser (NS 8407 punkt 34.3)',
  regningsarbeid: 'som regningsarbeid (NS 8407 punkt 34.4)',
} as const satisfies Record<
  NonNullable<Extract<Standpunkt, { art: 'oppgjoersform' }>['oensket']>,
  string
>;

/**
 * Varselet gitt før kravet: «… ble gitt i» brevet det står i (VS-U55). Ligger dokumentet ved
 * kravet, er det lagt til i kravskjemaet, og totalentreprenøren opplyser det (VS-U51, VS-U53).
 * Ordlyden er design (U-14 i BF-14), og partene skrives fullt ut (`docs/sprak.md`, #1532).
 */
function gitt(
  varselet: Extract<Kravpostvarselet, { art: 'gitt' }>,
  hva: string,
  { j, nytt }: Pick<Tekst, 'j' | 'nytt'>
): string {
  const brevet = j.brevet(j.dokumentetTil(varselet.varsel));
  const vedlagte = new Set(nytt.dokumentasjon.map((v) => v.vedlegg_id));
  const dokumentet = j.dokumentMed(varselet.varsel)?.dokumentasjon ?? [];
  return dokumentet.length && dokumentet.every((v) => vedlagte.has(v.vedlegg_id))
    ? `Totalentreprenøren opplyser at ${hva.charAt(0).toLowerCase()}${hva.slice(1)} ble gitt i ${brevet}, som er vedlagt.`
    : `${hva} ble gitt i ${brevet}.`;
}

/** Avsnittet for én kravpost. Ordlyden er design (U-6 i BF-14); budskapet står i KA-U61 og KA-U66. */
function kravposttekst(
  p: Kravpost,
  varselet: Kravpostvarselet | undefined,
  t: Pick<Tekst, 'j' | 'nytt'>
): string {
  const deler = [
    `${p.betegnelse} ${punktum(p.beskrivelse).slice(0, -1)}${p.pns ? ` (PNS ${p.pns})` : ''}.`,
  ];
  if (p.oppgjoersform === 'tilbud') deler.push(`Totalentreprenøren krever ${eksMva(p.beloep!)}`);
  else if (p.oppgjoersform === 'enhetspriser') {
    deler.push(
      p.justert
        ? `Totalentreprenøren krever at ${p.betegnelse} gjøres opp etter kontraktens enhetspriser, justert etter NS 8407 punkt 34.3.2.`
        : `Totalentreprenøren krever at ${p.betegnelse} gjøres opp etter kontraktens enhetspriser etter NS 8407 punkt 34.3.1.`
    );
    if (varselet)
      deler.push(
        varselet.art === 'kravet'
          ? 'Kravet er varsel om justering av enhetsprisene etter NS 8407 punkt 34.3.3.'
          : gitt(varselet, 'Varselet om justering av enhetsprisene etter NS 8407 punkt 34.3.3', t)
      );
    if (p.anslag !== undefined)
      deler.push(`Anslaget er ${eksMva(p.anslag)} Anslaget er en opplysning og ikke et tilbud.`);
  } else if (p.oppgjoersform === 'regningsarbeid') {
    deler.push(
      `Totalentreprenøren krever at ${p.betegnelse} gjøres opp som regningsarbeid etter NS 8407 punkt 34.4 og punkt 30.`
    );
    if (varselet)
      deler.push(
        varselet.art === 'kravet'
          ? 'Kravet er varsel før regningsarbeidet settes i gang (NS 8407 punkt 34.4).'
          : gitt(varselet, 'Varselet før regningsarbeidet settes i gang (NS 8407 punkt 34.4)', t)
      );
    if (p.kostnadsoverslag !== undefined)
      deler.push(
        `Kostnadsoverslaget er ${eksMva(p.kostnadsoverslag)} Overslaget er en opplysning og ikke et tilbud.`
      );
  } else utenGren(p.oppgjoersform);
  return deler.join(' ');
}

/**
 * Varselet etter § 34.1.2 eller § 34.1.3 tredje ledd i punktet for varselet: brevet det ble gitt
 * i, som for varselet for en kravpost (`gitt`), eller at kravet varsler nå (U-7 og prototype v4
 * i BF-14, VS-U51). Ordlyden er design.
 */
function varselpunkt(hjemmel: '34.1.2' | '34.1.3', t: Tekst): Brevpunkt {
  const ordene = {
    '34.1.2': {
      overskrift: 'Varselet om vederlagsjustering',
      gitt: 'Varsel om vederlagsjustering etter NS 8407 punkt 34.1.2',
      naa: 'Totalentreprenøren varsler krav om justering av vederlaget etter NS 8407 punkt 34.1.2.',
    },
    '34.1.3': {
      overskrift: 'Varselet om særskilt vederlagsjustering',
      gitt: 'Varsel om særskilt vederlagsjustering etter NS 8407 punkt 34.1.3 tredje ledd',
      naa: 'Totalentreprenøren varsler særskilt etter NS 8407 punkt 34.1.3 tredje ledd.',
    },
  }[hjemmel];
  const foer = t.saken.varsletFoer[hjemmel];
  return {
    punkt: hjemmel,
    overskrift: ordene.overskrift,
    avsnitt: [
      foer === undefined ? ordene.naa : gitt({ art: 'gitt', varsel: foer }, ordene.gitt, t),
    ],
  };
}

/**
 * Vederlagskravet i punkter med overskrift (#1824, prototype v4 i BF-14): kravet det erstatter
 * (KA-U52 punkt 4), varslene, kravpostene med trekket (KA-U56), postene utenfor kravpostene
 * (OV-U95 punkt 3, OV-U89 punkt 17) og hvilke poster som er tilbud etter § 34.2.1 (KA-U61,
 * KA-U65). Rigg og drift kalles ikke tilbud. Partene skrives fullt ut (LV-U35).
 */
function vederlagstekst(k: Krav, t: Tekst, regler: Regelsett): Brevpunkt[] {
  const { j, saken } = t;
  const poster = kravposterI(k);
  const post = krevdProduktivitet(k);
  const rigg = krevdRigg(k);
  if (!poster.length && post === null && rigg === null)
    throw new KanIkkeUttrykkes('vederlagskravet har ingen poster');
  const punkter: Brevpunkt[] = [];
  if (k.erstatter)
    punkter.push({
      punkt: 'innledning',
      overskrift: null,
      avsnitt: [
        `Kravet erstatter totalentreprenørens krav i ${j.brevet(j.krav(k.erstatter).dokument)}.`,
      ],
    });
  // VS-U3, OV-U15: varselet etter § 34.1.2 nevnes der varslingsplikten gjelder forholdet.
  if (hjemmelenGjelder('34.1.2', saken.paaberopelse, regler))
    punkter.push(varselpunkt('34.1.2', t));
  if (post !== null) punkter.push(varselpunkt('34.1.3', t));

  // LV-U70: hver kravpost og hvert trekk er et punkt, så utdypningen står under posten
  // (#1823 punkt 1). Punktet er betegnelsen, som avsenderen ser før serveren gir en ny post
  // `id` (KA-U53). Overskriften står over den første.
  const justering: Brevpunkt[] = poster.map((p) => ({
    punkt: p.betegnelse,
    overskrift: null,
    avsnitt: [kravposttekst(p, saken.kravpostvarsler[p.id], t)],
  }));
  const forrige = tidligere(k, j).at(-1);
  for (const id of innholdIVederlaget(k).trekker) {
    const p = forrige && kravposterI(forrige).find((q) => q.id === id);
    if (!p)
      throw new KanIkkeUttrykkes(
        `trekket gjelder kravposten ${id}, som ikke står i forrige kravversjon`
      );
    justering.push({
      punkt: p.betegnelse,
      overskrift: null,
      avsnitt: [
        `${p.betegnelse} ${punktum(p.beskrivelse).slice(0, -1)}. Totalentreprenøren trekker kravet i ${p.betegnelse}, fremsatt i ${j.brevet(forrige.dokument)}.`,
      ],
    });
  }
  if (justering.length) {
    justering[0].overskrift = 'Vederlagsjustering';
    punkter.push(...justering);
  }
  // OV-U95 punkt 3: «i tillegg» når vederlagsjusteringen har minst én kravpost.
  if (post !== null)
    punkter.push({
      punkt: 'produktivitet',
      overskrift: 'Særskilt vederlagsjustering',
      avsnitt: [
        `Totalentreprenøren krever ${poster.length ? 'i tillegg ' : ''}særskilt justering av vederlaget etter NS 8407 punkt 34.1.3 annet ledd for ${PRODUKTIVITET} med ${eksMva(tilTall(post))}`,
      ],
    });
  if (rigg !== null)
    punkter.push({
      punkt: 'rigg_og_drift',
      overskrift: 'Rigg og drift i forlenget byggetid',
      avsnitt: [
        `Totalentreprenøren krever ${eksMva(tilTall(rigg))} for rigg og drift i forlenget byggetid.`,
      ],
    });

  const slutt: string[] = [];
  const tilbud = poster.filter((p) => p.oppgjoersform === 'tilbud').map((p) => p.betegnelse);
  if (post !== null) tilbud.push('den særskilte vederlagsjusteringen');
  if (tilbud.length)
    slutt.push(`Kravet for ${opplistet(tilbud)} er et tilbud etter NS 8407 punkt 34.2.1.`);
  const regel = poster.filter((p) => p.oppgjoersform !== 'tilbud').map((p) => p.betegnelse);
  if (regel.length)
    slutt.push(
      `${opplistet(regel)} gjøres opp etter en beregningsregel, og kravet for ${regel.length > 1 ? 'dem' : 'den'} er ikke et tilbud.`
    );
  if (slutt.length) punkter.push({ punkt: 'tilbud', overskrift: null, avsnitt: [slutt.join(' ')] });
  return punkter;
}

/** KA-U22: beløpene som identifiserer vederlagskravet i trekket: de krevde faste beløpene. */
function kravetsBeloep(krav: Krav): string {
  const deler = kravposterI(krav).flatMap((p) => {
    const krevd = krevdIKravposten(krav, p);
    return krevd === null ? [] : [`${eksMva(tilTall(krevd))} i ${p.betegnelse}`];
  });
  const post = krevdProduktivitet(krav);
  if (post !== null) deler.push(`${eksMva(tilTall(post))} etter NS 8407 § 34.1.3 annet ledd`);
  const rigg = krevdRigg(krav);
  if (rigg !== null) deler.push(`${eksMva(tilTall(rigg))} for rigg og drift`);
  return deler.length ? deler.join(' og ') : 'uten krevd beløp';
}

/** Temaene i byggherrens svar i skjemaets rekkefølge, med overskriften (LV-U34, KA-U53). */
function temaer(krav: Krav, { saken }: Tekst, regler: Regelsett): Tema[] {
  const hjemmel = hjemmelenGjelder('34.1.2', saken.paaberopelse, regler) ? '34.1.2' : '34.1.1';
  return [
    { punkt: 'forholdet', overskrift: 'Forholdet' },
    { punkt: '34.1.2', overskrift: 'Varselet om vederlagsjustering (punkt 34.1.2)' },
    { punkt: '34.1.3', overskrift: 'Varselet om særskilt vederlagsjustering (punkt 34.1.3)' },
    { punkt: 'metode', overskrift: 'Beregningsmetode (punkt 34.2)' },
    // Med flere kravposter står betegnelsen og beskrivelsen først, som i kravet (KA-U53).
    ...kravposterI(krav).map((p, _, alle) => ({
      punkt: p.betegnelse,
      overskrift: `Vederlagsjustering (punkt ${hjemmel})`,
      ...(alle.length > 1 ? { foerst: `${p.betegnelse} ${punktum(p.beskrivelse)}` } : {}),
    })),
    { punkt: 'produktivitet', overskrift: 'Særskilt vederlagsjustering (punkt 34.1.3 annet ledd)' },
  ];
}

/** LV-U38: følgen av påberopelsen etter § 34.1.2 for postene i kravet, når svaret ikke har tabell. */
function ingenBeloep(krav: Krav): string {
  const poster = [
    ...(kravposterI(krav).length ? ['vederlagsjusteringen'] : []),
    ...(krevdProduktivitet(krav) !== null ? ['den særskilte vederlagsjusteringen'] : []),
  ];
  return `Byggherren godkjenner etter dette ikke noe beløp for ${poster.join(' eller ')}.`;
}

/**
 * OV-U73 og KA-U57 (e): tabellen med én rad per post med fast beløp, det krevde beløpet og det
 * byggherren godkjenner i hvert lag, og en sumrad, når svaret har minst to slike poster og minst
 * to lag. I et lag før postens første beløp er beløpet 0 kr (LV-U33), og ellers det siste
 * beløpet for posten i laget eller før (arbeidsvalg 2 i #1433). Cellene står som tekst, adskilt
 * med tabulator, så tabellen fryses med brevteksten.
 */
function oversikt(
  krav: Krav,
  beloepene: Lagbeloep[],
  lagene: number,
  forskyvning: number
): string | null {
  const poster = [
    ...kravposterI(krav).map((p) => ({ post: p.betegnelse, krevd: krevdIKravposten(krav, p) })),
    { post: 'produktivitet', krevd: krevdProduktivitet(krav) },
  ].filter(
    (p): p is { post: string; krevd: Oere } =>
      p.krevd !== null && beloepene.some((b) => b.post === p.post)
  );
  if (poster.length < 2 || lagene < 2) return null;
  const navn = (post: string) =>
    post === 'produktivitet'
      ? 'Særskilt vederlagsjustering'
      : kravposterI(krav).length > 1
        ? post
        : 'Vederlagsjustering';
  const iLaget = (post: string, lag: number) =>
    beloepene
      .filter((b) => b.post === post && (b.plass ?? 0) <= lag)
      .sort((a, b) => (a.plass ?? 0) - (b.plass ?? 0))
      .at(-1)?.beloep ?? 0;
  const kolonner = Array.from({ length: lagene }, (_, i) => i + 1);
  const rader = poster.map((p) => [
    navn(p.post),
    kroner(tilTall(p.krevd)),
    ...kolonner.map((lag) => kroner(iLaget(p.post, lag))),
  ]);
  const sum = [
    'Sum',
    kroner(poster.reduce((s, p) => s + tilTall(p.krevd), 0)),
    ...kolonner.map((lag) => kroner(poster.reduce((s, p) => s + iLaget(p.post, lag), 0))),
  ];
  return [
    ['Post', 'Krevd', ...kolonner.map((lag) => stor(etikett(lag + forskyvning)))],
    ...rader,
    sum,
  ]
    .map((rad) => rad.join('\t'))
    .join('\n');
}

/** Brevteksten i vederlagssporet. */
export const BREVTEKSTEN_I_VEDERLAGET = {
  navn: 'vederlaget',
  svaretGjelder: 'kravet om justering av vederlaget',
  krav: vederlagstekst,
  // VS-U29: også påberopelsen etter § 34.1.3 mot det særskilte varselet (VS-U24, OV-U22).
  ogsaaInnsigelserEtter: ['34.1.3'],
  // Kravet sier selv hvilket krav det erstatter, i innledningen (#1824).
  nevnerErstattet: false,
  // Forbeholdet, som Varden sender som kravets utdypning til #1823 gir det et eget felt.
  utdypningensPunkt: { punkt: 'forbehold', overskrift: 'Forbehold' },
  kravetOm: 'justering av vederlaget',
  temaer,
  oversikt,
  ingenBeloep,
  enigI: 'beløpet',
  trukket: kravetsBeloep,
  ingenKrav: (sak) =>
    `Totalentreprenøren krever ikke justering av vederlaget som følge av forholdet i ${sak}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag. Avkallet omfatter ikke vederlag for forsering etter NS 8407 punkt 33.8.`,
} satisfies Kravsporsbrevtekst;

/**
 * Standpunktene i artene bare vederlagssporet har (LV-U4 punkt 5, LV-U5), med partene skrevet
 * fullt ut (LV-U35) og «punkt» (LV-U39). Beløpene står uten «eks. mva.», som står i
 * innledningen (LV-U34).
 */
export const STANDPUNKTENE_I_VEDERLAGET = {
  oppgjoersform: (p, krav) => {
    // Arbeidsvalget i #479: oppgjørsformen er byggherrens standpunkt, ikke løsningens avgjørelse. LV-U31 og
    // LV-U32: godkjenningen betegner ikke tilbudet som akseptert, heller ikke ved fullt beløp.
    // KA-U57 (d): med flere kravposter sier standpunktet hvilken kravpost det gjelder.
    const post = kravposterI(krav).length > 1 ? kravpostenI(krav, p.gjelder).betegnelse : null;
    if (p.hjemmel !== '34.2.2') return beregningsregeltekst(p, post);
    return p.aksepterer
      ? `byggherren godkjenner oppgjør som fast sum${post ? ` for ${post}` : ''} med beløpet og forbeholdene som fremgår av svaret.`
      : `byggherren aksepterer ikke totalentreprenørens tilbud${post ? ` for ${post}` : ''} (NS 8407 punkt 34.2.2 første ledd), og mener vederlaget${post ? ' for kravposten' : ''} skal justeres ${METODEN[p.oensket!]}.`;
  },
  justering: (p, krav) => {
    // KA-U68, OV-U95 punkt 5: standpunktet godkjenner ingen priser, mengder eller beløp.
    const post = kravpostenI(krav, p.gjelder).betegnelse;
    return p.godtar
      ? `byggherren godtar at enhetsprisene for ${post} justeres (NS 8407 punkt 34.3.2). Det godkjenner ikke priser, mengder eller beløp.`
      : `byggherren bestrider at enhetsprisene for ${post} skal justeres (NS 8407 punkt 34.3.2), og mener ${post} skal gjøres opp etter kontraktens enhetspriser.`;
  },
  beloep: (p, krav) => {
    // Standpunktet har et beløp, fordi `harTekst` har tatt bort standpunktene uten (KA-U72).
    // Resultatet regnes i hele øre (B-13, OV-U59). LV-U34: beløpet står under punktet for
    // posten, så setningen nevner ikke posten eller hjemmelen.
    const krevd = p.saerskilt ? krevdProduktivitet(krav)! : krevdeKravpost(krav, p.gjelder!)[1];
    const godkjent = beloep(p.godkjent)!;
    const resultat = erBeloepetGodkjentFullt(krevd, godkjent)
      ? 'godkjent'
      : godkjent === 0n
        ? 'avslaatt'
        : 'delvis_godkjent';
    return verdi(resultat, kroner(p.godkjent!), kroner(tilTall(krevd)));
  },
} satisfies Standpunktstekster<'oppgjoersform' | 'justering' | 'beloep'>;

/** Kravposten med fast sum standpunktet til beløpet gjelder, og det krevde beløpet (KA-U57 (c)). */
function krevdeKravpost(krav: Krav, gjelder: string): [Kravpost, Oere] {
  const post = kravpostenI(krav, gjelder);
  const krevd = krevdIKravposten(krav, post);
  if (krevd === null)
    throw new KanIkkeUttrykkes(`kravposten ${post.betegnelse} har ikke et krevd beløp`);
  return [post, krevd];
}

/** TEs beregningsregel i standpunktet, etter hjemmelen. */
const REGELEN = {
  '34.3': 'etter enhetspriser (NS 8407 punkt 34.3)',
  '34.4': 'som regningsarbeid (NS 8407 punkt 34.4)',
} as const;

/**
 * Standpunktet til beregningsregelen for en kravpost (KA-U54, OV-U95 punkt 5) og kravet om
 * spesifisert tilbud (KA-U69, KA-U71). Ordlyden er design (prototype v3, `#svar`).
 */
function beregningsregeltekst(
  p: Extract<Standpunkt, { art: 'oppgjoersform' }>,
  post: string | null
): string {
  const forPosten = post ? ` for ${post}` : '';
  const regelen = REGELEN[p.hjemmel as '34.3' | '34.4'];
  if (p.aksepterer)
    return `byggherren godtar at vederlaget${forPosten} justeres ${regelen}. Det godkjenner ikke mengder, priser, kostnader eller noe beløp.`;
  const mener = p.oensket ? `, og mener det skal justeres ${METODEN[p.oensket]}` : '';
  const tilbud = p.kreverTilbud
    ? ` Byggherren krever at totalentreprenøren gir et spesifisert tilbud${post ? ` for ${post}` : ' for kravposten'} (NS 8407 punkt 34.2.1 første ledd).`
    : '';
  return `byggherren godtar ikke at vederlaget${forPosten} justeres ${regelen}${mener}.${tilbud}`;
}

// ---------- Linjen for byggherrens standpunkt (MM-U9) ----------

/** Leddene for svaret på vederlaget i linjen. */
function leddIVederlaget(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  kravet: Krav | null | undefined,
  forKravposten: ReadonlySet<string>
): Linjeledd[] {
  const sine: Linjeledd[] = [];
  const virkning = (id: string) => virkningen(v, id);
  const begrenset = begrensningen(svar, v);
  // OV-U26: hver post for seg når kravet har posten etter § 34.1.3 annet ledd, med
  // begrensningen som eget ledd foran posten.
  const poster = svar.standpunkter.filter(
    (s): s is Extract<Standpunkt, { art: 'beloep' }> => s.art === 'beloep'
  );
  const delt = poster.some((b) => b.saerskilt);
  const kravposter = kravet ? kravposterI(kravet) : [];
  const betegnelse = (gjelder: string | undefined) =>
    kravposter.length > 1 ? kravposter.find((k) => k.id === gjelder)?.betegnelse : undefined;
  poster.forEach((b) => {
    const post = betegnelse(b.gjelder);
    const hva = b.saerskilt
      ? delt
        ? ` for ${SAERSKILT_I_LINJEN}`
        : ''
      : post
        ? ` for ${post}`
        : delt
          ? ' for justeringen ellers'
          : '';
    if (b.saerskilt && begrenset)
      sine.push({
        tekst: `begrenset etter § 34.1.3 til ${kroner(begrenset.begrenset!)}`,
        virkning: virkning(begrenset.id),
      });
    // KA-U57 (d), KA-U60, KA-U54: standpunktet til oppgjørsformen gjelder kravposten og står i
    // sitt lag, med TEs oppgjørsform som hjemmel. KA-U68: justeringen som er bestridt, likeså.
    const forPosten = post ? ` for ${post}` : '';
    const form = svar.standpunkter.find(
      (s) => s.art === 'oppgjoersform' && !s.aksepterer && s.gjelder === b.gjelder
    );
    if (form?.art === 'oppgjoersform' && !b.saerskilt)
      sine.push({
        tekst:
          form.hjemmel === '34.2.2'
            ? `tilbudet${forPosten} ikke akseptert (§ 34.2.2)`
            : `beregningsregelen${forPosten} ikke godtatt (§ ${form.hjemmel})`,
        virkning: virkning(form.id),
      });
    const varselet = svar.standpunkter.find(
      (s) =>
        s.art === 'rettidighet' &&
        forKravposten.has(s.id) &&
        s.gjelder === b.gjelder &&
        laget(virkning(s.id))
    );
    if (varselet?.art === 'rettidighet')
      sine.push({
        tekst: `${SENT_I_LINJEN[varselet.hjemmel]}${forPosten} kom for sent`,
        virkning: virkning(varselet.id),
      });
    const justering = svar.standpunkter.find(
      (s) => s.art === 'justering' && !s.godtar && s.gjelder === b.gjelder
    );
    if (justering)
      sine.push({
        tekst: `justeringen av enhetsprisene${forPosten} bestridt (§ 34.3.2)`,
        virkning: virkning(justering.id),
      });
    // En kravpost uten beløp (KA-U72) har ikke et ledd for beløpet.
    if (b.godkjent === undefined) return;
    const tekst =
      beloep(b.godkjent) === 0n ? `avslått${hva}` : `godkjent med ${kroner(b.godkjent)}${hva}`;
    sine.push({ tekst, virkning: virkning(b.id) });
  });
  return sine;
}

/** Posten etter § 34.1.3 annet ledd i linjen. */
const SAERSKILT_I_LINJEN = 'særskilt justering (§ 34.1.3 annet ledd)';

/** Linjen i vederlagssporet. */
export const LINJEN_I_VEDERLAGET = {
  // Begrensningen etter § 34.1.3 er ingen preklusjon, men et eget ledd (VS-U5).
  egetLedd: (svar, v) => begrensningen(svar, v)?.id,
  ledd: leddIVederlaget,
} satisfies Sporslinje;
