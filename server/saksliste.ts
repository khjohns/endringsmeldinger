/**
 * Sakslisten i prosjektet (#1022): sakene TS-kjernen har skrevet, med krav, svar og
 * enighet per spor regnet av kjernen ved lesing (MM-U28 (opphevet av MM-U37)) og det som foreligger
 * (MM-U29 (opphevet av MM-U40)). Saken har ingen samlet status, bare en betegnelse i de fire tilfellene
 * i MM-U22. Ingenting i lista er lagret som oppsummering (CLAUDE.md, «Kontrakten
 * først»). Feltnavnene er kontrakter (B-17); betydningen står i domenetabellen.
 */

import type { Journalrad, Part } from '../kjerne/typer.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import { utledJournal } from '../kjerne/kommandoer/skriving.ts';
import { sakslinjen, type Sakslinje } from '../kjerne/utledning/visning.ts';
import type { Avhengigheter, Prosjektforespoersel, Rute, Svar } from './rutetyper.ts';
import { lesekontekst } from './autorisasjon.ts';
import { transaksjon, type Foresp, type Kontekst, type Pool } from './datalag.ts';
import { skrevetAvKjernen } from './lager.ts';

interface Listerad {
  sak_id: string;
  sakstype: string;
  opprettet: Date;
  kode: 'koe' | 'eo' | null;
  loepenummer: number | null;
  event_id: string;
  event_type: string;
  versjon: number;
  tidsstempel: Date;
  aktor_id: string;
  aktor_rolle: Part;
  aktor_team_id: string | null;
  refererer_til_event_id: string | null;
  format: number | null;
  data: string;
}

export interface LestSak {
  sakId: string;
  sakstype: string;
  opprettet: string;
  /** Sakens kode og løpenummer fra `koe.sak_kode`, eller `null` før sakens første brev fra løsningen (LV-U47). */
  sakskode: { kode: 'koe' | 'eo'; loepenummer: number } | null;
  journal: Journalrad[];
}

/**
 * Sakene i prosjektet i konteksten, med journalen, fra `koe_api.saksliste`.
 * Radsikkerheten avgrenser til prosjektet. En sak TS-kjernen ikke har skrevet,
 * er ikke med, som i `lesSaken`.
 */
export async function lesSakslisten(pool: Pool, kontekst: Kontekst): Promise<LestSak[]> {
  return transaksjon(pool, kontekst, lesSakene);
}

/** Det samme som `lesSakslisten`, i en transaksjon som alt har konteksten. */
export async function lesSakene(foresp: Foresp): Promise<LestSak[]> {
  return (await lesAlleSakene(foresp)).filter((s) => skrevetAvKjernen(s.journal));
}

/** Sakene i prosjektet i konteksten, også de TS-kjernen ikke har skrevet. */
export async function lesAlleSakene(foresp: Foresp): Promise<LestSak[]> {
  const rader = (await foresp().execute<Listerad>('koe_api.saksliste')).recordset;
  const saker = new Map<string, LestSak>();
  for (const r of rader) {
    let sak = saker.get(r.sak_id);
    if (!sak) {
      sak = {
        sakId: r.sak_id,
        sakstype: r.sakstype,
        opprettet: r.opprettet.toISOString(),
        sakskode:
          r.kode !== null && r.loepenummer !== null
            ? { kode: r.kode, loepenummer: r.loepenummer }
            : null,
        journal: [],
      };
      saker.set(r.sak_id, sak);
    }
    sak.journal.push({
      event_id: r.event_id,
      sak_id: r.sak_id,
      event_type: r.event_type,
      versjon: r.versjon,
      tidsstempel: r.tidsstempel.toISOString(),
      aktor_id: r.aktor_id.toLowerCase(),
      aktor_rolle: r.aktor_rolle,
      aktor_team_id: r.aktor_team_id,
      refererer_til_event_id: r.refererer_til_event_id,
      format: r.format,
      data: JSON.parse(r.data) as Record<string, unknown>,
    });
  }
  return [...saker.values()];
}

/** Linja for saken: feltene fra lagringen og resten fra utledningen (`sakslinjen`). */
export function sakslinje(sak: LestSak, kjerne: Kjerne): Sakslinje {
  return {
    sak_id: sak.sakId,
    sakstype: sak.sakstype,
    opprettet: sak.opprettet,
    kode: sak.sakskode?.kode ?? null,
    loepenummer: sak.sakskode?.loepenummer ?? null,
    siste_hendelse: sak.journal.at(-1)!.tidsstempel,
    ...sakslinjen(utledJournal(sak.journal, kjerne)),
  };
}

async function sakslisten(
  { bruker, prosjekt, side }: Prosjektforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const saker = await lesSakslisten(avh.datalag, lesekontekst(bruker, prosjekt.prosjektId, side));
  const linjer = saker.map((s) => sakslinje(s, avh.kjerne));
  return [
    200,
    {
      success: true,
      part: side?.rolle ?? null,
      saker: linjer,
    },
  ];
}

export const SAKSLISTERUTER: readonly Rute[] = [
  {
    metode: 'GET',
    sti: /^\/api\/projects\/([^/]+)\/saker$/,
    eksempel: (p) => `/api/projects/${p}/saker`,
    tilgang: {
      prosjektrolle: 'viewer',
      utenSak: 'Lista over sakene i prosjektet; den gjelder prosjektet, ikke én sak.',
      kontraktsrolle: 'lesing',
    },
    behandle: sakslisten,
  },
];
