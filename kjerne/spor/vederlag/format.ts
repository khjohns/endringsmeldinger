/**
 * Formatet for vederlaget (#1783): skjemaene for kravet, standpunktene og utregningen i svaret,
 * og tilgangen til kravinnholdet og utregningen med typen for sporet. De felles modulene i
 * `format/` slår opp her.
 */

import { beloep, UgyldigBeloep, type Oere } from '../../regler/beloep.ts';
import { SAERSKILTE, VEDERLAGSRESULTATER } from '../../regler/typer.ts';
import {
  artfelt,
  DATO,
  ID,
  liste,
  objekt,
  TEKST,
  Uforstaatt,
  type Skjema,
  type Svarlesing,
} from '../../format/skjema.ts';
import {
  KORRESPONDANSETYPER,
  type Krav,
  type Kravpost,
  type Standpunkt,
  type Standpunktsart,
  type Standpunktsvirkning,
  type Vederlagsutregning,
} from '../../typer.ts';

/**
 * Standpunktene i svaret på vederlaget, etter `STANDPUNKTER_I_SPORET`: § 34.1.2, oppgjørsformen
 * og beløpet for hver kravpost, § 34.1.3 og de særskilte postene (OV-U27, OV-U28, KA-U57).
 * Rekkefølgen kontrolleres i `kontrollerVederlagsstandpunktene`, fordi kravpostene gjentar seg.
 */
export const STANDPUNKTER_I_VEDERLAGET: { art: Standpunktsart; paakrevd: boolean }[] = [
  { art: 'rettidighet', paakrevd: false },
  { art: 'oppgjoersform', paakrevd: false },
  { art: 'justering', paakrevd: false },
  { art: 'beloep', paakrevd: true },
];

/** Hjemmelen i standpunktet til oppgjørsformen etter TEs oppgjørsform (KA-U57 (d), KA-U54). */
export const OPPGJOERSHJEMMEL = {
  tilbud: '34.2.2',
  enhetspriser: '34.3',
  regningsarbeid: '34.4',
} as const;

/** Oppgjørsformene byggherren kan mene for kravposten, når tilbudet ikke er akseptert (§ 34.2.2). */
export const METODER = ['enhetspriser', 'regningsarbeid'] as const satisfies readonly NonNullable<
  Extract<Standpunkt, { art: 'oppgjoersform' }>['oensket']
>[];

const POSITIVT_BELOEP: Skjema = { type: 'number', exclusiveMinimum: 0 };
const BELOEPSPOST = objekt({ beloep: POSITIVT_BELOEP }, ['beloep']);

/** Betegnelsen kommandoen tildeler en kravpost: P1, P2 … (KA-U53). */
export const BETEGNELSE = '^P[1-9][0-9]*$';

/**
 * Dokumentet sendt utenfor løsningen som TE legger til i kravskjemaet som varselet for
 * kravposten, med datoen og typen. Det skrives som et registrert varsel før kravet (VS-U53).
 */
const KRAVPOSTVARSEL_I_KOMMANDOEN: Skjema = objekt(
  {
    sendt: DATO,
    korrespondansetype: { enum: [...KORRESPONDANSETYPER] },
    dokumentasjon: liste(ID),
  },
  ['sendt', 'korrespondansetype', 'dokumentasjon']
);

/**
 * En kravpost med feltene oppgjørsformen har (OV-U95 punkt 19, KA-U66). I kommandoen har en
 * ny kravpost ingen `id`, og ingen kravpost har `betegnelse`: serveren setter dem
 * (`kommandoer/skriving.ts`). En kravpost fra forrige versjon har sin `id`.
 */
function kravpost(lagret: boolean): Skjema {
  const felles = {
    id: ID,
    ...(lagret ? { betegnelse: { type: 'string', pattern: BETEGNELSE } } : {}),
    beskrivelse: TEKST,
    pns: TEKST,
    // VS-U54: varselet etter § 34.3.3 eller § 34.4 for kravposten, når det er gitt før kravet.
    // I kommandoen kan det også være dokumentet TE legger til i kravskjemaet (VS-U51, VS-U53).
    varsel: lagret ? ID : { anyOf: [ID, KRAVPOSTVARSEL_I_KOMMANDOEN] },
  };
  const paakrevd = lagret
    ? ['id', 'betegnelse', 'beskrivelse', 'oppgjoersform']
    : ['beskrivelse', 'oppgjoersform'];
  return {
    anyOf: [
      objekt({ ...felles, oppgjoersform: { const: 'tilbud' }, beloep: POSITIVT_BELOEP }, [
        ...paakrevd,
        'beloep',
      ]),
      objekt(
        {
          ...felles,
          oppgjoersform: { const: 'enhetspriser' },
          justert: { type: 'boolean' },
          anslag: POSITIVT_BELOEP,
        },
        paakrevd
      ),
      objekt(
        {
          ...felles,
          oppgjoersform: { const: 'regningsarbeid' },
          kostnadsoverslag: POSITIVT_BELOEP,
        },
        paakrevd
      ),
    ],
  };
}

/**
 * Innholdet i vederlagskravet, lagret eller i kommandoen. `saerskilt` er postene utenfor
 * kravpostene: kravet etter § 34.1.3 annet ledd (OV-U89 punkt 6). Rigg og drift i forlenget
 * byggetid (OV-U89 punkt 17) er ikke i formatet før #1724 har satt formen, så en lagret rad med
 * posten er ikke forstått (#1775). `trekker` er kravpostene fra forrige versjon TE trekker (KA-U56).
 * Formen følger OV-U95 punkt 19–22 og arbeidsvalget 07.11 i domenetabellen.
 */
export function vederlagsinnhold(lagret: boolean): {
  properties: Skjema;
  required: string[];
  anyOf: Skjema[];
} {
  return {
    properties: {
      kravposter: liste(kravpost(lagret)),
      saerskilt: objekt({ produktivitet: BELOEPSPOST }, ['produktivitet']),
      trekker: liste(ID),
    },
    required: [],
    anyOf: [{ required: ['kravposter'] }, { required: ['saerskilt'] }],
  };
}

/**
 * Skjemaene for standpunktene bare vederlaget har. Rettidigheten er felles og står i
 * `STANDPUNKT` i `format/format.ts`.
 */
export const STANDPUNKT_I_VEDERLAGET: Record<'beloep' | 'oppgjoersform' | 'justering', Skjema> = {
  // OV-U26, OV-U31: beløpet byggherren godtar for posten uten begrensningen etter § 34.1.3.
  // Posten er kravposten `gjelder` eller den særskilte `saerskilt`, ikke begge (`standpunktIVederlaget`).
  // Uten `beloep` når tilbudet for kravposten ikke er akseptert (KA-U72, `kontrollerVederlagsstandpunktene`).
  beloep: objekt(
    {
      ...artfelt('beloep'),
      beloep: { type: 'number', minimum: 0 },
      gjelder: ID,
      saerskilt: { enum: [...SAERSKILTE] },
    },
    ['id', 'art'],
    [{ required: ['gjelder'] }, { required: ['saerskilt'] }]
  ),
  // KA-U57 (d), KA-U54: standpunktet til TEs oppgjørsform for kravposten `gjelder`, med TEs
  // oppgjørsform som hjemmel. KA-U69, KA-U71: kravet om spesifisert tilbud
  // (`standpunktIVederlaget`).
  oppgjoersform: objekt(
    {
      ...artfelt('oppgjoersform'),
      gjelder: ID,
      hjemmel: { enum: ['34.2.2', '34.3', '34.4'] },
      aksepterer: { type: 'boolean' },
      oensket_oppgjoersform: { enum: [...METODER] },
      krever_tilbud: { const: true },
    },
    ['id', 'art', 'gjelder', 'hjemmel', 'aksepterer']
  ),
  // § 34.3.2, KA-U68: standpunktet til justeringen av enhetsprisene for kravposten `gjelder`.
  justering: objekt(
    {
      ...artfelt('justering'),
      gjelder: ID,
      hjemmel: { const: '34.3.2' },
      godtar: { type: 'boolean' },
    },
    ['id', 'art', 'gjelder', 'hjemmel', 'godtar']
  ),
};

/** Serverens utregning i svaret på vederlaget, etter B-13. */
export const UTREGNING_I_VEDERLAGET: Skjema = objekt(
  {
    resultat: { enum: [...VEDERLAGSRESULTATER] },
    godkjent_beloep: { type: 'number', minimum: 0 },
    subsidiaert_resultat: { enum: [...VEDERLAGSRESULTATER] },
    subsidiaert_godkjent_beloep: { type: 'number', minimum: 0 },
    // OV-U31, KA-U57 (e): én rad per post med ett element per lag. `kontrollerUtregningenPerPost`
    // kontrollerer radene mot standpunktene og totalene.
    poster: liste(
      objekt(
        {
          gjelder: ID,
          saerskilt: { enum: ['produktivitet'] },
          lag: liste(
            objekt(
              { lag: { type: 'integer', minimum: 1 }, beloep: { type: 'number', minimum: 0 } },
              ['lag']
            )
          ),
        },
        ['lag']
      )
    ),
  },
  ['resultat', 'godkjent_beloep', 'poster']
);

/** Vederlagskravet, etter `KRAVINNHOLD.vederlag`: kravpostene, postene utenfor dem og trekket. */
export interface Vederlagsinnhold {
  kravposter: readonly Kravpost[];
  saerskilt: { produktivitet?: { beloep: number }; rigg_og_drift?: { beloep: number } };
  trekker: readonly string[];
}

/** Vederlagskravet i kravet. */
export function innholdIVederlaget(krav: Pick<Krav, 'innhold'>): Vederlagsinnhold {
  const innhold = krav.innhold as Partial<Vederlagsinnhold>;
  return {
    kravposter: innhold.kravposter ?? [],
    saerskilt: innhold.saerskilt ?? {},
    trekker: innhold.trekker ?? [],
  };
}

/**
 * Et krevd beløp i vederlagskravet, i øre, eller `null` når det ikke står i kravet. Et
 * beløp som ikke er et tall, kaster `Error` og ikke `UgyldigBeloep`: det står i kravet,
 * så det er en feil på serveren og ikke byggherrens ugyldige vurdering (#766).
 */
function lesKrevd(krav: Krav, verdi: number | undefined): Oere | null {
  try {
    return beloep(verdi);
  } catch (feil) {
    if (!(feil instanceof UgyldigBeloep)) throw feil;
    throw new Error(`Det krevde beløpet i kravet ${krav.id} kan ikke leses: ${feil.message}.`);
  }
}

/** OV-U23: kravet krever posten etter § 34.1.3 annet ledd (`saerskilt.produktivitet`). */
export const harProduktivitetspost = (krav: Krav): boolean =>
  innholdIVederlaget(krav).saerskilt.produktivitet !== undefined;

/** Kravpostene i en lagret kravversjon (OV-U95 punkt 19). */
export const kravposterI = (krav: Pick<Krav, 'innhold'>): readonly Kravpost[] =>
  innholdIVederlaget(krav).kravposter;

/** OV-U95 punkt 19: kravet har kravposter i vederlagsjusteringen, i tillegg til eller uten postene utenfor. */
export const harHovedbeloep = (krav: Krav): boolean => kravposterI(krav).length > 0;

/** Det krevde beløpet i en kravpost med fast sum, i øre, eller `null` etter en beregningsregel. */
export const krevdIKravposten = (krav: Krav, post: Kravpost): Oere | null =>
  post.oppgjoersform === 'tilbud' ? lesKrevd(krav, post.beloep) : null;

/** Det krevde beløpet for rigg og drift i forlenget byggetid, i øre, eller `null` uten posten (OV-U89 punkt 17). */
export const krevdRigg = (krav: Krav): Oere | null =>
  lesKrevd(krav, innholdIVederlaget(krav).saerskilt.rigg_og_drift?.beloep);

/** Det krevde beløpet i posten etter § 34.1.3 annet ledd, i øre, eller `null` uten posten. */
export const krevdProduktivitet = (krav: Krav): Oere | null =>
  lesKrevd(krav, innholdIVederlaget(krav).saerskilt.produktivitet?.beloep);

/**
 * Summen av de krevde faste beløpene i kravet, i øre: kravpostene med fast sum, kravet etter
 * § 34.1.3 annet ledd og rigg og drift. En kravpost etter en beregningsregel har ikke et krevd
 * beløp og regnes ikke med (OV-U95 punkt 2 og 19, OV-U73).
 */
export const krevdSamlet = (krav: Krav): Oere =>
  kravposterI(krav).reduce((sum, p) => sum + (krevdIKravposten(krav, p) ?? 0n), 0n) +
  (krevdProduktivitet(krav) ?? 0n) +
  (krevdRigg(krav) ?? 0n);

/** Utregningen i et svar på vederlaget. */
export const utregningIVederlaget = (utregning: Record<string, unknown>): Vederlagsutregning =>
  utregning as unknown as Vederlagsutregning;

/**
 * Et standpunkt bare vederlaget har, lest av elementet leseren har kontrollert mot skjemaet, med
 * beløpet fra utregningen, eller `null` for en annen art. Kaster `Uforstaatt`.
 */
function standpunktIVederlaget(
  e: Record<string, unknown>,
  utregning: Record<string, unknown>,
  sti: string
): Standpunkt | null {
  const id = e.id as string;
  const art = e.art as Standpunktsart;
  const vederlag = utregningIVederlaget(utregning);
  switch (art) {
    case 'oppgjoersform': {
      const hjemmel = e.hjemmel as '34.2.2' | '34.3' | '34.4';
      const kreverTilbud = e.krever_tilbud === true;
      // Arbeidsvalget i #479: oppgjørsformen byggherren mener, står bare uten aksept. KA-U71 og
      // svar 3 A 10.11: med kravet om tilbud kan den mangle, og kravet gjelder bare en
      // beregningsregel og bare uten aksept.
      if (
        (e.aksepterer && 'oensket_oppgjoersform' in e) ||
        (!e.aksepterer && !kreverTilbud && !('oensket_oppgjoersform' in e))
      )
        throw new Uforstaatt(
          `${sti}: oppgjørsformen i standpunktet til oppgjørsformen stemmer ikke med aksepten`
        );
      if (kreverTilbud && (e.aksepterer || hjemmel === '34.2.2'))
        throw new Uforstaatt(
          `${sti}: kravet om tilbud står bare for en beregningsregel byggherren ikke godtar (KA-U69, KA-U71)`
        );
      // OV-U95 punkt 1 og 5: byggherren mener ikke den beregningsregelen TE krever.
      if (OPPGJOERSFORM_I_HJEMMELEN[hjemmel] === e.oensket_oppgjoersform)
        throw new Uforstaatt(`${sti}: byggherren mener den oppgjørsformen TE krever`);
      return {
        id,
        art,
        gjelder: e.gjelder as string,
        hjemmel,
        aksepterer: e.aksepterer as boolean,
        ...('oensket_oppgjoersform' in e
          ? { oensket: e.oensket_oppgjoersform as 'enhetspriser' }
          : {}),
        ...(kreverTilbud ? { kreverTilbud: true as const } : {}),
      };
    }
    case 'justering':
      return {
        id,
        art,
        gjelder: e.gjelder as string,
        hjemmel: '34.3.2',
        godtar: e.godtar as boolean,
      };
    case 'beloep':
      if ('gjelder' in e === 'saerskilt' in e)
        throw new Uforstaatt(`${sti}: beløpet gjelder ikke nøyaktig én post`);
      // Rigg og drift er ikke i kjernens svar ennå (#1663), så standpunktet er ikke forstått (MM-U2).
      if (e.saerskilt === 'rigg_og_drift')
        throw new Uforstaatt(`${sti}: rigg og drift er ikke i kjernens svar ennå`);
      return {
        id,
        art,
        resultat: vederlag.subsidiaert_resultat ?? vederlag.resultat,
        ...('beloep' in e ? { godkjent: e.beloep as number } : {}),
        ...('gjelder' in e
          ? { gjelder: e.gjelder as string }
          : { saerskilt: 'produktivitet' as const }),
      };
    default:
      return null;
  }
}

/**
 * OV-U27, OV-U28, KA-U57: i vederlaget står § 34.1.2, oppgjørsformen og beløpet for hver kravpost,
 * § 34.1.3 og posten etter § 34.1.3 annet ledd i den rekkefølgen. § 34.1.2, § 34.1.3 og posten
 * står høyst én gang, og hver kravpost har høyst ett standpunkt til oppgjørsformen, rett foran
 * beløpet, og ett beløp. OV-U31: postene summerer til det byggherren godtar om ingen påberopelse
 * fører fram.
 */
function kontrollerVederlagsstandpunktene(
  ut: Standpunkt[],
  utregning: Vederlagsutregning,
  sti: string
): void {
  const plass = (s: Standpunkt) =>
    s.art === 'rettidighet'
      ? s.hjemmel === '34.1.2'
        ? 0
        : s.hjemmel === '34.1.3'
          ? 3
          : 1
      : s.art === 'oppgjoersform' || s.art === 'justering' || (s.art === 'beloep' && !s.saerskilt)
        ? 1
        : s.art === 'beloep'
          ? 4
          : -1;
  const plasser = ut.map(plass);
  const sett = new Set<string>();
  // KA-U64, KA-U68: for hver kravpost oppgjørsformen, varselet etter § 34.3.3 eller § 34.4 og
  // justeringen, i den rekkefølgen og hver høyst én gang, rett foran beløpet for samme kravpost.
  const rekkefoelgen = ['oppgjoersform', 'rettidighet', 'justering', 'beloep'];
  const gjelder = (s: Standpunkt | undefined) => (s && 'gjelder' in s ? s.gjelder : undefined);
  /** Indeksen til beløpet som avslutter kravposten som begynner i `i`, eller -1. */
  const slutten = (i: number): number => {
    const g = gjelder(ut[i]);
    if (g === undefined || sett.has(g)) return -1;
    sett.add(g);
    let n = i;
    while (ut[n]!.art !== 'beloep') {
      const neste = ut[n + 1];
      if (
        gjelder(neste) !== g ||
        rekkefoelgen.indexOf(neste!.art) <= rekkefoelgen.indexOf(ut[n]!.art)
      )
        return -1;
      n++;
    }
    return n;
  };
  let iKravpostene = true;
  for (let i = 0; i < ut.length && iKravpostene; i++)
    if (plasser[i] === 1) {
      const n = slutten(i);
      if (n < 0) iKravpostene = false;
      else i = n;
    }
  if (
    plasser.some((p, i) => i > 0 && (p < plasser[i - 1] || (p === plasser[i - 1] && p !== 1))) ||
    !iKravpostene
  )
    throw new Uforstaatt(
      `${sti}: standpunktene i vederlaget står ikke i rekkefølgen § 34.1.2, oppgjørsformen og beløpet for hver kravpost, § 34.1.3 og posten etter annet ledd`
    );
  // KA-U72: standpunktet til beløpet står uten beløp når, og bare når, tilbudet ikke er akseptert
  // eller kravposten følger en beregningsregel (OV-U95 punkt 5).
  const utenBeloep = utenFastBeloep(ut);
  const regelposter = new Set(
    ut.flatMap((s) => (s.art === 'oppgjoersform' && s.hjemmel !== '34.2.2' ? [s.gjelder] : []))
  );
  for (const s of ut)
    if (s.art === 'beloep' && (s.godkjent === undefined) !== utenBeloep.has(s.gjelder!))
      throw new Uforstaatt(
        s.godkjent === undefined
          ? `${sti}: standpunktet til beløpet står uten beløp, men byggherren aksepterer tilbudet for posten (KA-U72)`
          : regelposter.has(s.gjelder!)
            ? `${sti}: standpunktet til beløpet har et beløp, men kravposten følger en beregningsregel (OV-U95 punkt 5)`
            : `${sti}: standpunktet til beløpet har et beløp, men byggherren aksepterer ikke tilbudet for posten (KA-U72)`
      );
  // VS-U5: begrensningen etter § 34.1.3 gjelder posten etter annet ledd.
  if (plasser.includes(3) && !plasser.includes(4))
    throw new Uforstaatt(`${sti}: rettidigheten etter § 34.1.3 står uten posten etter annet ledd`);
  // Valg 2 i #1047: beløpet etter begrensningen er høyst det byggherren godtar for posten.
  const begrenset = ut.find((s) => s.art === 'rettidighet' && s.hjemmel === '34.1.3');
  const post = ut.find((s) => s.art === 'beloep' && s.saerskilt);
  if (
    begrenset?.art === 'rettidighet' &&
    begrenset.begrenset !== undefined &&
    post?.art === 'beloep'
  ) {
    // Skjemaet har alt avvist et negativt beløp.
    if (beloep(begrenset.begrenset)! > beloep(post.godkjent)!)
      throw new Uforstaatt(
        `${sti}: beløpet etter begrensningen er høyere enn det byggherren godtar for posten`
      );
  }
  const poster = ut.flatMap((s) =>
    s.art === 'beloep' && s.godkjent !== undefined ? [s.godkjent] : []
  );
  const samlet = poster.reduce((a, b) => a + (beloep(b) ?? 0n), 0n);
  const total = utregning.subsidiaert_godkjent_beloep ?? utregning.godkjent_beloep;
  if (samlet !== beloep(total))
    throw new Uforstaatt(
      `${sti}: postene summerer ikke til det byggherren godtar om ingen påberopelse fører fram`
    );
}

/**
 * OV-U31, KA-U57 (e): utregningen har én rad per beløp i standpunktene, i samme rekkefølge og med
 * samme post, og like mange lag i hver rad. Beløpet i det siste laget er det byggherren godtar
 * for posten. Et lag uten beløp står bare for en kravpost der tilbudet ikke er akseptert, og en
 * slik kravpost har 0 kr i laget for § 34.1.2 når påberopelsen har virkning, og ellers ikke
 * beløp (KA-U72, OV-U27). Det byggherren godtar prinsipalt og subsidiært, er summen av det
 * første og det siste laget, og det subsidiære står bare med mer enn ett lag. Antallet lag er
 * det høyeste laget i beslutningsgrunnlaget.
 */
function kontrollerUtregningenPerPost(
  ut: Standpunkt[],
  utregning: Vederlagsutregning,
  virkninger: Standpunktsvirkning[],
  sti: string
): void {
  const rader = utregning.poster;
  const beloepene = ut.filter((s) => s.art === 'beloep');
  const utenAksept = utenFastBeloep(ut);
  const antall = rader[0]?.lag.length ?? 0;
  const hele = ut.find((s) => s.art === 'rettidighet' && s.hjemmel === '34.1.2');
  const prekludert = Number(
    hele !== undefined &&
      typeof virkninger.find((v) => v.standpunkt === hele.id)?.virkning === 'number'
  );
  const feil = (hva: string) => new Uforstaatt(`${sti}.utregning.poster: ${hva}`);
  if (rader.length !== beloepene.length) throw feil('radene er ikke én per post i standpunktene');
  rader.forEach((r, i) => {
    const b = beloepene[i];
    if (
      'gjelder' in r === 'saerskilt' in r ||
      r.gjelder !== b.gjelder ||
      r.saerskilt !== b.saerskilt
    )
      throw feil(`rad ${i + 1} gjelder ikke samme post som beløpet i standpunktene`);
    if (r.lag.length !== antall || r.lag.some((l, n) => l.lag !== n + 1))
      throw feil(`rad ${i + 1} har ikke lagene 1 til ${antall}`);
    if (beloep(r.lag.at(-1)!.beloep) !== beloep(b.godkjent))
      throw feil(`rad ${i + 1} har ikke beløpet byggherren godtar i det siste laget`);
    if (!utenAksept.has(r.gjelder!)) {
      if (r.lag.some((l) => !('beloep' in l)))
        throw feil(
          `rad ${i + 1} mangler beløpet i et lag, men byggherren aksepterer tilbudet for posten (KA-U72)`
        );
    } else if (r.lag.some((l, n) => (n < prekludert ? beloep(l.beloep) !== 0n : 'beloep' in l)))
      throw feil(
        `rad ${i + 1} har ikke 0 kr i laget for § 34.1.2 og ellers ingen beløp, men byggherren aksepterer ikke tilbudet for posten (KA-U72, OV-U27)`
      );
  });
  // OV-U32, #1774: lagene i utregningen er lagene i beslutningsgrunnlaget.
  const lagIGrunnlaget = Math.max(
    1,
    ...virkninger.flatMap((v) => (typeof v.virkning === 'number' ? [v.virkning] : []))
  );
  if (rader.length > 0 && antall !== lagIGrunnlaget)
    throw feil(`radene har ${antall} lag, men beslutningsgrunnlaget har ${lagIGrunnlaget}`);
  const summen = (n: number) =>
    rader.map((r) => r.lag.at(n)!).reduce((a, l) => a + (beloep(l.beloep) ?? 0n), 0n);
  if (summen(0) !== beloep(utregning.godkjent_beloep))
    throw feil('det første laget summerer ikke til det byggherren godtar prinsipalt');
  if (antall > 1 !== 'subsidiaert_godkjent_beloep' in utregning)
    throw feil('det subsidiære beløpet står ikke nøyaktig når svaret har mer enn ett lag');
  if (antall > 1 && summen(-1) !== beloep(utregning.subsidiaert_godkjent_beloep))
    throw feil('det siste laget summerer ikke til det byggherren godtar subsidiært');
}

/** OV-U95 punkt 5: oppgjørsformen TE krever etter en beregningsregel, i hjemmelen. */
const OPPGJOERSFORM_I_HJEMMELEN = {
  '34.2.2': null,
  '34.3': 'enhetspriser',
  '34.4': 'regningsarbeid',
} as const;

/**
 * Kravpostene uten fast beløp i svaret: tilbudet er ikke akseptert (KA-U72), eller kravposten
 * følger en beregningsregel (OV-U95 punkt 5).
 */
const utenFastBeloep = (ut: Standpunkt[]): Set<string> =>
  new Set(
    ut.flatMap((s) =>
      s.art === 'oppgjoersform' && (!s.aksepterer || s.hjemmel !== '34.2.2') ? [s.gjelder] : []
    )
  );

/** Det som er vederlagets eget i lesingen av svaret (`SVARLESING` i `format/leser.ts`). */
export const LESING_I_VEDERLAGET = {
  standpunkt: standpunktIVederlaget,
  // Oppgjørsformen og beløpet gjentar seg per kravpost.
  gjentas: true,
  // VS-U24, OV-U22: rettidigheten etter § 34.1.3. KA-U64: varselet etter § 34.3.3 eller § 34.4
  // for en kravpost.
  rettidighet: ['34.1.3', '34.3.3', '34.4'],
  subsidiaertVerdi: 'subsidiaert_godkjent_beloep',
  kontrollerStandpunktene: (ut: Standpunkt[], utregning: Record<string, unknown>, sti: string) =>
    kontrollerVederlagsstandpunktene(ut, utregningIVederlaget(utregning), sti),
  kontrollerUtregningen: (
    ut: Standpunkt[],
    utregning: Record<string, unknown>,
    virkninger: Standpunktsvirkning[],
    sti: string
  ) => kontrollerUtregningenPerPost(ut, utregningIVederlaget(utregning), virkninger, sti),
  // OV-U32, OV-U33: en beregningsregel byggherren ikke godtar og et tilbud byggherren ikke
  // aksepterer, er innsigelser som rammer bare posten (arbeidsvalg 1 punkt 2 i spørsmålsfila
  // 09.11 for #1663, #1760).
  innsigelserMotPosten: (standpunkter: Standpunkt[]) =>
    new Set(
      standpunkter.flatMap((s) => (s.art === 'oppgjoersform' && !s.aksepterer ? [s.id] : []))
    ),
} satisfies Svarlesing;
