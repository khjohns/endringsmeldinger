/**
 * Det Varden viser av saken, lest av kjernens utledning (#1331): brevene med sporene de
 * hører til, datoene partene har oppgitt, og standpunktene i et svar med laget kjernen
 * gir dem. Modulen avgjør ingenting selv. Hvilke handlinger som er mulige, hva et brev
 * sier og hva en aksept gir, kommer fra kjernen gjennom `lagKjernesak`.
 */

import { omtalen } from '$kjerne/frosset/brevdeler';
import { innholdIForholdet, oppgittDato } from '$kjerne/spor/forhold/format';
import { FORHOLDSGRUPPER, forholdet } from '$kjerne/spor/forhold/tekst';
import { grunnerFraForholdet } from '$kjerne/spor/forhold/frysing';
import { plassene } from '$kjerne/frosset/byggeklosser';
import { innholdIFristen } from '$kjerne/format/kravinnhold';
import { krevdIKravposten, kravposterI, krevdSamlet } from '$kjerne/spor/vederlag/format';
import { tilTall } from '$kjerne/regler/beloep';
import type { Subsidiaergrunn } from '$kjerne/regler/forhold';
import type { TilbudtHandling } from '$kjerne/kommandoer/handlinger';
import type {
  Avsnitt,
  Dokument,
  Krav,
  Oppgjoersform,
  Part,
  Spor,
  Standpunkt,
  Svar,
  Utfall,
  Varselhjemmel,
} from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Betegnelse } from '$kjerne/utledning/visning';
import { elementenesSpor, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';

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

function artAv(d: Dokument): Brevet['art'] {
  if (d.brevtekst === null) return 'registrert';
  if (d.svar.length) return 'svar';
  if (d.krav.length) return 'krav';
  const u = d.utsagn.find((x) => ['aksept', 'trekk', 'innsigelse'].includes(x.art));
  return (u?.art as Brevet['art']) ?? 'annet';
}

/** Brevene i saken i rekkefølgen i journalen. */
export function brevene(u: Utledning): Brevet[] {
  const spor = elementenesSpor(u);
  const sendt = new Map(u.registrerteBrev.map((r) => [r.dokument, r.sendt]));
  return u.journal.flatMap((h) => {
    if (h.art !== 'dokument') return [];
    const d = h.dokument;
    const i = new Set<Spor>([
      ...d.spor,
      ...d.krav.map((k) => k.spor),
      ...d.svar.map((s) => s.spor),
      // Et varsel har sporet selv, som et varsel for en kravpost (VS-U53).
      ...d.utsagn.flatMap((x) => {
        const s = ('gjelder' in x ? spor.get(x.gjelder) : undefined) ?? spor.get(x.id);
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
        forhold: innholdIForholdet(d.krav.find((k) => k.spor === 'forhold')).underkategori,
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
 * (påberopelsen og korrigeringene, `datoopplysninger` i utledningen, MM-U52 punkt 10) og når et
 * dokument ble sendt eller mottatt (opplysningene). Løsningen vurderer dem ikke (MM-U12, MM-U50).
 */
export function oppgitteDatoer(u: Utledning): OppgittDato[] {
  const brev = new Map(brevene(u).map((b) => [b.id, b]));
  const ut: OppgittDato[] = [];
  for (const o of u.datoopplysninger) {
    const b = brev.get(o.dokument);
    if (b) ut.push({ dato: o.dato, hva: o.felt, oppgittAv: 'TE', brev: ref(b), spor: ['forhold'] });
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

/** TEs siste opplysning om når TE ble klar over forholdet (MM-U52 punkt 10). */
export function klarOverForholdet(u: Utledning): OppgittDato | null {
  return oppgitteDatoer(u).findLast((d) => d.hva === 'klar_over_forholdet') ?? null;
}

/** TEs opplysning om datoen etter VS-U26, i påberopelsen eller en korrigering (MM-U52 punkt 10). */
export interface Datoopplysningen {
  /** Påberopelsen eller korrigeringen med opplysningen, som handlingen `korrigere:<id>` viser til. */
  id: string;
  hva: 'paalegg_mottatt' | 'klar_over_forholdet';
  dato: string;
  brev: Brevref;
  korrigering: boolean;
  /** Opplysningen før denne i samme felt, som en korrigering viser til. */
  forrige: Datoopplysningen | null;
  /** TEs siste opplysning i feltet. */
  siste: boolean;
  /** Brevet med korrigeringen av denne opplysningen, `null` for den siste. */
  korrigertI: Brevref | null;
}

/** TEs opplysninger om datoen i rekkefølgen i journalen, med brevene de står i. */
export function datoopplysningene(u: Utledning): Datoopplysningen[] {
  const brev = new Map(brevene(u).map((b) => [b.id, b]));
  const ut: Datoopplysningen[] = [];
  for (const o of u.datoopplysninger) {
    const b = brev.get(o.dokument);
    if (!b) continue;
    const forrige = ut.findLast((x) => x.hva === o.felt) ?? null;
    if (forrige) {
      forrige.siste = false;
      forrige.korrigertI = ref(b);
    }
    ut.push({
      id: o.id,
      hva: o.felt,
      dato: o.dato,
      brev: ref(b),
      korrigering: o.korrigering,
      forrige,
      siste: true,
      korrigertI: null,
    });
  }
  return ut;
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
    // KA-U72: standpunktet til beløpet uten beløp, når tilbudet ikke er akseptert, vises ikke.
    ...svar.standpunkter
      .filter((s) => !(s.art === 'beloep' && s.godkjent === undefined))
      .map((s) => ({ standpunkt: s, lag: plass.standpunkt(s.id).etikett })),
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
  return innholdIForholdet(u.spor.forhold.gjeldendeKrav).hovedkategori;
}

/**
 * Forholdet TE påberoper i gjeldende krav, med gruppen fra kjernens liste (OV-U77, OV-U78).
 * Uten krav, eller med en kode lista ikke har, er begge `null`.
 */
export function forholdetISaken(u: Utledning): { navn: string; gruppe: string } | null {
  const f = forholdet(innholdIForholdet(u.spor.forhold.gjeldendeKrav).underkategori);
  const g = f && FORHOLDSGRUPPER.find((x) => x.forhold.some((y) => y.kode === f.kode));
  return f && g ? { navn: f.navn, gruppe: g.navn } : null;
}

/** Varslene Varden har tekst for. Varslene etter § 34.3.3 og § 34.4 kommer i økt 3 (G-8 i BF-14). */
const VARSLENE_I_VARDEN: readonly Varselhjemmel[] = ['33.4', '34.1.2', '34.1.3'];

/**
 * Handlingene kjernen tilbyr i sporet, med sporet kjernen gir hver av dem. Saken som helhet
 * (`registrere_brev`) hører ikke til et spor.
 */
export function handlingerISporet(tilbudt: TilbudtHandling[], spor: Spor): TilbudtHandling[] {
  return tilbudt.filter(
    (h) => h.spor === spor && (h.hjemmel === null || VARSLENE_I_VARDEN.includes(h.hjemmel))
  );
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
  /** TEs opplysning om datoen i brevet, i påberopelsen eller en korrigering (G-7 i BF-02A). */
  opplysning: Datoopplysningen | null;
  /** Standpunktene med laget, og brevet med varselet en påberopelse av sen varsling gjelder. */
  standpunkter: { standpunkt: Standpunkt; lag: string | null; brev: Brevref | null }[];
}

/** Innholdet i brevene om forholdet, etter brevets ID. Brev uten krav eller svar har ingen. */
export function innleggene(u: Utledning): Map<string, Innlegget> {
  const alle = brevene(u);
  const brev = new Map(alle.map((b) => [b.id, b]));
  // Byggherrens begrunnelse står per punkt i svaret (KA-U46, LV-U70), i rekkefølgen i brevet.
  const utdypning = (dokument: string, gjelder: string) =>
    (brev.get(dokument)?.avsnitt ?? [])
      .filter((a) => a.gjelder === gjelder)
      .flatMap((a) => a.utdypning?.trim() || [])
      .join('\n\n') || null;
  const kravbrev = new Map(u.spor.forhold.krav.map((k) => [k.id, brev.get(k.dokument)]));
  const opplysningene = datoopplysningene(u);
  const iBrevet = (dokument: string) =>
    opplysningene.findLast((o) => o.brev.id === dokument) ?? null;
  const oppgitt = (o: Datoopplysningen | null) => (o ? { hva: o.hva, dato: o.dato } : null);
  const ut = new Map<string, Innlegget>();
  for (const k of u.spor.forhold.krav) {
    const innhold = innholdIForholdet(k);
    const kode = innhold.underkategori;
    const o = iBrevet(k.dokument);
    // En ny versjon som gjengir TEs siste opplysning, er ingen ny opplysning i utledningen, men
    // brevet sier datoen (MM-U52 punkt 10, #1647).
    const felt = oppgittDato(innhold.hovedkategori, innhold.underkategori);
    const gjentatt = felt === null ? null : innhold.datoer[felt];
    ut.set(k.dokument, {
      gjelderPaalegg: kode === 'irregulaer_endring',
      utdypning: utdypning(k.dokument, k.id),
      oppgitt:
        oppgitt(o) ?? (felt !== null && gjentatt !== null ? { hva: felt, dato: gjentatt } : null),
      opplysning: o,
      standpunkter: [],
    });
  }
  for (const o of opplysningene.filter((x) => x.korrigering))
    ut.set(o.brev.id, {
      gjelderPaalegg: o.hva === 'paalegg_mottatt',
      utdypning: utdypning(o.brev.id, o.id),
      oppgitt: oppgitt(o),
      opplysning: o,
      standpunkter: [],
    });
  for (const s of u.spor.forhold.svar) {
    ut.set(s.dokument, {
      gjelderPaalegg: false,
      utdypning: utdypning(s.dokument, s.id),
      oppgitt: null,
      opplysning: null,
      // Svaret på forholdet har ingen grunner fra et annet svar foran seg (OV-U33).
      standpunkter: standpunktene(s, u).flatMap((l) => {
        if (!('standpunkt' in l)) return [];
        const g = 'gjelder' in l.standpunkt ? l.standpunkt.gjelder : undefined;
        const b = g ? kravbrev.get(g) : undefined;
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
  /**
   * Summen av de faste beløpene i kroner, eller dagene, og `null` når ingen post har et fast
   * beløp. `utenFast` er antallet kravposter etter en beregningsregel, som ikke har et krevd
   * beløp (KA-U61).
   */
  krevd: { tall: number | null; utenFast: number; brev: Brevref } | null;
  /**
   * `poster` er summen av beløpene, eller dagene, i hvert lag, i lagenes rekkefølge. `utenFast`
   * er antallet kravposter svaret ikke har et beløp for: tilbudet er ikke akseptert (KA-U72), eller
   * posten er etter en beregningsregel (KA-U61). Det leses av standpunktene i brevet.
   */
  svaret: {
    poster: { tall: number; lag: string | null }[];
    utenFast: number;
    brev: Brevref;
  } | null;
  grunner: Subsidiaergrunn[];
}

/**
 * Betegnelsene på kravpostene utfallet sier ikke har fast beløp prinsipalt (OV-U73, svar 6 A
 * i #1663), slått opp i kravversjonene i sporet, siden svaret kan gjelde en tidligere versjon
 * enn den gjeldende. En kravpost som ikke finnes, står med id.
 */
export function kravposterUtenFastBeloep(utfall: Utfall, krav: readonly Krav[]): string[] {
  const poster = krav.flatMap((k) => kravposterI(k));
  return (utfall.uten_fast_beloep ?? []).map(
    (id) => poster.find((p) => p.id === id)?.betegnelse ?? id
  );
}

/** Summen av tallene med samme lag, i rekkefølgen lagene først står i. Summeres i øre. */
function summertPerLag(poster: { tall: number; lag: string | null }[]) {
  const oere = new Map<string | null, number>();
  for (const p of poster) oere.set(p.lag, (oere.get(p.lag) ?? 0) + Math.round(p.tall * 100));
  return [...oere].map(([lag, o]) => ({ tall: o / 100, lag }));
}

/** Oppgjørsformen til kravpostene etter en beregningsregel, `flere` når de har ulike, ellers `null`. */
export function beregningsregelen(
  former: readonly Oppgjoersform[]
): Exclude<Oppgjoersform, 'tilbud'> | 'flere' | null {
  const regler = new Set(former.filter((f) => f !== 'tilbud'));
  return regler.size === 0 ? null : regler.size === 1 ? [...regler][0]! : 'flere';
}

export function tilknyttetKrav(u: Utledning, spor: 'vederlag' | 'frist'): TilknyttetKrav {
  const s = u.spor[spor];
  const krav = s.gjeldendeKrav;
  const kravbrev = krav && brevet(u, krav.dokument);
  const svar = s.gjeldendeSvar;
  const svarbrev = svar && brevet(u, svar.dokument);
  const tall = (): number | null => {
    if (!krav) return null;
    if (spor === 'frist') return innholdIFristen(krav).dager;
    // En kravpost etter en beregningsregel har ikke et krevd beløp (KA-U61). Summen er de faste
    // beløpene, og visningen sier hvor mange poster som ikke har et fast beløp (#1752).
    const fast =
      kravposterI(krav).some((p) => p.oppgjoersform === 'tilbud') || krevdSamlet(krav) > 0n;
    return fast ? tilTall(krevdSamlet(krav)) : null;
  };
  return {
    spor,
    krevd:
      krav && kravbrev
        ? {
            tall: tall(),
            utenFast:
              spor === 'vederlag'
                ? kravposterI(krav).filter((p) => krevdIKravposten(krav, p) === null).length
                : 0,
            brev: ref(kravbrev),
          }
        : null,
    svaret:
      svar && svarbrev
        ? {
            poster: summertPerLag(
              standpunktene(svar, u).flatMap((l) =>
                'standpunkt' in l && l.standpunkt.art === 'beloep'
                  ? [{ tall: l.standpunkt.godkjent!, lag: l.lag }]
                  : 'standpunkt' in l && l.standpunkt.art === 'dager'
                    ? [{ tall: l.standpunkt.vurdert, lag: l.lag }]
                    : []
              )
            ),
            utenFast: svar.standpunkter.filter(
              (x) => x.art === 'beloep' && x.godkjent === undefined && x.gjelder
            ).length,
            brev: ref(svarbrev),
          }
        : null,
    grunner: s.subsidiaer,
  };
}
