/**
 * Det siden for fristforlengelsen viser i kortet «Kravet og svaret» (BF-45, U-2–U-5, U-13), lest av
 * kjernens utledning og av svaret slik det ble sendt (MM-U50, D-1): kravet med dagene for hver frist,
 * lagene som gjelder hele kravet, lagene som er ulike per frist med dagene for hver frist, avslaget
 * av dagene for en frist med begrunnelsen i brevets ord og forbeholdet etter GR-U34 (D-11). Gjeldende
 * frist regnes av fristtabellen og forlengelsene i andre saker (D-9, KA-U77), og en ny frist av
 * gjeldende frist og dagene (G-4). Modulen avgjør ingenting selv.
 */

import { sakensKode } from '#kjerne/frosset/tekst.ts';
import { forlengetFrist } from '#kjerne/regler/hverdager.ts';
import {
  erInnsigelseIFristen,
  gjelderHeleFristkravet,
  innholdIFristen,
  utregningIFristen,
} from '#kjerne/spor/frist/format.ts';
import { datoenEtterForlengelsene } from '#kjerne/spor/frist/visning.ts';
import type { Standpunkt } from '#kjerne/typer.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
import type { Fristdato } from '#lib/kjernesak/brevtekst.ts';
import type { Brevet, Fristtabellen } from './lesing';
import { lageneISvaret, medForbehold, utenLag, type Svarlaget } from './svarlagene';

/** Dagene i et lag for én frist. */
export interface Fristlaget {
  lag: number;
  etikett: string | null;
  /** Innsigelsene laget gjelder hvis ikke fører frem, som raden heter etter (U-4). */
  vilkaar: Svarlaget['vilkaar'];
  heller: boolean;
  dager: number;
}

/** En frist i kravet som gjelder, med dagene i kravet og i lagene som er ulike per frist (U-4). */
export interface Fristen {
  id: string;
  nummer: string | null;
  navn: string;
  /** Fristen i fristtabellen, eller `null` når den ikke er registrert (KA-U79). */
  fristId: number | null;
  krevd: number;
  lagene: Fristlaget[];
  /** Byggherren avslår dagene for fristen (KA-U80, U-13), med laget og begrunnelsen i brevet. */
  avslag: { etikett: string | null; begrunnelse: string | null } | null;
}

/** Et lag som gjelder hele kravet (U-3), med dagene når laget gir alle fristene de samme. */
export interface Felleslaget extends Svarlaget {
  dager: number | null;
}

export interface KravetOgSvaretIFristen {
  kravbrev: Brevet;
  /** Brevet med svaret på kravet som gjelder, eller `null` før byggherren har svart på det. */
  svarbrev: Brevet | null;
  frister: Fristen[];
  felles: Felleslaget[];
  /** Standpunktene som brevet ga uten eget lag (U-3, OV-U42). */
  utenLag: Standpunkt[];
  /** Lagene som er ulike per frist, med vilkåret, som står én gang over fristene (U-4). */
  perFrist: Svarlaget[];
  /** Svaret ble gitt mens forholdet ikke var besvart, så forbeholdet gjelder (GR-U34, D-11). */
  forbehold: boolean;
}

/**
 * Et lag gjelder hele kravet når standpunktet i det rammer varselet, svaret på forespørselen eller
 * hindringen, eller er en grunn fra forholdet. Det leses av standpunktene, ikke av at dagene er like
 * (G-2, D-2, D-3).
 */
const gjelderAlle = (l: Svarlaget): boolean =>
  l.iSporet < 1 ||
  l.standpunkter.some(
    ({ standpunkt }) => gjelderHeleFristkravet(standpunkt) && erInnsigelseIFristen(standpunkt)
  );

const forAlleFristene = ({ standpunkt }: Svarlaget['standpunkter'][number]): boolean =>
  gjelderHeleFristkravet(standpunkt);

/**
 * Kravet som gjelder i fristen og byggherrens svar på det, eller `null` uten krav. `alle` er brevene i
 * saken (`brevene(u)`).
 */
export function kravetOgSvaretIFristen(
  u: Utledning,
  alle: Brevet[]
): KravetOgSvaretIFristen | null {
  const s = u.spor.frist;
  const krav = s.gjeldendeKrav;
  if (!krav) return null;
  const brev = (id: string) => alle.find((b) => b.id === id) ?? null;
  const kravbrev = brev(krav.dokument);
  if (!kravbrev) return null;
  const svar = s.gjeldendeSvar?.gjelder === krav.id ? s.gjeldendeSvar : null;
  const svarbrev = svar ? brev(svar.dokument) : null;
  const frister: Fristen[] = innholdIFristen(krav).frister.map((f) => ({
    id: f.id,
    nummer: f.nummer ?? null,
    navn: f.navn,
    fristId: f.frist_id ?? null,
    krevd: f.dager,
    lagene: [],
    avslag: null,
  }));
  const ut: KravetOgSvaretIFristen = {
    kravbrev,
    svarbrev,
    frister,
    felles: [],
    utenLag: [],
    perFrist: [],
    forbehold: false,
  };
  if (!svar || !svarbrev) return ut;

  const rader = new Map(utregningIFristen(svar.utregning).frister.map((r) => [r.gjelder, r]));
  const sporlag = Math.max(0, ...[...rader.values()].map((r) => r.lag.length));
  const lagene = lageneISvaret(u, svar, alle, sporlag, 'dager', erInnsigelseIFristen);
  const dagerI = (gjelder: string, l: Svarlaget) =>
    l.iSporet < 1 ? undefined : rader.get(gjelder)?.lag[l.iSporet - 1]?.dager;
  const felles = lagene.flatMap((l): Felleslaget[] => {
    if (!gjelderAlle(l)) {
      const standpunkter = l.standpunkter.filter(forAlleFristene);
      return standpunkter.length ? [{ ...l, standpunkter, dager: null }] : [];
    }
    const dagene = new Set(frister.map((f) => dagerI(f.id, l)));
    const [dager] = dagene;
    return [{ ...l, dager: dagene.size === 1 && dager !== undefined ? dager : null }];
  });
  const perFrist = lagene
    .filter((l) => !gjelderAlle(l))
    .map((l) => ({ ...l, standpunkter: l.standpunkter.filter((s) => !forAlleFristene(s)) }));
  // Byggherrens begrunnelse står per punkt i svaret, og punktet for dagene i en frist er fristen
  // (KA-U46, `temaer` i `kjerne/spor/frist/tekst.ts`).
  const begrunnelse = (frist: string) =>
    (svarbrev.avsnitt ?? [])
      .filter((a) => a.punkt === frist)
      .flatMap((a) => a.utdypning?.trim() || [])
      .join('\n\n') || null;
  const virkning = new Map(svar.beslutningsgrunnlag.virkninger.map((v) => [v.standpunkt, v]));
  const grunnlag = lagene.filter((l) => l.iSporet < 1).length;
  const avslaget = (frist: string): Fristen['avslag'] => {
    const d = svar.standpunkter.find(
      (x) => x.art === 'dager' && x.gjelder === frist && x.resultat === 'avslaatt'
    );
    if (!d) return null;
    const v = virkning.get(d.id)?.virkning;
    // Et avslag uten eget lag gjelder i alle lagene, og står uten etikett.
    const lag = typeof v === 'number' ? lagene[v + grunnlag - 1] : undefined;
    return { etikett: lag?.etikett ?? null, begrunnelse: begrunnelse(frist) };
  };
  return {
    ...ut,
    frister: frister.map((f) => ({
      ...f,
      lagene: perFrist.flatMap((l) => {
        const dager = dagerI(f.id, l);
        return dager === undefined
          ? []
          : [{ lag: l.lag, etikett: l.etikett, vilkaar: l.vilkaar, heller: l.heller, dager }];
      }),
      avslag: avslaget(f.id),
    })),
    felles,
    utenLag: utenLag(svar, 'dager'),
    perFrist,
    forbehold: medForbehold(u, svar, svarbrev),
  };
}

/** En forlengelse av fristen i en annen sak i samme kontrakt. */
export type Forlengelsen = NonNullable<Fristdato['forlengelser']>[number];

/** Saken en forlengelse står i, med koden, eller ID-en før saken har fått en kode. */
export const sakensNavn = (f: Forlengelsen): string =>
  f.sakskode ? sakensKode(f.sakskode) : f.sakId;

/** Gjeldende frist for en frist i fristtabellen (D-9, KA-U77). */
export type GjeldendeFrist =
  | { art: 'kjent'; dato: string; iKontrakten: string; forlengelser: Forlengelsen[] }
  /** En sak kjernen ikke forstår, kan ha forlenget fristen (MM-U2). */
  | { art: 'ukjent'; iKontrakten: string }
  /** Fristen er ikke registrert, eller fristtabellen kunne ikke hentes. */
  | null;

/**
 * Gjeldende frist: datoen i kontrakten med forlengelsene partene er enige om i andre saker i samme
 * kontrakt, uten saken `sakId` (KA-U77, HF-U5), regnet av kjernen (`datoenEtterForlengelsene`).
 * Forlengelsene leses av fristtabellen serveren gir (`Fristtabellinje` i `kjerne/spor/frist/visning.ts`).
 */
export function gjeldendeFrist(
  fristId: number | null,
  { datoer, sakId, ikkeForstaatt }: Fristtabellen
): GjeldendeFrist {
  const d = fristId === null ? undefined : datoer.find((x) => x.fristId === fristId);
  if (!d) return null;
  const alle = (d.forlengelser ?? []).map((f) => ({ ...f, fristId: d.fristId }));
  const dato = datoenEtterForlengelsene(d.dato, d.fristId, alle, ikkeForstaatt, sakId);
  if (dato === null) return { art: 'ukjent', iKontrakten: d.dato };
  return {
    art: 'kjent',
    dato,
    iKontrakten: d.dato,
    forlengelser: (d.forlengelser ?? []).filter((f) => f.sakId !== sakId),
  };
}

/** Ny frist ved dagene, regnet fra gjeldende frist (G-4, U-5), eller `null` uten dager eller dato. */
export const nyFrist = (gjeldende: GjeldendeFrist, dager: number): string | null =>
  gjeldende?.art === 'kjent' && dager > 0 ? forlengetFrist(gjeldende.dato, dager) : null;

/** Det største antallet dager i kravet og lagene, som skalaen er felles for (U-2). */
export const stoerstAntall = (k: KravetOgSvaretIFristen): number =>
  Math.max(0, ...k.frister.flatMap((f) => [f.krevd, ...f.lagene.map((l) => l.dager)]));

/** Dagene i hvert krav i fristen, etter brevet med kravet, i rekkefølgen i brevet (U-12). */
export function kravdagene(
  u: Utledning
): Map<string, { nummer: string | null; navn: string; dager: number }[]> {
  return new Map(
    u.spor.frist.krav.map((k) => [
      k.dokument,
      innholdIFristen(k).frister.map((f) => ({
        nummer: f.nummer ?? null,
        navn: f.navn,
        dager: f.dager,
      })),
    ])
  );
}
