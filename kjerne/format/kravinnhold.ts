/**
 * Tilgangen til kravinnholdet, lest av den lagrede kravversjonen: kategorien i påberopelsen
 * og dagene i fristkravet. Vederlagskravet leses gjennom `spor/vederlag/format.ts`. Utregningen,
 * kontrollene og brevet leser kravet herfra (#508, #1695, #1783).
 */

import { foersteUnderkategori } from '../regler/forhold.ts';
import { tekst } from './skjema.ts';
import type { Krav, OppgittDatofelt } from '../typer.ts';

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

/** Fristkravet, etter `KRAVINNHOLD.frist`. */
export interface Fristinnhold {
  dager: number;
}

/** Påberopelsen av forholdet i kravet. Uten krav er alle feltene `null`. */
export function innholdIForholdet(krav: Pick<Krav, 'innhold'> | null | undefined): Forholdsinnhold {
  const innhold = krav?.innhold ?? {};
  return {
    hovedkategori: tekst(innhold.hovedkategori),
    underkategori: foersteUnderkategori(innhold.underkategori as string | string[] | null),
    endringsordre: tekst(innhold.endringsordre),
    datoer: {
      paalegg_mottatt: tekst(innhold.paalegg_mottatt),
      klar_over_forholdet: tekst(innhold.klar_over_forholdet),
    },
  };
}

/** Fristkravet i kravet. */
export const innholdIFristen = (krav: Pick<Krav, 'innhold'>): Fristinnhold => ({
  dager: krav.innhold.dager as number,
});

/** Hovedkategorien og den første underkategorien i påberopelsen. */
export function kategori(krav: Pick<Krav, 'innhold'> | null | undefined) {
  const { hovedkategori, underkategori } = innholdIForholdet(krav);
  return { hovedkategori, underkategori };
}
