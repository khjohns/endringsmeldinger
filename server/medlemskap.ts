/**
 * Medlemskapet i SQL Server (#53, del 3b, DL-U7, DL-U8, DL-U9, DL-U10):
 * `koe_api.prosjektkobling`, `koe_api.synkroniser_medlemskap`,
 * `koe_api.koblede_prosjekter` og `koe_api.deaktiver_ved_innlogging`. Alderen på
 * medlemslisten leses i `autorisasjon.ts` (#638). Synkroniseringen og innloggingen er systemkall uten
 * aktør og prosjektkontekst (RB2-04), så de går utenom `transaksjon()`; prosedyrene
 * har sin egen transaksjon og samme applås per prosjekt.
 *
 * Tidskilden er basens klokke (B-04 punkt 1): kalleren leser `basensKlokke()` før
 * den henter listen fra Catenda, og oppgir tidspunktet som `hentet`. Catenda-ID-en
 * til prosjektet hentes fra koblingen med `synkroniserProsjekt()`, eller med
 * `prosjektkobling()` før `synkroniserKobling()`, aldri fra forespørselen (#638).
 * Tilgangskontrollen og innloggingen kaller modulen (F0b-5b).
 */

import { feilnummer, sql, type Pool } from './datalag.ts';

/** Ett medlem i Catenda-prosjektet. `subjekt` har `catendaId()`-formen. */
export interface Medlem {
  subjekt: string;
  epost: string;
  navn: string;
  rolle: 'admin' | 'member';
}

/** Basen avviste listen: ugyldig form, et subjekt som ikke er normalisert, eller et tidspunkt fram i tid. */
export class UgyldigMedlemsliste extends Error {}

/** Basen avviste innloggingen: ugyldig prosjektliste, et subjekt som ikke er normalisert, eller et tidspunkt fram i tid. */
export class UgyldigInnlogging extends Error {}

/** Prosjekt-ID-en er tom, lengre enn 100 tegn eller har mellomrom til slutt. */
export class UgyldigProsjekt extends Error {}

/** Prosjektet er ikke koblet til Catenda-prosjektet listen kom fra, eller koblingen er ikke aktiv. */
export class FeilCatendaProsjekt extends Error {}

/** Applåsen for medlemskapet i et prosjekt eller for innloggingen til brukeren ble ikke tatt innen 10 s. Forbigående; kallet kan gjentas. */
export class MedlemskapetLaast extends Error {}

const IKKE_NORMALISERT = 52022;
const FEIL_CATENDA_PROSJEKT = 52040;
const UGYLDIG_LISTE = 52041;
const UGYLDIG_TIDSPUNKT = 52042;
const UGYLDIG_PROSJEKT = 52043;
const LAAST = 52044;
const UGYLDIG_PROSJEKTLISTE = 52045;

/** `ugyldig` er klassen for en ugyldig liste eller innlogging; uten den gis feilen videre. */
export function oversett(
  feil: unknown,
  ugyldig?: new (melding: string, valg: ErrorOptions) => Error
): unknown {
  const melding = (feil as Error)?.message ?? '';
  switch (feilnummer(feil)) {
    case FEIL_CATENDA_PROSJEKT:
      return new FeilCatendaProsjekt(melding, { cause: feil });
    case UGYLDIG_PROSJEKT:
      return new UgyldigProsjekt(melding, { cause: feil });
    case LAAST:
      return new MedlemskapetLaast(melding, { cause: feil });
    case IKKE_NORMALISERT:
    case UGYLDIG_LISTE:
    case UGYLDIG_TIDSPUNKT:
    case UGYLDIG_PROSJEKTLISTE:
      return ugyldig ? new ugyldig(melding, { cause: feil }) : feil;
    default:
      return feil;
  }
}

/**
 * Basens klokke nå, i millisekunder som `datetime2(3)`. Leses før hentingen fra
 * Catenda begynner, og brukes som `hentet` for listen hentingen gir.
 */
export async function basensKlokke(pool: Pool): Promise<Date> {
  const svar = await pool.request().query<{
    naa: Date;
  }>('SELECT CAST(DATETRUNC(millisecond, SYSUTCDATETIME()) AS datetime2(3)) AS naa');
  return svar.recordset[0].naa;
}

/**
 * Catenda-prosjektet et prosjekt er koblet til, som UUID med små bokstaver, eller
 * `null` uten aktiv kobling.
 */
export async function prosjektkobling(pool: Pool, prosjekt: string): Promise<string | null> {
  const svar = await pool
    .request()
    .input('prosjekt', sql.NVarChar(4000), prosjekt)
    .execute<{ catenda_prosjekt: string }>('koe_api.prosjektkobling');
  const rad = svar.recordset[0];
  return rad ? rad.catenda_prosjekt.toLowerCase() : null;
}

/**
 * Henter medlemmene fra Catenda-prosjektet prosjektet er koblet til, og skriver
 * listen med `synkroniserMedlemskap()`. Catenda-ID-en kommer fra koblingen, og
 * `hentet` fra basens klokke før hentingen (#638, B-04 punkt 1). Er koblingen
 * endret før listen skrives, avviser basen den.
 *
 * @throws FeilCatendaProsjekt uten aktiv kobling, ellers som `synkroniserMedlemskap()`
 */
export async function synkroniserProsjekt(
  pool: Pool,
  prosjekt: string,
  hentMedlemmer: (catendaProsjekt: string) => Promise<Medlem[]>
): Promise<boolean> {
  const catendaProsjekt = await prosjektkobling(pool, prosjekt);
  if (!catendaProsjekt) throw new FeilCatendaProsjekt('Prosjektet har ingen aktiv kobling');
  return synkroniserKobling(pool, { prosjekt, catendaProsjekt }, hentMedlemmer);
}

/**
 * Som `synkroniserProsjekt()`, for en kaller som alt har lest koblingen med
 * `prosjektkobling()` og skal bruke samme Catenda-prosjekt videre (#726 punkt 2).
 * Er koblingen endret siden, avviser basen listen.
 *
 * @throws som `synkroniserMedlemskap()`
 */
export async function synkroniserKobling(
  pool: Pool,
  kobling: { prosjekt: string; catendaProsjekt: string },
  hentMedlemmer: (catendaProsjekt: string) => Promise<Medlem[]>
): Promise<boolean> {
  const hentet = await basensKlokke(pool);
  const medlemmer = await hentMedlemmer(kobling.catendaProsjekt);
  return synkroniserMedlemskap(pool, { ...kobling, hentet, medlemmer });
}

/**
 * Prosjektene med aktiv kobling til ett av `catendaProsjekter`, sortert. Hver ID
 * har `catendaId()`-formen.
 *
 * @throws UgyldigInnlogging
 */
export async function kobledeProsjekter(
  pool: Pool,
  catendaProsjekter: string[]
): Promise<string[]> {
  try {
    const svar = await pool
      .request()
      .input('catenda_prosjekter', sql.NVarChar(sql.MAX), JSON.stringify(catendaProsjekter))
      .execute<{ prosjekt: string }>('koe_api.koblede_prosjekter');
    return svar.recordset.map((r) => r.prosjekt);
  } catch (feil) {
    throw oversett(feil, UgyldigInnlogging);
  }
}

/**
 * Skriver en fullstendig medlemsliste for prosjektet. Medlemmer som ikke står i
 * listen, blir inaktive. Returnerer `false` uten å endre noe når en liste hentet
 * samtidig eller senere alt er skrevet (DL-U7). En bruker uten medlemskap, som
 * en innlogging med en liste hentet samtidig eller senere viste ikke er med i
 * prosjektet, får ikke noe medlemskap (DL-U9). `catendaProsjekt` kommer fra
 * koblingen, og `hentet` fra `basensKlokke()`. Inngangene kaller
 * `synkroniserProsjekt()`, som leser koblingen.
 *
 * @throws UgyldigMedlemsliste, UgyldigProsjekt, FeilCatendaProsjekt, MedlemskapetLaast
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
      .input('prosjekt', sql.NVarChar(4000), liste.prosjekt)
      .input('catenda_prosjekt', sql.UniqueIdentifier, liste.catendaProsjekt)
      .input('medlemmer', sql.NVarChar(sql.MAX), JSON.stringify(medlemmer))
      .input('hentet', sql.DateTime2(3), liste.hentet)
      .output('skrevet', sql.Bit)
      .execute('koe_api.synkroniser_medlemskap');
    return svar.output.skrevet === true;
  } catch (feil) {
    throw oversett(feil, UgyldigMedlemsliste);
  }
}

/**
 * Gjør brukerens medlemskap inaktivt i hvert prosjekt med aktiv kobling til et
 * Catenda-prosjekt som ikke står i `catendaProsjekter` (DL-U8). Hver ID har
 * `catendaId()`-formen, som `subjekt`; en annen form avvises (#637). Listen må være
 * hele listen over brukerens Catenda-prosjekter, hentet etter `hentet` fra
 * `basensKlokke()`; er den ufullstendig, kalles funksjonen ikke, og innloggingen
 * feiler (B-04 punkt 4). Et prosjekt med en medlemsliste hentet etter `hentet`
 * endres ikke (DL-U7). Har brukeren ikke noe medlemskap i prosjektet, føres det
 * at innloggingen viste at brukeren ikke er med, så en liste hentet før `hentet`
 * ikke gir brukeren et nytt medlemskap (DL-U9). Returnerer prosjektene der
 * medlemskapet ble endret, sortert.
 *
 * @throws UgyldigInnlogging, MedlemskapetLaast
 */
export async function deaktiverVedInnlogging(
  pool: Pool,
  innlogging: { subjekt: string; catendaProsjekter: string[]; hentet: Date }
): Promise<string[]> {
  try {
    const svar = await pool
      .request()
      .input('subjekt', sql.NVarChar(400), innlogging.subjekt)
      .input(
        'catenda_prosjekter',
        sql.NVarChar(sql.MAX),
        JSON.stringify(innlogging.catendaProsjekter)
      )
      .input('hentet', sql.DateTime2(3), innlogging.hentet)
      .execute<{ prosjekt: string }>('koe_api.deaktiver_ved_innlogging');
    return svar.recordset.map((r) => r.prosjekt);
  } catch (feil) {
    throw oversett(feil, UgyldigInnlogging);
  }
}
