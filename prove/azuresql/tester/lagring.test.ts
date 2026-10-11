/**
 * Lagringsformene (a) og (b) i SQL Server (#395, HF-U1, LV-U1, MM-U2):
 *
 * - et brev med svar i flere spor, et revidert svar og en aksept lagres og
 *   leses tilbake med samme tolkning i kjernen;
 * - brevet og leveringsoppdraget lagres samlet eller ikke;
 * - ingen del kan legges til et lagret brev;
 * - innhold kjernen ikke kjenner, gjør saken ikke forstått, eller avvises
 *   før det lagres (b).
 *
 * Kjernen leses og importeres, men endres ikke. Bevis-sakene er
 * `docs/domenetabell/bevis-saker-maalmodell.json`, kjørt med kjernens
 * `kjoer` gjennom banen i `lib/baner.ts`.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { utledJournal } from '../../../kjerne/kommandoer/skriving.ts';
import { KJERNE } from '../../../kjerne/versjon.ts';
import { bygg } from '../../../kjerne/tester/baner.ts';
import { Versjonskonflikt } from '../../../kjerne/tester/bane.ts';
import { kjoer, likeVerdier, MAALMODELL } from '../../../kjerne/tester/kjoerer.ts';
import type { Journalrad } from '../../../kjerne/typer.ts';
import { sjekksum } from '../../../server/levering.ts';
import { AKTIV, feilnummer, sql, tell, transaksjon } from '../lib/forbindelse.ts';
import {
  DOKUMENTTABELL,
  lesOppdrag,
  OPPDRAGSTABELL,
  oppdragFor,
  registrer,
  sqlBane,
  type Form,
  type SqlBane,
} from '../lib/baner.ts';
import { byggBase, kontekst, rydd, type Oppsett } from '../lib/oppsett.ts';

const FORMER = ['a', 'b'] as const;
/** Tabellene med deler av et brev med svar, utenom dokumentraden og oppdraget. */
const DELER: Record<Form, string[]> = {
  a: ['form_a.svar'],
  b: ['form_b.svar', 'form_b.standpunkt', 'form_b.virkning'],
};

const forstaatt = (journal: Journalrad[]) => utledJournal(journal, KJERNE).forstaatt;

/** Brevet i forløp A, steg 2: tre svar, regnet av kjernen men ikke lagret. */
async function brevMedTreSvar(bane: SqlBane): Promise<Journalrad> {
  const [brev, ...foer] = [...MAALMODELL.prefikser.forlop_a_brev].reverse();
  const k = await bygg(bane, foer.reverse());
  const utfall = await k.prov(brev);
  if (!utfall.godtatt)
    throw new Error(`Forutsetning: brevet ble avvist: ${utfall.avvisning.regel}`);
  const [rad] = utfall.hendelser;
  if ((rad.data.svar as unknown[]).length !== 3)
    throw new Error('Forutsetning: brevet har tre svar');
  return rad;
}

/** Radene som hører til brevet, synlige for TE i A, i dokumenttabellen, delene og oppdraget. */
async function radeneTil(o: Oppsett, form: Form, eventId: string): Promise<number[]> {
  const k = kontekst(o.brukere.te, o.a);
  return Promise.all(
    [DOKUMENTTABELL[form], ...DELER[form], OPPDRAGSTABELL[form]].map((t) =>
      tell(o.runtime, k, t, 'event_id = @id', { id: eventId })
    )
  );
}

describe.skipIf(!AKTIV).each(FORMER)('form (%s)', (form) => {
  let o: Oppsett;
  beforeAll(async () => {
    o = await byggBase(`lagring_${form}`);
  });
  afterAll(async () => {
    if (o) await rydd(o);
  });

  it('forløp A: brev med svar i tre spor, revidert svar og aksept leses tilbake med samme tolkning', async () => {
    const bane = await sqlBane(o, form);
    const k = await bygg(bane, ['forlop_a']);
    const lest = await bane.journal();
    const [brev, revisjon, aksept] = lest.slice(-3);
    expect((brev.data.svar as { spor: string }[]).map((s) => s.spor)).toEqual([
      'grunnlag',
      'vederlag',
      'frist',
    ]);
    expect((revisjon.data.svar as { erstatter?: string }[])[0].erstatter).toBe(k.navn.id('S-v1'));
    expect((aksept.data.utsagn as { art: string; gjelder: string }[])[0]).toMatchObject({
      art: 'aksept',
      gjelder: k.navn.id('S-v2'),
    });
    expect(likeVerdier(lest, bane.skrevet)).toBe(true);
    const u = utledJournal(lest, KJERNE);
    expect(u.forstaatt).toBe(true);
    expect(u).toEqual(utledJournal(bane.skrevet, KJERNE));
    expect(u.spor.vederlag.enighet?.grunnlag.svar).toBe(k.navn.id('S-v2'));
  });

  it('leveringsoppdraget har brevet slik journalen har det, og summen kan regnes på nytt', async () => {
    const bane = await sqlBane(o, form);
    await bygg(bane, ['forlop_a']);
    const dokumenter = (await bane.journal()).filter((r) => r.event_type === 'dokument_registrert');
    expect(dokumenter).toHaveLength(6);
    for (const rad of dokumenter) {
      const oppdrag = await lesOppdrag(o, form, rad.event_id);
      if (!oppdrag) throw new Error(`Forutsetning: ${rad.event_id} har oppdrag`);
      const innhold = JSON.parse(oppdrag.innhold);
      expect(likeVerdier(innhold, oppdragFor(rad))).toBe(true);
      expect(sjekksum(innhold)).toBe(oppdrag.innhold_sha256);
    }
  });

  // Bevis-sakene for kjernen, med gjenlesing fra basen før hver utledning.
  it.each(MAALMODELL.forlop.map((f) => [f.id, f] as const))(
    'bevis-saken %s gjennom basen',
    async (_id, forloep) => {
      const bane = await sqlBane(o, form);
      await kjoer(forloep, bane, {
        paastand: (holder, melding) => expect(holder, melding).toBe(true),
      });
      const lest = await bane.journal();
      expect(likeVerdier(lest, bane.skrevet)).toBe(true);
      expect(utledJournal(lest, KJERNE)).toEqual(utledJournal(bane.skrevet, KJERNE));
    }
  );

  describe('samlet lagring', () => {
    const avbrudd: [string, (o: Oppsett) => (f: () => sql.Request) => Promise<void>][] = [
      [
        'en krok som kaster før COMMIT',
        () => async () => Promise.reject(new Error('avbrutt før COMMIT')),
      ],
      [
        'en forbindelse som drepes før COMMIT',
        (o) => async (f) => {
          const spid = (await f().query<{ spid: number }>('SELECT @@SPID AS spid')).recordset[0]
            .spid;
          await o.admin.request().batch(`KILL ${Number(spid)}`);
        },
      ],
    ];

    it.each(avbrudd)('et brev med tre svar lagres samlet eller ikke: %s', async (_hva, lagKrok) => {
      const bane = await sqlBane(o, form);
      const rad = await brevMedTreSvar(bane);
      const foer = await bane.journal();
      bane.kroker = { foerCommit: lagKrok(o) };
      await expect(bane.skriv([rad], foer.at(-1)!.versjon)).rejects.toThrow();
      expect(await bane.journal()).toEqual(foer);
      expect(await radeneTil(o, form, rad.event_id)).toEqual(Array(DELER[form].length + 2).fill(0));

      // Kontrollsak: samme brev uten avbrudd gir dokumentet, alle delene og oppdraget.
      await bane.skriv([rad], foer.at(-1)!.versjon);
      const etter = await radeneTil(o, form, rad.event_id);
      expect(etter.every((n) => n > 0)).toBe(true);
      expect(forstaatt(await bane.journal())).toBe(true);
    });

    it('en feil i siste del (oppdraget er ikke et JSON-objekt) etterlater ingenting', async () => {
      const bane = await sqlBane(o, form);
      const rad = await brevMedTreSvar(bane);
      const foer = await bane.journal();
      await expect(
        transaksjon(o.runtime, kontekst(o.brukere.bh, o.a, 'BH'), (f) =>
          registrer(f, form, rad, foer.at(-1)!.versjon, JSON.stringify(rad.data), [
            'ikke et objekt',
          ])
        )
      ).rejects.toMatchObject({ number: 547 });
      expect(await bane.journal()).toEqual(foer);
      expect(await radeneTil(o, form, rad.event_id)).toEqual(Array(DELER[form].length + 2).fill(0));
    });

    it('en versjonskonflikt skriver ingenting', async () => {
      const bane = await sqlBane(o, form);
      const rad = await brevMedTreSvar(bane);
      const foer = await bane.journal();
      await expect(bane.skriv([rad], foer.at(-1)!.versjon - 1)).rejects.toBeInstanceOf(
        Versjonskonflikt
      );
      expect(await bane.journal()).toEqual(foer);
      expect(await radeneTil(o, form, rad.event_id)).toEqual(Array(DELER[form].length + 2).fill(0));
    });
  });

  describe('ingen del kan legges til et lagret brev', () => {
    let bane: SqlBane;
    let brev: Journalrad;
    const svartabell = `form_${form}.svar`;
    const leggTilSvar = (forelder: Journalrad) =>
      form === 'a'
        ? `INSERT form_a.svar (event_id, prosjekt_id, plass, id, spor) VALUES (N'${forelder.event_id}', N'${o.a.id}', 9, N'${randomUUID()}', N'frist')`
        : `INSERT form_b.svar (event_id, prosjekt_id, plass, id, spor, har_utregning, har_beslutningsgrunnlag)
           VALUES (N'${forelder.event_id}', N'${o.a.id}', 9, N'${randomUUID()}', N'frist', 0, 0)`;

    beforeAll(async () => {
      bane = await sqlBane(o, form);
      const rad = await brevMedTreSvar(bane);
      await bane.skriv([rad], (await bane.journal()).at(-1)!.versjon);
      brev = (await bane.journal()).at(-1)!;
    });

    it('runtime har ingen skriverett på delene eller dokumentet', async () => {
      for (const setning of [
        leggTilSvar(brev),
        `UPDATE ${DOKUMENTTABELL[form]} SET versjon = versjon WHERE event_id = N'${brev.event_id}'`,
        `DELETE ${svartabell} WHERE event_id = N'${brev.event_id}'`,
      ]) {
        const feil = await transaksjon(o.runtime, kontekst(o.brukere.bh, o.a, 'BH'), (f) =>
          f().batch(setning)
        ).catch((e: unknown) => e);
        expect(feilnummer(feil), setning).toBe(229);
      }
    });

    it('eieren kan ikke legge til et svar, med eller uten kontekst', async () => {
      const utenKontekst = await o.admin
        .request()
        .batch(leggTilSvar(brev))
        .catch((e: unknown) => e);
      expect(feilnummer(utenKontekst)).toBe(51002);
      const medKontekst = await transaksjon(o.admin, kontekst(o.brukere.bh, o.a, 'BH'), (f) =>
        f().batch(leggTilSvar(brev))
      ).catch((e: unknown) => e);
      expect(feilnummer(medKontekst)).toBe(51002);
      expect(likeVerdier(await bane.journal(), bane.skrevet)).toBe(true);
    });

    it('eieren kan ikke endre eller slette brevet eller en del', async () => {
      for (const setning of [
        `UPDATE ${DOKUMENTTABELL[form]} SET format = 2 WHERE event_id = N'${brev.event_id}'`,
        `UPDATE ${svartabell} SET spor = N'frist' WHERE event_id = N'${brev.event_id}'`,
        `DELETE ${svartabell} WHERE event_id = N'${brev.event_id}'`,
        `DELETE ${OPPDRAGSTABELL[form]} WHERE event_id = N'${brev.event_id}'`,
      ]) {
        const feil = await transaksjon(o.admin, kontekst(o.brukere.bh, o.a, 'BH'), (f) =>
          f().batch(setning)
        ).catch((e: unknown) => e);
        expect(feilnummer(feil), setning).toBe(51001);
      }
      expect(likeVerdier(await bane.journal(), bane.skrevet)).toBe(true);
    });

    it('samme brev kan ikke registreres på nytt med flere deler', async () => {
      const utvidet = structuredClone(brev);
      (utvidet.data.svar as unknown[]).push((utvidet.data.svar as unknown[])[0]);
      const feil = await transaksjon(o.runtime, kontekst(o.brukere.bh, o.a, 'BH'), (f) =>
        registrer(f, form, utvidet, brev.versjon)
      ).catch((e: unknown) => e);
      expect(feilnummer(feil)).toBe(2627);
      expect(likeVerdier(await bane.journal(), bane.skrevet)).toBe(true);
    });
  });

  describe('innhold kjernen ikke kjenner', () => {
    type Data = Record<string, unknown>;
    const svar = (d: Data) => d.svar as Data[];
    const bg = (d: Data) => svar(d)[1].beslutningsgrunnlag as Data;

    /**
     * Brevet med tre svar i en ny sak, endret etter at kjernen regnet det, og
     * lagret uten kjernen. Gir journalen etterpå, eller feilnummeret fra basen.
     */
    async function lagre(
      endre: (d: Data) => void,
      felt: Partial<Journalrad> = {}
    ): Promise<Journalrad[] | number> {
      const bane = await sqlBane(o, form);
      const rad = { ...(await brevMedTreSvar(bane)), ...felt };
      endre(rad.data);
      const foer = await bane.journal();
      try {
        await bane.skriv([rad], foer.at(-1)!.versjon);
      } catch (feil) {
        const n = feilnummer(feil);
        if (n === undefined) throw feil;
        expect(await bane.journal()).toEqual(foer);
        return n;
      }
      return bane.journal();
    }

    it('kontrollsak: brevet slik kjernen skrev det, lagres og forstås', async () => {
      const journal = await lagre(() => undefined);
      expect(typeof journal).toBe('object');
      expect(forstaatt(journal as Journalrad[])).toBe(true);
    });

    it('en art kjernen ikke kjenner, lagres og gjør saken ikke forstått', async () => {
      const journal = await lagre((d) => {
        d.utsagn = [{ id: randomUUID(), art: 'innsigelse', gjelder: svar(d)[0].id }];
      });
      expect(typeof journal).toBe('object');
      expect(forstaatt(journal as Journalrad[])).toBe(false);
    });

    it('et format kjernen ikke leser, lagres og gjør saken ikke forstått', async () => {
      const journal = await lagre(() => undefined, { format: 2 });
      expect(typeof journal).toBe('object');
      expect(forstaatt(journal as Journalrad[])).toBe(false);
    });

    // Det formatet ikke har plass til i tabellene: (a) lagrer teksten og kjernen
    // forstår den ikke; (b) avviser den før noe skrives (51423). I (b) ville det
    // ellers gått tapt eller endret seg uten feil ved gjenoppbyggingen.
    const utenPlass: [string, (d: Data) => void, Partial<Journalrad>?][] = [
      ['et ukjent felt i et svar', (d) => void (svar(d)[1].kommentar = 'ny')],
      ['et ukjent felt i beslutningsgrunnlaget', (d) => void (bg(d).utfall = 'godkjent')],
      ['null i et felt', (d) => void (svar(d)[1].erstatter = null)],
      ['en tom liste', (d) => void (d.utsagn = [])],
      ['et tall der formatet har sann/usann', (d) => void (bg(d).sammenfall = 1)],
      ['en tekst der formatet har et tall', (d) => void (bg(d).regelversjon = '1')],
      ['et tomt objekt som utregning i grunnlaget', (d) => void (svar(d)[0].utregning = {})],
      [
        'et objekt der formatet har en liste',
        (d) => void (d.utsagn = { x: { id: randomUUID(), art: 'aksept', gjelder: svar(d)[1].id } }),
      ],
      ['en ukjent hendelsestype', () => undefined, { event_type: 'dokument_trukket' }],
    ];

    it.each(utenPlass)('%s', async (_hva, endre, felt) => {
      const utfall = await lagre(endre, felt);
      if (form === 'a') {
        expect(typeof utfall).toBe('object');
        expect(forstaatt(utfall as Journalrad[])).toBe(false);
      } else {
        expect(utfall).toBe(51423);
      }
    });

    it('en event_id med store bokstaver avvises, så samme UUID ikke kan lagres i to former', async () => {
      const kopi = await sqlBane(o, form);
      const rad = { ...(kopi.skrevet[0] as Journalrad), event_id: randomUUID().toUpperCase() };
      const feil = await transaksjon(o.runtime, kontekst(o.brukere.te, o.a, 'TE'), (f) =>
        registrer(f, form, rad, 1)
      ).catch((e: unknown) => e);
      expect(feilnummer(feil)).toBe(547);
    });

    it('teksten er ikke et JSON-objekt', async () => {
      const kopi = await sqlBane(o, form);
      const rad = { ...(kopi.skrevet[0] as Journalrad), event_id: randomUUID() };
      for (const data of ['{"sakstittel": ', '["sakstittel"]']) {
        const feil = await transaksjon(o.runtime, kontekst(o.brukere.te, o.a, 'TE'), (f) =>
          registrer(f, form, rad, 1, data)
        ).catch((e: unknown) => e);
        expect(feilnummer(feil)).toBe(form === 'a' ? 547 : 51423);
      }
    });
  });

  it('tekst og tall kommer tilbake slik de ble sendt', async () => {
    const kopi = await sqlBane(o, form);
    await bygg(kopi, MAALMODELL.prefikser.forlop_a_brev.slice(0, 1));
    const journal = await kopi.journal();
    const krav = journal.at(-1)!;
    const rad: Journalrad = {
      ...structuredClone(krav),
      event_id: randomUUID(),
      data: {
        krav: [
          {
            id: randomUUID(),
            spor: 'vederlag',
            metode: 'tilbud',
            beloep: 0.1 + 0.2,
          },
          {
            ...(krav.data.krav as Record<string, unknown>[])[0],
            id: randomUUID(),
            erstatter: (krav.data.krav as { id: string }[])[0].id,
            tittel: 'æøå   😀 "sitat" \\ \ud800 \u0000 é',
          },
        ],
      },
    };
    await kopi.skriv([rad], krav.versjon);
    const lest = (await kopi.journal()).at(-1)!;
    expect(lest.data).toEqual(kopi.skrevet.at(-1)!.data);
    expect((lest.data.krav as { beloep: number }[])[0].beloep).toBe(0.30000000000000004);
    if (form === 'a') {
      const tekst = await transaksjon(o.runtime, kontekst(o.brukere.te, o.a), async (f) => {
        const r = await f()
          .input('id', sql.NVarChar(36), rad.event_id)
          .query<{ data: string }>('SELECT data FROM form_a.hendelse WHERE event_id = @id');
        return r.recordset[0].data;
      });
      expect(tekst).toBe(JSON.stringify(rad.data));
    }
  });
});

describe.skipIf(!AKTIV)('form (b): det som skiller seg fra (a)', () => {
  let o: Oppsett;
  beforeAll(async () => {
    o = await byggBase('lagring_b_avvik');
  });
  afterAll(async () => {
    if (o) await rydd(o);
  });

  /**
   * Karakteriserer en feilklasse, ikke ønsket atferd: et felt som står i
   * feltregisteret, men som kommandoen og leseren ikke kjenner, godtas ved
   * skriving og forsvinner uten feil. Kjernen forstår da saken. I (a) ville
   * feltet stått i teksten, og saken ville ikke vært forstått. Det frosne
   * leveringsdokumentet har feltet, så de to hjemmene er uenige.
   */
  it('et nytt felt som bare står i registeret, går tapt uten feil', async () => {
    const bane = await sqlBane(o, 'b');
    const rad = await brevMedTreSvar(bane);
    (rad.data.svar as Record<string, unknown>[])[1].frist_for_svar = '2026-11-01';
    await o.admin
      .request()
      .batch(`INSERT form_b.felt (slag, noekkel, jsontype) VALUES (N'svar', N'frist_for_svar', 1)`);
    try {
      await bane.skriv([rad], (await bane.journal()).at(-1)!.versjon);
    } finally {
      await o.admin.request().batch(`DELETE form_b.felt WHERE noekkel = N'frist_for_svar'`);
    }
    const lest = await bane.journal();
    const brev = lest.at(-1)!;
    expect((brev.data.svar as Record<string, unknown>[])[1].frist_for_svar).toBeUndefined();
    expect(forstaatt(lest)).toBe(true);
    const oppdrag = await lesOppdrag(o, 'b', brev.event_id);
    const levert = JSON.parse(oppdrag!.innhold).brev.dokument;
    expect(levert.svar[1].frist_for_svar).toBe('2026-11-01');
    expect(likeVerdier(levert, brev.data)).toBe(false);
  });

  /**
   * FOR JSON skriver `float` med 16 gjeldende sifre. Leses tabellene i (b)
   * med FOR JSON, for eksempel i en visning for rapportering, endres et tall
   * som trenger 17. Banen leser kolonnene med driveren, som gir tallet uendret.
   */
  it('FOR JSON gir ikke tilbake et tall som trenger 17 sifre', async () => {
    const bane = await sqlBane(o, 'b');
    await bygg(bane, MAALMODELL.prefikser.forlop_a_brev.slice(0, 1));
    const krav = (await bane.journal()).at(-1)!;
    const rad: Journalrad = {
      ...structuredClone(krav),
      event_id: randomUUID(),
      data: { krav: [{ id: randomUUID(), spor: 'vederlag', metode: 'tilbud', beloep: 0.1 + 0.2 }] },
    };
    await bane.skriv([rad], krav.versjon);
    const json = await transaksjon(o.runtime, kontekst(o.brukere.te, o.a), async (f) => {
      const r = await f().input('id', sql.NVarChar(36), rad.event_id).query<{
        j: string;
      }>('SELECT (SELECT beloep FROM form_b.krav WHERE event_id = @id FOR JSON PATH) AS j');
      return r.recordset[0].j;
    });
    expect(JSON.parse(json)[0].beloep).toBe(0.3);
    expect((await bane.journal()).at(-1)!.data.krav).toEqual(rad.data.krav);
  });
});
