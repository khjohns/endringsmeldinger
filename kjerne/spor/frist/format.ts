/**
 * Formatet for fristen (#1783): skjemaene for fristkravet, standpunktene og utregningen i svaret,
 * og tilgangen til kravinnholdet og utregningen med typen for sporet. De felles modulene i
 * `format/` slår opp her.
 */

import { FRISTRESULTATER } from '../../regler/typer.ts';
import {
  artfelt,
  ID,
  liste,
  objekt,
  TEKST,
  Uforstaatt,
  type Skjema,
  type Svarlesing,
} from '../../format/skjema.ts';
import type {
  Fristrad,
  Fristutregning,
  Hjemmel,
  Krav,
  Standpunkt,
  Standpunktsart,
  Standpunktsvirkning,
} from '../../typer.ts';
import { kontrollerRadene } from '../poster/format.ts';

/** Standpunktene i svaret på fristkravet, etter `TILLATTE_STANDPUNKTER`. */
export const TILLATTE_STANDPUNKTER_I_FRISTEN: { art: Standpunktsart; paakrevd: boolean }[] = [
  // § 33.4, så § 33.6.2 (VS-U17). Én for hver hjemmel (`kontrollerHjemleneIFristen`).
  { art: 'rettidighet', paakrevd: false },
  { art: 'rettidighet', paakrevd: false },
  { art: 'hindring', paakrevd: false },
  { art: 'spesifisering', paakrevd: false },
  { art: 'dager', paakrevd: true },
];

const DAGER: Skjema = { type: 'integer', minimum: 1 };

/**
 * Én frist i kravet med dagene for den (KA-U73, KA-U74, KA-U79): en frist i fristtabellen for
 * prosjektet (`frist_id`), eller en frist som ikke er registrert, med nummeret og navnet
 * kontrakten gir den. I kommandoen sender klienten bare `frist_id` og dagene for en registrert
 * frist, og `id` bare for å erstatte en frist som ikke er registrert. Serveren setter `id`, og
 * nummeret og navnet fra fristtabellen (`kommandoer/skriving.ts`). Kravet har ingen sum (U-1).
 */
function fristIKravet(lagret: boolean): Skjema {
  return {
    anyOf: [
      objekt(
        {
          id: ID,
          frist_id: { type: 'integer', minimum: 1 },
          ...(lagret ? { nummer: TEKST, navn: TEKST } : {}),
          dager: DAGER,
        },
        lagret ? ['id', 'frist_id', 'navn', 'dager'] : ['frist_id', 'dager']
      ),
      objekt(
        { id: ID, nummer: TEKST, navn: TEKST, dager: DAGER },
        lagret ? ['id', 'navn', 'dager'] : ['navn', 'dager']
      ),
    ],
  };
}

/**
 * Innholdet i fristkravet, lagret eller i kommandoen, etter `KRAVINNHOLD`. `trekker` er fristene
 * fra forrige versjon TE trekker (KA-U76).
 */
export function fristinnhold(lagret: boolean): {
  properties: Skjema;
  required: string[];
  anyOf?: Skjema[];
} {
  return {
    properties: { frister: liste(fristIKravet(lagret)), trekker: liste(ID) },
    required: ['frister'],
  };
}

/** HF-U1, LV-U18 punkt 3: forespørselen etter § 33.6.2 fristkravet svarer på. */
export const RELASJON_I_FRISTKRAVET: Record<string, Skjema> = { gjelder: ID };

/** Skjemaene for standpunktene i svaret på fristkravet, etter `STANDPUNKT`. */
export const STANDPUNKT_I_FRISTEN: Record<'hindring' | 'spesifisering' | 'dager', Skjema> = {
  hindring: objekt({ ...artfelt('hindring'), oppfylt: { type: 'boolean' } }, [
    'id',
    'art',
    'oppfylt',
  ]),
  // `gjelder` er kravet. Dagene byggherren måtte forstå, står for hver frist i kravet (D-5).
  spesifisering: objekt(
    {
      ...artfelt('spesifisering'),
      gjelder: ID,
      hjemmel: { const: '33.6.1' },
      i_tide: { type: 'boolean' },
      maatte_forstaa: liste(
        objekt({ frist: ID, dager: { type: 'integer', minimum: 0 } }, ['frist', 'dager'])
      ),
    },
    ['id', 'art', 'gjelder', 'hjemmel', 'i_tide']
  ),
  // KA-U74: ett standpunkt om dagene for hver frist i kravet.
  dager: objekt({ ...artfelt('dager'), gjelder: ID }, ['id', 'art', 'gjelder']),
};

const FRISTRESULTAT: Skjema = { enum: [...FRISTRESULTATER] };
const DAGER_I_SVARET: Skjema = { type: 'integer', minimum: 0 };

/**
 * Serverens utregning etter B-13, etter `UTREGNINGSSKJEMA`: én rad per frist, med dagene for den
 * fristen. Svaret har ingen sum (KA-U74, U-12).
 */
export const UTREGNINGSSKJEMA_I_FRISTEN: Skjema = objekt(
  {
    frister: liste(
      objekt(
        {
          gjelder: ID,
          resultat: FRISTRESULTAT,
          godkjent_dager: DAGER_I_SVARET,
          subsidiaert_resultat: FRISTRESULTAT,
          subsidiaert_godkjent_dager: DAGER_I_SVARET,
          // KA-U78, OV-U32: dagene i hvert lag. `kontrollerUtregningenIFristen` kontrollerer dem.
          lag: liste(
            objekt({ lag: { type: 'integer', minimum: 1 }, dager: DAGER_I_SVARET }, [
              'lag',
              'dager',
            ])
          ),
        },
        ['gjelder', 'resultat', 'godkjent_dager', 'lag']
      )
    ),
  },
  ['frister']
);

/** En frist i fristtabellen for prosjektet, slik serveren gir den i `Kontekst` (GFK-U18). */
export interface Registrertfrist {
  fristId: number;
  /** `null` når kontrakten ikke nummererer fristen. */
  nummer: string | null;
  navn: string;
}

/** En frist i en lagret kravversjon, med dagene for den (KA-U74, KA-U79). */
export interface FristIKravet {
  id: string;
  /** Fristen i fristtabellen, eller ingen når fristen ikke er registrert. */
  frist_id?: number;
  nummer?: string;
  navn: string;
  dager: number;
}

/** Fristkravet, etter `KRAVINNHOLD.frist`. */
export interface Fristinnhold {
  frister: FristIKravet[];
  trekker: string[];
}

/** Fristkravet i kravet. */
export const innholdIFristen = (krav: Pick<Krav, 'innhold'>): Fristinnhold => ({
  frister: krav.innhold.frister as FristIKravet[],
  trekker: (krav.innhold.trekker as string[] | undefined) ?? [],
});

/** Fristen slik kontrakten betegner den: nummeret, når den har et, og navnet (U-1). */
export const betegnelsen = (f: { nummer?: string | null; navn: string }): string =>
  f.nummer ? `${f.nummer} ${f.navn}` : f.navn;

/**
 * Utregningen i et svar på fristen (#1777). Den lagrede formen er `Svar.utregning`, og leseren
 * kontrollerer den mot `UTREGNINGSSKJEMA` i `format/format.ts`. Frysingen før skrivingen leser
 * standpunktene med en utregning som ikke er kontrollert, så et felt kan mangle der.
 */
export const utregningIFristen = (utregning: Record<string, unknown>): Fristutregning =>
  utregning as unknown as Fristutregning;

type Data = Record<string, unknown>;

/** Raden for fristen `gjelder` i utregningen. */
const radenFor = (utregning: Data, gjelder: string, sti: string): Fristrad => {
  const rad = utregningIFristen(utregning).frister.find((r) => r.gjelder === gjelder);
  if (!rad) throw new Uforstaatt(`${sti}: utregningen har ingen rad for fristen ${gjelder}`);
  return rad;
};

/** Standpunktene som er fristens egne, lest av det lagrede svaret. Rettidigheten leses felles. */
function standpunktIFristen(e: Data, utregning: Data, sti: string): Standpunkt | null {
  const id = e.id as string;
  switch (e.art) {
    case 'hindring':
      return { id, art: 'hindring', oppfylt: e.oppfylt as boolean };
    case 'spesifisering': {
      // VS-U4: dagene byggherren måtte forstå, står bare når spesifiseringen kom for sent.
      if (e.i_tide === 'maatte_forstaa' in e)
        throw new Uforstaatt(
          `${sti}: dagene i standpunktet etter § 33.6.1 stemmer ikke med rettidigheten`
        );
      const maatteForstaa = e.maatte_forstaa as { frist: string; dager: number }[] | undefined;
      return {
        id,
        art: 'spesifisering',
        gjelder: e.gjelder as string,
        hjemmel: '33.6.1',
        iTide: e.i_tide as boolean,
        ...(maatteForstaa ? { maatteForstaa: maatteForstaa.map((m) => ({ ...m })) } : {}),
      };
    }
    case 'dager': {
      const gjelder = e.gjelder as string;
      const rad = radenFor(utregning, gjelder, sti);
      return {
        id,
        art: 'dager',
        gjelder,
        resultat: rad.subsidiaert_resultat ?? rad.resultat,
        vurdert: rad.subsidiaert_godkjent_dager ?? rad.godkjent_dager,
      };
    }
    default:
      return null;
  }
}

/**
 * Rekkefølgen i svaret: rettidigheten, hindringen og spesifiseringen én gang (VS-U17, KA-U78),
 * og så dagene for hver frist, én gang per frist og i samme rekkefølge som radene i utregningen.
 * Dagene byggherren måtte forstå, gjelder de samme fristene (D-5).
 */
function kontrollerStandpunkteneIFristen(ut: Standpunkt[], utregning: Data, sti: string): void {
  const rekkefoelge = ['rettidighet', 'hindring', 'spesifisering', 'dager'];
  let forrige = 0;
  for (const s of ut) {
    const plass = rekkefoelge.indexOf(s.art);
    if (plass < forrige || (plass === forrige && s.art !== 'rettidighet' && s.art !== 'dager'))
      throw new Uforstaatt(`${sti}: standpunktet ${s.art} står i feil rekkefølge i fristen`);
    forrige = plass;
  }
  const dagene = ut.flatMap((s) => (s.art === 'dager' ? [s.gjelder] : []));
  const radene = utregningIFristen(utregning).frister;
  if (dagene.join() !== radene.map((r) => r.gjelder).join())
    throw new Uforstaatt(`${sti}: radene i utregningen er ikke én per frist i standpunktene`);
  for (const r of radene)
    if ('subsidiaert_resultat' in r !== 'subsidiaert_godkjent_dager' in r)
      throw new Uforstaatt(
        `${sti}: utregningen for fristen ${r.gjelder} har bare halvparten av det subsidiære standpunktet`
      );
  const spesifisering = ut.find((s) => s.art === 'spesifisering');
  const maatteForstaa =
    spesifisering?.art === 'spesifisering' ? spesifisering.maatteForstaa : undefined;
  if (maatteForstaa && maatteForstaa.map((m) => m.frist).join() !== dagene.join())
    throw new Uforstaatt(
      `${sti}: dagene byggherren måtte forstå, gjelder ikke de samme fristene som standpunktene om dagene`
    );
}

/**
 * KA-U78, OV-U32: hver rad har ett lag for hvert lag i beslutningsgrunnlaget (`kontrollerRadene`),
 * med dagene standpunktet i laget gir fristen: 0 for preklusjon etter § 33.4 eller § 33.6.2 og for
 * at fremdriften ikke ble hindret, dagene byggherren måtte forstå for spesifiseringen, og de
 * vurderte dagene i det siste laget og i hvert lag for et upåvirket standpunkt. Det første laget er `godkjent_dager`, og det subsidiære står
 * bare med mer enn ett lag.
 */
function kontrollerUtregningenIFristen(
  ut: Standpunkt[],
  utregning: Data,
  virkninger: Standpunktsvirkning[],
  sti: string
): void {
  const feil = (hva: string) => new Uforstaatt(`${sti}.utregning.frister: ${hva}`);
  const dagene = ut.filter((s) => s.art === 'dager');
  const virkning = new Map(virkninger.map((v) => [v.standpunkt, v.virkning]));
  const standpunktetI = (lag: number) =>
    ut.find((s) => s.art !== 'dager' && virkning.get(s.id) === lag);
  const rader = utregningIFristen(utregning).frister;
  kontrollerRadene(rader, dagene, virkninger, 'dagene', feil, (r, d, i) => {
    // OV-U33: ingen innsigelse rammer et upåvirket standpunkt om dagene.
    const upaavirket = virkning.get(d.id) === 'upaavirket';
    r.lag.forEach((l, n) => {
      const s = upaavirket ? undefined : standpunktetI(n + 1);
      const dager =
        s?.art === 'spesifisering'
          ? s.maatteForstaa?.find((m) => m.frist === d.gjelder)?.dager
          : s
            ? 0
            : d.vurdert;
      if (l.dager !== dager)
        throw feil(`rad ${i + 1} har ikke dagene standpunktet i lag ${n + 1} gir fristen`);
    });
    if (r.lag[0]!.dager !== r.godkjent_dager)
      throw feil(
        `rad ${i + 1} har ikke dagene byggherren godkjenner prinsipalt i det første laget`
      );
    if (r.lag.length > 1 !== 'subsidiaert_godkjent_dager' in r)
      throw feil(
        `rad ${i + 1} har ikke det subsidiære standpunktet nøyaktig når svaret har mer enn ett lag`
      );
  });
}

/** VS-U24: ett standpunkt for hver bestemmelse, § 33.4 før § 33.6.2. */
function kontrollerHjemleneIFristen(hjemler: Hjemmel[], sti: string): void {
  if (hjemler.length > 1 && (hjemler[0] !== '33.4' || hjemler[1] !== '33.6.2'))
    throw new Uforstaatt(
      `${sti}: rettidigheten står ${hjemler.map((h) => `etter § ${h}`).join(', ')}, men bare § 33.4 og deretter § 33.6.2 er lov`
    );
}

/** Lesingen av svaret på fristkravet, etter `SVARLESING` i `format/leser.ts`. */
export const LESING_I_FRISTEN = {
  standpunkt: standpunktIFristen,
  // KA-U74: dagene gjentar seg per frist, så rekkefølgen kontrolleres av
  // `kontrollerStandpunkteneIFristen`.
  gjentas: true,
  kontrollerStandpunktene: kontrollerStandpunkteneIFristen,
  kontrollerUtregningen: kontrollerUtregningenIFristen,
  // § 33.6.2 (VS-U17, VS-U19): fristen har også rettidigheten av svaret på forespørselen.
  rettidighet: ['33.6.2'],
  subsidiaertVerdi: null,
  kontrollerHjemlene: kontrollerHjemleneIFristen,
} satisfies Svarlesing;
