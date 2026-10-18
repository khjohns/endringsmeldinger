/**
 * Vedleggsinngangene og mellomlageret (V-1, del av #790) over HTTP mot en base bygget
 * fra migrasjonene. Forventningene har kilde i kartleggingen i #790 og svarene 18.10:
 * - et ubundet vedlegg er et utkast og finnes bare for teamet som lastet det opp
 *   (invarianten om utkast i AGENTS.md, arbeidsvalg 1 og 3);
 * - et bundet vedlegg ses av begge kontraktssider og slettes ikke (arbeidsvalg 4,
 *   «Vedlegg er kontraktskorrespondanse»);
 * - filen ligger hos oss med SHA-256 som basen kontrollerer, grensen er 15 MiB, og
 *   kjørbart innhold avvises, som i Python (arbeidsvalg 5, spørsmål 1 A).
 * Tilgangen uten sesjon, CSRF, prosjekt og kontraktsteam prøves i `register.test.ts`.
 */

import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId } from '../autorisasjon.ts';
import { feilnummer, sql } from '../datalag.ts';
import { innholdsfeil, rensetFilnavn, STOERSTE_VEDLEGG } from '../vedlegg.ts';
import {
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Svar,
  type Testbruker,
} from './testbase.ts';
import { iTransaksjon, settInn } from './sqlserver_migrert.ts';

const PDF = Buffer.from('%PDF-1.7\nInnhold\n');

describe('filnavnet og innholdet', () => {
  it.each([
    ['tegning.pdf', 'tegning.pdf'],
    ['..%2F..%2Fetc%2Fpasswd', 'passwd'],
    ['C%3A%5Cmappe%5Cbrev%20 1.docx', 'brev 1.docx'],
    [encodeURIComponent('Måling æøå.xlsx'), 'Måling æøå.xlsx'],
    ['a%3Cb%3E.txt', 'a_b_.txt'],
    [encodeURIComponent('हिंदी रिपोर्ट.pdf'), 'हिंदी रिपोर्ट.pdf'],
    ['rapport.pdf%CD%8F', 'rapport.pdf_'],
    ['rapport.p%EF%B8%8Fdf', 'rapport.p_df'],
    ['rapport.%CC%81pdf', 'rapport._pdf'],
    ['_%CC%81rapport.pdf', 'rapport.pdf'],
  ])('%s gir filnavnet %s', (kodet, navn) => {
    expect(rensetFilnavn(kodet)).toBe(navn);
  });

  it.each([['..'], ['%2F'], ['%E0%A4%A'], ['%00a.pdf'], ['a'.repeat(201)]])(
    '%s er ikke et filnavn',
    (kodet) => {
      expect(rensetFilnavn(kodet)).toBeNull();
    }
  );

  it('kjørbart innhold avvises uansett endelse, og et kjent format må stemme med innholdet', () => {
    expect(innholdsfeil('rapport.pdf', Buffer.from('MZ\x90\x00'))).toMatch(/program/);
    expect(innholdsfeil('kjoer.txt', Buffer.from('#!/bin/sh'))).toMatch(/skript/);
    expect(innholdsfeil('rapport.pdf', Buffer.from('\x89PNG\r\n\x1a\n'))).toMatch(/\.pdf/);
    expect(innholdsfeil('rapport.pdf', PDF)).toBeNull();
    expect(innholdsfeil('modell.ifc', Buffer.from('ISO-10303-21;'))).toBeNull();
    expect(innholdsfeil('pdf', Buffer.from('\x89PNG\r\n\x1a\n'))).toMatch(/\.pdf/);
    expect(innholdsfeil('rapport.pdf\u0301', Buffer.from('\x89PNG\r\n\x1a\n'))).toMatch(/\.pdf/);
  });
});

describe.skipIf(!TESTBASE_URL)('vedleggene mot testbasen', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  let sak: string;

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
    sak = await opprettKjernesak(o);
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  async function lastOpp(bruker: Testbruker, innhold: Buffer, filnavn?: string, sakId = sak) {
    const svar = await fetch(`${server.url}/api/kjerne/saker/${sakId}/vedlegg`, {
      method: 'POST',
      headers: {
        Cookie: `__Host-koe_session=${bruker.token}`,
        'X-CSRF-Token': bruker.csrf,
        'X-Project-ID': o.prosjekt.id,
        'Content-Type': 'application/octet-stream',
        ...(filnavn === undefined ? {} : { 'X-Filnavn': encodeURIComponent(filnavn) }),
      },
      body: new Uint8Array(innhold),
    });
    return {
      status: svar.status,
      kropp: (await svar.json()) as Svar['kropp'] & {
        vedlegg: { vedlegg_id: string; stoerrelse: number };
      },
    };
  }

  const liste = async (bruker: Testbruker, sakId = sak) =>
    (
      await kall(server.url, `/api/kjerne/saker/${sakId}/vedlegg`, {
        bruker,
        prosjektId: o.prosjekt.id,
      })
    ).kropp.vedlegg as { vedlegg_id: string }[];

  const lastNed = (bruker: Testbruker, id: string, sakId = sak) =>
    fetch(`${server.url}/api/kjerne/saker/${sakId}/vedlegg/${id}`, {
      headers: { Cookie: `__Host-koe_session=${bruker.token}`, 'X-Project-ID': o.prosjekt.id },
    });

  const slett = (bruker: Testbruker, id: string) =>
    kall(server.url, `/api/kjerne/saker/${sak}/vedlegg/${id}`, {
      bruker,
      prosjektId: o.prosjekt.id,
      kropp: {},
      metode: 'DELETE',
    });

  it('TE laster opp, og vedlegget lagres med filnavn, størrelse og SHA-256 av bytene', async () => {
    const svar = await lastOpp(o.te, PDF, 'tegning.pdf');
    expect(svar.status).toBe(201);
    expect(svar.kropp.vedlegg).toMatchObject({
      filnavn: 'tegning.pdf',
      stoerrelse: PDF.length,
      innhold_sha256: createHash('sha256').update(PDF).digest('hex'),
      lastet_opp_side: 'TE',
      bundet_av_event_id: null,
    });
    const ned = await lastNed(o.te, svar.kropp.vedlegg.vedlegg_id);
    expect(ned.status).toBe(200);
    expect(ned.headers.get('content-type')).toBe('application/octet-stream');
    expect(ned.headers.get('x-content-type-options')).toBe('nosniff');
    expect(Buffer.from(await ned.arrayBuffer()).equals(PDF)).toBe(true);
  });

  it('et ubundet vedlegg finnes ikke for BH: ikke i lista, ikke til nedlasting og ikke til sletting', async () => {
    const id = (await lastOpp(o.te, PDF, 'utkast.pdf')).kropp.vedlegg.vedlegg_id;
    expect((await liste(o.te)).map((v) => v.vedlegg_id)).toContain(id);
    expect((await liste(o.bh)).map((v) => v.vedlegg_id)).not.toContain(id);
    expect((await lastNed(o.bh, id)).status).toBe(404);
    expect((await slett(o.bh, id)).status).toBe(404);
    expect((await lastNed(o.te, id)).status).toBe(200);
  });

  it('nedlastingen gir filnavnet etter RFC 8187, og nedlasting og sletting finner vedlegget også med store bokstaver i ID-en', async () => {
    const id = (await lastOpp(o.te, PDF, 'rapport (1).pdf')).kropp.vedlegg.vedlegg_id;
    const ned = await lastNed(o.te, id.toUpperCase());
    expect(ned.status).toBe(200);
    expect(ned.headers.get('content-disposition')).toBe(
      "attachment; filename*=UTF-8''rapport%20%281%29.pdf"
    );
    expect((await slett(o.te, id.toUpperCase())).status).toBe(200);
  });

  it('et vedlegg-ID som ikke kan dekodes, gir en feil om ressursen, ikke om saken', async () => {
    const svar = await lastNed(o.te, '%E0%A4%A');
    expect(svar.status).toBe(404);
    expect((await svar.json()).message).toBe('Ukjent ressurs i saken.');
  });

  it('TE sletter sitt ubundne vedlegg, og etterpå finnes det ikke', async () => {
    const id = (await lastOpp(o.te, PDF, 'feil.pdf')).kropp.vedlegg.vedlegg_id;
    expect((await slett(o.te, id)).status).toBe(200);
    expect((await slett(o.te, id)).status).toBe(404);
    expect((await lastNed(o.te, id)).status).toBe(404);
  });

  it('et vedlegg i en annen sak i prosjektet finnes ikke under denne saken', async () => {
    const annen = await opprettKjernesak(o);
    const id = (await lastOpp(o.te, PDF, 'annen.pdf', annen)).kropp.vedlegg.vedlegg_id;
    expect((await lastNed(o.te, id)).status).toBe(404);
    expect((await slett(o.te, id)).status).toBe(404);
    expect((await liste(o.te)).map((v) => v.vedlegg_id)).not.toContain(id);
  });

  it.each([
    ['kjørbart innhold', Buffer.from('MZ\x90\x00'), 'rapport.pdf', 400, 'UGYLDIG_INNHOLD'],
    [
      'innhold som ikke stemmer med endelsen',
      Buffer.from('GIF89a'),
      'r.pdf',
      400,
      'UGYLDIG_INNHOLD',
    ],
    ['en tom fil', Buffer.alloc(0), 'tom.pdf', 400, 'TOM_FIL'],
    ['uten filnavn', PDF, undefined, 400, 'MANGLER_FILNAVN'],
    ['et filnavn uten tegn igjen', PDF, '..', 400, 'UGYLDIG_FILNAVN'],
    [
      'en fil over 15 MiB',
      Buffer.alloc(STOERSTE_VEDLEGG + 1, 0x41),
      'stor.txt',
      413,
      'FOR_STOR_FIL',
    ],
  ])('%s avvises og lagres ikke', async (_hva, innhold, filnavn, status, feil) => {
    const foer = (await liste(o.te)).length;
    const svar = await lastOpp(o.te, innhold, filnavn);
    expect(svar.status).toBe(status);
    expect(svar.kropp.error).toBe(feil);
    expect((await liste(o.te)).length).toBe(foer);
  });

  it('en fil på nøyaktig 15 MiB lagres', async () => {
    const svar = await lastOpp(o.te, Buffer.alloc(STOERSTE_VEDLEGG, 0x41), 'akkurat.txt');
    expect(svar.status).toBe(201);
    expect(svar.kropp.vedlegg.stoerrelse).toBe(STOERSTE_VEDLEGG);
  });

  describe('et bundet vedlegg', () => {
    const te = () => ({
      aktor: o.te.id,
      prosjekt: o.prosjekt.id,
      side: 'TE' as const,
      team: catendaId(o.prosjekt.teTeam)!,
    });
    let id: string;

    // Bindingen fra en hendelse kommer i V-2; her legger eieren inn raden med kontrollene i tabellen.
    beforeAll(async () => {
      id = randomUUID();
      await iTransaksjon(o.datalag.base.pool, te(), async (r) => {
        const hendelse = await r()
          .input('sak', sql.NVarChar(36), sak)
          .query<{ event_id: string }>('SELECT event_id FROM koe.hendelse WHERE sak_id = @sak');
        await settInn(r, 'vedlegg', {
          vedlegg_id: id,
          prosjekt_id: o.prosjekt.id,
          sak_id: sak,
          filnavn: 'bundet.pdf',
          stoerrelse: PDF.length,
          innhold_sha256: createHash('sha256').update(PDF).digest('hex'),
          innhold: PDF,
          lastet_opp_av: o.te.id,
          lastet_opp_side: 'TE',
          lastet_opp_team: catendaId(o.prosjekt.teTeam)!,
          bundet_av_event_id: hendelse.recordset[0].event_id,
        });
      });
    });

    it('ses av BH og kan lastes ned', async () => {
      expect((await liste(o.bh)).map((v) => v.vedlegg_id)).toContain(id);
      expect((await lastNed(o.bh, id)).status).toBe(200);
    });

    it('kan ikke slettes av TE (409), heller ikke av eieren, og endres ikke (51001)', async () => {
      const svar = await slett(o.te, id);
      expect(svar.status).toBe(409);
      expect(svar.kropp.error).toBe('VEDLEGG_BUNDET');
      for (const setning of [
        'DELETE koe.vedlegg WHERE vedlegg_id = @id',
        "UPDATE koe.vedlegg SET filnavn = N'annet.pdf' WHERE vedlegg_id = @id",
      ]) {
        const feil = await iTransaksjon(o.datalag.base.pool, te(), (r) =>
          r().input('id', sql.UniqueIdentifier, id).query(setning)
        ).catch((f: unknown) => f);
        expect(feilnummer(feil), setning).toBe(51001);
      }
      expect((await liste(o.te)).map((v) => v.vedlegg_id)).toContain(id);
    });
  });

  it('basen avviser en sum som ikke er SHA-256 av innholdet', async () => {
    const feil = await iTransaksjon(
      o.datalag.kjoeretid.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE', team: catendaId(o.prosjekt.teTeam)! },
      (r) =>
        r()
          .input('vedlegg_id', sql.UniqueIdentifier, randomUUID())
          .input('sak_id', sql.NVarChar(36), sak)
          .input('filnavn', sql.NVarChar(200), 'feil.pdf')
          .input('innhold', sql.VarBinary(sql.MAX), PDF)
          .input('innhold_sha256', sql.NVarChar(64), 'a'.repeat(64))
          .execute('koe_api.lagre_vedlegg')
    ).catch((f: unknown) => f);
    expect(feilnummer(feil)).toBe(547);
  });

  it('uten team i konteksten lagrer basen ikke noe vedlegg (51403)', async () => {
    const feil = await iTransaksjon(
      o.datalag.kjoeretid.pool,
      { aktor: o.te.id, prosjekt: o.prosjekt.id, side: 'TE', team: null },
      (r) =>
        r()
          .input('vedlegg_id', sql.UniqueIdentifier, randomUUID())
          .input('sak_id', sql.NVarChar(36), sak)
          .input('filnavn', sql.NVarChar(200), 'uten.pdf')
          .input('innhold', sql.VarBinary(sql.MAX), PDF)
          .input('innhold_sha256', sql.NVarChar(64), createHash('sha256').update(PDF).digest('hex'))
          .execute('koe_api.lagre_vedlegg')
    ).catch((f: unknown) => f);
    expect(feilnummer(feil)).toBe(51403);
  });
});
