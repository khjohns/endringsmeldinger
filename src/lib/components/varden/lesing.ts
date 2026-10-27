/**
 * Det Varden viser av saken, lest av kjernens utledning (#1331): brevene med sporene de
 * hører til, datoene partene har oppgitt, og standpunktene i et svar med laget kjernen
 * gir dem. Modulen avgjør ingenting selv. Hvilke handlinger som er mulige, hva et brev
 * sier og hva en aksept gir, kommer fra kjernen gjennom `lagKjernesak`.
 */

import { etikett, grunnerFraGrunnlaget, laget } from '$kjerne/frosset/standpunkt';
import type { Avsnitt, Dokument, Part, Spor, Standpunkt, Svar } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';

/** Ett brev i saken. `nummer` er versjonen i journalen, som brevteksten kaller «brev 5». */
export interface Brevet {
  id: string;
  nummer: number;
  avsender: Part;
  registrert: string;
  spor: Spor[];
  art: 'krav' | 'svar' | 'aksept' | 'trekk' | 'innsigelse' | 'registrert' | 'annet';
  /** Teksten slik den ble frosset da brevet ble skrevet; `null` for et registrert brev (MM-U17). */
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
        nummer: h.versjon,
        avsender: d.avsender,
        registrert: d.registrert,
        spor: [...i],
        art: artAv(d),
        avsnitt: d.brevtekst,
      },
    ];
  });
}

/** Brevet med dokumentet `id`. */
export const brevet = (u: Utledning, id: string) => brevene(u).find((b) => b.id === id) ?? null;

/** En dato en part har oppgitt i et brev, med brevet den står i. */
export interface OppgittDato {
  dato: string;
  hva: 'klar_over_forholdet' | 'sendt' | 'mottatt';
  oppgittAv: Part;
  brev: number;
  spor: Spor[];
}

/**
 * Datoene partene har oppgitt: når TE ble klar over forholdet (grunnlagskravet) og når et
 * dokument ble sendt eller mottatt (opplysningene). Løsningen vurderer dem ikke (MM-U12).
 */
export function oppgitteDatoer(u: Utledning): OppgittDato[] {
  const brev = new Map(brevene(u).map((b) => [b.id, b]));
  const ut: OppgittDato[] = [];
  for (const k of u.spor.grunnlag.krav) {
    const dato = k.innhold.klar_over_forholdet;
    const b = brev.get(k.dokument);
    if (typeof dato === 'string' && b)
      ut.push({
        dato,
        hva: 'klar_over_forholdet',
        oppgittAv: b.avsender,
        brev: b.nummer,
        spor: ['grunnlag'],
      });
  }
  for (const { opplysning: o } of u.opplysninger) {
    const b = brev.get(o.dokument);
    if ((o.hva === 'sendt' || o.hva === 'mottatt') && b)
      ut.push({ dato: o.dato, hva: o.hva, oppgittAv: o.oppgittAv, brev: b.nummer, spor: b.spor });
  }
  return ut;
}

/** Ett standpunkt i et svar, med etiketten for laget det står i når svaret har flere lag. */
export interface Standpunktet {
  standpunkt: Standpunkt;
  /** «prinsipalt», «subsidiært» eller «videre subsidiært»; `null` når svaret har ett lag. */
  lag: string | null;
}

/**
 * Standpunktene i svaret `svar` i brevets rekkefølge, med laget kjernen gir dem (OV-U32).
 * Lagene fra grunnlaget står foran sporet, som i brevet: `foer` er saken før svaret.
 */
export function standpunktene(svar: Svar, foer: Utledning): Standpunktet[] {
  const g = foer.spor.grunnlag.gjeldendeSvar;
  const grunner =
    svar.spor === 'grunnlag' || !g
      ? 0
      : grunnerFraGrunnlaget(g, g.beslutningsgrunnlag.virkninger).length;
  const lagene = svar.beslutningsgrunnlag.virkninger.map((v) => {
    const l = laget(v.virkning);
    return { id: v.standpunkt, lag: l === null ? null : l + grunner };
  });
  const flere = lagene.some((l) => l.lag !== null && l.lag > 1);
  return svar.standpunkter.map((s) => {
    const l = lagene.find((x) => x.id === s.id)?.lag ?? null;
    return { standpunkt: s, lag: flere && l !== null ? etikett(l) : null };
  });
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
