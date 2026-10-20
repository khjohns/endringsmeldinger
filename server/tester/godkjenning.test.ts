/**
 * Kjeden fra hierarkiet og godkjenningspakkene (S-1a, #818, og S-1c, #831) mot en base
 * bygget fra migrasjonene. Forventningene har kilde i:
 * - invarianten om utkast i AGENTS.md: pakken finnes bare for teamet som laget den,
 *   og uten entydig team finnes den ikke;
 * - GFK-U9: godkjenneren i kjeden når saken og pakken mens pakken er åpen, også uten
 *   medlemskap og team; etterpå bare sin egen handling; ingen interne notater;
 * - GFK-U10 og kravet fra reviewet av #1013 i #831: driften varsles med prosjektet,
 *   brukeren og tenanten der kjeden stoppet, også når driften ikke har roller;
 * - GFK-U8: kjeden starter hos lederen til saksbehandleren og går til og med den første
 *   med en grense som dekker verdien; GFK-U4: saksbehandlerens egen rolle kan være nok;
 *   vedtaket 23.09: en verdi som ikke er tallfestet, krever hele kjeden;
 * - GFK-U2 og GFK-U10 med svarene 20.10 i #831: uten registrerte roller, med en rolle
 *   som mangler i kjeden eller en kopi eldre enn 24 timer lages ingen pakke; kjeden
 *   fryses; en godkjenner som har mistet rollen, avvises, og bare den siste i kjeden må
 *   fortsatt ha en grense som dekker verdien;
 * - B-04 punkt 1 og 2: en gitt godkjenning står når rollen endres senere, og uten rolle
 *   gis ingen ny godkjenning;
 * - arbeidsvalget i #818: rollen og grensen fryses i godkjenningen når den gis;
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
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import { feilnummer, transaksjon, type Kontekst } from '../datalag.ts';
import type { Brevverdi } from '../fullmakt.ts';
import {
  erGodkjent,
  IngenRoller,
  type LagretHandling,
  type LagretPakke,
  lagPakke,
  lesDagmulktssats,
  lesGodkjenningskjede,
  lesPakke,
  PakkeAvsluttet,
  PakkeKanIkkeLages,
  PakkeNektet,
  registrerHandling,
  RollenMistet,
  UgyldigPakke,
  type NyPakke,
} from '../godkjenning.ts';
import { lagOppsett, opprettKjernesak, rydd, TESTBASE_URL, type Oppsett } from './testbase.ts';
import { iTransaksjon, settInn, type Foresp } from './sqlserver_migrert.ts';

describe.skipIf(!TESTBASE_URL)('kjeden og godkjenningspakkene i SQL Server', () => {
  let o: Oppsett;
  let sakId: string;
  // Hierarkiet i HR-kopien: saksbehandleren `bh` har lederen `leder`, som har
  // `direktoer`. Rådgiveren er på byggherresiden i et annet team og står ikke i kopien.
  const leder = randomUUID();
  const direktoer = randomUUID();
  const raadgiver = randomUUID();
  const raadgiverteam = randomBytes(16).toString('hex');
  const tenant = randomUUID();
  const oid = { bh: randomUUID(), leder: randomUUID(), direktoer: randomUUID() };
  // Verdier kjeden dekker hos lederen og hos direktøren.
  const EN: Brevverdi = { beloep: 300000, gulv: 300000 };
  const TO: Brevverdi = { beloep: 2000000, gulv: 2000000 };

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
  const pakke = (verdi: Brevverdi, forrige: string | null = null): NyPakke => ({
    pakkeId: randomUUID(),
    sakId,
    forrigePakkeId: forrige,
    brev: { svar: [] },
    fullmaktsgrunnlag: { beloep: verdi.beloep },
    verdi,
  });
  const kjede = (verdi: Brevverdi, aktor = o.bh.id) =>
    i(som(aktor), (f) => lesGodkjenningskjede(f, verdi));
  const endre = (sql: string) => eier((r) => r().query(sql));

  // Driften registrerer rollene (GFK-U6, GFK-U11), og synkroniseringen skriver kopien.
  // Kalles også etter en test som har endret dem.
  const registrerHierarki = () =>
    eier(async (r) => {
      await r().input('tenant', tenant).query(`DELETE koe.hr_kopi; DELETE koe.rolle;
                IF NOT EXISTS (SELECT 1 FROM koe.entra_tenant WHERE tenant_id = @tenant)
                  INSERT koe.entra_tenant (tenant_id) VALUES (@tenant);`);
      for (const [rolle, grense] of [
        ['saksbehandler', 200000],
        ['seksjonsleder', 1500000],
        ['direktoer', null],
      ] as const)
        await settInn(r, 'rolle', { rolle, grense });
      const naa = new Date();
      for (const [bruker_id, egen, rolle, leder_oid] of [
        [o.bh.id, oid.bh, 'saksbehandler', oid.leder],
        [leder, oid.leder, 'seksjonsleder', oid.direktoer],
        [direktoer, oid.direktoer, 'direktoer', null],
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
      await settInn(r, 'dagmulktssats', { prosjekt_id: o.prosjekt.id, sats: 5000 });
    });
    await registrerHierarki();
  }, 240_000);
  // Hver test har sin egen sak, fordi teamet bare kan ha én åpen pakke i saken.
  beforeEach(async () => {
    sakId = await opprettKjernesak(o);
  });
  afterAll(async () => {
    if (o) await rydd(o);
  }, 60_000);

  it('byggherren leser dagmulktssatsen; entreprenøren og en leser ser den ikke', async () => {
    expect(await i(som(o.bh.id), (f) => lesDagmulktssats(f))).toBe(5000);
    const te = som(o.te.id, { side: 'TE', team: catendaId(o.prosjekt.teTeam)! });
    expect(await i(te, (f) => lesDagmulktssats(f))).toBe(null);
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
    expect(await i(som(leser), (f) => lesDagmulktssats(f))).toBe(null);
    await expect(i(som(leser), (f) => lesGodkjenningskjede(f, EN))).rejects.toThrow(PakkeNektet);
  });

  it('GFK-U8: kjeden starter hos lederen og går til og med den første med en grense som dekker verdien', async () => {
    expect(await kjede(EN)).toEqual([{ brukerId: leder, rolle: 'seksjonsleder', grense: 1500000 }]);
    expect(await kjede({ beloep: 1500000, gulv: 1500000 })).toEqual([
      { brukerId: leder, rolle: 'seksjonsleder', grense: 1500000 },
    ]);
    expect(await kjede(TO)).toEqual([
      { brukerId: leder, rolle: 'seksjonsleder', grense: 1500000 },
      { brukerId: direktoer, rolle: 'direktoer', grense: null },
    ]);
    // Kjeden er hierarkiet over saksbehandleren, ikke over den med lavest grense.
    expect((await kjede(TO, leder)).map((g) => g.brukerId)).toEqual([direktoer]);
  });

  it('GFK-U4: dekker saksbehandlerens egen rolle verdien, trengs ingen kjede og ingen pakke', async () => {
    expect(await kjede({ beloep: 200000, gulv: 200000 })).toEqual([]);
    expect(await kjede({ beloep: null, gulv: 9000000 }, direktoer)).toEqual([]);
    await expect(
      i(som(o.bh.id), (f) => lagPakke(f, pakke({ beloep: 200000, gulv: 200000 })))
    ).rejects.toThrow(UgyldigPakke);
  });

  it('en verdi som ikke er tallfestet, går gjennom hele kjeden, og den siste må dekke gulvet (23.09)', async () => {
    expect((await kjede({ beloep: null, gulv: 0 })).map((g) => g.brukerId)).toEqual([
      leder,
      direktoer,
    ]);
    try {
      await endre(`UPDATE koe.rolle SET grense = 1000000 WHERE rolle = N'direktoer'`);
      expect((await kjede({ beloep: null, gulv: 1000000 })).map((g) => g.brukerId)).toEqual([
        leder,
        direktoer,
      ]);
      await expect(kjede({ beloep: null, gulv: 1000001 })).rejects.toThrow(PakkeKanIkkeLages);
      await expect(kjede(TO)).rejects.toThrow(PakkeKanIkkeLages);
    } finally {
      await registrerHierarki();
    }
  });

  it('GFK-U10 og svaret 20.10: mangler en rolle i kjeden, eller er kopien eldre enn 24 timer, lages ingen pakke, og det logges', async () => {
    const logg = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const avvist = async (oppsett: string, verdi = TO) => {
      try {
        await endre(oppsett);
        logg.mockClear();
        await expect(i(som(o.bh.id), (f) => lagPakke(f, pakke(verdi)))).rejects.toThrow(
          PakkeKanIkkeLages
        );
        expect(logg).toHaveBeenCalledWith(
          expect.stringMatching(
            new RegExp(
              `^Godkjenningspakken kan ikke lages: [^|]+ \\(prosjekt=${o.prosjekt.id}; bruker=[0-9a-f-]{36}; tenant=`
            )
          )
        );
      } finally {
        await registrerHierarki();
      }
    };
    try {
      // Kontrollsaken: 23 timer gammel kopi er fersk.
      await endre(`UPDATE koe.hr_kopi SET hentet = DATEADD(hour, -23, SYSUTCDATETIME())`);
      expect(await kjede(TO)).toHaveLength(2);
      await avvist(`UPDATE koe.hr_kopi SET hentet = DATEADD(hour, -25, SYSUTCDATETIME())
                     WHERE bruker_id = '${direktoer}'`);
      await avvist(`UPDATE koe.hr_kopi SET hentet = DATEADD(hour, -25, SYSUTCDATETIME())
                     WHERE bruker_id = '${o.bh.id}'`);
      await avvist(
        `UPDATE koe.hr_kopi SET rolle = NULL, leder_oid = NULL WHERE bruker_id = '${leder}'`
      );
      await avvist(
        `UPDATE koe.hr_kopi SET rolle = NULL, leder_oid = NULL WHERE bruker_id = '${o.bh.id}'`
      );
      await avvist(`DELETE koe.hr_kopi WHERE bruker_id = '${direktoer}'`);
      // Lederen er i en annen tenant enn saksbehandleren.
      await avvist(`UPDATE koe.hr_kopi SET tenant_id = NEWID() WHERE bruker_id = '${leder}'`);
      await avvist(`DELETE koe.entra_tenant WHERE tenant_id = '${tenant}'`);
      // Kjeden går i ring, og verdien er ikke tallfestet, så den går til toppen.
      await avvist(
        `UPDATE koe.hr_kopi SET leder_oid = '${oid.bh}' WHERE bruker_id = '${direktoer}'`,
        {
          beloep: null,
          gulv: 0,
        }
      );
      // Meldingen sier hvor kjeden stoppet, og feilen har bare setningen.
      await endre(
        `UPDATE koe.hr_kopi SET rolle = NULL, leder_oid = NULL WHERE bruker_id = '${leder}'`
      );
      logg.mockClear();
      const feil = await i(som(o.bh.id), (f) => lagPakke(f, pakke(TO))).catch((e: unknown) => e);
      expect(feil).toBeInstanceOf(PakkeKanIkkeLages);
      expect((feil as Error).message).toBe('En leder i kjeden har ingen rolle i en fersk HR-kopi');
      expect(logg).toHaveBeenCalledWith(
        `Godkjenningspakken kan ikke lages: En leder i kjeden har ingen rolle i en fersk HR-kopi ` +
          `(prosjekt=${o.prosjekt.id}; bruker=${o.bh.id}; tenant=${tenant}; leder_oid=${oid.leder})`
      );
      await registrerHierarki();
      // Rådgiveren står ikke i kopien, og når kjeden bare leses, sier loggen det.
      logg.mockClear();
      await expect(
        i(som(raadgiver, { team: raadgiverteam }), (f) => lesGodkjenningskjede(f, EN))
      ).rejects.toThrow(PakkeKanIkkeLages);
      expect(logg).toHaveBeenCalledWith(
        `Godkjenningskjeden kan ikke avledes: Saksbehandleren har ingen rolle i en fersk HR-kopi ` +
          `(prosjekt=${o.prosjekt.id}; bruker=${raadgiver}; tenant=)`
      );
    } finally {
      logg.mockRestore();
    }
  });

  it('GFK-U2 og GFK-U10: har driften ikke registrert roller, lages ingen pakke, og driften varsles', async () => {
    const logg = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await endre('DELETE koe.hr_kopi; DELETE koe.rolle;');
      await expect(kjede(EN)).rejects.toThrow(IngenRoller);
      logg.mockClear();
      await expect(i(som(o.bh.id), (f) => lagPakke(f, pakke(EN)))).rejects.toThrow(
        'Driften har ikke registrert roller'
      );
      expect(logg).toHaveBeenCalledWith(
        `Godkjenningspakken kan ikke lages: Driften har ikke registrert roller ` +
          `(prosjekt=${o.prosjekt.id}; bruker=${o.bh.id})`
      );
    } finally {
      logg.mockRestore();
      await registrerHierarki();
    }
  });

  it('pakken finnes bare for teamet som laget den', async () => {
    const p = pakke(EN);
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
      i(som(o.bh.id, { team: undefined }), (f) => lagPakke(f, pakke(EN)))
    ).rejects.toThrow(PakkeNektet);
    const te = som(o.te.id, { side: 'TE', team: catendaId(o.prosjekt.teTeam)! });
    await expect(i(te, (f) => lagPakke(f, pakke(EN)))).rejects.toThrow(PakkeNektet);
  });

  it('stegene godkjennes i rekkefølge, og pakken er godkjent når alle er det', async () => {
    const p = pakke(TO);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    expect((await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId)))!.godkjennere).toEqual([
      leder,
      direktoer,
    ]);
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
      ['godkjent', 1, leder, { tittel: 'seksjonsleder', grense: 1500000 }],
      ['godkjent', 2, direktoer, { tittel: 'direktoer', grense: null }],
    ]);
    await expect(
      i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'returnert'))
    ).rejects.toThrow(PakkeAvsluttet);
  });

  // Godkjenneren har aktøren og prosjektet i konteksten, uten side og team (GFK-U9).
  const godkjenner = (aktor: string, k: Partial<Kontekst> = {}): Kontekst => ({
    aktor,
    prosjekt: o.prosjekt.id,
    ...k,
  });
  /** Radene i saken i `sak_metadata`, `hendelse` og `notat`, slik konteksten ser dem. */
  const synlig = (k: Kontekst) =>
    i(k, async (f) => {
      const r = await f().input('sak_id', sakId)
        .query(`SELECT COUNT(*) AS n FROM koe.sak_metadata WHERE sak_id = @sak_id;
                SELECT COUNT(*) AS n FROM koe.hendelse WHERE sak_id = @sak_id;
                SELECT COUNT(*) AS n FROM koe.notat WHERE sak_id = @sak_id;`);
      return (r.recordsets as unknown as { n: number }[][]).map((rader) => rader[0].n);
    });
  const egneHandlinger = (k: Kontekst, pakkeId: string) =>
    i(k, async (f) => {
      const r = await f()
        .input('pakke_id', pakkeId)
        .query(`SELECT handling FROM koe.godkjenningshandling WHERE pakke_id = @pakke_id`);
      return r.recordset.map((h: { handling: string }) => h.handling);
    });
  const utenMedlemskap = () =>
    endre(`UPDATE koe.app_project_memberships SET active = 0
            WHERE user_id IN ('${leder}', '${direktoer}')`);
  const medMedlemskap = () =>
    endre(`UPDATE koe.app_project_memberships SET active = 1
            WHERE user_id IN ('${leder}', '${direktoer}')`);

  it('GFK-U9: godkjenneren i kjeden når saken og pakken mens pakken er åpen, uten medlemskap og team, og ser ingen interne notater', async () => {
    const p = pakke(TO);
    await iTransaksjon(
      o.datalag.base.pool,
      { aktor: o.bh.id, prosjekt: o.prosjekt.id, side: 'BH', team: catendaId(o.prosjekt.bhTeam)! },
      (r) =>
        settInn(r, 'notat', {
          notat_id: randomUUID(),
          sak_id: sakId,
          prosjekt_id: o.prosjekt.id,
          aktor_id: o.bh.id,
          aktor_rolle: 'BH',
          aktor_team_id: catendaId(o.prosjekt.bhTeam)!,
          tekst: 'Internt notat',
        })
    );
    try {
      await utenMedlemskap();
      const [saker, hendelser, notater] = await synlig(som(o.bh.id));
      expect([saker, notater]).toEqual([1, 1]);
      expect(hendelser).toBeGreaterThan(0);
      // Kontrollsaken: uten pakke når lederen ikke saken.
      expect(await synlig(godkjenner(leder))).toEqual([0, 0, 0]);

      await i(som(o.bh.id), (f) => lagPakke(f, p));
      for (const k of [
        godkjenner(leder),
        godkjenner(direktoer),
        godkjenner(leder, { side: 'BH', team: raadgiverteam }),
      ]) {
        expect(await synlig(k)).toEqual([1, hendelser, 0]);
        expect((await i(k, (f) => lesPakke(f, p.pakkeId)))?.godkjennere).toEqual([
          leder,
          direktoer,
        ]);
      }
      // Entreprenørsiden, et annet prosjekt og en som ikke står i kjeden, når ingenting.
      const ingen = [
        godkjenner(leder, { side: 'TE', team: catendaId(o.prosjekt.teTeam)! }),
        godkjenner(leder, { prosjekt: o.annetProsjekt.id }),
        godkjenner(o.utenfor.id),
      ];
      for (const k of ingen) {
        expect(await synlig(k)).toEqual([0, 0, 0]);
        expect(await i(k, (f) => lesPakke(f, p.pakkeId))).toBe(null);
      }
      await expect(
        i(godkjenner(leder, { side: 'TE', team: catendaId(o.prosjekt.teTeam)! }), (f) =>
          registrerHandling(f, p.pakkeId, 'godkjent')
        )
      ).rejects.toThrow(PakkeNektet);

      // Trekkingen er teamets (B-04 punkt 3).
      await expect(
        i(godkjenner(leder), (f) => registrerHandling(f, p.pakkeId, 'trukket'))
      ).rejects.toThrow(PakkeNektet);
      await i(godkjenner(leder), (f) => registrerHandling(f, p.pakkeId, 'godkjent'));
      await i(godkjenner(direktoer, { side: 'BH', team: raadgiverteam }), (f) =>
        registrerHandling(f, p.pakkeId, 'godkjent')
      );
      const lest = (await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId)))!;
      expect(erGodkjent(lest)).toBe(true);
      expect(lest.handlinger.map((h) => [h.steg, h.aktorId])).toEqual([
        [1, leder],
        [2, direktoer],
      ]);

      // Pakken er lukket: godkjenneren ser bare sin egen handling.
      for (const k of [godkjenner(leder), godkjenner(direktoer)]) {
        expect(await synlig(k)).toEqual([0, 0, 0]);
        expect(await i(k, (f) => lesPakke(f, p.pakkeId))).toBe(null);
        expect(await egneHandlinger(k, p.pakkeId)).toEqual(['godkjent']);
      }
      expect(await egneHandlinger(godkjenner(o.utenfor.id), p.pakkeId)).toEqual([]);
    } finally {
      await medMedlemskap();
    }
  });

  it('GFK-U9: en returnert pakke lukker tilgangen, og en pakke i en annen sak gir ingen tilgang til denne', async () => {
    const annenSak = await opprettKjernesak(o);
    const p = pakke(TO);
    try {
      await utenMedlemskap();
      await i(som(o.bh.id), (f) => lagPakke(f, { ...p, sakId: annenSak }));
      expect(await synlig(godkjenner(leder))).toEqual([0, 0, 0]);
      await i(godkjenner(leder), (f) => registrerHandling(f, p.pakkeId, 'returnert'));
      expect(await i(godkjenner(leder), (f) => lesPakke(f, p.pakkeId))).toBe(null);
      expect(await i(godkjenner(direktoer), (f) => lesPakke(f, p.pakkeId))).toBe(null);
      expect(await egneHandlinger(godkjenner(leder), p.pakkeId)).toEqual(['returnert']);
      expect(await egneHandlinger(godkjenner(direktoer), p.pakkeId)).toEqual([]);
    } finally {
      await medMedlemskap();
    }
  });

  it('GFK-U9: en saksbehandler som er godkjenner i et annet teams åpne pakke, kan lage sin egen pakke i saken', async () => {
    await i(som(o.bh.id), (f) => lagPakke(f, pakke(TO)));
    // Lederen står i kjeden til pakken over og ser den, men den er ikke teamets.
    const egen = pakke(TO);
    await i(som(leder, { team: raadgiverteam }), (f) => lagPakke(f, egen));
    expect(
      (await i(som(leder, { team: raadgiverteam }), (f) => lesPakke(f, egen.pakkeId)))?.godkjennere
    ).toEqual([direktoer]);
  });

  it('GFK-U10: kjeden er fryst når pakken er laget, også når hierarkiet endres', async () => {
    const p = pakke(EN);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    try {
      await endre(
        `UPDATE koe.hr_kopi SET leder_oid = '${oid.direktoer}' WHERE bruker_id = '${o.bh.id}'`
      );
      expect((await kjede(EN)).map((g) => g.brukerId)).toEqual([direktoer]);
      expect((await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId)))!.godkjennere).toEqual([leder]);
      await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'godkjent'));
    } finally {
      await registrerHierarki();
    }
  });

  it('B-04 og GFK-U10: en gitt godkjenning står når rollen endres; uten rolle eller med for gammel kopi avvises godkjenningen', async () => {
    const p = pakke(TO);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'godkjent'));
    const avvist = async (oppsett: string) => {
      try {
        await endre(oppsett);
        await expect(
          i(som(direktoer), (f) => registrerHandling(f, p.pakkeId, 'godkjent'))
        ).rejects.toThrow(RollenMistet);
      } finally {
        await registrerHierarki();
      }
    };
    await avvist(`UPDATE koe.rolle SET grense = 100000 WHERE rolle = N'seksjonsleder';
                  UPDATE koe.hr_kopi SET rolle = NULL, leder_oid = NULL WHERE bruker_id = '${direktoer}'`);
    await avvist(`UPDATE koe.hr_kopi SET hentet = DATEADD(hour, -25, SYSUTCDATETIME())
                   WHERE bruker_id = '${direktoer}'`);
    const lest = (await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId)))!;
    expect(lest.handlinger.map((h) => h.fullmakt)).toEqual([
      { tittel: 'seksjonsleder', grense: 1500000 },
    ]);
    expect(erGodkjent(lest)).toBe(false);
    // Returen krever ingen rolle.
    try {
      await endre(`DELETE koe.hr_kopi WHERE bruker_id = '${direktoer}'`);
      await i(som(direktoer), (f) => registrerHandling(f, p.pakkeId, 'returnert'));
    } finally {
      await registrerHierarki();
    }
  });

  it('svaret 20.10: bare den siste i kjeden må fortsatt ha en grense som dekker verdien', async () => {
    const p = pakke(TO);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    try {
      await endre(`UPDATE koe.rolle SET grense = 100000 WHERE rolle = N'seksjonsleder';
                   UPDATE koe.rolle SET grense = 1999999 WHERE rolle = N'direktoer';`);
      await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'godkjent'));
      await expect(
        i(som(direktoer), (f) => registrerHandling(f, p.pakkeId, 'godkjent'))
      ).rejects.toThrow(RollenMistet);
      await endre(`UPDATE koe.rolle SET grense = 2000000 WHERE rolle = N'direktoer'`);
      await i(som(direktoer), (f) => registrerHandling(f, p.pakkeId, 'godkjent'));
      const lest = (await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId)))!;
      expect(lest.handlinger.map((h) => h.fullmakt)).toEqual([
        { tittel: 'seksjonsleder', grense: 100000 },
        { tittel: 'direktoer', grense: 2000000 },
      ]);
      expect(erGodkjent(lest)).toBe(true);
    } finally {
      await registrerHierarki();
    }
  });

  it('en returnert pakke er avsluttet og kan erstattes; en åpen pakke kan ikke', async () => {
    const p = pakke(EN);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await expect(i(som(o.bh.id), (f) => lagPakke(f, pakke(EN, p.pakkeId)))).rejects.toThrow(
      PakkeAvsluttet
    );
    await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'returnert', 'Beløpet må ned'));
    await expect(i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'godkjent'))).rejects.toThrow(
      PakkeAvsluttet
    );
    const ny = pakke(EN, p.pakkeId);
    await i(som(o.bh.id), (f) => lagPakke(f, ny));
    expect((await i(som(o.bh.id), (f) => lesPakke(f, ny.pakkeId)))!.forrigePakkeId).toBe(p.pakkeId);
  });

  it('en pakke erstattes bare én gang, og teamet har høyst én åpen pakke i saken', async () => {
    const p = pakke(EN);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await expect(i(som(o.bh.id), (f) => lagPakke(f, pakke(EN)))).rejects.toThrow(
      /åpen pakke i saken/
    );
    await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'returnert'));
    const ny = pakke(EN, p.pakkeId);
    await i(som(o.bh.id), (f) => lagPakke(f, ny));
    await i(som(o.bh.id), (f) => registrerHandling(f, ny.pakkeId, 'trukket'));
    await expect(i(som(o.bh.id), (f) => lagPakke(f, pakke(EN, p.pakkeId)))).rejects.toThrow(
      /alt erstattet/
    );
    // En pakke som er godkjent i alle steg, er ikke åpen.
    const godkjent = pakke(EN, ny.pakkeId);
    await i(som(o.bh.id), (f) => lagPakke(f, godkjent));
    await i(som(leder), (f) => registrerHandling(f, godkjent.pakkeId, 'godkjent'));
    await i(som(o.bh.id), (f) => lagPakke(f, pakke(EN)));
  });

  it('to pakker som lages samtidig i samme sak, gir én åpen pakke', async () => {
    const utfall = await Promise.allSettled(
      [pakke(EN), pakke(EN), pakke(EN)].map((p) => i(som(o.bh.id), (f) => lagPakke(f, p)))
    );
    expect(utfall.filter((u) => u.status === 'fulfilled')).toHaveLength(1);
    for (const u of utfall.filter((u) => u.status === 'rejected'))
      expect((u as PromiseRejectedResult).reason).toBeInstanceOf(PakkeAvsluttet);
  });

  it('alle i teamet kan trekke pakken, også når alle steg er godkjent (B-04 punkt 3)', async () => {
    const p = pakke(EN);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await expect(
      i(som(raadgiver, { team: raadgiverteam }), (f) => registrerHandling(f, p.pakkeId, 'trukket'))
    ).rejects.toThrow(PakkeNektet);
    await i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'trukket'));
    expect((await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId)))!.handlinger).toMatchObject([
      { handling: 'trukket', steg: null, aktorId: leder, fullmakt: null },
    ]);

    const godkjent = pakke(EN, p.pakkeId);
    await i(som(o.bh.id), (f) => lagPakke(f, godkjent));
    await i(som(leder), (f) => registrerHandling(f, godkjent.pakkeId, 'godkjent'));
    await i(som(o.bh.id), (f) => registrerHandling(f, godkjent.pakkeId, 'trukket'));
    const lest = (await i(som(o.bh.id), (f) => lesPakke(f, godkjent.pakkeId)))!;
    expect(lest.handlinger.map((h) => h.handling)).toEqual(['godkjent', 'trukket']);
    expect(erGodkjent(lest)).toBe(false);
  });

  it('GFK-U9: en i et annet team som ikke står i kjeden, kan ikke godkjenne pakken; godkjenneren kan', async () => {
    const p = pakke(EN);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    await expect(
      i(som(raadgiver, { team: raadgiverteam }), (f) => registrerHandling(f, p.pakkeId, 'godkjent'))
    ).rejects.toThrow(PakkeNektet);
    await i(som(leder, { team: raadgiverteam }), (f) =>
      registrerHandling(f, p.pakkeId, 'godkjent')
    );
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
    expect(await nummer(medSide(o.bh.id, 'BHX', (f) => lagPakke(f, pakke(EN))))).toBe(51403);
    const p = pakke(EN);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    expect(
      await nummer(medSide(leder, 'BHX', (f) => registrerHandling(f, p.pakkeId, 'godkjent')))
    ).toBe(51403);
    const lest = (await i(som(o.bh.id), (f) => lesPakke(f, p.pakkeId)))!;
    expect(lest.handlinger).toEqual([]);
  });

  it('et brudd på en unik nøkkel gir PakkeAvsluttet, ikke en rå databasefeil (#829 punkt 3)', async () => {
    const p = pakke(EN);
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
    const p = { ...pakke(EN), sakId: etter };
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
          verdi_gulv: 0,
        }),
      () => i(som(o.bh.id), (f) => lagPakke(f, { ...pakke(EN, p.pakkeId), sakId: etter }))
    );
    avsluttetMed2601(feil);
  });

  it('et samtidig godkjent steg gir PakkeAvsluttet fra godkjenningshandling_godkjent (#860 punkt 2)', async () => {
    const p = pakke(TO);
    await i(som(o.bh.id), (f) => lagPakke(f, p));
    const feil = await underSamtidigLagring(
      leder,
      handling(p.pakkeId, {
        handling: 'godkjent',
        steg: 1,
        aktor_id: leder,
        fullmakt_tittel: 'seksjonsleder',
        fullmakt_grense: 1500000,
        fullmakt_ubegrenset: false,
      }),
      () => i(som(leder), (f) => registrerHandling(f, p.pakkeId, 'godkjent'))
    );
    avsluttetMed2601(feil);
  });

  it('en samtidig returnert pakke gir PakkeAvsluttet fra godkjenningshandling_avsluttet (#860 punkt 2)', async () => {
    const p = pakke(EN);
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
