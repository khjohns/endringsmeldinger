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
import { beregnGodkjentBeloep, beregnVederlag, type Vederlagskrav } from '../regler/vederlag.ts';
import type { Beloepsvurdering } from '../regler/typer.ts';
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
  Virkning,
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
 * alltid i fristen, § 32.2 der varslingsplikten gjelder kategorien, § 34.1.2
 * for svikt og andre forhold byggherren har risikoen for, og § 34.1.3 for forhold
 * etter både § 34.1.1 og § 34.1.2 (#1047, kommentaren 6348199156).
 */
export function hjemmelenGjelder(
  hjemmel: Hjemmel,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett
): boolean {
  if (hjemmel === '33.4' || hjemmel === '33.6.2' || hjemmel === '34.1.3') return true;
  if (hjemmel === '34.1.2')
    return regler.gjelderVarslingspliktenForVederlag(kategori(grunnlagskrav).hovedkategori);
  return gjelderVarslingsplikten(grunnlagskrav, regler);
}

/**
 * Virkningen av hvert standpunkt i svaret etter regelsettet, regnet når brevet
 * skrives. `grunnlagskrav` er kravet et grunnlagssvar gjelder. Laget er et nummer fra 1.
 * Hver grunn med virkning åpner et nytt lag for standpunktene etter den, og påberopelsene
 * av rettidighet står i det første (OV-U32, vedtaket 05.10). `forskyvning` er lagene
 * svaret på grunnlaget opptar foran sporet (`lagFraGrunnlaget`).
 */
export function virkninger(
  svar: Svarinnhold,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett,
  forskyvning = 0
): Standpunktsvirkning[] {
  if (svar.spor === 'vederlag')
    return vederlagsvirkninger(svar, grunnlagskrav, regler, forskyvning);
  const ut: Standpunktsvirkning[] = [];
  let lag = 1;
  const iLaget = () => lag;
  for (const s of svar.standpunkter) {
    if (s.art === 'rettidighet') {
      const virker = !s.iTide && hjemmelenGjelder(s.hjemmel, grunnlagskrav, regler);
      if (virker) lag = 2;
      ut.push({ standpunkt: s.id, art: s.art, virkning: virker ? 1 : 'uten_virkning' });
    } else if (s.art === 'metode' && s.aksepterer) {
      ut.push({ standpunkt: s.id, art: s.art, virkning: 'uten_virkning' });
    } else if (s.art === 'spesifisering') {
      // VS-U4: for sent spesifisert gir prinsipalt det byggherren mener at byggherren måtte forstå at TE hadde krav på.
      const virkning = s.iTide ? 'uten_virkning' : iLaget();
      if (!s.iTide) lag++;
      ut.push({ standpunkt: s.id, art: s.art, virkning });
    } else if (s.art === 'hindring') {
      // Vedtaket 05.10 (#211): uten fremdriftshindring står dagene som et videre subsidiært standpunkt.
      const virkning = s.oppfylt ? 'uten_virkning' : iLaget();
      if (!s.oppfylt) lag++;
      ut.push({ standpunkt: s.id, art: s.art, virkning });
    } else {
      ut.push({ standpunkt: s.id, art: s.art, virkning: iLaget() });
    }
  }
  return ut;
}

/**
 * OV-U27, OV-U33: lagene i vederlaget. Påberopelsen etter § 34.1.2 gjelder hele kravet og
 * står i det første laget. Begrensningen etter § 34.1.3 rammer bare posten etter annet ledd
 * (OV-U22, VS-U5): den står i laget etter § 34.1.2 sammen med justeringen ellers og
 * metoden, og posten i laget etter den. Rammer ingen påberopelse justeringen ellers, er den
 * upåvirket, så sant grunnlaget verken er avslått eller prekludert (OV-U33). Metoden står i
 * laget til justeringen ellers, også når byggherren godkjenner oppgjør som fast sum (LV-U31, LV-U32).
 */
function vederlagsvirkninger(
  svar: Svarinnhold,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett,
  forskyvning: number
): Standpunktsvirkning[] {
  const sent = (hjemmel: Hjemmel) =>
    svar.standpunkter.some(
      (s) =>
        s.art === 'rettidighet' &&
        s.hjemmel === hjemmel &&
        !s.iTide &&
        hjemmelenGjelder(hjemmel, grunnlagskrav, regler)
    );
  const [hele, posten] = [sent('34.1.2'), sent('34.1.3')];
  const foerste = hele ? 2 : 1;
  const ellers: Virkning = posten && !hele && forskyvning === 0 ? 'upaavirket' : foerste;
  return svar.standpunkter.map((s): Standpunktsvirkning => {
    const virkning = (): Virkning => {
      if (s.art === 'rettidighet')
        return s.hjemmel === '34.1.2'
          ? hele
            ? 1
            : 'uten_virkning'
          : posten
            ? foerste
            : 'uten_virkning';
      if (s.art === 'beloep' && s.saerskilt) return foerste + Number(posten);
      return ellers;
    };
    return { standpunkt: s.id, art: s.art, virkning: virkning() };
  });
}

/**
 * OV-U4: kravene i et registrert brev er dokumentasjon og får ingen virkning. Utledningen
 * og `innsigelsenPaaberoper` leser regelen herfra (#787).
 */
export const kravetErDokumentasjon = (d: Pick<Dokument, 'opplysninger'>): boolean =>
  erRegistrert(d.opplysninger);

/**
 * VS-U24: en egen innsigelse er en påberopelse etter én bestemmelse bare når det den
 * gjelder, bare kan komme for sent etter den: varselet etter § 33.4 i fristen, varselet
 * etter § 34.1.2 i vederlaget (VS-U24, OV-U5), og TEs
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
): Hjemmel | null {
  for (const d of dokumenter) {
    const utsagn = d.utsagn.find((x) => x.id === gjelder);
    // VS-U29: begrunnelsen etter § 33.6.2 annet ledd b kan bare komme for sent etter § 33.6.2.
    if (utsagn)
      return utsagn.art === 'varsel'
        ? utsagn.hjemmel
        : utsagn.art === 'foresporselssvar'
          ? '33.6.2'
          : null;
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
 * innsigelsen, i rekkefølgen de ble sendt. Taushet gir den ikke opp. Etter § 33.6.2 har
 * saken én forespørsel (VS-U31), så standpunktet gjelder begrunnelsen innsigelsen gjelder
 * (VS-U29, HF-U4).
 */
export function innsigelsenErOppgitt(
  spor: Spor,
  etter: Pick<Svar, 'spor' | 'standpunkter'>[],
  hjemmel: Hjemmel = HJEMMEL[spor]
): boolean {
  const standpunkter = etter
    .filter((x) => x.spor === spor)
    .flatMap((x) => x.standpunkter)
    .filter(
      (p): p is Extract<Standpunkt, { art: 'rettidighet' }> =>
        p.art === 'rettidighet' && p.hjemmel === hjemmel
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

export const prinsipalt = (v: Standpunktsvirkning[]) => v.find((p) => p.virkning === 1);
/**
 * Et standpunkt i første lag avviser kravet uavhengig av beløpet eller dagene: en preklusjon
 * eller «ingen hindring». En begrensning etter § 34.1.3 avviser aldri hele kravet (VS-U5).
 */
function avvisesPrinsipalt(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  return v.some((p) => {
    if (p.virkning !== 1) return false;
    const s = svar.standpunkter.find((x) => x.id === p.standpunkt);
    return s?.art === 'hindring' || (s?.art === 'rettidighet' && s.hjemmel !== '34.1.3');
  });
}

/** Begrensningen etter § 34.1.3 har virkning i svaret (VS-U5, OV-U22). */
function begrensningen(svar: Svarinnhold, v: Standpunktsvirkning[]) {
  return svar.standpunkter.find(
    (s): s is Extract<Standpunkt, { art: 'rettidighet' }> =>
      s.art === 'rettidighet' &&
      s.hjemmel === '34.1.3' &&
      v.some((p) => p.standpunkt === s.id && laget(p.virkning) !== null)
  );
}

/**
 * Det byggherren godtar prinsipalt i vederlaget, av postene og begrensningen i brevet
 * (OV-U26, OV-U27): posten etter § 34.1.3 annet ledd med beløpet etter en virksom begrensning.
 */
function prinsipaltBeloep(svar: Svarinnhold, v: Standpunktsvirkning[]): number {
  const begrenset = begrensningen(svar, v)?.begrenset;
  const poster = svar.standpunkter.flatMap((s) =>
    s.art !== 'beloep' ? [] : [s.saerskilt && begrenset !== undefined ? begrenset : s.godkjent]
  );
  return tilTall(poster.reduce((a, b) => a + beloep(b)!, 0n));
}

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
  return svar.spor === 'grunnlag' && v.some((p) => p.art === 'rettidighet' && p.virkning === 1);
}

/** Det svaret gir i sporet når standpunktene har denne virkningen. */
function utfall(svar: Svarinnhold, v: Standpunktsvirkning[]): Utfall {
  const prekludert = avvisesPrinsipalt(svar, v);
  if (svar.spor === 'grunnlag') return {};
  if (svar.spor === 'vederlag') return { beloep: prekludert ? 0 : prinsipaltBeloep(svar, v) };
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
  if (avvisesPrinsipalt(svar, v)) return false;
  if (svar.spor === 'grunnlag') return standpunktet(svar, 'grunnlag')?.resultat === 'godkjent';
  // Arbeidsvalget i #479: et tilbud byggherren ikke aksepterer (§ 34.2.2), eller en
  // påberopelse etter § 33.6.1 i et lag, gir aldri sammenfall. Leses av standpunktene.
  if (standpunktet(svar, 'metode')?.aksepterer === false) return false;
  const spesifisering = standpunktet(svar, 'spesifisering');
  if (spesifisering && v.some((p) => p.standpunkt === spesifisering.id && laget(p.virkning)))
    return false;
  // HF-U7: en begrensning etter § 34.1.3 i et lag er en påberopelse med subsidiært standpunkt
  // og gir ikke sammenfall, også når beløpet etter den er likt det krevde (VS-U5).
  if (begrensningen(svar, v)) return false;
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
 * (vedtaket 05.10 om avslag sammen med § 32.2). Leddene ordnes og etiketteres som i
 * brevteksten (HF-U2, VS-U3), med lagene i sporet flyttet ned med `forskyvning`, lagene
 * svaret på grunnlaget opptar foran sporet (OV-U32, OV-U33, svaret i #1199).
 */
function beslutningslinje(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  grunnlagskrav: Krav | null | undefined,
  forskyvning: number
): string {
  const spesifisert = standpunktet(svar, 'spesifisering');
  // Fristsvaret kan prekludere etter både § 33.4 og § 33.6.2 tredje ledd (VS-U17). Begge er
  // prinsipale, så de er ett ledd med den prinsipale grunnen (vedtaket 05.10).
  // Et upåvirket standpunkt eller et uten virkning er ingen grunn (OV-U32, HF-U2).
  // Begrensningen etter § 34.1.3 er ingen preklusjon, men et eget ledd (VS-U5).
  const begrenset = begrensningen(svar, v);
  const prekluderende = v
    .filter((p) => p.art === 'rettidighet' && laget(p.virkning) && p.standpunkt !== begrenset?.id)
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
      laget(p.virkning) &&
      (p.art !== 'rettidighet' || p.standpunkt === prekluderende[0])
  );
  const virkning = (id: string) => v.find((p) => p.standpunkt === id)!.virkning;
  const sine: { tekst: string; virkning: Virkning }[] = [];
  if (svar.spor === 'grunnlag') {
    const g = standpunktet(svar, 'grunnlag')!;
    sine.push({ tekst: GRUNNLAGSSVARET[g.resultat], virkning: virkning(g.id) });
  } else if (svar.spor === 'vederlag') {
    // OV-U26: hver post for seg når kravet har posten etter § 34.1.3 annet ledd, med
    // begrensningen som eget ledd foran posten.
    const poster = svar.standpunkter.filter(
      (s): s is Extract<Standpunkt, { art: 'beloep' }> => s.art === 'beloep'
    );
    const delt = poster.some((b) => b.saerskilt);
    const ikkeAkseptert =
      standpunktet(svar, 'metode')?.aksepterer === false
        ? ', tilbudet ikke akseptert (§ 34.2.2)'
        : '';
    poster.forEach((b, i) => {
      const hva = !delt
        ? ''
        : b.saerskilt
          ? ` for ${SAERSKILT_I_LINJEN}`
          : ' for justeringen ellers';
      if (b.saerskilt && begrenset)
        sine.push({
          tekst: `begrenset etter § 34.1.3 til ${kroner(begrenset.begrenset!)}`,
          virkning: virkning(begrenset.id),
        });
      const tekst =
        beloep(b.godkjent) === 0n ? `avslått${hva}` : `godkjent med ${kroner(b.godkjent)}${hva}`;
      sine.push({ tekst: tekst + (i === 0 ? ikkeAkseptert : ''), virkning: virkning(b.id) });
    });
  } else {
    const d = standpunktet(svar, 'dager')!;
    sine.push({
      tekst: d.resultat === 'avslaatt' ? 'avslått' : `godkjent med ${d.vurdert} dager`,
      virkning: virkning(d.id),
    });
  }
  const ledd = [
    ...grunner.map((p) => ({ tekst: grunntekst[p.art], virkning: p.virkning })),
    ...sine,
  ];
  // OV-U32, OV-U33: etiketten følger det fryste laget, én gang for hvert lag og bare når svaret
  // har mer enn ett lag. Et upåvirket standpunkt står uten etikett. Som i brevteksten.
  const plass = ({ virkning }: (typeof ledd)[number]) => {
    const lag = laget(virkning);
    return lag === null ? null : lag + forskyvning;
  };
  const ordnet = ledd.some((l) => (plass(l) ?? 0) > 1);
  const merket = new Set<number>();
  const etikettert = (l: (typeof ledd)[number]) => {
    const lag = plass(l);
    if (!ordnet || lag === null || merket.has(lag)) return l.tekst;
    merket.add(lag);
    return `${etikett(lag)} ${l.tekst}`;
  };
  return `Byggherrens standpunkt: ${ledd.map(etikettert).join(', ')}.`;
}

/** Posten etter § 34.1.3 annet ledd i linjen. */
const SAERSKILT_I_LINJEN = 'særskilt justering (§ 34.1.3 annet ledd)';

/** Laget standpunktet står i, eller `null` når det er upåvirket eller uten virkning (OV-U32). */
export const laget = (virkning: Virkning): number | null =>
  typeof virkning === 'number' ? virkning : null;

/**
 * Etiketten for laget, med ordene i LV-U4 punkt 4: «videre subsidiært» for hvert lag fra det
 * tredje. Lik etikett betyr ikke samme lag (OV-U32).
 */
export const etikett = (lag: number): string =>
  lag === 1 ? 'prinsipalt' : lag === 2 ? 'subsidiært' : 'videre subsidiært';

/**
 * OV-U32, OV-U33: lagene standpunktene i svaret på grunnlaget opptar foran vederlag og
 * frist i brevet, ett for preklusjonen etter § 32.2 og ett for avslaget. Et frafall
 * flytter ikke lagene (GR-U7). Linjen leser det herfra; brevteksten skriver ett ledd for
 * hver av de samme grunnene (`grunnerFraGrunnlaget`).
 */
export const lagFraGrunnlaget = (g: Svarinnhold | undefined, v: Standpunktsvirkning[]): number =>
  g ? grunnerFraGrunnlaget(g, v).length : 0;

/**
 * Brevet frosset når det sendes (MM-U9, MM-U11). For grunnlaget fryses også om
 * § 32.2 gjaldt kategorien i kravversjonen (GR-U12). `forskyvning` er `lagFraGrunnlaget`
 * for svaret på grunnlaget brevteksten setter foran sporet, og 0 for grunnlaget selv.
 */
export function beslutningsgrunnlag(
  svar: Svarinnhold,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett,
  forskyvning: number
): Beslutningsgrunnlag {
  const v = virkninger(svar, grunnlagskrav, regler, forskyvning);
  return {
    regelversjon: regler.versjon,
    virkninger: v,
    linje: beslutningslinje(svar, v, grunnlagskrav, forskyvning),
    sammenfall: godkjennerHeleKravet(svar, v),
    ...(svar.spor === 'grunnlag'
      ? { varslingsplikt: gjelderVarslingsplikten(grunnlagskrav, regler) }
      : {}),
  };
}

/**
 * Virkningen hvert standpunkt har, utenom standpunkter uten virkning. Et standpunkt som
 * mangler, er uten virkning. Et upåvirket standpunkt har samme virkning som et i første lag:
 * ingen innsigelse i sporet rammer det (OV-U32, OV-U33).
 */
function medVirkning(v: Standpunktsvirkning[]): Map<string, number> {
  return new Map(
    v.flatMap((p) =>
      p.virkning === 'uten_virkning'
        ? []
        : [[p.standpunkt, p.virkning === 'upaavirket' ? 1 : p.virkning] as const]
    )
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
    // Rigg og drift etter § 34.1.3 første ledd er ikke i kjernen (#1171).
    if (v.rigg_varslet_i_tide === false)
      return 'preklusjon etter § 34.1 (rigg_varslet_i_tide) er ikke i kjernen ennå';
    if ((v.rigg_vurdering ?? null) !== null)
      return 'kravet om rigg og drift (§ 34.1.3 første ledd) er ikke i kjernen ennå';
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
  produktivitet_vurdering?: unknown;
  produktivitet_godkjent_belop?: unknown;
  produktivitet_varslet_i_tide?: unknown;
  produktivitet_begrenset_belop?: unknown;
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
 * Et krevd beløp i vederlagskravet, i øre, eller `null` når det ikke står i kravet. Et
 * beløp som ikke er et tall, kaster `Error` og ikke `UgyldigBeloep`: det står i kravet,
 * så det er en feil på serveren og ikke byggherrens ugyldige vurdering (#766).
 */
function lesKrevd(krav: Krav, verdi: unknown): Oere | null {
  try {
    return beloep(verdi as number | undefined);
  } catch (feil) {
    if (!(feil instanceof UgyldigBeloep)) throw feil;
    throw new Error(`Det krevde beløpet i kravet ${krav.id} kan ikke leses: ${feil.message}.`);
  }
}

/** OV-U23: kravet krever posten etter § 34.1.3 annet ledd (`saerskilt.produktivitet`). */
export const harProduktivitetspost = (krav: Krav): boolean =>
  (krav.innhold.saerskilt as { produktivitet?: unknown } | undefined)?.produktivitet !== undefined;

/** OV-U23: kravet har et beløp for justeringen ellers, i tillegg til eller uten posten. */
export const harHovedbeloep = (krav: Krav): boolean => krav.innhold.beloep !== undefined;

/**
 * Det krevde hovedbeløpet i vederlagskravet, i øre, slik utregningen, kontrollen av
 * begrunnelsen og brevet leser det (#508). Mangler det, kaster den `Error`; et krav
 * med bare posten etter § 34.1.3 leses med `harHovedbeloep` først (OV-U23).
 */
export function krevdBeloep(krav: Krav): Oere {
  const krevd = lesKrevd(krav, krav.innhold.beloep);
  if (krevd === null) throw new Error(`Det krevde beløpet mangler i kravet ${krav.id}.`);
  return krevd;
}

/** Det krevde beløpet i posten etter § 34.1.3 annet ledd, i øre, eller `null` uten posten. */
export const krevdProduktivitet = (krav: Krav): Oere | null =>
  lesKrevd(
    krav,
    (krav.innhold.saerskilt as { produktivitet?: { beloep?: unknown } } | undefined)?.produktivitet
      ?.beloep
  );

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
    const post = krevdProduktivitet(krav);
    // OV-U23, OV-U26: byggherren tar stilling til postene kravet har, og bare dem (#520).
    const utenPost: [boolean, (keyof Svarvurdering)[]][] = [
      [harHovedbeloep(krav), ['hovedkrav_vurdering', 'hovedkrav_godkjent_belop']],
      [
        post !== null,
        [
          'produktivitet_vurdering',
          'produktivitet_godkjent_belop',
          'produktivitet_varslet_i_tide',
          'produktivitet_begrenset_belop',
        ],
      ],
    ];
    for (const [harPosten, felter] of utenPost)
      for (const felt of felter)
        if (!harPosten && v[felt] != null)
          throw new UgyldigVurdering({ [felt]: 'kravet har ikke denne posten (OV-U23)' });
    const vkrav: Vederlagskrav = {
      hovedkrav_belop: harHovedbeloep(krav) ? tilTall(krevdBeloep(krav)) : null,
      metode: 'tilbud',
      rigg_belop: null,
      produktivitet_belop: post === null ? null : tilTall(post),
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
    // VS-U3, B-13: ved preklusjon etter § 34.1.2 og ved begrensningen etter § 34.1.3 står det
    // vurderte beløpet subsidiært (VS-U5).
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

/**
 * OV-U26, OV-U31: beløpet byggherren godtar for hver post i vederlagskravet uten
 * begrensningen etter § 34.1.3, i rekkefølgen brevet lagrer dem: justeringen ellers og
 * posten etter annet ledd (`saerskilt`). Regnet med regelsettet som utregningen.
 */
export function vederlagsposter(
  v: Svarvurdering,
  krav: Krav
): { godkjent: number; saerskilt?: 'produktivitet' }[] {
  const post = (vurdering: unknown, krevd: Oere, delvis: unknown) =>
    tilTall(
      beregnGodkjentBeloep(
        vurdering as Beloepsvurdering,
        krevd,
        beloep(delvis as number | null | undefined)
      )
    );
  const produktivitet = krevdProduktivitet(krav);
  return [
    ...(harHovedbeloep(krav)
      ? [{ godkjent: post(v.hovedkrav_vurdering, krevdBeloep(krav), v.hovedkrav_godkjent_belop) }]
      : []),
    ...(produktivitet === null
      ? []
      : [
          {
            godkjent: post(
              v.produktivitet_vurdering,
              produktivitet,
              v.produktivitet_godkjent_belop
            ),
            saerskilt: 'produktivitet' as const,
          },
        ]),
  ];
}

/** Det samlede krevde beløpet i vederlagskravet: justeringen ellers og posten (OV-U23). */
export const krevdSamlet = (krav: Krav): Oere =>
  (harHovedbeloep(krav) ? krevdBeloep(krav) : 0n) + (krevdProduktivitet(krav) ?? 0n);

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
