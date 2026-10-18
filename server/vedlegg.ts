/**
 * Vedleggsinngangene (V-1, del av #790): opplasting til mellomlageret, lista over
 * sakens vedlegg, nedlasting og sletting av et ubundet vedlegg. Vedlegget ligger hos
 * oss til Catenda har kvittert for det (spørsmål 1 A i #790, 18.10), og leveres av
 * jobbkjøreren etter at en hendelse viser til det (V-2 og V-3).
 *
 * Hver inngang krever kontraktsrolle («Vedlegg er kontraktskorrespondanse», og
 * spørsmål 2 A i #790 for lesingen i appen). Hvem som ser og sletter, avgjør
 * radsikkerheten i `20261018193000_vedlegg.sql`: et ubundet vedlegg finnes bare for
 * teamet som lastet det opp.
 *
 * Innholdskontrollen er den samme som `backend/lib/vedlegg_innhold.py`. Den er ikke
 * virusskanning (arbeidsvalg 5 i #790).
 */

import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Avhengigheter, Forespoersel, Saksrute, Svar } from './app.ts';
import { Nektet } from './autorisasjon.ts';
import { feilnummer, sql, transaksjon, type Kontekst } from './datalag.ts';
import { ulagringsbarTekst } from '../kjerne/format/skjema.ts';

/** Under grensen i Python (arbeidsvalg 5 i #790); `stoerrelse` i tabellen har samme grense. */
export const STOERSTE_VEDLEGG = 15 * 1024 * 1024;

const STOERSTE_FILNAVN = 200;

/** Bytene i kroppen og filnavnet fra hodet `X-Filnavn`, kodet med `encodeURIComponent`. */
export interface Fil {
  innhold: Buffer;
  filnavn: string | undefined;
}

/** Leser kroppen som bytes, etter tilgangskontrollen. Over grensen: 413. */
export async function lesFil(foresporsel: IncomingMessage): Promise<Fil> {
  const deler: Buffer[] = [];
  let stoerrelse = 0;
  for await (const del of foresporsel) {
    stoerrelse += (del as Buffer).length;
    if (stoerrelse > STOERSTE_VEDLEGG)
      throw new Nektet(413, 'FOR_STOR_FIL', 'Filen er større enn 15 MB.');
    deler.push(del as Buffer);
  }
  const hode = foresporsel.headers['x-filnavn'];
  return { innhold: Buffer.concat(deler), filnavn: typeof hode === 'string' ? hode : undefined };
}

/**
 * Filnavnet uten sti og uten tegn som ikke hører hjemme i et filnavn, som
 * `secure_filename` i Python, men med bokstavene i alle språk og de kombinerende tegnene
 * som står på en bokstav. Usynlige tegn blir `_`. `null` når ingenting er igjen.
 */
export function rensetFilnavn(kodet: string): string | null {
  let navn: string;
  try {
    navn = decodeURIComponent(kodet);
  } catch {
    return null;
  }
  if (ulagringsbarTekst(navn)) return null;
  const renset = (navn.split(/[/\\]/).pop() ?? '')
    .normalize('NFC')
    .replace(/\p{Default_Ignorable_Code_Point}|[^\p{L}\p{M}\p{N} ._()-]/gu, '_')
    .replace(/(?<![\p{L}\p{M}])\p{M}+/gu, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[ ._]+|[ .]+$/g, '');
  if (!renset || !/[\p{L}\p{N}]/u.test(renset) || renset.length > STOERSTE_FILNAVN) return null;
  return renset;
}

const KJOERBARE: readonly [Buffer, string][] = [
  [Buffer.from('MZ'), 'Windows-kjørbar'],
  [Buffer.from([0x7f, 0x45, 0x4c, 0x46]), 'Linux-kjørbar'],
  [Buffer.from([0xfe, 0xed, 0xfa, 0xce]), 'macOS-kjørbar'],
  [Buffer.from([0xfe, 0xed, 0xfa, 0xcf]), 'macOS-kjørbar'],
  [Buffer.from([0xcf, 0xfa, 0xed, 0xfe]), 'macOS-kjørbar'],
  [Buffer.from([0xca, 0xfe, 0xba, 0xbe]), 'Java-klasse eller macOS-kjørbar'],
  [Buffer.from('#!'), 'skript'],
];

const ZIP = [Buffer.from([0x50, 0x4b, 0x03, 0x04])];
const FORMATER: Record<string, Buffer[]> = {
  pdf: [Buffer.from('%PDF-')],
  png: [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  jpg: [Buffer.from([0xff, 0xd8, 0xff])],
  jpeg: [Buffer.from([0xff, 0xd8, 0xff])],
  gif: [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  docx: ZIP,
  xlsx: ZIP,
  pptx: ZIP,
  zip: ZIP,
};

/** Hva som er galt med innholdet, eller `null`. Ukjente endelser kontrolleres ikke mot innholdet. */
export function innholdsfeil(filnavn: string, innhold: Buffer): string | null {
  for (const [signatur, hva] of KJOERBARE)
    if (innhold.subarray(0, signatur.length).equals(signatur))
      return `Filen ser ut til å være et program (${hva}) og kan ikke lastes opp som vedlegg.`;
  // Som `rpartition('.')` i Python: et navn uten punktum er selve endelsen. Kombinerende
  // tegn og bredde tas bort, så «pdf» med aksent eller i full bredde kontrolleres som .pdf.
  const endelse = filnavn.split('.').pop()!.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  const forventet = FORMATER[endelse];
  if (forventet && !forventet.some((s) => innhold.subarray(0, s.length).equals(s)))
    return `Innholdet stemmer ikke med filtypen .${endelse}. Last opp filen i det formatet navnet oppgir.`;
  return null;
}

const UKJENT = 51403;
const BUNDET = 51409;
const BLOKKERT = 33504;

const feilsvar = (status: number, error: string, message: string): Svar => [
  status,
  { success: false, error, message },
];
const finnesIkke = () => feilsvar(404, 'VEDLEGG_FINNES_IKKE', 'Vedlegget finnes ikke i saken.');
const UTEN_TEAM = feilsvar(
  403,
  'MANGLER_TEAM',
  'Vedlegg krever entydig teamtilknytning i Catenda.'
);

/** Konteksten for radsikkerheten. Uten team ses bare bundne vedlegg. */
function kontekst({ bruker, prosjekt, side }: Forespoersel): Kontekst {
  if (!side)
    throw new Nektet(403, 'CONTRACT_ROLE_REQUIRED', 'Du har ikke nødvendig TE/BH-teamtilknytning.');
  return {
    aktor: bruker.id,
    prosjekt: prosjekt.prosjektId,
    side: side.rolle,
    ...(side.teamId ? { team: side.teamId } : {}),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Vedleggsrad {
  vedlegg_id: string;
  filnavn: string;
  stoerrelse: number;
  innhold_sha256: string;
  lastet_opp_side: string;
  lastet_opp: Date;
  bundet_av_event_id: string | null;
}

const KOLONNER = `LOWER(CONVERT(nvarchar(36), vedlegg_id)) AS vedlegg_id, filnavn, stoerrelse,
  innhold_sha256, lastet_opp_side, lastet_opp, bundet_av_event_id`;

const somSvar = (r: Vedleggsrad) => ({
  vedlegg_id: r.vedlegg_id,
  filnavn: r.filnavn,
  stoerrelse: r.stoerrelse,
  innhold_sha256: r.innhold_sha256,
  lastet_opp_side: r.lastet_opp_side,
  lastet_opp: r.lastet_opp.toISOString(),
  bundet_av_event_id: r.bundet_av_event_id,
});

async function lastOpp(f: Forespoersel, avh: Required<Avhengigheter>): Promise<Svar> {
  if (!f.side?.teamId) return UTEN_TEAM;
  const fil = f.fil!;
  if (fil.filnavn === undefined)
    return feilsvar(400, 'MANGLER_FILNAVN', 'Hodet X-Filnavn med filnavnet mangler.');
  const filnavn = rensetFilnavn(fil.filnavn);
  if (filnavn === null) return feilsvar(400, 'UGYLDIG_FILNAVN', 'Filnavnet kan ikke brukes.');
  if (!fil.innhold.length) return feilsvar(400, 'TOM_FIL', 'Filen er tom.');
  const galt = innholdsfeil(filnavn, fil.innhold);
  if (galt) return feilsvar(400, 'UGYLDIG_INNHOLD', galt);
  const vedleggId = avh.nyId();
  const sum = createHash('sha256').update(fil.innhold).digest('hex');
  try {
    const rad = await transaksjon(avh.datalag, kontekst(f), async (foresp) => {
      await foresp()
        .input('vedlegg_id', sql.UniqueIdentifier, vedleggId)
        .input('sak_id', sql.NVarChar(36), f.sakId)
        .input('filnavn', sql.NVarChar(STOERSTE_FILNAVN), filnavn)
        .input('innhold', sql.VarBinary(sql.MAX), fil.innhold)
        .input('innhold_sha256', sql.NVarChar(64), sum)
        .execute('koe_api.lagre_vedlegg');
      const svar = await foresp()
        .input('id', sql.UniqueIdentifier, vedleggId)
        .query<Vedleggsrad>(`SELECT ${KOLONNER} FROM koe.vedlegg WHERE vedlegg_id = @id`);
      return svar.recordset[0];
    });
    return [201, { success: true, vedlegg: somSvar(rad) }];
  } catch (feil) {
    const nr = feilnummer(feil);
    if (nr === UKJENT || nr === BLOKKERT) return feilsvar(403, 'FORBIDDEN', 'Du har ikke tilgang.');
    throw feil;
  }
}

async function listVedlegg(f: Forespoersel, avh: Required<Avhengigheter>): Promise<Svar> {
  const rader = await transaksjon(avh.datalag, kontekst(f), async (foresp) => {
    const svar = await foresp()
      .input('sak', sql.NVarChar(36), f.sakId)
      .query<Vedleggsrad>(
        `SELECT ${KOLONNER} FROM koe.vedlegg WHERE sak_id = @sak ORDER BY lastet_opp, vedlegg_id`
      );
    return svar.recordset;
  });
  return [200, { success: true, vedlegg: rader.map(somSvar) }];
}

/** `filename*` etter RFC 8187: `encodeURIComponent` lar `'()*` stå, men de er ikke attr-char. */
const attrTegn = (navn: string) =>
  encodeURIComponent(navn).replace(
    /['()*]/g,
    (t) => `%${t.charCodeAt(0).toString(16).toUpperCase()}`
  );

async function lastNed(f: Forespoersel, avh: Required<Avhengigheter>): Promise<Svar> {
  if (!f.ressurs || !UUID.test(f.ressurs)) return finnesIkke();
  const rad = await transaksjon(avh.datalag, kontekst(f), async (foresp) => {
    const svar = await foresp()
      .input('sak', sql.NVarChar(36), f.sakId)
      .input('id', sql.UniqueIdentifier, f.ressurs)
      .query<{
        filnavn: string;
        innhold: Buffer | null;
      }>('SELECT filnavn, innhold FROM koe.vedlegg WHERE vedlegg_id = @id AND sak_id = @sak');
    return svar.recordset[0];
  });
  if (!rad) return finnesIkke();
  // Etter levering ligger filen bare i Catenda (spørsmål 1 A); nedlastingen derfra kommer i V-3.
  if (!rad.innhold)
    return feilsvar(409, 'VEDLEGG_I_CATENDA', 'Vedlegget er levert og ligger i Catenda.');
  return [
    200,
    rad.innhold,
    {
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename*=UTF-8''${attrTegn(rad.filnavn)}`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
    },
  ];
}

async function slett(f: Forespoersel, avh: Required<Avhengigheter>): Promise<Svar> {
  if (!f.side?.teamId) return UTEN_TEAM;
  if (!f.ressurs || !UUID.test(f.ressurs)) return finnesIkke();
  try {
    const slettet = await transaksjon(avh.datalag, kontekst(f), async (foresp) => {
      const svar = await foresp()
        .input('vedlegg_id', sql.UniqueIdentifier, f.ressurs)
        .input('sak_id', sql.NVarChar(36), f.sakId)
        .execute<{ slettet: number }>('koe_api.slett_vedlegg');
      return svar.recordset[0].slettet;
    });
    return slettet ? [200, { success: true }] : finnesIkke();
  } catch (feil) {
    if (feilnummer(feil) === BUNDET)
      return feilsvar(
        409,
        'VEDLEGG_BUNDET',
        'En hendelse viser til vedlegget, så det er del av saken og kan ikke slettes.'
      );
    throw feil;
  }
}

const VEDLEGG = '/api/kjerne/saker/([^/]+)/vedlegg';
const ID = '([^/]+)';
const EKSEMPEL_ID = '00000000-0000-4000-8000-000000000000';

export const VEDLEGGSRUTER: readonly Saksrute[] = [
  {
    metode: 'POST',
    sti: new RegExp(`^${VEDLEGG}$`),
    eksempel: (s) => `/api/kjerne/saker/${s}/vedlegg`,
    tilgang: { prosjektrolle: 'member', kontraktsrolle: 'kreves' },
    fil: true,
    behandle: lastOpp,
  },
  {
    metode: 'GET',
    sti: new RegExp(`^${VEDLEGG}$`),
    eksempel: (s) => `/api/kjerne/saker/${s}/vedlegg`,
    tilgang: { prosjektrolle: 'viewer', kontraktsrolle: 'kreves' },
    behandle: listVedlegg,
  },
  {
    metode: 'GET',
    sti: new RegExp(`^${VEDLEGG}/${ID}$`),
    eksempel: (s) => `/api/kjerne/saker/${s}/vedlegg/${EKSEMPEL_ID}`,
    tilgang: { prosjektrolle: 'viewer', kontraktsrolle: 'kreves' },
    behandle: lastNed,
  },
  {
    metode: 'DELETE',
    sti: new RegExp(`^${VEDLEGG}/${ID}$`),
    eksempel: (s) => `/api/kjerne/saker/${s}/vedlegg/${EKSEMPEL_ID}`,
    tilgang: { prosjektrolle: 'member', kontraktsrolle: 'kreves' },
    behandle: slett,
  },
];
