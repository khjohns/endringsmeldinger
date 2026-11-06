/**
 * Det Varden viser av saken, lest av kjernens utledning (#1331): brevene med sporene de
 * hører til, datoene partene har oppgitt, og standpunktene i et svar med laget kjernen
 * gir dem. Modulen avgjør ingenting selv. Hvilke handlinger som er mulige, hva et brev
 * sier og hva en aksept gir, kommer fra kjernen gjennom `lagKjernesak`.
 */

import { omtalen } from '$kjerne/frosset/brevtekst';
import { FORHOLDSGRUPPER, forholdet } from '$kjerne/frosset/forholdene';
import {
  grunnerFraForholdet,
  harHovedbeloep,
  krevdSamlet,
  krevdProduktivitet,
  plassene,
} from '$kjerne/frosset/standpunkt';
import { tilTall } from '$kjerne/regler/beloep';
import { foersteUnderkategori, type Subsidiaergrunn } from '$kjerne/regler/forhold';
import type { Avsnitt, Dokument, Part, Spor, Standpunkt, Svar } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Betegnelse } from '$kjerne/utledning/visning';
import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';

/**
 * Ett brev i saken. `nummer` er brevets nummer i saken, som brevteksten kaller «brev 5»
 * (LV-U44), og `null` for et registrert brev uten nummer (LV-U45).
 */
export interface Brevet {
  id: string;
  nummer: number | null;
  avsender: Part;
  registrert: string;
  /**
   * Datoen avsenderen oppgir at et registrert brev ble sendt (OV-U85), og `null` for et brev
   * sendt herfra, der `registrert` er sendingen.
   */
  sendt: string | null;
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

/**
 * Sporet hvert krav, svar, varsel og hver forespørsel i saken hører til, så et utsagn som viser
 * til dem, får sporet (#1393).
 */
function sporFor(u: Utledning): Map<string, Spor> {
  const ut = new Map<string, Spor>();
  for (const [spor, s] of Object.entries(u.spor) as [Spor, Utledning['spor'][Spor]][]) {
    for (const e of [...s.krav, ...s.svar, ...Object.values(s.varsler)]) if (e) ut.set(e.id, spor);
    for (const f of s.foresporsler) {
      ut.set(f.foresporsel, spor);
      if (f.svar) ut.set(f.svar, spor);
    }
  }
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
  const sendt = new Map(u.registrerteBrev.map((r) => [r.dokument, r.sendt]));
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
        sendt: sendt.get(d.id) ?? null,
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
  hva: 'paalegg_mottatt' | 'klar_over_forholdet' | 'sendt' | 'mottatt';
  oppgittAv: Part;
  brev: Brevref;
  spor: Spor[];
}

/**
 * Datoene partene har oppgitt: når TE mottok pålegget eller ble klar over forholdet
 * (påberopelsen) og når et dokument ble sendt eller mottatt (opplysningene). Løsningen vurderer
 * dem ikke (MM-U12, MM-U50).
 */
export function oppgitteDatoer(u: Utledning): OppgittDato[] {
  const brev = new Map(brevene(u).map((b) => [b.id, b]));
  const ut: OppgittDato[] = [];
  for (const k of u.spor.forhold.krav) {
    const b = brev.get(k.dokument);
    for (const hva of ['paalegg_mottatt', 'klar_over_forholdet'] as const) {
      const dato = k.innhold[hva];
      if (typeof dato === 'string' && b)
        ut.push({ dato, hva, oppgittAv: b.avsender, brev: ref(b), spor: ['forhold'] });
    }
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
 * Brevet linja for sporet viser til: siste brev i sporet, eller, når sporet er trukket, det
 * siste trekket i sporet selv eller av påberopelsen. Trekket av påberopelsen trekker kravene som
 * bygger på den (GR-U5), men brevet hører til forholdet, så siste brev i kravsporet er et annet.
 */
export const brevForLinja = (brev: Brevet[], spor: Spor, trukket: boolean): Brevet | undefined =>
  (trukket
    ? brev.findLast(
        (b) => b.art === 'trekk' && (b.spor.includes(spor) || b.spor.includes('forhold'))
      )
    : undefined) ?? brev.filter((b) => b.spor.includes(spor)).at(-1);

/** Hovedkategorien (§ 33.1 a–c, § 33.3) i gjeldende krav i forholdet, eller `null` uten krav. */
export function hovedkategorien(u: Utledning): string | null {
  const k = u.spor.forhold.gjeldendeKrav?.innhold.hovedkategori;
  return typeof k === 'string' ? k : null;
}

/**
 * Forholdet TE påberoper i gjeldende krav, med gruppen fra kjernens liste (OV-U77, OV-U78).
 * Uten krav, eller med en kode lista ikke har, er begge `null`.
 */
export function forholdetISaken(u: Utledning): { navn: string; gruppe: string } | null {
  const kode = foersteUnderkategori(
    u.spor.forhold.gjeldendeKrav?.innhold.underkategori as string | string[] | null | undefined
  );
  const f = forholdet(kode);
  const g = f && FORHOLDSGRUPPER.find((x) => x.forhold.some((y) => y.kode === f.kode));
  return f && g ? { navn: f.navn, gruppe: g.navn } : null;
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

/**
 * Betegnelsen i MM-U30 for hvert spor, slik lesepunktet har utledet den i saksbildet. Visningen
 * kaller ikke utledningen i kjernen selv (lesepunktvakten i `lesepunkter.test.ts`).
 */
export const betegnelsene = (
  bilde: Kjernesakkontekst['saksbilde']
): Record<Spor, Betegnelse | null> => {
  const kode = (spor: Spor) =>
    (bilde?.spor.find((s) => s.spor === spor)?.betegnelse?.kode ?? null) as Betegnelse | null;
  return { forhold: kode('forhold'), vederlag: kode('vederlag'), frist: kode('frist') };
};

/**
 * Innholdet i et brev i tråden om forholdet, som i prototypen `grunnlagsoversikt.html`: TEs
 * beskrivelse, som står som utdypningen under kravet i brevteksten (`brevtekst.ts`), og datoen
 * TE oppgir; byggherrens standpunkter med lagene brevet ga dem (OV-U32), og begrunnelsen.
 */
export interface Innlegget {
  /** «Pålegget» for en irregulær endring, ellers «forholdet». */
  gjelderPaalegg: boolean;
  utdypning: string | null;
  oppgitt: { hva: 'paalegg_mottatt' | 'klar_over_forholdet'; dato: string } | null;
  /** Standpunktene med laget, og brevet med varselet en påberopelse av sen varsling gjelder. */
  standpunkter: { standpunkt: Standpunkt; lag: string | null; brev: Brevref | null }[];
}

/** Innholdet i brevene om forholdet, etter brevets ID. Brev uten krav eller svar har ingen. */
export function innleggene(u: Utledning): Map<string, Innlegget> {
  const alle = brevene(u);
  const brev = new Map(alle.map((b) => [b.id, b]));
  const utdypning = (dokument: string, gjelder: string) =>
    brev
      .get(dokument)
      ?.avsnitt?.find((a) => a.gjelder === gjelder)
      ?.utdypning?.trim() || null;
  const kravbrev = new Map(u.spor.forhold.krav.map((k) => [k.id, brev.get(k.dokument)]));
  const ut = new Map<string, Innlegget>();
  for (const k of u.spor.forhold.krav) {
    const kode = foersteUnderkategori(
      k.innhold.underkategori as string | string[] | null | undefined
    );
    const hva = (['paalegg_mottatt', 'klar_over_forholdet'] as const).find(
      (h) => typeof k.innhold[h] === 'string'
    );
    ut.set(k.dokument, {
      gjelderPaalegg: kode === 'irregulaer_endring',
      utdypning: utdypning(k.dokument, k.id),
      oppgitt: hva ? { hva, dato: k.innhold[hva] as string } : null,
      standpunkter: [],
    });
  }
  for (const s of u.spor.forhold.svar) {
    ut.set(s.dokument, {
      gjelderPaalegg: false,
      utdypning: utdypning(s.dokument, s.id),
      oppgitt: null,
      // Svaret på forholdet har ingen grunner fra et annet svar foran seg (OV-U33).
      standpunkter: standpunktene(s, u).flatMap((l) => {
        if (!('standpunkt' in l)) return [];
        const b = 'gjelder' in l.standpunkt ? kravbrev.get(l.standpunkt.gjelder) : undefined;
        return [{ standpunkt: l.standpunkt, lag: l.lag, brev: b ? ref(b) : null }];
      }),
    });
  }
  return ut;
}

/**
 * Et krav om vederlagsjustering eller fristforlengelse i «Tilknyttede krav», som i prototypen
 * `grunnlagsoversikt.html`: det TE krevde i gjeldende kravversjon, beløpene eller dagene i
 * byggherrens gjeldende svar med lagene (`standpunktene`), og hvorfor svaret er subsidiært til
 * forholdet (`subsidiaer`, vedtaket 05.10).
 */
export interface TilknyttetKrav {
  spor: 'vederlag' | 'frist';
  /** Beløpet i kroner eller dagene, eller `null` når kravet ikke har et tall (metoden). */
  krevd: { tall: number | null; metode: unknown; brev: Brevref } | null;
  svaret: { poster: { tall: number; lag: string | null }[]; brev: Brevref } | null;
  grunner: Subsidiaergrunn[];
}

export function tilknyttetKrav(u: Utledning, spor: 'vederlag' | 'frist'): TilknyttetKrav {
  const s = u.spor[spor];
  const krav = s.gjeldendeKrav;
  const kravbrev = krav && brevet(u, krav.dokument);
  const svar = s.gjeldendeSvar;
  const svarbrev = svar && brevet(u, svar.dokument);
  const tall = (): number | null => {
    if (!krav) return null;
    if (spor === 'frist') return typeof krav.innhold.dager === 'number' ? krav.innhold.dager : null;
    return harHovedbeloep(krav) || krevdProduktivitet(krav) !== null
      ? tilTall(krevdSamlet(krav))
      : null;
  };
  return {
    spor,
    krevd:
      krav && kravbrev ? { tall: tall(), metode: krav.innhold.metode, brev: ref(kravbrev) } : null,
    svaret:
      svar && svarbrev
        ? {
            poster: standpunktene(svar, u).flatMap((l) =>
              'standpunkt' in l && l.standpunkt.art === 'beloep'
                ? [{ tall: l.standpunkt.godkjent, lag: l.lag }]
                : 'standpunkt' in l && l.standpunkt.art === 'dager'
                  ? [{ tall: l.standpunkt.vurdert, lag: l.lag }]
                  : []
            ),
            brev: ref(svarbrev),
          }
        : null,
    grunner: s.subsidiaer,
  };
}
