/**
 * Utledningen i fristsporet: forespørselen etter § 33.6.2 i utledningen og i svaret, og
 * kontrollene i fristen (`KONTROLLER_I_FRISTEN`, som `utledning/utled.ts` slår opp gjennom
 * `KONTROLLER`, #1783).
 */

import { dokumenterI } from '../../format/leser.ts';
import { forlengetFrist } from '../../regler/hverdager.ts';
import type {
  Bakover,
  Element,
  Henvisning,
  Sporskontroller,
  Ugyldig,
  Utledning,
  Utsagn,
} from '../../utledning/utled.ts';
import type { Krav } from '../../typer.ts';
import {
  erFristkravIAppen,
  foresporselsrelasjon,
  type ForesporselOgSvar,
  type Foresporselsrelasjon,
} from './frysing.ts';
import { betegnelsen, innholdIFristen, utregningIFristen, type FristIKravet } from './format.ts';

/**
 * Kontrollene i fristen, som `utledning/utled.ts` slår opp gjennom `KONTROLLER`: lesereglene
 * for forespørselen etter § 33.6.2 (`saken`) og versjonsregelen for fristene (`kravet`).
 */
export const KONTROLLER_I_FRISTEN = {
  kravet: (k, tidligere) => fristeneStrider(innholdIFristen(k), tidligere, true),
  kravene: () => {},
  // MM-U2, KA-U74: én vurdering av dagene for hver frist i kravet svaret gjelder, i kravets rekkefølge.
  svaret: (s, krav, ugyldig) => {
    const iSvaret = s.standpunkter.flatMap((p) => (p.art === 'dager' ? [p.gjelder] : []));
    const iKravet = innholdIFristen(krav).frister.map((f) => f.id);
    if (iSvaret.join() !== iKravet.join())
      ugyldig(s.id, 'dagene i svaret er ikke de samme fristene som i kravet');
  },
  kanFaaPassivitet: false,
  leserDatoen: false,
  svaretKanGodtas: () => true,
  saken: (s, bakover, ugyldig) => {
    // VS-U33: kravene om dager fremmet i appen, også de uten virkning.
    const fristkravIAppen: Krav[] = [];
    for (const d of s.dokumenter)
      for (const k of d.krav) if (erFristkravIAppen(d, k)) fristkravIAppen.push(k);
    kontrollerForesporslene(s.foresporsler, fristkravIAppen, s.henvisninger, bakover, ugyldig);
    kontrollerSvaretPaaForesporselen(
      s.kravMedUten,
      fristkravIAppen,
      s.elementer,
      s.besvart,
      bakover,
      ugyldig
    );
  },
} satisfies Sporskontroller;

/** VS-U19, VS-U33: forespørselen sendes før TE har krevd dager i appen. */
function kontrollerForesporslene(
  foresporsler: readonly Utsagn<'foresporsel'>[],
  fristkravIAppen: readonly Krav[],
  henvisninger: readonly Henvisning[],
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const f of foresporsler)
    if (fristkravIAppen.some((k) => bakover(f.id, k.id)))
      ugyldig(f.id, 'forespørselen etter § 33.6.2 står etter et fristkrav (VS-U19)');
    else if (henvisninger.some((x) => x.art === 'foresporselssvar' && bakover(f.id, x.id)))
      ugyldig(f.id, 'forespørselen etter § 33.6.2 står etter TEs begrunnelse (VS-U30)');
    else if (f !== foresporsler[0])
      ugyldig(f.id, 'saken har alt en forespørsel etter § 33.6.2 fra appen (VS-U31)');
}

/**
 * HF-U1, LV-U18 punkt 3: fristkravet viser til forespørselen etter § 33.6.2 det svarer på, og
 * et krav om dager i appen mens forespørselen er ubesvart, er svaret og viser til den
 * (avgrensningen i #1567). Et krav i et registrert brev svarer ikke (OV-U4).
 */
function kontrollerSvaretPaaForesporselen(
  kravMedUten: ReadonlyMap<string, Krav>,
  fristkravIAppen: readonly Krav[],
  elementer: Record<string, Element>,
  besvart: readonly ForesporselOgSvar[],
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const k of kravMedUten.values()) {
    if (k.gjelder === undefined) continue;
    if (elementer[k.gjelder]?.art !== 'foresporsel' || !bakover(k.id, k.gjelder))
      ugyldig(k.id, 'fristkravet viser ikke til en forespørsel etter § 33.6.2 før kravet');
    else if (!fristkravIAppen.includes(k))
      ugyldig(k.id, 'et registrert krav svarer ikke på forespørselen etter § 33.6.2 (OV-U4)');
    else if (!besvart.some((f) => f.foresporsel === k.gjelder && f.svar === k.id))
      ugyldig(k.id, 'fristkravet viser til en forespørsel etter § 33.6.2 som alt er besvart');
  }
  for (const k of fristkravIAppen)
    if (
      k.gjelder === undefined &&
      besvart.some(
        (f) => bakover(k.id, f.foresporsel) && (f.svar === null || !bakover(k.id, f.svar))
      )
    )
      ugyldig(k.id, 'fristkravet viser ikke til forespørselen etter § 33.6.2 det svarer på');
}

/**
 * Hvordan gjeldende fristkrav står til en forespørsel etter § 33.6.2, slik svaret leser det.
 * Etter TEs begrunnelse etter annet ledd b har svaret et standpunkt etter § 33.6.2 bare når
 * byggherren har gjort gjeldende i en egen innsigelse at begrunnelsen kom for sent: svaret
 * gjentar påberopelsen eller gir den opp (VS-U29, VS-U9, VS-U11).
 */
export function foresporselForFristsvar(u: Utledning): Foresporselsrelasjon | null {
  const f = foresporselsrelasjon(u.spor.frist.foresporsler);
  if (f?.art !== 'begrunnelse') return f;
  for (const d of dokumenterI(u.journal))
    if (
      d.avsender === 'BH' &&
      d.utsagn.some(
        (x) => x.art === 'innsigelse' && x.gjelder === f.gjelder && x.grunn === undefined
      )
    )
      return f;
  return null;
}

/**
 * VS-U19, VS-U33: TE har fremmet et krav om dager i appen, også uten virkning, som
 * kontrollen av forespørselen i utledningen. Et registrert brev stopper den aldri.
 */
export function fristkravErFremmet(u: Utledning): boolean {
  for (const d of dokumenterI(u.journal))
    if (d.krav.some((k) => erFristkravIAppen(d, k))) return true;
  return false;
}

/**
 * Dagene i én sak for en frist i fristtabellen (GFK-U26), med grunnlaget for dem. Kilden for
 * grunnlagene uten vedtak er svarene i
 * `docs/vedlegg/fristen-del2-pr3-2026-11-14/sporsmal-2.md` til vedtakene er ført:
 * - `avtalt`: dagene i en enighet om byggherrens gjeldende svar, også en betinget enighet (GR-U39)
 *   og en enighet ved sammenfall (GR-U7, GR-U38);
 * - `godkjent`: dagene i første lag i byggherrens gjeldende svar, uten enighet;
 * - `subsidiaert_til_forholdet`: dagene i første lag når svaret er subsidiært til et avslag av
 *   forholdet, også et avslag sendt etter fristsvaret (spørsmål 2 i `sporsmal-2.md`);
 * - `subsidiaert_i_fristen`: dagene i siste lag når første lag gir ingen dager, fordi byggherren
 *   prinsipalt avslår dagene i fristen (spørsmål 1 i `sporsmal-2.md`).
 * Bare `avtalt` og `godkjent` forlenger fristen for fullmakten (avklaringen C i `sporsmal-2.md`).
 */
export interface Forlengelse {
  fristId: number;
  /** Kalenderdagene (NS 8407 punkt 1.2). */
  dager: number;
  grunnlag: 'godkjent' | 'avtalt' | 'subsidiaert_til_forholdet' | 'subsidiaert_i_fristen';
}

/**
 * Dagene i saken for fristene i fristtabellen, som en annen sak i samme kontrakt regner fristen fra
 * (GFK-U19, GFK-U26). `tattMed` forlenger fristen. `ikkeTattMed` er dagene byggherren bare har
 * godkjent subsidiært, uten enighet, som utregningen nevner med grunnen. Gjeldende svar er svaret
 * på gjeldende krav, så et nytt krav avslutter forlengelsen (HF-U5). Et trukket krav og en enighet
 * uten virkning gir ingen (GR-U7, KA-U6). En frist som ikke er registrert, kobles ikke til
 * fristtabellen (KA-U79). Endringsordrene leses ikke, fordi kjernen ikke har dem; når de leses,
 * teller dagene i dem etter EO-U40, og forlengelsen telles fra endringsordren og ikke fra
 * KOE-saken (spørsmål 3 i `sporsmal-2.md`).
 */
export function forlengelseneISaken(u: Utledning): {
  tattMed: Forlengelse[];
  ikkeTattMed: Forlengelse[];
} {
  const s = u.spor.frist;
  const tattMed: Forlengelse[] = [];
  const ikkeTattMed: Forlengelse[] = [];
  if (s.trukket || !s.gjeldendeKrav || !s.gjeldendeSvar) return { tattMed, ikkeTattMed };
  // GR-U7, KA-U6: er forholdet avvist ved enighet, har dagene ingen virkning, med eller uten
  // enighet i fristen (`enighetensVirkning`; et trukket krav er alt ute).
  if (u.forholdAvvist) return { tattMed, ikkeTattMed };
  const frister = new Map(innholdIFristen(s.gjeldendeKrav).frister.map((f) => [f.id, f]));
  const fristId = (gjelder: string) => frister.get(gjelder)?.frist_id;
  if (s.enighet) {
    // `utfallIFristen` gir alltid dagene per frist.
    for (const { gjelder, dager } of s.enighet.grunnlag.utfall.frister!) {
      const id = fristId(gjelder);
      if (id !== undefined && dager > 0) tattMed.push({ fristId: id, dager, grunnlag: 'avtalt' });
    }
    return { tattMed, ikkeTattMed };
  }
  const tilForholdet = s.subsidiaer.length > 0;
  for (const r of utregningIFristen(s.gjeldendeSvar.utregning).frister) {
    const id = fristId(r.gjelder);
    if (id === undefined) continue;
    const foerste = r.lag[0]?.dager ?? 0;
    const siste = r.lag.at(-1)?.dager ?? 0;
    if (foerste > 0)
      (tilForholdet ? ikkeTattMed : tattMed).push({
        fristId: id,
        dager: foerste,
        grunnlag: tilForholdet ? 'subsidiaert_til_forholdet' : 'godkjent',
      });
    else if (siste > 0)
      ikkeTattMed.push({ fristId: id, dager: siste, grunnlag: 'subsidiaert_i_fristen' });
  }
  return { tattMed, ikkeTattMed };
}

/** Fristen `dato` etter dagene i `forlengelser` som gjelder fristen `fristId` (GFK-U19). */
export const fristenEtterForlengelsene = (
  dato: string,
  fristId: number,
  forlengelser: readonly Forlengelse[]
): string =>
  forlengetFrist(
    dato,
    forlengelser.filter((f) => f.fristId === fristId).reduce((sum, f) => sum + f.dager, 0)
  );

/** En frist i en ny kravversjon, lagret eller i kommandoen, der feltene ikke er kontrollert. */
type Fristinndata = { id?: unknown; frist_id?: unknown; nummer?: unknown; navn?: unknown };

/**
 * Samme frist i kontrakten: den samme fristen i fristtabellen, eller samme nummer og navn for en
 * frist som ikke er registrert. Løsningen skiller ikke en skrivefeil fra en annen frist (KA-U79).
 */
export const fristnoekkel = (p: Fristinndata): string =>
  p.frist_id !== undefined ? `registrert ${p.frist_id}` : `angitt ${p.nummer ?? ''}\u0000${p.navn}`;

const omtalen = (p: Fristinndata): string =>
  typeof p.navn === 'string'
    ? betegnelsen(p as { nummer?: string; navn: string })
    : `registrert som ${p.frist_id}`;

/**
 * Fristene i de tidligere kravversjonene: den siste formen hver frist hadde, og hvilken frist i
 * kontrakten som har stått med hvilken `id`.
 */
export function fristeneISporet(tidligere: readonly Pick<Krav, 'innhold'>[]): {
  forrige: ReadonlyMap<string, FristIKravet>;
  sist: ReadonlyMap<string, FristIKravet>;
  eier: ReadonlyMap<string, string>;
} {
  const versjoner = tidligere.map((k) => innholdIFristen(k).frister);
  const sist = new Map<string, FristIKravet>();
  const eier = new Map<string, string>();
  for (const v of versjoner)
    for (const p of v) {
      sist.set(p.id, p);
      eier.set(fristnoekkel(p), p.id);
    }
  return { forrige: new Map((versjoner.at(-1) ?? []).map((p) => [p.id, p])), sist, eier };
}

/**
 * Hvorfor fristene i den nye kravversjonen strider mot de tidligere versjonene i sporet, eller
 * `null` (KA-U76, KA-U79). En frist beholder `id` på tvers av versjonene, også etter et trekk.
 * I kommandoen er en frist uten `id` den fristen i kontrakten som har stått med samme
 * `fristnoekkel`, ellers en ny. Med `id` kan en frist som ikke er registrert, erstattes med en
 * annen frist, men en registrert frist kan ikke byttes. En frist i forrige versjon er med eller
 * trukket. `lagret` sier om innholdet er en lagret versjon, der serveren har satt `id`.
 */
export function fristeneStrider(
  ny: { frister?: readonly Fristinndata[]; trekker?: readonly unknown[] },
  tidligere: readonly Pick<Krav, 'innhold'>[],
  lagret: boolean
): string | null {
  const { forrige, sist, eier } = fristeneISporet(tidligere);
  const trekker = (ny.trekker ?? []) as string[];
  const trukne = new Set<string>();
  for (const id of trekker) {
    const p = forrige.get(id);
    if (!p) return `trekker fristen ${id}, som ikke er med i forrige kravversjon`;
    if (trukne.has(id)) return `trekker fristen ${betegnelsen(p)} to ganger`;
    trukne.add(id);
  }
  const noekler = new Set<string>();
  const med = new Set<string>();
  for (const p of ny.frister ?? []) {
    const noekkel = fristnoekkel(p);
    if (noekler.has(noekkel)) return `har fristen ${omtalen(p)} to ganger`;
    noekler.add(noekkel);
    const id = p.id as string | undefined;
    if (id !== undefined && !sist.has(id) && !lagret)
      return `har fristen ${id}, som ikke har stått i sporet`;
    const sto = eier.get(noekkel);
    // KA-U79: en frist uten `id` er raden den har stått i, og den raden kan være erstattet siden.
    const rad = id ?? sto;
    const kjent = rad === undefined ? undefined : sist.get(rad);
    if (kjent?.frist_id !== undefined && p.frist_id !== kjent.frist_id)
      return `bytter den registrerte fristen ${betegnelsen(kjent)} med en annen frist (KA-U79)`;
    if (id !== undefined && sto !== undefined && sto !== id)
      return `gir fristen ${omtalen(p)} en ny rad, men den har stått i sporet før (KA-U76)`;
    if (rad === undefined) continue;
    if (med.has(rad)) return `har fristen ${omtalen(p)} to ganger`;
    med.add(rad);
    if (trukne.has(rad)) return `både tar med og trekker fristen ${omtalen(p)}`;
  }
  const mangler = [...forrige.values()].filter((p) => !med.has(p.id) && !trukne.has(p.id));
  return mangler.length
    ? `mangler ${mangler.map(betegnelsen).join(', ')} uten at ${mangler.length > 1 ? 'de er trukket' : 'den er trukket'} (KA-U76)`
    : null;
}
