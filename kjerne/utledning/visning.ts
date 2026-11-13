/**
 * `visning(u, regler)`: etiketter, betegnelsen per spor (MM-U30), sakens status i de fire
 * tilfellene i MM-U22 og merknader, avledet av utledningen. Ingen regel leser visningen;
 * arkitekturtesten håndhever det (INV-MM-9). En ny etikett, som `paalegg_frafalt`, endrer derfor ikke reglene.
 *
 * Visningen er det eneste stedet dagens regler vurderer et sendt brev på nytt.
 * Gir de et standpunkt en annen virkning enn brevet, vises det som en merknad
 * som oppfordrer byggherren til å revidere svaret (MM-U9), eller som at regelen
 * er endret etter enigheten (MM-U3 (opphevet av MM-U50)).
 */

import type { Regelsett } from '../regler/regelsett.ts';
import { ulikeVirkninger, virkninger } from '../frosset/standpunkt.ts';
import { iSporet } from '../frosset/byggeklosser.ts';
import { VISNING_I_FORHOLDET } from '../spor/forhold/visning.ts';
import { VISNING_I_VEDERLAGET } from '../spor/vederlag/visning.ts';
import {
  enighetensVirkning,
  paaberopelseFor,
  kilden,
  kraveneErAvgjort,
  sporetErLukket,
  svarIkkeGodtatt,
  venterPaaSvar,
  vurdertVedRegistreringen,
  type Kilde,
  type RegistrertBrev,
  type Utledning,
} from './utled.ts';
import { SPOR, type Kravspor, type Spor } from '../typer.ts';

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
      /** OV-U62: begge partenes brev registrert som dokumentasjon, vist ved kravet. */
      registrerteBrev: BrevVedKravet[];
    }
  >;
  /** OV-U4, OV-U16: brevene registrert som dokumentasjon, også når saken ikke er forstått. */
  registrerteBrev: RegistrertBrev[];
  /** Etikettene for hver opplysning, etter ID. */
  opplysninger: Record<string, string[]>;
  /**
   * OV-U44: `kilde` er `null` for en hendelse kjernen ikke har tolket (MM-U2). Hendelsen
   * som oppretter saken, er sendt herfra (svar 1A 30.10 i #1045). `rettet` er
   * registreringen rettet etter OV-U17 eller OV-U18 (arbeidsvalget 30.10 i #1045, svar 2A).
   */
  journal: {
    hendelse: string;
    type: string;
    tolket: boolean;
    kilde: Kilde | null;
    rettet: boolean;
  }[];
  /**
   * OV-U44: hva vurderingen bygger på, som hendelsene med hver kilde som ikke er rettet.
   * Rettingen etter OV-U18 står ikke der, som en rettet registrering (svar 2B 30.10 i
   * #1045). Et brev sendt herfra med partens opplysning om et varsel (HF-U1) står også
   * under partenes opplysninger (svar 3A), men ikke mens saken ikke er forstått (MM-U2,
   * OV-U21). Vurderingen bygger på dem som er sendt herfra
   * og partenes opplysninger, ikke på dokumentasjonen. Ordlyden står i visningen, og den
   * sier alltid at oversikten ikke er fullstendig (arbeidsvalget 26.10 i #1045, punkt 2).
   */
  vurderingsgrunnlag: Record<Kilde, string[]>;
  merknader: string[];
}

/** OV-U62: et registrert brev ved kravet, med avsenderen og avsenderens beskrivelse. */
export type BrevVedKravet = Pick<RegistrertBrev, 'dokument' | 'avsender' | 'beskrivelse'>;

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

/** Sporet har et varsel løsningen kjenner (OV-U5), uavhengig av betegnelsen (MM-U30, MM-U37). */
export const harVarsel = (u: Utledning, spor: Spor): boolean =>
  Object.keys(u.spor[spor].varsler).length > 0 || u.spor[spor].kravpostvarsler.length > 0;

const sendt = (u: Utledning, spor: Spor): boolean =>
  u.spor[spor].krav.length > 0 || u.spor[spor].ingenKrav || harVarsel(u, spor);

const FORELIGGER: Record<Betegnelse, (u: Utledning, spor: Spor) => boolean> = {
  // Et trukket forhold gir «Trukket» bare der krav, varsel eller «ingen krav» er sendt (GR-U25).
  trukket: (u, spor) => u.spor[spor].trukket && sendt(u, spor),
  // § 33.6.2: til forespørselen er besvart, og bare mens saken og sporet ikke er lukket (MM-U31).
  spesifisert_krav_etterspurt: (u, spor) =>
    spor === 'frist' &&
    !u.spor.forhold.trukket &&
    !sporetErLukket(u) &&
    u.spor.frist.foresporsler.some((f) => f.svar === null),
  venter_paa_svar: venterPaaSvar,
  paalegg_frafalt: (u, spor) => visningI(spor).paaleggFrafalt(u),
  enige: (u, spor) => u.spor[spor].enighet !== null,
  svar_ikke_godtatt: svarIkkeGodtatt,
  // MM-U30: TE har godtatt avslaget på grunnlaget (GR-U27), og sporet har verken enighet eller
  // trekk.
  krav_sendt: (u, spor) =>
    sporetErLukket(u) &&
    u.spor[spor].gjeldendeKrav !== null &&
    u.spor[spor].enighet === null &&
    !u.spor[spor].trukket,
  ingen_krav: (u, spor) => u.spor[spor].ingenKrav,
  varslet: harVarsel,
};

/**
 * TE har avsluttet saken: avslaget på forholdet er godtatt (GR-U27), eller påberopelsen er
 * trukket (GR-U5). Leses av utsagnene, ikke av betegnelsen (MM-U22).
 */
export const avsluttetAvTe = (u: Utledning): boolean =>
  u.forstaatt && (sporetErLukket(u) || u.spor.forhold.trukket);

/**
 * Kravet i sporet står: saken er forstått og ikke avsluttet av TE, og kravet er ikke trukket
 * (svar 2 fra oppdragsgiver 20.10 i #1029). Nøkkeltallene i sakslisten teller bare et krav som
 * står (#1068).
 */
export const kravetStaar = (u: Utledning, spor: Kravspor): boolean =>
  u.spor[spor].gjeldendeKrav !== null && !u.spor[spor].trukket && !avsluttetAvTe(u);

/** MM-U30: sporets betegnelse, eller `null` når ingenting er sendt i sporet. */
export function betegnelse(u: Utledning, spor: Spor): Betegnelse | null {
  if (!u.forstaatt) return null;
  return BETEGNELSER.find((b) => FORELIGGER[b](u, spor)) ?? null;
}

/** Betegnelsen saken har i de fire tilfellene i MM-U22; ellers har den ingen. */
export type Saksbetegnelse =
  | 'ikke_forstaatt'
  | 'avslaget_paa_forholdet_godtatt'
  | 'paaberopelsen_trukket'
  | 'kravene_avgjort';

/** Betegnelsen i MM-U22, som sakslisten og statusen i visningen leser (#1050). */
export function saksbetegnelse(u: Utledning): Saksbetegnelse | null {
  if (!u.forstaatt) return 'ikke_forstaatt';
  if (u.forholdAvvist) return 'avslaget_paa_forholdet_godtatt';
  if (u.spor.forhold.trukket) return 'paaberopelsen_trukket';
  if (kraveneErAvgjort(u)) return 'kravene_avgjort';
  return null;
}

const STATUS_FOR: Record<Saksbetegnelse, Statuskode> = {
  ikke_forstaatt: 'kan_ikke_utledes',
  avslaget_paa_forholdet_godtatt: 'avsluttet_avslaatt',
  paaberopelsen_trukket: 'avsluttet_trukket',
  kravene_avgjort: 'alle_krav_avgjort',
};

/** Brevet vurdert med dagens regler gir et standpunkt en annen virkning (MM-U9). */
function regelenErEndret(u: Utledning, spor: Spor, regler: Regelsett): boolean {
  const g = u.spor[spor].gjeldendeSvar;
  if (!g) return false;
  return ulikeVirkninger(u.svar[g.id].virkninger, virkninger(g, paaberopelseFor(g, u), regler));
}

function etiketter(u: Utledning, spor: Spor, regler: Regelsett): string[] {
  const s = u.spor[spor];
  const ut: string[] = [];
  if (FORELIGGER.trukket(u, spor)) ut.push('trukket');
  if (venterPaaSvar(u, spor)) ut.push('venter_paa_svar');
  const virkning = enighetensVirkning(u, spor);
  const svaretsEtiketter = visningI(spor).svaretsEtiketter;
  if (svaretsEtiketter) ut.push(...svaretsEtiketter(u, virkning));
  else {
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
  const iSporet = [
    s.gjeldendeKrav?.id,
    s.gjeldendeSvar?.id,
    ...Object.values(s.varsler).map((v) => v.id),
    ...s.kravpostvarsler.map((v) => v.id),
  ];
  for (const i of u.innsigelser)
    if (iSporet.includes(i.gjelder) && !ut.includes(`innsigelse_fra_${i.part}`))
      ut.push(`innsigelse_fra_${i.part}`);
  const passivitet = visningI(spor).passivitetsetikett(u);
  if (passivitet) ut.push(passivitet);
  if (s.ingenKrav) ut.push('ingen_krav');
  else {
    const varsel = visningI(spor).varseletikett(u, regler);
    if (varsel) ut.push(varsel);
  }
  return ut;
}

/** Det som er sporets eget i visningen. */
export interface Sporsvisning {
  /** Etiketten for varselet i sporet når sporet ikke har «ingen krav», eller `null`. */
  varseletikett(u: Utledning, regler: Regelsett): string | null;
  /** Byggherren har frafalt pålegget i sporet (betegnelsen `paalegg_frafalt`). */
  paaleggFrafalt(u: Utledning): boolean;
  /**
   * Etikettene for svaret og enigheten i sporet med enighetens virkning
   * (`enighetensVirkning`). Uten dem får sporet etikettene for et spor med krav.
   */
  svaretsEtiketter?(u: Utledning, virkning: ReturnType<typeof enighetensVirkning>): string[];
  /** Etiketten for en påberopt passivitet i sporet, eller `null`. */
  passivitetsetikett(u: Utledning): string | null;
}

/** Visningen i hvert spor. Fristen står her til den flyttes til sporet (#1745). */
const VISNING: Record<Spor, Sporsvisning> = {
  forhold: VISNING_I_FORHOLDET,
  vederlag: VISNING_I_VEDERLAGET,
  frist: {
    paaleggFrafalt: () => false,
    passivitetsetikett: () => null,
    // Oppdragsgiver 22.10 (#1126): bare før kravet, som er varselet når sporet ikke har noe.
    varseletikett: (u) =>
      !u.spor.frist.varsler['33.4'] && u.spor.frist.krav.length === 0
        ? 'varsel_ikke_registrert'
        : null,
  },
};

/** Visningen i sporet (`iSporet`). */
const visningI = (spor: Spor): Sporsvisning => iSporet(VISNING, spor);

/** OV-U10: et registrert brev kan ha krav appen ikke kjenner. */
export const BREV_UTENFOR_APPEN =
  'Saken har brev sendt utenfor appen. Appen vurderer ikke innholdet.';

/**
 * OV-U10, OV-U19, OV-U21: saken har et registrert brev appen ikke vurderer innholdet i, etter
 * utledningen. Merknaden, statusteksten og sakslisten leser det.
 */
export const harIkkeVurdertBrev = (u: Utledning): boolean => u.ikkeVurderteBrev.length > 0;

/**
 * OV-U62, OV-U4: når kravet venter på svar, begge partenes registrerte brev for sporet eller
 * hele saken som ikke er rettet (OV-U18), uansett når de ble sendt.
 */
function brevVedKravet(u: Utledning, spor: Spor): BrevVedKravet[] {
  if (!venterPaaSvar(u, spor)) return [];
  return u.registrerteBrev
    .filter((b) => b.rettetAv === null && (b.spor.length === 0 || b.spor.includes(spor)))
    .map(({ dokument, avsender, beskrivelse }) => ({ dokument, avsender, beskrivelse }));
}

/** OV-U44: kilden til hver journalpost, og om registreringen er rettet. */
function kilder(u: Utledning, ikkeTolket: Set<string>) {
  const rettet = new Set(u.registrerteBrev.filter((b) => b.rettetAv).map((b) => b.dokument));
  return u.journal.map((h) => {
    const tolket = h.art !== 'ukjent' && !ikkeTolket.has(h.id);
    return {
      hendelse: h.id,
      type: h.type,
      tolket,
      kilde: !tolket
        ? null
        : h.art === 'dokument'
          ? kilden(h.dokument, u.forstaatt)
          : ('sendt_herfra' as const),
      rettet: rettet.has(h.id),
    };
  });
}

/**
 * Merknadene for saken. OV-U19: så lenge et registrert brev appen ikke vurderer, står og ikke
 * er rettet bort, har saken merknaden etter OV-U10; når kravene er avgjort, står setningen i
 * statusen i stedet.
 */
function merknader(u: Utledning, kode: Statuskode | null): string[] {
  // MM-U2: mens saken stopper, må et varsel med frist sendes utenfor appen og registreres senere.
  const ut = u.forstaatt
    ? u.utenVirkning.length
      ? ['registrert_brev_uten_virkning']
      : []
    : ['varsel_med_frist_utenfor_appen'];
  if (kode !== 'alle_krav_avgjort' && harIkkeVurdertBrev(u)) ut.push('brev_utenfor_appen');
  return ut;
}

function statustekst(u: Utledning, kode: Statuskode): string {
  return kode === 'alle_krav_avgjort' && harIkkeVurdertBrev(u)
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
  const journal = kilder(u, ikkeTolket);
  const vurderingsgrunnlag: Visning['vurderingsgrunnlag'] = {
    sendt_herfra: [],
    partens_opplysning: [],
    dokumentasjon: [],
  };
  const dokumenter = new Map(
    u.journal.flatMap((h) => (h.art === 'dokument' ? [[h.id, h.dokument] as const] : []))
  );
  for (const j of journal) {
    const d = dokumenter.get(j.hendelse);
    if (!j.kilde || j.rettet || d?.ikkeISaken) continue;
    vurderingsgrunnlag[j.kilde].push(j.hendelse);
    if (
      u.forstaatt &&
      j.kilde === 'sendt_herfra' &&
      d?.opplysninger.some((o) => 'gjelder' in o && o.gjelder !== undefined)
    )
      vurderingsgrunnlag.partens_opplysning.push(j.hendelse);
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
    journal,
    vurderingsgrunnlag,
    registrerteBrev: u.registrerteBrev,
    merknader: merknader(u, kode),
  };
}
