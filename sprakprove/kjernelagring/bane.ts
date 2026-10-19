/**
 * Kjernen mot testbasen i SQL Server: journalen går gjennom `koe.hendelse`, og
 * bufferen ligger i `koe.kjernebuffer` (B-10, #316, #932). Banen leser journalen
 * med `lesJournal` fra serverens lager, gjennom kjøretiden med aktøren og
 * prosjektet i konteksten, før hver utledning, så hvert steg prøver lagring og
 * gjenlesing. Krever `KOE_SQLSERVER_TILKOBLING`.
 *
 * Skrivingen i `server/kommandoer.ts` godtar ikke radene kjøreren skriver, så
 * testskriveren skriver dem som eieren. Skriveren, bufferlageret og spørringene
 * er testkode (oppdragsgiver 19.10, #932). De bruker eierens forbindelse med
 * policyen slått av i sin egen transaksjon, fordi radsikkerheten også gjelder
 * eieren og ellers ville skjult en spørring som ikke avgrenser til prosjektet.
 */

import { randomUUID } from 'node:crypto';
import { catendaId } from '../../server/autorisasjon.ts';
import { lesJournal, Versjonskonflikt } from '../../server/lager.ts';
import { feilnummer, sql } from '../../server/tester/sqlserver.ts';
import { iTransaksjon, type Foresp } from '../../server/tester/sqlserver_migrert.ts';
import {
  lagOppsett,
  rydd,
  TESTBASE_URL,
  type Oppsett,
  type Testprosjekt,
} from '../../server/tester/testbase.ts';
import {
  bufferversjon,
  type Buffer,
  type Bufferlager,
  type Bufferversjon,
} from '../../kjerne/utledning/buffer.ts';
import type { Kjerne } from '../../kjerne/versjon.ts';
import type { Journalrad } from '../../kjerne/typer.ts';
import type { Bane } from '../../kjerne/tester/bane.ts';
import type { Baner } from '../../kjerne/tester/baner.ts';

export { TESTBASE_URL };

/**
 * Grensene for testene mot SQL Server. Oppsettet lager en base og en innlogging,
 * og hvert steg i et forløp er flere transaksjoner; standardgrensene på 5 og 10 s
 * holder ikke for de første testene i en fil. `vi.setConfig(GRENSER)` virker bare
 * for den første filen i en arbeider uten isolasjon, så feilinnføringene setter
 * grensene på kommandolinjen (`kjerne/tester/feilinnfoering.ts`).
 */
export const GRENSER = { testTimeout: 60_000, hookTimeout: 240_000 };

/**
 * `arbeid` i én transaksjon som eieren, med policyen for radsikkerheten slått av
 * til `arbeid` er ferdig. Policyen er en del av transaksjonen, så en feil eller en
 * brutt forbindelse ruller den tilbake sammen med resten.
 */
export async function somEier<T>(o: Oppsett, arbeid: (r: Foresp) => Promise<T>): Promise<T> {
  const tx = new sql.Transaction(o.datalag.base.pool);
  await tx.begin();
  const r = () => new sql.Request(tx);
  try {
    await r().batch('ALTER SECURITY POLICY koe_sikkerhet.tilgang WITH (STATE = OFF);');
    const svar = await arbeid(r);
    await r().batch('ALTER SECURITY POLICY koe_sikkerhet.tilgang WITH (STATE = ON);');
    await tx.commit();
    return svar;
  } catch (feil) {
    await tx.rollback().catch(() => {});
    throw feil;
  }
}

/**
 * Kjøreren skriver teamene som `team-te` og `team-bh`. Journalen tar bare imot
 * `catendaId()`-formen, så de lagres som kontraktsteamene i prosjektet og leses
 * tilbake slik kjøreren skrev dem.
 */
function teamene(prosjekt: Testprosjekt): Map<string, string> {
  return new Map([
    ['team-te', catendaId(prosjekt.teTeam)!],
    ['team-bh', catendaId(prosjekt.bhTeam)!],
  ]);
}

const omTeam = (team: string | null, teamene: Map<string, string>) =>
  team === null ? null : (teamene.get(team) ?? team);

/** Journalen i saken slik kjøretiden leser den, med et medlem av prosjektet i konteksten. */
export async function journalen(o: Oppsett, sakId: string): Promise<Journalrad[]> {
  const [medlem, prosjekt] =
    o.prosjekt.id === o.annetProsjekt.id ? [o.utenfor, o.annetProsjekt] : [o.te, o.prosjekt];
  const kontekst = {
    aktor: medlem.id,
    prosjekt: prosjekt.id,
    side: 'TE',
    team: catendaId(prosjekt.teTeam),
  };
  const rader = await iTransaksjon(o.datalag.kjoeretid.pool, kontekst, (r) =>
    lesJournal(r, sakId, false)
  );
  const tilbake = new Map([...teamene(o.prosjekt)].map(([k, v]) => [v, k]));
  return rader.map((r) => ({ ...r, aktor_team_id: omTeam(r.aktor_team_id, tilbake) }));
}

/** Kroker i transaksjonen, for prøven av avbrudd før commit (7.3 i designnotatet for #273). */
export interface Kroker {
  /** Kjøres etter at radene er skrevet, rett før `COMMIT`. Kaster den, rulles alt tilbake. */
  foerCommit?: (r: Foresp) => Promise<void>;
}

/**
 * Skriv kjernens rader etter `forventet` i prosjektet i `o`. Versjonen i raden
 * settes av skriveren. Returnerer ny versjon.
 *
 * @throws Versjonskonflikt, eller `Error` når saken ikke finnes i prosjektet.
 */
export async function skrivRader(
  o: Oppsett,
  rader: Journalrad[],
  forventet: number,
  kroker: Kroker = {}
): Promise<number> {
  if (!rader.length) throw new Error('Kan ikke skrive en tom liste');
  const sakId = rader[0].sak_id;
  if (rader.some((h) => h.sak_id !== sakId)) throw new Error('Alle radene må gjelde samme sak');
  try {
    await somEier(o, async (r) => {
      const sak = await r()
        .input('sak_id', sql.NVarChar(36), sakId)
        .query<{ prosjekt_id: string; versjon: number }>(
          `SELECT m.prosjekt_id,
                  (SELECT COALESCE(MAX(versjon), 0) FROM koe.hendelse WITH (UPDLOCK, HOLDLOCK)
                    WHERE sak_id = m.sak_id) AS versjon
             FROM koe.sak_metadata m WHERE m.sak_id = @sak_id`
        );
      const funnet = sak.recordset[0];
      if (funnet?.prosjekt_id !== o.prosjekt.id)
        throw new Error('Saken finnes ikke i det autoriserte prosjektet.');
      if (funnet.versjon !== forventet) throw new Versjonskonflikt(forventet, funnet.versjon);
      const skriving = randomUUID();
      const lagret = teamene(o.prosjekt);
      for (const [i, h] of rader.entries())
        await r()
          .input('event_id', sql.NVarChar(36), h.event_id)
          .input('sak_id', sql.NVarChar(36), sakId)
          .input('prosjekt_id', sql.NVarChar(100), o.prosjekt.id)
          .input('event_type', sql.NVarChar(100), h.event_type)
          .input('versjon', sql.Int, forventet + i + 1)
          .input('tidsstempel', sql.DateTime2(3), new Date(h.tidsstempel))
          .input('aktor_id', sql.UniqueIdentifier, h.aktor_id)
          .input('aktor_rolle', sql.NVarChar(2), h.aktor_rolle)
          .input('aktor_team_id', sql.NVarChar(32), omTeam(h.aktor_team_id, lagret))
          .input('refererer_til_event_id', sql.NVarChar(36), h.refererer_til_event_id)
          .input('format', sql.Int, h.format)
          .input('data', sql.NVarChar(sql.MAX), JSON.stringify(h.data))
          .input('skriving', sql.UniqueIdentifier, skriving)
          .query(
            `INSERT koe.hendelse (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel,
                                  aktor_id, aktor_rolle, aktor_team_id, refererer_til_event_id,
                                  format, data, transaksjon, skriving)
             VALUES (@event_id, @sak_id, @prosjekt_id, @event_type, @versjon, @tidsstempel,
                     @aktor_id, @aktor_rolle, @aktor_team_id, @refererer_til_event_id,
                     @format, @data, CURRENT_TRANSACTION_ID(), @skriving)`
          );
      await kroker.foerCommit?.(r);
    });
  } catch (feil) {
    // 2627: to skrivinger på samme versjon, stoppet av `hendelse_sak_versjon`.
    if (
      feilnummer(feil) === 2627 &&
      String((feil as Error).message).includes('hendelse_sak_versjon')
    )
      throw new Versjonskonflikt(forventet, (await journalen(o, sakId)).at(-1)?.versjon ?? 0);
    throw feil;
  }
  return forventet + rader.length;
}

/** En ny sak i prosjektet i `o`, uten rader. */
export async function nySak(o: Oppsett): Promise<string> {
  const sakId = randomUUID();
  await somEier(o, (r) =>
    r()
      .input('sak_id', sql.NVarChar(36), sakId)
      .input('prosjekt_id', sql.NVarChar(100), o.prosjekt.id)
      .input('created_by', sql.UniqueIdentifier, o.te.id)
      .query(
        `INSERT koe.sak_metadata (sak_id, prosjekt_id, sakstype, created_by)
         VALUES (@sak_id, @prosjekt_id, N'standard', @created_by)`
      )
  );
  return sakId;
}

/** En ny sak i prosjektet i `o`, opprettet med `sak_opprettet` i kjernens format. */
export async function basebane(o: Oppsett): Promise<Bane> {
  const sakId = await nySak(o);
  const sak: Journalrad = {
    event_id: randomUUID(),
    sak_id: sakId,
    event_type: 'sak_opprettet',
    versjon: 1,
    tidsstempel: '2026-10-09T08:00:00.000Z',
    aktor_id: o.te.id,
    aktor_rolle: 'TE',
    aktor_team_id: null,
    refererer_til_event_id: null,
    format: 1,
    data: { sakstittel: 'Kjernelagringen', sakstype: 'standard' },
  };
  await skrivRader(o, [sak], 0);
  return {
    sakId,
    aktor: (part) => (part === 'TE' ? o.te.id : o.bh.id),
    journal: () => journalen(o, sakId),
    skriv: async (hendelser, forventet) => void (await skrivRader(o, hendelser, forventet)),
  };
}

/**
 * Bufferen i `koe.kjernebuffer` (B-10, #316): visningen og versjonene den er
 * regnet med. Lageret gjelder ett prosjekt og leser og skriver bare dets saker.
 */
export function sqlBuffer(o: Oppsett, prosjekt: Testprosjekt): Bufferlager {
  return {
    async les(sakId) {
      const rad = await somEier(o, async (r) => {
        const svar = await r()
          .input('sak_id', sql.NVarChar(36), sakId)
          .input('prosjekt_id', sql.NVarChar(100), prosjekt.id)
          .query<Bufferversjon & { visning: string }>(
            `SELECT visning, projeksjonsversjon, regelversjon, leserformat, saksversjon
               FROM koe.kjernebuffer WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt_id`
          );
        return svar.recordset[0];
      });
      if (!rad) return null;
      const { visning, ...versjon } = rad;
      return { versjon, visning: JSON.parse(visning) as Buffer['visning'] };
    },
    async skriv(sakId, b) {
      await somEier(o, (r) =>
        r()
          .input('sak_id', sql.NVarChar(36), sakId)
          .input('prosjekt_id', sql.NVarChar(100), prosjekt.id)
          .input('visning', sql.NVarChar(sql.MAX), JSON.stringify(b.visning))
          .input('projeksjonsversjon', sql.Int, b.versjon.projeksjonsversjon)
          .input('regelversjon', sql.Int, b.versjon.regelversjon)
          .input('leserformat', sql.Int, b.versjon.leserformat)
          .input('saksversjon', sql.Int, b.versjon.saksversjon)
          .query(
            `DECLARE @skrevet int;
             UPDATE koe.kjernebuffer
                SET visning = @visning, projeksjonsversjon = @projeksjonsversjon,
                    regelversjon = @regelversjon, leserformat = @leserformat, saksversjon = @saksversjon
              WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt_id;
             SET @skrevet = @@ROWCOUNT;
             IF @skrevet = 0
             BEGIN
               INSERT koe.kjernebuffer (sak_id, prosjekt_id, visning, projeksjonsversjon,
                                        regelversjon, leserformat, saksversjon)
               SELECT m.sak_id, m.prosjekt_id, @visning, @projeksjonsversjon,
                      @regelversjon, @leserformat, @saksversjon
                 FROM koe.sak_metadata m WHERE m.sak_id = @sak_id AND m.prosjekt_id = @prosjekt_id;
               SET @skrevet = @@ROWCOUNT;
             END;
             IF @skrevet <> 1 THROW 50000, N'Saken finnes ikke i prosjektet', 1;`
          )
      );
    },
  };
}

/** Sak-ID-ene i `svar`, sortert som `Array.sort()`. */
const sakIder = (svar: { recordset: { sak_id: string }[] }) =>
  svar.recordset.map((x) => x.sak_id).sort();

/**
 * Sakene i prosjektet der bufferen ikke gjelder for kjernen: ingen buffer, en
 * annen versjon, eller en saksversjon som ikke er den siste i journalen. For en
 * sak med rader fra TS-kjernen er det det samme som `bufferGjelder` avgjør, som
 * en spørring (B-10, #316). En sak Python har skrevet alene (`format` mangler
 * på alle rader), tas ikke med: kjernen forstår den ikke og bygger ingen buffer
 * for den (B-17, MM-U2).
 */
export async function utdaterteSaker(
  o: Oppsett,
  prosjekt: Testprosjekt,
  kjerne: Kjerne
): Promise<string[]> {
  const v = bufferversjon(kjerne, 0);
  const svar = await somEier(o, (r) =>
    r()
      .input('prosjekt_id', sql.NVarChar(100), prosjekt.id)
      .input('projeksjonsversjon', sql.Int, v.projeksjonsversjon)
      .input('regelversjon', sql.Int, v.regelversjon)
      .input('leserformat', sql.Int, v.leserformat)
      .query<{ sak_id: string }>(
        `SELECT m.sak_id FROM koe.sak_metadata m
           JOIN (SELECT sak_id, MAX(versjon) AS versjon FROM koe.hendelse
                  WHERE prosjekt_id = @prosjekt_id GROUP BY sak_id HAVING COUNT(format) > 0) h
             ON h.sak_id = m.sak_id
           LEFT JOIN koe.kjernebuffer b ON b.sak_id = m.sak_id AND b.prosjekt_id = m.prosjekt_id
          WHERE m.prosjekt_id = @prosjekt_id
            AND (b.sak_id IS NULL
                 OR b.projeksjonsversjon <> @projeksjonsversjon
                 OR b.regelversjon <> @regelversjon
                 OR b.leserformat <> @leserformat
                 OR b.saksversjon <> h.versjon)`
      )
  );
  return sakIder(svar);
}

/**
 * Sakene i prosjektet med en rad i et format kjernen ikke leser. Listes før en
 * tilbakerulling: de stopper med den eldre kjernen (MM-U2, B-10).
 */
export async function sakerKjernenIkkeLeser(
  o: Oppsett,
  prosjekt: Testprosjekt,
  kjerne: Kjerne
): Promise<string[]> {
  const svar = await somEier(o, (r) =>
    r()
      .input('prosjekt_id', sql.NVarChar(100), prosjekt.id)
      .input('leserformat', sql.Int, kjerne.leserformat)
      .query<{ sak_id: string }>(
        `SELECT DISTINCT sak_id FROM koe.hendelse
          WHERE prosjekt_id = @prosjekt_id AND format > @leserformat`
      )
  );
  return sakIder(svar);
}

export function testbasen(): Baner {
  let o: Oppsett;
  let lager: Bufferlager;
  return {
    navn: 'mot testbasen',
    async start() {
      o = await lagOppsett();
      lager = sqlBuffer(o, o.prosjekt);
    },
    async stopp() {
      if (o) await rydd(o);
    },
    bane: () => basebane(o),
    buffer: () => lager,
  };
}
