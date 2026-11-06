/**
 * Det Varden viser av saken, lest av kjernens utledning (#1331): brevene med sporene de
 * hører til, datoene partene har oppgitt, og standpunktene i et svar med laget kjernen
 * gir dem. Modulen avgjør ingenting selv. Hvilke handlinger som er mulige, hva et brev
 * sier og hva en aksept gir, kommer fra kjernen gjennom `lagKjernesak`.
 */

import { omtalen } from '$kjerne/frosset/brevtekst';
import { grunnerFraForholdet, plassene } from '$kjerne/frosset/standpunkt';
import { foersteUnderkategori, type Subsidiaergrunn } from '$kjerne/regler/forhold';
import type { Avsnitt, Dokument, Part, Spor, Standpunkt, Svar } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';

/**
 * Ett brev i saken. `nummer` er brevets nummer i saken, som brevteksten kaller «brev 5»
 * (LV-U44), og `null` for et registrert brev uten nummer (LV-U45).
 */
export interface Brevet {
  id: string;
  nummer: number | null;
  avsender: Part;
  registrert: string;
  spor: Spor[];
  art: 'krav' | 'svar' | 'aksept' | 'trekk' | 'innsigelse' | 'registrert' | 'annet';
  /** Kjernens kode for forholdet et krav i forholdssporet påberoper, ellers `null`. */
  forhold: string | null;
  /** Vår ref., merkingen som ble frosset med brevet (LV-U53, LV-U24), eller `null`. */
  merking: string | null;
  /** Deres ref. som ble frosset med brevet (LV-U27, LV-U49), tom når det ikke har noen. */
  deresRef: string[];
  /**
   * Omtalen av brevet slik brevteksten gir den: «brev K201-KOE-017-03 av 2. oktober 2026», eller
   * «totalentreprenørens e-post av …» for registrert korrespondanse (LV-U53, LV-U42).
   */
  omtale: string | null;
  /** Tittelen som ble frosset med brevet (MM-U3, MM-U50), eller `null` når brevet ikke har en. */
  brevtittel: string | null;
  /** Teksten slik den ble frosset da brevet ble skrevet; `null` for et registrert brev (MM-U17, MM-U50). */
  avsnitt: Avsnitt[] | null;
}

/** Sporet hvert krav og svar i saken hører til, så et utsagn som viser til dem, får sporet. */
function sporFor(u: Utledning): Map<string, Spor> {
  const ut = new Map<string, Spor>();
  for (const [spor, s] of Object.entries(u.spor) as [Spor, Utledning['spor'][Spor]][])
    for (const e of [...s.krav, ...s.svar]) ut.set(e.id, spor);
  return ut;
}

function artAv(d: Dokument): Brevet['art'] {
  if (d.brevtekst === null) return 'registrert';
  if (d.svar.length) return 'svar';
  if (d.krav.length) return 'krav';
  const u = d.utsagn.find((x) => ['aksept', 'trekk', 'innsigelse'].includes(x.art));
  return (u?.art as Brevet['art']) ?? 'annet';
}

/** Brevene i saken i rekkefølgen i journalen. */
export function brevene(u: Utledning): Brevet[] {
  const spor = sporFor(u);
  return u.journal.flatMap((h) => {
    if (h.art !== 'dokument') return [];
    const d = h.dokument;
    const i = new Set<Spor>([
      ...d.spor,
      ...d.krav.map((k) => k.spor),
      ...d.svar.map((s) => s.spor),
      ...d.utsagn.flatMap((x) => {
        const s = 'gjelder' in x ? spor.get(x.gjelder) : undefined;
        return s ? [s] : [];
      }),
    ]);
    return [
      {
        id: d.id,
        nummer: d.brevnummer,
        avsender: d.avsender,
        registrert: d.registrert,
        spor: [...i],
        art: artAv(d),
        forhold: foersteUnderkategori(
          d.krav.find((k) => k.spor === 'forhold')?.innhold.underkategori as
            | string
            | string[]
            | null
            | undefined
        ),
        merking: d.merking,
        deresRef: d.deresRef,
        omtale: omtalen(d),
        brevtittel: d.brevtittel,
        avsnitt: d.brevtekst,
      },
    ];
  });
}

/** Det en tekst trenger for å vise til et brev, med eller uten nummer. */
export type Brevref = Pick<Brevet, 'id' | 'nummer' | 'registrert' | 'omtale' | 'art'>;

const ref = ({ id, nummer, registrert, omtale, art }: Brevref): Brevref => ({
  id,
  nummer,
  registrert,
  omtale,
  art,
});

/** Brevet med dokumentet `id`. */
export const brevet = (u: Utledning, id: string) => brevene(u).find((b) => b.id === id) ?? null;

/** En dato en part har oppgitt i et brev, med brevet den står i. */
export interface OppgittDato {
  dato: string;
  hva: 'klar_over_forholdet' | 'sendt' | 'mottatt';
  oppgittAv: Part;
  brev: Brevref;
  spor: Spor[];
}

/**
 * Datoene partene har oppgitt: når TE ble klar over forholdet (grunnlagskravet) og når et
 * dokument ble sendt eller mottatt (opplysningene). Løsningen vurderer dem ikke (MM-U12, MM-U50).
 */
export function oppgitteDatoer(u: Utledning): OppgittDato[] {
  const brev = new Map(brevene(u).map((b) => [b.id, b]));
  const ut: OppgittDato[] = [];
  for (const k of u.spor.forhold.krav) {
    const dato = k.innhold.klar_over_forholdet;
    const b = brev.get(k.dokument);
    if (typeof dato === 'string' && b)
      ut.push({
        dato,
        hva: 'klar_over_forholdet',
        oppgittAv: b.avsender,
        brev: ref(b),
        spor: ['forhold'],
      });
  }
  for (const { opplysning: o } of u.opplysninger) {
    const b = brev.get(o.dokument);
    if ((o.hva === 'sendt' || o.hva === 'mottatt') && b)
      ut.push({ dato: o.dato, hva: o.hva, oppgittAv: o.oppgittAv, brev: ref(b), spor: b.spor });
  }
  return ut;
}

/**
 * Datoene som hører til sporet: de oppgitt i sporet, og i vederlaget også datoen i
 * grunnlagskravet, som varselet etter § 34.1.2 regnes fra. Lesingen og svarskjemaet viser de
 * samme (#1393).
 */
export const datoerISporet = (u: Utledning, spor: Spor) =>
  oppgitteDatoer(u).filter(
    (d) => d.spor.includes(spor) || (spor === 'vederlag' && d.spor.includes('forhold'))
  );

/** Datoen TE oppgir i gjeldende grunnlagskrav for når TE ble klar over forholdet. */
export function klarOverForholdet(u: Utledning): OppgittDato | null {
  const krav = u.spor.forhold.gjeldendeKrav;
  const b = krav && brevet(u, krav.dokument);
  return (
    oppgitteDatoer(u).find((d) => d.hva === 'klar_over_forholdet' && d.brev.id === b?.id) ?? null
  );
}

/**
 * Én linje i et svar, med etiketten for laget den står i når svaret har flere lag: en grunn
 * fra svaret på forholdet brevet hadde foran seg, med brevet det står i, eller et standpunkt i
 * svaret.
 */
export type Standpunktet = { lag: string | null } & (
  | { grunn: Subsidiaergrunn; brev: Brevref }
  | { standpunkt: Standpunkt }
);

/**
 * Linjene i svaret `svar` i brevets rekkefølge, med laget brevet ga dem (OV-U32). Grunnene
 * fra svaret på forholdet brevet hadde foran seg står først, ett lag hver (OV-U33,
 * `Svarberegning.forholdssvaret`). Et svar på forholdet revidert etter brevet endrer ikke det
 * brevet sa. `u` er saken med svaret, for et utkast forhåndsvisningen.
 */
export function standpunktene(svar: Svar, u: Utledning): Standpunktet[] {
  const beregning = u.svar[svar.id];
  if (!beregning) throw new Error(`Svaret ${svar.id} er ikke i saken`);
  const g = beregning.forholdssvaret === null ? null : u.svar[beregning.forholdssvaret].svar;
  const grunner = g ? grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger) : [];
  const plass = plassene(svar, svar.beslutningsgrunnlag.virkninger, grunner.length);
  return [
    ...grunner.map((grunn, i) => ({
      grunn,
      brev: ref(brevet(u, g!.dokument)!),
      lag: plass.grunn(i).etikett,
    })),
    ...svar.standpunkter.map((s) => ({ standpunkt: s, lag: plass.standpunkt(s.id).etikett })),
  ];
}

/**
 * Handlingene kjernen tilbyr som gjelder sporet: de med sporet i nøkkelen, varselet etter
 * § 34.1.3 i vederlaget, og de som gjelder et krav eller svar i sporet. Saken som helhet
 * (`registrere_brev`) hører ikke til et spor.
 */
export function handlingerISporet(u: Utledning, tilbudt: string[], spor: Spor): string[] {
  const iSporet = sporFor(u);
  return tilbudt.filter((n) => {
    const [, hva] = n.split(':');
    if (hva === undefined) return false;
    if (hva === spor) return true;
    if (hva === '34.1.3') return spor === 'vederlag';
    return iSporet.get(hva) === spor;
  });
}
