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
 *
 * Vedleggene kommandoen kan binde, leses i skrivetransaksjonen og gis til `lag`, og
 * `koe_api.bind_vedlegg` binder dem brevet viser til, etter at brevet er skrevet
 * (arbeidsvalg 3 og 4 i #790). Et gjentak med kvittering binder ikke på nytt (KT-U5).
 */

import type { Vedleggsoppslag } from '../kjerne/kommandoer/skriving.ts';
import type { Journalrad, Vedlegg } from '../kjerne/typer.ts';
import {
  BLOKKERT,
  feilnummer,
  FOR_GAMMELT,
  ID_BRUKT,
  INGEN_BOARD,
  KONFLIKT,
  LAAS_FEILET,
  LAAS_IKKE_GITT,
  NEKTET,
  sql,
  Tilbakerulling,
  transaksjon,
  UGYLDIG,
  UNIK_NOEKKEL,
  UUID,
  type Foresp,
  type Kontekst,
  type Pool,
} from './datalag.ts';
import { sjekksum } from './sjekksum.ts';
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
 * `opprett_sak` nektet med 51403 (konteksten mangler aktør, side eller prosjekt,
 * aktøren er ikke lenger aktivt medlem av prosjektet, eller teamet er ikke lenger
 * kontraktsteam på siden), saken har ikke noe leveringsmål (`IngenLeveringsmaal` i `cause`),
 * eller konteksten har ingen kontraktsside, som `skrivHendelse` prøver før basen,
 * eller en annen side enn TE, som `opprettSak` prøver før basen. De to siste har
 * ingen `cause`.
 */
export class SkrivingAvvist extends Error {}

/** Kommando-ID-en har en kvittering for et annet innhold (51410). */
export class KommandoIdBrukt extends Error {}

/** Prosjektet har ikke noe topic-board for nye saker, så saken lagres ikke (KT-U4, 51412). */
export class IngenTopicBoard extends Error {}

/** Topicen saken skulle opprettes fra, hører alt til en sak (#741 punkt 17). */
export class TopicHarSak extends Error {}

/**
 * Låsen på kommando-ID-en ble ikke gitt: tidsgrensen gikk ut, kallet ble avbrutt
 * eller valgt som vranglåsoffer (51408). Denne
 * transaksjonen er rullet tilbake, men et forsøk med samme ID holder låsen og kan
 * ennå committe (#792 punkt 1), så utfallet er usikkert for klienten, som ved
 * `UsikkertUtfall`. En egen klasse, så `UsikkertUtfall` i datalaget bare gjelder
 * COMMIT og en forkastet forbindelse (#816).
 */
export class LaasIkkeGitt extends Error {}

/**
 * `sp_getapplock` avviste kallet (-999, 51407). Låsen ble aldri tatt, og
 * transaksjonen er rullet tilbake, så utfallet er sikkert: ingenting er lagret (#816).
 */
export class LaasFeilet extends Error {}

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
    case NEKTET:
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
    case UNIK_NOEKKEL:
      return melding.includes('sak_catenda_topic_topic_unik')
        ? new TopicHarSak(melding, { cause: feil })
        : feil;
    case BLOKKERT:
      return new SkrivingAvvist(melding, { cause: feil });
    // Et forsøk med samme nøkkel holder låsen og kan ennå committe (#792 punkt 1).
    case LAAS_IKKE_GITT:
      return new LaasIkkeGitt(melding, { cause: feil });
    case LAAS_FEILET:
      return new LaasFeilet(melding, { cause: feil });
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

/** Innholdet i `sak_opprettet` som kjernen har godtatt. */
export interface Innhold {
  format: number;
  data: Record<string, unknown>;
  /** Skiller innholdet fra en `Avvist`. */
  skriv?: never;
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

/**
 * Saken fra kvitteringen for kommandoen, eller `null` når kommandoen ikke er skrevet.
 * Kvitteringen gjelder aktøren og prosjektet, ikke siden eller teamet, så et nytt forsøk
 * får saken selv om forfatterens side eller team er endret siden (#963).
 *
 * @throws KommandoIdBrukt, LaasIkkeGitt, LaasFeilet, UgyldigKontekst
 */
export async function kvittertSak(
  pool: Pool,
  kontekst: Pick<Kontekst, 'aktor' | 'prosjekt'>,
  kommando: Kommando
): Promise<string | null> {
  try {
    // Bare lesing: rulles tilbake, så utfallet aldri blir usikkert av en COMMIT.
    return await transaksjon<string | null>(
      pool,
      kontekst,
      async (foresp) => new Tilbakerulling((await lesKvittering(foresp, kommando))?.sak_id ?? null)
    );
  } catch (feil) {
    throw oversett(feil, null);
  }
}

/** Kommandoen har en kvittering, men brevet den viser til, ble ikke lest tilbake (#924). */
export class KvittertBrevMangler extends Error {}

/** Brevet kvitteringen viser til, lest i transaksjonen. */
function kvittertRad(journal: Journalrad[], eventId: string): Journalrad {
  const rad = journal.find((r) => r.event_id === eventId);
  if (!rad) throw new KvittertBrevMangler('Brevet i kvitteringen ble ikke lest tilbake.');
  return rad;
}

/**
 * Topicen en sak opprettes fra (KT-U6), med ID-ene i formen 8-4-4-4-12. Saken kobles til
 * den i transaksjonen, og ingen ny topic lages.
 */
export interface Opprettelsesvalg {
  topic?: { board: string; topic: string };
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
 * Avviser `innhold`, er svaret avvisningen, i samme form som fra `skrivHendelse`,
 * og transaksjonen rulles tilbake.
 *
 * @throws SkrivingAvvist, UgyldigKommando, IngenTopicBoard, TopicHarSak, KommandoIdBrukt, LaasIkkeGitt, LaasFeilet, UgyldigKontekst, UsikkertUtfall, og det `innhold` kaster
 */
export function opprettSak(
  pool: Pool,
  kontekst: Kontekst,
  kommando: Kommando,
  innhold: Innhold,
  valg?: Opprettelsesvalg
): Promise<Journalrad>;
export function opprettSak<A>(
  pool: Pool,
  kontekst: Kontekst,
  kommando: Kommando,
  innhold: () => Innhold | Avvist<A>,
  valg?: Opprettelsesvalg
): Promise<Journalrad | Avvist<A>>;
export async function opprettSak<A>(
  pool: Pool,
  kontekst: Kontekst,
  kommando: Kommando,
  innhold: Innhold | (() => Innhold | Avvist<A>),
  { topic }: Opprettelsesvalg = {}
): Promise<Journalrad | Avvist<A>> {
  const lag = typeof innhold === 'function' ? innhold : () => innhold;
  try {
    return await transaksjon<Journalrad | Avvist<A>>(pool, kontekst, async (foresp) => {
      // Etter at transaksjon() har prøvd konteksten, som i skrivHendelse (#596).
      const kvittering = kontekst.side === 'TE' ? await lesKvittering(foresp, kommando) : null;
      if (kvittering)
        return kvittertRad(await lesJournal(foresp, kvittering.sak_id, false), kvittering.event_id);
      const vurdert = lag();
      if (vurdert.skriv === false) return new Tilbakerulling(vurdert);
      if (kontekst.side !== 'TE') throw new SkrivingAvvist('Bare TE oppretter en sak.');
      const { format } = vurdert;
      const data = JSON.stringify(vurdert.data);
      const svar = await foresp()
        .input('format', sql.Int, format)
        .input('data', sql.NVarChar(sql.MAX), data)
        .input('kommando_id', sql.NVarChar(4000), kommando.id)
        .input('kommando_sha256', sql.NVarChar(4000), kommando.sha256)
        .input('catenda_board_id', sql.NVarChar(100), topic?.board ?? null)
        .input('catenda_topic_id', sql.NVarChar(100), topic?.topic ?? null)
        .output('sak_id', sql.NVarChar(36))
        .output('event_id', sql.NVarChar(36))
        .output('tidsstempel', sql.DateTime2(3))
        .execute('koe_api.opprett_sak');
      const { sak_id, event_id, tidsstempel } = svar.output as {
        sak_id: string;
        event_id: string;
        tidsstempel: Date;
      };
      // Raden basen skrev: ID-ene og tidspunktet fra prosedyren, resten fra konteksten (#597).
      return {
        event_id,
        sak_id,
        event_type: 'sak_opprettet',
        versjon: 1,
        tidsstempel: tidsstempel.toISOString(),
        aktor_id: kontekst.aktor.toLowerCase(),
        aktor_rolle: kontekst.side,
        aktor_team_id: kontekst.team ?? null,
        refererer_til_event_id: null,
        format,
        data: JSON.parse(data) as Record<string, unknown>,
      };
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
  /** Vedleggene i saken kommandoen kan binde. */
  vedlegg: Vedleggsoppslag;
}

/** Kjernens avvisning; ingenting skrives. */
export type Avvist<A> = { skriv: false; avvisning: A };

/** Raden og oppdraget som skal lagres, eller en avvisning som avbryter uten å skrive. */
export type Skriveutfall<A> =
  | { skriv: true; rad: Journalrad; oppdrag: Oppdragsrad | null }
  | Avvist<A>;

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
 * Med `vedlegg` leses bare vedleggene kommandoen viser til, og ingen når lista er
 * tom; uten leses alle kommandoen kan binde. Brevet bindes til vedleggene bare når
 * det har `dokumentasjon` (#827 punkt 4).
 *
 * Avviser basen brevet fordi tidspunktet er eldre enn 30 sekunder (51419),
 * prøves skrivingen én gang til med et nytt tidspunkt (#599). Avvises også den,
 * kastes basens feil.
 *
 * @throws Versjonskonflikt, SakFinnesIkke, SkrivingAvvist, UgyldigKommando, KommandoIdBrukt, LaasIkkeGitt, LaasFeilet, UgyldigKontekst, UsikkertUtfall
 */
export async function skrivHendelse<A>(
  pool: Pool,
  kontekst: Kontekst,
  sakId: string,
  forventet: number,
  kommando: Kommando,
  lag: (grunnlag: Skrivegrunnlag) => Skriveutfall<A>,
  { vedlegg: vedleggider }: { vedlegg?: readonly string[] } = {}
): Promise<Skriveutfall<A> | Gjentatt> {
  const forsoek = () =>
    transaksjon<Skriveutfall<A> | Gjentatt>(pool, kontekst, async (foresp) => {
      // Etter at transaksjon() har prøvd konteksten, så en ugyldig kontekst gir UgyldigKontekst (#596).
      if (!kontekst.side) throw new SkrivingAvvist('Konteksten har ingen kontraktsside.');
      // En annen form kan ikke være en sak (#566).
      // Formen `sak_metadata_sak_id_form` krever; saksnummeret er en slik ID (DL-U6).
      if (typeof sakId !== 'string' || !UUID.test(sakId))
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
      // Før tidspunktet, så ventingen på låsen på vedleggene ikke eldes det (#880-1).
      const vedlegg = await lesVedlegg(foresp, kontekst, sakId, vedleggider);
      const tid = await foresp()
        .output('tidspunkt', sql.DateTime2(3))
        .execute('koe_api.skrivetidspunkt');
      const tidspunkt = tid.output.tidspunkt as Date;
      const utfall = lag({ journal, tidspunkt, maal, vedlegg });
      // Rulles tilbake, så tidspunktet skrivetidspunkt førte, ikke blir stående.
      if (!utfall.skriv) return new Tilbakerulling(utfall);
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
      if (rad.data.dokumentasjon !== undefined)
        await foresp()
          .input('event_id', sql.NVarChar(36), rad.event_id)
          .input('sak_id', sql.NVarChar(36), sakId)
          .execute('koe_api.bind_vedlegg');
      return utfall;
    });
  try {
    try {
      return await forsoek();
    } catch (feil) {
      if (feilnummer(feil) !== FOR_GAMMELT) throw feil;
      return await forsoek();
    }
  } catch (feil) {
    throw oversett(feil, forventet);
  }
}

/**
 * Vedleggene i saken kommandoen kan binde: de bundne, og de ubundne teamet i konteksten
 * har lastet opp (arbeidsvalg 3 i #790), og med `ider` bare de oppgitte. Radsikkerheten
 * holder prosjektet og teamet i tillegg. Innholdet leses ikke. Radene låses til
 * transaksjonen er ferdig, så et vedlegg som slettes samtidig, enten finnes for
 * kjernen og bindes, eller mangler for begge (#827 punkt 2).
 */
async function lesVedlegg(
  foresp: Foresp,
  kontekst: Kontekst,
  sakId: string,
  ider?: readonly string[]
): Promise<Vedleggsoppslag> {
  if (ider?.length === 0) return new Map();
  const svar = await foresp()
    .input('sak_id', sql.NVarChar(36), sakId)
    .input('prosjekt', sql.NVarChar(100), kontekst.prosjekt)
    .input('team', sql.NVarChar(32), kontekst.team ?? null)
    .input('ider', sql.NVarChar(sql.MAX), ider ? JSON.stringify(ider) : null)
    .query<Vedlegg>(
      `SELECT LOWER(CONVERT(nvarchar(36), vedlegg_id)) AS vedlegg_id, filnavn, innhold_sha256
         FROM koe.vedlegg WITH (UPDLOCK)
        WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt
          AND (bundet_av_event_id IS NOT NULL OR lastet_opp_team = @team)
          AND (@ider IS NULL
               OR vedlegg_id IN (SELECT TRY_CAST(value AS uniqueidentifier) FROM OPENJSON(@ider)))`
    );
  return new Map(svar.recordset.map((v) => [v.vedlegg_id, v]));
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
