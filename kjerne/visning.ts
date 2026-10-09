/**
 * `visning(u, regler)`: etiketter, samlet status og merknader, avledet av
 * utledningen. Ingen regel leser visningen; arkitekturtesten håndhever det
 * (INV-MM-9). En ny etikett, som `frafalt`, endrer derfor ikke reglene.
 *
 * Visningen er det eneste stedet dagens regler vurderer et sendt brev på nytt.
 * Gir de et standpunkt en annen virkning enn brevet, vises det som en merknad
 * som oppfordrer byggherren til å revidere svaret (MM-U9), eller som at regelen
 * er endret etter enigheten (MM-U3).
 */

import type { Regelsett } from './regler/regelsett.ts';
import { standpunkter, ulikeVirkninger } from './standpunkt.ts';
import { enighetensVirkning, kraveneErAvgjort, type Utledning } from './utled.ts';
import { SPOR, type Spor } from './typer.ts';

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
  if (kraveneErAvgjort(u)) return 'avsluttet_oppgjort';
  if (SPOR.some((s) => u.spor[s].gjeldendeKrav && !u.spor[s].gjeldendeSvar && !u.spor[s].trukket))
    return 'venter_paa_svar';
  return 'under_forhandling';
}

/** Brevet vurdert med dagens regler gir et standpunkt en annen virkning (MM-U9). */
function regelenErEndret(u: Utledning, spor: Spor, regler: Regelsett): boolean {
  const g = u.spor[spor].gjeldendeSvar;
  if (!g) return false;
  const grunnlagskrav =
    spor === 'grunnlag'
      ? u.spor.grunnlag.krav.find((k) => k.id === g.gjelder)
      : u.spor.grunnlag.gjeldendeKrav;
  return ulikeVirkninger(u.svar[g.id].standpunkter, standpunkter(g, grunnlagskrav, regler));
}

function etiketter(u: Utledning, spor: Spor, regler: Regelsett): string[] {
  const s = u.spor[spor];
  const ut: string[] = [];
  if (s.trukket) ut.push('trukket');
  if (s.gjeldendeKrav && !s.gjeldendeSvar && !s.trukket) ut.push('venter_paa_svar');
  const virkning = enighetensVirkning(u, spor);
  if (spor === 'grunnlag') {
    if (u.frafalt) ut.push('frafalt');
    if (u.grunnlagAvvist) ut.push('avslatt');
    if (u.grunnlagAvklart) ut.push('avklart');
    if (virkning) ut.push('enige');
  } else {
    if (virkning === 'betinget') ut.push('enige_betinget');
    if (virkning === 'virksom') ut.push('oppgjort');
    if (virkning === 'uten_virkning') ut.push('enighet_uten_virkning');
    if (s.subsidiaer.length) ut.push('subsidiaert');
  }
  if (regelenErEndret(u, spor, regler))
    ut.push(s.enighet ? 'regel_endret_etter_enighet' : 'regel_endret_etter_brevet');
  if (s.gjeldendeSvar && u.svar[s.gjeldendeSvar.id].uavklart.length)
    ut.push('bh_har_ikke_vurdert_varselet');
  if (spor === 'frist' && !s.varsel) ut.push('varsel_ikke_registrert');
  return ut;
}

export function visning(u: Utledning, regler: Regelsett): Visning {
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
      SPOR.map((s) => [s, { etiketter: u.forstatt ? etiketter(u, s, regler) : [] }])
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
