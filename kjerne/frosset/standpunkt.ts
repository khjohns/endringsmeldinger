/**
 * Virkningen av standpunktene i ett svar. `frysing.ts` setter sammen
 * beslutningsgrunnlaget av virkningene når brevet sendes. Klienten og serveren regner med de
 * samme funksjonene; serveren sammenlikner (B-13, 2.5 i modellforslaget).
 *
 * Reglene regner virkningene bare når brevet skrives. Etter det leses de fra
 * beslutningsgrunnlaget (MM-U9). Visningen kan regne dem igjen med dagens regler
 * for å vise at regelen er endret, men ingen regel leser det.
 *
 * Svarets egne standpunkter skilles fra om hele svaret er subsidiært til
 * forholdet. Det siste er en relasjon mellom brevene som utledes ved lesing
 * (vedtaket 05.10), og vilkåret i enighetsgrunnlaget (GR-U7).
 */

import { beloep, tilTall } from '../regler/beloep.ts';
import { lagIKravposten } from '../regler/vederlag.ts';
import type { Subsidiaergrunn } from '../regler/forhold.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { erRegistrert } from '../format/leser.ts';
import { HJEMMEL } from '../format/format.ts';
import { utregningIFristen, utregningIVederlaget } from '../format/svarinnhold.ts';
import { kategori } from '../format/kravinnhold.ts';
import { erKravpostvarselhjemmel, utenGren } from '../typer.ts';
import type {
  Beslutningsgrunnlag,
  Dokument,
  Enighetsgrunnlag,
  Hjemmel,
  Kravpostvarselhjemmel,
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

/** To påberopelsesversjoner har samme hovedkategori og underkategori (GR-U22). */
export function sammeKategori(a: Pick<Krav, 'innhold'>, b: Pick<Krav, 'innhold'>): boolean {
  const [x, y] = [kategori(a), kategori(b)];
  return x.hovedkategori === y.hovedkategori && x.underkategori === y.underkategori;
}

/** Varslingsplikten i § 32.2 gjelder kategorien i påberopelsen (GR-U11). */
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
  paaberopelse: Krav | null | undefined,
  regler: Regelsett
): boolean {
  if (hjemmel === '33.4' || hjemmel === '33.6.2' || hjemmel === '34.1.3') return true;
  if (hjemmel === '34.1.2')
    return regler.gjelderVarslingspliktenForVederlag(kategori(paaberopelse).hovedkategori);
  return gjelderVarslingsplikten(paaberopelse, regler);
}

/**
 * Virkningen av hvert standpunkt i svaret etter regelsettet, regnet når brevet
 * skrives. `påberopelse` er kravet et svar på påberopelsen gjelder. Laget er et nummer fra 1.
 * Hver grunn med virkning åpner et nytt lag for standpunktene etter den, og påberopelsene
 * av rettidighet står i det første (OV-U32, vedtaket 05.10). `forskyvning` er lagene
 * svaret på forholdet opptar foran sporet (`lagFraForholdet`).
 */
export function virkninger(
  svar: Svarinnhold,
  paaberopelse: Krav | null | undefined,
  regler: Regelsett,
  forskyvning = 0
): Standpunktsvirkning[] {
  if (svar.spor === 'vederlag') return vederlagsvirkninger(svar, paaberopelse, regler, forskyvning);
  if (svar.spor !== 'forhold' && svar.spor !== 'frist') return utenGren(svar.spor);
  const ut: Standpunktsvirkning[] = [];
  let lag = 1;
  const iLaget = () => lag;
  for (const s of svar.standpunkter) {
    if (s.art === 'rettidighet') {
      const virker = !s.iTide && hjemmelenGjelder(s.hjemmel, paaberopelse, regler);
      if (virker) lag = 2;
      ut.push({ standpunkt: s.id, art: s.art, virkning: virker ? 1 : 'uten_virkning' });
    } else if (s.art === 'oppgjoersform' && s.aksepterer) {
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
    } else if (
      s.art === 'forhold' ||
      s.art === 'beloep' ||
      s.art === 'oppgjoersform' ||
      s.art === 'justering' ||
      s.art === 'dager'
    ) {
      ut.push({ standpunkt: s.id, art: s.art, virkning: iLaget() });
    } else utenGren(s);
  }
  return ut;
}

/**
 * OV-U27, OV-U33, KA-U60, KA-U64: lagene i vederlaget. Påberopelsen etter § 34.1.2 gjelder hele
 * kravet og står i det første laget. I laget etter står begrensningen etter § 34.1.3, som bare
 * rammer den særskilte posten: den står i laget etter (arbeidsvalg 1.3 i spørsmålsfila 09.11
 * for #1663). Et tilbud som ikke er akseptert, gir ikke et eget lag, fordi svaret da ikke tar
 * stilling til beløpet (KA-U72): standpunktene for posten står i det første laget. En post som
 * ingen innsigelse rammer, er upåvirket, så sant
 * forholdet verken er avslått eller prekludert (OV-U33), og ellers i laget etter § 34.1.2
 * (arbeidsvalg 1.1).
 */
function vederlagsvirkninger(
  svar: Svarinnhold,
  paaberopelse: Krav | null | undefined,
  regler: Regelsett,
  forskyvning: number
): Standpunktsvirkning[] {
  const sent = (hjemmel: Hjemmel) =>
    svar.standpunkter.some(
      (s) =>
        s.art === 'rettidighet' &&
        s.hjemmel === hjemmel &&
        !s.iTide &&
        hjemmelenGjelder(hjemmel, paaberopelse, regler)
    );
  const [hele, posten] = [sent('34.1.2'), sent('34.1.3')];
  const foerste = hele ? 2 : 1;
  const iKravposten = beregningsregelLag(svar.standpunkter, foerste);
  // Et tilbud byggherren ikke aksepterer, rammer bare posten, i det første laget (#1760).
  const tilbudet = new Set(
    svar.standpunkter.flatMap((s) =>
      s.art === 'oppgjoersform' && s.hjemmel === '34.2.2' && !s.aksepterer ? [s.gjelder] : []
    )
  );
  // OV-U33: upåvirket bare ved en påberopelse i sporet. Innsigelsen etter § 34.3.3, en
  // beregningsregel byggherren ikke godtar og et tilbud byggherren ikke aksepterer, rammer bare
  // posten (arbeidsvalg 1 punkt 2 i spørsmålsfila 09.11 for #1663, #1760).
  const rammer =
    posten ||
    tilbudet.size > 0 ||
    svar.standpunkter.some(
      (s) =>
        iKravposten.has(s.id) &&
        ((s.art === 'rettidighet' && s.hjemmel === '34.3.3') ||
          (s.art === 'oppgjoersform' && !s.aksepterer))
    );
  const ellers: Virkning = rammer && !hele && forskyvning === 0 ? 'upaavirket' : foerste;
  return svar.standpunkter.map((s): Standpunktsvirkning => {
    const virkning = (): Virkning => {
      if (iKravposten.has(s.id)) return iKravposten.get(s.id)!;
      if (s.art === 'rettidighet') {
        if (s.hjemmel === '34.1.2') return hele ? 1 : 'uten_virkning';
        return s.hjemmel === '34.1.3' && posten ? foerste : 'uten_virkning';
      }
      if ('gjelder' in s && s.gjelder !== undefined && tilbudet.has(s.gjelder)) return foerste;
      if (s.art === 'beloep' && s.saerskilt) return posten ? foerste + 1 : ellers;
      return ellers;
    };
    return { standpunkt: s.id, art: s.art, virkning: virkning() };
  });
}

/**
 * Laget for standpunktene til en kravpost etter en beregningsregel, etter `lagIKravposten`.
 * En kravpost der ingen standpunkter åpner et lag, er ikke med, og standpunktene står som de
 * andre. Forutsetningene i skjemaet leser lagene herfra (`kommandoer/lag.ts`).
 */
export function beregningsregelLag(
  standpunkter: Standpunkt[],
  foerste: number
): Map<string, number> {
  const ut = new Map<string, number>();
  for (const regel of standpunkter) {
    if (regel.art !== 'oppgjoersform' || regel.hjemmel === '34.2.2') continue;
    const alle = standpunkter.filter((s) => (s as { gjelder?: string }).gjelder === regel.gjelder);
    const varselet = alle.find((s) => s.art === 'rettidighet' && s.hjemmel === '34.3.3');
    const justeringen = alle.find((s) => s.art === 'justering');
    const lag = lagIKravposten(
      {
        godtarRegelen: regel.aksepterer,
        varselForSent: varselet?.art === 'rettidighet' && !varselet.iTide,
        justering: justeringen !== undefined,
      },
      foerste
    );
    if (!lag) continue;
    const sett = (s: Standpunkt | undefined, l: number | null) => {
      if (s && l !== null) ut.set(s.id, l);
    };
    sett(regel, lag.regelen);
    sett(varselet, lag.varselet);
    sett(justeringen, lag.justeringen);
    sett(
      alle.find((s) => s.art === 'beloep'),
      lag.beloepet
    );
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
 * gjelder, bare kan komme for sent etter den: varselet etter § 33.4 i fristen, varselet
 * etter § 34.1.2 i vederlaget (VS-U24, OV-U5), og TEs
 * varsel etter § 32.2 i forholdet, som er påberopelsen når § 32.2 gjelder kategorien
 * i det (GR-U11). Varselet etter § 32.2 er det samme i hver påberopelsesversjon
 * (arbeidsvalget 15.10 i #500). Svaret i sporet gjentar den eller gir den opp. Mot et
 * annet krav eller et svar er den uten virkning. Et krav i et registrert brev er
 * dokumentasjon (OV-U4), så en innsigelse mot det er heller ingen påberopelse; byggherren
 * påberoper § 32.2 i svaret (arbeidsvalg 1 i #770). Kommandoene, utledningen og
 * brevteksten finner det innsigelsen gjelder, i `dokumenter` her (#536). `varslingsplikt`
 * sier om § 32.2 gjelder kategorien: brevteksten spør regelsettet når brevet skrives,
 * utledningen leser det som er frosset (MM-U43 punkt 8, #776).
 */
export function innsigelsenPaaberoper(
  gjelder: string,
  dokumenter: Iterable<Pick<Dokument, 'krav' | 'utsagn' | 'opplysninger'>>,
  varslingsplikt: (krav: Krav) => boolean
): Hjemmel | Kravpostvarselhjemmel | null {
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
      return krav.spor === 'forhold' && !kravetErDokumentasjon(d) && varslingsplikt(krav)
        ? '32.2'
        : null;
  }
  return null;
}

/**
 * VS-U9, VS-U11, HF-U4: parten har gitt opp sin påberopelse i en egen innsigelse når et
 * senere svar fra parten i sporet sier at varselet kom i tide. I fristen gir hvert «i tide»
 * etter § 33.4 den opp, fordi parten er bundet av det (VS-U20, arbeidsvalget 15.10 i #309).
 * I forholdet teller partens siste standpunkt etter § 32.2, også om en annen
 * påberopelsesversjon (arbeidsvalget 15.10 i #500). `etter` er partens svar etter
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
 * § 33.6.2 (VS-U17, VS-U19, VS-U27): svaret på hver forespørsel. TEs begrunnelse etter annet
 * ledd b og fristkravet svarer på forespørselen de uttrykkelig viser til i `gjelder`, aldri
 * etter rekkefølgen i journalen (HF-U1, LV-U18 punkt 3). Et krav i et registrert brev er
 * dokumentasjon og svarer ikke (OV-U4). Gir forespørselen og elementet som svarte, eller `null`.
 */
export function svarPaaForesporsler(
  dokumenter: Iterable<Pick<Dokument, 'krav' | 'utsagn' | 'opplysninger'>>
): ForesporselOgSvar[] {
  const ut: ForesporselOgSvar[] = [];
  const ubesvart = (gjelder: string | undefined) =>
    ut.find((x) => x.foresporsel === gjelder && x.svar === null);
  for (const d of dokumenter) {
    for (const u of d.utsagn) {
      if (u.art === 'foresporsel') ut.push({ foresporsel: u.id, svar: null, medKrav: false });
      if (u.art === 'foresporselssvar') {
        const f = ubesvart(u.gjelder);
        if (f) f.svar = u.id;
      }
    }
    if (kravetErDokumentasjon(d)) continue;
    for (const krav of d.krav) {
      const f = krav.spor === 'frist' ? ubesvart(krav.gjelder) : undefined;
      if (f) Object.assign(f, { svar: krav.id, medKrav: true });
    }
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
    // Innsigelsene etter § 34.3.3 og § 34.4 rammer bare kravposten (KA-U64, VS-U56).
    return (
      s?.art === 'hindring' ||
      (s?.art === 'rettidighet' && (s.hjemmel === '34.1.2' || !s.hjemmel.startsWith('34')))
    );
  });
}

/** Begrensningen etter § 34.1.3 har virkning i svaret (VS-U5, OV-U22). */
export function begrensningen(svar: Svarinnhold, v: Standpunktsvirkning[]) {
  return svar.standpunkter.find(
    (s): s is Extract<Standpunkt, { art: 'rettidighet' }> =>
      s.art === 'rettidighet' &&
      s.hjemmel === '34.1.3' &&
      v.some((p) => p.standpunkt === s.id && laget(p.virkning) !== null)
  );
}

/** Laget i brevet og etiketten for det, eller `null` for et standpunkt uten lag (OV-U32). */
export interface Plass {
  lag: number | null;
  etikett: string | null;
}

/**
 * Plassen hvert standpunkt i svaret har i brevet, og plassen til hver grunn fra svaret på
 * forholdet som står foran sporet (OV-U32, OV-U33). `forskyvning` er lagene de grunnene opptar
 * (`forskyvningIBrevet`), og 0 for forholdet selv. Etiketten følger brevteksten: bare når
 * svaret har mer enn ett lag. `grunn(i)` er den i-te grunnen, fra 0.
 */
export function plassene(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  forskyvning: number
): { standpunkt: (id: string) => Plass; grunn: (i: number) => Plass } {
  const lagI = (id: string) => {
    const virkning = v.find((p) => p.standpunkt === id)?.virkning;
    const lag = virkning === undefined ? null : laget(virkning);
    return lag === null ? null : lag + forskyvning;
  };
  const ordnet = forskyvning > 1 || svar.standpunkter.some((s) => (lagI(s.id) ?? 0) > 1);
  const plass = (lag: number | null): Plass => ({
    lag,
    etikett: ordnet && lag !== null ? etikett(lag) : null,
  });
  return { standpunkt: (id) => plass(lagI(id)), grunn: (i) => plass(i + 1) };
}

/**
 * OV-U26, OV-U28: en post i byggherrens svar på vederlaget. `godkjent` er beløpet uten
 * begrensningen etter § 34.1.3. `begrensning` står bare når begrensningen har virkning i
 * brevet (VS-U5, OV-U22), med beløpet etter den og laget den står i.
 */
export interface Vederlagspost extends Plass {
  standpunkt: string;
  /** Kravposten beløpet gjelder (KA-U57 (c)); ikke for posten etter § 34.1.3 annet ledd. */
  gjelder?: string;
  saerskilt?: 'produktivitet';
  /** Uten beløp når tilbudet for kravposten ikke er akseptert (KA-U72). */
  godkjent?: number;
  begrensning: (Plass & { standpunkt: string; beloep: number }) | null;
}

/**
 * MM-U23, HF-U2: byggherrens påberopelse av at et varsel kom for sent, som byggherren sa den.
 * `begrenset` er beløpet byggherren oppga etter § 34.1.3. Laget er `null` når påberopelsen er
 * uten virkning; den gir da ingen post et annet beløp.
 */
export interface Paaberopt extends Plass {
  standpunkt: string;
  hjemmel: Hjemmel;
  begrenset?: number;
}

/**
 * Postene og påberopelsene i svaret på vederlaget, med lagene brevet ga dem (MM-U23, OV-U28,
 * valg 4 i #1047, `plassene`). Ingen total per lag.
 */
export function postlisten(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  forskyvning: number
): { poster: Vederlagspost[]; paaberopt: Paaberopt[] } {
  const plass = plassene(svar, v, forskyvning).standpunkt;
  const begrenset = begrensningen(svar, v);
  const poster = svar.standpunkter.flatMap((s): Vederlagspost[] =>
    s.art !== 'beloep'
      ? []
      : [
          {
            standpunkt: s.id,
            ...(s.gjelder !== undefined ? { gjelder: s.gjelder } : {}),
            ...(s.saerskilt ? { saerskilt: s.saerskilt } : {}),
            ...(s.godkjent !== undefined ? { godkjent: s.godkjent } : {}),
            ...plass(s.id),
            begrensning:
              s.saerskilt && begrenset
                ? { standpunkt: begrenset.id, beloep: begrenset.begrenset!, ...plass(begrenset.id) }
                : null,
          },
        ]
  );
  const paaberopt = svar.standpunkter.flatMap((s): Paaberopt[] =>
    s.art !== 'rettidighet' || s.iTide
      ? []
      : [
          {
            standpunkt: s.id,
            hjemmel: s.hjemmel,
            ...(s.begrenset !== undefined ? { begrenset: s.begrenset } : {}),
            ...plass(s.id),
          },
        ]
  );
  return { poster, paaberopt };
}

/**
 * Det byggherren godtar prinsipalt i vederlaget, av postene og lagene i brevet (OV-U26,
 * OV-U27): posten etter § 34.1.3 annet ledd med beløpet etter en virksom begrensning. En
 * kravpost med beløpet i et senere lag, eller uten beløp fordi tilbudet ikke er akseptert
 * (KA-U72), har ikke et fast beløp i det første og regnes ikke med (OV-U73). `uten_fast_beloep` er de kravpostene, så beløpet ikke leses som et avslag
 * (svar 6 A i #1663).
 */
function prinsipaltIVederlaget(svar: Svarinnhold, v: Standpunktsvirkning[]): Utfall {
  let beloepet = 0n;
  const uten: string[] = [];
  for (const p of postlisten(svar, v, 0).poster) {
    if (p.begrensning) beloepet += beloep(p.begrensning.beloep)!;
    else if (!p.saerskilt && ((p.lag ?? 1) > 1 || p.godkjent === undefined)) uten.push(p.gjelder!);
    else beloepet += beloep(p.godkjent)!;
  }
  return { beloep: tilTall(beloepet), ...(uten.length ? { uten_fast_beloep: uten } : {}) };
}

export function standpunktet<A extends Standpunkt['art']>(svar: Svarinnhold, art: A) {
  return svar.standpunkter.find((s): s is Extract<Standpunkt, { art: A }> => s.art === art);
}

/**
 * Byggherren aksepterer ikke tilbudet eller godtar ikke beregningsregelen for minst én kravpost
 * (§ 34.2.2, KA-U57 (d), KA-U71).
 */
export const tilbudetIkkeAkseptert = (svar: Svarinnhold): boolean =>
  svar.standpunkter.some((s) => s.art === 'oppgjoersform' && !s.aksepterer);

/**
 * Hvorfor svarene på vederlag og frist er subsidiære til svaret på påberopelsen, etter
 * standpunktene i brevet om forholdet (vedtaket 05.10, MM-U9). Utledningen og
 * brevteksten (A2) leser det samme.
 */
export function grunnerFraForholdet(
  svar: Svarinnhold,
  virkninger: Standpunktsvirkning[]
): Subsidiaergrunn[] {
  const ut: Subsidiaergrunn[] = [];
  if (prinsipalt(virkninger)?.art === 'rettidighet') ut.push('prekludert');
  if (standpunktet(svar, 'forhold')?.resultat === 'avslaatt') ut.push('avslaatt');
  return ut;
}

/**
 * GR-U7: byggherren har godkjent forholdet uten virksom preklusjon etter § 32.2,
 * eller frafalt pålegget. Leses av standpunktene og virkningen i brevet om
 * forholdet, ikke av et utfall.
 */
export function forholdetErAvklart(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  const resultat = standpunktet(svar, 'forhold')?.resultat;
  return (
    !preklusjonPaaberopt(svar, v) && (resultat === 'godkjent' || resultat === 'paalegg_frafalt')
  );
}

/**
 * MM-U13: byggherren påberoper prinsipalt preklusjon etter § 32.2 i svaret på
 * forholdet.
 * Rettidigheten i forholdet er alltid etter § 32.2 (`HJEMMEL`).
 */
function preklusjonPaaberopt(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  return svar.spor === 'forhold' && v.some((p) => p.art === 'rettidighet' && p.virkning === 1);
}

/** Det svaret gir i sporet når standpunktene har denne virkningen. */
function utfall(svar: Svarinnhold, v: Standpunktsvirkning[]): Utfall {
  const prekludert = avvisesPrinsipalt(svar, v);
  if (svar.spor === 'forhold') return {};
  if (svar.spor === 'vederlag') return prekludert ? { beloep: 0 } : prinsipaltIVederlaget(svar, v);
  if (svar.spor !== 'frist') return utenGren(svar.spor);
  if (prekludert) return { dager: 0 };
  const spesifisering = standpunktet(svar, 'spesifisering');
  if (spesifisering && prinsipalt(v)?.standpunkt === spesifisering.id)
    return { dager: spesifisering.dager! };
  const dager = standpunktet(svar, 'dager')!;
  return { dager: dager.resultat === 'avslaatt' ? 0 : dager.vurdert };
}

/**
 * Svaret godkjenner hele kravet i sporet, så standpunktene faller sammen
 * (GR-U7). For forholdet er det en godkjenning uten påberopt preklusjon
 * (GR-U10).
 */
export function godkjennerHeleKravet(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  if (avvisesPrinsipalt(svar, v)) return false;
  if (svar.spor === 'forhold') return standpunktet(svar, 'forhold')?.resultat === 'godkjent';
  // Arbeidsvalget i #479: et tilbud byggherren ikke aksepterer (§ 34.2.2), eller en
  // påberopelse etter § 33.6.1 i et lag, gir aldri sammenfall. Leses av standpunktene.
  if (tilbudetIkkeAkseptert(svar)) return false;
  // HF-U28, D-17 i BF-14: en innsigelse etter § 34.3.3 eller § 34.4 eller en bestridt justering
  // gir ikke sammenfall (arbeidsvalg 2 i spørsmålsfila 09.11 for #1663).
  if (
    svar.standpunkter.some(
      (s) =>
        (s.art === 'rettidighet' && erKravpostvarselhjemmel(s.hjemmel) && !s.iTide) ||
        (s.art === 'justering' && !s.godtar)
    )
  )
    return false;
  const spesifisering = standpunktet(svar, 'spesifisering');
  if (spesifisering && v.some((p) => p.standpunkt === spesifisering.id && laget(p.virkning)))
    return false;
  // HF-U7: en begrensning etter § 34.1.3 i et lag er en påberopelse med subsidiært standpunkt
  // og gir ikke sammenfall, også når beløpet etter den er likt det krevde (VS-U5).
  if (begrensningen(svar, v)) return false;
  const utregning =
    svar.spor === 'frist'
      ? utregningIFristen(svar.utregning)
      : utregningIVederlaget(svar.utregning);
  return utregning.resultat === 'godkjent';
}

/**
 * MM-U43 punkt 8: sammenfallet i beslutningsgrunnlaget stemmer med standpunktene og
 * virkningene i samme brev. Leses av det frosne brevet, ikke av dagens regler.
 */
export const sammenfallStemmer = (svar: Svar): boolean =>
  svar.beslutningsgrunnlag.sammenfall ===
  godkjennerHeleKravet(svar, svar.beslutningsgrunnlag.virkninger);

/**
 * Et svar på forholdet i et brev sendt i appen er en endringsordre etter § 32.3
 * første ledd a: svaret godkjenner hele kravet uten påberopt preklusjon
 * (sammenfall, GR-U10), og § 32.2 gjaldt kategorien (GR-U11, GR-U12). Leses av
 * det frosne beslutningsgrunnlaget.
 */
export function blirEndringsordre(b: Beslutningsgrunnlag): boolean {
  return b.sammenfall && b.varslingsplikt === true;
}

/** Enigheten om svaret slik brevet uttrykte det (MM-U9; KA-U10, MM-U3 og MM-U11, opphevet av MM-U50). */
export function enighetsgrunnlag(svar: Svar, kilde: Enighetsgrunnlag['kilde']): Enighetsgrunnlag {
  const { regelversjon, virkninger } = svar.beslutningsgrunnlag;
  return {
    spor: svar.spor,
    svar: svar.id,
    kilde,
    regelversjon,
    virkninger,
    utfall: utfall(svar, virkninger),
    vilkaar: svar.spor === 'forhold' ? null : 'forhold_avklart',
  };
}

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
 * OV-U32, OV-U33: lagene standpunktene i svaret på forholdet opptar foran vederlag og
 * frist i brevet, ett for preklusjonen etter § 32.2 og ett for avslaget. Et frafall
 * flytter ikke lagene (GR-U7). Linjen leser det herfra; brevteksten skriver ett ledd for
 * hver av de samme grunnene (`grunnerFraForholdet`).
 */
export const lagFraForholdet = (g: Svarinnhold | undefined, v: Standpunktsvirkning[]): number =>
  g ? grunnerFraForholdet(g, v).length : 0;

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
