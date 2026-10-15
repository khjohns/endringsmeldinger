/**
 * `visning(u, regler)`: etiketter, samlet status og merknader, avledet av
 * utledningen. Ingen regel leser visningen; arkitekturtesten håndhever det
 * (INV-MM-9). En ny etikett, som `paalegg_frafalt`, endrer derfor ikke reglene.
 *
 * Visningen er det eneste stedet dagens regler vurderer et sendt brev på nytt.
 * Gir de et standpunkt en annen virkning enn brevet, vises det som en merknad
 * som oppfordrer byggherren til å revidere svaret (MM-U9), eller som at regelen
 * er endret etter enigheten (MM-U3).
 */

import { erRegistrert } from '../format/leser.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { innsigelsenSvaretErLestMed, ulikeVirkninger, virkninger } from '../frosset/standpunkt.ts';
import {
  enighetensVirkning,
  grunnlagskravFor,
  kraveneErAvgjort,
  venterPaaSvar,
  type Utledning,
} from './utled.ts';
import { SPOR, type Spor } from '../typer.ts';

export type Statuskode =
  | 'kan_ikke_utledes'
  | 'avsluttet_avslaatt'
  | 'avsluttet_trukket'
  | 'avsluttet_oppgjort'
  | 'venter_paa_svar'
  | 'under_forhandling';

const STATUSTEKST: Record<Statuskode, string> = {
  kan_ikke_utledes: 'Kan ikke utledes',
  avsluttet_avslaatt: 'Avsluttet: avslått',
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
  if (!u.forstaatt) return 'kan_ikke_utledes';
  if (u.grunnlagAvvist) return 'avsluttet_avslaatt';
  if (u.spor.grunnlag.trukket) return 'avsluttet_trukket';
  // KA-U20: saken vises ikke som oppgjort når en enighet bygger på et merket brev.
  if (kraveneErAvgjort(u) && !SPOR.some((s) => u.spor[s].forbehold)) return 'avsluttet_oppgjort';
  if (SPOR.some((s) => venterPaaSvar(u.spor[s]))) return 'venter_paa_svar';
  return 'under_forhandling';
}

/** Brevet vurdert med dagens regler gir et standpunkt en annen virkning (MM-U9). */
function regelenErEndret(u: Utledning, spor: Spor, regler: Regelsett): boolean {
  const g = u.spor[spor].gjeldendeSvar;
  if (!g) return false;
  return ulikeVirkninger(
    u.svar[g.id].virkninger,
    virkninger(g, grunnlagskravFor(g, u), regler, innsigelsenSvaretErLestMed(g))
  );
}

/**
 * Svaret er registrert korrespondanse. Beslutningsgrunnlaget er da appens vurdering
 * etter reglene ved registreringen, ikke da brevet ble sendt (MM-U17).
 */
function vurdertVedRegistreringen(u: Utledning, svarId: string): boolean {
  const dokument = u.svar[svarId].svar.dokument;
  return erRegistrert(
    u.opplysninger.filter((o) => o.opplysning.dokument === dokument).map((o) => o.opplysning)
  );
}

function etiketter(u: Utledning, spor: Spor, regler: Regelsett): string[] {
  const s = u.spor[spor];
  const ut: string[] = [];
  if (s.trukket) ut.push('trukket');
  if (venterPaaSvar(s)) ut.push('venter_paa_svar');
  // KA-U20: bygger enigheten på et merket brev, slår visningen ikke fast at den finnes.
  const virkning = s.forbehold ? null : enighetensVirkning(u, spor);
  if (spor === 'grunnlag') {
    if (u.frafalt) ut.push('paalegg_frafalt');
    if (u.grunnlagAvvist) ut.push('avslaatt');
    if (u.grunnlagAvklart) ut.push('avklart');
    if (u.endringsordre === 'ikke_avklart') ut.push('endringsordre_ikke_avklart');
    if (virkning && !s.trukket) ut.push('enige');
  } else {
    if (virkning === 'betinget') ut.push('enige_betinget');
    if (virkning === 'virksom') ut.push('oppgjort');
    if (virkning === 'uten_virkning') ut.push('enighet_uten_virkning');
    if (s.gjeldendeKrav && s.subsidiaer.length) ut.push('subsidiaert');
  }
  if (regelenErEndret(u, spor, regler))
    ut.push(s.enighet ? 'regel_endret_etter_enighet' : 'regel_endret_etter_brevet');
  if (s.gjeldendeSvar && vurdertVedRegistreringen(u, s.gjeldendeSvar.id))
    ut.push('appens_vurdering_ved_registreringen');
  // OV-U5: svaret står, og visningen sier at det gjaldt et annet varsel enn det registrerte.
  if (s.gjeldendeSvar && u.svar[s.gjeldendeSvar.id].gjaldtEtAnnetVarsel.length)
    ut.push('svaret_gjaldt_et_annet_varsel');
  // KA-U16, KA-U20: enigheten eller svaret bygger på et merket brev; uenigheten vises.
  if (s.forbehold) ut.push(s.enighet ? 'uenighet_om_merket_brev' : 'forbehold');
  // § 5 og VS-U12: påberopelsene registreres og vises uten virkning på utfallet.
  const iSporet = [
    s.gjeldendeKrav?.id,
    s.gjeldendeSvar?.id,
    spor === 'frist' ? s.varsel?.id : null,
  ];
  for (const i of u.innsigelser)
    if (iSporet.includes(i.gjelder) && !ut.includes(`innsigelse_fra_${i.part}`))
      ut.push(`innsigelse_fra_${i.part}`);
  if (spor === 'grunnlag' && u.passivitet.length) ut.push('passivitet_paaberopt');
  if (s.ingenKrav) ut.push('ingen_krav');
  else if (spor === 'frist' && !s.varsel) ut.push('varsel_ikke_registrert');
  return ut;
}

export function visning(u: Utledning, regler: Regelsett): Visning {
  const kode = status(u);
  const ikkeTolket = new Set(u.begrensninger.map((b) => b.hendelse));
  const opplysninger: Record<string, string[]> = {};
  for (const { opplysning: o, bestridelser, avklaring } of u.opplysninger) {
    const e = [
      o.hva === 'endringsordre'
        ? `${o.oppfylt ? 'endringsordre' : 'ikke_endringsordre'}_ifolge_${o.oppgittAv}`
        : `${o.hva}_ifolge_${o.oppgittAv}`,
    ];
    if (avklaring !== null) e.push('avklart_av_avsenderen');
    if (
      o.hva === 'sendt' &&
      !u.opplysninger.some(
        (x) =>
          x.opplysning.dokument === o.dokument &&
          x.opplysning.hva === 'mottatt' &&
          x.opplysning.gjelder === o.gjelder
      )
    )
      e.push('mottaksdato_mangler');
    for (const b of bestridelser)
      e.push(
        {
          sendt: 'sending_bestridt',
          mottatt: 'mottak_bestridt',
          endringsordre: 'endringsordre_bestridt',
          kan_ikke_uttrykkes: 'merking_bestridt',
        }[b.hva]
      );
    opplysninger[o.id] = e;
  }
  return {
    status: { kode, tekst: STATUSTEKST[kode] },
    spor: Object.fromEntries(
      SPOR.map((s) => [s, { etiketter: u.forstaatt ? etiketter(u, s, regler) : [] }])
    ) as Visning['spor'],
    opplysninger,
    journal: u.journal.map((h) => ({
      hendelse: h.id,
      type: h.type,
      tolket: h.art !== 'ukjent' && !ikkeTolket.has(h.id),
    })),
    // MM-U2: mens saken stopper, må et varsel med frist sendes utenfor appen og registreres senere.
    merknader: u.forstaatt
      ? u.utenVirkning.length
        ? ['registrert_brev_uten_virkning']
        : []
      : ['varsel_med_frist_utenfor_appen'],
  };
}
