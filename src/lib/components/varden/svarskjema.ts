/**
 * Det svarskjemaene for forholdet, vederlaget og fristen deler (#1925, #2009): punktene som får en begrunnelse,
 * det som mangler, brevet svaret gjelder, og tekstene i skallet. Spørsmålene er sporets egne.
 */

import { punkteneMedBegrunnelse } from '$kjerne/frosset/tekst';
import type { Avsnitt, Spor } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import { brevet, type Brevet } from './lesing';
import type { Mangel } from './mangler';

/**
 * Feltene som mangler et svar, med starten `prefiks` på ID-en. `tekst` er `null` for et felt som
 * er besvart.
 */
export const manglene = (
  prefiks: string,
  felt: readonly { felt: string; post: string | null; tekst: string | null }[]
): Mangel[] =>
  felt.flatMap((m) => (m.tekst ? [{ ...m, felt: `${prefiks}-${m.felt}`, tekst: m.tekst }] : []));

/** Lista over postene, så oppsummeringen kan åpne posten et felt står i (`Postliste`). */
export interface Postvelger {
  erAapen(id: string): boolean;
  aapne(id: string, fokus?: string): Promise<void>;
  velg(id: string): void;
}

/** Et punkt i brevet som får et felt for begrunnelsen, med navnet feltet har. */
export interface Begrunnelsespunkt {
  punkt: string;
  navn: string;
}

/**
 * LV-U71: ett felt for begrunnelsen per punkt i brevet, i brevets rekkefølge, lest av brevet
 * kjernen lager uten begrunnelsene, så et felt aldri gjelder et punkt brevet ikke har. KA-U53:
 * med flere kravposter sier feltet hvilken kravpost det gjelder.
 */
export const begrunnelsespunktene = (avsnitt: readonly Avsnitt[]): Begrunnelsespunkt[] =>
  punkteneMedBegrunnelse(avsnitt).map((p) => ({
    punkt: p.punkt,
    navn: [p.overskrift, p.kravpost].filter((x) => !!x).join(': ') || p.foerst,
  }));

/** Brevet med gjeldende krav i sporet, som svaret gjelder. */
export const kravbrevetI = (u: Utledning, spor: Spor): Brevet =>
  brevet(u, u.spor[spor].gjeldendeKrav!.dokument)!;

/**
 * Datoen kravet ble sendt: for registrert korrespondanse datoen TE oppgir, ikke når brevet ble
 * registrert (LV-U42, OV-U85, #1596). `null` når TE ikke har oppgitt den.
 */
export const kravetSendt = (b: Brevet): string | null =>
  b.sendt ?? (b.art === 'registrert' ? null : b.registrert);

export const SVARSKJEMA = {
  postKolonne: 'Post',
  fristKolonne: 'Frist',
  kravetKolonne: 'Kravet',
  svaretKolonne: 'Svaret, slik det står i brevet',
  /** Den skjulte etiketten for svaret i hver rad, der overskriften står over kolonnen. */
  svaret: 'Svaret',
  forkastTekst:
    'Valgene og begrunnelsene du har skrevet i utkastet, slettes. Det kan ikke gjøres om.',
  kompaktLinje: 'Hovedlinjene og brevkontrollen',
} as const;
