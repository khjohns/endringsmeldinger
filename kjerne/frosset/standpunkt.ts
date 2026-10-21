/**
 * Virkningen av standpunktene i ett svar, og det som fryses av den:
 * beslutningsgrunnlaget når brevet sendes. Klienten og serveren regner med de
 * samme funksjonene; serveren sammenlikner (B-13, 2.5 i modellforslaget).
 *
 * Reglene regner virkningene bare når brevet skrives. Etter det leses de fra
 * beslutningsgrunnlaget (MM-U9). Visningen kan regne dem igjen med dagens regler
 * for å vise at regelen er endret, men ingen regel leser det.
 *
 * Svarets egne standpunkter skilles fra om hele svaret er subsidiært til
 * grunnlaget. Det siste er en relasjon mellom brevene som utledes ved lesing
 * (vedtaket 05.10), og vilkåret i enighetsgrunnlaget (GR-U7).
 */

import { beloep, tilTall, UgyldigBeloep, type Oere } from '../regler/beloep.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { beregnFrist, resultatAvDager, type Fristkrav } from '../regler/frist.ts';
import { foersteUnderkategori, type Subsidiaergrunn } from '../regler/grunnlag.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import type { Grunnlagsresultat } from '../regler/typer.ts';
import { erRegistrert } from '../format/leser.ts';
import { tekst } from '../format/skjema.ts';
import { beregnVederlag, type Vederlagskrav } from '../regler/vederlag.ts';
import { HJEMMEL, METODER } from '../format/format.ts';
import type {
  Beslutningsgrunnlag,
  Dokument,
  Enighetsgrunnlag,
  Hjemmel,
  Krav,
  Spor,
  Standpunkt,
  Standpunktsvirkning,
  Svar,
  Utfall,
} from '../typer.ts';

/** Det i et svar virkningene regnes av: sporet, standpunktene og serverens utregning. */
export type Svarinnhold = Pick<Svar, 'spor' | 'standpunkter' | 'utregning'>;

function kategori(krav: Pick<Krav, 'innhold'> | null | undefined) {
  const innhold = krav?.innhold ?? {};
  return {
    hovedkategori: tekst(innhold.hovedkategori),
    underkategori: foersteUnderkategori(innhold.underkategori as string | string[] | null),
  };
}

/** To grunnlagsversjoner har samme hovedkategori og underkategori (GR-U22). */
export function sammeKategori(a: Pick<Krav, 'innhold'>, b: Pick<Krav, 'innhold'>): boolean {
  const [x, y] = [kategori(a), kategori(b)];
  return x.hovedkategori === y.hovedkategori && x.underkategori === y.underkategori;
}

/** Varslingsplikten i § 32.2 gjelder kategorien i grunnlagskravet (GR-U11). */
export function gjelderVarslingsplikten(
  krav: Pick<Krav, 'innhold'> | null | undefined,
  regler: Regelsett
): boolean {
  const { hovedkategori, underkategori } = kategori(krav);
  return regler.gjelderVarslingsplikten(hovedkategori, underkategori);
}

/**
 * VS-U3: påberopelsen etter hjemmelen kan ha virkning for kravet. § 33.4 gjelder
 * alltid i fristen, § 32.2 der varslingsplikten gjelder kategorien, og § 34.1.2
 * for svikt og andre forhold byggherren har risikoen for.
 */
function hjemmelenGjelder(
  hjemmel: Hjemmel,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett
): boolean {
  if (hjemmel === '33.4' || hjemmel === '33.6.2') return true;
  if (hjemmel === '34.1.2')
    return regler.gjelderVarslingspliktenForVederlag(kategori(grunnlagskrav).hovedkategori);
  return gjelderVarslingsplikten(grunnlagskrav, regler);
}

/**
 * Virkningen av hvert standpunkt i svaret etter regelsettet, regnet når brevet
 * skrives. `grunnlagskrav` er kravet et grunnlagssvar gjelder.
 */
export function virkninger(
  svar: Svarinnhold,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett
): Standpunktsvirkning[] {
  const ut: Standpunktsvirkning[] = [];
  let harGrunn = false;
  const etterGrunn = () => (harGrunn ? 'subsidiaert' : 'prinsipalt');
  for (const s of svar.standpunkter) {
    if (s.art === 'rettidighet') {
      const virker = !s.iTide && hjemmelenGjelder(s.hjemmel, grunnlagskrav, regler);
      if (virker) harGrunn = true;
      ut.push({ standpunkt: s.id, art: s.art, virkning: virker ? 'prinsipalt' : 'uten_virkning' });
    } else if (s.art === 'metode' && s.aksepterer) {
      ut.push({ standpunkt: s.id, art: s.art, virkning: 'uten_virkning' });
    } else if (s.art === 'spesifisering') {
      // VS-U4: for sent spesifisert gir prinsipalt det byggherren mener at byggherren måtte forstå at TE hadde krav på.
      const virkning = s.iTide ? 'uten_virkning' : etterGrunn();
      if (!s.iTide) harGrunn = true;
      ut.push({ standpunkt: s.id, art: s.art, virkning });
    } else if (s.art === 'hindring') {
      // Vedtaket 05.10 (#211): uten fremdriftshindring står dagene som et videre subsidiært standpunkt.
      const virkning = s.oppfylt ? 'uten_virkning' : etterGrunn();
      if (!s.oppfylt) harGrunn = true;
      ut.push({ standpunkt: s.id, art: s.art, virkning });
    } else {
      ut.push({ standpunkt: s.id, art: s.art, virkning: etterGrunn() });
    }
  }
  return ut;
}

/**
 * OV-U4: kravene i et registrert brev er dokumentasjon og får ingen virkning. Utledningen
 * og `innsigelsenPaaberoper` leser regelen herfra (#787).
 */
export const kravetErDokumentasjon = (d: Pick<Dokument, 'opplysninger'>): boolean =>
  erRegistrert(d.opplysninger);

/**
 * VS-U24: en egen innsigelse er en påberopelse etter én bestemmelse bare når det den
 * gjelder, bare kan komme for sent etter den: varselet etter § 33.4 i fristen, og TEs
 * varsel etter § 32.2 i grunnlaget, som er grunnlagskravet når § 32.2 gjelder kategorien
 * i det (GR-U11). Varselet etter § 32.2 er det samme i hver grunnlagsversjon
 * (arbeidsvalget 15.10 i #500). Svaret i sporet gjentar den eller gir den opp. Mot et
 * annet krav eller et svar er den uten virkning. Et krav i et registrert brev er
 * dokumentasjon (OV-U4), så en innsigelse mot det er heller ingen påberopelse; byggherren
 * påberoper § 32.2 i svaret (arbeidsvalg 1 i #770). Kommandoene, utledningen og
 * brevteksten finner det innsigelsen gjelder, i `dokumenter` her (#536). `varslingsplikt`
 * sier om § 32.2 gjelder kategorien: brevteksten spør regelsettet når brevet skrives,
 * utledningen leser det som er frosset (MM-U18, #776).
 */
export function innsigelsenPaaberoper(
  gjelder: string,
  dokumenter: Iterable<Pick<Dokument, 'krav' | 'utsagn' | 'opplysninger'>>,
  varslingsplikt: (krav: Krav) => boolean
): Extract<Hjemmel, '32.2' | '33.4' | '33.6.2'> | null {
  for (const d of dokumenter) {
    const utsagn = d.utsagn.find((x) => x.id === gjelder);
    // VS-U29: begrunnelsen etter § 33.6.2 annet ledd b kan bare komme for sent etter § 33.6.2.
    if (utsagn)
      return utsagn.art === 'varsel' ? '33.4' : utsagn.art === 'foresporselssvar' ? '33.6.2' : null;
    const krav = d.krav.find((k) => k.id === gjelder);
    if (krav)
      return krav.spor === 'grunnlag' && !kravetErDokumentasjon(d) && varslingsplikt(krav)
        ? '32.2'
        : null;
  }
  return null;
}

/**
 * VS-U9, VS-U11, HF-U4: parten har gitt opp sin påberopelse i en egen innsigelse når et
 * senere svar fra parten i sporet sier at varselet kom i tide. I fristen gir hvert «i tide»
 * etter § 33.4 den opp, fordi parten er bundet av det (VS-U20, arbeidsvalget 15.10 i #309).
 * I grunnlaget teller partens siste standpunkt etter § 32.2, også om en annen
 * grunnlagsversjon (arbeidsvalget 15.10 i #500). `etter` er partens svar etter
 * innsigelsen, i rekkefølgen de ble sendt. Taushet gir den ikke opp. Etter § 33.6.2 gir
 * bare et standpunkt om begrunnelsen innsigelsen gjelder, den opp (VS-U29, HF-U4).
 */
export function innsigelsenErOppgitt(
  spor: Spor,
  etter: Pick<Svar, 'spor' | 'standpunkter'>[],
  hjemmel: Hjemmel = HJEMMEL[spor],
  gjelder?: string
): boolean {
  const standpunkter = etter
    .filter((x) => x.spor === spor)
    .flatMap((x) => x.standpunkter)
    .filter(
      (p): p is Extract<Standpunkt, { art: 'rettidighet' }> =>
        p.art === 'rettidighet' &&
        p.hjemmel === hjemmel &&
        (hjemmel !== '33.6.2' || p.gjelder === gjelder)
    );
  if (spor === 'frist') return standpunkter.some((p) => p.iTide);
  return standpunkter.at(-1)?.iTide === true;
}

export interface ForesporselOgSvar {
  foresporsel: string;
  /** Elementet som svarte: et fristkrav (`medKrav`) eller TEs begrunnelse etter annet ledd b. */
  svar: string | null;
  medKrav: boolean;
}

/**
 * § 33.6.2 (VS-U17, VS-U19, VS-U27): svaret på hver forespørsel, i rekkefølgen i journalen.
 * TEs begrunnelse etter annet ledd b svarer på forespørselen den gjelder. Ellers svarer det
 * første fristkravet etter forespørselen, som da er svar på den (LV-U18 setning 3). Et krav i
 * et registrert brev er dokumentasjon og svarer ikke (OV-U4). Gir forespørselen og elementet
 * som svarte, eller `null`.
 */
export function svarPaaForesporsler(
  dokumenter: Iterable<Pick<Dokument, 'krav' | 'utsagn' | 'opplysninger'>>
): ForesporselOgSvar[] {
  const ut: ForesporselOgSvar[] = [];
  for (const d of dokumenter) {
    for (const u of d.utsagn) {
      if (u.art === 'foresporsel') ut.push({ foresporsel: u.id, svar: null, medKrav: false });
      if (u.art === 'foresporselssvar') {
        const f = ut.find((x) => x.foresporsel === u.gjelder && x.svar === null);
        if (f) f.svar = u.id;
      }
    }
    const krav = d.krav.find((k) => k.spor === 'frist');
    if (krav && !kravetErDokumentasjon(d))
      for (const f of ut) if (f.svar === null) Object.assign(f, { svar: krav.id, medKrav: true });
  }
  return ut;
}

/**
 * Hvordan fristkravene står til en forespørsel etter § 33.6.2: kravet svarer på den
 * (fjerde ledd), eller TE har begrunnet etter annet ledd b før kravet, og § 33.6.1 gjelder
 * (femte ledd). `gjelder` er det rettidigheten etter § 33.6.2 gjelder: kravet eller begrunnelsen.
 */
export type Foresporselsrelasjon =
  | { art: 'svar'; gjelder: string }
  | { art: 'begrunnelse'; gjelder: string };

export function foresporselsrelasjon(
  svar: readonly ForesporselOgSvar[]
): Foresporselsrelasjon | null {
  // Forespørselen kan bare sendes før det første fristkravet (VS-U19), så det er kravet som
  // svarer. Senere kravversjoner står i samme forhold til forespørselen (VS-U20).
  const krav = svar.find((s) => s.medKrav)?.svar;
  if (krav) return { art: 'svar', gjelder: krav };
  const begrunnelse = svar.filter((s) => s.svar !== null).at(-1)?.svar;
  return begrunnelse ? { art: 'begrunnelse', gjelder: begrunnelse } : null;
}

export const prinsipalt = (v: Standpunktsvirkning[]) => v.find((p) => p.virkning === 'prinsipalt');
/** Et standpunkt som avviser kravet uavhengig av beløpet eller dagene. */
const AVVISENDE = new Set(['rettidighet', 'hindring']);
const avvisesPrinsipalt = (v: Standpunktsvirkning[]) => AVVISENDE.has(prinsipalt(v)?.art ?? '');

export function standpunktet<A extends Standpunkt['art']>(svar: Svarinnhold, art: A) {
  return svar.standpunkter.find((s): s is Extract<Standpunkt, { art: A }> => s.art === art);
}

/**
 * Hvorfor svarene på vederlag og frist er subsidiære til grunnlagssvaret, etter
 * standpunktene i brevet om grunnlaget (vedtaket 05.10, MM-U9). Utledningen og
 * brevteksten (A2) leser det samme.
 */
export function grunnerFraGrunnlaget(
  svar: Svarinnhold,
  virkninger: Standpunktsvirkning[]
): Subsidiaergrunn[] {
  const ut: Subsidiaergrunn[] = [];
  if (prinsipalt(virkninger)?.art === 'rettidighet') ut.push('prekludert');
  if (standpunktet(svar, 'grunnlag')?.resultat === 'avslaatt') ut.push('avslaatt');
  return ut;
}

/**
 * GR-U7: byggherren har godkjent grunnlaget uten virksom preklusjon etter § 32.2,
 * eller frafalt pålegget. Leses av standpunktene og virkningen i brevet om
 * grunnlaget, ikke av et utfall.
 */
export function grunnlagetErAvklart(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  const resultat = standpunktet(svar, 'grunnlag')?.resultat;
  return (
    !preklusjonPaaberopt(svar, v) && (resultat === 'godkjent' || resultat === 'paalegg_frafalt')
  );
}

/**
 * MM-U13: byggherren påberoper prinsipalt preklusjon etter § 32.2 i svaret på
 * grunnlaget.
 * Rettidigheten i grunnlaget er alltid etter § 32.2 (`HJEMMEL`).
 */
function preklusjonPaaberopt(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  return (
    svar.spor === 'grunnlag' &&
    v.some((p) => p.art === 'rettidighet' && p.virkning === 'prinsipalt')
  );
}

/** Det svaret gir i sporet når standpunktene har denne virkningen. */
function utfall(svar: Svarinnhold, v: Standpunktsvirkning[]): Utfall {
  const prekludert = avvisesPrinsipalt(v);
  if (svar.spor === 'grunnlag') return {};
  if (svar.spor === 'vederlag')
    return { beloep: prekludert ? 0 : standpunktet(svar, 'beloep')!.godkjent };
  if (prekludert) return { dager: 0 };
  const spesifisering = standpunktet(svar, 'spesifisering');
  if (spesifisering && prinsipalt(v)?.standpunkt === spesifisering.id)
    return { dager: spesifisering.dager! };
  const dager = standpunktet(svar, 'dager')!;
  return { dager: dager.resultat === 'avslaatt' ? 0 : dager.vurdert };
}

/**
 * Svaret godkjenner hele kravet i sporet, så standpunktene faller sammen
 * (GR-U7). For grunnlaget er det en godkjenning uten påberopt preklusjon
 * (GR-U10).
 */
function godkjennerHeleKravet(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  if (avvisesPrinsipalt(v)) return false;
  if (svar.spor === 'grunnlag') return standpunktet(svar, 'grunnlag')?.resultat === 'godkjent';
  // Arbeidsvalget i #479: et tilbud byggherren ikke aksepterer (§ 34.2.2), eller en
  // påberopelse etter § 33.6.1 med virkning, gir aldri sammenfall. Leses av standpunktene.
  if (standpunktet(svar, 'metode')?.aksepterer === false) return false;
  const spesifisering = standpunktet(svar, 'spesifisering');
  if (
    spesifisering &&
    v.some((p) => p.standpunkt === spesifisering.id && p.virkning !== 'uten_virkning')
  )
    return false;
  return svar.utregning.resultat === 'godkjent';
}

/**
 * MM-U18: sammenfallet i beslutningsgrunnlaget stemmer med standpunktene og
 * virkningene i samme brev. Leses av det frosne brevet, ikke av dagens regler.
 */
export const sammenfallStemmer = (svar: Svar): boolean =>
  svar.beslutningsgrunnlag.sammenfall ===
  godkjennerHeleKravet(svar, svar.beslutningsgrunnlag.virkninger);

/**
 * Et svar på grunnlaget i et brev sendt i appen er en endringsordre etter § 32.3
 * første ledd a: svaret godkjenner hele kravet uten påberopt preklusjon
 * (sammenfall, GR-U10), og § 32.2 gjaldt kategorien (GR-U11, GR-U12). Leses av
 * det frosne beslutningsgrunnlaget.
 */
export function blirEndringsordre(b: Beslutningsgrunnlag): boolean {
  return b.sammenfall && b.varslingsplikt === true;
}

/** Enigheten om svaret slik brevet uttrykte det (KA-U10, MM-U3, MM-U9, MM-U11). */
export function enighetsgrunnlag(svar: Svar, kilde: Enighetsgrunnlag['kilde']): Enighetsgrunnlag {
  const { regelversjon, virkninger } = svar.beslutningsgrunnlag;
  return {
    spor: svar.spor,
    svar: svar.id,
    kilde,
    regelversjon,
    virkninger,
    utfall: utfall(svar, virkninger),
    vilkaar: svar.spor === 'grunnlag' ? null : 'grunnlag_avklart',
  };
}

/** Kroner med mellomrom mellom tusener og øre bare når de finnes: «150 000 kr». */
export function kroner(n: number): string {
  // Avrundet til hele øre som reglene runder (`beloep`), ikke som flyttallet.
  const i = beloep(n)!;
  const abs = i < 0n ? -i : i;
  const gruppert = String(abs / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  const oere = String(abs % 100n).padStart(2, '0');
  return `${i < 0n ? '−' : ''}${gruppert}${oere === '00' ? '' : `,${oere}`}\u00a0kr`;
}

/** «1 dag», «12 dager». Brevteksten og meldingen om en senket revisjon bruker samme ord (#628). */
export const dager = (n: number) => `${n} ${n === 1 ? 'dag' : 'dager'}`;

/** Svaret på grunnlaget med ordene i brevet (#628). */
export const GRUNNLAGSSVARET: Record<Grunnlagsresultat, string> = {
  godkjent: 'godkjent',
  avslaatt: 'avslått',
  paalegg_frafalt: 'pålegget frafalt (§ 32.3 c)',
};

/**
 * Linjen i brevet for svaret: byggherrens standpunkt, med den prinsipale grunnen først
 * (vedtaket 05.10 om avslag sammen med § 32.2). Leddene ordnes som i brevteksten (HF-U2, VS-U3).
 */
function beslutningslinje(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  grunnlagskrav: Krav | null | undefined
): string {
  const spesifisert = standpunktet(svar, 'spesifisering');
  // Fristsvaret kan prekludere etter både § 33.4 og § 33.6.2 tredje ledd (VS-U17). Begge er
  // prinsipale, så de er ett ledd med den prinsipale grunnen (vedtaket 05.10).
  const prekluderende = v
    .filter((p) => p.art === 'rettidighet' && p.virkning !== 'uten_virkning')
    .map((p) => p.standpunkt);
  const hjemler = svar.standpunkter
    .filter((s): s is Extract<Standpunkt, { art: 'rettidighet' }> => prekluderende.includes(s.id))
    .map((s) => `§ ${s.hjemmel}`);
  const grunntekst: Record<string, string> = {
    rettidighet: `prekludert (${hjemler.join(' og ')})`,
    // Som brevteksten: § 33.1 krever at fremdriften hindres «som følge av» forholdet.
    hindring: `avslått: fremdriften er ikke hindret som følge av forholdet (§ ${
      kategori(grunnlagskrav).hovedkategori === 'force_majeure' ? '33.3' : '33.1'
    })`,
    spesifisering: spesifisert?.dager
      ? `godkjent med ${spesifisert.dager} dager (§ 33.6.1)`
      : 'avslått (§ 33.6.1)',
  };
  const grunner = v.filter(
    (p) =>
      p.art in grunntekst &&
      p.virkning !== 'uten_virkning' &&
      (p.art !== 'rettidighet' || p.standpunkt === prekluderende[0])
  );
  let standpunkt: string;
  if (svar.spor === 'grunnlag') {
    standpunkt = GRUNNLAGSSVARET[standpunktet(svar, 'grunnlag')!.resultat];
  } else if (svar.spor === 'vederlag') {
    const b = standpunktet(svar, 'beloep')!;
    standpunkt = b.resultat === 'avslaatt' ? 'avslått' : `godkjent med ${kroner(b.godkjent)}`;
    if (standpunktet(svar, 'metode')?.aksepterer === false)
      standpunkt += ', tilbudet ikke akseptert (§ 34.2.2)';
  } else {
    const d = standpunktet(svar, 'dager')!;
    standpunkt = d.resultat === 'avslaatt' ? 'avslått' : `godkjent med ${d.vurdert} dager`;
  }
  const ledd = [...grunner.map((p) => grunntekst[p.art]), standpunkt];
  if (ledd.length === 1) return `Byggherrens standpunkt: ${standpunkt}.`;
  const orden = (i: number) =>
    i === 0 ? 'prinsipalt' : i === 1 ? 'subsidiært' : 'videre subsidiært';
  return `Byggherrens standpunkt: ${ledd.map((t, i) => `${orden(i)} ${t}`).join(', ')}.`;
}

/**
 * Brevet frosset når det sendes (MM-U9, MM-U11). For grunnlaget fryses også om
 * § 32.2 gjaldt kategorien i kravversjonen (GR-U12).
 */
export function beslutningsgrunnlag(
  svar: Svarinnhold,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett
): Beslutningsgrunnlag {
  const v = virkninger(svar, grunnlagskrav, regler);
  return {
    regelversjon: regler.versjon,
    virkninger: v,
    linje: beslutningslinje(svar, v, grunnlagskrav),
    sammenfall: godkjennerHeleKravet(svar, v),
    ...(svar.spor === 'grunnlag'
      ? { varslingsplikt: gjelderVarslingsplikten(grunnlagskrav, regler) }
      : {}),
  };
}

/** Virkningen hvert standpunkt har, utenom standpunkter uten virkning. Et standpunkt som mangler, er uten virkning. */
function medVirkning(v: Standpunktsvirkning[]): Map<string, Standpunktsvirkning['virkning']> {
  return new Map(
    v.filter((p) => p.virkning !== 'uten_virkning').map((p) => [p.standpunkt, p.virkning])
  );
}

/** Et standpunkt har en annen virkning i `a` enn i `b`. Brukes bare av visningen (MM-U9). */
export function ulikeVirkninger(a: Standpunktsvirkning[], b: Standpunktsvirkning[]): boolean {
  const [x, y] = [medVirkning(a), medVirkning(b)];
  return x.size !== y.size || [...x].some(([id, virkning]) => y.get(id) !== virkning);
}

/**
 * En vurdering i svaret som kjernen ennå ikke har et standpunkt for. Den kan ikke
 * godtas og forenkles til et annet standpunkt, så kommandoen avvises. Formatet har
 * ingen art for den, så en lagret rad med den er ikke forstått (#304, review av
 * PR #306).
 */
export function utenforOmfanget(spor: Spor, v: Record<string, unknown>): string | null {
  if (spor === 'vederlag') {
    if (v.hold_tilbake === true) return 'tilbakeholdelse (§ 30.2) er ikke i kjernen ennå';
    for (const felt of ['rigg_varslet_i_tide', 'produktivitet_varslet_i_tide'])
      if (v[felt] === false) return `preklusjon etter § 34.1 (${felt}) er ikke i kjernen ennå`;
    if ((v.rigg_vurdering ?? null) !== null || (v.produktivitet_vurdering ?? null) !== null)
      return 'særskilte krav (§ 34.1.3) er ikke i kjernen ennå';
  }
  return null;
}

// ---------- Utregningen av svaret (B-13) ----------

export interface Svarvurdering {
  resultat?: unknown;
  grunnlag_varslet_i_tide?: unknown;
  hovedkrav_vurdering?: unknown;
  hovedkrav_godkjent_belop?: unknown;
  hovedkrav_varslet_i_tide?: unknown;
  aksepterer_metode?: unknown;
  oensket_metode?: unknown;
  frist_varsel_ok?: unknown;
  spesifisert_krav_ok?: unknown;
  foresporsel_svar_ok?: unknown;
  dager_maatte_forstaa?: unknown;
  vilkar_oppfylt?: unknown;
  dager?: unknown;
}

/**
 * Det krevde beløpet i vederlagskravet, i øre, slik utregningen, kontrollen av
 * begrunnelsen og brevet leser det (#508). Et beløp som mangler eller ikke er et tall,
 * kaster `Error` og ikke `UgyldigBeloep`: det står i kravet, så det er en feil på
 * serveren og ikke byggherrens ugyldige vurdering (#766).
 */
export function krevdBeloep(krav: Krav): Oere {
  let krevd: Oere | null;
  try {
    krevd = beloep(krav.innhold.beloep as number | undefined);
  } catch (feil) {
    if (!(feil instanceof UgyldigBeloep)) throw feil;
    throw new Error(`Det krevde beløpet i kravet ${krav.id} kan ikke leses: ${feil.message}.`);
  }
  if (krevd === null) throw new Error(`Det krevde beløpet mangler i kravet ${krav.id}.`);
  return krevd;
}

/**
 * Serverens utregning av svaret, med navnene i formatet (`UTREGNING` i
 * `format.ts`). Grunnlaget har ingen utregning, bare kontrollen av
 * vurderingene. Kaster `UgyldigVurdering`, og `UgyldigBeloep` for et beløp i
 * vurderingene som ikke er et tall. Et krevd beløp som ikke kan leses, kaster
 * `Error` (`krevdBeloep`).
 */
export function regnUtSvar(
  spor: Spor,
  v: Svarvurdering,
  {
    krav,
    grunnlagskrav,
    foresporsel = null,
  }: { krav: Krav; grunnlagskrav: Krav | null; foresporsel?: Foresporselsrelasjon | null },
  regler: Regelsett
): Record<string, unknown> {
  if (spor === 'grunnlag') {
    const { hovedkategori, underkategori } = kategori(krav);
    const feil: Record<string, string> = {};
    const resultat = v.resultat as never;
    if (!regler.gyldigeGrunnlagsresultater(hovedkategori, underkategori).includes(resultat))
      feil.resultat = `«${String(v.resultat)}» kan ikke velges i denne kategorien (§ 32.3 c)`;
    const iTide = v.grunnlag_varslet_i_tide;
    if (regler.gjelderVarslingsplikten(hovedkategori, underkategori)) {
      if (typeof iTide !== 'boolean') feil.grunnlag_varslet_i_tide = 'mangler (§ 32.2)';
      // #235: frafall skjer mot endringsordre og kan ikke kombineres med preklusjon.
      else if (v.resultat === 'paalegg_frafalt' && !iTide)
        feil.grunnlag_varslet_i_tide =
          'frafall kan ikke kombineres med at grunnlaget er varslet for sent';
    } else if (iTide !== undefined) {
      feil.grunnlag_varslet_i_tide = 'gjelder bare § 32.2';
    }
    if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
    return {};
  }
  if (spor === 'vederlag') {
    const { hovedkategori, underkategori } = kategori(grunnlagskrav);
    const vkrav: Vederlagskrav = {
      hovedkrav_belop: tilTall(krevdBeloep(krav)),
      metode: 'tilbud',
      rigg_belop: null,
      produktivitet_belop: null,
      krever_justert_ep: false,
      kostnads_overslag: null,
      hovedkategori,
      underkategori,
      grunnlag_varslet_i_tide: null,
      grunnlag_resultat: null,
    };
    if (
      v.hovedkrav_varslet_i_tide != null &&
      !regler.gjelderVarslingspliktenForVederlag(hovedkategori)
    )
      throw new UgyldigVurdering({
        hovedkrav_varslet_i_tide: 'gjelder bare svikt og andre forhold (§ 34.1.2)',
      });
    // Arbeidsvalget i #479: uten aksept av tilbudet oppgir byggherren metoden, ellers ikke.
    if (v.aksepterer_metode === false && !METODER.includes(v.oensket_metode as never))
      throw new UgyldigVurdering({
        oensket_metode: 'mangler når tilbudet ikke aksepteres (§ 34.2.2)',
      });
    if (v.aksepterer_metode !== false && v.oensket_metode != null)
      throw new UgyldigVurdering({
        oensket_metode: 'gjelder bare når tilbudet ikke aksepteres (§ 34.2.2)',
      });
    const r = beregnVederlag(vkrav, v as never, regler);
    const ut: Record<string, unknown> = {
      resultat: r.beregnings_resultat,
      godkjent_beloep: tilTall(r.total_godkjent_belop),
    };
    // VS-U3, B-13: ved preklusjon etter § 34.1.2 står det vurderte beløpet subsidiært.
    if (r.subsidiaer_resultat !== null) {
      ut.subsidiaert_resultat = r.subsidiaer_resultat;
      ut.subsidiaert_godkjent_beloep = tilTall(r.subsidiaer_godkjent_belop!);
    }
    return ut;
  }
  const fkrav: Fristkrav = {
    krevd_dager: (krav.innhold.dager as number | undefined) ?? 0,
    varsel_type: 'spesifisert',
    er_svar_paa_foresporsel: foresporsel?.art === 'svar',
    har_begrunnelse_etter_b: foresporsel?.art === 'begrunnelse',
    // § 33.4 vurderes også når kravet svarer på forespørselen, som uten den.
    har_innsigelse_mot_varsel: true,
    har_tidligere_varsel_i_tide: false,
    er_grunnlag_subsidiaert: false,
    er_hele_fristen_subsidiaer_pga_grunnlag: false,
  };
  const r = beregnFrist(fkrav, {
    frist_varsel_ok: v.frist_varsel_ok as boolean | undefined,
    spesifisert_krav_ok: v.spesifisert_krav_ok as boolean | undefined,
    foresporsel_svar_ok: v.foresporsel_svar_ok as boolean | undefined,
    vilkar_oppfylt: v.vilkar_oppfylt as boolean | undefined,
    godkjent_dager: v.dager,
  });
  const ut: Record<string, unknown> = {
    resultat: r.beregnings_resultat,
    godkjent_dager: r.godkjent_dager,
  };
  if (r.subsidiaer_resultat !== null) {
    ut.subsidiaert_resultat = r.subsidiaer_resultat;
    ut.subsidiaert_godkjent_dager = r.subsidiaer_godkjent_dager ?? 0;
  }
  const maatteForstaa = kontrollerSpesifiseringen(v);
  // VS-U4, rekkefølgen i #479: uten preklusjon og med hindring er dagene byggherren måtte
  // forstå at TE hadde krav på det prinsipale, og de vurderte dagene står subsidiært.
  if (maatteForstaa !== null && r.subsidiaer_resultat === null) {
    ut.resultat = resultatAvDager(true, fkrav.krevd_dager, maatteForstaa);
    ut.godkjent_dager = maatteForstaa;
    ut.subsidiaert_resultat = r.beregnings_resultat;
    ut.subsidiaert_godkjent_dager = r.godkjent_dager;
  }
  return ut;
}

/**
 * VS-U4: når spesifiseringen kom for sent, oppgir byggherren dagene byggherren måtte forstå at
 * TE hadde krav på, høyst de vurderte og de krevde (arbeidsvalget i #479). Gir dagene, eller `null`.
 */
function kontrollerSpesifiseringen(v: Svarvurdering): number | null {
  const d = v.dager_maatte_forstaa;
  if (v.spesifisert_krav_ok !== false) {
    if (d != null)
      throw new UgyldigVurdering({
        dager_maatte_forstaa: 'gjelder bare når kravet er spesifisert for sent (§ 33.6.1)',
      });
    return null;
  }
  const feil = (grunn: string) => new UgyldigVurdering({ dager_maatte_forstaa: grunn });
  if (d === undefined || d === null) throw feil('mangler (§ 33.6.1)');
  if (typeof d !== 'number' || !Number.isInteger(d) || d < 0)
    throw feil('er ikke et helt antall dager');
  // `beregnFrist` har kontrollert at de vurderte dagene er høyst de krevde.
  if (d > (v.dager as number))
    throw feil('er flere enn dagene byggherren godtar om kravet kom i tide');
  return d;
}

/** Feltene klienten skal ha regnet likt med serveren. Beløp sammenliknes til hele øre. */
export const SAMMENLIKNES: Record<Spor, string[]> = {
  grunnlag: [],
  vederlag: ['resultat', 'godkjent_beloep'],
  frist: ['resultat', 'godkjent_dager'],
};

export function likeResultatfelt(felt: string, klient: unknown, server: unknown): boolean {
  if (felt.endsWith('_beloep') && typeof klient === 'number' && typeof server === 'number')
    return beloep(klient) === beloep(server);
  return klient === server;
}
