/**
 * `visning(u, regler)`: etiketter, betegnelsen per spor (MM-U30), sakens status i de fire
 * tilfellene i MM-U22 og merknader, avledet av utledningen. Ingen regel leser visningen;
 * arkitekturtesten håndhever det (INV-MM-9). En ny etikett, som `paalegg_frafalt`, endrer derfor ikke reglene.
 *
 * Visningen er det eneste stedet dagens regler vurderer et sendt brev på nytt.
 * Gir de et standpunkt en annen virkning enn brevet, vises det som en merknad
 * som oppfordrer byggherren til å revidere svaret (MM-U9), eller som at regelen
 * er endret etter enigheten (MM-U3).
 */

import { erRegistrert } from '../format/leser.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { hjemmelenGjelder, ulikeVirkninger, virkninger } from '../frosset/standpunkt.ts';
import {
  enighetensVirkning,
  grunnlagskravFor,
  kraveneErAvgjort,
  sporetErLukket,
  svarIkkeGodtatt,
  venterPaaSvar,
  type RegistrertBrev,
  type Utledning,
} from './utled.ts';
import { SPOR, type Spor } from '../typer.ts';

export type Statuskode =
  | 'kan_ikke_utledes'
  | 'avsluttet_avslaatt'
  | 'avsluttet_trukket'
  | 'alle_krav_avgjort';

const STATUSTEKST: Record<Statuskode, string> = {
  kan_ikke_utledes: 'Kan ikke utledes',
  avsluttet_avslaatt: 'Avsluttet: avslått',
  avsluttet_trukket: 'Avsluttet: trukket',
  alle_krav_avgjort: 'Alle krav sendt i appen er avgjort',
};

export interface Visning {
  /** MM-U22: saken har ingen samlet status utenom de fire tilfellene, og da er den `null`. */
  status: { kode: Statuskode; tekst: string } | null;
  spor: Record<
    Spor,
    {
      etiketter: string[];
      betegnelse: Betegnelse | null;
      /** Svar 2 22.10 i #1045: motpartens brev registrert som dokumentasjon, vist ved kravet. */
      registrerteBrev: string[];
    }
  >;
  /** OV-U4, OV-U16: brevene registrert som dokumentasjon, også når saken ikke er forstått. */
  registrerteBrev: RegistrertBrev[];
  /** Etikettene for hver opplysning, etter ID. */
  opplysninger: Record<string, string[]>;
  journal: { hendelse: string; type: string; tolket: boolean }[];
  merknader: string[];
}

/**
 * MM-U30: betegnelsene for et spor, i rekkefølgen de velges. Hvert spor har høyst én:
 * den første som foreligger. Betegnelsen sier hvilket utsagn eller hvilken relasjon som
 * foreligger; byggherrens resultat og enighetens virkning står i linja under (MM-U22).
 */
export const BETEGNELSER = [
  'trukket',
  'spesifisert_krav_etterspurt',
  'venter_paa_svar',
  'paalegg_frafalt',
  'enige',
  'svar_ikke_godtatt',
  'krav_sendt',
  'ingen_krav',
  'varslet',
] as const;

export type Betegnelse = (typeof BETEGNELSER)[number];

const sendt = (u: Utledning, spor: Spor): boolean =>
  u.spor[spor].krav.length > 0 || u.spor[spor].ingenKrav || u.spor[spor].varsel !== null;

const FORELIGGER: Record<Betegnelse, (u: Utledning, spor: Spor) => boolean> = {
  // Et trukket grunnlag gir «Trukket» bare der krav, varsel eller «ingen krav» er sendt (GR-U25).
  trukket: (u, spor) => u.spor[spor].trukket && sendt(u, spor),
  // § 33.6.2: til forespørselen er besvart, og bare mens saken og sporet ikke er lukket (MM-U31).
  spesifisert_krav_etterspurt: (u, spor) =>
    spor === 'frist' &&
    !u.spor.grunnlag.trukket &&
    !sporetErLukket(u, spor) &&
    u.spor.frist.foresporsler.some((f) => f.svar === null),
  venter_paa_svar: venterPaaSvar,
  paalegg_frafalt: (u, spor) => spor === 'grunnlag' && u.frafalt,
  enige: (u, spor) => u.spor[spor].enighet !== null,
  svar_ikke_godtatt: svarIkkeGodtatt,
  // Står igjen når sporet er lukket uten enighet, som når TE har godtatt avslaget på grunnlaget.
  krav_sendt: (u, spor) => u.spor[spor].gjeldendeKrav !== null,
  ingen_krav: (u, spor) => u.spor[spor].ingenKrav,
  varslet: (u, spor) => u.spor[spor].varsel !== null,
};

/** MM-U30: sporets betegnelse, eller `null` når ingenting er sendt i sporet. */
export function betegnelse(u: Utledning, spor: Spor): Betegnelse | null {
  if (!u.forstaatt) return null;
  return BETEGNELSER.find((b) => FORELIGGER[b](u, spor)) ?? null;
}

/** Betegnelsen saken har i de fire tilfellene i MM-U22; ellers har den ingen. */
export type Saksbetegnelse =
  | 'ikke_forstaatt'
  | 'avslaget_paa_grunnlaget_godtatt'
  | 'grunnlaget_trukket'
  | 'kravene_avgjort';

/** Betegnelsen i MM-U22, som sakslisten og statusen i visningen leser (#1050). */
export function saksbetegnelse(u: Utledning): Saksbetegnelse | null {
  if (!u.forstaatt) return 'ikke_forstaatt';
  if (u.grunnlagAvvist) return 'avslaget_paa_grunnlaget_godtatt';
  if (u.spor.grunnlag.trukket) return 'grunnlaget_trukket';
  if (kraveneErAvgjort(u)) return 'kravene_avgjort';
  return null;
}

const STATUS_FOR: Record<Saksbetegnelse, Statuskode> = {
  ikke_forstaatt: 'kan_ikke_utledes',
  avslaget_paa_grunnlaget_godtatt: 'avsluttet_avslaatt',
  grunnlaget_trukket: 'avsluttet_trukket',
  kravene_avgjort: 'alle_krav_avgjort',
};

/** Brevet vurdert med dagens regler gir et standpunkt en annen virkning (MM-U9). */
function regelenErEndret(u: Utledning, spor: Spor, regler: Regelsett): boolean {
  const g = u.spor[spor].gjeldendeSvar;
  if (!g) return false;
  return ulikeVirkninger(u.svar[g.id].virkninger, virkninger(g, grunnlagskravFor(g, u), regler));
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
  if (FORELIGGER.trukket(u, spor)) ut.push('trukket');
  if (venterPaaSvar(u, spor)) ut.push('venter_paa_svar');
  const virkning = enighetensVirkning(u, spor);
  if (spor === 'grunnlag') {
    if (u.frafalt) ut.push('paalegg_frafalt');
    if (u.grunnlagAvvist) ut.push('avslaatt');
    if (virkning && !s.trukket) ut.push('enige');
  } else {
    if (virkning === 'betinget') ut.push('enige_betinget');
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
  // § 5 og VS-U12: påberopelsene registreres og vises uten virkning på utfallet.
  const iSporet = [s.gjeldendeKrav?.id, s.gjeldendeSvar?.id, s.varsel?.id];
  for (const i of u.innsigelser)
    if (iSporet.includes(i.gjelder) && !ut.includes(`innsigelse_fra_${i.part}`))
      ut.push(`innsigelse_fra_${i.part}`);
  if (spor === 'grunnlag' && u.passivitet.length) ut.push('passivitet_paaberopt');
  if (s.ingenKrav) ut.push('ingen_krav');
  else if (spor === 'frist' && !s.varsel) ut.push('varsel_ikke_registrert');
  // OV-U15: der TE krever endring, kreves det ikke varsel etter § 34.1.2 (§ 34.1.1).
  else if (
    spor === 'vederlag' &&
    u.spor.grunnlag.gjeldendeKrav &&
    !hjemmelenGjelder('34.1.2', u.spor.grunnlag.gjeldendeKrav, regler)
  )
    ut.push('varsel_kreves_ikke');
  return ut;
}

/** OV-U10: et registrert brev kan ha krav appen ikke kjenner. */
const BREV_UTENFOR_APPEN = 'Saken har brev sendt utenfor appen. Appen vurderer ikke innholdet.';

/**
 * OV-U10: saken har registrert korrespondanse, som sakslisten og statusteksten leser. En
 * registrering som er rettet, teller ikke; rettingen står i stedet for den (OV-U17, OV-U18).
 */
export const harRegistrertBrev = (u: Utledning): boolean =>
  u.journal.some(
    (h) =>
      h.art === 'dokument' &&
      erRegistrert(h.dokument.opplysninger) &&
      !u.registrerteBrev.some((b) => b.dokument === h.id && b.rettetAv !== null)
  );

/**
 * Svar 2 22.10 i #1045 (OV-U4): når kravet venter på svar, motpartens registrerte brev for
 * sporet eller hele saken som ikke er rettet, uansett når de ble sendt. Kravet er TEs.
 */
function brevVedKravet(u: Utledning, spor: Spor): string[] {
  if (!venterPaaSvar(u, spor)) return [];
  return u.registrerteBrev
    .filter(
      (b) =>
        b.avsender === 'BH' && b.rettetAv === null && (b.spor.length === 0 || b.spor.includes(spor))
    )
    .map((b) => b.dokument);
}

/**
 * Merknadene for saken. Svar 1 22.10 i #1045: så lenge et registrert brev står og ikke er
 * rettet bort, har saken merknaden etter OV-U10; når kravene er avgjort, står setningen i
 * statusen i stedet.
 */
function merknader(u: Utledning, kode: Statuskode | null): string[] {
  // MM-U2: mens saken stopper, må et varsel med frist sendes utenfor appen og registreres senere.
  const ut = u.forstaatt
    ? u.utenVirkning.length
      ? ['registrert_brev_uten_virkning']
      : []
    : ['varsel_med_frist_utenfor_appen'];
  if (kode !== 'alle_krav_avgjort' && harRegistrertBrev(u)) ut.push('brev_utenfor_appen');
  return ut;
}

function statustekst(u: Utledning, kode: Statuskode): string {
  return kode === 'alle_krav_avgjort' && harRegistrertBrev(u)
    ? `${STATUSTEKST[kode]}. ${BREV_UTENFOR_APPEN}`
    : STATUSTEKST[kode];
}

export function visning(u: Utledning, regler: Regelsett): Visning {
  const sak = saksbetegnelse(u);
  const kode = sak && STATUS_FOR[sak];
  const ikkeTolket = new Set(u.begrensninger.map((b) => b.hendelse));
  const opplysninger: Record<string, string[]> = {};
  for (const { opplysning: o, bestridelser } of u.opplysninger) {
    const e = [
      o.hva === 'endringsordre'
        ? `${o.oppfylt ? 'endringsordre' : 'ikke_endringsordre'}_ifolge_${o.oppgittAv}`
        : `${o.hva}_ifolge_${o.oppgittAv}`,
    ];
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
        }[b.hva]
      );
    opplysninger[o.id] = e;
  }
  return {
    status: kode && { kode, tekst: statustekst(u, kode) },
    spor: Object.fromEntries(
      SPOR.map((s) => [
        s,
        {
          etiketter: u.forstaatt ? etiketter(u, s, regler) : [],
          betegnelse: betegnelse(u, s),
          registrerteBrev: u.forstaatt ? brevVedKravet(u, s) : [],
        },
      ])
    ) as Visning['spor'],
    opplysninger,
    journal: u.journal.map((h) => ({
      hendelse: h.id,
      type: h.type,
      tolket: h.art !== 'ukjent' && !ikkeTolket.has(h.id),
    })),
    registrerteBrev: u.registrerteBrev,
    merknader: merknader(u, kode),
  };
}
