/**
 * Inngangen `POST /api/kjerne/saker` mot testbasen i SQL Server, over HTTP (#370).
 * Tilgangen prøves for hver inngang i `register.test.ts`; her står det inngangen
 * selv avgjør.
 *
 * Forventningene har kilde i vedtakene og kravene: bare TE oppretter en KOE-sak
 * (OV-U1, #696 krav 1), saksnummeret lages av basen (DL-U6), svaret har formen
 * klienten venter, `{ sak_id, versjon }` (#689), og aktørfeltene, `event_id`,
 * tidsstempelet og prosjektet settes av serveren (sikkerhetsinvariantene i
 * AGENTS.md). En sak fra kjøretiden står aldri uten `sak_opprettet` (#696 krav 2).
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { forhaandsvis, laastTekst } from '../../kjerne/kommandoer/skriving.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { catendaId } from '../autorisasjon.ts';
import { lesSaken } from '../lager.ts';
import { sql } from './sqlserver.ts';
import { avvisning, iTransaksjon, settInn } from './sqlserver_migrert.ts';
import {
  kall,
  lagOppsett,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from './testbase.ts';

const SAKER = '/api/kjerne/saker';
const OPPRETT = { type: 'opprett_sak', sakstittel: 'Endret fundamentering' };
const GRUNNLAGSKRAV = {
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

describe.skipIf(!TESTBASE_URL)('opprettelsen av en sak over HTTP (#370)', () => {
  let o: Oppsett;
  let server: KjorendeServer;

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  const opprett = (kropp: unknown, bruker: Testbruker = o.te, prosjektId = o.prosjekt.id) =>
    kall(server.url, SAKER, {
      bruker,
      prosjektId,
      kropp: { kommando_id: randomUUID(), ...(kropp as object) },
    });

  /** Sakene i prosjektet og radene i journalen, lest av eieren med konteksten satt. */
  const antall = () =>
    iTransaksjon(
      o.datalag.base.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE', team: null },
      async (r) => {
        const svar = await r().query<{ saker: number; hendelser: number }>(
          `SELECT (SELECT COUNT(*) FROM koe.sak_metadata) AS saker,
                  (SELECT COUNT(*) FROM koe.hendelse) AS hendelser`
        );
        return svar.recordset[0];
      }
    );

  const journalen = (sakId: string) =>
    iTransaksjon(
      o.datalag.base.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE', team: null },
      async (r) => {
        const svar = await r()
          .input('sak_id', sql.NVarChar(36), sakId)
          .query(
            `SELECT h.event_type, h.versjon, h.aktor_id, h.aktor_rolle, h.aktor_team_id,
                    h.format, h.data, h.prosjekt_id, m.sakstype, m.created_by
               FROM koe.hendelse h JOIN koe.sak_metadata m ON m.sak_id = h.sak_id
              WHERE h.sak_id = @sak_id ORDER BY h.versjon`
          );
        return svar.recordset;
      }
    );

  it('TE oppretter saken: svaret er { sak_id, versjon }, og journalen har sak_opprettet som versjon 1', async () => {
    const svar = await opprett({ kommando: OPPRETT });
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(201);
    expect(Object.keys(svar.kropp).sort()).toEqual(['sak_id', 'success', 'versjon']);
    expect(svar.kropp.versjon).toBe(1);
    const sakId = svar.kropp.sak_id as string;
    expect(sakId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    const [rad, ...resten] = await journalen(sakId);
    expect(resten).toEqual([]);
    expect(rad).toMatchObject({
      event_type: 'sak_opprettet',
      versjon: 1,
      aktor_rolle: 'TE',
      aktor_team_id: catendaId(o.prosjekt.teTeam),
      format: 1,
      prosjekt_id: o.prosjekt.id,
      sakstype: 'standard',
    });
    expect(String(rad.aktor_id).toLowerCase()).toBe(o.te.id);
    expect(String(rad.created_by).toLowerCase()).toBe(o.te.id);
    expect(JSON.parse(rad.data)).toEqual({ sakstittel: OPPRETT.sakstittel, sakstype: 'standard' });

    // Saken leses og tar imot et grunnlagskrav med versjonen svaret ga, med den
    // låste teksten skjemaet viser (LV-U2).
    const lest = await kall(server.url, `${SAKER}/${sakId}`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
    });
    expect(lest.status).toBe(200);
    expect(lest.kropp.versjon).toBe(1);
    const { journal } = await lesSaken(
      o.datalag.kjoeretid.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id },
      sakId
    );
    const vist = forhaandsvis(
      GRUNNLAGSKRAV,
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
    if (!vist.godtatt) throw new Error(JSON.stringify(vist));
    const krav = await kall(server.url, `${SAKER}/${sakId}/kommandoer`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: {
        expected_version: svar.kropp.versjon,
        kommando_id: randomUUID(),
        kommando: { ...GRUNNLAGSKRAV, brevtekst: laastTekst(vist.hendelser[0]) },
      },
    });
    expect(krav.status, JSON.stringify(krav.kropp)).toBe(201);
    expect(krav.kropp.versjon).toBe(2);
  });

  // Kilde: invariant 4 i 2.3 i hovedplanen og kravet fra reviewet av #742 i #418.
  it('samme kommando-ID to ganger gir én sak og samme sak_id; med et annet innhold avvises den (#418)', async () => {
    const kropp = { kommando_id: randomUUID(), kommando: OPPRETT };
    const foer = await antall();
    const [a, b] = [await opprett(kropp), await opprett(kropp)];
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(b.kropp).toEqual(a.kropp);
    expect(await antall()).toEqual({ saker: foer.saker + 1, hendelser: foer.hendelser + 1 });

    const endret = await opprett({ ...kropp, kommando: { ...OPPRETT, sakstittel: 'Annen' } });
    expect(endret.status, JSON.stringify(endret.kropp)).toBe(422);
    expect(endret.kropp.error).toBe('KOMMANDO_ID_BRUKT');
    expect(await antall()).toEqual({ saker: foer.saker + 1, hendelser: foer.hendelser + 1 });
  });

  it('to opprettelser gir to saksnumre (DL-U6)', async () => {
    const [a, b] = [await opprett({ kommando: OPPRETT }), await opprett({ kommando: OPPRETT })];
    expect(a.kropp.sak_id).not.toBe(b.kropp.sak_id);
  });

  it('BH avvises av kjernen med FEIL_PART, og ingenting skrives (OV-U1, #696)', async () => {
    const for_ = await antall();
    const svar = await opprett({ kommando: OPPRETT }, o.bh);
    expect(svar.status).toBe(400);
    expect(svar.kropp).toMatchObject({ error: 'REGELBRUDD', rule: 'FEIL_PART' });
    expect(svar.kropp.message).toBe('Bare TE kan opprette en KOE-sak.');
    expect(await antall()).toEqual(for_);
  });

  it('et medlem uten kontraktsteam, et annet prosjekt og manglende X-Project-ID avvises, og ingenting skrives', async () => {
    const for_ = await antall();
    for (const [bruker, prosjektId, feil] of [
      [o.utenTeam, o.prosjekt.id, 'CONTRACT_ROLE_REQUIRED'],
      [o.te, o.annetProsjekt.id, 'FORBIDDEN'],
      [o.utenfor, o.prosjekt.id, 'FORBIDDEN'],
      [o.te, null, 'FORBIDDEN'],
    ] as const) {
      const svar = await opprett({ kommando: OPPRETT }, bruker, prosjektId as string);
      expect(svar.status, JSON.stringify({ prosjektId, feil })).toBe(403);
      expect(svar.kropp.error).toBe(feil);
    }
    expect(await antall()).toEqual(for_);
  });

  it('CSRF håndheves: uten eller med feil token avvises opprettelsen', async () => {
    for (const csrf of [null, 'feil']) {
      const svar = await kall(server.url, SAKER, {
        bruker: o.te,
        prosjektId: o.prosjekt.id,
        kropp: { kommando_id: randomUUID(), kommando: OPPRETT },
        csrf,
      });
      expect(svar.status).toBe(403);
      expect(svar.kropp.error).toBe('CSRF validation failed');
    }
  });

  it.each([
    ['aktor_id', () => o.bh.id],
    ['aktor_rolle', () => 'BH'],
    ['aktor_team_id', () => catendaId(o.prosjekt.bhTeam)],
    ['event_id', () => randomUUID()],
    ['tidsstempel', () => '2026-01-01T00:00:00.000Z'],
    ['sak_id', () => randomUUID()],
    ['prosjekt_id', () => o.prosjekt.id],
    ['ukjent', () => 'x'],
  ])('%s ved siden av kommandoen avvises, og ingenting skrives', async (felt, verdi) => {
    const for_ = await antall();
    const svar = await opprett({ kommando: OPPRETT, [felt]: verdi() });
    // En sak_id som ikke er i prosjektet, stopper prosjektgrensen før feltet leses.
    if (felt === 'sak_id') expect(svar.status).toBe(403);
    else {
      expect(svar.status).toBe(400);
      expect(svar.kropp).toMatchObject({
        error: 'UGYLDIG_FORESPOERSEL',
        message: `Ukjente felt: ${felt}.`,
      });
    }
    expect(await antall()).toEqual(for_);
  });

  it.each([
    ['aktor_id', () => o.bh.id],
    ['aktor_rolle', () => 'BH'],
    ['event_id', () => randomUUID()],
    ['tidsstempel', () => '2026-01-01T00:00:00.000Z'],
    ['prosjekt_id', () => o.annetProsjekt.id],
    ['sakstype', () => 'forsering'],
  ])('%s i kommandoen avvises av kjernen som ukjent felt', async (felt, verdi) => {
    const svar = await opprett({ kommando: { ...OPPRETT, [felt]: verdi() } });
    // En prosjekt_id i kommandoen er ikke kroppens, og prøves ikke av prosjektgrensen.
    expect(svar.status).toBe(400);
    expect(svar.kropp).toMatchObject({ error: 'UGYLDIG_FORM', rule: 'UGYLDIG_FORM' });
    expect(svar.kropp.message).toContain(felt);
  });

  it.each([
    ['uten kommando', {}, 'UGYLDIG_FORESPOERSEL', 'kommando er påkrevd.'],
    [
      'med en tom tittel',
      { kommando: { ...OPPRETT, sakstittel: '  ' } },
      'UGYLDIG_FORM',
      '$.sakstittel: saken må ha en tittel',
    ],
    ['med en annen kommando', { kommando: GRUNNLAGSKRAV }, 'UGYLDIG_FORM', '$.type'],
  ])('%s avvises med en melding som sier hva', async (_n, kropp, feil, melding) => {
    const svar = await opprett(kropp);
    expect(svar.status).toBe(400);
    expect(svar.kropp.error).toBe(feil);
    expect(svar.kropp.message).toContain(melding);
  });

  describe('en sak fra kjøretiden står aldri uten sak_opprettet (#696 krav 2)', () => {
    it('kjøretiden kan ikke legge inn en sak uten opprett_sak (229)', async () => {
      const kontekst = {
        aktor: o.te.id,
        prosjekt: o.prosjekt.id,
        side: 'TE',
        team: catendaId(o.prosjekt.teTeam),
      };
      expect(
        await avvisning(
          iTransaksjon(o.datalag.kjoeretid.pool, kontekst, (r) =>
            settInn(r, 'sak_metadata', {
              sak_id: randomUUID(),
              prosjekt_id: o.prosjekt.id,
              sakstype: 'standard',
              created_by: o.te.id,
            })
          )
        )
      ).toBe(229);
    });

    it('et grunnlagskrav til en sak uten sak_opprettet gir 404, ikke en skrivefeil', async () => {
      // Bare saksraden, lagt inn av eieren: det kjøretiden ikke kan lage.
      const sakId = randomUUID();
      await iTransaksjon(
        o.datalag.base.pool,
        { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE', team: null },
        (r) =>
          settInn(r, 'sak_metadata', {
            sak_id: sakId,
            prosjekt_id: o.prosjekt.id,
            sakstype: 'standard',
            created_by: o.te.id,
          })
      );
      for (const expected_version of [0, 1]) {
        const svar = await kall(server.url, `${SAKER}/${sakId}/kommandoer`, {
          bruker: o.te,
          prosjektId: o.prosjekt.id,
          kropp: { expected_version, kommando_id: randomUUID(), kommando: GRUNNLAGSKRAV },
        });
        expect(svar.status).toBe(404);
        expect(svar.kropp.error).toBe('SAK_FINNES_IKKE');
      }
      expect(await journalen(sakId)).toEqual([]);
    });
  });
});
