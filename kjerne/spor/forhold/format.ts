/**
 * Formatet for forholdet (#1783): skjemaene for påberopelsen og standpunktet i svaret, datoen
 * TE oppgir etter VS-U26, og tilgangen til kravinnholdet med typen for sporet. De felles
 * modulene i `format/` slår opp her.
 */

import { foersteUnderkategori } from '../../regler/forhold.ts';
import { FORHOLDSRESULTATER } from '../../regler/typer.ts';
import {
  HOVEDKATEGORIER,
  KATEGORIER,
  UNDERKATEGORIER,
  type Hovedkategori,
} from '../../format/koder.ts';
import {
  artfelt,
  DATO,
  objekt,
  tekst,
  TEKST,
  type Skjema,
  type Svarlesing,
} from '../../format/skjema.ts';
import type { Krav, OppgittDatofelt, Standpunkt, Standpunktsart } from '../../typer.ts';

/** Standpunktene i svaret på påberopelsen, etter `TILLATTE_STANDPUNKTER`. */
export const TILLATTE_STANDPUNKTER_I_FORHOLDET: { art: Standpunktsart; paakrevd: boolean }[] = [
  { art: 'rettidighet', paakrevd: false },
  { art: 'forhold', paakrevd: true },
];

/**
 * VS-U26: datoen varslingsplikten løper fra, som TE oppgir i påberopelsen,
 * etter hovedkategorien. Der § 32.2 gjelder, er det datoen pålegget ble mottatt;
 * i svikt og andre forhold (§ 33.1 b–c) datoen TE ble klar over forholdet.
 * Underkategorien endringsordre har ingen.
 */
export const OPPGITT_DATO = {
  endring: 'paalegg_mottatt',
  svikt: 'klar_over_forholdet',
  andre_forhold: 'klar_over_forholdet',
} as const satisfies Partial<Record<Hovedkategori, OppgittDatofelt>>;

export type OppgittDato = (typeof OPPGITT_DATO)[keyof typeof OPPGITT_DATO];

/**
 * Det datoen gjelder, med ordene meldingene og skjemaet bruker (VS-U26, #698):
 * «TE har oppgitt at pålegget ble mottatt …», «datoen pålegget ble mottatt». Brevet har ordene
 * i `DATOEN_I_BREVET` (LV-U56).
 */
export const DATOEN_GJELDER: Record<OppgittDato, string> = {
  paalegg_mottatt: 'pålegget ble mottatt',
  klar_over_forholdet: 'TE ble klar over forholdet',
};

const OPPGITTE_DATOER = [...new Set(Object.values(OPPGITT_DATO))] as OppgittDato[];

/** Feltet for datoen TE oppgir i kategorien, eller `null` når kategorien ikke har en (VS-U26). */
export function oppgittDato(hovedkategori: unknown, underkategori: unknown): OppgittDato | null {
  if (underkategori === 'endringsordre' || typeof hovedkategori !== 'string') return null;
  return Object.hasOwn(OPPGITT_DATO, hovedkategori)
    ? OPPGITT_DATO[hovedkategori as keyof typeof OPPGITT_DATO]
    : null;
}

// Ingen verdi passer, så feltet finnes ikke i kategorien.
const ikkeI = (felt: readonly string[]): Skjema =>
  Object.fromEntries(felt.map((f) => [f, { enum: [] }]));

/**
 * Hovedkategorien og underkategorien er et par fra `KATEGORIER` (#335, HF-U1).
 * Underkategorien endringsordre har endringsordrens dato eller nummer, som TE
 * oppgir (GR-U16); de andre har det ikke. Datoen etter VS-U26 finnes bare i
 * kategorien den hører til. Den er valgfri i formatet, fordi et registrert brev
 * ikke oppgir den; kommandoen krever den.
 */
const KATEGORIPAR: Skjema[] = HOVEDKATEGORIER.flatMap((h) => {
  const under: readonly string[] = KATEGORIER[h];
  const andre = under.filter((u) => u !== 'endringsordre');
  const dato = oppgittDato(h, andre[0]);
  const par: Skjema[] = [];
  if (andre.length)
    par.push({
      properties: {
        hovedkategori: { const: h },
        underkategori: { enum: andre },
        ...ikkeI(['endringsordre', ...OPPGITTE_DATOER.filter((d) => d !== dato)]),
      },
    });
  if (under.includes('endringsordre'))
    par.push({
      properties: {
        hovedkategori: { const: h },
        underkategori: { const: 'endringsordre' },
        ...ikkeI(OPPGITTE_DATOER),
      },
      required: ['endringsordre'],
    });
  return par;
});

/** Innholdet i påberopelsen, etter `KRAVINNHOLD`. */
export const FORHOLDSINNHOLD: { properties: Skjema; required: string[]; anyOf?: Skjema[] } = {
  properties: {
    hovedkategori: { enum: HOVEDKATEGORIER },
    underkategori: { enum: UNDERKATEGORIER },
    endringsordre: TEKST,
    paalegg_mottatt: DATO,
    klar_over_forholdet: DATO,
  },
  required: ['hovedkategori', 'underkategori'],
  anyOf: KATEGORIPAR,
};

/** Skjemaet for standpunktet til forholdet, etter `STANDPUNKT`. */
export const STANDPUNKT_I_FORHOLDET: Record<'forhold', Skjema> = {
  forhold: objekt({ ...artfelt('forhold'), resultat: { enum: [...FORHOLDSRESULTATER] } }, [
    'id',
    'art',
    'resultat',
  ]),
};

/**
 * Påberopelsen av forholdet, etter `KRAVINNHOLD.forhold`. Kategorien er tekst og ikke
 * `Hovedkategori`: det syntetiske kravet i `svaretBlirEndringsordre` er ikke lest mot skjemaet.
 * Datoene er valgfrie (VS-U26).
 */
export interface Forholdsinnhold {
  hovedkategori: string | null;
  underkategori: string | null;
  endringsordre: string | null;
  datoer: Readonly<Record<OppgittDatofelt, string | null>>;
}

/** Påberopelsen av forholdet i kravet. Uten krav er alle feltene `null`. */
export function innholdIForholdet(krav: Pick<Krav, 'innhold'> | null | undefined): Forholdsinnhold {
  const innhold = krav?.innhold ?? {};
  return {
    hovedkategori: tekst(innhold.hovedkategori),
    underkategori: tekst(foersteUnderkategori(innhold.underkategori as string | string[] | null)),
    endringsordre: tekst(innhold.endringsordre),
    datoer: {
      paalegg_mottatt: tekst(innhold.paalegg_mottatt),
      klar_over_forholdet: tekst(innhold.klar_over_forholdet),
    },
  };
}

/** Hovedkategorien og den første underkategorien i påberopelsen. */
export function kategori(krav: Pick<Krav, 'innhold'> | null | undefined) {
  const { hovedkategori, underkategori } = innholdIForholdet(krav);
  return { hovedkategori, underkategori };
}

function standpunktIForholdet(e: Record<string, unknown>): Standpunkt | null {
  return e.art === 'forhold'
    ? { id: e.id as string, art: 'forhold', resultat: e.resultat as never }
    : null;
}

/** Lesingen av svaret på påberopelsen (`SVARLESING` i `format/leser.ts`). */
export const LESING_I_FORHOLDET = {
  gjentas: false,
  rettidighet: [],
  subsidiaertVerdi: null,
  standpunkt: standpunktIForholdet,
} satisfies Svarlesing;
