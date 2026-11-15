/**
 * Inngangene for godkjenneren (del 4 av #831) over HTTP mot en base bygget fra
 * migrasjonene. Forventningene har kilde i:
 * - GFK-U9: godkjenneren ser bare pakken der hen står i kjeden, mens pakken er åpen,
 *   etterpå bare sin egen handling;
 * - GFK-U8: kjeden følger lederhierarkiet, og lederne er ikke medlem av prosjektet;
 * - GFK-U10 og svaret 20.10 i #831 (punkt 6): en godkjenner uten rolle avvises ved
 *   godkjenning, men kan returnere;
 * - kravene 20.10 i #831: en aktør i et team for totalentreprenøren avvises, en pakke som er
 *   lukket mens godkjenneren hadde den, vises som lukket og ikke som manglende tilgang, og
 *   driftsopplysningene i `cause` når ikke klienten;
 * - sikkerhetsinvariantene i CLAUDE.md: sesjon, CSRF, prosjektet i `X-Project-ID` og ukjente
 *   felt i kroppen avvises.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import { transaksjon, type Kontekst } from '../datalag.ts';
import { lagPakke } from '../godkjenning.ts';
import type { Brevverdi } from '../fullmakt.ts';
import { opprettSesjon } from '../sesjon.ts';
import { iTransaksjon, settInn } from './sqlserver_migrert.ts';
import {
  catendaFra,
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from './testbase.ts';

const EN: Brevverdi = { beloep: 300000, gulv: 300000 };
const TO: Brevverdi = { beloep: 2000000, gulv: 2000000 };
const sti = (pakke: string) => `/api/godkjenning/pakker/${pakke}`;
const handlinger = (pakke: string) => `${sti(pakke)}/handlinger`;

describe.skipIf(!TESTBASE_URL)('inngangene for godkjenneren mot testbasen', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  // Lederen og direktøren står i HR-kopien og har en sesjon, men er ikke medlem av prosjektet.
  let leder: Testbruker;
  let direktoer: Testbruker;
  let utenforKjeden: Testbruker;
  const tenant = randomUUID();
  const oid = { bh: randomUUID(), leder: randomUUID(), direktoer: randomUUID(), te: randomUUID() };

  const eier = <T>(arbeid: Parameters<typeof iTransaksjon<T>>[2]) =>
    iTransaksjon(o.datalag.base.pool, null, arbeid);
  const somBh = (): Kontekst => ({
    aktor: o.bh.id,
    prosjekt: o.prosjekt.id,
    side: 'BH',
    team: catendaId(o.prosjekt.bhTeam)!,
  });

  async function medSesjon(navn: string): Promise<Testbruker> {
    const id = randomUUID();
    await eier((r) => settInn(r, 'app_users', { id, email: `${id}@test.example`, name: navn }));
    const ny = await opprettSesjon(o.datalag.kjoeretid.pool, id);
    return { id, subjekt: '', token: ny.token, csrf: ny.csrfToken };
  }

  /** Hierarkiet i HR-kopien: saksbehandleren `bh` har lederen `lederAv`, som har direktøren. */
  const registrerHierarki = (
    lederAv: { id: string; oid: string } = { id: leder.id, oid: oid.leder }
  ) =>
    eier(async (r) => {
      await r().query('DELETE koe.hr_kopi; DELETE koe.rolle;');
      for (const [rolle, grense] of [
        ['saksbehandler', 200000],
        ['seksjonsleder', 1500000],
        ['direktoer', null],
      ] as const)
        await settInn(r, 'rolle', { rolle, grense });
      const naa = new Date();
      for (const [bruker_id, egen, rolle, leder_oid] of [
        [o.bh.id, oid.bh, 'saksbehandler', lederAv.oid],
        [lederAv.id, lederAv.oid, 'seksjonsleder', oid.direktoer],
        [direktoer.id, oid.direktoer, 'direktoer', null],
      ] as const)
        await settInn(r, 'hr_kopi', {
          bruker_id,
          tenant_id: tenant,
          oid: egen,
          rolle,
          leder_oid,
          hentet: naa,
        });
    });

  /** En pakke fra saksbehandleren i en ny sak, med kjeden fra hierarkiet. */
  async function nyPakke(verdi: Brevverdi): Promise<string> {
    const sakId = await opprettKjernesak(o);
    const pakkeId = randomUUID();
    await transaksjon(o.datalag.kjoeretid.pool, somBh(), (f) =>
      lagPakke(f, {
        pakkeId,
        sakId,
        forrigePakkeId: null,
        brev: { svar: [], tekst: 'Svaret som skal godkjennes' },
        fullmaktsgrunnlag: { beloep: verdi.beloep },
        verdi,
      })
    );
    return pakkeId;
  }

  const les = (
    bruker: Testbruker | null,
    pakke: string,
    prosjektId: string | null = o.prosjekt.id
  ) => kall(server.url, sti(pakke), { bruker, prosjektId });
  const handle = (
    bruker: Testbruker,
    pakke: string,
    kropp: unknown,
    k: { prosjektId?: string; csrf?: string | null } = {}
  ) =>
    kall(server.url, handlinger(pakke), {
      bruker,
      prosjektId: k.prosjektId ?? o.prosjekt.id,
      kropp,
      ...('csrf' in k ? { csrf: k.csrf } : {}),
    });

  beforeAll(async () => {
    o = await lagOppsett();
    await eier((r) => settInn(r, 'entra_tenant', { tenant_id: tenant }));
    [leder, direktoer, utenforKjeden] = [
      await medSesjon('Leder'),
      await medSesjon('Direktør'),
      await medSesjon('Utenfor kjeden'),
    ];
    await registrerHierarki();
    server = await startServer(o);
  }, 240_000);
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  }, 60_000);

  it('GFK-U9: lederen i kjeden leser den åpne pakken uten å være medlem av prosjektet', async () => {
    const pakke = await nyPakke(TO);
    const svar = await les(leder, pakke);
    expect(svar.status).toBe(200);
    expect(svar.kropp).toMatchObject({
      status: 'aapen',
      pakke: {
        pakke_id: pakke,
        saksbehandler_id: o.bh.id,
        brev: { tekst: 'Svaret som skal godkjennes' },
        kjede: [
          { steg: 1, godkjenner_id: leder.id },
          { steg: 2, godkjenner_id: direktoer.id },
        ],
        handlinger: [],
        venter_paa_deg: true,
      },
    });
    const senere = await les(direktoer, pakke);
    expect(senere.status).toBe(200);
    expect((senere.kropp.pakke as { venter_paa_deg: boolean }).venter_paa_deg).toBe(false);
  });

  it('GFK-U9: en bruker utenfor kjeden, også saksbehandlerens team, får samme 404 som for en pakke som ikke finnes', async () => {
    const pakke = await nyPakke(TO);
    for (const [bruker, id] of [
      [utenforKjeden, pakke],
      [o.bh, pakke],
      [o.utenTeam, pakke],
      [leder, randomUUID()],
      [leder, 'ikke-en-uuid'],
    ] as const) {
      const svar = await les(bruker, id);
      expect(svar.status, bruker.id).toBe(404);
      expect(svar.kropp.error).toBe('PAKKE_FINNES_IKKE');
    }
    const post = await handle(utenforKjeden, pakke, { handling: 'godkjent' });
    expect(post.status).toBe(404);
  });

  it('prosjektgrensen: pakken finnes ikke i et annet prosjekt, og uten eller med ukjent X-Project-ID gir 403', async () => {
    const pakke = await nyPakke(TO);
    const annet = await les(leder, pakke, o.annetProsjekt.id);
    expect(annet.status).toBe(404);
    for (const prosjekt of [null, 'p-finnes-ikke']) {
      const svar = await les(leder, pakke, prosjekt);
      expect(svar.status).toBe(403);
      expect(svar.kropp.error).toBe('FORBIDDEN');
    }
    const post = await handle(
      leder,
      pakke,
      { handling: 'godkjent' },
      { prosjektId: o.annetProsjekt.id }
    );
    expect(post.status).toBe(404);
  });

  it('uten sesjon gir 401, og en handling uten eller med feil CSRF-token gir 403', async () => {
    const pakke = await nyPakke(TO);
    expect((await les(null, pakke)).status).toBe(401);
    for (const csrf of [null, 'feil']) {
      const svar = await handle(leder, pakke, { handling: 'godkjent' }, { csrf });
      expect(svar.status).toBe(403);
      expect(svar.kropp.error).toBe('CSRF validation failed');
    }
    expect((await les(leder, pakke)).kropp.pakke).toMatchObject({ handlinger: [] });
  });

  it('kroppen: ukjente felt, en annen handling enn godkjenning og retur, og en begrunnelse som ikke er tekst, gir 400', async () => {
    const pakke = await nyPakke(TO);
    for (const kropp of [
      { handling: 'godkjent', aktor_id: leder.id },
      { handling: 'trukket' },
      {},
      { handling: 'returnert', begrunnelse: 5 },
      { handling: 'returnert', begrunnelse: 'x'.repeat(4001) },
      [],
    ]) {
      const svar = await handle(leder, pakke, kropp);
      expect(svar.status, JSON.stringify(kropp).slice(0, 60)).toBe(400);
    }
    expect((await les(leder, pakke)).kropp.pakke).toMatchObject({ handlinger: [] });
  });

  it('GFK-U8 og GFK-U9: kjeden godkjenner i rekkefølge, og etterpå ser godkjenneren bare sin egen handling', async () => {
    const pakke = await nyPakke(TO);
    const forTidlig = await handle(direktoer, pakke, { handling: 'godkjent' });
    expect(forTidlig.status).toBe(403);
    expect(forTidlig.kropp.error).toBe('PAKKE_VENTER_IKKE');

    expect((await handle(leder, pakke, { handling: 'godkjent' })).status).toBe(200);
    const mellom = await les(direktoer, pakke);
    expect(mellom.kropp.pakke).toMatchObject({
      venter_paa_deg: true,
      handlinger: [
        {
          handling: 'godkjent',
          steg: 1,
          aktor_id: leder.id,
          fullmakt: { tittel: 'seksjonsleder', grense: 1500000 },
        },
      ],
    });

    expect((await handle(direktoer, pakke, { handling: 'godkjent' })).status).toBe(200);
    const etter = await les(direktoer, pakke);
    expect(etter.status).toBe(200);
    expect(etter.kropp.status).toBe('lukket');
    expect(etter.kropp.pakke).toBeUndefined();
    expect(etter.kropp.egne_handlinger).toMatchObject([
      { handling: 'godkjent', steg: 2, aktor_id: direktoer.id },
    ]);
    const igjen = await handle(direktoer, pakke, { handling: 'godkjent' });
    expect(igjen.status).toBe(409);
    expect(igjen.kropp.error).toBe('PAKKE_LUKKET');
  });

  it('GFK-U9: etter en retur ser den som returnerte, sin handling, og den neste i kjeden ser ingenting', async () => {
    const pakke = await nyPakke(TO);
    const retur = await handle(leder, pakke, {
      handling: 'returnert',
      begrunnelse: 'Se på beløpet',
    });
    expect(retur.status).toBe(200);
    expect((await les(leder, pakke)).kropp).toMatchObject({
      status: 'lukket',
      egne_handlinger: [{ handling: 'returnert', steg: 1, begrunnelse: 'Se på beløpet' }],
    });
    expect((await les(direktoer, pakke)).status).toBe(404);
  });

  it('GFK-U10 og svaret 20.10 (punkt 6): uten rolle avvises godkjenningen uten driftsopplysninger, men returen går', async () => {
    const pakke = await nyPakke(TO);
    await eier((r) => r().input('id', leder.id).query('DELETE koe.hr_kopi WHERE bruker_id = @id'));
    try {
      const svar = await handle(leder, pakke, { handling: 'godkjent' });
      expect(svar.status).toBe(409);
      expect(svar.kropp).toEqual({
        success: false,
        error: 'ROLLEN_MISTET',
        message: 'Rollen eller grensen din dekker ikke lenger svaret, så pakken må lages på nytt.',
      });
      expect((await handle(leder, pakke, { handling: 'returnert' })).status).toBe(200);
    } finally {
      await registrerHierarki();
    }
  });

  it('kravet 20.10 i #831 punkt 1: en godkjenner i et team for totalentreprenøren avvises, og uten teamet kommer hen fram', async () => {
    await registrerHierarki({ id: o.te.id, oid: oid.te });
    try {
      const pakke = await nyPakke(EN);
      const svar = await les(o.te, pakke);
      expect(svar.status).toBe(403);
      expect(svar.kropp.message).toMatch(/team for totalentreprenøren/);
      const post = await handle(o.te, pakke, { handling: 'godkjent' });
      expect(post.status).toBe(403);

      // Kontrollsaken: samme bruker og pakke, men Catenda har ikke brukeren i TE-teamet.
      const utenTeam = await startServer(o, {
        catenda: catendaFra({ ...o.teammedlemmer, [o.prosjekt.teTeam]: [] }),
      });
      try {
        const kontroll = await kall(utenTeam.url, sti(pakke), {
          bruker: o.te,
          prosjektId: o.prosjekt.id,
        });
        expect(kontroll.status).toBe(200);
        expect(kontroll.kropp.status).toBe('aapen');
      } finally {
        await utenTeam.stopp();
      }
    } finally {
      await registrerHierarki();
    }
  });

  it('svarer ikke Catenda om teamet, gir godkjennerinngangen 503 for et medlem', async () => {
    const pakke = await nyPakke(TO);
    const nede = await startServer(o, {
      catenda: {
        medlemmer: () => Promise.reject(new Error('nede')),
        teammedlemmer: () => Promise.reject(new Error('nede')),
      },
    });
    try {
      const svar = await kall(nede.url, sti(pakke), { bruker: o.te, prosjektId: o.prosjekt.id });
      expect(svar.status).toBe(503);
    } finally {
      await nede.stopp();
    }
  });
});
