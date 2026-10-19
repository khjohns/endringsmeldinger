/**
 * En ny sak samtidig med en ny registrering av prosjektet eller nye kontraktsteam
 * (#868 punkt 1), mot en base bygget fra migrasjonene. Forventningene har kilde i:
 * - arbeidsvalget 18.10 i #764 («Runde 8b»): har prosjektet saker, avvises bytte av
 *   Catenda-prosjekt med 52066;
 * - svaret 18.10 i #764 («Runde 8: avgjort 18.10»): har prosjektet saker, avvises
 *   flytting eller fjerning av et kontraktsteam med 52064;
 * - DL-U10: et bytte av kobling gjør medlemskapene inaktive;
 * - arbeidsvalget 19.10 i runde 9 (#764, valg A): en sak der medlemskapet er blitt
 *   inaktivt, eller teamet ikke lenger er kontraktsteam på siden, avvises med 51403
 *   i stedet for å skrives (DL-U4 sier hvilket team som kan føres).
 *
 * Den ene skrivingen holdes åpen til den andre venter på den; da lagres den første,
 * og den andre fullføres eller avvises.
 */
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { opprettelse } from '../../kjerne/kommandoer/opprettelse.ts';
import { catendaId } from '../autorisasjon.ts';
import { feilnummer } from '../datalag.ts';
import { kommandosum, opprettSak, SkrivingAvvist } from '../kommandoer.ts';
import { iTransaksjon, type Foresp, type Kontekst } from './sqlserver_migrert.ts';
import { lagOppsett, rydd, TESTBASE_URL, type Oppsett } from './testbase.ts';

describe.skipIf(!TESTBASE_URL)('en ny sak og registreringen av prosjektet samtidig', () => {
  let o: Oppsett;
  beforeEach(async () => {
    o = await lagOppsett();
  }, 240_000);
  afterEach(async () => {
    if (o) await rydd(o);
  }, 60_000);

  const te = (): Kontekst => ({
    aktor: o.te.id,
    prosjekt: o.prosjekt.id,
    side: 'TE',
    team: catendaId(o.prosjekt.teTeam)!,
  });
  const sak = () => {
    const vurdert = opprettelse({ type: 'opprett_sak', sakstittel: 'Skiva' }, 'TE');
    if (!vurdert.godtatt) throw new Error(vurdert.avvisning.melding);
    return vurdert;
  };
  // Uten `entydigTeam` er aktøren med i flere team på siden, og konteksten har ikke noe team.
  const opprett = (entydigTeam = true) => {
    const { format, data } = sak();
    const team = entydigTeam ? catendaId(o.prosjekt.teTeam)! : undefined;
    return opprettSak(
      o.datalag.kjoeretid.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE', team },
      { id: randomUUID(), sha256: kommandosum(data) },
      { format, data }
    );
  };
  const opprettIAapen = (r: Foresp) => {
    const { format, data } = sak();
    return r()
      .input('format', format)
      .input('data', JSON.stringify(data))
      .input('kommando_id', randomUUID())
      .input('kommando_sha256', kommandosum(data))
      .batch(
        `DECLARE @sak_id nvarchar(36), @event_id nvarchar(36), @tidsstempel datetime2(3);
         EXEC koe_api.opprett_sak @format = @format, @data = @data, @kommando_id = @kommando_id,
           @kommando_sha256 = @kommando_sha256, @sak_id = @sak_id OUTPUT,
           @event_id = @event_id OUTPUT, @tidsstempel = @tidsstempel OUTPUT;`
      );
  };
  const team = (teTeam: string, bhTeam: string) =>
    JSON.stringify([
      { team_id: catendaId(teTeam), contract_role: 'TE' },
      { team_id: catendaId(bhTeam), contract_role: 'BH' },
    ]);
  const bytt = (r: Foresp) =>
    r()
      .input('prosjekt', o.prosjekt.id)
      .input('navn', 'Testmiljøet')
      .input('beskrivelse', null)
      .input('organisasjon', 'org-test')
      .input('catenda_prosjekt', randomUUID())
      .input('bibliotek', randomUUID())
      .input('mappe', null)
      .input('board', randomUUID())
      .input('team', team(randomUUID(), randomUUID()))
      .execute('koe_drift.registrer_prosjekt');
  const flyttTe = (r: Foresp) =>
    r()
      .input('prosjekt', o.prosjekt.id)
      .input('team', team(randomUUID(), o.prosjekt.bhTeam))
      .execute('koe_drift.sett_kontraktsteam');
  const eier = () => o.datalag.base.pool.request();

  /**
   * Kjører `foerst` i en transaksjon som holdes åpen til `samtidig` venter på den, og
   * lagrer den så. Gir feilen fra `samtidig`, eller `undefined`.
   */
  async function mensAapen(
    k: Kontekst | null,
    foerst: (r: Foresp) => Promise<unknown>,
    samtidig: () => Promise<unknown>
  ): Promise<unknown> {
    const pool = k ? o.datalag.kjoeretid.pool : o.datalag.base.pool;
    let utfall: Promise<unknown> | undefined;
    await iTransaksjon(pool, k, async (r) => {
      await foerst(r);
      const { spid } = (await r().query<{ spid: number }>('SELECT @@SPID AS spid')).recordset[0];
      utfall = samtidig().then(
        () => undefined,
        (e: unknown) => e
      );
      for (let forsoek = 0; ; forsoek++) {
        const venter = await eier().input('spid', spid).query<{
          antall: number;
        }>('SELECT COUNT(*) AS antall FROM sys.dm_exec_requests WHERE blocking_session_id = @spid');
        if (venter.recordset[0].antall > 0) break;
        if (forsoek === 100) throw new Error('Den andre skrivingen ventet aldri');
        await new Promise((ferdig) => setTimeout(ferdig, 50));
      }
    });
    return utfall;
  }

  async function harSaker() {
    const svar = await eier().input('p', o.prosjekt.id).query<{
      antall: number;
    }>('SELECT COUNT(*) AS antall FROM koe.prosjekt_med_saker WHERE prosjekt_id = @p');
    return svar.recordset[0].antall > 0;
  }

  it('en sak som skrives under et bytte av Catenda-prosjekt, venter og avvises med 51403', async () => {
    const feil = await mensAapen(null, bytt, () => opprett());
    expect(feil).toBeInstanceOf(SkrivingAvvist);
    expect(feilnummer((feil as Error).cause)).toBe(51403);
    expect(await harSaker()).toBe(false);
  });

  it('uten entydig team avvises saken under et bytte fordi medlemskapet er gjort inaktivt', async () => {
    const feil = await mensAapen(null, bytt, () => opprett(false));
    expect(feil).toBeInstanceOf(SkrivingAvvist);
    expect(feilnummer((feil as Error).cause)).toBe(51403);
    expect(await harSaker()).toBe(false);
  });

  it('et bytte av Catenda-prosjekt under en sak som skrives, venter og avvises med 52066', async () => {
    const feil = await mensAapen(te(), opprettIAapen, () =>
      iTransaksjon(o.datalag.base.pool, null, bytt)
    );
    expect(feilnummer(feil)).toBe(52066);
    expect(await harSaker()).toBe(true);
  });

  it('en sak som skrives mens teamet tas ut av kontraktsteamene, venter og avvises med 51403', async () => {
    const feil = await mensAapen(null, flyttTe, () => opprett());
    expect(feil).toBeInstanceOf(SkrivingAvvist);
    expect(feilnummer((feil as Error).cause)).toBe(51403);
    expect(await harSaker()).toBe(false);
  });

  it('nye kontraktsteam uten teamet under en sak som skrives, venter og avvises med 52064', async () => {
    const feil = await mensAapen(te(), opprettIAapen, () =>
      iTransaksjon(o.datalag.base.pool, null, flyttTe)
    );
    expect(feilnummer(feil)).toBe(52064);
    expect(await harSaker()).toBe(true);
  });

  it('uten noe samtidig skrives saken', async () => {
    await opprett();
    expect(await harSaker()).toBe(true);
  });
});
