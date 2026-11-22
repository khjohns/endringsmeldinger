import type { Innsigelsen } from './svarlagene';

/**
 * Det svarskjemaene for forholdet, vederlaget og fristen deler (#1925, #2009): punktene som får en begrunnelse,
 * det som mangler, brevet svaret gjelder, og tekstene i skallet. Spørsmålene er sporets egne.
 */

import { punkteneMedBegrunnelse } from '#kjerne/frosset/tekst.ts';
import type { Tema } from '#kjerne/frosset/brevdeler.ts';
import type { Avsnitt, Spor } from '#kjerne/typer.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
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

/**
 * Om kjernen sier at spørsmålet er påkrevd og ubesvart i utkastet (`ubesvart` i `Utkastlag`,
 * #2025), for hele kravet eller for posten eller fristen `gjelder`. `false` uten lag.
 */
export const ubesvart = <S extends string>(
  lag: { ubesvart: readonly { spoersmaal: S; gjelder?: string }[] } | null,
  spoersmaal: S,
  gjelder?: string
): boolean =>
  lag?.ubesvart.some((x) => x.spoersmaal === spoersmaal && x.gjelder === gjelder) ?? false;

/**
 * Om kjernen avviser svaret på spørsmålet i utkastet (`ugyldig` i `Utkastlag`), for hele kravet
 * eller for posten eller fristen `gjelder`. `false` uten lag.
 */
export const ugyldig = <S extends string>(
  lag: { ugyldig: readonly { spoersmaal: S; gjelder?: string }[] } | null,
  spoersmaal: S,
  gjelder?: string
): boolean =>
  lag?.ugyldig.some((x) => x.spoersmaal === spoersmaal && x.gjelder === gjelder) ?? false;

/**
 * Om kjernen stiller spørsmålet i utkastet, besvart eller ikke (`stilt` i `LagIFristen`, #2156),
 * for hele kravet eller for fristen `gjelder`. `true` uten lag, så spørsmålet står til kjernen har
 * svart.
 */
export const stilt = <S extends string>(
  lag: { stilt: readonly { spoersmaal: S; gjelder?: string }[] } | null,
  spoersmaal: S,
  gjelder?: string
): boolean => lag?.stilt.some((x) => x.spoersmaal === spoersmaal && x.gjelder === gjelder) ?? true;

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

/** Et felt under et punkt i skjemaet. Navnet kommer fra temaet i brevteksten. */
export interface BegrunnelseISkjemaet extends Begrunnelsespunkt {
  besvart: boolean;
}

/** Et punkt i panelet med svaret eller statusen slik den står i skjemaet. */
export interface Skjemapunkt {
  punkt: string;
  navn: string;
  beholdNavn?: boolean;
  linjer?: readonly {
    tekst: string;
    lag: string | null;
    vilkaar?: Innsigelsen[];
    heller?: boolean;
  }[];
  aktiv?: boolean;
}

/**
 * Brevets punkter i brevets rekkefølge, med brevets egne nummer og ordlyd der punktet har
 * overskrift. Med flere kravposter har bare den første posten overskriften (KA-U53), og de
 * andre står under den uten.
 */
export const punktoverskriftene = (avsnitt: readonly Avsnitt[] = []) => {
  const punktene = new Map<string, string | undefined>();
  for (const { punkt, overskrift } of avsnitt)
    if (punkt && !punktene.get(punkt)) punktene.set(punkt, overskrift || undefined);
  return punktene;
};

/**
 * Punktene i panelet i brevets rekkefølge. Et punkt med overskrift i brevet har brevets navn,
 * og står også før skjemaet har svaret. Punktene brevet ikke har, står sist.
 */
export function panelpunktene(
  punkter: readonly Skjemapunkt[],
  overskrifter: ReadonlyMap<string, string | undefined>
): Skjemapunkt[] {
  return [
    ...[...overskrifter].flatMap(([punkt, navn]) => {
      const p = punkter.find((q) => q.punkt === punkt);
      if (navn) return [{ ...p, punkt, navn: p?.beholdNavn ? `${navn} · ${p.navn}` : navn }];
      return p ? [p] : [];
    }),
    ...punkter.filter((p) => !overskrifter.has(p.punkt)),
  ];
}

export const begrunnelserForTemaene = (
  temaene: readonly Tema[],
  besvart: (punkt: string) => boolean
): BegrunnelseISkjemaet[] =>
  temaene.flatMap(({ punkt, overskrift }) =>
    overskrift === null ? [] : [{ punkt, navn: overskrift, besvart: besvart(punkt) }]
  );

/**
 * LV-U71: ett felt for begrunnelsen per punkt i brevet, i brevets rekkefølge, lest av brevet
 * kjernen lager uten begrunnelsene, så et felt aldri gjelder et punkt brevet ikke har. KA-U53:
 * med flere kravposter sier feltet hvilken kravpost det gjelder.
 */
export const begrunnelsespunktene = (avsnitt: readonly Avsnitt[]): Begrunnelsespunkt[] =>
  punkteneMedBegrunnelse(avsnitt).map((p) => ({
    punkt: p.punkt,
    navn: [p.overskrift, p.kravpost].filter((x): x is string => !!x).join(': ') || p.foerstIPunktet,
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
