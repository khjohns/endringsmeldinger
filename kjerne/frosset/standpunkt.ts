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

import type { Regelsett } from '../regler/regelsett.ts';
import {
  type Svarinnhold,
  type Svarsfrysing,
  iSporet,
  kravetErDokumentasjon,
} from './byggeklosser.ts';
import { FRYSING_I_FORHOLDET } from '../spor/forhold/frysing.ts';
import { FRYSING_I_VEDERLAGET } from '../spor/vederlag/frysing.ts';
import { FRYSING_I_FRISTEN } from '../spor/frist/frysing.ts';
import { HJEMMEL } from '../format/format.ts';
import type {
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
} from '../typer.ts';

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
  return frysingI(svar.spor).virkninger(svar, paaberopelse, regler, forskyvning);
}

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
  if (frysingI(spor).hvertITideGirOppInnsigelsen) return standpunkter.some((p) => p.iTide);
  return standpunkter.at(-1)?.iTide === true;
}

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

/** Det svaret gir i sporet når standpunktene har denne virkningen. */
function utfall(svar: Svarinnhold, v: Standpunktsvirkning[]): Utfall {
  return frysingI(svar.spor).utfall(svar, v, avvisesPrinsipalt(svar, v));
}

/**
 * Svaret godkjenner hele kravet i sporet, så standpunktene faller sammen
 * (GR-U7). For forholdet er det en godkjenning uten påberopt preklusjon
 * (GR-U10).
 */
export function godkjennerHeleKravet(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  if (avvisesPrinsipalt(svar, v)) return false;
  return frysingI(svar.spor).godkjennerHeleKravet(svar, v);
}

/** Frysingen i sporet (`iSporet`). */
const frysingI = (spor: Spor): Svarsfrysing => iSporet(FRYSING, spor);

/** Frysingen i hvert spor. */
const FRYSING: Record<Spor, Svarsfrysing> = {
  forhold: FRYSING_I_FORHOLDET,
  vederlag: FRYSING_I_VEDERLAGET,
  frist: FRYSING_I_FRISTEN,
};

/**
 * MM-U43 punkt 8: sammenfallet i beslutningsgrunnlaget stemmer med standpunktene og
 * virkningene i samme brev. Leses av det frosne brevet, ikke av dagens regler.
 */
export const sammenfallStemmer = (svar: Svar): boolean =>
  svar.beslutningsgrunnlag.sammenfall ===
  godkjennerHeleKravet(svar, svar.beslutningsgrunnlag.virkninger);

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
    vilkaar: frysingI(svar.spor).vilkaar,
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
