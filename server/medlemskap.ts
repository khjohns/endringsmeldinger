/**
 * Medlemssynkroniseringen i SQL Server (#53, del 3b, DL-U7):
 * `koe_api.synkroniser_medlemskap` og `koe_api.medlemsliste_alder`. Synkroniseringen
 * er et systemkall uten aktør og prosjektkontekst (RB2-04), så den går utenom
 * `transaksjon()`; prosedyren har sin egen transaksjon og applås per prosjekt.
 *
 * Kalleren henter listen fra Catenda, normaliserer subjektene med `catendaId()` og
 * oppgir når hentingen begynte. Ingen inngang kaller modulen ennå.
 */

import { sql, type Pool } from './datalag.ts';

/** Ett medlem i Catenda-prosjektet. `subjekt` har `catendaId()`-formen. */
export interface Medlem {
  subjekt: string;
  epost: string;
  navn: string;
  rolle: 'admin' | 'member';
}

/** Basen avviste listen: ugyldig form, et subjekt som ikke er normalisert, eller et tidspunkt fram i tid. */
export class UgyldigMedlemsliste extends Error {}

/** Prosjektet er ikke koblet til Catenda-prosjektet listen kom fra, eller koblingen er ikke aktiv. */
export class FeilCatendaProsjekt extends Error {}

const IKKE_NORMALISERT = 52022;
const FEIL_CATENDA_PROSJEKT = 52040;
const UGYLDIG_LISTE = 52041;
const UGYLDIG_TIDSPUNKT = 52042;
const UGYLDIG_PROSJEKT = 52043;

function feilnummer(feil: unknown): number | undefined {
  const f = feil as { number?: number; originalError?: { info?: { number?: number } } };
  return f?.number ?? f?.originalError?.info?.number;
}

function oversett(feil: unknown): unknown {
  const melding = (feil as Error)?.message ?? '';
  switch (feilnummer(feil)) {
    case FEIL_CATENDA_PROSJEKT:
      return new FeilCatendaProsjekt(melding, { cause: feil });
    case IKKE_NORMALISERT:
    case UGYLDIG_LISTE:
    case UGYLDIG_TIDSPUNKT:
    case UGYLDIG_PROSJEKT:
      return new UgyldigMedlemsliste(melding, { cause: feil });
    default:
      return feil;
  }
}

/**
 * Skriver en fullstendig medlemsliste for prosjektet. Medlemmer som ikke står i
 * listen, blir inaktive. Returnerer `false` uten å endre noe når en liste hentet
 * samtidig eller senere alt er skrevet (DL-U7).
 *
 * @throws UgyldigMedlemsliste, FeilCatendaProsjekt
 */
export async function synkroniserMedlemskap(
  pool: Pool,
  liste: { prosjekt: string; catendaProsjekt: string; hentet: Date; medlemmer: Medlem[] }
): Promise<boolean> {
  const medlemmer = liste.medlemmer.map((m) => ({
    subject: m.subjekt,
    email: m.epost,
    name: m.navn,
    role: m.rolle,
  }));
  try {
    const svar = await pool
      .request()
      .input('prosjekt', sql.NVarChar(100), liste.prosjekt)
      .input('catenda_prosjekt', sql.UniqueIdentifier, liste.catendaProsjekt)
      .input('medlemmer', sql.NVarChar(sql.MAX), JSON.stringify(medlemmer))
      .input('hentet', sql.DateTime2(3), liste.hentet)
      .output('skrevet', sql.Bit)
      .execute('koe_api.synkroniser_medlemskap');
    return svar.output.skrevet === true;
  } catch (feil) {
    throw oversett(feil);
  }
}

/**
 * Når listen for prosjektet ble hentet, og alderen i sekunder etter basens klokke
 * (B-04 punkt 4). `null` når ingen liste fra det koblede Catenda-prosjektet er skrevet.
 *
 * @throws UgyldigMedlemsliste
 */
export async function medlemslistensAlder(
  pool: Pool,
  prosjekt: string
): Promise<{ hentet: Date; alderSekunder: number } | null> {
  try {
    const svar = await pool
      .request()
      .input('prosjekt', sql.NVarChar(100), prosjekt)
      .execute<{ hentet: Date; alder_sekunder: string | number }>('koe_api.medlemsliste_alder');
    const rad = svar.recordset[0];
    return rad ? { hentet: rad.hentet, alderSekunder: Number(rad.alder_sekunder) } : null;
  } catch (feil) {
    throw oversett(feil);
  }
}
