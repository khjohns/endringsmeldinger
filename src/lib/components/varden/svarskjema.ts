/**
 * Det svarskjemaene for vederlaget og fristen deler (#1925): punktene som får en begrunnelse,
 * det som mangler, brevet svaret gjelder, og tekstene i skallet. Spørsmålene er sporets egne.
 */

import { erKravpostpunkt, FORBEHOLDET, INNLEDNINGEN, OVERSIKTEN } from '$kjerne/frosset/tekst';
import type { Avsnitt } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import { brevet, type Brevet } from './lesing';

/** Et svar som mangler i skjemaet: feltet, posten feltet står i, og teksten i oppsummeringen. */
export interface Mangel {
  /** ID-en til feltet, med starten skjemaet gir ID-ene sine. */
  felt: string;
  /** Posten feltet står i (`id` i `Postliste`), eller `null` for et spørsmål om hele kravet. */
  post: string | null;
  tekst: string;
}

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

// Innledningen og tabellen har ingen begrunnelse, og forbeholdet har sitt eget felt.
const UTEN_BEGRUNNELSE = new Set([INNLEDNINGEN, OVERSIKTEN, FORBEHOLDET]);

/**
 * LV-U71: ett felt for begrunnelsen per punkt i brevet, i brevets rekkefølge, lest av brevet
 * kjernen lager uten begrunnelsene, så et felt aldri gjelder et punkt brevet ikke har. KA-U53:
 * med flere kravposter sier feltet hvilken kravpost det gjelder.
 */
export function begrunnelsespunktene(avsnitt: readonly Avsnitt[]): Begrunnelsespunkt[] {
  return avsnitt.flatMap((a) => {
    if (a.punkt === undefined || UTEN_BEGRUNNELSE.has(a.punkt)) return [];
    const linjene = a.laast.split('\n\n');
    const post = erKravpostpunkt(a.punkt)
      ? linjene.find((l) => l.startsWith(`${a.punkt} `))
      : undefined;
    const navn = [a.overskrift, post].filter((x): x is string => !!x).join(': ');
    return [{ punkt: a.punkt, navn: navn || linjene[0]! }];
  });
}

/** Brevet med gjeldende krav i sporet, som svaret gjelder. */
export const kravbrevetI = (u: Utledning, spor: 'vederlag' | 'frist'): Brevet =>
  brevet(u, u.spor[spor].gjeldendeKrav!.dokument)!;

/**
 * Datoen kravet ble sendt: for registrert korrespondanse datoen TE oppgir, ikke når brevet ble
 * registrert (LV-U42, OV-U85, #1596). `null` når TE ikke har oppgitt den.
 */
export const kravetSendt = (b: Brevet): string | null =>
  b.sendt ?? (b.art === 'registrert' ? null : b.registrert);

export const SVARSKJEMA = {
  /** OV-U75: henvisningen står alene i merket ved spørsmålet. */
  hjemmel: (punkt: string) => `pkt. ${punkt}`,
  postKolonne: 'Post',
  fristKolonne: 'Frist',
  kravetKolonne: 'Kravet',
  svaretKolonne: 'Svaret, slik det står i brevet',
} as const;
