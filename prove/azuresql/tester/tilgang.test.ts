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
  let helA: SqlBane;
  /** Radene i `form_a.hendelse` i prosjekt A etter oppsettet. */
  const iA = () => sakA.skrevet.length + helA.skrevet.length;
  /** Tabellene runtime har SELECT på, slik runtime selv ser katalogen. */
  let lesbare: string[];

  const lesbareTabeller = async () =>
    (
      await o.runtime.request().query<{ t: string }>(
        `SELECT s.name + '.' + t.name AS t FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
          WHERE HAS_PERMS_BY_NAME(s.name + '.' + t.name, 'OBJECT', 'SELECT') = 1 ORDER BY 1`
      )
    ).recordset.map((r) => r.t);

  /** Tabeller runtime kan lese uten RLS, med grunnen. */
  const UTEN_RLS: Record<string, string> = {
    'form_b.felt': 'feltregisteret i form (b): formatet, ingen saksdata og ikke noe prosjekt',
  };

  beforeAll(async () => {
    o = await byggBase('tilgang');
    te = kontekst(o.brukere.te, o.a, 'TE');
    bh = kontekst(o.brukere.bh, o.a, 'BH');
    sakA = await sqlBane(o, 'a');
    await bygg(sakA, ['forlop_a_brev']);
    // Hele forløp A i begge formene, så hver tabell har rader (også aksepten i utsagnene).
    helA = await sqlBane(o, 'a');
    await bygg(helA, ['forlop_a']);
    await bygg(await sqlBane(o, 'b'), ['forlop_a']);
    lesbare = await lesbareTabeller();
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
    it('hver tabell runtime kan lese, har et filterpredikat, eller et begrunnet unntak', async () => {
      const r = await o.admin.request().query<{ t: string }>(
        `SELECT OBJECT_SCHEMA_NAME(p.target_object_id) + '.' + OBJECT_NAME(p.target_object_id) AS t
           FROM sys.security_predicates p JOIN sys.security_policies sp ON sp.object_id = p.object_id
          WHERE p.predicate_type_desc = 'FILTER' AND sp.is_enabled = 1`
      );
      const filtrert = new Set(r.recordset.map((x) => x.t));
      expect(lesbare.length).toBeGreaterThan(10);
      expect(lesbare.filter((t) => !filtrert.has(t) && !(t in UTEN_RLS))).toEqual([]);
      expect(Object.keys(UTEN_RLS).filter((t) => filtrert.has(t))).toEqual([]);
      expect(Object.keys(UTEN_RLS).filter((t) => !lesbare.includes(t))).toEqual([]);
    });

    it('uten kontekst ser runtime ingenting i noen tabell, og med kontekst ser medlemmet radene', async () => {
      // Uten rader i oppsettet: notatene skrives senere, og ingen forløp her har opplysninger eller dokumentasjon.
      const tomme = new Set(['koe.notat', 'form_b.opplysning', 'form_b.dokumentasjon']);
      for (const t of lesbare.filter((x) => !(x in UTEN_RLS))) {
        expect(await synlige(null, t), t).toBe(0);
        if (!tomme.has(t)) expect(await synlige(te, t), t).toBeGreaterThan(0);
      }
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
      expect(await iProsjekt(te, o.a.id)).toBe(iA());
      expect(await iProsjekt(te, o.b.id)).toBe(0);
      expect(await iProsjekt(kontekst(o.brukere.bte, o.b), o.b.id)).toBe(1);
      expect(await iProsjekt(kontekst(o.brukere.bte, o.b), o.a.id)).toBe(0);
    });

    it('i kontekst B ses ingen rad fra prosjekt A i noen tabell', async () => {
      for (const t of lesbare.filter((x) => !(x in UTEN_RLS)))
        expect(
          await tell(o.runtime, kontekst(o.brukere.begge, o.b), t, 'prosjekt_id = @p', {
            p: o.a.id,
          }),
          t
        ).toBe(0);
    });

    it('medlem av begge prosjektene ser bare prosjektet i konteksten', async () => {
      expect(await iProsjekt(kontekst(o.brukere.begge, o.b), o.a.id)).toBe(0);
      expect(await iProsjekt(kontekst(o.brukere.begge, o.b), o.b.id)).toBe(1);
      expect(await iProsjekt(kontekst(o.brukere.begge, o.a), o.a.id)).toBe(iA());
    });

    it('et prosjekt brukeren ikke er medlem av, et inaktivt medlemskap og en ukjent aktør gir ingenting', async () => {
      expect(await synlige(kontekst(o.brukere.te, o.b))).toBe(0);
      expect(await synlige(kontekst(o.brukere.inaktiv, o.a))).toBe(0);
      expect(await synlige({ aktor: randomUUID(), prosjekt: o.a.id })).toBe(0);
      expect(await synlige({ aktor: 'ikke-en-uuid', prosjekt: o.a.id })).toBe(0);
      expect(await synlige({ aktor: o.brukere.te.id, prosjekt: '' })).toBe(0);
    });

    it('aktøren normaliseres: store bokstaver gir samme bruker', async () => {
      expect(await synlige({ aktor: o.brukere.te.id.toUpperCase(), prosjekt: o.a.id })).toBe(iA());
    });

    it('leserollen leser journalen', async () => {
      expect(await synlige(kontekst(o.brukere.tilskuer, o.a))).toBe(iA());
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
        expect(inne.recordset[0].n).toBe(iA());
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

        // En ny transaksjon på samme forbindelse uten ny kontekst kan verken lese eller
        // skrive, med noen av kommandoene.
        const iNyTransaksjon = async (arbeid: (r: () => sql.Request) => Promise<unknown>) => {
          const ny = new sql.Transaction(pool);
          await ny.begin();
          try {
            return await feilFra(arbeid(() => new sql.Request(ny)));
          } finally {
            await ny.rollback().catch(() => undefined);
          }
        };
        const ny = new sql.Transaction(pool);
        await ny.begin();
        try {
          for (const t of lesbare.filter((x) => !(x in UTEN_RLS))) {
            const svar = await new sql.Request(ny).query<{ n: number }>(
              `SELECT COUNT(*) AS n FROM ${t}`
            );
            expect(svar.recordset[0].n, t).toBe(0);
          }
        } finally {
          await ny.rollback().catch(() => undefined);
        }
        const rad = { ...structuredClone(sakA.skrevet.at(-1)!), event_id: randomUUID() };
        const forsoek: [string, (r: () => sql.Request) => Promise<unknown>][] = [
          [
            'skriv_notat',
            (r) =>
              r()
                .input('sak_id', sql.NVarChar(36), sakA.sakId)
                .input('tekst', sql.NVarChar(sql.MAX), 'lekker')
                .output('notat_id', sql.UniqueIdentifier)
                .execute('koe_api.skriv_notat'),
          ],
          [
            'opprett_sak',
            (r) =>
              r()
                .input('sakstype', sql.NVarChar(40), 'standard')
                .output('sak_id', sql.NVarChar(36))
                .execute('koe_api.opprett_sak'),
          ],
          ['registrer_a', (r) => registrer(r, 'a', rad, rad.versjon - 1)],
          ['registrer_b', (r) => registrer(r, 'b', rad, rad.versjon - 1)],
        ];
        for (const [kommando, kall] of forsoek)
          expect(await iNyTransaksjon(kall), kommando).toBe(51403);
        expect(await spid()).toBe(foer);
      }
    );

    it('en annen brukers kontekst på samme forbindelse ser bare sitt prosjekt', async () => {
      await transaksjon(pool, te, async (f) => {
        expect(
          (await f().query<{ n: number }>('SELECT COUNT(*) AS n FROM form_a.hendelse')).recordset[0]
            .n
        ).toBe(iA());
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
      for (const kommando of ['registrer_a', 'registrer_b', 'skriv_notat', 'opprett_sak']) {
        const parametre = await o.admin
          .request()
          .input('k', sql.NVarChar(200), `koe_api.${kommando}`)
          .query<{
            navn: string;
          }>('SELECT name AS navn FROM sys.parameters WHERE object_id = OBJECT_ID(@k)');
        expect(parametre.recordset.length, kommando).toBeGreaterThan(0);
        expect(
          parametre.recordset
            .map((p) => p.navn)
            .filter((n) => /aktor|rolle|team|side|created/.test(n)),
          kommando
        ).toEqual([]);
      }
    });

    it('eieren kan ikke opprette en sak i en annen aktørs navn eller med store bokstaver (blokkpredikatet og skranken)', async () => {
      const sett = (oppretter: string) =>
        feilFra(
          transaksjon(o.admin, bh, (f) =>
            f().batch(
              `INSERT koe.sak_metadata (sak_id, prosjekt_id, sakstype, created_by)
               VALUES (N'${randomUUID()}', N'${o.a.id}', N'standard', N'${oppretter}')`
            )
          )
        );
      expect(await sett(o.brukere.te.id)).toBe(33504);
      expect(await sett(o.brukere.bh.id.toUpperCase())).toBe(547);
      expect(await sett(o.brukere.bh.id)).toBeUndefined();
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
    let foer: number;
    beforeAll(async () => {
      foer = await iProsjekt(te, o.a.id);
    });
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
      expect(await iProsjekt(te, o.a.id)).toBe(foer);
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

    it('eieren kan ikke flytte et notat til en annen aktør eller fjerne teamet (blokkpredikatet)', async () => {
      for (const sett of [`aktor_id = N'${o.brukere.bh.id}'`, 'aktor_team_id = NULL']) {
        const n = await feilFra(
          transaksjon(o.admin, te, (f) =>
            f().batch(`UPDATE koe.notat SET ${sett} WHERE notat_id = '${notat}'`)
          )
        );
        expect(n, sett).toBe(33504);
      }
      expect(await notater(te)).toBe(1);
    });

    it('en aktør-ID med store bokstaver kan ikke lagres', async () => {
      const n = await feilFra(
        transaksjon(o.admin, te, (f) =>
          f().batch(
            `INSERT koe.notat (notat_id, sak_id, prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, tekst)
             VALUES (NEWID(), N'${sakA.sakId}', N'${o.a.id}', N'${o.brukere.te.id.toUpperCase()}', N'TE', N'${o.a.team.TE}', N'x')`
          )
        )
      );
      expect(n).toBe(547);
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
      const notat = () => tell(o.runtime, te, 'koe.notat');
      const skrivNotat = () =>
        transaksjon(o.runtime, te, (f) =>
          f()
            .input('sak_id', sql.NVarChar(36), sakA.sakId)
            .input('tekst', sql.NVarChar(sql.MAX), 'før deaktivering')
            .output('notat_id', sql.UniqueIdentifier)
            .execute('koe_api.skriv_notat')
        );
      await skrivNotat();
      const foer = { journal: await synlige(te), notater: await notat() };
      expect(foer.journal).toBeGreaterThan(0);
      expect(foer.notater).toBeGreaterThan(0);
      await aktiv(0);
      try {
        expect(await synlige(te)).toBe(0);
        expect(await notat()).toBe(0);
        expect(await feilFra(nySak(o, bh))).toBe(51403);
        expect(await feilFra(skrivNotat())).toBe(51403);
        const rad = { ...structuredClone(sakA.skrevet.at(-1)!), event_id: randomUUID() };
        expect(await feilFra(transaksjon(o.runtime, bh, (f) => registrer(f, 'a', rad, 99)))).toBe(
          51403
        );
      } finally {
        await aktiv(1);
      }
      expect({ journal: await synlige(te), notater: await notat() }).toEqual(foer);
    });
  });
});
