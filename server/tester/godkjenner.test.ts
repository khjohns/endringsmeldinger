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
import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import { transaksjon, type Kontekst } from '../datalag.ts';
import { lagPakke } from '../godkjenning.ts';
import { GODKJENNERRUTER } from '../godkjenner.ts';
import type { Brevverdi } from '../fullmakt.ts';
import { opprettSesjon } from '../sesjon.ts';
import { iTransaksjon, settInn } from './sqlserver_migrert.ts';
import {
  catendaFra,
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  sendKommando,
  somJobbkjoerer,
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

  it('GFK-U9: etter en retur ser den som returnerte, sin handling, og den neste i kjeden ser pakken som lukket', async () => {
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
    // Kravet 20.10 punkt 2: den neste i kjeden ser pakken som lukket, ikke som manglende tilgang.
    expect((await les(direktoer, pakke)).kropp).toMatchObject({
      status: 'lukket',
      egne_handlinger: [],
    });
    expect((await handle(direktoer, pakke, { handling: 'godkjent' })).kropp.error).toBe(
      'PAKKE_LUKKET'
    );
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

  it('kravet 20.10 i #831 punkt 1: listen over pakkene har ingen pakke i et prosjekt der aktøren er i et team for totalentreprenøren', async () => {
    await registrerHierarki({ id: o.te.id, oid: oid.te });
    const utenTeam = await startServer(o, {
      catenda: catendaFra({ ...o.teammedlemmer, [o.prosjekt.teTeam]: [] }),
    });
    try {
      const pakke = await nyPakke(EN);
      const liste = (url: string) =>
        kall(url, '/api/godkjenning/pakker', { bruker: o.te, prosjektId: null }).then((s) =>
          (s.kropp.pakker as { pakke_id: string }[]).map((p) => p.pakke_id)
        );
      expect(await liste(server.url)).not.toContain(pakke);
      // Kontrollsaken: samme bruker og pakke, men Catenda har ikke brukeren i TE-teamet.
      expect(await liste(utenTeam.url)).toContain(pakke);
    } finally {
      await utenTeam.stopp();
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

  /**
   * TEs krav sendt som brev i saken, med leveringsoppdraget, og et sendt vedlegg og et utkast
   * lagt inn av eieren med TEs kontekst.
   */
  async function medBrevOgVedlegg(sakId: string) {
    const krav = await sendKommando(server.url, o, sakId, { versjon: 1 });
    if (krav.status !== 201) throw new Error(`Kravet ble avvist: ${JSON.stringify(krav.kropp)}`);
    const fil = Buffer.from('%PDF-1.4 vedlegg');
    const [bundet, utkast] = [randomUUID(), randomUUID()];
    const te = {
      aktor: o.te.id,
      prosjekt: o.prosjekt.id,
      side: 'TE',
      team: catendaId(o.prosjekt.teTeam)!,
    };
    let eventId = '';
    await iTransaksjon(o.datalag.base.pool, te, async (r) => {
      const h = await r().input('sak', sakId).query<{
        event_id: string;
      }>('SELECT o.event_id FROM koe.leveringsoppdrag o WHERE o.sak_id = @sak');
      eventId = h.recordset[0].event_id;
      for (const [id, binding] of [
        [bundet, eventId],
        [utkast, null],
      ] as const)
        await settInn(r, 'vedlegg', {
          vedlegg_id: id,
          prosjekt_id: o.prosjekt.id,
          sak_id: sakId,
          filnavn: `${id}.pdf`,
          stoerrelse: fil.length,
          innhold_sha256: createHash('sha256').update(fil).digest('hex'),
          innhold: fil,
          lastet_opp_av: o.te.id,
          lastet_opp_side: 'TE',
          lastet_opp_team: catendaId(o.prosjekt.teTeam)!,
          bundet_av_event_id: binding,
        });
    });
    return { bundet, utkast, eventId };
  }

  /** Saken pakken gjelder, lest som saksbehandleren. */
  const sakenTil = async (pakke: string) =>
    (
      await transaksjon(o.datalag.kjoeretid.pool, somBh(), (f) =>
        f()
          .input('p', pakke)
          .query<{ sak_id: string }>('SELECT sak_id FROM koe.godkjenningspakke WHERE pakke_id = @p')
      )
    ).recordset[0].sak_id;

  it('G1: godkjenneren leser saken, de sendte brevene og vedleggene, men ikke et vedleggsutkast', async () => {
    const pakke = await nyPakke(TO);
    const sakId = await sakenTil(pakke);
    const { bundet, utkast, eventId } = await medBrevOgVedlegg(sakId);

    // Kvitteringen for leveringen, lagt inn som kjøreveien (`koe_jobbkjoerer`) med en rett bare testen gir.
    const rett = (setning: string) => o.datalag.base.pool.request().query(setning);
    await rett('GRANT INSERT ON koe.leveringskvittering TO koe_jobbkjoerer');
    try {
      await somJobbkjoerer(
        o,
        `INSERT koe.leveringskvittering (leveringsoppdrag_id, operasjon, prosjekt_id, catenda_id, forsoek_id)
         SELECT id, N'dokumentreferanse', prosjekt_id, N'ref', NEWID() FROM koe.leveringsoppdrag
          WHERE sak_id = @sak_id`,
        { sak_id: sakId }
      );
    } finally {
      await rett('REVOKE INSERT ON koe.leveringskvittering TO koe_jobbkjoerer');
    }
    const saken = await les(leder, `${pakke}/saken`);
    expect(saken.status).toBe(200);
    expect((saken.kropp.leveringsoppdrag as { levert: string | null }[])[0].levert).not.toBeNull();
    expect((saken.kropp.journal as unknown[]).length).toBeGreaterThan(0);
    expect((saken.kropp.leveringsoppdrag as { event_id: string }[]).map((x) => x.event_id)).toEqual(
      [eventId]
    );

    const vedlegg = await les(leder, `${pakke}/vedlegg`);
    expect((vedlegg.kropp.vedlegg as { vedlegg_id: string }[]).map((v) => v.vedlegg_id)).toEqual([
      bundet,
    ]);
    const fil = await fetch(`${server.url}${sti(pakke)}/vedlegg/${bundet}`, {
      headers: { Cookie: `__Host-koe_session=${leder.token}`, 'X-Project-ID': o.prosjekt.id },
    });
    expect(fil.status).toBe(200);
    expect((await les(leder, `${pakke}/vedlegg/${utkast}`)).status).toBe(404);

    const forBh = await fetch(`${server.url}/api/kjerne/saker/${sakId}/brev/${eventId}`, {
      headers: { Cookie: `__Host-koe_session=${o.bh.token}`, 'X-Project-ID': o.prosjekt.id },
    });
    expect(forBh.status).toBe(200);
    const brev = await fetch(`${server.url}${sti(pakke)}/brev/${eventId}`, {
      headers: { Cookie: `__Host-koe_session=${leder.token}`, 'X-Project-ID': o.prosjekt.id },
    });
    expect(brev.status).toBe(200);
    expect(brev.headers.get('content-type')).toBe('application/pdf');
  });

  it('G1: et brev eller vedlegg i en annen sak hentes ikke gjennom stien til pakken, også når godkjenneren står i kjeden der', async () => {
    const [pakkeA, pakkeB] = [await nyPakke(TO), await nyPakke(TO)];
    const { bundet, eventId } = await medBrevOgVedlegg(await sakenTil(pakkeB));
    const hent = (pakke: string, ressurs: string) =>
      fetch(`${server.url}${sti(pakke)}/${ressurs}`, {
        headers: { Cookie: `__Host-koe_session=${leder.token}`, 'X-Project-ID': o.prosjekt.id },
      }).then((r) => r.status);
    expect(await hent(pakkeA, `vedlegg/${bundet}`)).toBe(404);
    expect(await hent(pakkeA, `brev/${eventId}`)).toBe(404);
    // Kontrollsaken: gjennom pakken for saken der de ligger.
    expect(await hent(pakkeB, `vedlegg/${bundet}`)).toBe(200);
    expect(await hent(pakkeB, `brev/${eventId}`)).toBe(200);
  });

  it('G1: utenfor kjeden, og etter at pakken er lukket, når godkjenneren ikke saken', async () => {
    const pakke = await nyPakke(TO);
    for (const ressurs of ['saken', 'vedlegg', `brev/${randomUUID()}`])
      expect((await les(utenforKjeden, `${pakke}/${ressurs}`)).status, ressurs).toBe(404);
    expect((await handle(leder, pakke, { handling: 'returnert' })).status).toBe(200);
    for (const ressurs of ['saken', 'vedlegg'])
      expect((await les(leder, `${pakke}/${ressurs}`)).status, ressurs).toBe(404);
  });

  it('G2: listen har de åpne pakkene der aktøren står i kjeden, på tvers av prosjektene, og ingen lukkede', async () => {
    const aapen = await nyPakke(TO);
    const lukket = await nyPakke(TO);
    expect((await handle(leder, lukket, { handling: 'returnert' })).status).toBe(200);
    const liste = async (bruker: Testbruker) => {
      const svar = await kall(server.url, '/api/godkjenning/pakker', { bruker, prosjektId: null });
      expect(svar.status).toBe(200);
      return svar.kropp.pakker as { pakke_id: string; venter_paa_deg: boolean }[];
    };
    const forLeder = await liste(leder);
    expect(forLeder.find((p) => p.pakke_id === aapen)).toMatchObject({
      pakke_id: aapen,
      prosjekt_id: o.prosjekt.id,
      sak_id: await sakenTil(aapen),
      steg: 1,
      venter_paa_deg: true,
    });
    expect(forLeder.map((p) => p.pakke_id)).not.toContain(lukket);
    expect((await liste(direktoer)).find((p) => p.pakke_id === aapen)?.venter_paa_deg).toBe(false);
    expect(await liste(utenforKjeden)).toEqual([]);
    expect(await liste(o.bh)).toEqual([]);
  });

  it('kravet 20.10 i #831 punkt 1: et medlem med leserolle i et team for totalentreprenøren avvises også', async () => {
    const leser = randomUUID();
    const subjekt = randomUUID();
    await eier(async (r) => {
      await settInn(r, 'app_users', { id: leser, email: `${leser}@test.example`, name: 'Leser' });
      await settInn(r, 'app_project_memberships', {
        project_id: o.prosjekt.id,
        user_id: leser,
        catenda_subject: catendaId(subjekt),
        user_email: `${leser}@test.example`,
        display_name: 'Leser',
        role: 'member',
        viewer_override: true,
        active: true,
      });
    });
    const ny = await opprettSesjon(o.datalag.kjoeretid.pool, leser);
    const bruker = { id: leser, subjekt, token: ny.token, csrf: ny.csrfToken };
    o.teammedlemmer[o.prosjekt.teTeam].push(subjekt);
    await registrerHierarki({ id: leser, oid: randomUUID() });
    try {
      const pakke = await nyPakke(EN);
      const svar = await les(bruker, pakke);
      expect(svar.status).toBe(403);
      expect(svar.kropp.message).toMatch(/team for totalentreprenøren/);
    } finally {
      o.teammedlemmer[o.prosjekt.teTeam].pop();
      await registrerHierarki();
    }
  });

  describe.each(GODKJENNERRUTER.map((r) => [`${r.metode} ${r.eksempel('<pakke>')}`, r] as const))(
    '%s',
    (_n, r) => {
      const sti = () => r.eksempel(randomUUID());
      const kropp = r.metode === 'GET' ? undefined : { handling: 'godkjent' };
      it('uten sesjon gir 401, og uten X-Project-ID 403', async () => {
        const uten = await kall(server.url, sti(), {
          bruker: null,
          prosjektId: o.prosjekt.id,
          kropp,
        });
        expect(uten.status).toBe(401);
        const utenProsjekt = await kall(server.url, sti(), {
          bruker: leder,
          prosjektId: null,
          kropp,
        });
        expect(utenProsjekt.status).toBe(403);
      });
      it('et medlem i et team for totalentreprenøren får 403', async () => {
        const svar = await kall(server.url, sti(), {
          bruker: o.te,
          prosjektId: o.prosjekt.id,
          kropp,
        });
        expect(svar.status).toBe(403);
        expect(svar.kropp.message).toMatch(/team for totalentreprenøren/);
      });
    }
  );

  it.each(
    GODKJENNERRUTER.filter((r) => r.metode !== 'GET').map(
      (r) => [`${r.metode} ${r.eksempel('<pakke>')}`, r] as const
    )
  )('%s: uten eller med feil CSRF-token gir 403', async (_n, r) => {
    for (const csrf of [null, 'feil']) {
      const svar = await kall(server.url, r.eksempel(randomUUID()), {
        bruker: leder,
        prosjektId: o.prosjekt.id,
        kropp: { handling: 'godkjent' },
        csrf,
      });
      expect(svar.status).toBe(403);
      expect(svar.kropp.error).toBe('CSRF validation failed');
    }
  });
});
