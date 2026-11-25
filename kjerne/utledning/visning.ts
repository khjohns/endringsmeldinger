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
import { etterAkseptfristen } from '../regler/akseptfrist.ts';
import {
  datoForDokumentet,
  dokumenterI,
  kalenderdag,
  registrertDato,
  sakstittelen,
} from '../format/leser.ts';
import { ulikeVirkninger, virkninger } from '../frosset/standpunkt.ts';
import { iSporet } from '../frosset/byggeklosser.ts';
import { innholdIForholdet } from '../spor/forhold/format.ts';
import {
  forholdetISakslisten,
  VISNING_I_FORHOLDET,
  type ForholdetISakslisten,
} from '../spor/forhold/visning.ts';
import {
  vederlagetISakslisten,
  VISNING_I_VEDERLAGET,
  type VederlagetISakslisten,
} from '../spor/vederlag/visning.ts';
import {
  fristenISakslisten,
  VISNING_I_FRISTEN,
  type FristenISakslisten,
} from '../spor/frist/visning.ts';
import { prinsipaltAvslaatteDager } from '../spor/frist/utledning.ts';
import {
  datoenDetBleSendt,
  enighetensVirkning,
  paaberopelseFor,
  kilden,
  kraveneErAvgjort,
  sporetErLukket,
  svarIkkeGodtatt,
  venterPaaSvar,
  vurdertVedRegistreringen,
  type Enighet,
  type Kilde,
  type RegistrertBrev,
  type Utledning,
} from './utled.ts';
import {
  SPOR,
  type Dokument,
  type Krav,
  type Kravspor,
  type Part,
  type Sakskode,
  type Spor,
  type Svar,
} from '../typer.ts';

export type Statuskode =
  | 'kan_ikke_utledes'
  | 'avsluttet_avslaatt'
  | 'avsluttet_trukket'
  | 'alle_krav_avgjort';

const STATUSTEKST: Record<Statuskode, string> = {
  kan_ikke_utledes: 'Kan ikke utledes',
  avsluttet_avslaatt: 'Avsluttet: avslått',
  avsluttet_trukket: 'Avsluttet: trukket',
  // OV-U99 punkt 6: sier hva som har skjedd, med predikatet i OV-U3 (svar S1 15.11 i #2017).
  alle_krav_avgjort:
    'Partene er enige om hvert krav som er sendt i løsningen, eller kravet er trukket',
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
      /** HF-U29 punkt 8: det gjeldende svaret senker det byggherren har godkjent, eller `null`. */
      senkning: Senkning | null;
      /** OV-U110: enighetene om svar som ikke er det gjeldende, vist ved hvert av dem. */
      enigheterOmEldreSvar: EnighetOmEldreSvar[];
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
   * #1045). Vurderingen bygger på dem som er sendt herfra
   * og partenes opplysninger, ikke på dokumentasjonen. Ordlyden står i visningen, og den
   * sier alltid at oversikten ikke er fullstendig (arbeidsvalget 26.10 i #1045, punkt 2).
   */
  vurderingsgrunnlag: Record<Kilde, string[]>;
  merknader: string[];
}

/**
 * En kravpost, den særskilte posten eller en frist der byggherren har godkjent mindre enn i svaret
 * som er erstattet, i det første laget (prinsipalt) eller i det siste (subsidiært): hver post og
 * frist for seg (HF-U31), og prinsipalt og subsidiært hver for seg (HF-U32).
 */
export interface Senket {
  gjelder: string;
  /** Laget i sporet, fra 1 (prinsipalt). Lagene regnes uten forholdet (OV-U32). */
  lag: number;
  /** `null` når svaret ikke tar stilling til et beløp i laget (KA-U72, OV-U73). */
  foer: number | null;
  naa: number | null;
}

/**
 * HF-U29 punkt 8: det nye svaret senker beløp eller dager byggherren har godkjent. Visningen viser
 * det tidligere svaret og bestemmelsen med frist, uten å trekke konklusjonen (VS-U2, VS-U10).
 * Bare et nytt svar på samme kravversjon sammenliknes (HF-U30).
 */
export interface Senkning {
  /** Svaret det nye svaret erstatter (HF-U29 punkt 2). */
  tidligereSvar: string;
  senket: Senket[];
  /** Kravpostene der byggherren ikke lenger godtar justeringen av enhetsprisene (HF-U33). */
  justeringIkkeGodtatt: string[];
  /** Punkt 33.7 annet ledd for fristen, punkt 34.3.3 annet ledd for en post med enhetspriser. */
  bestemmelse: '33.7' | '34.3.3' | null;
}

/**
 * OV-U110: en registrert enighet om et svar som ikke er byggherrens gjeldende svar. Løsningen
 * avgjør ikke om den står (MM-U50 punkt 8).
 */
export interface EnighetOmEldreSvar {
  svar: string;
  /** Aksepten, eller svaret ved sammenfall. */
  holder: string;
  kilde: 'aksept' | 'sammenfall';
  /** HF-U23 punkt 7: totalentreprenøren godtok svaret etter akseptfristen. */
  akseptertEtterFristen: boolean;
  /**
   * HF-U29 punkt 8: om byggherrens gjeldende svar stemmer med enigheten (`stemmer`) eller avviker
   * fra den (`avviker`). `null` når det gjeldende svaret gjelder en annen kravversjon, eller sporet
   * venter på svar.
   */
  gjeldendeSvar: 'stemmer' | 'avviker' | null;
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
  'byggherren_har_svart',
  'varslet',
] as const;

export type Betegnelse = (typeof BETEGNELSER)[number];

/** Sporet har et varsel løsningen kjenner (OV-U5), uavhengig av betegnelsen (MM-U30, MM-U37). */
export const harVarsel = (u: Utledning, spor: Spor): boolean =>
  Object.keys(u.spor[spor].varsler).length > 0 || u.spor[spor].kravpostvarsler.length > 0;

const sendt = (u: Utledning, spor: Spor): boolean =>
  u.spor[spor].krav.length > 0 || harVarsel(u, spor);

const FORELIGGER: Record<Betegnelse, (u: Utledning, spor: Spor) => boolean> = {
  // Et trukket forhold gir «Trukket» bare der krav eller varsel er sendt (GR-U25).
  trukket: (u, spor) => u.spor[spor].trukket && sendt(u, spor),
  // Mens forholdet ikke er trukket og saken og sporet ikke er lukket (MM-U31).
  spesifisert_krav_etterspurt: (u, spor) =>
    !u.spor.forhold.trukket && !sporetErLukket(u) && visningI(spor).kravetErEtterspurt(u),
  venter_paa_svar: venterPaaSvar,
  paalegg_frafalt: (u, spor) => visningI(spor).paaleggFrafalt(u),
  enige: (u, spor) => u.spor[spor].enighet !== null,
  // MM-U30, OV-U99 punkt 6: byggherren har et gjeldende svar, også i en lukket sak (MM-U31; svar
  // S2 15.11 i #2017).
  byggherren_har_svart: (u, spor) => u.spor[spor].gjeldendeSvar !== null,
  // MM-U30: totalentreprenøren har varslet og ikke krevd (svar S4 16.11 i #2017).
  varslet: (u, spor) => harVarsel(u, spor) && u.spor[spor].krav.length === 0,
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
  u.forstaatt && u.spor[spor].gjeldendeKrav !== null && !u.spor[spor].trukket && !avsluttetAvTe(u);

/**
 * Et varsel uten krav i sporet står: saken er forstått og ikke avsluttet av TE, og sporet har et
 * varsel og ikke noe krav. Nøkkeltallene i sakslisten teller det for seg (MM-U38). Et spor uten
 * krav kan ikke være trukket: bare et krav trekkes (`trukket` i `utled.ts`).
 */
export const varseletStaar = (u: Utledning, spor: Kravspor): boolean =>
  u.forstaatt && u.spor[spor].gjeldendeKrav === null && harVarsel(u, spor) && !avsluttetAvTe(u);

/**
 * Akseptfristen i byggherrens gjeldende svar i sporet, med brevet, så lenge TE kan godta svaret
 * (`svarIkkeGodtatt`, MM-U24): det er ikke godtatt, kravet er ikke trukket, og saken er ikke
 * lukket (HF-U23 punkt 4, 6 og 9, GR-U8, GR-U27). Ellers `null`.
 */
export function akseptfristen(u: Utledning, spor: Kravspor): { brev: string; dato: string } | null {
  const s = u.spor[spor].gjeldendeSvar;
  return s?.akseptfrist && svarIkkeGodtatt(u, spor)
    ? { brev: s.dokument, dato: s.akseptfrist }
    : null;
}

/**
 * FO-U1: TE kan anse byggherrens avslag som pålegg om forsering når byggherren prinsipalt har
 * avslått dager (`prinsipaltAvslaatteDager`), og TE ikke har godtatt svaret (`svarIkkeGodtatt`).
 */
export const forseringKanVelges = (u: Utledning): boolean =>
  svarIkkeGodtatt(u, 'frist') && prinsipaltAvslaatteDager(u);

/** MM-U30: sporets betegnelse, eller `null` når ingen av dem foreligger. */
export function betegnelse(u: Utledning, spor: Spor): Betegnelse | null {
  if (!u.forstaatt) return null;
  return BETEGNELSER.find((b) => FORELIGGER[b](u, spor)) ?? null;
}

/** Betegnelsene saken har i de fire tilfellene i MM-U22; ellers har den ingen. */
export const SAKSBETEGNELSER = [
  'ikke_forstaatt',
  'avslaget_paa_forholdet_godtatt',
  'paaberopelsen_trukket',
  'kravene_avgjort',
] as const;

export type Saksbetegnelse = (typeof SAKSBETEGNELSER)[number];

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
  return ulikeVirkninger(
    u.svar[g.id].virkninger,
    virkninger(g, paaberopelseFor(g, u), regler, 0, [])
  );
}

function dokumentet(u: Utledning, id: string): Dokument | undefined {
  for (const d of dokumenterI(u.journal)) if (d.id === id) return d;
  return undefined;
}

/**
 * HF-U23 punkt 7 og designdelen: TE har godtatt svaret etter akseptfristen. Etiketten står ved
 * den registrerte enigheten, og løsningen avgjør ikke virkningen (punkt 5 og 8). En aksept
 * lagt til i løsningen er gitt dagen den ble sendt (OV-U98).
 */
function akseptertEtterFristen(u: Utledning, enighet: Enighet | null): boolean {
  if (enighet?.grunnlag.kilde !== 'aksept') return false;
  const frist = u.svar[enighet.grunnlag.svar]?.svar.akseptfrist ?? null;
  const aksept = dokumentet(u, enighet.holder);
  const sendt = aksept ? datoenDetBleSendt(u, { id: enighet.holder, dokument: aksept.id }) : null;
  return sendt !== null && etterAkseptfristen(frist, sendt);
}

/** Standpunktene i svaret uten ID-ene, så to svar kan sammenliknes. */
const innholdet = (s: Svar): string =>
  JSON.stringify(s.standpunkter.map((p) => JSON.stringify({ ...p, id: null })).sort());

/**
 * OV-U110, HF-U29 punkt 8: enighetene om svar som ikke er det gjeldende, og om det gjeldende svaret
 * på samme kravversjon har de samme standpunktene som svaret enigheten gjelder.
 */
function enigheterOmEldreSvar(u: Utledning, spor: Spor): EnighetOmEldreSvar[] {
  const g = u.spor[spor].gjeldendeSvar;
  return u.spor[spor].enigheterOmEldreSvar.map((e) => {
    const eldre = u.svar[e.grunnlag.svar].svar;
    const sammenliknes = g !== null && g.gjelder === eldre.gjelder;
    return {
      svar: e.grunnlag.svar,
      holder: e.holder,
      kilde: e.grunnlag.kilde,
      akseptertEtterFristen: akseptertEtterFristen(u, e),
      gjeldendeSvar: !sammenliknes
        ? null
        : innholdet(eldre) === innholdet(g)
          ? 'stemmer'
          : 'avviker',
    };
  });
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
  if (akseptertEtterFristen(u, s.enighet)) ut.push('aksept_etter_akseptfristen');
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
  const varsel = visningI(spor).varseletikett(u, regler);
  if (varsel) ut.push(varsel);
  return ut;
}

/** Det som er sporets eget i visningen. */
export interface Sporsvisning {
  /** Etiketten for varselet i sporet, eller `null`. */
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
  /** Byggherren har etterspurt et spesifisert krav i sporet som ikke er besvart. */
  kravetErEtterspurt(u: Utledning): boolean;
  /** Det sporet gir senkningen etter HF-U29 punkt 8. Forholdet har ingen. */
  senkning?: Sporssenkning;
}

/** Det som er sporets eget i senkningen etter HF-U29 punkt 8. */
export interface Sporssenkning {
  /**
   * Det byggherren godkjente for hver post eller frist i svaret, per lag fra det første. `null` der
   * svaret ikke tar stilling til et beløp i laget (KA-U72).
   */
  godkjentILagene(svar: Svar): ReadonlyMap<string, readonly (number | null)[]>;
  /**
   * Kravpostene der `tidligere` godtar justeringen etter § 34.3.2 prinsipalt, og `ny` ikke gjør
   * det, eller bare subsidiært (HF-U32, HF-U33).
   */
  justeringIkkeGodtatt?(ny: Svar, tidligere: Svar): string[];
  /** Bestemmelsen visningen viser når postene eller fristene `gjelder` er senket i svaret på `krav`. */
  bestemmelse(gjelder: readonly string[], krav: Krav): Senkning['bestemmelse'];
}

/**
 * HF-U29 punkt 8 for det gjeldende svaret i sporet, med HF-U30–HF-U33:
 * hver post og frist sammenliknes med svaret det nye svaret erstatter på samme kravversjon, lag
 * for lag når svarene har like mange lag, og ellers det første og det siste laget i hvert. Et lag
 * uten et fast beløp regnes som 0 i sammenlikningen. `null` når ingenting er senket.
 */
export function senkningen(u: Utledning, spor: Spor): Senkning | null {
  const sporet = visningI(spor).senkning;
  const ny = u.spor[spor].gjeldendeSvar;
  if (!sporet || !ny?.erstatter) return null;
  const tidligere = u.spor[spor].svar.find((x) => x.id === ny.erstatter);
  const krav = u.spor[spor].krav.find((k) => k.id === ny.gjelder);
  if (!tidligere || !krav || tidligere.gjelder !== ny.gjelder) return null;
  const [foer, naa] = [sporet.godkjentILagene(tidligere), sporet.godkjentILagene(ny)];
  const senket: Senket[] = [];
  for (const [gjelder, lagene] of foer) {
    const nye = naa.get(gjelder) ?? [];
    const sammenliknet: [number, number | null, number | null][] =
      lagene.length === nye.length
        ? lagene.map((a, i) => [i + 1, a, nye[i] ?? null])
        : [[1, lagene[0] ?? null, nye[0] ?? null]];
    // Med ulikt antall lag sammenliknes det siste laget i hvert, med laget i det nye svaret.
    if (lagene.length !== nye.length && Math.max(lagene.length, nye.length) > 1)
      sammenliknet.push([Math.max(nye.length, 1), lagene.at(-1) ?? null, nye.at(-1) ?? null]);
    for (const [lag, foer, naa] of sammenliknet)
      if ((naa ?? 0) < (foer ?? 0)) senket.push({ gjelder, lag, foer, naa });
  }
  const justeringIkkeGodtatt = sporet.justeringIkkeGodtatt?.(ny, tidligere) ?? [];
  if (!senket.length && !justeringIkkeGodtatt.length) return null;
  return {
    tidligereSvar: tidligere.id,
    senket,
    justeringIkkeGodtatt,
    bestemmelse: sporet.bestemmelse(
      [...new Set([...senket.map((s) => s.gjelder), ...justeringIkkeGodtatt])],
      krav
    ),
  };
}

/** Visningen i hvert spor. */
const VISNING: Record<Spor, Sporsvisning> = {
  forhold: VISNING_I_FORHOLDET,
  vederlag: VISNING_I_VEDERLAGET,
  frist: VISNING_I_FRISTEN,
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
 * statusen i stedet. OV-U104: et brev lagt til er sammenliknet med et brev sendt samme dag.
 * OV-U109, OV-U111: totalentreprenøren hadde sendt et krav om dager før forespørselen etter
 * § 33.6.2.
 */
function merknader(u: Utledning, kode: Statuskode | null): string[] {
  // MM-U2: mens saken stopper, må et varsel med frist sendes utenfor appen og registreres senere.
  const ut = u.forstaatt
    ? u.utenVirkning.length
      ? ['registrert_brev_uten_virkning']
      : []
    : ['varsel_med_frist_utenfor_appen'];
  if (kode !== 'alle_krav_avgjort' && harIkkeVurdertBrev(u)) ut.push('brev_utenfor_appen');
  if (u.sendtSammeDag.length) ut.push('sendt_samme_dag');
  if (u.forstaatt && u.spor.frist.foresporsler.some((f) => f.kravFoer !== null))
    ut.push('krav_foer_foresporselen');
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
          senkning: u.forstaatt ? senkningen(u, s) : null,
          enigheterOmEldreSvar: u.forstaatt ? enigheterOmEldreSvar(u, s) : [],
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

// ---------- Linja i sakslisten (#1022) ----------

/** Enighetens virkning slik sakslisten gir den videre (`enighetensVirkning`). */
export type Enighetsvirkning = NonNullable<ReturnType<typeof enighetensVirkning>>;

export interface Foreligger {
  /** Sporets betegnelse fra den faste lista (`betegnelse`, MM-U30). */
  betegnelse: Betegnelse | null;
  /** Kravet venter på byggherrens svar (`venterPaaSvar`, MM-U29 (opphevet av MM-U40)). */
  venter_paa_svar: boolean;
  /** Byggherrens gjeldende svar står, og TE kan fortsatt godta det (`svarIkkeGodtatt`, MM-U29 (opphevet av MM-U40)). */
  svar_ikke_godtatt: boolean;
}

/**
 * Kravet står: saken er forstått og ikke avsluttet, og kravet er ikke trukket (svar 2 fra
 * oppdragsgiver 20.10 i #1029). Nøkkeltallene i Varden leser flagget (#1068, #1861).
 */
interface Staaende {
  kravet_staar: boolean;
  /** Et varsel uten krav står (`varseletStaar`, MM-U38). */
  varselet_staar: boolean;
  /**
   * Sporet har et varsel løsningen kjenner (OV-U5), uavhengig av betegnelsen, som kan være
   * en annen når et varsel foreligger (MM-U30). Lista viser «Varslet» av flagget (MM-U37).
   */
  har_varsel: boolean;
}

export interface Forholdslinje extends Foreligger, ForholdetISakslisten {}
export interface Vederlagslinje extends Foreligger, Staaende, VederlagetISakslisten {}
export interface Fristlinje extends Foreligger, Staaende, FristenISakslisten {}

/**
 * Én linje i sakslisten fra `GET /api/projects/<p>/saker`. Feltnavnene er kontrakter (B-17);
 * betydningen står i domenetabellen, raden «Linja i sakslisten». Saken har ingen samlet status,
 * bare en betegnelse i de fire tilfellene i MM-U22. Serveren fyller feltene i `LagretISakslinjen`
 * fra lagringen og resten med `sakslinjen`.
 */
export interface Sakslinje {
  sak_id: string;
  sakstype: string;
  sakstittel: string | null;
  opprettet: string;
  /**
   * Sakens kode, `koe` eller `eo`, og løpenummeret for koden i prosjektet (LV-U44, LV-U46).
   * Begge er `null` til sakens første brev fra løsningen er sendt (LV-U47). Visningen setter
   * sammen «KOE-17».
   */
  kode: Sakskode['kode'] | null;
  loepenummer: number | null;
  /** Tidsstempelet på den siste hendelsen i journalen, ikke brevets dato. */
  siste_hendelse: string;
  /**
   * Sakens siste brev, med avsenderen og brevets dato (ÅÅÅÅ-MM-DD), se `brevetsDato`. `null`
   * når saken ikke har noe brev, og når kjernen ikke forstår saken (MM-U2): da kan ikke
   * lista vite om det ukjente er et brev.
   */
  siste_brev: { avsender: Part; dato: string } | null;
  hovedkategori: string | null;
  /** Forholdet TE påberoper, med kjernens kode, så lista kan vise henvisningen (arbeidsvalg 03.11 i #1450). */
  underkategori: string | null;
  forstaatt: boolean;
  saksbetegnelse: Saksbetegnelse | null;
  /** TE har avsluttet saken (`avsluttetAvTe`, MM-U38). */
  avsluttet_av_te: boolean;
  /** Saken har registrert korrespondanse, som tillegget til «kravene avgjort» i OV-U10. */
  brev_utenfor_appen: boolean;
  forhold: Forholdslinje;
  vederlag: Vederlagslinje;
  frist: Fristlinje;
}

/** Feltene i linja som serveren leser fra lagringen, ikke av utledningen. */
export type LagretISakslinjen =
  | 'sak_id'
  | 'sakstype'
  | 'opprettet'
  | 'kode'
  | 'loepenummer'
  | 'siste_hendelse';

const INGENTING: Foreligger = {
  betegnelse: null,
  venter_paa_svar: false,
  svar_ikke_godtatt: false,
};

function foreligger(u: Utledning, spor: Spor): Foreligger {
  return {
    betegnelse: betegnelse(u, spor),
    venter_paa_svar: venterPaaSvar(u, spor),
    svar_ikke_godtatt: svarIkkeGodtatt(u, spor),
  };
}

const staaende = (u: Utledning, spor: Kravspor): Staaende => ({
  kravet_staar: kravetStaar(u, spor),
  varselet_staar: varseletStaar(u, spor),
  har_varsel: harVarsel(u, spor),
});

/**
 * Brevets dato: for et registrert brev datoen parten oppga at det ble sendt, ellers mottatt
 * (OV-U80), og ellers dagen det ble registrert i løsningen (VS-U8). Oppdragsgiver 03.11 i
 * #1450. En oppgitt dato som ikke kan leses, gir registreringsdagen.
 */
function brevetsDato(d: Dokument): string {
  const oppgitt =
    datoForDokumentet(d.opplysninger, 'sendt') ?? datoForDokumentet(d.opplysninger, 'mottatt');
  const dag = oppgitt ? kalenderdag(oppgitt.dato) : null;
  return dag ?? registrertDato(d);
}

/**
 * Brevet i saken med den seneste datoen, og ved samme dag det siste i journalen. En retting
 * registrerer brevet på nytt, så det er den siste registreringen i kjeden som gjelder, ikke den
 * den retter (OV-U17). En retting som sier at brevet ikke hører til saken, har ingen
 * registrering etter seg, så da er brevet ikke med (OV-U18). En sak med en ugyldig retting er
 * ikke forstått og kommer ikke hit.
 */
function sisteBrev(u: Utledning): Sakslinje['siste_brev'] {
  const dokumenter = u.journal.flatMap((h) => (h.art === 'dokument' ? [h.dokument] : []));
  const rettet = new Set(dokumenter.map((d) => d.retter).filter((id) => id !== null));
  const brev = dokumenter.filter((d) => !rettet.has(d.id) && !d.ikkeISaken);
  let siste: Sakslinje['siste_brev'] = null;
  for (const d of brev) {
    const dato = brevetsDato(d);
    if (!siste || dato >= siste.dato) siste = { avsender: d.avsender, dato };
  }
  return siste;
}

/**
 * Linja for saken uten feltene fra lagringen. En sak kjernen ikke forstår (MM-U2), har bare
 * betegnelsen og ingen krav, svar eller enighet, som visningen av saken.
 */
export function sakslinjen(u: Utledning): Omit<Sakslinje, LagretISakslinjen> {
  const felles = {
    sakstittel: sakstittelen(u.journal),
    forstaatt: u.forstaatt,
    saksbetegnelse: saksbetegnelse(u),
    avsluttet_av_te: avsluttetAvTe(u),
    brev_utenfor_appen: harIkkeVurdertBrev(u),
  };
  if (!u.forstaatt) {
    const ingenKrav = {
      kravet_staar: false,
      varselet_staar: false,
      har_varsel: false,
      krav: null,
      svar: null,
      enighet: null,
    };
    return {
      ...felles,
      siste_brev: null,
      hovedkategori: null,
      underkategori: null,
      forhold: { ...INGENTING, svar: null },
      vederlag: { ...INGENTING, ...ingenKrav },
      frist: { ...INGENTING, ...ingenKrav },
    };
  }
  const paaberopt = innholdIForholdet(u.spor.forhold.gjeldendeKrav);
  return {
    ...felles,
    siste_brev: sisteBrev(u),
    hovedkategori: paaberopt.hovedkategori,
    underkategori: typeof paaberopt.underkategori === 'string' ? paaberopt.underkategori : null,
    forhold: { ...foreligger(u, 'forhold'), ...forholdetISakslisten(u) },
    vederlag: {
      ...foreligger(u, 'vederlag'),
      ...staaende(u, 'vederlag'),
      ...vederlagetISakslisten(u),
    },
    frist: { ...foreligger(u, 'frist'), ...staaende(u, 'frist'), ...fristenISakslisten(u) },
  };
}
