/**
 * Kommandoene som skriver saksregisteret og journalen i SQL Server (#53, del 3a):
 * `koe_api.opprett_sak` og `koe_api.skriv_hendelse`, hver i én `transaksjon()`
 * (`server/datalag.ts`). Aktøren, siden, teamet og prosjektet er konteksten, og
 * basen stempler dem i raden. Tidspunktet er basens klokke (DL-U3): saken får det
 * av `opprett_sak`, og et brev regnes med tidspunktet `koe_api.skrivetidspunkt`
 * gir, som `skriv_hendelse` krever.
 *
 * Leveringsmålet leses i skrivetransaksjonen og gis til `lag`. Kjernebufferen
 * skrives ikke her (B-10).
 */

import type { Journalrad } from '../kjerne/typer.ts';
import { feilnummer, sql, transaksjon, type Kontekst, type Pool } from './datalag.ts';
import {
  lesJournal,
  lesLeveringsmaal,
  SakFinnesIkke,
  skrevetAvKjernen,
  Versjonskonflikt,
  type Leveringsmaal,
  type Oppdragsrad,
} from './lager.ts';

export { SakFinnesIkke, Versjonskonflikt };

/**
 * Basen avviste et argument (51422): feil form, eller et tidspunkt som ikke er
 * basens. Formene prøves i prosedyrene (#629), og basens feil står i `cause`.
 */
export class UgyldigKommando extends Error {}

/**
 * Konteksten gir ikke rett til å skrive: radsikkerheten blokkerte raden (33504),
 * basen fant ingen aktør, side eller prosjekt i konteksten (51403 fra
 * `opprett_sak`), eller konteksten har ingen kontraktsside, som `skrivHendelse`
 * prøver før basen, uten `cause`.
 */
export class SkrivingAvvist extends Error {}

const UKJENT_SAK = 51403;
const KONFLIKT = 51409;
const UGYLDIG = 51422;
const BLOKKERT = 33504;

/** Formen `sak_metadata_sak_id_form` krever; saksnummeret er en slik ID (DL-U6). */
const ID_FORM = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Meldingen `koe_api.skriv_hendelse` gir med 51409; formen er en kontrakt (`20261016230000_skranker.sql`). */
const KONFLIKTMELDING = /^Versjonskonflikt: journalen har versjon (\d+)$/;

/** Feilen fra basen som en av feilene over, med basens feil i `cause`. */
function oversett(feil: unknown, forventet: number | null): unknown {
  const melding = (feil as Error)?.message ?? '';
  switch (feilnummer(feil)) {
    case UKJENT_SAK:
      return forventet === null
        ? new SkrivingAvvist(melding, { cause: feil })
        : new SakFinnesIkke(melding, { cause: feil });
    case KONFLIKT: {
      const faktisk = KONFLIKTMELDING.exec(melding)?.[1];
      return faktisk === undefined
        ? feil
        : new Versjonskonflikt(forventet ?? 0, Number(faktisk), { cause: feil });
    }
    case UGYLDIG:
      return new UgyldigKommando(melding, { cause: feil });
    case BLOKKERT:
      return new SkrivingAvvist(melding, { cause: feil });
    default:
      return feil;
  }
}

/**
 * Oppretter saken med `sak_opprettet` som versjon 1. Basen lager saks-ID-en og
 * hendelses-ID-en og stempler tidspunktet, aktøren, siden og teamet.
 *
 * @throws SkrivingAvvist, UgyldigKommando
 */
export async function opprettSak(
  pool: Pool,
  kontekst: Kontekst,
  innhold: { format: number; data: Record<string, unknown> }
): Promise<Journalrad> {
  try {
    return await transaksjon(pool, kontekst, async (foresp) => {
      const svar = await foresp()
        .input('format', sql.Int, innhold.format)
        .input('data', sql.NVarChar(sql.MAX), JSON.stringify(innhold.data))
        .output('sak_id', sql.NVarChar(36))
        .output('event_id', sql.NVarChar(36))
        .output('tidsstempel', sql.DateTime2(3))
        .execute('koe_api.opprett_sak');
      const lest = await lesJournal(foresp, svar.output.sak_id as string, false);
      if (lest.length !== 1) throw new Error('Saken ble ikke lest tilbake med én rad.');
      return lest[0];
    });
  } catch (feil) {
    throw oversett(feil, null);
  }
}

/** Det skrivingen ser inne i transaksjonen, før raden lages. */
export interface Skrivegrunnlag {
  /** Journalen, lest etter at saken er låst. */
  journal: Journalrad[];
  /** Basens klokke for skrivingen; raden må ha nøyaktig dette tidspunktet. */
  tidspunkt: Date;
  /** Målet i Catenda for brevet, eller `null` når prosjektet ikke har noe bibliotek. */
  maal: Leveringsmaal | null;
}

/** Raden og oppdraget som skal lagres, eller en avvisning som avbryter uten å skrive. */
export type Skriveutfall<A> =
  | { skriv: true; rad: Journalrad; oppdrag: Oppdragsrad | null }
  | { skriv: false; avvisning: A };

/**
 * Skriver én rad, og oppdraget for den, i én transaksjon. Saken låses og
 * journalen leses, versjonen kontrolleres, og `lag` får journalen og basens
 * klokke og avgjør hva som skrives. Raden må gjelde saken og neste versjon og
 * ha aktøren, siden, teamet og tidspunktet basen stempler; ellers skrives ingenting.
 *
 * @throws Versjonskonflikt, SakFinnesIkke, SkrivingAvvist, UgyldigKommando
 */
export async function skrivHendelse<A>(
  pool: Pool,
  kontekst: Kontekst,
  sakId: string,
  forventet: number,
  lag: (grunnlag: Skrivegrunnlag) => Skriveutfall<A>
): Promise<Skriveutfall<A>> {
  try {
    return await transaksjon(pool, kontekst, async (foresp) => {
      // Etter at transaksjon() har prøvd konteksten, så en ugyldig kontekst gir UgyldigKontekst (#596).
      if (!kontekst.side) throw new SkrivingAvvist('Konteksten har ingen kontraktsside.');
      // En annen form kan ikke være en sak (#566).
      if (typeof sakId !== 'string' || !ID_FORM.test(sakId))
        throw new SakFinnesIkke(`Saken ${sakId} finnes ikke i prosjektet.`);
      const finnes = await foresp()
        .input('sak_id', sql.NVarChar(36), sakId)
        .query('SELECT 1 AS finnes FROM koe.sak_metadata WHERE sak_id = @sak_id');
      if (!finnes.recordset.length)
        throw new SakFinnesIkke(`Saken ${sakId} finnes ikke i prosjektet.`);
      const journal = await lesJournal(foresp, sakId, true);
      // Samme skille som lesingen, så GET og POST svarer likt for saken (#716 punkt 1).
      if (!skrevetAvKjernen(journal))
        throw new SakFinnesIkke(`Saken ${sakId} finnes ikke i prosjektet.`);
      const versjon = journal.at(-1)?.versjon ?? 0;
      if (versjon !== forventet) throw new Versjonskonflikt(forventet, versjon);
      const tid = await foresp()
        .output('tidspunkt', sql.DateTime2(3))
        .execute('koe_api.skrivetidspunkt');
      const tidspunkt = tid.output.tidspunkt as Date;
      const maal = await lesLeveringsmaal(foresp, sakId);
      const utfall = lag({ journal, tidspunkt, maal });
      // Rulles tilbake, så tidspunktet skrivetidspunkt førte, ikke blir stående.
      if (!utfall.skriv) throw new IkkeSkrevet(utfall);
      const { rad, oppdrag } = utfall;
      kontrollerRad(rad, oppdrag, kontekst, sakId, forventet, tidspunkt);
      await foresp()
        .input('sak_id', sql.NVarChar(36), sakId)
        .input('forventet_versjon', sql.Int, forventet)
        .input('event_id', sql.NVarChar(4000), rad.event_id)
        .input('event_type', sql.NVarChar(4000), rad.event_type)
        .input('tidsstempel', sql.DateTime2(3), tidspunkt)
        .input('format', sql.Int, rad.format)
        .input('data', sql.NVarChar(sql.MAX), JSON.stringify(rad.data))
        .input('oppdrag_id', sql.NVarChar(4000), oppdrag?.id ?? null)
        .input('dokumentnoekkel', sql.NVarChar(4000), oppdrag?.dokumentnoekkel ?? null)
        .input('oppdrag', sql.NVarChar(sql.MAX), oppdrag ? JSON.stringify(oppdrag.innhold) : null)
        .input('oppdrag_sha256', sql.NVarChar(4000), oppdrag?.innhold_sha256 ?? null)
        .execute('koe_api.skriv_hendelse');
      return utfall;
    });
  } catch (feil) {
    if (feil instanceof IkkeSkrevet) return feil.utfall as Skriveutfall<A>;
    throw oversett(feil, forventet);
  }
}

/** `lag` avviste; kastes for at transaksjonen skal rulles tilbake. */
class IkkeSkrevet {
  readonly utfall: Skriveutfall<unknown>;
  constructor(utfall: Skriveutfall<unknown>) {
    this.utfall = utfall;
  }
}

/**
 * Raden er den basen kommer til å lagre: samme sak, versjon, aktør, side, team og
 * tidspunkt. Formen på feltene prøver `koe_api.skriv_hendelse` (#629).
 */
function kontrollerRad(
  rad: Journalrad,
  oppdrag: Oppdragsrad | null,
  kontekst: Kontekst,
  sakId: string,
  forventet: number,
  tidspunkt: Date
): void {
  const avvik = [
    rad.sak_id !== sakId && 'saken',
    rad.versjon !== forventet + 1 && 'versjonen',
    rad.aktor_id.toLowerCase() !== kontekst.aktor.toLowerCase() && 'aktøren',
    rad.aktor_rolle !== kontekst.side && 'siden',
    (rad.aktor_team_id ?? null) !== (kontekst.team ?? null) && 'teamet',
    rad.tidsstempel !== tidspunkt.toISOString() && 'tidspunktet',
    rad.refererer_til_event_id !== null && 'referansen',
    oppdrag !== null && oppdrag.event_id !== rad.event_id && 'oppdragets hendelse',
  ].filter(Boolean);
  if (avvik.length)
    throw new Error(`Raden skiller seg fra det basen stempler: ${avvik.join(', ')}.`);
}
