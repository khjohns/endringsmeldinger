/**
 * Brevteksten i et brev appen sender (LV-U2, LV-U3, #369): ett avsnitt for hvert
 * krav, svar, utsagn og hver opplysning parten sier i brevet, og ett for
 * vedleggene, med den låste delen appen lager av valgene og partens utdypning hver
 * for seg (B-13 om begrunnelsestekst). Ordlyden er LV-U4, GR-U14 og GR-U16, og
 * hva teksten omfatter, A2–A5 i paragrafmatrisen. Teksten lages når brevet
 * skrives, fryses i dokumentet og lages ikke på nytt (MM-U9). Ingen regel leser
 * den. Et registrert brev får ingen tekst (MM-U17 (opphevet av MM-U50)).
 *
 * Teksten sier det parten sa, også et standpunkt appen regner som uten virkning.
 * Appens vurdering står ikke der: at et standpunkt er uten virkning, om § 32.2
 * gjaldt, eller sammenfallet (LV-U3, HF-U2, MM-U12 (opphevet av MM-U50)). «Prinsipalt» og
 * «subsidiært» er slik brevet ordner standpunktene (HF-U2). Appen tolker ikke
 * utdypningen (KA-U16, KA-U19).
 */

import { sakensKode } from './tekst.ts';
import { dagenSendt, erRegistrert, foerDagen, registrertDato } from '../format/leser.ts';
import { etterAkseptfristen } from '../regler/akseptfrist.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import {
  innsigelsenErOppgitt,
  innsigelsenPaaberoper,
  paaberopelserIDokumentet,
  sisteStandpunktTilVarslene,
  svaretGjelderPaaberopelsen,
} from './standpunkt.ts';
import { etikett, iSporet, laget, gjelderVarslingsplikten } from './byggeklosser.ts';
import { iBrevetsRekkefoelge, svaretGjelder } from './brevtittel.ts';
import type { Subsidiaergrunn } from '../regler/forhold.ts';
import { tilTall } from '../regler/beloep.ts';
import {
  erDato,
  Journalen,
  KanIkkeUttrykkes,
  kravpostenI,
  liste,
  norskDato,
  PRODUKTIVITET,
  stor,
  type Kravsporsbrevtekst,
  type Saken,
  type Sporsbrevtekst,
  type StandpunktIArt,
  type Standpunktstekster,
  type Tekst,
  type Brevpunkt,
  type Lagbeloep,
  type Oversikten,
  type Tema,
  type Utdypning,
  type Utdypninger,
  type PostenISvaret,
  type Vilkaar,
  helt,
  PARTENS,
  UtdypningUtenPunkt,
} from './brevdeler.ts';
import {
  BREVTEKSTEN_I_FORHOLDET,
  harRisikoen,
  paaberopelsenAvForholdet,
  STANDPUNKTENE_I_FORHOLDET,
} from '../spor/forhold/tekst.ts';
import {
  BREVTEKSTEN_I_VEDERLAGET,
  justeringstekst,
  STANDPUNKTENE_I_VEDERLAGET,
} from '../spor/vederlag/tekst.ts';
import { kravposterI, krevdProduktivitet } from '../spor/vederlag/format.ts';
import { BREVTEKSTEN_I_FRISTEN, STANDPUNKTENE_I_FRISTEN } from '../spor/frist/tekst.ts';
import {
  FORBEHOLDET,
  FORHOLDET,
  INNLEDNINGEN,
  INNSIGELSEN_MOT,
  kroner,
  medHardeMellomrom,
  OVERSIKTEN,
  UTEN_BEGRUNNELSE_I_SVARET,
  AKSEPTFRISTEN,
  vilkaaretILagslinjen,
} from './tekst.ts';
import { erKravpostvarselhjemmel } from '../typer.ts';
import type {
  Avsnitt,
  Dokument,
  Domenehendelse,
  Hjemmel,
  Kravspor,
  Krav,
  Kravpost,
  Opplysning,
  Part,
  Spor,
  Standpunkt,
  Svar,
  Utsagn,
  Kravvarselhjemmel,
  Varselhjemmel,
} from '../typer.ts';
import { DATOEN_GJELDER, innholdIForholdet } from '../spor/forhold/format.ts';
import { grunnerFraForholdet } from '../spor/forhold/frysing.ts';

const PART: Record<Part, string> = { TE: 'Totalentreprenøren', BH: 'Byggherren' };

/**
 * Brevteksten for dokumentet `nytt`, som parten sender i appen nå. `foer` er
 * journalen før brevet. `utdypninger` er partens utdypning per element og per punkt, uten
 * tolkning (KA-U19). Kaster `KanIkkeUttrykkes` når et element ikke kan uttrykkes,
 * og `BrevetAvvises` når brevet ikke kan sendes fra appen slik saken står.
 */
export function lagBrevtekst(
  nytt: Dokument,
  foer: Domenehendelse[],
  saken: Saken,
  regler: Regelsett,
  utdypninger: Utdypninger = new Map()
): Avsnitt[] {
  if (erRegistrert(nytt.opplysninger))
    throw new KanIkkeUttrykkes('et registrert brev står som det ble sendt (MM-U50)');
  const j = new Journalen(foer, nytt);
  const t: Tekst = {
    j,
    saken,
    nytt,
    sak: `sak ${sakensKode(saken.sakskode)} («${saken.tittel}»)`,
  };

  const avsnitt: Avsnitt[] = [];
  const legg = (gjelder: string, laast: string) => {
    const { utdypning, utdypninger: perPunkt, forbehold } = utdypninger.get(gjelder) ?? {};
    if (perPunkt && Object.keys(perPunkt).length)
      throw new UtdypningUtenPunkt(
        'Utdypningen per punkt gjelder et element i brevet uten punkter.'
      );
    if (forbehold)
      throw new UtdypningUtenPunkt('Forbeholdet gjelder et element i brevet uten punkter.');
    avsnitt.push({
      gjelder,
      laast: medHardeMellomrom(laast),
      ...(utdypning ? { utdypning } : {}),
    });
  };
  // LV-U34, LV-U80: punktene er nummerert gjennom hele brevet.
  let nummer = 0;
  // LV-U70 og LV-U71: ett avsnitt per punkt, med partens utdypning for punktet under det.
  // Utdypningen for hele elementet står i punktet `egen`, sist. Forbeholdet i et krav står
  // etter den (KA-U82, LV-U74).
  const leggPunkter = (
    gjelder: string,
    brevpunkter: Brevpunkt[],
    egen?: { punkt: string; overskrift: string },
    utenBegrunnelse: readonly string[] = [],
    oppgitt: Utdypning = utdypninger.get(gjelder) ?? {}
  ) => {
    if (!brevpunkter.some((p) => p.punkt !== undefined))
      return legg(gjelder, brevpunkter.flatMap((p) => p.avsnitt).join('\n\n'));
    const { utdypning, utdypninger: perPunktet, forbehold } = oppgitt;
    const perPunkt: Record<string, string> = { ...perPunktet };
    if (utdypning) {
      if (!egen)
        throw new KanIkkeUttrykkes(`elementet ${gjelder} har ikke noe punkt for utdypningen`);
      if (perPunkt[egen.punkt])
        throw new UtdypningUtenPunkt(
          `Utdypningen for hele kravet og utdypningen for punktet «${egen.overskrift}» er to tekster for samme punkt.`
        );
      perPunkt[egen.punkt] = utdypning;
    }
    if (forbehold) {
      if (perPunkt[FORBEHOLDET])
        throw new UtdypningUtenPunkt(
          'Forbeholdet og utdypningen for punktet «Forbehold» er to tekster for samme punkt.'
        );
      perPunkt[FORBEHOLDET] = forbehold;
    }
    for (const p of brevpunkter)
      if (p.punkt !== undefined && utenBegrunnelse.includes(p.punkt) && perPunkt[p.punkt])
        throw new UtdypningUtenPunkt(
          p.punkt === AKSEPTFRISTEN
            ? 'Linjen med akseptfristen har ingen utdypning.'
            : `Punktet «${p.punkt === INNLEDNINGEN ? 'Innledningen' : p.overskrift}» i brevet har ingen begrunnelse.`
        );
    const punktene: Brevpunkt[] = [
      ...brevpunkter.filter((p) => p.punkt !== AKSEPTFRISTEN),
      ...[egen, forbehold ? FORBEHOLDSPUNKTET : undefined]
        .filter(
          (e): e is { punkt: string; overskrift: string } =>
            e !== undefined && !!perPunkt[e.punkt] && !brevpunkter.some((p) => p.punkt === e.punkt)
        )
        .map((e) => ({ punkt: e.punkt, overskrift: e.overskrift, avsnitt: [] as string[] })),
      ...brevpunkter.filter((p) => p.punkt === AKSEPTFRISTEN),
    ];
    for (const { punkt, overskrift: o, avsnitt: a, poster, unummerert } of punktene) {
      if (punkt === undefined)
        throw new KanIkkeUttrykkes(`et punkt i brevteksten for ${gjelder} har ikke noe navn`);
      const overskrift =
        o === null ? undefined : medHardeMellomrom(unummerert ? o : `${++nummer}. ${o}`);
      const tekst = perPunkt[punkt];
      delete perPunkt[punkt];
      avsnitt.push({
        gjelder,
        punkt,
        ...(overskrift ? { overskrift } : {}),
        laast: [...(overskrift ? [overskrift] : []), ...a.map(medHardeMellomrom)].join('\n\n'),
        ...(tekst ? { utdypning: tekst } : {}),
        ...(poster ? { poster } : {}),
      });
    }
    const ukjent = Object.keys(perPunkt);
    if (ukjent.length)
      throw new UtdypningUtenPunkt(
        `Brevet har ikke ${ukjent.length > 1 ? 'punktene' : 'punktet'} utdypningen gjelder (${liste(ukjent.map((p) => `«${p}»`))}).`
      );
  };

  for (const k of nytt.krav) {
    // LV-U4 punkt 2–3 og GR-U16. Kravet i sporet står i `BREVTEKST`.
    const tekst = brevtekstI(k.spor);
    leggPunkter(k.id, tekst.krav(k, t, regler), tekst.utdypningensPunkt);
  }
  // LV-U34, LV-U72: svaret på forholdet står først, så lagene i de andre svarene bygger på det.
  const svarene = iBrevetsRekkefoelge(nytt.svar);
  const ns = { nevnt: false };
  const flere = svarene.length > 1;
  // LV-U82, OV-U32, OV-U33: avslaget av forholdet får «Prinsipalt» når et standpunkt i brevet står subsidiært til det.
  const forholdssvaret = svarene.find((s) => s.spor === 'forhold');
  const subsidiaertTilForholdet =
    !!forholdssvaret &&
    grunnerFraForholdet(forholdssvaret, forholdssvaret.beslutningsgrunnlag.virkninger).length > 0 &&
    svarene.some(
      (s) =>
        s.spor !== 'forhold' &&
        s.beslutningsgrunnlag.virkninger.some((v) => laget(v.virkning) !== null)
    );
  // «12 A» i #2337: punktet «Forholdet» fra et tidligere brev står bare i den første delen.
  let forholdetStaar = false;
  const forbeholdene: Forbeholdet[] = [];
  let omForholdet: OmForholdet | null = null;
  for (const s of svarene) {
    const { utdypning, utdypninger: oppgitt, forbehold } = utdypninger.get(s.id) ?? {};
    const perPunkt: Record<string, string> = { ...oppgitt };
    const iPunktet = perPunkt[FORBEHOLDET];
    if (utdypning && iPunktet)
      throw new UtdypningUtenPunkt(
        'Utdypningen for hele kravet og utdypningen for punktet «Forbehold» er to tekster for samme punkt.'
      );
    if (forbehold && (utdypning || iPunktet))
      throw new UtdypningUtenPunkt(
        'Forbeholdet og utdypningen for punktet «Forbehold» er to tekster for samme punkt.'
      );
    const tekst = utdypning || iPunktet || forbehold;
    if (tekst) forbeholdene.push({ s, tekst });
    const setninger = forbeholdetForForholdet(s, t).join(' ');
    if (setninger) {
      if (omForholdet && omForholdet.setninger !== setninger)
        throw new KanIkkeUttrykkes('svarene i brevet har ulike forbehold om forholdet');
      omForholdet ??= { s, setninger };
    }
    const punktene = svarpunkter(s, t, regler, {
      ns,
      del: flere ? `Svar på ${svaretGjelder(s).del}` : null,
      subsidiaertTilForholdet,
      forholdetStaar,
    });
    forholdetStaar ||= punktene.some((p) => p.punkt === FORHOLDET);
    leggPunkter(s.id, punktene, undefined, UTEN_BEGRUNNELSE_I_SVARET, {
      utdypninger: Object.fromEntries(
        Object.entries(perPunkt).filter(([punkt]) => punkt !== FORBEHOLDET)
      ),
    });
  }
  for (const u of nytt.utsagn) legg(u.id, utsagnstekst(u, t, regler));
  for (const o of nytt.opplysninger) legg(o.id, opplysningstekst(o, nytt.avsender, j));
  // LV-U81, GR-U34, 4 A i #2337. Linjen med vedleggene står etter, som i hvert brev (A4).
  if (omForholdet && !forbeholdene.length) forbeholdene.push({ s: omForholdet.s });
  if (forbeholdene.length) {
    const overskrift = medHardeMellomrom(`${++nummer}. ${FORBEHOLDSPUNKTET.overskrift}`);
    forbeholdene.forEach(({ s, tekst }, i) => {
      const foerst = i === 0 ? [overskrift, ...(omForholdet ? [omForholdet.setninger] : [])] : [];
      const ledetekst = tekst && flere ? [`Forbehold for svaret på ${svaretGjelder(s).del}:`] : [];
      avsnitt.push({
        gjelder: s.id,
        punkt: FORBEHOLDET,
        ...(i === 0 ? { overskrift } : {}),
        laast: [...foerst, ...ledetekst].map(medHardeMellomrom).join('\n\n'),
        ...(tekst ? { utdypning: tekst } : {}),
      });
    });
  }
  // A4: vedleggene står i teksten med filnavnet, så det som fryses, er teksten og
  // vedleggene (LV-U2, arbeidsvalg 10 i #790).
  if (nytt.dokumentasjon.length)
    legg(nytt.id, `Brevet har vedlegg: ${liste(nytt.dokumentasjon.map((v) => `«${v.filnavn}»`))}.`);
  return avsnitt;
}

/** Teksten i punktet «Forbehold» for svaret `s` (LV-U81, KA-U49, GR-U34): byggherrens forbehold, eller ingen. */
interface Forbeholdet {
  s: Svar;
  tekst?: string;
}

/** Forbeholdet om forholdet etter GR-U34, med svaret det står for (LV-U81). */
interface OmForholdet {
  s: Svar;
  setninger: string;
}

/** En innsigelse med brevet den står i. */
interface Innsigelse {
  gjelder: string;
  dokument: string;
  hjemmel?: Hjemmel | null;
}

/**
 * VS-U9, VS-U11, VS-U24: partens egne innsigelser som er en påberopelse etter
 * bestemmelsen et svar i sporet tar stilling til, og som parten ikke senere har gitt opp
 * uttrykkelig, i rekkefølgen de kom, med brevet de står i. Brevet `dokumentet` som skrives,
 * er ikke med. Svaret gjentar dem eller gir dem opp. Et svar lagt til med svarskjemaet gir den opp som et svar fra løsningen, fra
 * dagen det ble sendt (OV-U105), så et svar sendt før innsigelsen gir den ikke opp (OV-U104).
 * Et svar uten virkning gir den ikke opp (MM-U43 punkt 9).
 */
function aapneInnsigelser(
  spor: Spor,
  dokumentet: string,
  avsender: Part,
  { j, saken }: Pick<Tekst, 'j' | 'saken'>,
  regler: Regelsett
): Innsigelse[] {
  const svarFraParten: { svar: Svar; dag: string | null }[] = [];
  const innsigelser: (Innsigelse & { fra: number; dag: string | null })[] = [];
  const utenVirkning = (id: string) => saken.utenVirkning.includes(id);
  for (const d of j.dokumenter) {
    if (d.avsender !== avsender || d.id === dokumentet) continue;
    const dag = dagenSendt({ id: d.id, dokument: d.id }, d);
    for (const s of d.svar) if (!utenVirkning(s.id)) svarFraParten.push({ svar: s, dag });
    for (const u of paaberopelserIDokumentet(d, utenVirkning))
      innsigelser.push({ gjelder: u.gjelder, dokument: d.id, fra: svarFraParten.length, dag });
  }
  return innsigelser.flatMap((i) => {
    const hjemmel = innsigelsenPaaberoper(i.gjelder, j.dokumenter, (k) =>
      gjelderVarslingsplikten(k, regler)
    );
    const etter = svarFraParten
      .slice(i.fra)
      .filter((x) => !foerDagen(x.dag, i.dag))
      .map((x) => x.svar);
    return svaretGjelderPaaberopelsen(spor, hjemmel) && !innsigelsenErOppgitt(spor, etter, hjemmel)
      ? [{ gjelder: i.gjelder, dokument: i.dokument, hjemmel }]
      : [];
  });
}

/** Bestemmelsen varselet er gitt etter; etter OV-U25 gjelder varselet i § 34.1.3 tredje ledd bare annet ledd (LV-U29). */
const VARSLET_ETTER: Record<Kravvarselhjemmel, string> = {
  '33.4': 'NS 8407 punkt 33.4',
  '34.1.2': 'NS 8407 punkt 34.1.2',
  '34.1.3': 'NS 8407 punkt 34.1.3 tredje ledd',
  '34.3.3': 'NS 8407 punkt 34.3.3 første ledd',
  '34.4': 'NS 8407 punkt 34.4',
};

/** TEs eget varsel, slik brevteksten nevner det (LV-U4 punkt 3, OV-U5). */
const VARSEL_OM: Record<Kravvarselhjemmel, string> = {
  '33.4': `om fristforlengelse etter ${VARSLET_ETTER['33.4']}`,
  '34.1.2': `om vederlagsjustering etter ${VARSLET_ETTER['34.1.2']}`,
  '34.1.3': `om særskilt justering for nedsatt produktivitet eller forstyrrelser etter ${VARSLET_ETTER['34.1.3']}`,
  // Ordlyden for varslene etter § 34.3.3 og § 34.4 er design etter VS-U48 (#1663).
  '34.3.3': `om justering av enhetsprisene etter ${VARSLET_ETTER['34.3.3']}`,
  '34.4': `om regningsarbeid etter ${VARSLET_ETTER['34.4']}`,
};

/** Svaret på forholdet i brevet, eller gjeldende svar før brevet (A2, OV-U32). */
function svaretPaaForholdet({ j, saken, nytt }: Pick<Tekst, 'j' | 'saken' | 'nytt'>) {
  return (
    nytt.svar.find((x) => x.spor === 'forhold') ??
    (saken.svarPaaPaaberopelsen ? j.svar(saken.svarPaaPaaberopelsen) : undefined)
  );
}

/**
 * GR-U26 og GR-U34: byggherren svarer på vederlag eller frist uten å ha svart på gjeldende
 * versjon av forholdet, i brevet eller før det, og forholdet er ikke avklart ved frafall (GR-U23).
 */
function forholdetErUbesvart(s: Svar, { saken, nytt }: Pick<Tekst, 'saken' | 'nytt'>): boolean {
  return (
    s.spor !== 'forhold' &&
    saken.svarPaaPaaberopelsen === null &&
    !saken.avklartVedFrafall &&
    !nytt.svar.some((x) => x.spor === 'forhold')
  );
}

/** Punktet for utdypningen for hele svaret, under den faste teksten etter GR-U34 (KA-U49 punkt 1). */
const FORBEHOLDSPUNKTET = { punkt: FORBEHOLDET, overskrift: 'Forbehold' } as const;

/**
 * Det svaret `s` i brevet gjelder, slik overskriften og forbeholdet nevner det (LV-U80, LV-U81),
 * og om avslaget av forholdet får «Prinsipalt» (LV-U82). «NS 8407» står bare første gang (LV-U34).
 */
interface Svardelen {
  ns: { nevnt: boolean };
  /** Overskriften på svaret når brevet svarer på flere krav, ellers `null` (LV-U80, LV-U34). */
  del: string | null;
  subsidiaertTilForholdet: boolean;
  /** Punktet «Forholdet» står alt i en tidligere del av brevet («12 A» i #2337). */
  forholdetStaar: boolean;
}

/** Et standpunkt i et punkt i svaret, med laget, posten og innsigelsen det er (LV-U78, LV-U34, OV-U32, LV-U79). */
interface Svarledd {
  punkt: string;
  plass: number | null;
  post?: PostenISvaret;
  vilkaar: Vilkaar | null;
  tekst: string;
}

/**
 * Byggherrens svar i punkter (LV-U34, LV-U72, LV-U78): innledningen, punktene i sporet med en
 * lagslinje ved hvert standpunkt med etikett, og tabellen etter OV-U73. Begrunnelsen står som
 * utdypningen under punktet (KA-U46, designdelen). Punktet har et fast navn etter temaet, og
 * kravposten sin betegnelse (KA-U53), fordi skjemaet ikke kjenner standpunktenes id før brevet
 * skrives. Forbeholdet står sist i brevet (LV-U81, `lagBrevtekst`).
 */
function svarpunkter(s: Svar, t: Tekst, regler: Regelsett, nr: Svardelen): Brevpunkt[] {
  const { j, nytt } = t;
  // VS-U79: svaret på et varsel som står alene har `gjelder` lik varselet.
  if (j.element(s.gjelder).art === 'utsagn') return svarpunkterPaaVarselet(s, t, nr);
  const krav = j.krav(s.gjelder);
  const innsigelsene = aapneInnsigelser(s.spor, s.dokument, nytt.avsender, t, regler);
  const sporet = brevtekstI(s.spor);
  const fra = forholdetsLag(s, t, nr.forholdetStaar);
  const ledd: Svarledd[] = [...fra.ledd];
  const beloepene: Lagbeloep[] = [];
  const plassen = plassenI(s, fra.forskyvning);
  for (const p of s.standpunkter.filter(harTekst)) {
    const plass = plassen(p.id);
    const punkt = punktetFor(p, sporet, krav);
    const post = sporet.posten?.(p);
    ledd.push({
      punkt,
      plass,
      post,
      vilkaar: sporet.vilkaaret(p, krav),
      tekst: stor(
        p.art === 'rettidighet'
          ? rettidighetstekst(p, krav, j, innsigelsene, sporet, t)
          : standpunkttekst(p, s, krav, j)
      ),
    });
    if (p.art === 'beloep') beloepene.push({ post: punkt, plass, beloep: p.godkjent! });
    // LV-U78, LV-U34, OV-U32: beløpet etter begrensningen etter § 34.1.3 står i samme avsnitt som innsigelsen.
    if (p.art === 'rettidighet' && p.hjemmel === '34.1.3' && !p.iTide) {
      ledd.push({
        punkt: 'produktivitet',
        plass,
        post,
        vilkaar: null,
        tekst: `Byggherren godkjenner etter dette ${kroner(p.begrenset!)} av de krevde ${kroner(tilTall(krevdProduktivitet(krav)!))}.`,
      });
      beloepene.push({ post: 'produktivitet', plass, beloep: p.begrenset! });
    }
  }
  const lagene = Math.max(0, ...ledd.map((l) => l.plass ?? 0));
  // OV-U73: tabellen har lagene i sporet, så første og siste kolonne er beløpene i utregningen.
  const iSporet = (plass: number | null) => (plass === null ? null : plass - fra.forskyvning);
  const oversikten =
    sporet.oversikt?.(
      krav,
      beloepene.map((b) => ({ ...b, plass: iSporet(b.plass) })),
      lagene - fra.forskyvning,
      fra.forskyvning
    ) ?? null;
  // LV-U33, LV-U38: uten tabell sier punktet om varselet følgen for postene.
  if (!oversikten) {
    const varselet = ledd.find((l) => l.punkt === '34.1.2' && l.vilkaar);
    if (varselet && sporet.ingenBeloep)
      varselet.tekst = `${varselet.tekst} ${sporet.ingenBeloep(krav)}`;
  }
  return punkteneISvaret(s, nr, {
    ledd,
    fra,
    temaene: sporet.temaer(krav, t, regler),
    innledning: innledningen(s, krav, t),
    oversikten,
  });
}

/** Plassen standpunktet har i svaret: laget i sporet, etter lagene forholdet opptar (OV-U32). */
function plassenI(s: Svar, forskyvning: number): (standpunkt: string) => number | null {
  const virkning = new Map(s.beslutningsgrunnlag.virkninger.map((v) => [v.standpunkt, v.virkning]));
  return (standpunkt) => {
    const lag = laget(virkning.get(standpunkt)!);
    return lag === null ? null : lag + forskyvning;
  };
}

/**
 * Punktene i byggherrens svar etter LV-U34, LV-U72 og LV-U78, med standpunktene `ledd` i
 * temaene: innledningen, ett punkt per tema med en lagslinje ved hvert standpunkt med etikett,
 * tabellen etter OV-U73 og akseptfristen sist.
 */
function punkteneISvaret(
  s: Svar,
  nr: Svardelen,
  {
    ledd,
    fra,
    temaene,
    innledning,
    oversikten,
  }: {
    ledd: Svarledd[];
    fra: ReturnType<typeof forholdetsLag>;
    temaene: Tema[];
    innledning: string;
    oversikten: Oversikten | null;
  }
): Brevpunkt[] {
  const ordnet =
    ledd.some((l) => l.plass !== null && l.plass > 1) ||
    (s.spor === 'forhold' && nr.subsidiaertTilForholdet);

  // MM-U2: et standpunkt uten et tema i svaret avvises, i stedet for å falle ut av brevet.
  const utenTema = ledd.find((l) => !temaene.some((tema) => tema.punkt === l.punkt));
  if (utenTema)
    throw new KanIkkeUttrykkes(
      `standpunktet i punktet ${utenTema.punkt} har ikke noe tema i svaret`
    );
  const punkter: Tema[] = temaene.filter((tema) => ledd.some((l) => l.punkt === tema.punkt));
  if (oversikten) punkter.push({ punkt: OVERSIKTEN, overskrift: 'Oversikt' });

  // LV-U79, LV-U34: lagslinjen nevner innsigelsene i det nærmeste laget foran som rammer standpunktet.
  const vilkaarI = (lag: number): Vilkaar[] => [
    ...(fra.vilkaar.get(lag) ?? []),
    ...ledd.flatMap((l) => (l.vilkaar && l.plass === lag ? [l.vilkaar] : [])),
  ];
  const lagslinje = (plass: number, post: PostenISvaret) => {
    for (let lag = plass - 1; lag >= 1; lag--) {
      const navnene = [...new Set(vilkaarI(lag).flatMap((v) => (v.rammer(post) ? [v.navn] : [])))];
      if (navnene.length)
        return `${stor(etikett(plass))}, ${vilkaaretILagslinjen(navnene, plass > 2)}`;
    }
    return stor(etikett(plass));
  };

  const brevpunkter: Brevpunkt[] = [
    {
      punkt: INNLEDNINGEN,
      overskrift: nr.del,
      unummerert: true,
      avsnitt: [utenGjentattNs(innledning, nr.ns)],
    },
  ];
  for (const p of punkter) {
    const avsnitt: string[] = [];
    if (p.punkt === OVERSIKTEN) avsnitt.push(oversikten!.tabell);
    else {
      // OV-U32: et upåvirket standpunkt står uten etikett, så det står foran lagene i punktet.
      const iPunktet = ledd
        .filter((l) => l.punkt === p.punkt)
        .sort((a, b) => (a.plass ?? 0) - (b.plass ?? 0));
      let forrige: number | null | undefined;
      for (const l of iPunktet) {
        const tekst = utenGjentattNs(l.tekst, nr.ns);
        if (ordnet && l.plass !== null && l.plass !== forrige)
          avsnitt.push(lagslinje(l.plass, l.post), tekst);
        else if (forrige !== undefined && l.plass === forrige)
          avsnitt.push(`${avsnitt.pop()} ${tekst}`);
        else avsnitt.push(tekst);
        forrige = l.plass;
      }
    }
    brevpunkter.push({
      punkt: p.punkt,
      overskrift: p.overskrift,
      avsnitt,
      ...(p.punkt === OVERSIKTEN ? { poster: oversikten!.poster } : {}),
    });
  }
  brevpunkter.push(...akseptfristpunktet(s));
  return brevpunkter;
}

/** Temaene i svaret på varselet etter § 34.3.3 første ledd og § 34.4 (VS-U77 punkt 30 og 31). */
const TEMAENE_I_SVARET_PAA_VARSELET: Tema[] = [
  { punkt: FORHOLDET, overskrift: 'Forholdet' },
  { punkt: '34.3.3', overskrift: 'Varselet om justering av enhetsprisene (punkt 34.3.3)' },
  { punkt: '34.4', overskrift: 'Varselet om regningsarbeid (punkt 34.4)' },
  { punkt: 'justering', overskrift: 'Justering av enhetsprisene (punkt 34.3.2)' },
];

/**
 * Byggherrens svar på et varsel etter § 34.3.3 første ledd eller § 34.4 som står alene (VS-U77
 * punkt 30 og 31, VS-U79), i punkter som svaret på kravet (LV-U34). Innsigelsen står
 * prinsipalt og justeringen subsidiært, med lagene i beslutningsgrunnlaget (VS-U4), etter lagene
 * svaret på forholdet opptar (OV-U32). Svaret har ingen kravposter, beløp eller tabell.
 */
function svarpunkterPaaVarselet(s: Svar, t: Tekst, nr: Svardelen): Brevpunkt[] {
  const { j } = t;
  const hjemmel = varselhjemmel(s.gjelder, j);
  if (hjemmel !== '34.3.3' && hjemmel !== '34.4')
    throw new KanIkkeUttrykkes(`svaret gjelder et varsel etter § ${hjemmel}, som står i kravet`);
  const fra = forholdetsLag(s, t, nr.forholdetStaar);
  const plassen = plassenI(s, fra.forskyvning);
  const ledd: Svarledd[] = [
    ...fra.ledd,
    ...s.standpunkter.map((p): Svarledd => {
      if (p.art === 'rettidighet')
        return {
          punkt: hjemmel,
          plass: plassen(p.id),
          vilkaar: p.iTide ? null : helt(INNSIGELSEN_MOT.varselet(hjemmel)),
          tekst: stor(varseltekst(p, 'varselet', [], t)),
        };
      if (p.art === 'justering')
        return {
          punkt: 'justering',
          plass: plassen(p.id),
          vilkaar: null,
          tekst: stor(justeringstekst(p.godtar, null)),
        };
      throw new KanIkkeUttrykkes(`standpunktet ${p.art} har ikke noe punkt i svaret på varselet`);
    }),
  ];
  return punkteneISvaret(s, nr, {
    ledd,
    fra,
    temaene: TEMAENE_I_SVARET_PAA_VARSELET,
    innledning: `Byggherren svarer på ${beskriv(s.gjelder, j)}.${forrigeSvar(s, j)}`,
    oversikten: null,
  });
}

/**
 * HF-U23 punkt 2, LV-U2, LV-U3: brevet meddeler akseptfristen med datoen, sist i svaret og uten
 * å si hva den betyr (punkt 5). Ordlyden er arbeidsvalget 14.11 i #502. Punktet «Forbehold» står
 * etter, sist i brevet (LV-U81, ordvalg 6 i #2337).
 */
const akseptfristpunktet = (s: Svar): Brevpunkt[] =>
  s.akseptfrist === null
    ? []
    : [
        {
          punkt: AKSEPTFRISTEN,
          overskrift: null,
          avsnitt: [`Akseptfrist: ${norskDato(s.akseptfrist)}.`],
        },
      ];

/**
 * LV-U34: «NS 8407» står bare første gang i brevet. En henvisning til et punkt med bare ett
 * nummer har alltid «NS 8407» foran (LV-U40).
 */
function utenGjentattNs(tekst: string, ns: { nevnt: boolean }): string {
  return tekst.replace(/NS 8407 punkt (\d+(?:\.\d+)+)/g, (hele, punkt: string) => {
    if (!ns.nevnt) {
      ns.nevnt = true;
      return hele;
    }
    return `punkt ${punkt}`;
  });
}

/** Innledningen i svaret (LV-U34, LV-U41), med setningene om byggherrens forrige svar (LV-U73). */
function innledningen(s: Svar, krav: Krav, { j }: Tekst): string {
  return `${brevtekstI(s.spor).innledning(krav, { j })}${forrigeSvar(s, j)}`;
}

/** LV-U73: setningene om byggherrens forrige svar, med mellomrom foran, eller ingenting. */
const forrigeSvar = (s: Svar, j: Journalen): string =>
  s.erstatter
    ? ` Dette er byggherrens nye svar. Byggherrens forrige svar står i ${j.brevet(j.svar(s.erstatter).dokument)}.`
    : '';

/** Punktet standpunktet står i (LV-U34): punktet i sporet, eller bestemmelsen for rettidigheten. */
function punktetFor(p: Standpunkt, sporet: Sporsbrevtekst, krav: Krav): string {
  const punkt = sporet.punktet(p, krav);
  if (punkt !== undefined) return punkt;
  if (p.art === 'rettidighet') return p.hjemmel;
  throw new KanIkkeUttrykkes(`standpunktet ${p.art} har ikke noe punkt i svaret`);
}

/** Navnet på innsigelsen fra svaret på forholdet i lagslinjen (LV-U79, LV-U34). */
const GRUNNEN_I_LAGSLINJEN: Record<Subsidiaergrunn, string> = {
  prekludert: INNSIGELSEN_MOT.varselet('32.2'),
  avslaatt: INNSIGELSEN_MOT.forholdet,
};

/**
 * OV-U32 og LV-U34: et avslått eller prekludert forhold står først, og lagene i sporet flyttes
 * ned med antallet lag det opptar, ett for preklusjonen etter § 32.2 og ett for avslaget. Står
 * svaret på forholdet i samme brev, nevner lagslinjene innsigelsene i det (`vilkaar`, LV-U79).
 * Står det i et tidligere brev, har svaret et eget punkt «Forholdet» med det byggherren sa der,
 * med mindre punktet alt står i brevet (`staar`, «12 A» i #2337).
 */
function forholdetsLag(
  s: Svar,
  { j, saken, nytt }: Pick<Tekst, 'j' | 'saken' | 'nytt'>,
  staar: boolean
): { forskyvning: number; ledd: Svarledd[]; vilkaar: Map<number, Vilkaar[]> } {
  const ingen = { forskyvning: 0, ledd: [], vilkaar: new Map() };
  if (s.spor === 'forhold') return ingen;
  const g = svaretPaaForholdet({ j, saken, nytt });
  if (!g) return ingen;
  const grunner = grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger);
  if (nytt.id === g.dokument || staar)
    return {
      forskyvning: grunner.length,
      ledd: [],
      vilkaar: new Map(grunner.map((grunn, i) => [i + 1, [helt(GRUNNEN_I_LAGSLINJEN[grunn])]])),
    };
  const brevet = j.brevet(g.dokument);
  const ledd: Svarledd[] = grunner.map((grunn, i) => ({
    punkt: FORHOLDET,
    plass: i + 1,
    vilkaar: helt(GRUNNEN_I_LAGSLINJEN[grunn]),
    tekst:
      grunn === 'prekludert'
        ? `Byggherren har i ${brevet} gjort gjeldende at totalentreprenørens varsel etter NS 8407 punkt 32.2 kom for sent.`
        : // MM-U50, LV-U41: det byggherren sa i det tidligere svaret, med de samme ordene.
          g.beslutningsgrunnlag.varslingsplikt
          ? `Byggherren har avslått kravet på endringsordre i ${brevet}.`
          : harRisikoen(j.krav(g.gjelder))
            ? `Byggherren har i ${brevet} svart at byggherren ikke har risikoen for forholdet.`
            : `Byggherren har avslått forholdet i ${brevet}.`,
  }));
  return { forskyvning: grunner.length, ledd, vilkaar: new Map() };
}

/** En innsigelse forespørselen fastholder, og varslene den sier kom for sent (LV-U49). */
interface Fastholdt {
  hva: string;
  varslene: string[];
}

/**
 * LV-U76 og LV-U77: innsigelsene byggherren fastholder i forespørselen etter § 33.6.2, i
 * rekkefølgen etter OV-U32: preklusjonen etter § 32.2, avslaget av forholdet og preklusjonen
 * etter § 33.4. Hver viser til varselet og til brevet der byggherren gjorde den gjeldende (LV-U4
 * punkt 5). En innsigelse byggherren har gitt opp, er ikke med. Et ubesvart forhold er GR-U34,
 * og avslaget leses bare av svaret på gjeldende versjon.
 */
function innsigelseneIForesporselen(t: Tekst, regler: Regelsett): Fastholdt[] {
  const { j, nytt, saken } = t;
  const rekkefoelge = j.dokumenter.map((d) => d.id);
  const iRekkefoelge = (ider: string[]) =>
    [...new Set(ider)].sort((a, b) => rekkefoelge.indexOf(a) - rekkefoelge.indexOf(b));
  const brevene = (ider: string[]) => liste(iRekkefoelge(ider).map((d) => j.brevet(d)));
  const jfInnsigelsen = (dokumenter: string[]) =>
    `, jf. ${new Set(dokumenter).size > 1 ? 'innsigelsene' : 'innsigelsen'} i ${brevene(dokumenter)}`;
  const kom = (hjemmel: '32.2' | '33.4', p: { gjelder: string; dokument: string }[]) => {
    const varslene = iRekkefoelge(p.map((x) => x.gjelder));
    return {
      hva: `at ${VARSELET_I_SVARET[hjemmel]} i ${brevene(varslene.map((v) => j.dokumentetTil(v)))} kom for sent${jfInnsigelsen(p.map((x) => x.dokument))}`,
      varslene,
    };
  };
  const aapne = (spor: Spor, hjemmel: Hjemmel) =>
    aapneInnsigelser(spor, nytt.id, nytt.avsender, t, regler).filter((i) => i.hjemmel === hjemmel);
  const ut: Fastholdt[] = [];

  // Byggherrens siste standpunkt etter § 32.2 i et svar på forholdet, også på en tidligere
  // påberopelsesversjon, fordi varselet er det samme i hver versjon (arbeidsvalget 15.10 i #500).
  // Standpunktet viser til varselet det gjelder (VS-U86 punkt 10).
  let preklusjonen: { gjelder: string; dokument: string } | null = null;
  for (const d of j.dokumenter) {
    if (d.avsender !== nytt.avsender || d.id === nytt.id) continue;
    for (const svar of d.svar) {
      if (svar.spor !== 'forhold' || saken.utenVirkning.includes(svar.id)) continue;
      const p = svar.standpunkter.find(
        (x): x is Extract<Standpunkt, { art: 'rettidighet' }> =>
          x.art === 'rettidighet' && x.hjemmel === '32.2'
      );
      if (p) preklusjonen = p.iTide ? null : { gjelder: p.gjelder, dokument: d.id };
    }
  }
  const etter322 = [...(preklusjonen ? [preklusjonen] : []), ...aapne('forhold', '32.2')];
  if (etter322.length) ut.push(kom('32.2', etter322));

  const g = svaretPaaForholdet(t);
  if (g && grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger).includes('avslaatt')) {
    // MM-U50, LV-U41: det byggherren sa i svaret, med de samme ordene som i svarene (`forholdetsLag`).
    const avslaget = g.beslutningsgrunnlag.varslingsplikt
      ? 'avslaget av kravet på endringsordre'
      : harRisikoen(j.krav(g.gjelder))
        ? 'at byggherren ikke har risikoen for forholdet'
        : 'avslaget av forholdet';
    ut.push({ hva: `${avslaget}, jf. svaret i ${j.brevet(g.dokument)}`, varslene: [] });
  }

  const etter334 = aapne('frist', '33.4');
  // Saken har ett varsel etter § 33.4 (SK-12, `VARSEL_REGISTRERT`), og en innsigelse mot
  // fristkravet er ingen påberopelse etter § 33.4 (VS-U24).
  if (new Set(etter334.map((i) => i.gjelder)).size > 1)
    throw new KanIkkeUttrykkes('innsigelsene etter § 33.4 gjelder flere varsler');
  if (etter334.length) ut.push(kom('33.4', etter334));
  return ut;
}

/** Forbeholdet i forespørselen etter § 33.6.2 (LV-U76, LV-U77), eller tomt uten innsigelser. */
function forbeholdetIForesporselen(t: Tekst, regler: Regelsett): string[] {
  const innsigelser = innsigelseneIForesporselen(t, regler).map((i) => i.hva);
  if (!innsigelser.length) return [];
  return [
    ...innsigelser.map((hva, i) =>
      i === 0
        ? `Byggherren fastholder ${etikett(1)} ${hva}.`
        : `${stor(etikett(i + 1))} fastholder byggherren ${hva}.`
    ),
    `Forespørselen sendes for det tilfellet at ${innsigelser.length > 1 ? 'innsigelsene' : 'innsigelsen'} ikke fører frem.`,
  ];
}

/**
 * LV-U49: varslene forbeholdet i en forespørsel etter § 33.6.2 i `nytt` sier kom for sent, som
 * brevet bestrider. `lagDeresRef` tar brevene de står i.
 */
export function forbeholdetBestrider(
  nytt: Dokument,
  foer: Domenehendelse[],
  saken: Saken,
  regler: Regelsett
): string[] {
  if (!nytt.utsagn.some((u) => u.art === 'foresporsel')) return [];
  const t: Tekst = { j: new Journalen(foer, nytt), saken, nytt, sak: '' };
  return innsigelseneIForesporselen(t, regler).flatMap((i) => i.varslene);
}

/**
 * GR-U34 punkt 3–5 med GR-U33: forbeholdet når byggherren svarer på vederlaget uten å ha svart
 * på gjeldende versjon av forholdet, i brevet eller før det, og forholdet ikke er avklart ved
 * frafall (GR-U23). Det står under «Forbehold» sist i svaret og er ikke et lag.
 */
function forbeholdetForForholdet(s: Svar, { j, saken, nytt }: Tekst): string[] {
  if (!forholdetErUbesvart(s, { saken, nytt })) return [];
  if (!s.paaberopelse) throw new KanIkkeUttrykkes(`${s.id} viser ikke til påberopelsen`);
  const paaberopelse = j.krav(s.paaberopelse);
  return [
    `Byggherren har ennå ikke svart på totalentreprenørens ${paaberopelsenAvForholdet(paaberopelse)} i ${j.brevet(paaberopelse.dokument)}.`,
    'Standpunktene ovenfor gjelder under forutsetning av at forholdet gir grunnlag for kravet.',
  ];
}

/** Rettidigheten i sporet som ikke gjelder et varsel (`Sporsbrevtekst.rettidighetUtenVarsel`). */
const utenVarsel = (p: Extract<Standpunkt, { art: 'rettidighet' }>, sporet: Sporsbrevtekst) =>
  sporet.rettidighetUtenVarsel?.[p.hjemmel];

/** Varselet et standpunkt om rettidighet i svaret gjelder (LV-U34). */
const VARSELET_I_SVARET: Record<Hjemmel, string> = {
  '32.2': 'totalentreprenørens varsel etter NS 8407 punkt 32.2',
  '33.4': 'varselet om fristforlengelse etter NS 8407 punkt 33.4',
  '33.6.2': 'totalentreprenørens svar på forespørselen etter NS 8407 punkt 33.6.2',
  '34.1.2': 'varselet om vederlagsjustering etter NS 8407 punkt 34.1.2',
  '34.1.3':
    'varselet om særskilt justering for nedsatt produktivitet eller forstyrrelser etter NS 8407 punkt 34.1.3 tredje ledd',
  '34.3.3': 'varselet om justering av enhetsprisene etter NS 8407 punkt 34.3.3 første ledd',
  '34.4': 'varselet om regningsarbeid etter NS 8407 punkt 34.4',
};

/**
 * Standpunktet om rettidighet i svaret (LV-U4 punkt 5, OV-U28,
 * KA-U64), med partene skrevet fullt ut (`docs/sprak.md`) og «punkt» (LV-U39). Beløpet etter
 * begrensningen etter § 34.1.3 står under punktet for posten (LV-U34).
 */
function rettidighetstekst(
  p: Extract<Standpunkt, { art: 'rettidighet' }>,
  krav: Krav,
  j: Journalen,
  innsigelsene: Innsigelse[],
  sporet: Sporsbrevtekst,
  { saken, nytt }: Pick<Tekst, 'saken' | 'nytt'>
): string {
  const aapne = innsigelsene.filter((i) => i.hjemmel === p.hjemmel);
  const brevene = liste([...new Set(aapne.map((i) => j.brevet(i.dokument)))]);
  const henvisning = aapne.length > 1 ? 'innsigelsene' : 'innsigelsen';
  const jf = aapne.length ? `, jf. ${henvisning} i ${brevene}` : '';
  if (erKravpostvarselhjemmel(p.hjemmel))
    return varseltekst(
      p,
      `${VARSELET_I_SVARET[p.hjemmel]} for ${kravpostenI(krav, p.gjelder).betegnelse}`,
      kravposterI(krav),
      { j, saken, nytt }
    );
  const gjelder = utenVarsel(p, sporet)?.(p.gjelder, j) ?? p.gjelder;
  const omVarselet = `${VARSELET_I_SVARET[p.hjemmel]} i ${j.brevet(j.dokumentetTil(gjelder))}`;
  if (!p.iTide && p.hjemmel === '34.1.3')
    return `byggherren gjør gjeldende at ${omVarselet} kom for sent${jf}, og at totalentreprenøren har tapt retten til å påberope seg påløpte utgifter som grunnlag for kravet.`;
  if (!p.iTide) return `byggherren gjør gjeldende at ${omVarselet} kom for sent${jf}.`;
  return aapne.length
    ? `byggherren gir opp ${henvisning} etter NS 8407 punkt 5 i ${brevene} og gjør ikke gjeldende at ${omVarselet} kom for sent.`
    : `byggherren gjør ikke gjeldende at ${omVarselet} kom for sent.`;
}

/**
 * Standpunktet til varselet etter § 34.3.3 første ledd eller § 34.4 (VS-U77 punkt 30 og 31), i
 * svaret på kravposten eller på varselet. `om` er varselet slik brevet nevner det. Innsigelsen
 * fra et tidligere svar på varselet eller kravposten står for posten, og svaret gjentar den
 * eller gir den opp (VS-U77 punkt 9, 10, 33 og 34). Etter § 34.4 sier svaret på kravposten
 * «ikke ble gitt eller kom for sent», og svaret på varselet «kom for sent» (punkt 31).
 */
function varseltekst(
  p: Extract<Standpunkt, { art: 'rettidighet' }>,
  om: string,
  poster: readonly Kravpost[],
  { j, saken, nytt }: Pick<Tekst, 'j' | 'saken' | 'nytt'>
): string {
  const foer = sisteStandpunktTilVarslene(
    j.dokumenter
      .filter((d) => d.id !== nytt.id)
      .flatMap((d) =>
        d.svar
          .filter((x) => x.spor === 'vederlag' && !saken.utenVirkning.includes(x.id))
          .map((x) => ({
            s: x,
            dag: dagenSendt({ id: x.id, dokument: d.id }, d) ?? '',
            lagtTil: erRegistrert(d.opplysninger),
          }))
      ),
    poster
  ).find((x) => x.gjelder === p.gjelder && x.hjemmel === p.hjemmel && !x.iTide);
  const brevet = foer && j.brevet(foer.dokument);
  const jf = brevet ? `, jf. innsigelsen i ${brevet}` : '';
  const forSent =
    p.hjemmel === '34.4' && poster.some((x) => x.id === p.gjelder)
      ? 'ikke ble gitt eller kom for sent'
      : 'kom for sent';
  // MM-U50: innsigelsen i svaret på varselet sa «kom for sent» (punkt 31).
  const iSvaretPaaVarselet =
    foer !== undefined &&
    j.dokumenter.some(
      (d) => d.id === foer.dokument && d.svar.some((x) => j.element(x.gjelder).art === 'utsagn')
    );
  // VS-U63: etter § 34.4 er «i tide» at byggherren gir opp innsigelsen (`kontrollerOppgivelsenEtter344`).
  if (p.iTide && p.hjemmel === '34.4')
    return `byggherren gir opp innsigelsen${brevet ? ` i ${brevet}` : ''} om at ${om} ${iSvaretPaaVarselet ? 'kom for sent' : forSent}.`;
  if (p.iTide && brevet)
    return `byggherren gir opp innsigelsen i ${brevet} og gjør ikke gjeldende at ${om} kom for sent.`;
  if (p.iTide) return `byggherren gjør ikke gjeldende at ${om} kom for sent.`;
  return p.hjemmel === '34.3.3'
    ? `byggherren gjør gjeldende at ${om} kom for sent${jf}, og at totalentreprenøren bare har krav på den justeringen av enhetsprisene byggherren måtte forstå at forholdet ville føre til.`
    : `byggherren gjør gjeldende at ${om} ${forSent}${jf}.`;
}

/** KA-U72: standpunktet til beløpet for en kravpost der tilbudet ikke er akseptert, står ikke i brevet. */
const harTekst = (p: Standpunkt): boolean => !(p.art === 'beloep' && p.godkjent === undefined);

/**
 * Ett standpunkt som ikke er om rettidighet, som en setning med liten forbokstav (LV-U4 punkt 5,
 * LV-U5, GR-U14). Teksten står i sporet.
 */
function standpunkttekst(p: Standpunkt, s: Svar, krav: Krav, j: Journalen): string {
  if (!erArtISporene(p)) throw new KanIkkeUttrykkes(`standpunktet ${p.art} har ingen brevtekst`);
  return standpunktetISporet(p.art, p, krav, s, j);
}

/** Det en innsigelse eller en protest viser til, med brevet det står i (LV-U4 punkt 7 og 8). */
function beskriv(id: string, j: Journalen): string {
  const e = j.element(id);
  switch (e.art) {
    case 'krav': {
      const om = brevtekstI(e.krav.spor).kravetOm;
      return `${PARTENS.TE} krav${om ? ` om ${om}` : ''} i ${j.brevet(e.krav.dokument)}`;
    }
    case 'svar':
      return `byggherrens svar i ${j.brevet(e.svar.dokument)}`;
    case 'standpunkt': {
      const p = e.standpunkt;
      const hva =
        p.art === 'rettidighet' && utenVarsel(p, brevtekstI(e.svar.spor))
          ? `at ${VARSELET_I_SVARET[p.hjemmel]} kom for sent`
          : 'for sen varsling';
      return `påberopelsen av ${hva} i svaret i ${j.brevet(e.svar.dokument)}`;
    }
    case 'utsagn':
      if (e.utsagn.art === 'varsel')
        return `${PARTENS.TE} varsel ${VARSEL_OM[uttrykkbar(e.utsagn.hjemmel)]} i ${j.brevet(e.dokument)}`;
      if (e.utsagn.art === 'innsigelse') return `innsigelsen i ${j.brevet(e.dokument)}`;
      if (e.utsagn.art === 'foresporselssvar')
        return `${PARTENS.TE} svar i ${j.brevet(e.dokument)} på forespørselen etter NS 8407 punkt 33.6.2`;
      break;
    case 'dokument':
      return `innsigelsene i ${j.brevet(e.dokument.id)}`;
  }
  throw new KanIkkeUttrykkes(`${id} har ingen brevtekst som det et utsagn viser til`);
}

/**
 * Det registrerte varselet etter § 32.2 har ingen brevtekst ennå: teksten når et svar viser
 * til det, venter på S-4 i #807, og fra løsningen er påberopelsen varselet (GR-U31).
 */
function uttrykkbar(hjemmel: Varselhjemmel): Kravvarselhjemmel {
  if (hjemmel === '32.2')
    throw new KanIkkeUttrykkes('varselet etter § 32.2 sendt utenfor løsningen har ingen brevtekst');
  return hjemmel;
}

/** VS-U15 og LV-U19: det TE varsler at TE vil kreve. */
const VIL_KREVE: Record<Kravvarselhjemmel, string> = {
  '33.4': 'fristforlengelse',
  '34.1.2': 'justering av vederlaget',
  '34.1.3': `særskilt justering av vederlaget etter annet ledd for ${PRODUKTIVITET}`,
  '34.3.3': 'justering av enhetsprisene',
  '34.4': 'oppgjør som regningsarbeid',
};

/** Hjemmelen for varselet en datoopplysning i et registrert brev gjelder (HF-U1). */
function varselhjemmel(id: string, j: Journalen): Varselhjemmel {
  const e = j.element(id);
  if (e.art === 'utsagn' && e.utsagn.art === 'varsel') return e.utsagn.hjemmel;
  throw new KanIkkeUttrykkes(`${id} er ikke et varsel`);
}

/** LV-U4 punkt 3 og 6–13, og VS-U15, KA-U22 og KA-U34 (opphevet av KA-U46) ordrett. */
function utsagnstekst(u: Utsagn, t: Tekst, regler: Regelsett): string {
  const { j, saken, nytt, sak } = t;
  const part = PART[nytt.avsender];
  switch (u.art) {
    case 'varsel': {
      const hjemmel = uttrykkbar(u.hjemmel);
      // VS-U15, LV-U19: varselet står alene i brevet. Ellers VS-U34.
      if (nytt.utsagn.length === 1 && !nytt.krav.length && !nytt.svar.length)
        return `Totalentreprenøren varsler etter ${VARSLET_ETTER[hjemmel]} at totalentreprenøren vil kreve ${VIL_KREVE[hjemmel]} som følge av forholdet i ${sak}.`;
      throw new KanIkkeUttrykkes('et varsel i et brev fra løsningen står alene i brevet (VS-U15)');
    }
    case 'aksept': {
      const svar = j.svar(u.gjelder);
      const godtar = `Totalentreprenøren godtar byggherrens svar på ${brevtekstI(svar.spor).svaretGjelder(j.krav(svar.gjelder))} i ${j.brevet(svar.dokument)}.`;
      // GR-U7: enigheten gjelder beløpet eller dagene, ikke standpunktet til forholdet.
      const aksept =
        svar.spor === 'forhold' || !saken.subsidiaer[svar.spor].length
          ? godtar
          : `${godtar} Totalentreprenøren er enig i ${brevtekstI(svar.spor).enigI}, men ikke i byggherrens standpunkt til forholdet.`;
      // HF-U23 punkt 7: brevet sier bare at aksepten er sendt etter fristen (punkt 5).
      return etterAkseptfristen(svar.akseptfrist, registrertDato(nytt))
        ? `${aksept} Aksepten er sendt etter akseptfristen ${norskDato(svar.akseptfrist!)} i byggherrens svar.`
        : aksept;
    }
    case 'trekk': {
      const krav = j.krav(u.gjelder);
      // KA-U22, ordrett med saken satt inn.
      if (krav.spor === 'forhold')
        return `Totalentreprenøren trekker sitt krav i ${sak}. Trekket er avkall på alle krav i saken, også vederlag og fristforlengelse byggherren har godkjent. Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.`;
      const sporet = brevtekstI(krav.spor);
      const verdi = sporet.trukket(krav);
      return `Totalentreprenøren trekker kravet om ${sporet.kravetOm} i ${sak}, fremsatt i ${j.brevet(krav.dokument)} (${verdi}). Trekket er avkall på dette kravet, også det byggherren har godkjent.`;
    }
    case 'innsigelse':
      // VS-U29: standpunktet om at begrunnelsen ikke er et svar etter § 33.6.2 annet ledd, uten
      // henvisningen til § 5 (arbeidsvalget 21.10 i #1095).
      if (u.grunn === 'ikke_svar')
        return `${part} gjør gjeldende at ${beskriv(u.gjelder, j)} ikke er et svar etter punkt 33.6.2 annet ledd.`;
      return `${part} gjør gjeldende at ${beskriv(u.gjelder, j)} kom for sent (NS 8407 punkt 5 tredje ledd).`;
    case 'foresporsel':
      // LV-U18 setning 1, ordrett med saken satt inn, og forbeholdet etter LV-U76 og LV-U77.
      return [
        `Byggherren ber etter NS 8407 punkt 33.6.2 totalentreprenøren angi og begrunne det antall dager totalentreprenøren krever som fristforlengelse som følge av forholdet i ${sak}. Svarer ikke totalentreprenøren, tapes kravet på fristforlengelse. Har totalentreprenøren ikke grunnlag for å beregne kravet, skal totalentreprenøren i stedet begrunne hvorfor grunnlaget ikke foreligger.`,
        ...forbeholdetIForesporselen(t, regler),
      ].join(' ');
    case 'foresporselssvar':
      // LV-U18 setning 2. TEs begrunnelse følger som utdypningen.
      return `Totalentreprenøren svarer på byggherrens forespørsel etter NS 8407 punkt 33.6.2 i ${j.brevet(j.dokumentetTil(u.gjelder))} at grunnlaget for å beregne kravet ikke foreligger (punkt 33.6.2 annet ledd b).`;
    case 'protest':
      return `${part} protesterer mot ${beskriv(u.gjelder, j)}.`;
    case 'passivitet': {
      const krav = j.krav(u.gjelder);
      return `Totalentreprenøren gjør gjeldende at byggherren ikke svarte uten ugrunnet opphold på ${PARTENS.TE} varsel etter NS 8407 punkt 32.2 i ${j.brevet(krav.dokument)}, og at pålegget derfor anses å innebære en endring (punkt 32.3 annet ledd).`;
    }
    case 'bestridelse': {
      const e = j.element(u.gjelder);
      if (e.art !== 'opplysning') throw new KanIkkeUttrykkes(`${u.gjelder} er ikke en opplysning`);
      return `${part} bestrider opplysningen i ${j.brevet(e.opplysning.dokument)} om at ${opplysningen(e.opplysning, j)}.`;
    }
    case 'korrigering': {
      // Punkt 10 i samlevedtaket for retting av sendt brev (MM-U59), med partene skrevet fullt
      // ut (`docs/sprak.md`) og henvisningen etter LV-U44.
      const e = j.element(u.gjelder);
      const [dokument, tidligere] =
        e.art === 'krav'
          ? [e.krav.dokument, innholdIForholdet(e.krav).datoer[u.felt]]
          : e.art === 'utsagn' && e.utsagn.art === 'korrigering'
            ? [e.dokument, e.utsagn.dato]
            : [null, null];
      if (dokument === null || typeof tidligere !== 'string')
        throw new KanIkkeUttrykkes(`${u.gjelder} har ingen opplysning om datoen`);
      return `Totalentreprenøren oppgir nå at ${DATOEN_GJELDER[u.felt]} ${norskDato(u.dato)}. I ${j.brevet(dokument)} oppga totalentreprenøren ${norskDato(tidligere)}.`;
    }
    case 'begrunnelse': {
      // KA-U34: byggherrens tekst følger som utdypningen.
      const svar = j.svar(u.gjelder);
      return `Byggherren begrunner sitt svar på ${brevtekstI(svar.spor).svaretGjelder(j.krav(svar.gjelder))} i ${j.brevet(svar.dokument)}:`;
    }
  }
}

/** Det en opplysning sier, som en leddsetning: «brevet ble sendt 2. oktober 2026» (LV-U4 punkt 10). */
function opplysningen(o: Opplysning, j: Journalen): string {
  switch (o.hva) {
    case 'sendt':
    case 'mottatt':
      return `${o.gjelder ? `varselet etter NS 8407 punkt ${varselhjemmel(o.gjelder, j)} i brevet` : 'brevet'} ble ${o.hva} ${norskDato(o.dato)}`;
    case 'endringsordre':
      return `${o.brev === o.dokument ? 'brevet' : j.brevet(o.brev)} ${o.oppfylt ? 'var' : 'ikke var'} en endringsordre etter NS 8407 punkt 31.3`;
  }
}

/** LV-U4 punkt 11. */
function opplysningstekst(o: Opplysning, avsender: Part, j: Journalen): string {
  if (erDato(o) || o.brev === o.dokument)
    throw new KanIkkeUttrykkes(`opplysningen ${o.hva} i et brev fra appen har ingen brevtekst`);
  return `${PART[avsender]} opplyser at ${opplysningen(o, j)}.`;
}

// ---------- Brevhodet (LV-U23, LV-U27) ----------

/** Utsagnene som svarer på, godtar eller bestrider det de `gjelder` (LV-U49). */
const SVARER_GODTAR_BESTRIDER = new Set<Utsagn['art']>([
  'aksept',
  'innsigelse',
  'bestridelse',
  'protest',
  'foresporselssvar',
]);

/**
 * Deres ref. i hodet på brevet `nytt`: merkingen på hvert av motpartens brev som utsagnene i
 * brevet svarer på, godtar eller bestrider, slik de uttrykkelig viser til dem (LV-U49, HF-U1),
 * i rekkefølgen etter brevnummeret (U-2 i BF-07). En ny kravversjon viser til byggherrens siste
 * svar på kravversjonen den erstatter, slik journalen står når den sendes, lest av `erstatter`
 * og `gjelder` og ikke av rekkefølgen (LV-U50, LV-U51). Et eget brev står ikke, og heller ikke
 * motpartens brev uten merking, som registrert korrespondanse (LV-U27: «når de finnes»).
 */
export function lagDeresRef(nytt: Dokument, foer: Domenehendelse[], bestrider: string[]): string[] {
  const j = new Journalen(foer, nytt);
  const viserTil: string[] = [
    ...bestrider,
    ...nytt.svar.map((s) => s.gjelder),
    ...nytt.svar.flatMap((s) => s.standpunkter.flatMap(detRettidighetenGjelder)),
    ...nytt.utsagn.flatMap((x) =>
      SVARER_GODTAR_BESTRIDER.has(x.art) && 'gjelder' in x ? [x.gjelder] : []
    ),
    ...nytt.krav.flatMap((k) => (k.erstatter ? sisteSvarPaa(k.erstatter, j) : [])),
    // LV-U49: kravet som svarer på forespørselen etter § 33.6.2, svarer på byggherrens brev.
    ...nytt.krav.flatMap((k) => (k.gjelder ? [k.gjelder] : [])),
  ];
  const brev = new Map<string, Dokument>();
  for (const id of viserTil) {
    const d = j.dokumentMed(id);
    if (d && d.id !== nytt.id && d.avsender !== nytt.avsender && d.merking !== null)
      brev.set(d.id, d);
  }
  return [...brev.values()]
    .sort((a, b) => (a.brevnummer ?? 0) - (b.brevnummer ?? 0))
    .map((d) => d.merking!);
}

/**
 * Det et standpunkt om rettidighet gjelder: varselet, kravversjonen eller TEs svar på
 * forespørselen etter § 33.6.2, også når svaret er en begrunnelse i et eget brev (LV-U49, D-1 og
 * U-6 i BF-07, arbeidsvalgene A i #1497), også det første grunnlagskravet etter § 32.2
 * (VS-U86 punkt 10). Forespørselen, som brevteksten nevner for § 33.6.2, er byggherrens eget brev og holdes ute av
 * filteret på avsender i `lagDeresRef`.
 */
const detRettidighetenGjelder = (p: Standpunkt): string[] =>
  p.art === 'rettidighet' ? [p.gjelder] : [];

/** LV-U51: svaret på kravversjonen som ingen senere revisjon erstatter, eller ingen. */
function sisteSvarPaa(krav: string, j: Journalen): string[] {
  const svar = j.dokumenter.flatMap((d) => d.svar.filter((s) => s.gjelder === krav));
  const erstattet = new Set(svar.map((s) => s.erstatter));
  return svar.filter((s) => !erstattet.has(s.id)).map((s) => s.id);
}

// ---------- Gjengivelsen (LV-U2) ----------

/** Teksten i avsnittene slik et dokument gjengir den: den låste delen, så utdypningen. */
export function gjengi(brevtekst: Avsnitt[]): string {
  // Bare tabellen etter OV-U73 har tabulator mellom cellene. Ellers settes tabulator, også i
  // partens tekst, som mellomrom, så PDF-en ikke leser teksten som en rad i tabellen.
  return brevtekst
    .flatMap((a) => {
      const tekst = a.utdypning ? [a.laast, a.utdypning] : [a.laast];
      return tekst.map((t, i) => (a.punkt === OVERSIKTEN && i === 0 ? t : t.replace(/\t/g, ' ')));
    })
    .join('\n\n');
}

const deler = (brevtekst: Avsnitt[]) =>
  brevtekst.flatMap((a) => (a.utdypning ? [a.laast, a.utdypning] : [a.laast]));

const normalisert = (t: string) => t.replace(/\s+/g, ' ').trim();

/**
 * LV-U2: `gjengitt` er en tro gjengivelse av den frosne teksten når hvert låst
 * avsnitt og hver utdypning står ordrett, i samme rekkefølge. Mellomrom og
 * linjeskift kan være annerledes, slik en PDF bryter linjene.
 */
export function gjengirTro(gjengitt: string, brevtekst: Avsnitt[]): boolean {
  const tekst = normalisert(gjengitt);
  let fra = 0;
  for (const del of deler(brevtekst).map(normalisert)) {
    const plass = tekst.indexOf(del, fra);
    if (plass < 0) return false;
    fra = plass + del.length;
  }
  return true;
}

// ---------- Teksten i sporene (#1783) ----------

/** Teksten i sporet (`iSporet`). */
const brevtekstI = <S extends Spor>(spor: S) => iSporet(BREVTEKST, spor);

/** Teksten i hvert spor. */
const BREVTEKST: { forhold: Sporsbrevtekst } & Record<Kravspor, Kravsporsbrevtekst> = {
  forhold: BREVTEKSTEN_I_FORHOLDET,
  vederlag: BREVTEKSTEN_I_VEDERLAGET,
  frist: BREVTEKSTEN_I_FRISTEN,
};

/** Standpunktene i artene bare ett spor har, med teksten i sporet. */
type ArtISporene =
  | keyof typeof STANDPUNKTENE_I_VEDERLAGET
  | keyof typeof STANDPUNKTENE_I_FORHOLDET
  | keyof typeof STANDPUNKTENE_I_FRISTEN;
const I_SPORENE: Standpunktstekster<ArtISporene> = adskilte(
  adskilte(STANDPUNKTENE_I_FORHOLDET, STANDPUNKTENE_I_VEDERLAGET),
  STANDPUNKTENE_I_FRISTEN
);

/** Tekstene i sporene samlet, to om gangen. En art i begge gir typefeil, så den ene ikke skjuler den andre. */
function adskilte<A extends object, B extends object & Partial<Record<keyof A, never>>>(
  a: A,
  b: B
): A & B {
  return { ...a, ...b };
}

const erArtISporene = (p: Standpunkt): p is StandpunktIArt[ArtISporene] =>
  Object.hasOwn(I_SPORENE, p.art);

function standpunktetISporet<A extends ArtISporene>(
  art: A,
  p: StandpunktIArt[A],
  krav: Krav,
  s: Svar,
  j: Journalen
): string {
  return I_SPORENE[art](p, krav, s, j);
}
