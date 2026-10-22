/**
 * Behandlingen av hendelsene i innboksen fra webhooken (W-1b.1, #819). Jobbløkka
 * (`server/jobber.ts`) tar den eldste hendelsen uten utfall og lagrer utfallet i
 * `koe.innkommende_behandling`.
 *
 * Bare en topic laget av TE gir en sak, med topicens tittel, og topicen er ikke et
 * varsel eller krav i appen (KT-U6). En topic fra BH gir ingen sak (KT-U7). Det gjør
 * heller ikke en topic av typen endringsordre, forsering eller ukjent type
 * (arbeidsvalget i #819), en topic som alt hører til en sak eller er laget av
 * integrasjonen (#741 punkt 17), eller en forfatter uten entydig identitet eller side
 * (INT-04). Hendelsen blir da liggende i innboksen med utfallet.
 *
 * Etter at utfallet er lagret, skriver løkka en kommentar på topicen for tre av utfallene:
 * lenken og saksnummeret når saken er opprettet, og hvorfor ingen sak er opprettet for en
 * topic fra BH (KT-U7) og en type appen ikke behandler (arbeidsvalget under OV-U1 i #819).
 * Teksten er fast for utfallet og saken, så et nytt forsøk finner kommentaren på topicen
 * og skriver ingen til (W-1b.2).
 *
 * ID-en og typen leses fra kolonnene dedupen brukte, ikke fra kroppen (#819). Catenda
 * signerer ikke kroppen, så av den brukes bare topic-ID-en, boardet og Catenda-prosjektet,
 * og prosjektet tas fra koblingen mellom de to. Forfatteren, typen og tittelen leses fra
 * topicen i Catenda, og navnet og e-posten fra medlemslisten. Identiteten løses først når
 * forfatteren er et medlem, så ingen brukerrad lages eller endres for andre.
 */

import { createHash } from 'node:crypto';
import { erObjekt } from '../kjerne/format/skjema.ts';
import { opprettelse } from '../kjerne/kommandoer/opprettelse.ts';
import { kontraktssideUtenSesjon, uuidMedBindestreker } from './autorisasjon.ts';
import { TOPICTYPE, type Innboksoppslag, type Kommentar } from './catenda.ts';
import { sql, utenKontekst, type Pool } from './datalag.ts';
import { catendaIdentitet } from './innlogging.ts';
import {
  IngenTopicBoard,
  kommandosum,
  kvittertSak,
  opprettSak,
  SkrivingAvvist,
  TopicHarSak,
  UgyldigKommando,
} from './kommandoer.ts';
import { basensKlokke } from './medlemskap.ts';

export type Behandlingsutfall =
  | 'sak_opprettet'
  | 'topic_fra_bh'
  | 'sakstype_ikke_stoettet'
  | 'topic_har_sak'
  | 'laget_av_integrasjonen'
  | 'ukjent_prosjekt'
  | 'ukjent_forfatter'
  | 'ukjent_side'
  | 'avvist'
  | 'ugyldig_hendelse'
  | 'ikke_behandlet_type'
  | 'feilet';

export interface Behandling {
  utfall: Behandlingsutfall;
  prosjektId?: string;
  sakId?: string;
  /** I formen 8-4-4-4-12, som `koe.sak_catenda_topic`. */
  topicId?: string;
  /** Boardet topicen ble slått opp på, i samme form; kommentaren skrives der. */
  boardId?: string;
  melding?: string;
}

/**
 * Catenda finner ikke topicen på boardet. Det kan være forbigående, eller lesetilgangen
 * mangler en stund, så løkka prøver igjen før `behandling` lagres (#963).
 */
export class TopicenFinnesIkke extends Error {
  readonly behandling: Behandling;

  constructor(behandling: Behandling) {
    super(behandling.melding);
    this.behandling = behandling;
  }
}

export interface Innkommende {
  /** `bigint`, som tekst fra mssql. */
  id: string;
  hendelse_id: string;
  hendelsestype: string;
  kropp: string;
  /** Forsøkene der Catenda ikke fant topicen; teller mot `FORSOEK_UTEN_TOPIC`. */
  forsoek_uten_topic: number;
}

export interface Behandlingsavhengigheter {
  datalag: Pool;
  catenda: Innboksoppslag;
}

/** Typene for en ny topic; de andre typene behandles ikke i W-1b.1. */
const NY_TOPIC = new Set(['issue.created', 'bcf.issue.created']);

/** `naa` er tiden ventetiden etter et forsøk regnes fra; basens klokke når den mangler. */
export async function nesteInnkommende(datalag: Pool, naa?: Date): Promise<Innkommende | null> {
  const svar = await utenKontekst(datalag)
    .input('naa', sql.DateTime2(3), naa ?? null)
    .execute<Innkommende>('koe_api.neste_innkommende');
  const rad = svar.recordset[0];
  return rad ? { ...rad, id: String(rad.id) } : null;
}

export async function registrerBehandling(
  datalag: Pool,
  rad: Innkommende,
  { utfall, prosjektId, sakId, topicId, boardId, melding }: Behandling
): Promise<void> {
  await utenKontekst(datalag)
    .input('innkommende_hendelse_id', sql.BigInt, rad.id)
    .input('utfall', sql.NVarChar(40), utfall)
    .input('prosjekt_id', sql.NVarChar(100), prosjektId ?? null)
    .input('sak_id', sql.NVarChar(36), sakId ?? null)
    .input('catenda_topic_id', sql.NVarChar(100), topicId ?? null)
    .input('catenda_board_id', sql.NVarChar(100), boardId ?? null)
    .input('melding', sql.NVarChar(400), melding?.slice(0, 400) ?? null)
    .execute('koe_api.registrer_behandling');
}

/** Et forsøk uten utfall. Hendelsen venter da før neste forsøk, og løkka går videre. */
export async function registrerForsoek(
  datalag: Pool,
  id: string,
  steg: 'behandling' | 'kommentar',
  melding: string,
  topicIkkeFunnet: boolean
): Promise<void> {
  await utenKontekst(datalag)
    .input('innkommende_hendelse_id', sql.BigInt, id)
    .input('steg', sql.NVarChar(20), steg)
    .input('melding', sql.NVarChar(400), melding.slice(0, 400))
    .input('topic_ikke_funnet', sql.Bit, topicIkkeFunnet)
    .execute('koe_api.registrer_innkommende_forsoek');
}

export interface Kommentarrad {
  /** Hendelsen i innboksen, `bigint` som tekst. */
  id: string;
  utfall: Behandlingsutfall;
  prosjekt_id: string | null;
  sak_id: string | null;
  catenda_board_id: string;
  catenda_topic_id: string;
}

export async function nesteKommentar(datalag: Pool, naa?: Date): Promise<Kommentarrad | null> {
  const svar = await utenKontekst(datalag)
    .input('naa', sql.DateTime2(3), naa ?? null)
    .execute<Kommentarrad>('koe_api.neste_kommentar');
  const rad = svar.recordset[0];
  return rad ? { ...rad, id: String(rad.id) } : null;
}

export async function kvitterKommentar(
  datalag: Pool,
  id: string,
  kommentarId: string
): Promise<void> {
  await utenKontekst(datalag)
    .input('innkommende_hendelse_id', sql.BigInt, id)
    .input('kommentar_id', sql.NVarChar(100), kommentarId)
    .execute('koe_api.kvitter_kommentar');
}

/**
 * Kommentaren for utfallet, eller null når utfallet ikke skal ha en. `saksadresse` gir
 * lenken til saken i appen.
 */
export function kommentartekst(
  rad: Pick<Kommentarrad, 'utfall' | 'prosjekt_id' | 'sak_id'>,
  saksadresse: (prosjektId: string, sakId: string) => string
): string | null {
  switch (rad.utfall) {
    case 'sak_opprettet':
      if (!rad.prosjekt_id || !rad.sak_id) return null;
      return (
        `KOE-saken ${rad.sak_id} er opprettet i appen: ${saksadresse(rad.prosjekt_id, rad.sak_id)}. ` +
        'Topicen er ikke et varsel eller krav i appen. Varsel og krav sendes fra saken i appen.'
      );
    case 'topic_fra_bh':
      return 'Saken er ikke opprettet i appen. Bare TE kan opprette en KOE-sak der.';
    case 'sakstype_ikke_stoettet':
      return 'Saken er ikke opprettet i appen. Topicer av denne typen kan ikke behandles i appen ennå.';
    default:
      return null;
  }
}

/**
 * Kommentaren er skrevet av integrasjonen og har teksten, uten hensyn til mellomrom, som
 * Catenda kan endre. Forfatteren må være integrasjonens brukernavn, så en annen som kan
 * kommentere på topicen, ikke hindrer appens kommentar ved å skrive teksten først (#972).
 * Uten brukernavn er ingen kommentar integrasjonens.
 */
export const appensKommentar = (kommentar: Kommentar, tekst: string, brukernavn: string | null) =>
  brukernavn !== null &&
  kommentar.forfatter === brukernavn &&
  kommentar.tekst.replace(/\s+/g, ' ').trim() === tekst.replace(/\s+/g, ' ').trim();

/**
 * Kommando-ID-en for opprettelsen er avledet av raden i innboksen, så et nytt forsøk
 * etter et avbrudd får saken fra kvitteringen i stedet for en sak til.
 */
function kommandoId(rad: Innkommende): string {
  const hex = createHash('sha256').update(`catenda-innboks:${rad.id}`).digest('hex');
  return uuidMedBindestreker(hex.slice(0, 32))!;
}

/**
 * Utfallet for hendelsen. Kaster når utfallet ikke kan avgjøres nå, som når Catenda eller
 * basen ikke svarer; da prøver løkka igjen.
 */
export async function behandle(
  avh: Behandlingsavhengigheter,
  rad: Innkommende
): Promise<Behandling> {
  if (!NY_TOPIC.has(rad.hendelsestype)) return { utfall: 'ikke_behandlet_type' };
  let kropp: unknown;
  try {
    kropp = JSON.parse(rad.kropp);
  } catch {
    return { utfall: 'ugyldig_hendelse', melding: 'Kroppen er ikke gyldig JSON.' };
  }
  const issue = erObjekt(kropp) ? (kropp.issue ?? kropp.topic) : undefined;
  const prosjekt = erObjekt(kropp) ? kropp.project : undefined;
  if (!erObjekt(kropp) || !erObjekt(issue) || !erObjekt(prosjekt))
    return { utfall: 'ugyldig_hendelse', melding: 'Kroppen mangler issue eller project.' };
  const topicId = uuidMedBindestreker(issue.id ?? issue.guid);
  const board = uuidMedBindestreker(issue.boardId);
  const catendaProsjekt = uuidMedBindestreker(prosjekt.id);
  if (!topicId || !board || !catendaProsjekt)
    return {
      utfall: 'ugyldig_hendelse',
      melding: 'Topicen, boardet eller prosjektet er ikke en UUID.',
    };

  const oppslag = await utenKontekst(avh.datalag)
    .input('catenda_prosjekt', sql.UniqueIdentifier, catendaProsjekt)
    .input('board', sql.UniqueIdentifier, board)
    .execute<{ prosjekt_id: string }>('koe_api.topicens_prosjekt');
  const prosjektId = oppslag.recordset[0]?.prosjekt_id;
  if (!prosjektId) return { utfall: 'ukjent_prosjekt', topicId };
  const ut = (utfall: Behandlingsutfall, melding?: string): Behandling => ({
    utfall,
    prosjektId,
    topicId,
    boardId: board,
    ...(melding ? { melding } : {}),
  });

  const topic = await avh.catenda.topic(board, topicId);
  if (!topic)
    throw new TopicenFinnesIkke(ut('ugyldig_hendelse', 'Catenda finner ikke topicen på boardet.'));
  if (topic.forfatter && topic.forfatter === (await avh.catenda.integrasjonensBruker()))
    return ut('laget_av_integrasjonen');
  if (topic.type !== TOPICTYPE) return ut('sakstype_ikke_stoettet');
  if (!topic.forfatter) return ut('ukjent_forfatter');
  const hentet = await basensKlokke(avh.datalag);
  const medlemmer = await avh.catenda.medlemmer(catendaProsjekt);
  const medlem = medlemmer.find((m) => m.subjekt === topic.forfatter);
  if (!medlem) return ut('ukjent_side');

  const aktor = await catendaIdentitet(avh.datalag, medlem);
  const kommando = {
    id: kommandoId(rad),
    // Uten tittelen: den leses fra Catenda og kan endres mellom to forsøk.
    sha256: kommandosum({ rute: 'innboks', hendelse: rad.hendelse_id, topic: topicId }),
  };
  // Før siden: et nytt forsøk etter en lagret sak får saken, også om siden er endret (#963).
  // Innboksen oppretter bare saker for TE, så kvitteringen leses med siden TE (#1056).
  const kvittert = await kvittertSak(
    avh.datalag,
    { aktor, prosjekt: prosjektId, side: 'TE' },
    kommando
  );
  if (kvittert) return { ...ut('sak_opprettet'), sakId: kvittert };
  const side = await kontraktssideUtenSesjon(avh.datalag, avh.catenda, prosjektId, aktor, {
    catendaProsjekt,
    hentet,
    medlemmer,
  });
  if (!side) return ut('ukjent_side');
  if (side.rolle === 'BH') return ut('topic_fra_bh');

  const opprett = { type: 'opprett_sak', sakstittel: topic.tittel };
  try {
    const utfall = await opprettSak(
      avh.datalag,
      { aktor, prosjekt: prosjektId, side: 'TE', ...(side.teamId ? { team: side.teamId } : {}) },
      kommando,
      () => {
        const vurdert = opprettelse(opprett, side.rolle);
        if (!vurdert.godtatt) return { skriv: false as const, avvisning: vurdert.avvisning };
        return { format: vurdert.format, data: vurdert.data };
      },
      { topic: { board, topic: topicId } }
    );
    if ('avvisning' in utfall) return ut('avvist', utfall.avvisning.melding);
    return { ...ut('sak_opprettet'), sakId: utfall.sak_id };
  } catch (feil) {
    if (feil instanceof TopicHarSak) return ut('topic_har_sak');
    if (feil instanceof IngenTopicBoard) return ut('ukjent_prosjekt', feil.message);
    if (feil instanceof SkrivingAvvist) return ut('ukjent_side', feil.message);
    if (feil instanceof UgyldigKommando) return ut('avvist', feil.message);
    throw feil;
  }
}
