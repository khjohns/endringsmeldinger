/**
 * Tilgangsmekanismen i B-02 alternativ C uttrykt i T-SQL (#395): RLS med
 * kontekst for lesing, kommandoer for bindende skriving. Kontrakten for
 * konteksten står i design v2 for B-02, avsnitt 4, og akseptkriteriet for
 * gjenbrukt forbindelse i F0b i hovedplanen. Sikkerhetsinvariantene står i
 * `AGENTS.md`: prosjektgrensen, skjerming på team (fail-closed) og at
 * aktørfeltene settes av serveren.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bygg } from '../../../kjerne/tester/baner.ts';
import type { Journalrad } from '../../../kjerne/typer.ts';
import {
  AKTIV,
  feilnummer,
  koble,
  sql,
  tell,
  transaksjon,
  type Kontekst,
  type Pool,
} from '../lib/forbindelse.ts';
import { registrer, sqlBane, type SqlBane } from '../lib/baner.ts';
import { byggBase, kontekst, nySak, nyttTeam, rydd, type Oppsett } from '../lib/oppsett.ts';

const feilFra = (p: Promise<unknown>): Promise<number | undefined> =>
  p.then(
    () => undefined,
    (e: unknown) => feilnummer(e)
  );

describe.skipIf(!AKTIV)('tilgang i T-SQL', () => {
  let o: Oppsett;
  let sakA: SqlBane;
  let sakB: string;
  let te: Kontekst;
  let bh: Kontekst;

  beforeAll(async () => {
    o = await byggBase('tilgang');
    te = kontekst(o.brukere.te, o.a, 'TE');
    bh = kontekst(o.brukere.bh, o.a, 'BH');
    sakA = await sqlBane(o, 'a');
    await bygg(sakA, ['forlop_a_brev']);
    const bte = kontekst(o.brukere.bte, o.b, 'TE');
    sakB = await nySak(o, bte);
    await transaksjon(o.runtime, bte, (f) =>
      registrer(
        f,
        'a',
        { ...(sakA.skrevet[0] as Journalrad), event_id: randomUUID(), sak_id: sakB },
        0
      )
    );
  });
  afterAll(async () => {
    if (o) await rydd(o);
  });

  const synlige = (k: Kontekst | null, tabell = 'form_a.hendelse') => tell(o.runtime, k, tabell);
  const iProsjekt = (k: Kontekst | null, prosjekt: string) =>
    tell(o.runtime, k, 'form_a.hendelse', 'prosjekt_id = @p', { p: prosjekt });

  describe('lesing', () => {
    it('uten kontekst ser runtime ingenting', async () => {
      for (const t of [
        'form_a.hendelse',
        'form_b.dokument',
        'koe.sak_metadata',
        'koe.notat',
        'form_a.leveringsoppdrag',
      ])
        expect(await synlige(null, t), t).toBe(0);
      const r = await o.runtime
        .request()
        .query<{ n: number }>('SELECT COUNT(*) AS n FROM form_a.hendelse');
      expect(r.recordset[0].n).toBe(0);
    });

    it('RLS gjelder også sa og dbo: uten kontekst ser eieren ingenting', async () => {
      const r = await o.admin
        .request()
        .query<{ n: number }>('SELECT COUNT(*) AS n FROM form_a.hendelse');
      expect(r.recordset[0].n).toBe(0);
    });

    it('et medlem ser sitt prosjekt og ikke et annet', async () => {
      expect(await iProsjekt(te, o.a.id)).toBe(sakA.skrevet.length);
      expect(await iProsjekt(te, o.b.id)).toBe(0);
      expect(await iProsjekt(kontekst(o.brukere.bte, o.b), o.b.id)).toBe(1);
      expect(await iProsjekt(kontekst(o.brukere.bte, o.b), o.a.id)).toBe(0);
    });

    it('medlem av begge prosjektene ser bare prosjektet i konteksten', async () => {
      expect(await iProsjekt(kontekst(o.brukere.begge, o.b), o.a.id)).toBe(0);
      expect(await iProsjekt(kontekst(o.brukere.begge, o.b), o.b.id)).toBe(1);
      expect(await iProsjekt(kontekst(o.brukere.begge, o.a), o.a.id)).toBe(sakA.skrevet.length);
    });

    it('et prosjekt brukeren ikke er medlem av, et inaktivt medlemskap og en ukjent aktør gir ingenting', async () => {
      expect(await synlige(kontekst(o.brukere.te, o.b))).toBe(0);
      expect(await synlige(kontekst(o.brukere.inaktiv, o.a))).toBe(0);
      expect(await synlige({ aktor: randomUUID(), prosjekt: o.a.id })).toBe(0);
      expect(await synlige({ aktor: 'ikke-en-uuid', prosjekt: o.a.id })).toBe(0);
      expect(await synlige({ aktor: o.brukere.te.id, prosjekt: '' })).toBe(0);
    });

    it('aktøren normaliseres: store bokstaver gir samme bruker', async () => {
      expect(await synlige({ aktor: o.brukere.te.id.toUpperCase(), prosjekt: o.a.id })).toBe(
        sakA.skrevet.length
      );
    });

    it('leserollen leser journalen', async () => {
      expect(await synlige(kontekst(o.brukere.tilskuer, o.a))).toBe(sakA.skrevet.length);
    });
  });

  describe('konteksten gjelder transaksjonen, ikke sesjonen (F0b)', () => {
    let pool: Pool;
    beforeAll(async () => {
      pool = await koble('runtime', o.database, 1);
    });
    afterAll(async () => {
      await pool?.close();
    });

    const spid = async () =>
      (await pool.request().query<{ s: number }>('SELECT @@SPID AS s')).recordset[0].s;
    const raa = async () =>
      (
        await pool.request().query<{
          aktor: string | null;
        }>("SELECT CAST(SESSION_CONTEXT(N'koe_aktor') AS nvarchar(36)) AS aktor")
      ).recordset[0].aktor;

    it.each(['COMMIT', 'ROLLBACK'] as const)(
      'en gjenbrukt forbindelse arver ikke konteksten etter %s',
      async (slutt) => {
        const foer = await spid();
        const tx = new sql.Transaction(pool);
        await tx.begin();
        await new sql.Request(tx)
          .input('aktor', sql.NVarChar(36), te.aktor)
          .input('prosjekt', sql.NVarChar(100), te.prosjekt)
          .input('side', sql.NVarChar(2), te.side)
          .input('team', sql.NVarChar(32), te.team)
          .execute('koe_api.sett_kontekst');
        const inne = await new sql.Request(tx).query<{ n: number }>(
          'SELECT COUNT(*) AS n FROM form_a.hendelse'
        );
        expect(inne.recordset[0].n).toBe(sakA.skrevet.length);
        await (slutt === 'COMMIT' ? tx.commit() : tx.rollback());

        // Samme sesjon: verdiene ligger igjen, men gjelder ikke lenger.
        expect(await spid()).toBe(foer);
        expect((await raa())?.toLowerCase()).toBe(te.aktor);
        const etter = await pool
          .request()
          .query<{ n: number }>('SELECT COUNT(*) AS n FROM form_a.hendelse');
        expect(etter.recordset[0].n).toBe(0);
        const notat = await pool
          .request()
          .query<{ n: number }>('SELECT COUNT(*) AS n FROM koe.notat');
        expect(notat.recordset[0].n).toBe(0);

        // En ny transaksjon på samme forbindelse uten ny kontekst kan verken lese eller skrive.
        const ny = new sql.Transaction(pool);
        await ny.begin();
        const lest = await new sql.Request(ny).query<{ n: number }>(
          'SELECT COUNT(*) AS n FROM form_a.hendelse'
        );
        expect(lest.recordset[0].n).toBe(0);
        const skrevet = await feilFra(
          new sql.Request(ny)
            .input('sak_id', sql.NVarChar(36), sakA.sakId)
            .input('tekst', sql.NVarChar(sql.MAX), 'lekker')
            .output('notat_id', sql.UniqueIdentifier)
            .execute('koe_api.skriv_notat')
        );
        await ny.rollback().catch(() => undefined);
        expect(skrevet).toBe(51403);
        expect(await spid()).toBe(foer);
      }
    );

    it('en annen brukers kontekst på samme forbindelse ser bare sitt prosjekt', async () => {
      await transaksjon(pool, te, async (f) => {
        expect(
          (await f().query<{ n: number }>('SELECT COUNT(*) AS n FROM form_a.hendelse')).recordset[0]
            .n
        ).toBe(sakA.skrevet.length);
      });
      const andre = await transaksjon(pool, kontekst(o.brukere.bte, o.b), async (f) =>
        f().query<{ p: string }>('SELECT DISTINCT prosjekt_id AS p FROM form_a.hendelse')
      );
      expect(andre.recordset.map((r) => r.p)).toEqual([o.b.id]);
    });

    it('konteksten kan ikke settes utenfor en transaksjon', async () => {
      const n = await feilFra(
        pool
          .request()
          .input('aktor', sql.NVarChar(36), te.aktor)
          .input('prosjekt', sql.NVarChar(100), te.prosjekt)
          .execute('koe_api.sett_kontekst')
      );
      expect(n).toBe(51000);
    });
  });

  describe('bindende skriving', () => {
    const skriv = (k: Kontekst, sakId: string) =>
      feilFra(
        transaksjon(o.runtime, k, async (f) => {
          const forrige = await f().input('s', sql.NVarChar(36), sakId).query<{
            v: number | null;
          }>('SELECT MAX(versjon) AS v FROM form_a.hendelse WHERE sak_id = @s');
          const rad = {
            ...structuredClone(sakA.skrevet.at(-1)!),
            event_id: randomUUID(),
            sak_id: sakId,
          };
          await registrer(f, 'a', rad, forrige.recordset[0].v ?? 0);
        })
      );

    it('kontrollsak: BH med kontraktsteam skriver i saken', async () => {
      expect(await skriv(bh, sakA.sakId)).toBeUndefined();
    });

    it('sak i et annet prosjekt, ukjent sak, leserolle, inaktivt medlem, fremmed team og feil side gir samme svar', async () => {
      const tilfeller: [string, Kontekst, string][] = [
        ['sak i B med kontekst i A', bh, sakB],
        ['ukjent sak', bh, randomUUID()],
        ['leserolle', { ...bh, aktor: o.brukere.tilskuer.id }, sakA.sakId],
        ['inaktivt medlem', { ...bh, aktor: o.brukere.inaktiv.id }, sakA.sakId],
        ['team som ikke er kontraktsteam', { ...bh, team: nyttTeam() }, sakA.sakId],
        [
          'TE-team oppgitt med side BH',
          { ...bh, aktor: o.brukere.te.id, team: o.a.team.TE },
          sakA.sakId,
        ],
        ['team fra prosjekt B', { ...bh, team: o.b.team.BH }, sakA.sakId],
        ['uten team', { ...bh, team: undefined }, sakA.sakId],
        ['uten side', { ...bh, side: undefined }, sakA.sakId],
        ['team med store bokstaver', { ...bh, team: o.a.team.BH.toUpperCase() }, sakA.sakId],
      ];
      for (const [hva, k, sak] of tilfeller) expect(await skriv(k, sak), hva).toBe(51403);
    });

    it('aktørfeltene settes av kommandoen fra konteksten', async () => {
      const journal = await sakA.journal();
      const siste = journal.at(-1)!;
      expect(siste).toMatchObject({
        aktor_id: o.brukere.bh.id,
        aktor_rolle: 'BH',
        aktor_team_id: o.a.team.BH,
      });
      // Kjernen laget raden med teamet `team-bh`; kommandoen har ingen parameter for aktøren.
      const parametre = await o.admin.request().query<{
        navn: string;
      }>("SELECT name AS navn FROM sys.parameters WHERE object_id = OBJECT_ID('koe_api.registrer_a') ORDER BY parameter_id");
      expect(
        parametre.recordset.map((p) => p.navn).filter((n) => /aktor|rolle|team/.test(n))
      ).toEqual([]);
    });

    it('kommandoene kjøres bare inne i en transaksjon', async () => {
      const n = await feilFra(
        o.runtime
          .request()
          .input('sakstype', sql.NVarChar(40), 'standard')
          .output('sak_id', sql.NVarChar(36))
          .execute('koe_api.opprett_sak')
      );
      expect(n).toBe(51000);
    });
  });

  describe('rettighetene til runtime', () => {
    const forsoek = (setning: string) =>
      feilFra(transaksjon(o.runtime, bh, (f) => f().batch(setning)));

    it.each([
      ['INSERT i journalen', `INSERT form_a.hendelse (event_id) VALUES (N'${randomUUID()}')`, 229],
      ['UPDATE i journalen', 'UPDATE form_a.hendelse SET format = 2', 229],
      ['DELETE i journalen', 'DELETE form_a.hendelse', 229],
      ['INSERT av et notat', `INSERT koe.notat (notat_id) VALUES ('${randomUUID()}')`, 229],
      ['DELETE av notater', 'DELETE koe.notat', 229],
      ['UPDATE av saken', 'UPDATE koe.sak_metadata SET prosjekt_id = prosjekt_id', 229],
      ['lesing av identitetene', 'SELECT * FROM koe.app_identities', 229],
      ['lesing av medlemskapene', 'SELECT * FROM koe.app_project_memberships', 229],
      ['lesing av kontraktsteamene', 'SELECT * FROM koe.catenda_contract_teams', 229],
      [
        'den generelle identitetsfunksjonen',
        "DECLARE @u uniqueidentifier; EXEC koe.resolve_identity N'entra', N'x', N'y', N'', N'', @u OUTPUT",
        229,
      ],
      ['TRUNCATE av journalen', 'TRUNCATE TABLE form_a.hendelse', 1088],
      ['å slå av RLS', 'ALTER SECURITY POLICY koe_sikkerhet.tilgang WITH (STATE = OFF)', 33268],
      ['å slå av en trigger', 'DISABLE TRIGGER form_a.svar_samme_transaksjon ON form_a.svar', 1088],
      ['å bli dbo', "EXECUTE AS USER = 'dbo'", 15517],
      ['å lage en tabell', 'CREATE TABLE form_a.ny (x int)', 262],
      ['å endre en kommando', 'ALTER PROCEDURE koe_api.sett_kontekst AS SELECT 1', 3701],
    ] as const)('%s avvises', async (_hva, setning, nummer) => {
      expect(await forsoek(setning)).toBe(nummer);
    });

    it('journalen er uendret etter forsøkene', async () => {
      expect(await iProsjekt(te, o.a.id)).toBe((await sakA.journal()).length);
    });
  });

  describe('interne notater: skjerming på team, fail-closed', () => {
    let notat: string;
    const skrivNotat = (k: Kontekst, sakId: string) =>
      transaksjon(o.runtime, k, async (f) => {
        const r = await f()
          .input('sak_id', sql.NVarChar(36), sakId)
          .input('tekst', sql.NVarChar(sql.MAX), 'internt')
          .output('notat_id', sql.UniqueIdentifier)
          .execute('koe_api.skriv_notat');
        return String(r.output.notat_id).toLowerCase();
      });
    const slett = (k: Kontekst, id: string) =>
      transaksjon(o.runtime, k, async (f) => {
        const r = await f()
          .input('notat_id', sql.UniqueIdentifier, id)
          .output('slettet', sql.Bit)
          .execute('koe_api.slett_notat');
        return r.output.slettet as boolean;
      });
    const notater = (k: Kontekst) => tell(o.runtime, k, 'koe.notat');

    beforeAll(async () => {
      notat = await skrivNotat(te, sakA.sakId);
    });

    it('teamet som skrev, ser notatet', async () => {
      expect(await notater(te)).toBe(1);
    });

    it('motparten, leserollen, et fremmed team, feil side og manglende team ser det ikke', async () => {
      expect(await notater(bh)).toBe(0);
      expect(await notater({ ...te, aktor: o.brukere.tilskuer.id })).toBe(0);
      expect(await notater({ ...te, team: nyttTeam() })).toBe(0);
      expect(await notater({ ...te, side: 'BH' })).toBe(0);
      expect(await notater({ ...te, team: undefined })).toBe(0);
      expect(await notater(kontekst(o.brukere.te, o.a))).toBe(0);
      expect(await notater({ ...te, team: o.b.team.TE })).toBe(0);
    });

    it('et notat uten team vises til ingen, heller ikke forfatteren', async () => {
      await o.admin.request().batch(
        `ALTER SECURITY POLICY koe_sikkerhet.tilgang WITH (STATE = OFF);
         INSERT koe.notat (notat_id, sak_id, prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, tekst)
         VALUES (NEWID(), N'${sakA.sakId}', N'${o.a.id}', N'${o.brukere.te.id}', N'TE', NULL, N'uten team');
         ALTER SECURITY POLICY koe_sikkerhet.tilgang WITH (STATE = ON);`
      );
      expect(await notater(te)).toBe(1);
      expect(await notater(bh)).toBe(0);
    });

    it('eieren kan ikke skrive et notat uten team gjennom tabellen (blokkpredikatet)', async () => {
      const n = await feilFra(
        transaksjon(o.admin, te, (f) =>
          f().batch(
            `INSERT koe.notat (notat_id, sak_id, prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, tekst)
             VALUES (NEWID(), N'${sakA.sakId}', N'${o.a.id}', N'${o.brukere.te.id}', N'TE', NULL, N'x')`
          )
        )
      );
      expect(n).toBe(33504);
    });

    it('eieren kan ikke skrive et notat i en annen aktørs navn (blokkpredikatet)', async () => {
      const n = await feilFra(
        transaksjon(o.admin, te, (f) =>
          f().batch(
            `INSERT koe.notat (notat_id, sak_id, prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, tekst)
             VALUES (NEWID(), N'${sakA.sakId}', N'${o.a.id}', N'${o.brukere.bh.id}', N'TE', N'${o.a.team.TE}', N'x')`
          )
        )
      );
      expect(n).toBe(33504);
    });

    it('notat i en sak i et annet prosjekt, ukjent sak og fremmed team gir samme svar', async () => {
      for (const [k, sak] of [
        [te, sakB],
        [te, randomUUID()],
        [{ ...te, team: nyttTeam() }, sakA.sakId],
        [{ ...te, aktor: o.brukere.tilskuer.id }, sakA.sakId],
      ] as const)
        expect(await feilFra(skrivNotat(k, sak))).toBe(51403);
    });

    it('motparten og et ukjent notat slettes ikke; eget notat slettes', async () => {
      expect(await slett(bh, notat)).toBe(false);
      expect(await slett(te, randomUUID())).toBe(false);
      expect(await slett(kontekst(o.brukere.bte, o.b, 'TE'), notat)).toBe(false);
      expect(await notater(te)).toBe(1);
      expect(await slett(te, notat)).toBe(true);
      expect(await notater(te)).toBe(0);
    });
  });

  describe('et prosjekt som ikke er aktivt', () => {
    const aktiv = (verdi: 0 | 1) =>
      o.admin
        .request()
        .batch(`UPDATE koe.projects SET is_active = ${verdi} WHERE id = N'${o.a.id}'`);

    it('gir verken lesing eller skriving', async () => {
      await aktiv(0);
      try {
        expect(await synlige(te)).toBe(0);
        expect(await tell(o.runtime, te, 'koe.notat')).toBe(0);
        const n = await feilFra(nySak(o, bh));
        expect(n).toBe(51403);
      } finally {
        await aktiv(1);
      }
      expect(await synlige(te)).toBeGreaterThan(0);
    });
  });
});
