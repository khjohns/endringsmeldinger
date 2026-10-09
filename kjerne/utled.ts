/**
 * `utled(journal, regler)`: predikatene kjernen regner av journalen (2.6 i
 * modellforslaget). Kommandoene, handlingene og visningen leser denne
 * utledningen. Den har ingen status; statusen er en etikett i visningen.
 *
 * Det er én beregning per svar, som alle leser:
 * - brevet slik det ble sendt: standpunktene i beslutningsgrunnlaget (MM-U9);
 * - en eventuell enighet: enighetsgrunnlaget, frosset der den oppsto (MM-U3);
 * - predikatene av relasjonene: hva svaret `gjelder`, hva det `erstatter`, om
 *   en rettidighetsvurdering gjelder det registrerte varselet (MM-U8), og om
 *   vilkåret for enigheten er oppfylt (GR-U7).
 *
 * Regelsettet brukes ikke til å vurdere et sendt brev på nytt. Relasjonene
 * bestemmer, ikke rekkefølgen: gjeldende svar er svaret på gjeldende krav som
 * ikke er erstattet. Løses en relasjon ikke entydig, eller er en hendelse
 * ukjent, er saken ikke forstått, og ingenting utledes (MM-U2, 2.7 regel 1).
 */

import { utledetVarsel } from './leser.ts';
import type { Regelsett } from './regler/regelsett.ts';
import { enighetsgrunnlag, utfall } from './standpunkt.ts';
import {
  KRAVSPOR,
  SPOR,
  type Domenehendelse,
  type Enighetsgrunnlag,
  type Krav,
  type Kravspor,
  type Opplysning,
  type Part,
  type Spor,
  type Standpunkt,
  type Svar,
  type Utsagn,
} from './typer.ts';

/** Hvorfor hele svaret på vederlag eller frist er subsidiært til grunnlagssvaret. */
export type Subsidiaergrunn = 'prekludert' | 'avslatt';

export interface Svarberegning {
  svar: Svar;
  /** Standpunktene slik brevet uttrykte dem (MM-U9). */
  standpunkter: Standpunkt[];
  /**
   * Utsagnene om rettidighet som gjelder et annet varsel enn det som er
   * registrert nå. Preklusjonen i dem er uavklart til byggherren har tatt
   * stilling til det registrerte varselet (MM-U1, MM-U8).
   */
  uavklart: string[];
}

export interface Enighet {
  grunnlag: Enighetsgrunnlag;
  /** Hendelsen som holder enighetsgrunnlaget: aksepten, eller svaret ved sammenfall. */
  holder: string;
}

export interface Sporutledning {
  krav: Krav[];
  gjeldendeKrav: Krav | null;
  svar: Svar[];
  gjeldendeSvar: Svar | null;
  /** Enigheten om gjeldende svar (2.5). Om den har virkning, avgjør `enighetHarVirkning`. */
  enighet: Enighet | null;
  /** TE har trukket kravet, eller grunnlaget som bærer det (GR-U5, SD-02). */
  trukket: boolean;
  /** Det registrerte varselet etter § 33.4; bare fristen. */
  varsel: Extract<Utsagn, { art: 'varsel' }> | null;
  /** Hvorfor hele svaret i sporet er subsidiært til grunnlaget; tomt for grunnlaget. */
  subsidiaer: Subsidiaergrunn[];
}

export interface Bestridelse {
  part: Part;
  hva: 'sendt' | 'mottatt';
  utsagn: string;
}

export interface Utledning {
  versjon: number;
  regelversjon: number;
  forstatt: boolean;
  begrensninger: { hendelse: string; grunn: string }[];
  journal: Domenehendelse[];
  svar: Record<string, Svarberegning>;
  opplysninger: { opplysning: Opplysning; bestridelser: Bestridelse[] }[];
  spor: Record<Spor, Sporutledning>;
  /**
   * GR-U7: byggherren har godkjent grunnlaget uten virksom preklusjon etter
   * § 32.2, eller frafalt pålegget, etter brevet eller enigheten om det.
   */
  grunnlagAvklart: boolean;
  /** SK-01, #213: partene er enige om at grunnlaget er avvist. */
  grunnlagAvvist: boolean;
  /** GR-U3, GR-U9: byggherren har frafalt pålegget (§ 32.3 c). Er ikke en enighet. */
  frafalt: boolean;
}

const tomtSpor = (): Sporutledning => ({
  krav: [],
  gjeldendeKrav: null,
  svar: [],
  gjeldendeSvar: null,
  enighet: null,
  trukket: false,
  varsel: null,
  subsidiaer: [],
});

function tom(
  journal: Domenehendelse[],
  regler: Regelsett,
  begrensninger: Utledning['begrensninger']
): Utledning {
  return {
    versjon: journal.at(-1)?.versjon ?? 0,
    regelversjon: regler.versjon,
    forstatt: false,
    begrensninger,
    journal,
    svar: {},
    opplysninger: [],
    spor: { grunnlag: tomtSpor(), vederlag: tomtSpor(), frist: tomtSpor() },
    grunnlagAvklart: false,
    grunnlagAvvist: false,
    frafalt: false,
  };
}

/** Svarene på kravet som ikke er erstattet. Flere enn ett er en tvetydig relasjon. */
function ikkeErstattet(svar: Svar[], kravId: string): Svar[] {
  const paaKravet = svar.filter((s) => s.gjelder === kravId);
  const erstattet = new Set(paaKravet.map((s) => s.erstatter).filter((e) => e !== null));
  return paaKravet.filter((s) => !erstattet.has(s.id));
}

/**
 * Hvorfor svarene på vederlag og frist er subsidiære til grunnlagssvaret, etter
 * standpunktene i brevet om grunnlaget (vedtaket 05.10, MM-U9).
 */
function grunnerFraGrunnlaget({ svar, standpunkter }: Svarberegning): Subsidiaergrunn[] {
  const ut: Subsidiaergrunn[] = [];
  if (standpunkter.some((p) => p.art === 'rettidighet' && p.virkning === 'hovedgrunn'))
    ut.push('prekludert');
  const ansvar = svar.utsagn.find((u) => u.art === 'ansvar');
  if (ansvar?.art === 'ansvar' && ansvar.resultat === 'avslatt') ut.push('avslatt');
  return ut;
}

export function utled(journal: Domenehendelse[], regler: Regelsett): Utledning {
  const begrensninger: Utledning['begrensninger'] = [];
  const spor = { grunnlag: tomtSpor(), vederlag: tomtSpor(), frist: tomtSpor() };
  const hendelseFor = new Map<string, string>();
  const aksepter: Extract<Utsagn, { art: 'aksept' }>[] = [];
  const trekk: Extract<Utsagn, { art: 'trekk' }>[] = [];
  const bestridelser: Extract<Utsagn, { art: 'bestridelse' }>[] = [];
  const opplysninger: Opplysning[] = [];
  // GR-U1: et svar på vederlag eller frist som var subsidiært da grunnlagssvaret
  // falt, forblir det til sporet eller grunnlaget besvares igjen. Her står
  // grunnlagssvaret som falt.
  const tilNyttSvar: Partial<Record<Kravspor, Svar>> = {};

  for (const h of journal) {
    if (h.art === 'ukjent') {
      begrensninger.push({ hendelse: h.id, grunn: h.grunn });
      continue;
    }
    if (h.art === 'sak') continue;
    const d = h.dokument;
    for (const k of d.krav) {
      const forrige = spor.grunnlag.krav.at(-1);
      if (k.spor === 'grunnlag' && forrige) {
        const gjeldende = ikkeErstattet(spor.grunnlag.svar, forrige.id);
        if (gjeldende.length === 1)
          for (const n of KRAVSPOR) if (spor[n].svar.length) tilNyttSvar[n] = gjeldende[0];
      }
      spor[k.spor].krav.push(k);
      hendelseFor.set(k.id, h.id);
    }
    for (const s of d.svar) {
      spor[s.spor].svar.push(s);
      hendelseFor.set(s.id, h.id);
      if (s.spor === 'grunnlag') for (const k of KRAVSPOR) delete tilNyttSvar[k];
      else delete tilNyttSvar[s.spor];
    }
    for (const u of d.utsagn) {
      hendelseFor.set(u.id, h.id);
      if (u.art === 'aksept') aksepter.push(u);
      else if (u.art === 'trekk') trekk.push(u);
      else if (u.art === 'bestridelse') bestridelser.push(u);
      else if (u.art === 'varsel' && u.gjelder === 'frist') spor.frist.varsel ??= u;
    }
    opplysninger.push(...d.opplysninger);
  }

  // Relasjonene må løses entydig i saken.
  const alleSvar = new Map(SPOR.flatMap((n) => spor[n].svar).map((s) => [s.id, s]));
  const alleKrav = new Map(SPOR.flatMap((n) => spor[n].krav).map((k) => [k.id, k]));
  const ugyldig = (id: string, grunn: string) =>
    begrensninger.push({ hendelse: hendelseFor.get(id) ?? id, grunn });
  for (const s of alleSvar.values()) {
    if (alleKrav.get(s.gjelder)?.spor !== s.spor)
      ugyldig(s.id, 'svaret viser til et krav som ikke finnes i sporet');
    if (s.erstatter !== null) {
      const forrige = alleSvar.get(s.erstatter);
      if (!forrige || forrige.gjelder !== s.gjelder)
        ugyldig(s.id, 'revisjonen erstatter et svar som ikke gjelder samme krav');
    }
  }
  // Svarene på én kravversjon er én kjede: ett første svar, og hver revisjon
  // erstatter det forrige. To første svar, en forgrening, en selvreferanse eller
  // en sirkel gjør det tvetydig hvilket svar som gjelder.
  for (const n of SPOR) {
    for (const k of spor[n].krav) {
      const paaKravet = spor[n].svar.filter((s) => s.gjelder === k.id);
      if (!paaKravet.length) continue;
      const forste = paaKravet.filter((s) => s.erstatter === null);
      const kjede = new Set<string>();
      let neste: Svar[] = forste.length === 1 ? forste : [];
      while (neste.length === 1 && !kjede.has(neste[0].id)) {
        kjede.add(neste[0].id);
        const forrige = neste[0].id;
        neste = paaKravet.filter((s) => s.erstatter === forrige);
      }
      if (neste.length > 0 || kjede.size !== paaKravet.length)
        ugyldig(
          paaKravet.at(-1)!.id,
          'svarene på kravversjonen er ikke én kjede der hver revisjon erstatter det forrige'
        );
    }
  }
  for (const a of aksepter)
    if (!alleSvar.has(a.gjelder)) ugyldig(a.id, 'aksepten viser til et svar som ikke finnes');
  for (const t of trekk)
    if (!alleKrav.has(t.gjelder)) ugyldig(t.id, 'trekket viser til et krav som ikke finnes');
  const opplysningIder = new Set(opplysninger.map((o) => o.id));
  for (const b of bestridelser)
    if (!opplysningIder.has(b.gjelder))
      ugyldig(b.id, 'bestridelsen viser til en opplysning som ikke finnes');

  // Et enighetsgrunnlag gjelder svaret som holder det, eller svaret aksepten viser til.
  const annetSvar = (e: Enighetsgrunnlag | null, s: Svar | undefined) =>
    e !== null && s !== undefined && (e.svar !== s.id || e.spor !== s.spor);
  for (const s of alleSvar.values())
    if (annetSvar(s.enighetsgrunnlag, s)) ugyldig(s.id, 'enighetsgrunnlaget gjelder et annet svar');
  for (const a of aksepter)
    if (annetSvar(a.enighetsgrunnlag, alleSvar.get(a.gjelder)))
      ugyldig(a.id, 'enighetsgrunnlaget i aksepten gjelder et annet svar');

  if (begrensninger.length) return tom(journal, regler, begrensninger);

  for (const n of SPOR) {
    const sp = spor[n];
    sp.gjeldendeKrav = sp.krav.at(-1) ?? null;
    sp.gjeldendeSvar = sp.gjeldendeKrav
      ? (ikkeErstattet(sp.svar, sp.gjeldendeKrav.id)[0] ?? null)
      : null;
    sp.trukket = trekk.some((t) => alleKrav.get(t.gjelder)?.spor === n);
  }
  for (const n of KRAVSPOR) spor[n].trukket ||= spor.grunnlag.trukket;

  // MM-U1, MM-U8: en vurdering etter § 33.4 gjelder varselet som var registrert da
  // brevet ble sendt. Er et annet varsel registrert nå, er preklusjonen uavklart.
  const varselNaa = (s: Svar) => spor.frist.varsel?.id ?? utledetVarsel(s.gjelder);
  const svar: Record<string, Svarberegning> = {};
  for (const s of alleSvar.values())
    svar[s.id] = {
      svar: s,
      standpunkter: s.beslutningsgrunnlag.standpunkter,
      uavklart: s.utsagn
        .filter(
          (u) => u.art === 'rettidighet' && u.hjemmel === '33.4' && u.gjelder !== varselNaa(s)
        )
        .map((u) => u.id),
    };

  // Enigheten i hvert spor: en aksept av gjeldende svar, eller sammenfall i svaret.
  for (const n of SPOR) {
    const g = spor[n].gjeldendeSvar;
    if (!g) continue;
    const aksept = aksepter.filter((a) => a.gjelder === g.id).at(-1);
    if (aksept)
      spor[n].enighet = { grunnlag: aksept.enighetsgrunnlag, holder: hendelseFor.get(aksept.id)! };
    else if (g.enighetsgrunnlag) spor[n].enighet = { grunnlag: g.enighetsgrunnlag, holder: g.id };
  }

  const gSvar = spor.grunnlag.gjeldendeSvar;
  const eg = spor.grunnlag.enighet;
  const gBrev = gSvar ? svar[gSvar.id] : null;
  const gUtfall = eg
    ? eg.grunnlag.utfall.grunnlag
    : gBrev
      ? utfall(gBrev.svar, gBrev.standpunkter).grunnlag
      : undefined;
  const gHovedgrunn = gBrev?.standpunkter.find((p) => p.virkning === 'hovedgrunn');
  const gAnsvar = gSvar?.utsagn.find((u) => u.art === 'ansvar');
  for (const n of KRAVSPOR) {
    const falt = tilNyttSvar[n];
    spor[n].subsidiaer = falt
      ? grunnerFraGrunnlaget(svar[falt.id])
      : gBrev
        ? grunnerFraGrunnlaget(gBrev)
        : [];
  }

  return {
    versjon: journal.at(-1)?.versjon ?? 0,
    regelversjon: regler.versjon,
    forstatt: true,
    begrensninger,
    journal,
    svar,
    opplysninger: opplysninger.map((o) => ({
      opplysning: o,
      bestridelser: bestridelser
        .filter((b) => b.gjelder === o.id)
        .map((b) => ({
          part: partFor(journal, hendelseFor.get(b.id)!),
          hva: b.hva,
          utsagn: hendelseFor.get(b.id)!,
        })),
    })),
    spor,
    grunnlagAvklart: !spor.grunnlag.trukket && gUtfall === 'avklart',
    grunnlagAvvist: eg?.grunnlag.utfall.grunnlag === 'avvist',
    frafalt:
      !eg &&
      gHovedgrunn?.art === 'ansvar' &&
      gAnsvar?.art === 'ansvar' &&
      gAnsvar.resultat === 'frafalt',
  };
}

/** Avsenderen av dokumentet utsagnet står i. Utsagnet er lest fra et dokument, så det finnes. */
function partFor(journal: Domenehendelse[], hendelse: string): Part {
  const h = journal.find((j) => j.id === hendelse);
  if (h?.art !== 'dokument') throw new Error(`Utsagnet står ikke i et dokument: ${hendelse}`);
  return h.dokument.avsender;
}

/**
 * Om enigheten i sporet har virkning (GR-U7, MM-U3): `betinget` til vilkåret
 * er oppfylt, `virksom` når det er det, og `uten_virkning` når grunnlaget er
 * avvist ved enighet eller kravet er trukket (KA-U6). `null` uten enighet.
 */
export function enighetensVirkning(
  u: Utledning,
  spor: Spor
): 'betinget' | 'virksom' | 'uten_virkning' | null {
  const e = u.spor[spor].enighet;
  if (!e) return null;
  if (spor !== 'grunnlag' && (u.grunnlagAvvist || u.spor[spor].trukket)) return 'uten_virkning';
  return e.grunnlag.vilkaar === null || u.grunnlagAvklart ? 'virksom' : 'betinget';
}

/**
 * Enighetsgrunnlaget TE ville fryse ved å godta svaret nå. `null` når svaret
 * ikke finnes, eller når et standpunkt i det er uavklart (MM-U8). Klienten
 * viser det i forhåndsvisningen; serveren regner det på nytt og sammenlikner (2.5).
 */
export function forhandsvisAksept(u: Utledning, svarId: string): Enighetsgrunnlag | null {
  const s = u.svar[svarId];
  if (!s || s.uavklart.length) return null;
  return enighetsgrunnlag(s.svar, 'aksept');
}

/**
 * Kravene er avgjort: grunnlaget er avklart, og hvert vederlags- og fristkrav er
 * trukket eller avtalt med virkning. Et spor TE ikke har sendt, er ikke
 * avgjort (EO-U2, GR-U3). Da sperres alt unntatt bestridelse (KA-U6, MM-U7).
 * Predikatet leses av utsagnene og relasjonene, ikke av en status.
 */
export function kraveneErAvgjort(u: Utledning): boolean {
  return (
    u.grunnlagAvklart &&
    KRAVSPOR.every(
      (n) =>
        u.spor[n].trukket ||
        (u.spor[n].gjeldendeKrav !== null && enighetensVirkning(u, n) === 'virksom')
    )
  );
}

/**
 * EO-U2: saken kan inngå i en endringsordre når kravene er avgjort, grunnlaget
 * ikke er frafalt (GR-U3), og minst ett av vederlag og frist er avtalt med et
 * beløp eller dager byggherren har godkjent helt eller delvis. Et godtatt avslag
 * og et trukket spor teller som avgjort, ikke som godkjent.
 */
export function kanInngaaIEo(u: Utledning): boolean {
  const godkjent = (n: Kravspor) => {
    const e = u.spor[n].enighet?.grunnlag.utfall;
    return !u.spor[n].trukket && ((e?.belop ?? 0) !== 0 || (e?.dager ?? 0) > 0);
  };
  return kraveneErAvgjort(u) && !u.frafalt && KRAVSPOR.some(godkjent);
}
