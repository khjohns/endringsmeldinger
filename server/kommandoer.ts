/**
 * Kommandoene som skriver saksregisteret og journalen i SQL Server (#53, del 3a):
 * `koe_api.opprett_sak` og `koe_api.skriv_hendelse`, hver i én `transaksjon()`
 * (`server/datalag.ts`). Aktøren, siden, teamet og prosjektet er konteksten, og
 * basen stempler dem i raden. Tidspunktet er basens klokke (DL-U3): saken får det
 * av `opprett_sak`, og et brev regnes med tidspunktet `koe_api.skrivetidspunkt`
 * gir, som `skriv_hendelse` krever.
 *
 * Leveringsmålet leses i skrivetransaksjonen og gis til `lag`. Kjernebufferen
 * skrives ikke her (B-10). `opprett_sak` legger jobben for topicen i Catenda inn i
 * samme transaksjon som saken (KT-U3, #741).
 *
 * Hver kommando har en ID fra klienten og en kvittering i samme transaksjon som
 * brevet (invariant 4, #418). Samme ID med samme innhold gir brevet fra
 * kvitteringen uten å skrive, og samme ID med et annet innhold avvises.
 */

import type { Journalrad } from '../kjerne/typer.ts';
import {
  feilnummer,
  sql,
  transaksjon,
  UsikkertUtfall,
  type Kontekst,
  type Pool,
} from './datalag.ts';
import { sjekksum } from './levering.ts';
import {
  IngenLeveringsmaal,
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
 * `opprett_sak`), saken har ikke noe leveringsmål (`IngenLeveringsmaal` i `cause`),
 * eller konteksten har ingen kontraktsside, som `skrivHendelse` prøver før basen,
 * eller en annen side enn TE, som `opprettSak` prøver før basen. De to siste har
 * ingen `cause`.
 */
export class SkrivingAvvist extends Error {}

/** Kommando-ID-en har en kvittering for et annet innhold (51410). */
export class KommandoIdBrukt extends Error {}

/** Prosjektet har ikke noe topic-board for nye saker, så saken lagres ikke (KT-U4, 51412). */
export class IngenTopicBoard extends Error {}

const UKJENT_SAK = 51403;
const INGEN_BOARD = 51412;
const KONFLIKT = 51409;
const ID_BRUKT = 51410;
const UGYLDIG = 51422;
const LAAS_IKKE_GITT = 51408;
const BLOKKERT = 33504;

/** Formen `sak_metadata_sak_id_form` krever; saksnummeret er en slik ID (DL-U6). */
const ID_FORM = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Meldingen `koe_api.skriv_hendelse` gir med 51409; formen er en kontrakt (`20261016230000_skranker.sql`). */
const KONFLIKTMELDING = /^Versjonskonflikt: journalen har versjon (\d+)$/;

/** Feilen fra basen som en av feilene over, med basens feil i `cause`. */
function oversett(feil: unknown, forventet: number | null): unknown {
  const melding = (feil as Error)?.message ?? '';
  // Koblingen er slått av etter tilgangskontrollen, som ellers ville nektet (#739
  // punkt 1). Et tomt mål av en annen grunn ville sett likt ut, så årsaken logges (#763).
  if (feil instanceof IngenLeveringsmaal) {
    console.warn(`Skrivingen ble avvist: ${melding}`);
    return new SkrivingAvvist(melding, { cause: feil });
  }
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
    case ID_BRUKT:
      return new KommandoIdBrukt(melding, { cause: feil });
    case INGEN_BOARD:
      return new IngenTopicBoard(melding, { cause: feil });
    case BLOKKERT:
      return new SkrivingAvvist(melding, { cause: feil });
    // Et forsøk med samme nøkkel holder låsen og kan ennå committe (#792 punkt 1).
    case LAAS_IKKE_GITT:
      return new UsikkertUtfall(melding, { cause: feil });
    default:
      return feil;
  }
}

/** Kommando-ID-en fra klienten og summen av innholdet, regnet ut av serveren. */
export interface Kommando {
  id: string;
  sha256: string;
}

/** Summen av innholdet, uavhengig av rekkefølgen på nøklene: samme sum som oppdragene (#792 punkt 4). */
export const kommandosum = sjekksum;

type Foresp = () => sql.Request;

/** Innholdet i `sak_opprettet` som kjernen har godtatt. */
export interface Innhold {
  format: number;
  data: Record<string, unknown>;
}

/** Saken og brevet fra kvitteringen, eller `null` når kommandoen ikke er skrevet. */
async function lesKvittering(
  foresp: Foresp,
  kommando: Kommando
): Promise<{ sak_id: string; event_id: string } | null> {
  const svar = await foresp()
    .input('kommando_id', sql.NVarChar(4000), kommando.id)
    .input('kommando_sha256', sql.NVarChar(4000), kommando.sha256)
    .output('sak_id', sql.NVarChar(36))
    .output('event_id', sql.NVarChar(36))
    .output('versjon', sql.Int)
    .execute('koe_api.kvittering');
  const { sak_id, event_id } = svar.output as { sak_id: string | null; event_id: string | null };
  return sak_id && event_id ? { sak_id, event_id } : null;
}

/** Brevet kvitteringen viser til, lest i transaksjonen. */
function kvittertRad(journal: Journalrad[], eventId: string): Journalrad {
  const rad = journal.find((r) => r.event_id === eventId);
  if (!rad) throw new Error('Brevet i kvitteringen ble ikke lest tilbake.');
  return rad;
}

/**
 * Oppretter saken med `sak_opprettet` som versjon 1. Basen lager saks-ID-en og
 * hendelses-ID-en og stempler tidspunktet, aktøren, siden og teamet. `innhold`
 * er det `opprettelse` i kjernen har godtatt. Bare TE oppretter (OV-U1), også
 * her, så en kaller som hopper over kjernen, ikke skriver en sak fra BH i den
 * uforanderlige journalen (#696).
 *
 * Har kommandoen en kvittering, er svaret `sak_opprettet` i saken fra kvitteringen.
 * Kvitteringen leses før `innhold` kalles, så et nytt forsøk får saken selv om
 * reglene er endret siden (#792 punkt 2, avgjørelse 3 i #764). Uten TE kalles
 * `innhold` likevel først, så kjernens avvisning går foran avslaget her.
 *
 * @throws SkrivingAvvist, UgyldigKommando, IngenTopicBoard, KommandoIdBrukt, UsikkertUtfall, og det `innhold` kaster
 */
export async function opprettSak(
  pool: Pool,
  kontekst: Kontekst,
  kommando: Kommando,
  innhold: Innhold | (() => Innhold)
): Promise<Journalrad> {
  const lag = typeof innhold === 'function' ? innhold : () => innhold;
  try {
    return await transaksjon(pool, kontekst, async (foresp) => {
      // Etter at transaksjon() har prøvd konteksten, som i skrivHendelse (#596).
      if (kontekst.side !== 'TE') {
        lag();
        throw new SkrivingAvvist('Bare TE oppretter en sak.');
      }
      const kvittering = await lesKvittering(foresp, kommando);
      if (kvittering)
        return kvittertRad(await lesJournal(foresp, kvittering.sak_id, false), kvittering.event_id);
      const { format, data } = lag();
      const svar = await foresp()
        .input('format', sql.Int, format)
        .input('data', sql.NVarChar(sql.MAX), JSON.stringify(data))
        .input('kommando_id', sql.NVarChar(4000), kommando.id)
        .input('kommando_sha256', sql.NVarChar(4000), kommando.sha256)
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
  /** Målet i Catenda for brevet. */
  maal: Leveringsmaal;
}

/** Raden og oppdraget som skal lagres, eller en avvisning som avbryter uten å skrive. */
export type Skriveutfall<A> =
  | { skriv: true; rad: Journalrad; oppdrag: Oppdragsrad | null }
  | { skriv: false; avvisning: A };

/** Kommandoen er skrevet før; brevet fra kvitteringen. */
export type Gjentatt = { skriv: 'gjentatt'; rad: Journalrad };

/**
 * Skriver én rad, og oppdraget for den, i én transaksjon. Saken låses og
 * journalen leses, versjonen kontrolleres, og `lag` får journalen og basens
 * klokke og avgjør hva som skrives. Raden må gjelde saken og neste versjon og
 * ha aktøren, siden, teamet og tidspunktet basen stempler; ellers skrives ingenting.
 * Har kommandoen en kvittering for saken, er svaret brevet fra den, uten
 * versjonskontroll og uten å kalle `lag`.
 *
 * @throws Versjonskonflikt, SakFinnesIkke, SkrivingAvvist, UgyldigKommando, KommandoIdBrukt, UsikkertUtfall
 */
export async function skrivHendelse<A>(
  pool: Pool,
  kontekst: Kontekst,
  sakId: string,
  forventet: number,
  kommando: Kommando,
  lag: (grunnlag: Skrivegrunnlag) => Skriveutfall<A>
): Promise<Skriveutfall<A> | Gjentatt> {
  try {
    return await transaksjon(pool, kontekst, async (foresp) => {
      // Etter at transaksjon() har prøvd konteksten, så en ugyldig kontekst gir UgyldigKontekst (#596).
      if (!kontekst.side) throw new SkrivingAvvist('Konteksten har ingen kontraktsside.');
      // En annen form kan ikke være en sak (#566).
      if (typeof sakId !== 'string' || !ID_FORM.test(sakId))
        throw new SakFinnesIkke(`Saken ${sakId} finnes ikke i prosjektet.`);
      // Kvitteringen låses før saken, i samme rekkefølge som opprettelsen.
      const kvittering = await lesKvittering(foresp, kommando);
      // En sak uten journal er ikke skrevet av kjernen (#739, #597). Et gjentak skriver
      // ingenting, så journalen låses ikke (#792 punkt 3).
      const journal = await lesJournal(foresp, sakId, !kvittering);
      // Samme skille som lesingen, så GET og POST svarer likt for saken (#716 punkt 1).
      if (!skrevetAvKjernen(journal))
        throw new SakFinnesIkke(`Saken ${sakId} finnes ikke i prosjektet.`);
      // Summen gjelder saken, så en kvittering for en annen sak har gitt 51410.
      if (kvittering) return { skriv: 'gjentatt', rad: kvittertRad(journal, kvittering.event_id) };
      // Målet før versjonen, så klienten hører om det som hindrer (#763 punkt 1).
      const maal = await lesLeveringsmaal(foresp, sakId);
      const versjon = journal.at(-1)?.versjon ?? 0;
      if (versjon !== forventet) throw new Versjonskonflikt(forventet, versjon);
      const tid = await foresp()
        .output('tidspunkt', sql.DateTime2(3))
        .execute('koe_api.skrivetidspunkt');
      const tidspunkt = tid.output.tidspunkt as Date;
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
        .input('kommando_id', sql.NVarChar(4000), kommando.id)
        .input('kommando_sha256', sql.NVarChar(4000), kommando.sha256)
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
