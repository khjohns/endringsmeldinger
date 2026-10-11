/**
 * Kjernens bane (`kjerne/tester/bane.ts`) gjennom SQL Server, i de to
 * lagringsformene (#395):
 *
 * - (a) ett dokument per brev er kilden: `data` lagres som teksten serveren
 *   sendte, og leses tilbake med `JSON.parse`.
 * - (b) utsagnene i egne tabeller er kilden: dokumentet deles i kolonner ved
 *   skriving og bygges opp igjen av dem ved lesing.
 *
 * Skrivingen går gjennom kommandoene i `koe_api` med runtime-innloggingen, og
 * konteksten er parten som skriver. Aktørfeltene stemples av kommandoen, ikke
 * av raden kjernen laget. Banen husker radene slik de ble lagret, så testene kan
 * sammenlikne gjenlesingen med det som ble skrevet.
 *
 * Leveringsoppdraget er en forenklet form av `lagOppdrag` i
 * `server/levering.ts`: brevet og avsenderen, uten mål i Catenda. Summen
 * regnes med samme `sjekksum`.
 */

import { randomUUID } from 'node:crypto';
import { sjekksum } from '../../../server/levering.ts';
import { Versjonskonflikt, type Bane } from '../../../kjerne/tester/bane.ts';
import type { Journalrad } from '../../../kjerne/typer.ts';
import { feilnummer, sql, transaksjon, type Kroker } from './forbindelse.ts';
import { kontekst, nySak, type Oppsett, type Part } from './oppsett.ts';

export type Form = 'a' | 'b';

export const KOMMANDO: Record<Form, string> = {
  a: 'koe_api.registrer_a',
  b: 'koe_api.registrer_b',
};
export const DOKUMENTTABELL: Record<Form, string> = { a: 'form_a.hendelse', b: 'form_b.dokument' };
export const OPPDRAGSTABELL: Record<Form, string> = {
  a: 'form_a.leveringsoppdrag',
  b: 'form_b.leveringsdokument',
};

export interface SqlBane extends Bane {
  form: Form;
  /** Radene slik de ble lagret: kjernens rader med aktørfeltene kommandoen satte. */
  skrevet: Journalrad[];
  /** Kroker for neste `skriv`. */
  kroker: Kroker;
}

export function oppdragFor(rad: Journalrad): Record<string, unknown> {
  return {
    oppdragsformat: 1,
    brev: {
      event_id: rad.event_id,
      sak_id: rad.sak_id,
      saksversjon: rad.versjon,
      tidsstempel: rad.tidsstempel,
      avsender: { part: rad.aktor_rolle, aktor_id: rad.aktor_id, team_id: rad.aktor_team_id },
      hendelsesformat: rad.format,
      dokument: rad.data,
    },
  };
}

/** Rå registrering av én rad, uten kjernen. Brukes også av testene for rader kjernen ikke ville skrevet. */
export async function registrer(
  foresp: () => sql.Request,
  form: Form,
  rad: Journalrad,
  forventet: number,
  data: string = JSON.stringify(rad.data),
  oppdrag: unknown = rad.event_type === 'dokument_registrert' ? oppdragFor(rad) : null
): Promise<void> {
  await foresp()
    .input('sak_id', sql.NVarChar(36), rad.sak_id)
    .input('forventet_versjon', sql.Int, forventet)
    .input('event_id', sql.NVarChar(36), rad.event_id)
    .input('event_type', sql.NVarChar(100), rad.event_type)
    .input('tidsstempel', sql.DateTimeOffset(3), new Date(rad.tidsstempel))
    .input('format', sql.Int, rad.format)
    .input('data', sql.NVarChar(sql.MAX), data)
    .input('refererer_til_event_id', sql.NVarChar(36), rad.refererer_til_event_id)
    .input('oppdrag', sql.NVarChar(sql.MAX), oppdrag ? JSON.stringify(oppdrag) : null)
    .input('oppdrag_sha256', sql.NVarChar(64), oppdrag ? sjekksum(oppdrag) : null)
    .execute(KOMMANDO[form]);
}

type Rad = Record<string, unknown>;

/** Objektet uten feltene som er NULL: NULL i en kolonne betyr at feltet mangler. */
const utenNull = (rad: Rad, felt: string[]): Rad =>
  Object.fromEntries(
    felt.filter((f) => rad[f] !== null && rad[f] !== undefined).map((f) => [f, rad[f]])
  );

const med = (objekt: Rad, noekkel: string, liste: unknown[]): Rad =>
  liste.length ? { ...objekt, [noekkel]: liste } : objekt;

/** Form (b): dokumentet bygd opp igjen av tabellene, i rekkefølgen `plass` gir. */
function gjenoppbygg(dokument: Rad, deler: Record<string, Rad[]>): Record<string, unknown> {
  const id = dokument.event_id;
  const av = (tabell: string, filter: (r: Rad) => boolean = () => true) =>
    deler[tabell].filter((r) => r.event_id === id && filter(r));
  if (dokument.event_type === 'sak_opprettet') {
    const [s] = av('sak_opprettet');
    return s ? utenNull(s, ['sakstittel', 'sakstype']) : {};
  }
  const krav = av('krav').map((k) =>
    utenNull(k, [
      'id',
      'spor',
      'erstatter',
      'hovedkategori',
      'underkategori',
      'tittel',
      'beskrivelse',
      'metode',
      'beloep',
      'dager',
    ])
  );
  const svar = av('svar').map((s) => {
    let ut = utenNull(s, ['id', 'spor', 'gjelder', 'erstatter']);
    ut = med(
      ut,
      'standpunkter',
      av('standpunkt', (p) => p.svar_plass === s.plass).map((p) =>
        utenNull(p, ['id', 'art', 'gjelder', 'hjemmel', 'i_tide', 'resultat', 'oppfylt'])
      )
    );
    if (s.har_utregning)
      ut.utregning = utenNull(
        {
          resultat: s.utregning_resultat,
          godkjent_beloep: s.utregning_godkjent_beloep,
          godkjent_dager: s.utregning_godkjent_dager,
          subsidiaert_resultat: s.utregning_subsidiaert_resultat,
          subsidiaert_godkjent_dager: s.utregning_subsidiaert_godkjent_dager,
        },
        [
          'resultat',
          'godkjent_beloep',
          'godkjent_dager',
          'subsidiaert_resultat',
          'subsidiaert_godkjent_dager',
        ]
      );
    if (s.har_beslutningsgrunnlag) {
      const virkning = (liste: string) =>
        av('virkning', (v) => v.svar_plass === s.plass && v.liste === liste);
      let bg = utenNull(
        {
          regelversjon: s.bg_regelversjon,
          linje: s.bg_linje,
          sammenfall: s.bg_sammenfall,
          varslingsplikt: s.bg_varslingsplikt,
        },
        ['regelversjon', 'linje', 'sammenfall', 'varslingsplikt']
      );
      bg = med(
        bg,
        'virkninger',
        virkning('virkninger').map((v) => utenNull(v, ['standpunkt', 'virkning']))
      );
      bg = med(
        bg,
        'uten_virkning',
        virkning('uten_virkning').map((v) => v.standpunkt)
      );
      ut.beslutningsgrunnlag = bg;
    }
    return ut;
  });
  const utsagn = av('utsagn').map((u) =>
    utenNull(u, ['id', 'art', 'hjemmel', 'gjelder', 'regelversjon', 'hva', 'spor'])
  );
  const opplysninger = av('opplysning').map((p) =>
    utenNull(p, ['id', 'hva', 'dato', 'gjelder', 'oppfylt'])
  );
  const dokumentasjon = av('dokumentasjon').map((d) => d.vedlegg);
  let data: Rad = {};
  data = med(data, 'krav', krav);
  data = med(data, 'svar', svar);
  data = med(data, 'utsagn', utsagn);
  data = med(data, 'opplysninger', opplysninger);
  data = med(data, 'dokumentasjon', dokumentasjon);
  return data;
}

const DELTABELLER = [
  'sak_opprettet',
  'krav',
  'svar',
  'standpunkt',
  'virkning',
  'utsagn',
  'opplysning',
  'dokumentasjon',
] as const;

const REKKEFOELGE: Record<(typeof DELTABELLER)[number], string> = {
  sak_opprettet: 'event_id',
  krav: 'event_id, plass',
  svar: 'event_id, plass',
  standpunkt: 'event_id, svar_plass, plass',
  virkning: 'event_id, svar_plass, liste, plass',
  utsagn: 'event_id, plass',
  opplysning: 'event_id, plass',
  dokumentasjon: 'event_id, plass',
};

const HODE = `event_id, sak_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle, aktor_team_id,
              refererer_til_event_id, format`;

function journalrad(r: Rad, data: Record<string, unknown>): Journalrad {
  return {
    event_id: r.event_id as string,
    sak_id: r.sak_id as string,
    event_type: r.event_type as string,
    versjon: r.versjon as number,
    tidsstempel: (r.tidsstempel as Date).toISOString(),
    aktor_id: r.aktor_id as string,
    aktor_rolle: r.aktor_rolle as Part,
    aktor_team_id: r.aktor_team_id as string | null,
    refererer_til_event_id: r.refererer_til_event_id as string | null,
    format: r.format as number | null,
    data,
  };
}

/** Journalen i saken slik basen gir den tilbake, lest med TE i prosjekt A som kontekst. */
export async function lesJournal(o: Oppsett, form: Form, sakId: string): Promise<Journalrad[]> {
  return transaksjon(o.runtime, kontekst(o.brukere.te, o.a), async (f) => {
    if (form === 'a') {
      const r = await f()
        .input('sak', sql.NVarChar(36), sakId)
        .query<Rad>(
          `SELECT ${HODE}, data FROM form_a.hendelse WHERE sak_id = @sak ORDER BY versjon`
        );
      return r.recordset.map((x) => journalrad(x, JSON.parse(x.data as string)));
    }
    const hvor = 'WHERE event_id IN (SELECT event_id FROM form_b.dokument WHERE sak_id = @sak)';
    const r = await f()
      .input('sak', sql.NVarChar(36), sakId)
      .query<Rad>(
        [
          `SELECT ${HODE} FROM form_b.dokument WHERE sak_id = @sak ORDER BY versjon`,
          ...DELTABELLER.map((t) => `SELECT * FROM form_b.${t} ${hvor} ORDER BY ${REKKEFOELGE[t]}`),
        ].join(';\n')
      );
    const [hoder, ...resten] = r.recordsets as unknown as Rad[][];
    const deler = Object.fromEntries(DELTABELLER.map((t, i) => [t, resten[i]]));
    return hoder.map((h) => journalrad(h, gjenoppbygg(h, deler)));
  });
}

/** Leveringsoppdraget eller leveringsdokumentet for brevet, som tekst og sum. */
export async function lesOppdrag(
  o: Oppsett,
  form: Form,
  eventId: string
): Promise<{ innhold: string; innhold_sha256: string } | undefined> {
  return transaksjon(o.runtime, kontekst(o.brukere.te, o.a), async (f) => {
    const r = await f().input('id', sql.NVarChar(36), eventId).query<{
      innhold: string;
      innhold_sha256: string;
    }>(`SELECT innhold, innhold_sha256 FROM ${OPPDRAGSTABELL[form]} WHERE event_id = @id`);
    return r.recordset[0];
  });
}

const erVersjonskonflikt = (feil: unknown) => {
  const n = feilnummer(feil);
  return (
    n === 51409 ||
    ((n === 2627 || n === 2601) && /sak_versjon/.test(String((feil as Error).message)))
  );
};

/** En ny sak i prosjekt A, opprettet av TE, med `sak_opprettet` i kjernens format. */
export async function sqlBane(o: Oppsett, form: Form): Promise<SqlBane> {
  const brukere: Record<Part, string> = { TE: o.brukere.te.id, BH: o.brukere.bh.id };
  const sakId = await nySak(o, kontekst(o.brukere.te, o.a, 'TE'));
  const bane: SqlBane = {
    form,
    sakId,
    skrevet: [],
    kroker: {},
    aktor: (part) => brukere[part],
    journal: () => lesJournal(o, form, sakId),
    async skriv(hendelser, forventet) {
      const part = hendelser[0].aktor_rolle;
      const lagret = hendelser.map((h, i) => ({
        ...structuredClone(h),
        versjon: forventet + i + 1,
        aktor_id: brukere[part],
        aktor_team_id: o.a.team[part],
      }));
      const kroker = bane.kroker;
      bane.kroker = {};
      try {
        await transaksjon(
          o.runtime,
          kontekst(part === 'TE' ? o.brukere.te : o.brukere.bh, o.a, part),
          async (f) => {
            for (const [i, rad] of lagret.entries()) await registrer(f, form, rad, forventet + i);
          },
          kroker
        );
      } catch (feil) {
        if (erVersjonskonflikt(feil)) throw new Versjonskonflikt(forventet, -1);
        throw feil;
      }
      bane.skrevet.push(...lagret);
    },
  };
  await bane.skriv(
    [
      {
        event_id: randomUUID(),
        sak_id: sakId,
        event_type: 'sak_opprettet',
        versjon: 1,
        tidsstempel: '2026-10-09T08:00:00.000Z',
        aktor_id: brukere.TE,
        aktor_rolle: 'TE',
        aktor_team_id: null,
        refererer_til_event_id: null,
        format: 1,
        data: { sakstittel: 'Prøven mot SQL Server', sakstype: 'standard' },
      },
    ],
    0
  );
  return bane;
}
