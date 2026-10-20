/**
 * Oppsett mot en migrert testbase i SQL Server for TS-serveren. Radene er de
 * innloggingen og medlemssynkroniseringen ellers skriver: bruker, sesjon,
 * prosjektmedlemskap, koblingen til Catenda med leveringsmålet, fersk
 * synkronisering og kontraktsteam. Hvert oppsett har sin egen base, som `rydd`
 * sletter.
 */

import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { lagServer, type Avhengigheter } from '../app.ts';
import { catendaId, sha256, type Catenda } from '../autorisasjon.ts';
import { forkast, reservasjon, sql, type Utlaan } from '../datalag.ts';
import { opprettelse } from '../../kjerne/kommandoer/opprettelse.ts';
import { forhaandsvis, laastTekst } from '../../kjerne/kommandoer/skriving.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { kommandosum, opprettSak } from '../kommandoer.ts';
import { lesSaken } from '../lager.ts';
import { opprettKjoeretid, SQLSERVER_TILKOBLING, type Pool, type Testbase } from './sqlserver.ts';
import { iTransaksjon, kopierMigrertTestbase, settInn } from './sqlserver_migrert.ts';

/**
 * Tilkoblingen til SQL Server-serveren testbasene lages på, eller tom. Testene
 * mot serveren hoppes over uten den.
 */
export const TESTBASE_URL = SQLSERVER_TILKOBLING;
export interface Testbruker {
  id: string;
  subjekt: string;
  token: string;
  csrf: string;
}

export interface Testprosjekt {
  id: string;
  catendaProsjekt: string;
  teTeam: string;
  bhTeam: string;
}

export interface Oppsett {
  /** Den migrerte basen og kjøretidens pool mot den. */
  datalag: Datalag;
  prosjekt: Testprosjekt;
  annetProsjekt: Testprosjekt;
  te: Testbruker;
  bh: Testbruker;
  /** Medlem i prosjektet, men i ingen av kontraktsteamene. */
  utenTeam: Testbruker;
  /** Medlem i prosjektet med leserolle (`viewer_override`), i ingen av kontraktsteamene. */
  leser: Testbruker;
  /** Medlem bare i det andre prosjektet. */
  utenfor: Testbruker;
  /** Catendas team-API, slik serverne får det i miljøet (`TESTMILJO_TEAMMEDLEMMER`). */
  teammedlemmer: Record<string, string[]>;
}

export interface Datalag {
  base: Testbase;
  kjoeretid: { pool: Pool; slett(): Promise<void> };
}

/** Koblingen til Catenda for det første prosjektet. Uten den får prosjektet tilfeldige ID-er. */
export interface Catendakobling {
  catendaProsjekt: string;
  bibliotek: string;
  mappe: string;
  board: string;
}

export async function lagOppsett(kobling?: Catendakobling): Promise<Oppsett> {
  const brukerFor = (): Testbruker => ({
    id: randomUUID(),
    subjekt: randomUUID(),
    token: randomUUID(),
    csrf: randomUUID(),
  });
  const prosjektFor = (navn: string): Testprosjekt => ({
    id: `p-test-${navn}-${randomUUID().slice(0, 8)}`,
    catendaProsjekt: randomUUID(),
    teTeam: randomUUID(),
    bhTeam: randomUUID(),
  });
  const [p, annet] = [prosjektFor('a'), prosjektFor('b')];
  if (kobling) p.catendaProsjekt = kobling.catendaProsjekt;
  const [te, bh, utenTeam, leser, utenfor] = [
    brukerFor(),
    brukerFor(),
    brukerFor(),
    brukerFor(),
    brukerFor(),
  ];
  const base = await kopierMigrertTestbase('serveren', { maks: 4 });
  const r = () => base.pool.request();
  const prosjekter: [Testprosjekt, Testbruker[]][] = [
    [p, [te, bh, utenTeam, leser]],
    [annet, [utenfor]],
  ];
  try {
    for (const [prosjekt, brukere] of prosjekter) {
      await settInn(r, 'projects', {
        id: prosjekt.id,
        name: 'Testmiljøet',
        organisasjon_id: 'org-test',
        is_active: true,
      });
      const ekte = prosjekt === p ? kobling : undefined;
      await settInn(r, 'catenda_project_configs', {
        internal_project_id: prosjekt.id,
        catenda_project_id: prosjekt.catendaProsjekt,
        library_id: ekte?.bibliotek ?? randomUUID(),
        ...(ekte ? { folder_id: ekte.mappe } : {}),
        topic_board_id: ekte?.board ?? randomUUID(),
        is_active: true,
      });
      await settInn(r, 'app_membership_sync', {
        project_id: prosjekt.id,
        catenda_project_id: prosjekt.catendaProsjekt,
        synced_at: { sql: 'SYSUTCDATETIME()' },
      });
      for (const [team, side] of [
        [prosjekt.teTeam, 'TE'],
        [prosjekt.bhTeam, 'BH'],
      ])
        await settInn(r, 'catenda_contract_teams', {
          internal_project_id: prosjekt.id,
          team_id: catendaId(team),
          contract_role: side,
        });
      for (const b of brukere) {
        await settInn(r, 'app_users', {
          id: b.id,
          email: `${b.id}@test.example`,
          name: 'Testbruker',
        });
        await settInn(r, 'app_project_memberships', {
          project_id: prosjekt.id,
          user_id: b.id,
          catenda_subject: catendaId(b.subjekt),
          user_email: `${b.id}@test.example`,
          display_name: 'Testbruker',
          role: 'member',
          viewer_override: b === leser,
          active: true,
        });
        await settInn(r, 'app_sessions', {
          token_hash: sha256(b.token),
          user_id: b.id,
          csrf_token: b.csrf,
          expires_at: { sql: 'DATEADD(hour, 1, SYSUTCDATETIME())' },
        });
      }
    }
    return {
      datalag: { base, kjoeretid: await opprettKjoeretid(base) },
      prosjekt: p,
      annetProsjekt: annet,
      te,
      bh,
      utenTeam,
      leser,
      utenfor,
      teammedlemmer: {
        [p.teTeam]: [te.subjekt],
        [p.bhTeam]: [bh.subjekt],
        [annet.teTeam]: [utenfor.subjekt],
      },
    };
  } catch (feil) {
    await base.slett();
    throw feil;
  }
}

/**
 * Rettighetene testene trenger for å lese og endre jobbene som kjøreveien. I en
 * migrert base har brukeren ingen; prosedyrene går gjennom eierskapskjeden. De gis og
 * trekkes tilbake i samme transaksjon som setningen, så de aldri er synlige for en
 * annen forbindelse: en jobbløkke som kjører samtidig, venter og ser bare rettighetene
 * drift har (#778).
 */
const TESTRETTIGHETER = [
  'SELECT ON koe.brevdokument',
  'SELECT, UPDATE ON koe.jobb',
  'SELECT ON koe.jobbforsoek',
  'SELECT ON koe.leveringskvittering',
  'SELECT ON koe.leveringsoppdrag',
  'SELECT, INSERT ON koe.sak_catenda_topic',
  'SELECT, UPDATE ON koe.vedlegg',
  'SELECT ON koe.vedleggskvittering',
];
const gi = TESTRETTIGHETER.map((r) => `GRANT ${r} TO koe_jobbkjoerer;`).join(' ');
const ta = TESTRETTIGHETER.map((r) => `REVOKE ${r} FROM koe_jobbkjoerer;`).join(' ');

/**
 * Setter forbindelsen tilbake til eieren (`dbo`) uten transaksjon: ruller en åpen
 * transaksjon tilbake og går ut av hvert nivå `EXECUTE AS`, høyst 32 (#945 punkt 3).
 * Svaret er tilstanden før og etter. Den sendes som sats og ikke med `sp_executesql`, som
 * avviser en endret `@@TRANCOUNT` (266).
 */
const SETT_TILBAKE = `DECLARE @bruker sysname = USER_NAME(), @transaksjoner int = @@TRANCOUNT, @n int = 0;
  IF @@TRANCOUNT > 0 ROLLBACK;
  WHILE USER_NAME() <> N'dbo' AND @n < 32 BEGIN REVERT; SET @n += 1; END;
  SELECT @bruker AS bruker, @transaksjoner AS transaksjoner,
         USER_NAME() AS bruker_etter, @@TRANCOUNT AS transaksjoner_etter;`;

interface Tilbakesetting {
  bruker: string;
  transaksjoner: number;
  bruker_etter: string;
  transaksjoner_etter: number;
}

/**
 * Setningen som eieren kjører som `koe_jobbkjoerer`, så radsikkerheten slipper den
 * gjennom, med `TESTRETTIGHETER` i transaksjonen. Feiler setningen, rulles den og
 * rettighetene tilbake før identiteten settes tilbake, så feilen er setningens og
 * ikke 3930 (#922). `XACT_ABORT` er på for hver forbindelse fra `opprettPool`, så
 * et tidsavbrudd ruller også tilbake, men det avbryter satsen før `CATCH`, og
 * identiteten blir stående. Derfor går setningen på en reservert forbindelse, som
 * etterpå settes tilbake med `SETT_TILBAKE`, også når den lyktes, og forkastes når
 * den ikke er eieren uten transaksjon (#813, #945). Etterlater setningen en egen
 * `EXECUTE AS`, kastes en feil før `COMMIT`, så rettighetene aldri blir committet.
 * Avslutter den satsen (`RETURN`), rulles transaksjonen tilbake, og det kastes en feil.
 */
export async function somJobbkjoerer<T>(
  o: { datalag: { base: Pick<Testbase, 'pool'> } },
  setning: string,
  parametre: Record<string, unknown> = {}
) {
  const pool = o.datalag.base.pool;
  const utlaan = pool as unknown as Utlaan;
  const forbindelse = await utlaan.acquire(pool);
  const egen = reservasjon(pool, forbindelse);
  let svar: sql.IResult<T> | undefined;
  let feil: unknown;
  try {
    const r = egen.request();
    for (const [navn, verdi] of Object.entries(parametre)) r.input(navn, verdi);
    svar = await r.query<T>(
      `BEGIN TRANSACTION;
       ${gi}
       EXECUTE AS USER = 'koe_jobbkjoerer';
       BEGIN TRY ${setning}; END TRY
       BEGIN CATCH IF XACT_STATE() <> 0 ROLLBACK; REVERT; THROW; END CATCH;
       REVERT;
       IF USER_NAME() <> N'dbo' THROW 51000, N'Setningen etterlot en egen EXECUTE AS; transaksjonen er rullet tilbake.', 1;
       ${ta}
       COMMIT;`
    );
  } catch (f) {
    feil = f;
  }
  let t: Tilbakesetting | undefined;
  try {
    t = (await egen.request().batch<Tilbakesetting>(SETT_TILBAKE)).recordset[0];
  } catch (f) {
    feil ??= f;
  }
  if (t?.bruker_etter === 'dbo' && t.transaksjoner_etter === 0) utlaan.release(forbindelse);
  else forkast(pool, forbindelse);
  if (feil !== undefined) throw feil;
  if (!t || t.bruker !== 'dbo' || t.transaksjoner !== 0)
    throw new Error(
      `Setningen etterlot forbindelsen som ${t?.bruker} med @@TRANCOUNT ${t?.transaksjoner}; transaksjonen er rullet tilbake.`
    );
  return svar!;
}

export async function rydd(o: Oppsett): Promise<void> {
  try {
    await o.datalag.kjoeretid.slett();
  } finally {
    await o.datalag.base.slett();
  }
}

/**
 * En KOE-sak med `sak_opprettet` i kjernens format, opprettet av TE med
 * `opprettelse` i kjernen og `opprettSak`, som inngangen gjør (#370).
 * Med `format: null` er den en sak TS-kjernen ikke har skrevet, lagt inn av eieren.
 */
export async function opprettKjernesak(
  o: Oppsett,
  prosjekt = o.prosjekt,
  format: 1 | null = 1
): Promise<string> {
  const te = prosjekt === o.prosjekt ? o.te : o.utenfor;
  const kontekst = {
    aktor: te.id,
    prosjekt: prosjekt.id,
    side: 'TE' as const,
    team: catendaId(prosjekt.teTeam)!,
  };
  const data = { sakstittel: 'Skiva', sakstype: 'standard' };
  if (format !== null) {
    const vurdert = opprettelse({ type: 'opprett_sak', sakstittel: data.sakstittel }, 'TE');
    if (!vurdert.godtatt) throw new Error(vurdert.avvisning.melding);
    const { format: f, data: d } = vurdert;
    return (
      await opprettSak(
        o.datalag.kjoeretid.pool,
        kontekst,
        { id: randomUUID(), sha256: kommandosum(d) },
        { format: f, data: d }
      )
    ).sak_id;
  }
  const sakId = randomUUID();
  await iTransaksjon(o.datalag.base.pool, kontekst, async (r) => {
    await settInn(r, 'sak_metadata', {
      sak_id: sakId,
      prosjekt_id: prosjekt.id,
      sakstype: 'standard',
      created_by: te.id,
    });
    await settInn(r, 'hendelse', {
      event_id: randomUUID(),
      sak_id: sakId,
      prosjekt_id: prosjekt.id,
      event_type: 'sak_opprettet',
      versjon: 1,
      tidsstempel: new Date(),
      aktor_id: te.id,
      aktor_rolle: 'TE',
      aktor_team_id: kontekst.team,
      refererer_til_event_id: null,
      format: null,
      data: JSON.stringify(data),
      transaksjon: { sql: 'CURRENT_TRANSACTION_ID()' },
      skriving: { sql: "CAST(SESSION_CONTEXT(N'koe_skriving') AS uniqueidentifier)" },
    });
  });
  return sakId;
}

/** TEs krav om grunnlag, uten den låste teksten. */
export const GRUNNLAGSKRAV = {
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    tittel: 'Endret fundamentering',
    paalegg_mottatt: '2026-10-01',
  },
  utdypning: 'Byggherren har pålagt en annen fundamentering.',
};

/**
 * TEs kommando med den låste teksten forhåndsvisningen i kjernen gir for saken slik
 * den er lagret nå, som skjemaet viser den (LV-U2).
 */
export async function medLaastTekst(
  o: Oppsett,
  sakId: string,
  kommando: Record<string, unknown> = GRUNNLAGSKRAV
): Promise<Record<string, unknown>> {
  const { journal } = await lesSaken(
    o.datalag.kjoeretid.pool,
    { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE' as const },
    sakId
  );
  const vist = forhaandsvis(
    kommando,
    {
      sakId,
      aktoerId: o.te.id,
      part: 'TE',
      teamId: null,
      tidspunkt: () => new Date(),
      nyId: randomUUID,
    },
    journal,
    KJERNE
  );
  if (!vist.godtatt)
    throw new Error(`Forhåndsvisningen avviste kommandoen: ${JSON.stringify(vist.avvisning)}`);
  return { ...kommando, brevtekst: laastTekst(vist.hendelser[0]) };
}

/** Sender TEs kommando med den låste teksten til saken over HTTP, som brevskjemaet gjør. */
export async function sendKommando(
  url: string,
  o: Oppsett,
  sakId: string,
  {
    versjon,
    kommando = GRUNNLAGSKRAV,
    kommandoId = randomUUID(),
  }: { versjon: number; kommando?: Record<string, unknown>; kommandoId?: string }
): Promise<Svar> {
  return kall(url, `/api/kjerne/saker/${sakId}/kommandoer`, {
    bruker: o.te,
    prosjektId: o.prosjekt.id,
    kropp: {
      expected_version: versjon,
      kommando_id: kommandoId,
      kommando: await medLaastTekst(o, sakId, kommando),
    },
  });
}

export interface Svar {
  status: number;
  kropp: Record<string, unknown> & { error?: string; rule?: string };
}

/** Forespørsel som en innlogget nettleser sender den. `bruker: null` er uten sesjon. */
export async function kall(
  url: string,
  sti: string,
  {
    bruker,
    prosjektId,
    kropp,
    metode = kropp === undefined ? 'GET' : 'POST',
    csrf = bruker?.csrf,
  }: {
    bruker: Testbruker | null;
    prosjektId: string | null;
    kropp?: unknown;
    metode?: string;
    csrf?: string | null;
  }
): Promise<Svar> {
  const hoder: Record<string, string> = {};
  if (prosjektId) hoder['X-Project-ID'] = prosjektId;
  if (bruker) hoder.Cookie = `__Host-koe_session=${bruker.token}`;
  if (csrf) hoder['X-CSRF-Token'] = csrf;
  if (kropp !== undefined) hoder['Content-Type'] = 'application/json';
  const svar = await fetch(`${url}${sti}`, {
    method: metode,
    headers: hoder,
    body: kropp === undefined ? undefined : JSON.stringify(kropp),
  });
  return { status: svar.status, kropp: (await svar.json()) as Svar['kropp'] };
}

export interface KjorendeServer {
  url: string;
  stopp(): Promise<void>;
}

/** Catendas team-API fra oppsettet. Medlemskapene er ferske, så synkroniseringen kalles ikke. */
export function catendaFra(teammedlemmer: Record<string, string[]>): Catenda {
  return {
    async medlemmer() {
      throw new Error('Synkronisering er ikke forventet i testene.');
    },
    async teammedlemmer(_prosjekt, teamId) {
      const funnet = Object.entries(teammedlemmer).find(([id]) => catendaId(id) === teamId);
      return new Set(funnet?.[1] ?? []);
    },
  };
}

/** TS-serveren i testprosessen, som kjøretiden mot testbasen. */
export async function startServer(
  o: Oppsett,
  avh: Partial<Avhengigheter> = {}
): Promise<KjorendeServer> {
  const server = createServer(
    lagServer({
      datalag: o.datalag.kjoeretid.pool,
      catenda: catendaFra(o.teammedlemmer),
      ...avh,
    })
  );
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    stopp: () => new Promise((ok) => server.close(() => ok())),
  };
}
