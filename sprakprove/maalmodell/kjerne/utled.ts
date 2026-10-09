/**
 * `utled(journal, regler)`: predikatene kjernen regner av journalen og
 * regelversjonen (2.6 i modellforslaget). Kommandoene, handlingene og visningen
 * leser denne utledningen. Den har ingen status; statusen er en etikett i
 * visningen.
 *
 * Relasjonene bestemmer, ikke rekkefølgen: et svar gjelder kravet det viser
 * til, og gjeldende svar er svaret på gjeldende krav som ikke er erstattet.
 * Løses en relasjon ikke entydig, eller er en hendelse ukjent, er saken ikke
 * forstått, og ingenting utledes (MM-U2, 2.7 regel 1).
 */

import { utledetVarsel } from './leser.ts';
import type { Regelsett } from './regelsett.ts';
import {
  avviker,
  enighetsgrunnlag,
  godkjennerHeleKravet,
  standpunkter,
  utfall,
} from './standpunkt.ts';
import {
  KRAVSPOR,
  SPOR,
  type Domenehendelse,
  type Enighetsgrunnlag,
  type Enighetsvirkning,
  type Krav,
  type Kravspor,
  type Opplysning,
  type Part,
  type Spor,
  type Standpunkt,
  type Svar,
  type Utsagn,
} from './typer.ts';

export type Subsidiaergrunn = 'prekludert' | 'avslatt';

export interface Svarutledning {
  svar: Svar;
  /** Svarets standpunkter etter regelsettet utledningen er regnet med. */
  standpunkter: Standpunkt[];
  /** Brevet avviker fra dagens utledning (MM-U4); `null` uten lagret beslutningsgrunnlag. */
  avvik: boolean | null;
}

export interface Enighet {
  grunnlag: Enighetsgrunnlag;
  /** Hendelsen som holder enighetsgrunnlaget: aksepten, eller svaret ved sammenfall. */
  holder: string;
  /** Utledet av kompatibilitetsleseren med gjeldende regler, fordi hendelsen ikke har det (2.5). */
  utledet: boolean;
  virkning: Enighetsvirkning;
}

export interface Sporutledning {
  krav: Krav[];
  gjeldendeKrav: Krav | null;
  svar: Svar[];
  gjeldendeSvar: Svar | null;
  enighet: Enighet | null;
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
  svar: Record<string, Svarutledning>;
  opplysninger: { opplysning: Opplysning; bestridelser: Bestridelse[] }[];
  spor: Record<Spor, Sporutledning>;
  grunnlagAvklart: boolean;
  grunnlagAvvist: boolean;
  /** GR-U2: grunnlaget er godkjent uten virksom preklusjon og kan ikke endres. */
  grunnlagLaast: boolean;
  frafalt: boolean;
  oppgjort: Record<Kravspor, boolean>;
  avsluttet: boolean;
  kanInngaaIEo: boolean;
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
    grunnlagLaast: false,
    frafalt: false,
    oppgjort: { vederlag: false, frist: false },
    avsluttet: false,
    kanInngaaIEo: false,
  };
}

/** Svarene på kravet som ikke er erstattet. Flere enn ett er en tvetydig relasjon. */
function ikkeErstattet(svar: Svar[], kravId: string): Svar[] {
  const paaKravet = svar.filter((s) => s.gjelder === kravId);
  const erstattet = new Set(paaKravet.map((s) => s.erstatter).filter((e) => e !== null));
  return paaKravet.filter((s) => !erstattet.has(s.id));
}

function arsaker(s: Standpunkt[], svar: Svar): Subsidiaergrunn[] {
  const ut: Subsidiaergrunn[] = [];
  if (s.some((p) => p.art === 'rettidighet' && p.virkning === 'hovedgrunn')) ut.push('prekludert');
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
  // falt, forblir det til sporet eller grunnlaget besvares igjen.
  const tilNyttSvar: Partial<Record<Kravspor, Subsidiaergrunn[]>> = {};

  const grunnlagsgrunner = (): Subsidiaergrunn[] | null => {
    const g = spor.grunnlag;
    const krav = g.krav.at(-1);
    if (!krav) return null;
    const gjeldende = ikkeErstattet(g.svar, krav.id);
    if (gjeldende.length !== 1) return null;
    return arsaker(standpunkter(gjeldende[0], { grunnlagskrav: krav }, regler), gjeldende[0]);
  };

  for (const h of journal) {
    if (h.art === 'ukjent') {
      begrensninger.push({ hendelse: h.id, grunn: h.grunn });
      continue;
    }
    if (h.art === 'sak') continue;
    const d = h.dokument;
    for (const k of d.krav) {
      if (k.spor === 'grunnlag') {
        const grunner = grunnlagsgrunner();
        if (grunner !== null)
          for (const s of KRAVSPOR) if (spor[s].svar.length) tilNyttSvar[s] = grunner;
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

  if (begrensninger.length) return tom(journal, regler, begrensninger);

  // Standpunktene for hvert svar, med dagens regler.
  const svar: Record<string, Svarutledning> = {};
  const grunnlagskravFor = (s: Svar) =>
    s.spor === 'grunnlag' ? alleKrav.get(s.gjelder) : spor.grunnlag.krav.at(-1);
  for (const s of alleSvar.values()) {
    const st = standpunkter(
      s,
      {
        grunnlagskrav: grunnlagskravFor(s),
        varsel:
          s.spor === 'frist' ? (spor.frist.varsel?.id ?? utledetVarsel(s.gjelder)) : undefined,
      },
      regler
    );
    svar[s.id] = { svar: s, standpunkter: st, avvik: avviker(s, st) };
  }

  for (const n of SPOR) {
    const sp = spor[n];
    sp.gjeldendeKrav = sp.krav.at(-1) ?? null;
    sp.gjeldendeSvar = sp.gjeldendeKrav
      ? (ikkeErstattet(sp.svar, sp.gjeldendeKrav.id)[0] ?? null)
      : null;
    sp.trukket = trekk.some((t) => alleKrav.get(t.gjelder)?.spor === n);
  }
  for (const n of KRAVSPOR) spor[n].trukket ||= spor.grunnlag.trukket;

  // Enigheten i hvert spor: en aksept av gjeldende svar, eller sammenfall i svaret.
  const enighetUtenVirkning = (n: Spor) => {
    const g = spor[n].gjeldendeSvar;
    if (!g) return null;
    const aksept = aksepter.filter((a) => a.gjelder === g.id).at(-1);
    if (aksept) {
      const frosset = aksept.enighetsgrunnlag;
      return {
        grunnlag: frosset ?? enighetsgrunnlag(g, 'aksept', svar[g.id].standpunkter, regler),
        holder: hendelseFor.get(aksept.id)!,
        utledet: frosset === undefined,
      };
    }
    if (g.enighetsgrunnlag) return { grunnlag: g.enighetsgrunnlag, holder: g.id, utledet: false };
    if (g.enighetsgrunnlag === undefined && godkjennerHeleKravet(g, svar[g.id].standpunkter))
      return {
        grunnlag: enighetsgrunnlag(g, 'sammenfall', svar[g.id].standpunkter, regler),
        holder: g.id,
        utledet: true,
      };
    return null;
  };

  const eg = enighetUtenVirkning('grunnlag');
  const gSvar = spor.grunnlag.gjeldendeSvar;
  const gStandpunkter = gSvar ? svar[gSvar.id].standpunkter : [];
  // MM-U5: avviker et svar som ikke er godtatt, fra brevet, er grunnlaget uavklart
  // til byggherren svarer på nytt. Byggherren bindes ikke til et utfall brevet ikke uttrykte.
  const gAvviker = !eg && gSvar !== null && svar[gSvar.id].avvik === true;
  const gUtfall = eg
    ? eg.grunnlag.utfall.grunnlag
    : gSvar && !gAvviker
      ? utfall(gSvar, gStandpunkter).grunnlag
      : undefined;
  const gHovedgrunn = gStandpunkter.find((p) => p.virkning === 'hovedgrunn');
  const gAnsvar = gSvar?.utsagn.find((u) => u.art === 'ansvar');
  const ansvarErHovedgrunn = (resultat: string) =>
    !eg &&
    !gAvviker &&
    gHovedgrunn?.art === 'ansvar' &&
    gAnsvar?.art === 'ansvar' &&
    gAnsvar.resultat === resultat;

  const trukketGrunnlag = spor.grunnlag.trukket;
  const grunnlagAvklart = !trukketGrunnlag && gUtfall === 'avklart';
  const grunnlagAvvist = eg?.grunnlag.utfall.grunnlag === 'avvist';
  if (eg) spor.grunnlag.enighet = { ...eg, virkning: 'virksom' };
  for (const n of KRAVSPOR) {
    const e = enighetUtenVirkning(n);
    if (e) {
      let virkning: Enighetsvirkning = 'betinget';
      if (grunnlagAvvist || spor[n].trukket) virkning = 'uten_virkning';
      else if (grunnlagAvklart) virkning = 'virksom';
      spor[n].enighet = { ...e, virkning };
    }
    const fraGrunnlaget = eg
      ? arsaker(eg.grunnlag.standpunkter, alleSvar.get(eg.grunnlag.svar)!)
      : gSvar
        ? arsaker(gStandpunkter, gSvar)
        : [];
    spor[n].subsidiaer = tilNyttSvar[n] ?? fraGrunnlaget;
  }
  const oppgjort = {
    vederlag: spor.vederlag.enighet?.virkning === 'virksom',
    frist: spor.frist.enighet?.virkning === 'virksom',
  };
  const frafalt = ansvarErHovedgrunn('frafalt');
  const ferdig = (n: Kravspor) =>
    spor[n].trukket || (spor[n].gjeldendeKrav !== null && oppgjort[n]);

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
    grunnlagAvklart,
    grunnlagAvvist,
    grunnlagLaast: !trukketGrunnlag && ansvarErHovedgrunn('godkjent'),
    frafalt,
    oppgjort,
    avsluttet: grunnlagAvvist || trukketGrunnlag || (grunnlagAvklart && KRAVSPOR.every(ferdig)),
    kanInngaaIEo:
      grunnlagAvklart &&
      !frafalt &&
      KRAVSPOR.every((n) => spor[n].gjeldendeKrav !== null && oppgjort[n]),
  };
}

/** Avsenderen av dokumentet utsagnet står i. Utsagnet er lest fra et dokument, så det finnes. */
function partFor(journal: Domenehendelse[], hendelse: string): Part {
  const h = journal.find((j) => j.id === hendelse);
  if (h?.art !== 'dokument') throw new Error(`Utsagnet står ikke i et dokument: ${hendelse}`);
  return h.dokument.avsender;
}

/**
 * Enighetsgrunnlaget TE ville fryse ved å godta svaret nå. `null` når svaret
 * ikke finnes, eller når et standpunkt i det er uavklart. Klienten viser det i
 * forhåndsvisningen; serveren regner det på nytt og sammenlikner (2.5).
 */
export function forhandsvisAksept(
  u: Utledning,
  svarId: string,
  regler: Regelsett
): Enighetsgrunnlag | null {
  const s = u.svar[svarId];
  if (!s || s.standpunkter.some((p) => p.virkning === 'uavklart')) return null;
  return enighetsgrunnlag(s.svar, 'aksept', s.standpunkter, regler);
}
