/**
 * Sakslisten i prosjektet (#1022): sakene TS-kjernen har skrevet, med statusen og
 * tallene regnet av kjernen ved lesing. Ingenting i lista er lagret som
 * oppsummering; statusen er visningens etikett (AGENTS.md, «Kontrakten først»).
 * Feltnavnene er kontrakter (B-17).
 */

import type { Journalrad, Part } from '../kjerne/typer.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import { utledJournal } from '../kjerne/kommandoer/skriving.ts';
import { visning, type Visning } from '../kjerne/utledning/visning.ts';
import type { Utledning } from '../kjerne/utledning/utled.ts';
import type { Avhengigheter, Prosjektforespoersel, Rute, Svar } from './app.ts';
import { transaksjon, type Kontekst, type Pool } from './datalag.ts';
import { skrevetAvKjernen } from './lager.ts';

interface Listerad {
  sak_id: string;
  sakstype: string;
  opprettet: Date;
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
  journal: Journalrad[];
}

/**
 * Sakene i prosjektet i konteksten, med journalen, fra `koe_api.saksliste`.
 * Radsikkerheten avgrenser til prosjektet. En sak TS-kjernen ikke har skrevet,
 * er ikke med, som i `lesSaken`.
 */
export async function lesSakslisten(pool: Pool, kontekst: Kontekst): Promise<LestSak[]> {
  const rader = await transaksjon(pool, kontekst, async (foresp) => {
    const svar = await foresp().execute<Listerad>('koe_api.saksliste');
    return svar.recordset;
  });
  const saker = new Map<string, LestSak>();
  for (const r of rader) {
    let sak = saker.get(r.sak_id);
    if (!sak) {
      sak = {
        sakId: r.sak_id,
        sakstype: r.sakstype,
        opprettet: r.opprettet.toISOString(),
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
  return [...saker.values()].filter((s) => skrevetAvKjernen(s.journal));
}

const tall = (v: unknown): number | null => (typeof v === 'number' ? v : null);
const tekst = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** Én linje i sakslisten. */
export interface Sakslinje {
  sak_id: string;
  sakstype: string;
  sakstittel: string | null;
  status: Visning['status'];
  spor: Visning['spor'];
  opprettet: string;
  siste_hendelse: string;
  hovedkategori: string | null;
  krevd_beloep: number | null;
  krevd_dager: number | null;
  godkjent_beloep: number | null;
  godkjent_dager: number | null;
}

/** Beløpet og dagene i byggherrens gjeldende svar i sporet. */
function godkjent(u: Utledning): Pick<Sakslinje, 'godkjent_beloep' | 'godkjent_dager'> {
  const beloep = u.spor.vederlag.gjeldendeSvar?.standpunkter.find((s) => s.art === 'beloep');
  const dager = u.spor.frist.gjeldendeSvar?.standpunkter.find((s) => s.art === 'dager');
  return {
    godkjent_beloep: beloep?.art === 'beloep' ? beloep.godkjent : null,
    godkjent_dager: dager?.art === 'dager' ? dager.vurdert : null,
  };
}

export function sakslinje(sak: LestSak, kjerne: Kjerne): Sakslinje {
  const u = utledJournal(sak.journal, kjerne);
  const v = visning(u, kjerne.regler);
  return {
    sak_id: sak.sakId,
    sakstype: sak.sakstype,
    sakstittel: tekst(sak.journal[0]!.data.sakstittel),
    status: v.status,
    spor: v.spor,
    opprettet: sak.opprettet,
    siste_hendelse: sak.journal.at(-1)!.tidsstempel,
    hovedkategori: tekst(u.spor.grunnlag.gjeldendeKrav?.innhold.hovedkategori),
    krevd_beloep: tall(u.spor.vederlag.gjeldendeKrav?.innhold.beloep),
    krevd_dager: tall(u.spor.frist.gjeldendeKrav?.innhold.dager),
    ...godkjent(u),
  };
}

async function sakslisten(
  { bruker, prosjekt }: Prosjektforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const saker = await lesSakslisten(avh.datalag, {
    aktor: bruker.id,
    prosjekt: prosjekt.prosjektId,
  });
  return [200, { success: true, saker: saker.map((s) => sakslinje(s, avh.kjerne)) }];
}

export const SAKSLISTERUTER: readonly Rute[] = [
  {
    metode: 'GET',
    sti: /^\/api\/projects\/([^/]+)\/saker$/,
    eksempel: (p) => `/api/projects/${p}/saker`,
    tilgang: {
      prosjektrolle: 'viewer',
      utenSak: 'Lista over sakene i prosjektet; den gjelder prosjektet, ikke én sak.',
    },
    behandle: sakslisten,
  },
];
