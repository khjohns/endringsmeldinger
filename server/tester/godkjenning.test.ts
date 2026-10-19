/**
 * Fullmaktene og godkjenningspakkene (S-1a, #818) mot en base bygget fra
 * migrasjonene. Forventningene har kilde i:
 * - invarianten om utkast i AGENTS.md: pakken finnes bare for teamet som laget den,
 *   og uten entydig team finnes den ikke;
 * - GFK-U1: fullmaktene settes opp av driften, ikke av appen, og er byggherrens;
 * - B-04 punkt 1 og 2: en godkjenning gitt med fullmakt står når fullmakten endres
 *   senere, og uten fullmakt gis ingen ny godkjenning;
 * - arbeidsvalget i #818: fullmakten fryses i godkjenningen når den gis;
 * - B-04 punkt 3 og svaret 18.10 i #818: alle i teamet kan trekke pakken, også når alle
 *   steg er godkjent;
 * - det tekniske valget 18.10 i #818: en pakke erstattes bare én gang, og teamet har
 *   høyst én åpen pakke i saken;
 * - #829 punkt 1, 3 og 5: siden i konteksten leses uten avkutting, et brudd på en unik
 *   indeks er en avsluttet pakke og ikke en rå databasefeil, og pakken er godkjent når
 *   hvert steg er det;
 * - #860 punkt 2: bruddet prøves også på de tre unike indeksene (2601), med en rad som
 *   lagres mens prosedyren venter.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import { feilnummer, transaksjon, type Kontekst } from '../datalag.ts';
import {
  erGodkjent,
  type LagretHandling,
  type LagretPakke,
  lagPakke,
  lesFullmakter,
  lesPakke,
  PakkeAvsluttet,
  PakkeNektet,
  registrerHandling,
  UgyldigPakke,
  type NyPakke,
} from '../godkjenning.ts';
import { lagOppsett, opprettKjernesak, rydd, TESTBASE_URL, type Oppsett } from './testbase.ts';
import { iTransaksjon, settInn, type Foresp } from './sqlserver_migrert.ts';

describe.skipIf(!TESTBASE_URL)('fullmaktene og godkjenningspakkene i SQL Server', () => {
  let o: Oppsett;
  let sakId: string;
  // To godkjennere i byggherrens team, og en rådgiver på byggherresiden i et annet team.
  const leder = randomUUID();
  const direktoer = randomUUID();
  const raadgiver = randomUUID();
  const raadgiverteam = randomBytes(16).toString('hex');

  const som = (aktor: string, k: Partial<Kontekst> = {}): Kontekst => ({
    aktor,
    prosjekt: o.prosjekt.id,
    side: 'BH',
    team: catendaId(o.prosjekt.bhTeam)!,
    ...k,
  });
  const i = <T>(k: Kontekst, arbeid: Parameters<typeof transaksjon<T>>[2]) =>
    transaksjon(o.datalag.kjoeretid.pool, k, arbeid);
  const eier = <T>(arbeid: Parameters<typeof iTransaksjon<T>>[2]) =>
    iTransaksjon(o.datalag.base.pool, null, arbeid);
  const pakke = (godkjennere: string[], forrige: string | null = null): NyPakke => ({
    pakkeId: randomUUID(),
    sakId,
    forrigePakkeId: forrige,
    brev: { svar: [] },
    fullmaktsgrunnlag: { beloep: 300000 },
    godkjennere,
  });

  beforeAll(async () => {
    o = await lagOppsett();
    await eier(async (r) => {
      await settInn(r, 'catenda_contract_teams', {
        internal_project_id: o.prosjekt.id,
        team_id: raadgiverteam,
        contract_role: 'BH',
      });
      for (const id of [leder, direktoer, raadgiver]) {
        await settInn(r, 'app_users', { id, email: `${id}@test.example`, name: 'Testbruker' });
        await settInn(r, 'app_project_memberships', {
          project_id: o.prosjekt.id,
          user_id: id,
          catenda_subject: randomBytes(16).toString('hex'),
          user_email: `${id}@test.example`,
          display_name: 'Testbruker',
          role: 'member',
          viewer_override: false,
          active: true,
        });
      }
      // Driften setter opp fullmaktene (GFK-U1). Saksbehandleren `bh` har ingen.
      await settInn(r, 'fullmakt', {
        prosjekt_id: o.prosjekt.id,
        bruker_id: leder,
        tittel: 'Seksjonsleder',
        grense: 1500000,
        plass: 1,
      });
      await settInn(r, 'fullmakt', {
        prosjekt_id: o.prosjekt.id,
        bruker_id: direktoer,
        tittel: 'Adm.dir.',
        grense: null,
        plass: 2,
      });
      await settInn(r, 'dagmulktssats', { prosjekt_id: o.prosjekt.id, sats: 5000 });
    });
  }, 240_000);
  // Hver test har sin egen sak, fordi teamet bare kan ha én åpen pakke i saken.
  beforeEach(async () => {
    sakId = await opprettKjernesak(o);
  });
  afterAll(async () => {
    if (o) await rydd(o);
  }, 60_000);

  it('byggherren leser fullmaktene i kjedens rekkefølge og dagmulktssatsen', async () => {
    expect(await i(som(o.bh.id), (f) => lesFullmakter(f))).toEqual({
      fullmakter: [
        { brukerId: leder, tittel: 'Seksjonsleder', grense: 1500000, plass: 1 },
        { brukerId: direktoer, tittel: 'Adm.dir.', grense: null, plass: 2 },
      ],
      dagmulktssats: 5000,
    });
  });

  it('totalentreprenøren ser ingen fullmakter eller sats', async () => {
    const k = som(o.te.id, { side: 'TE', team: catendaId(o.prosjekt.teTeam)! });
    expect(await i(k, (f) => lesFullmakter(f))).toEqual({ fullmakter: [], dagmulktssats: null });
  });

  it('pakken finnes bare for teamet som laget den', async () => {
    const p = pakke([leder]);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    const lest = await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId));
    expect(lest).toMatchObject({
      pakkeId: p.pakkeId,
      sakId,
      aktorId: o.bh.id,
      godkjennere: [leder],
      handlinger: [],
    });
    expect(await i(som(raadgiver, { team: raadgiverteam }), (f) => lesPakke(f, p.pakkeId))).toBe(
      null
    );
    const te = som(o.te.id, { side: 'TE', team: catendaId(o.prosjekt.teTeam)! });
    expect(await i(te, (f) => lesPakke(f, p.pakkeId))).toBe(null);
    expect(await i(som(o.bh.id, { team: undefined }), (f) => lesPakke(f, p.pakkeId))).toBe(null);
  });

  it('uten entydig team, eller på entreprenørsiden, lagres ingen pakke', async () => {
    await expect(
      i(som(o.bh.id, { team: undefined }), (f) => lagPakke(f, pakke([leder])))
    ).rejects.toThrow(PakkeNektet);
    const te = som(o.te.id, { side: 'TE', team: catendaId(o.prosjekt.teTeam)! });
    await expect(i(te, (f) => lagPakke(f, pakke([leder])))).rejects.toThrow(PakkeNektet);
  });

  it('en godkjenner uten fullmakt i prosjektet avvises', async () => {
    await expect(i(som(o.bh.id), (f) => lagPakke(f, pakke([raadgiver])))).rejects.toThrow(
      UgyldigPakke
    );
    await expect(i(som(o.bh.id), (f) => lagPakke(f, pakke([])))).rejects.toThrow(UgyldigPakke);
  });

  it('en godkjenner to ganger, eller godkjennerne som et JSON-objekt, er en ugyldig pakke', async () => {
    await expect(i(som(o.bh.id), (f) => lagPakke(f, pakke([leder, leder])))).rejects.toThrow(
      UgyldigPakke
    );
    const objekt = { ...pakke([]), godkjennere: { a: leder } as unknown as string[] };
    await expect(i(som(o.bh.id), (f) => lagPakke(f, objekt))).rejects.toThrow(UgyldigPakke);
  });

  it('en leser på byggherresiden ser ingen fullmakter eller sats', async () => {
    const leser = randomUUID();
    await eier(async (r) => {
      await settInn(r, 'app_users', {
        id: leser,
        email: `${leser}@test.example`,
        name: 'Testbruker',
      });
      await settInn(r, 'app_project_memberships', {
        project_id: o.prosjekt.id,
        user_id: leser,
        catenda_subject: randomBytes(16).toString('hex'),
        user_email: `${leser}@test.example`,
        display_name: 'Testbruker',
        role: 'member',
        viewer_override: true,
        active: true,
      });
    });
    expect(await i(som(leser), (f) => lesFullmakter(f))).toEqual({
      fullmakter: [],
      dagmulktssats: null,
    });
  });

  it('stegene godkjennes i rekkefølge, og pakken er godkjent når alle er det', async () => {
    const p = pakke([leder, direktoer]);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await expect(
      i(som(direktoer), (f) => registrerHandling(f, p.pakkeId, 'godkjent'))
    ).rejects.toThrow(PakkeNektet);
    await expect(
      i(som(o.bh.id), (f) => registrerHandling(f, p.pakkeId, 'godkjent'))
    ).rejects.toThrow(PakkeNektet);
    await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'godkjent'));
    await i(som(direktoer), (f) => registrerHandling(f, p.pakkeId, 'godkjent'));
    const lest = (await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId)))!;
    expect(erGodkjent(lest)).toBe(true);
    expect(lest.handlinger.map((h) => [h.handling, h.steg, h.aktorId, h.fullmakt])).toEqual([
      ['godkjent', 1, leder, { tittel: 'Seksjonsleder', grense: 1500000 }],
      ['godkjent', 2, direktoer, { tittel: 'Adm.dir.', grense: null }],
    ]);
    await expect(
      i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'returnert'))
    ).rejects.toThrow(PakkeAvsluttet);
  });

  it('B-04: en gitt godkjenning står når fullmakten endres, og uten fullmakt gis ingen ny', async () => {
    const p = pakke([leder, direktoer]);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'godkjent'));
    try {
      await eier((r) =>
        r()
          .input('p', o.prosjekt.id)
          .query(
            `UPDATE koe.fullmakt SET grense = 100000 WHERE prosjekt_id = @p AND plass = 1;
             UPDATE koe.fullmakt SET plass = 3 WHERE prosjekt_id = @p AND plass = 2;`
          )
      );
      await eier((r) =>
        r()
          .input('p', o.prosjekt.id)
          .query(`DELETE koe.fullmakt WHERE prosjekt_id = @p AND plass = 3`)
      );
      await expect(
        i(som(direktoer), (f) => registrerHandling(f, p.pakkeId, 'godkjent'))
      ).rejects.toThrow(PakkeNektet);
      const lest = (await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId)))!;
      expect(lest.handlinger[0].fullmakt).toEqual({ tittel: 'Seksjonsleder', grense: 1500000 });
      expect(erGodkjent(lest)).toBe(false);
    } finally {
      await eier(async (r) => {
        await r()
          .input('p', o.prosjekt.id)
          .query(`UPDATE koe.fullmakt SET grense = 1500000 WHERE prosjekt_id = @p AND plass = 1`);
        await settInn(r, 'fullmakt', {
          prosjekt_id: o.prosjekt.id,
          bruker_id: direktoer,
          tittel: 'Adm.dir.',
          grense: null,
          plass: 2,
        });
      });
    }
  });

  it('en returnert pakke er avsluttet og kan erstattes; en åpen pakke kan ikke', async () => {
    const p = pakke([leder]);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await expect(i(som(o.bh.id), (f) => lagPakke(f, pakke([leder], p.pakkeId)))).rejects.toThrow(
      PakkeAvsluttet
    );
    await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'returnert', 'Beløpet må ned'));
    await expect(i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'godkjent'))).rejects.toThrow(
      PakkeAvsluttet
    );
    const ny = pakke([leder], p.pakkeId);
    await i(som(o.bh.id), (f) => lagPakke(f, ny));
    expect((await i(som(o.bh.id), (f) => lesPakke(f, ny.pakkeId)))!.forrigePakkeId).toBe(p.pakkeId);
  });

  it('en pakke erstattes bare én gang, og teamet har høyst én åpen pakke i saken', async () => {
    const p = pakke([leder]);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await expect(i(som(o.bh.id), (f) => lagPakke(f, pakke([leder])))).rejects.toThrow(
      /åpen pakke i saken/
    );
    await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'returnert'));
    const ny = pakke([leder], p.pakkeId);
    await i(som(o.bh.id), (f) => lagPakke(f, ny));
    await i(som(o.bh.id), (f) => registrerHandling(f, ny.pakkeId, 'trukket'));
    await expect(i(som(o.bh.id), (f) => lagPakke(f, pakke([leder], p.pakkeId)))).rejects.toThrow(
      /alt erstattet/
    );
    // En pakke som er godkjent i alle steg, er ikke åpen.
    const godkjent = pakke([leder], ny.pakkeId);
    await i(som(o.bh.id), (f) => lagPakke(f, godkjent));
    await i(som(leder), (f) => registrerHandling(f, godkjent.pakkeId, 'godkjent'));
    await i(som(o.bh.id), (f) => lagPakke(f, pakke([leder])));
  });

  it('to pakker som lages samtidig i samme sak, gir én åpen pakke', async () => {
    const utfall = await Promise.allSettled(
      [pakke([leder]), pakke([leder]), pakke([leder])].map((p) =>
        i(som(o.bh.id), (f) => lagPakke(f, p))
      )
    );
    expect(utfall.filter((u) => u.status === 'fulfilled')).toHaveLength(1);
    for (const u of utfall.filter((u) => u.status === 'rejected'))
      expect((u as PromiseRejectedResult).reason).toBeInstanceOf(PakkeAvsluttet);
  });

  it('alle i teamet kan trekke pakken, også når alle steg er godkjent (B-04 punkt 3)', async () => {
    const p = pakke([leder]);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await expect(
      i(som(raadgiver, { team: raadgiverteam }), (f) => registrerHandling(f, p.pakkeId, 'trukket'))
    ).rejects.toThrow(PakkeNektet);
    await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'trukket'));
    expect((await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId)))!.handlinger).toMatchObject([
      { handling: 'trukket', steg: null, aktorId: leder, fullmakt: null },
    ]);

    const godkjent = pakke([leder], p.pakkeId);
    await i(som(o.bh.id), (f) => lagPakke(f, godkjent));
    await i(som(leder), (f) => registrerHandling(f, godkjent.pakkeId, 'godkjent'));
    await i(som(o.bh.id), (f) => registrerHandling(f, godkjent.pakkeId, 'trukket'));
    const lest = (await i(som(o.bh.id), (f) => lesPakke(f, godkjent.pakkeId)))!;
    expect(lest.handlinger.map((h) => h.handling)).toEqual(['godkjent', 'trukket']);
    expect(erGodkjent(lest)).toBe(false);
  });

  it('en pakke i et annet team kan ikke godkjennes', async () => {
    const p = pakke([leder]);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await expect(
      i(som(leder, { team: raadgiverteam }), (f) => registrerHandling(f, p.pakkeId, 'godkjent'))
    ).rejects.toThrow(PakkeNektet);
  });

  // Konteksten settes uten kontrollen i `transaksjon`, som bare godtar TE og BH.
  const medSide = <T>(aktor: string, side: string, arbeid: Parameters<typeof iTransaksjon<T>>[2]) =>
    iTransaksjon(
      o.datalag.kjoeretid.pool,
      { aktor, prosjekt: o.prosjekt.id, side, team: catendaId(o.prosjekt.bhTeam)! },
      arbeid
    );
  const nummer = (arbeid: Promise<unknown>) =>
    arbeid.then(
      () => undefined,
      (feil: unknown) => {
        expect(feil).toBeInstanceOf(PakkeNektet);
        return feilnummer((feil as Error).cause);
      }
    );

  it('en side som bare begynner med BH, avvises av prosedyrene og ikke først av radsikkerheten (#829 punkt 1)', async () => {
    // Lest som `nvarchar(2)` blir `BHX` til `BH` og slipper forbi kontrollen i
    // prosedyren, så blokkpredikatet stopper skrivingen med 33504 i stedet for 51403.
    expect(await nummer(medSide(o.bh.id, 'BHX', (f) => lagPakke(f, pakke([leder]))))).toBe(51403);
    const p = pakke([leder]);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    expect(
      await nummer(medSide(leder, 'BHX', (f) => registrerHandling(f, p.pakkeId, 'godkjent')))
    ).toBe(51403);
    const lest = (await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId)))!;
    expect(lest.handlinger).toEqual([]);
  });

  it('et brudd på en unik nøkkel gir PakkeAvsluttet, ikke en rå databasefeil (#829 punkt 3)', async () => {
    const p = pakke([leder]);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    const annenSak = await opprettKjernesak(o);
    const feil = await i(som(o.bh.id), (f) => lagPakke(f, { ...p, sakId: annenSak })).then(
      () => undefined,
      (e: unknown) => e
    );
    expect(feil).toBeInstanceOf(PakkeAvsluttet);
    expect(feilnummer((feil as Error).cause)).toBe(2627);
  });

  // Eieren lagrer en rad som prosedyrens kontroller ikke ser, fordi den ikke er lagret
  // ennå. Prosedyren venter på den unike indeksen og møter raden når eieren lagrer.
  const underSamtidigLagring = async (
    aktor: string,
    rad: (r: Foresp) => Promise<unknown>,
    kall: () => Promise<unknown>
  ) => {
    let utfall: Promise<unknown> | undefined;
    const k = { aktor, prosjekt: o.prosjekt.id, side: 'BH', team: catendaId(o.prosjekt.bhTeam)! };
    await iTransaksjon(o.datalag.base.pool, k, async (r) => {
      await rad(r);
      const { spid } = (await r().query<{ spid: number }>('SELECT @@SPID AS spid')).recordset[0];
      utfall = kall().then(
        () => undefined,
        (e: unknown) => e
      );
      for (let forsoek = 0; ; forsoek++) {
        const venter = await o.datalag.base.pool.request().input('spid', spid).query<{
          antall: number;
        }>('SELECT COUNT(*) AS antall FROM sys.dm_exec_requests WHERE blocking_session_id = @spid');
        if (venter.recordset[0].antall > 0) break;
        if (forsoek === 100) throw new Error('Prosedyren ventet aldri på raden');
        await new Promise((ferdig) => setTimeout(ferdig, 50));
      }
    });
    return utfall;
  };
  const handling = (pakkeId: string, rad: Record<string, unknown>) => (r: Foresp) =>
    settInn(r, 'godkjenningshandling', {
      pakke_id: pakkeId,
      loepenr: 99,
      prosjekt_id: o.prosjekt.id,
      aktor_rolle: 'BH',
      aktor_team_id: catendaId(o.prosjekt.bhTeam),
      ...rad,
    });
  const avsluttetMed2601 = (feil: unknown) => {
    expect(feil).toBeInstanceOf(PakkeAvsluttet);
    expect(feilnummer((feil as Error).cause)).toBe(2601);
  };

  it('en pakke som erstattes samtidig, gir PakkeAvsluttet fra godkjenningspakke_erstattet_en_gang (#860 punkt 2)', async () => {
    // Raden lagres i en sak som sorterer før saken prosedyren låser, så låsen på
    // saken i indeksen ikke venter på den.
    const [foer, etter] = [sakId, await opprettKjernesak(o)].sort();
    const p = { ...pakke([leder]), sakId: etter };
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'returnert'));
    const feil = await underSamtidigLagring(
      o.bh.id,
      (r) =>
        settInn(r, 'godkjenningspakke', {
          pakke_id: randomUUID(),
          prosjekt_id: o.prosjekt.id,
          sak_id: foer,
          forrige_pakke_id: p.pakkeId,
          aktor_id: o.bh.id,
          aktor_rolle: 'BH',
          aktor_team_id: catendaId(o.prosjekt.bhTeam),
          brev: '{}',
          fullmaktsgrunnlag: '{}',
        }),
      () => i(som(o.bh.id), (f) => lagPakke(f, { ...pakke([leder], p.pakkeId), sakId: etter }))
    );
    avsluttetMed2601(feil);
  });

  it('et samtidig godkjent steg gir PakkeAvsluttet fra godkjenningshandling_godkjent (#860 punkt 2)', async () => {
    const p = pakke([leder, direktoer]);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    const feil = await underSamtidigLagring(
      leder,
      handling(p.pakkeId, {
        handling: 'godkjent',
        steg: 1,
        aktor_id: leder,
        fullmakt_tittel: 'Seksjonsleder',
        fullmakt_grense: 1500000,
        fullmakt_ubegrenset: false,
      }),
      () => i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'godkjent'))
    );
    avsluttetMed2601(feil);
  });

  it('en samtidig returnert pakke gir PakkeAvsluttet fra godkjenningshandling_avsluttet (#860 punkt 2)', async () => {
    const p = pakke([leder]);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    const feil = await underSamtidigLagring(
      leder,
      handling(p.pakkeId, { handling: 'returnert', aktor_id: leder }),
      () => i(som(o.bh.id), (f) => registrerHandling(f, p.pakkeId, 'trukket'))
    );
    avsluttetMed2601(feil);
  });
});

// Kilde: #829 punkt 5. Pakken er godkjent når hvert steg i kjeden har en godkjenning,
// uavhengig av de unike indeksene som hindrer to godkjenninger i samme steg.
describe('erGodkjent', () => {
  const godkjent = (steg: number): LagretHandling => ({
    handling: 'godkjent',
    steg,
    aktorId: randomUUID(),
    fullmakt: { tittel: 'Seksjonsleder', grense: null },
    begrunnelse: null,
    tidspunkt: new Date(0),
  });
  const pakke = (godkjennere: number, handlinger: LagretHandling[]): LagretPakke => ({
    pakkeId: randomUUID(),
    sakId: randomUUID(),
    forrigePakkeId: null,
    aktorId: randomUUID(),
    brev: {},
    fullmaktsgrunnlag: {},
    opprettet: new Date(0),
    godkjennere: Array.from({ length: godkjennere }, () => randomUUID()),
    handlinger,
  });

  it('godkjent i hvert steg er godkjent', () => {
    expect(erGodkjent(pakke(2, [godkjent(1), godkjent(2)]))).toBe(true);
  });
  it('to godkjenninger i samme steg dekker ikke kjeden', () => {
    expect(erGodkjent(pakke(2, [godkjent(1), godkjent(1)]))).toBe(false);
  });
  it('et steg uten godkjenning er ikke godkjent', () => {
    expect(erGodkjent(pakke(2, [godkjent(1)]))).toBe(false);
  });
  it('en trukket pakke er ikke godkjent, også når hvert steg er det', () => {
    const trukket = { ...godkjent(1), handling: 'trukket' as const, steg: null };
    expect(erGodkjent(pakke(1, [godkjent(1), trukket]))).toBe(false);
  });
});
