/**
 * `visning(u)`: etiketter og samlet status, avledet av utledningen. Ingen regel
 * leser visningen; arkitekturtesten håndhever det (INV-MM-9). En ny etikett,
 * som `frafalt`, endrer derfor ikke forretningsreglene.
 */

import type { Utledning } from './utled.ts';
import { SPOR, type Spor, type Standpunkt } from './typer.ts';

export type Statuskode =
  | 'kan_ikke_utledes'
  | 'avsluttet_avslatt'
  | 'avsluttet_trukket'
  | 'avsluttet_oppgjort'
  | 'venter_paa_svar'
  | 'under_forhandling';

const STATUSTEKST: Record<Statuskode, string> = {
  kan_ikke_utledes: 'Kan ikke utledes',
  avsluttet_avslatt: 'Avsluttet: avslått',
  avsluttet_trukket: 'Avsluttet: trukket',
  avsluttet_oppgjort: 'Avsluttet: oppgjort',
  venter_paa_svar: 'Venter på svar',
  under_forhandling: 'Under forhandling',
};

export interface Visning {
  status: { kode: Statuskode; tekst: string };
  spor: Record<Spor, { etiketter: string[] }>;
  /** Etikettene for hver opplysning, etter ID. */
  opplysninger: Record<string, string[]>;
  journal: { hendelse: string; type: string; tolket: boolean }[];
  merknader: string[];
}

function status(u: Utledning): Statuskode {
  if (!u.forstatt) return 'kan_ikke_utledes';
  if (u.grunnlagAvvist) return 'avsluttet_avslatt';
  if (u.spor.grunnlag.trukket) return 'avsluttet_trukket';
  if (u.avsluttet) return 'avsluttet_oppgjort';
  if (SPOR.some((s) => u.spor[s].gjeldendeKrav && !u.spor[s].gjeldendeSvar && !u.spor[s].trukket))
    return 'venter_paa_svar';
  return 'under_forhandling';
}

const ulikeVirkninger = (a: Standpunkt[], b: Standpunkt[]) =>
  a.length !== b.length ||
  a.some((p, i) => p.utsagn !== b[i].utsagn || p.virkning !== b[i].virkning);

function etiketter(u: Utledning, spor: Spor): string[] {
  const s = u.spor[spor];
  const ut: string[] = [];
  if (s.trukket) ut.push('trukket');
  if (s.gjeldendeKrav && !s.gjeldendeSvar && !s.trukket) ut.push('venter_paa_svar');
  if (spor === 'grunnlag') {
    if (u.frafalt) ut.push('frafalt');
    if (u.grunnlagAvvist) ut.push('avslatt');
    if (u.grunnlagAvklart) ut.push('avklart');
  } else {
    const virkning = s.enighet?.virkning;
    if (virkning === 'betinget') ut.push('enige_betinget');
    if (virkning === 'virksom') ut.push('oppgjort');
    if (virkning === 'uten_virkning') ut.push('enighet_uten_virkning');
    if (s.subsidiaer.length) ut.push('subsidiaert');
  }
  if (s.gjeldendeSvar) {
    const svar = u.svar[s.gjeldendeSvar.id];
    if (svar.avvik) ut.push('avviker_fra_brevet');
    // MM-U3: enigheten står, men dagens utledning kan vise at regelen er endret.
    if (s.enighet && ulikeVirkninger(s.enighet.grunnlag.standpunkter, svar.standpunkter))
      ut.push('regel_endret_etter_enighet');
  }
  if (spor === 'frist') {
    if (!s.varsel) ut.push('varsel_ikke_registrert');
    else if (
      !s.svar.some((x) =>
        x.utsagn.some((y) => y.art === 'rettidighet' && y.gjelder === s.varsel!.id)
      )
    )
      ut.push('bh_har_ikke_vurdert_varselet');
  }
  return ut;
}

export function visning(u: Utledning): Visning {
  const kode = status(u);
  const ikkeTolket = new Set(u.begrensninger.map((b) => b.hendelse));
  const opplysninger: Record<string, string[]> = {};
  for (const { opplysning: o, bestridelser } of u.opplysninger) {
    const e = [`${o.hva}_ifolge_${o.oppgittAv}`];
    if (
      o.hva === 'sendt' &&
      !u.opplysninger.some(
        (x) => x.opplysning.dokument === o.dokument && x.opplysning.hva === 'mottatt'
      )
    )
      e.push('mottaksdato_mangler');
    for (const b of bestridelser)
      e.push(b.hva === 'mottatt' ? 'mottak_bestridt' : 'sending_bestridt');
    opplysninger[o.id] = e;
  }
  return {
    status: { kode, tekst: STATUSTEKST[kode] },
    spor: Object.fromEntries(
      SPOR.map((s) => [s, { etiketter: u.forstatt ? etiketter(u, s) : [] }])
    ) as Visning['spor'],
    opplysninger,
    journal: u.journal.map((h) => ({
      hendelse: h.id,
      type: h.type,
      tolket: h.art !== 'ukjent' && !ikkeTolket.has(h.id),
    })),
    // MM-U2: mens saken stopper, må et varsel med frist sendes utenfor appen og registreres senere.
    merknader: u.forstatt ? [] : ['varsel_med_frist_utenfor_appen'],
  };
}
