/**
 * Tidsavbruddet ved inaktivitet og tilbakekallingen av sesjonen (#1806, forventet
 * resultat 2 og 3), over HTTP mot en base bygget fra migrasjonene. Tilbakekallingen
 * prøves gjennom prosedyrene kjøretiden kaller: medlemssynkroniseringen,
 * deaktiveringen ved innlogging og HR-synkroniseringen. Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId, sesjonsnavn } from '../autorisasjon.ts';
import { sha256 } from '../bruker.ts';
import { synkroniserHr } from '../hrdata.ts';
import { synkroniserMedlemskap, type Medlem } from '../medlemskap.ts';
import { opprettSesjon } from '../sesjon.ts';
import { basensKlokkeEtter, catendaBruker, settInn } from './sqlserver_migrert.ts';
import { sql } from './sqlserver.ts';
import {
  lagOppsett,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from './testbase.ts';

describe.skipIf(!TESTBASE_URL)('sesjonens tidsavbrudd og tilbakekalling (#1806)', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  const eier = () => o.datalag.base.pool;
  const kjoeretid = () => o.datalag.kjoeretid.pool;

  beforeAll(async () => {
    o = await lagOppsett();
    for (const bruker of [o.te, o.bh, o.utenTeam, o.leser, o.utenfor])
      await settInn(() => eier().request(), 'app_identities', {
        id: randomUUID(),
        provider: 'catenda',
        issuer: 'https://api.catenda.com',
        subject: catendaId(bruker.subjekt),
        user_id: bruker.id,
      });
    server = await startServer(o);
  }, 240_000);

  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  const sesjonen = (token: string) =>
    fetch(`${server.url}/api/auth/session`, {
      headers: { Cookie: `${sesjonsnavn()}=${token}` },
    }).then((svar) => svar.status);

  const sesjoner = async (bruker: string) =>
    (
      await eier()
        .request()
        .input('bruker', sql.UniqueIdentifier, bruker)
        .query<{ n: number }>('SELECT COUNT(*) AS n FROM koe.app_sessions WHERE user_id = @bruker')
    ).recordset[0].n;

  const som = (b: Testbruker): Medlem => ({
    subjekt: catendaId(b.subjekt)!,
    epost: `${b.id}@test.example`,
    navn: 'Testbruker',
    rolle: 'member',
  });

  it('en sesjon som ikke er brukt på mer enn tidsavbruddet, gir 401, og en brukt sesjon gjelder', async () => {
    const ubrukt = await opprettSesjon(kjoeretid(), o.utenTeam.id);
    const brukt = await opprettSesjon(kjoeretid(), o.utenTeam.id);
    for (const [token, minutter] of [
      [ubrukt.token, 61],
      [brukt.token, 59],
    ] as const)
      await eier()
        .request()
        .input('h', sha256(token))
        .input('minutter', sql.Int, minutter)
        .query(
          `UPDATE koe.app_sessions
              SET created_at = DATEADD(minute, -@minutter, SYSUTCDATETIME()),
                  expires_at = DATEADD(minute, 60 - @minutter, SYSUTCDATETIME())
            WHERE token_hash = @h`
        );
    expect(await sesjonen(ubrukt.token)).toBe(401);
    expect(await sesjonen(brukt.token)).toBe(200);
  });

  it('medlemssynkroniseringen sletter sesjonene til en bruker som mister det siste aktive medlemskapet', async () => {
    const leserSesjon = await opprettSesjon(kjoeretid(), o.leser.id);
    expect(await sesjonen(leserSesjon.token)).toBe(200);
    expect(await sesjonen(o.leser.token)).toBe(200);
    const { skrevet } = await synkroniserMedlemskap(kjoeretid(), {
      prosjekt: o.prosjekt.id,
      catendaProsjekt: o.prosjekt.catendaProsjekt,
      hentet: await basensKlokkeEtter(eier(), new Date()),
      medlemmer: [o.te, o.bh, o.utenTeam].map(som),
    });
    expect(skrevet).toBe(true);
    expect(await sesjoner(o.leser.id)).toBe(0);
    expect(await sesjonen(leserSesjon.token)).toBe(401);
    expect(await sesjonen(o.leser.token)).toBe(401);
    // Kontroll: de som står på listen, beholder sesjonen.
    expect(await sesjonen(o.te.token)).toBe(200);
    expect(await sesjonen(o.utenTeam.token)).toBe(200);
  });

  it('deaktiveringen ved innlogging sletter sesjonene når det siste medlemskapet går', async () => {
    const bruker = o.utenfor;
    expect(await sesjonen(bruker.token)).toBe(200);
    await kjoeretid()
      .request()
      .input('subjekt', catendaId(bruker.subjekt))
      .input('catenda_prosjekter', '[]')
      .input('korrelasjon', sql.UniqueIdentifier, randomUUID())
      .query(`DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
              EXEC koe_api.deaktiver_ved_innlogging @subjekt, @catenda_prosjekter, @naa, @korrelasjon;`);
    expect(await sesjonen(bruker.token)).toBe(401);
  });

  it('en bruker som aldri har hatt et medlemskap, beholder sesjonen når andre mister sitt', async () => {
    const utenMedlemskap = await catendaBruker(kjoeretid());
    const sesjon = await opprettSesjon(kjoeretid(), utenMedlemskap);
    await synkroniserMedlemskap(kjoeretid(), {
      prosjekt: o.prosjekt.id,
      catendaProsjekt: o.prosjekt.catendaProsjekt,
      hentet: await basensKlokkeEtter(eier(), new Date()),
      medlemmer: [o.te, o.bh].map(som),
    });
    expect(await sesjonen(o.utenTeam.token)).toBe(401);
    expect(await sesjonen(sesjon.token)).toBe(200);
  });

  it('HR-synkroniseringen sletter sesjonene til en person som er deaktivert i Entra, også med medlemskap', async () => {
    const tenant = randomUUID();
    const [bhOid, teOid] = [randomUUID(), randomUUID()];
    await settInn(() => eier().request(), 'entra_tenant', { tenant_id: tenant });
    for (const [oid, bruker] of [
      [bhOid, o.bh],
      [teOid, o.te],
    ] as const)
      await eier()
        .request()
        .input('tenant', sql.UniqueIdentifier, tenant)
        .input('oid', sql.UniqueIdentifier, oid)
        .input('epost', '')
        .input('navn', '')
        .output('bruker', sql.UniqueIdentifier, bruker.id)
        .execute('koe_drift.registrer_entra_identitet');
    await eier().request().query(`EXEC koe_drift.sett_rolle N'hr_rolle', 5000;
      EXEC koe_drift.sett_stillingstittel N'HR-tittel', N'hr_rolle';`);
    const person = (oid: string, aktiv: boolean) => ({
      oid,
      stillingstittel: 'HR-tittel',
      leder: null,
      aktiv,
      epost: '',
      navn: '',
    });
    const synk = (bhAktiv: boolean) =>
      synkroniserHr(kjoeretid(), {
        tenant,
        personerMedTittel: async () => [person(bhOid, bhAktiv), person(teOid, true)],
      });

    await synk(true);
    expect(await sesjonen(o.bh.token)).toBe(200);
    await synk(false);
    expect(await sesjonen(o.bh.token)).toBe(401);
    // Kontroll: personen som fortsatt er aktiv, beholder sesjonen.
    expect(await sesjonen(o.te.token)).toBe(200);
  });
});
