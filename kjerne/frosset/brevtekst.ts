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

import { HJEMMEL } from '../format/format.ts';
import { sakensKode } from './tekst.ts';
import { erRegistrert } from '../format/leser.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { innsigelsenErOppgitt, innsigelsenPaaberoper, svarPaaForesporsler } from './standpunkt.ts';
import { etikett, iSporet, laget, gjelderVarslingsplikten } from './byggeklosser.ts';
import { innholdIFristen } from '../format/kravinnhold.ts';
import {
  eksMva,
  erDato,
  Journalen,
  KanIkkeUttrykkes,
  kravpostenI,
  liste,
  norskDato,
  PRODUKTIVITET,
  stor,
  verdi,
  type Kravsporsbrevtekst,
  type Saken,
  type Sporsbrevtekst,
  type StandpunktIArt,
  type Standpunktstekster,
  type Tekst,
  type Brevpunkt,
  type Utdypninger,
  utenOverskrift,
  UtdypningUtenPunkt,
} from './brevdeler.ts';
import {
  BREVTEKSTEN_I_FORHOLDET,
  DATOEN_I_BREVET,
  STANDPUNKTENE_I_FORHOLDET,
} from '../spor/forhold/tekst.ts';
import { BREVTEKSTEN_I_VEDERLAGET, STANDPUNKTENE_I_VEDERLAGET } from '../spor/vederlag/tekst.ts';
import { dager, iLagene } from './tekst.ts';
import { erKravpostvarselhjemmel } from '../typer.ts';
import type {
  Avsnitt,
  Dokument,
  Domenehendelse,
  Hjemmel,
  Kravspor,
  Krav,
  Opplysning,
  Part,
  Spor,
  Standpunkt,
  Svar,
  Utsagn,
  Kravvarselhjemmel,
  Varselhjemmel,
} from '../typer.ts';
import { innholdIForholdet } from '../spor/forhold/format.ts';
import { grunnerFraForholdet } from '../spor/forhold/frysing.ts';

const PART: Record<Part, string> = { TE: 'TE', BH: 'Byggherren' };

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
    const { utdypning, utdypninger: perPunkt } = utdypninger.get(gjelder) ?? {};
    if (perPunkt && Object.keys(perPunkt).length)
      throw new UtdypningUtenPunkt(
        'Utdypningen per punkt gjelder et element i brevet uten punkter.'
      );
    avsnitt.push({ gjelder, laast, ...(utdypning ? { utdypning } : {}) });
  };
  // LV-U34, LV-U40: punktene er nummerert gjennom hele brevet, så «punkt 1 ovenfor» er entydig.
  let nummer = 0;
  // B-1 B og B-2 A i #1824: ett avsnitt per punkt, med partens utdypning for punktet under det.
  const leggPunkter = (
    gjelder: string,
    brevpunkter: Brevpunkt[],
    utdypningene: Readonly<Record<string, string>> = {},
    hele?: string
  ) => {
    if (!brevpunkter.some((p) => p.punkt !== undefined))
      return legg(gjelder, brevpunkter.flatMap((p) => p.avsnitt).join('\n\n'));
    if (hele)
      throw new UtdypningUtenPunkt(
        'Kravet har punkter og ikke noe punkt for utdypningen for hele kravet. Utdypningen gis per punkt.'
      );
    const perPunkt = { ...utdypningene };
    for (const { punkt, overskrift: o, avsnitt: a } of brevpunkter) {
      if (punkt === undefined)
        throw new KanIkkeUttrykkes(`et punkt i brevteksten for ${gjelder} har ikke noe navn`);
      const overskrift = o === null ? undefined : `${++nummer}. ${o}`;
      const utdypning = perPunkt[punkt];
      delete perPunkt[punkt];
      avsnitt.push({
        gjelder,
        punkt,
        ...(overskrift ? { overskrift } : {}),
        laast: [...(overskrift ? [overskrift] : []), ...a].join('\n\n'),
        ...(utdypning ? { utdypning } : {}),
      });
    }
    const ukjent = Object.keys(perPunkt);
    if (ukjent.length)
      throw new UtdypningUtenPunkt(
        `Utdypningen gjelder ${ukjent.length > 1 ? 'punktene' : 'punktet'} ${liste(ukjent)}, som ikke står i brevet.`
      );
  };

  for (const k of nytt.krav) {
    const punkter = kravtekst(k, t, regler);
    // B-2 A i #1824: utdypningen for hele kravet står i sitt eget punkt, sist (forbeholdet).
    const eget = brevtekstI(k.spor).utdypningensPunkt;
    const { utdypning, utdypninger: perPunkt = {} } = utdypninger.get(k.id) ?? {};
    if (!eget || (!utdypning && !perPunkt[eget.punkt])) {
      leggPunkter(k.id, punkter, perPunkt, utdypning);
      continue;
    }
    if (utdypning && perPunkt[eget.punkt])
      throw new UtdypningUtenPunkt(
        `Utdypningen for hele kravet og utdypningen for punktet ${eget.punkt} står begge i punktet ${eget.punkt}.`
      );
    punkter.push({ punkt: eget.punkt, overskrift: eget.overskrift, avsnitt: [] });
    leggPunkter(k.id, punkter, { ...perPunkt, ...(utdypning ? { [eget.punkt]: utdypning } : {}) });
  }
  for (const s of nytt.svar) legg(s.id, svartekst(s, t, regler));
  for (const u of nytt.utsagn) legg(u.id, utsagnstekst(u, t));
  for (const o of nytt.opplysninger) {
    // Datoen for et varsel står i avsnittet for varselet.
    if (erDato(o) && o.gjelder !== undefined) continue;
    legg(o.id, opplysningstekst(o, nytt.avsender, j));
  }
  // A4: vedleggene står i teksten med filnavnet, så det som fryses, er teksten og
  // vedleggene (LV-U2, arbeidsvalg 10 i #790).
  if (nytt.dokumentasjon.length)
    legg(nytt.id, `Brevet har vedlegg: ${liste(nytt.dokumentasjon.map((v) => `«${v.filnavn}»`))}.`);
  return avsnitt;
}

/** Fristkravet (LV-U4 punkt 2–3). */
function fristkravtekst(k: Krav, { j }: Tekst): Brevpunkt[] {
  const deler = [
    `TE krever fristforlengelse på ${dager(innholdIFristen(k).dager)} (NS 8407 § 33.6.1).`,
  ];
  // LV-U18 setning 3: kravet som viser til forespørselen, sier det (HF-U1).
  if (k.gjelder)
    deler.push(
      `Kravet er svar på byggherrens forespørsel etter NS 8407 § 33.6.2 i ${j.brevet(j.dokumentetTil(k.gjelder))}.`
    );
  return [utenOverskrift(deler)];
}

/** LV-U4 punkt 2–3 og GR-U16. Kravet i sporet står i `BREVTEKST`. */
function kravtekst(k: Krav, t: Tekst, regler: Regelsett): Brevpunkt[] {
  const { j } = t;
  const punkter = brevtekstI(k.spor).krav(k, t, regler);
  // KA-U52 punkt 4 og LV-U56 (`nevnerErstattet`): setningen står sist i det siste avsnittet.
  if (k.erstatter && brevtekstI(k.spor).nevnerErstattet) {
    const erstatter = `Kravet erstatter TEs krav i ${j.brevet(j.krav(k.erstatter).dokument)}.`;
    const siste = punkter.at(-1);
    if (!siste?.avsnitt.length) punkter.push(utenOverskrift([erstatter]));
    else siste.avsnitt.push(`${siste.avsnitt.pop()} ${erstatter}`);
  }
  return punkter;
}

/** En innsigelse med brevet den står i. */
interface Innsigelse {
  gjelder: string;
  dokument: string;
  hjemmel?: Hjemmel | null;
}

/**
 * VS-U9, VS-U11, VS-U24: byggherrens egne innsigelser som er en påberopelse etter
 * bestemmelsen svaret tar stilling til, og som byggherren ikke senere har gitt opp
 * uttrykkelig, i rekkefølgen de kom, med brevet de står i. Svaret gjentar dem eller
 * gir dem opp.
 */
function aapneInnsigelser(
  svar: Svar,
  avsender: Part,
  j: Journalen,
  regler: Regelsett
): Innsigelse[] {
  const svarFraParten: Svar[] = [];
  const innsigelser: (Innsigelse & { fra: number })[] = [];
  for (const d of j.dokumenter) {
    if (d.avsender !== avsender || d.svar.includes(svar)) continue;
    // HF-U4, OV-U4: et registrert brev gir ikke opp innsigelsen.
    if (!erRegistrert(d.opplysninger)) svarFraParten.push(...d.svar);
    for (const u of d.utsagn)
      // VS-U29: standpunktet om at begrunnelsen ikke er et svar, er ingen påberopelse.
      if (u.art === 'innsigelse' && u.grunn === undefined)
        innsigelser.push({ gjelder: u.gjelder, dokument: d.id, fra: svarFraParten.length });
  }
  return innsigelser.flatMap((i) => {
    const hjemmel = innsigelsenPaaberoper(i.gjelder, j.dokumenter, (k) =>
      gjelderVarslingsplikten(k, regler)
    );
    // VS-U29: også påberopelsene sporet nevner i `ogsaaInnsigelserEtter`.
    const gjelder =
      hjemmel === HJEMMEL[svar.spor] ||
      (hjemmel !== null && brevtekstI(svar.spor).ogsaaInnsigelserEtter.includes(hjemmel));
    return gjelder && !innsigelsenErOppgitt(svar.spor, svarFraParten.slice(i.fra), hjemmel)
      ? [{ gjelder: i.gjelder, dokument: i.dokument, hjemmel }]
      : [];
  });
}

/** Bestemmelsen varselet er gitt etter; etter OV-U25 gjelder varselet i § 34.1.3 tredje ledd bare annet ledd (LV-U29). */
const VARSLET_ETTER: Record<Kravvarselhjemmel, string> = {
  '33.4': 'NS 8407 § 33.4',
  '34.1.2': 'NS 8407 § 34.1.2',
  '34.1.3': 'NS 8407 § 34.1.3 tredje ledd',
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

/** Varselet et standpunkt om rettidighet gjelder (LV-U4 punkt 5, LV-U5). */
const VARSELET: Record<Hjemmel, string> = {
  '32.2': 'TEs varsel etter NS 8407 § 32.2',
  '33.4': `varselet ${VARSEL_OM['33.4']}`,
  '33.6.2': 'TEs svar på forespørselen etter NS 8407 § 33.6.2',
  '34.1.2': `varselet ${VARSEL_OM['34.1.2']}`,
  '34.1.3': `varselet ${VARSEL_OM['34.1.3']}`,
  '34.3.3': `varselet ${VARSEL_OM['34.3.3']}`,
  '34.4': `varselet ${VARSEL_OM['34.4']}`,
};

const SEN_32_2 = `${VARSELET['32.2']} kom for sent`;

/**
 * A2: standpunktene i svaret på forholdet som gjør et svar på vederlag eller frist
 * subsidiært (B-13 05.10): preklusjon etter § 32.2 og avslag. Svaret på forholdet
 * står i samme brev eller er gjeldende svar før brevet. Teksten sier hva byggherren
 * sa der, og tilskriver ikke byggherren noe nytt (LV-U3).
 */
function forholdetsStandpunkter(s: Svar, { j, saken, nytt }: Tekst): string[] {
  if (s.spor === 'forhold') return [];
  const g =
    nytt.svar.find((x) => x.spor === 'forhold') ??
    (saken.svarPaaPaaberopelsen ? j.svar(saken.svarPaaPaaberopelsen) : undefined);
  if (!g) return [];
  const grunner = grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger);
  const prekludert = grunner.includes('prekludert');
  const avslaatt = grunner.includes('avslaatt');
  if (g.dokument === nytt.id) {
    const se = ' (se svaret på grunnlaget)';
    return [
      ...(prekludert ? [`byggherren gjør gjeldende at ${SEN_32_2}${avslaatt ? '' : se}.`] : []),
      ...(avslaatt ? [`byggherren avslår grunnlaget${se}.`] : []),
    ];
  }
  return [
    ...(prekludert
      ? [`byggherren har gjort gjeldende i ${j.brevet(g.dokument)} at ${SEN_32_2}.`]
      : []),
    ...(avslaatt
      ? [
          prekludert
            ? 'byggherren har avslått grunnlaget i samme brev.'
            : `byggherren har avslått grunnlaget i ${j.brevet(g.dokument)}.`,
        ]
      : []),
  ];
}

/**
 * GR-U26: forbeholdet når byggherren svarer på vederlag eller frist uten å ha svart på
 * gjeldende versjon av forholdet, i brevet eller før det, og forholdet ikke er avklart
 * ved frafall (GR-U23). Det er ikke et lag.
 */
function forbeholdForForholdet(s: Svar, { j, saken, nytt }: Tekst): string[] {
  if (s.spor === 'forhold' || saken.svarPaaPaaberopelsen !== null || saken.avklartVedFrafall)
    return [];
  if (nytt.svar.some((x) => x.spor === 'forhold')) return [];
  if (!s.paaberopelse) throw new KanIkkeUttrykkes(`${s.id} viser ikke til grunnlagskravet`);
  return [
    `Byggherren har ennå ikke svart på grunnlaget i TEs krav i ${j.brevet(j.krav(s.paaberopelse).dokument)}.`,
    'Standpunktene nedenfor gjelder under forutsetning av at grunnlaget for kravet foreligger.',
  ];
}

/** LV-U4 punkt 4 og 5, med A2 når forholdet er avslått eller prekludert, og GR-U26 når det er ubesvart. */
function svartekst(s: Svar, t: Tekst, regler: Regelsett): string {
  const { j, nytt } = t;
  const krav = j.krav(s.gjelder);
  const virkning = new Map(s.beslutningsgrunnlag.virkninger.map((v) => [v.standpunkt, v.virkning]));
  const innsigelser = aapneInnsigelser(s, nytt.avsender, j, regler);
  // OV-U32: et avslått eller prekludert forhold står først, med lagene fra svaret på
  // forholdet, og lagene i sporet flyttes ned med antallet lag de opptar (B-13, A2). Hvert
  // ledd fra forholdet er ett lag der: preklusjonen etter § 32.2 er det første, og avslaget
  // står i laget etter. Et standpunkt uten lag, også et upåvirket, får ingen etikett. Et
  // akseptert tilbud står med kravposten (OV-U33, LV-U31). Er tilbudet ikke akseptert, står
  // ikke beløpet for kravposten i brevet (KA-U72). Standpunktene i samme lag står under én
  // etikett (`iLagene`).
  const forholdet = forholdetsStandpunkter(s, t);
  const forskyvning = forholdet.length;
  const ledd = iLagene(
    [
      ...forholdet.map((tekst, i) => ({ tekst, plass: (i + 1) as number | null })),
      ...s.standpunkter.filter(harTekst).map((p) => {
        const lag = laget(virkning.get(p.id)!);
        return {
          tekst: standpunkttekst(p, s, krav, j, innsigelser),
          plass: lag !== null ? lag + forskyvning : null,
        };
      }),
    ],
    (l) => l.plass,
    forskyvning + 1
  );
  // #1267 punkt 4: med mer enn ett lag står innledningen for seg, og hver etikett begynner et
  // nytt avsnitt. Standpunktene uten etikett står i avsnittet før, som metoden sammen med
  // beløpet, eller i et eget avsnitt foran den første etiketten.
  const ordnet = ledd.some(({ plass }) => plass !== null && plass > 1);
  const merket = new Set<number>();
  const avsnitt: string[][] = [
    [
      `Byggherrens svar på ${brevtekstI(s.spor).svaretGjelder} i TEs krav i ${j.brevet(krav.dokument)}:`,
      ...forbeholdForForholdet(s, t),
    ],
  ];
  if (ordnet) avsnitt.push([]);
  for (const { tekst, plass } of ledd) {
    if (!ordnet || plass === null || merket.has(plass)) avsnitt.at(-1)!.push(stor(tekst));
    else {
      merket.add(plass);
      avsnitt.push([`${stor(etikett(plass))}: ${tekst}`]);
    }
  }
  if (s.erstatter) {
    const erstatter = `Svaret erstatter byggherrens svar i ${j.brevet(j.svar(s.erstatter).dokument)}.`;
    if (ordnet) avsnitt.push([erstatter]);
    else avsnitt.at(-1)!.push(erstatter);
  }
  return avsnitt
    .filter((a) => a.length)
    .map((a) => a.join(' '))
    .join('\n\n');
}

/**
 * Varselet et standpunkt om rettidighet gjelder, med brevet det står i (HF-U1, #497). Uten
 * eget varsel er det brevet med TEs første krav i sporet, uten forbeholdet fra skjemaet
 * (LV-U21, OV-U28, OV-U29), og etter § 32.2 det første grunnlagskravet (VS-U43 punkt 6 og 10
 * med designdelen). For § 33.6.2 er det svaret på forespørselen, med brevet forespørselen
 * står i (LV-U18 setning 4).
 */
function varseletMedBrevet(p: Extract<Standpunkt, { art: 'rettidighet' }>, j: Journalen): string {
  // Forutsetningene avviser svaret før dette (#1600).
  if (p.hjemmel === '32.2' && j.element(p.gjelder).art !== 'krav')
    throw new KanIkkeUttrykkes('varselet etter § 32.2 sendt utenfor løsningen har ingen brevtekst');
  const gjelder = p.hjemmel === '33.6.2' ? foresporselenTil(p.gjelder, j) : p.gjelder;
  return `${VARSELET[p.hjemmel]} i ${j.brevet(j.dokumentetTil(gjelder))}`;
}

/** KA-U72: standpunktet til beløpet for en kravpost der tilbudet ikke er akseptert, står ikke i brevet. */
const harTekst = (p: Standpunkt): boolean => !(p.art === 'beloep' && p.godkjent === undefined);

/** Ett standpunkt som en setning med liten forbokstav (LV-U4 punkt 5, LV-U5, GR-U14). */
function standpunkttekst(
  p: Standpunkt,
  s: Svar,
  krav: Krav,
  j: Journalen,
  innsigelser: Innsigelse[]
): string {
  const paaberopelse = s.spor === 'forhold' ? krav : s.paaberopelse ? j.krav(s.paaberopelse) : null;
  if (erArtISporene(p)) return standpunktetISporet(p.art, p, krav, s, j);
  switch (p.art) {
    case 'rettidighet': {
      // VS-U29, VS-U31: saken har én forespørsel, så standpunktet etter § 33.6.2 gjelder begrunnelsen.
      const aapne = innsigelser.filter((i) => i.hjemmel === p.hjemmel);
      const varselet = erKravpostvarselhjemmel(p.hjemmel) ? '' : varseletMedBrevet(p, j);
      // Et «for sent» gjentar de åpne innsigelsene, og et «i tide» gir dem opp (VS-U11, VS-U24).
      // Saken har ett varsel etter § 33.4 (oppdragsgiver 15.10, #498).
      const brevene = liste([...new Set(aapne.map((i) => j.brevet(i.dokument)))]);
      const henvisning = aapne.length > 1 ? 'innsigelsene' : 'innsigelsen';
      const jf = aapne.length ? `, jf. ${henvisning} i ${brevene}` : '';
      // KA-U64: varselet etter § 34.3.3 eller § 34.4 for kravposten. VS-U4: for § 34.3.3 står
      // prinsipalt det byggherren måtte forstå; løsningen regner det ikke ut.
      if (erKravpostvarselhjemmel(p.hjemmel)) {
        const om = `${VARSELET[p.hjemmel]} for ${kravpostenI(krav, p.gjelder).betegnelse}`;
        if (p.iTide) return `byggherren gjør ikke gjeldende at ${om} kom for sent.`;
        return p.hjemmel === '34.3.3'
          ? `byggherren gjør gjeldende at ${om} kom for sent, og at TE bare har krav på den justeringen av enhetsprisene byggherren måtte forstå at forholdet ville føre til.`
          : `byggherren gjør gjeldende at ${om} ikke ble gitt eller kom for sent.`;
      }
      // OV-U28: begrensningen etter § 34.1.3 med beløpet byggherren godkjenner for kravet.
      if (!p.iTide && p.hjemmel === '34.1.3')
        return `byggherren gjør gjeldende at ${varselet} kom for sent${jf}, og at TE har tapt retten til å påberope seg påløpte utgifter som grunnlag for kravet. Byggherren godkjenner ${eksMva(p.begrenset!)} for dette kravet.`;
      if (!p.iTide) return `byggherren gjør gjeldende at ${varselet} kom for sent${jf}.`;
      return aapne.length
        ? `byggherren gir opp ${henvisning} etter NS 8407 § 5 i ${brevene} og gjør ikke gjeldende at ${varselet} kom for sent.`
        : `byggherren gjør ikke gjeldende at ${varselet} kom for sent.`;
    }
    case 'hindring': {
      const hjemmel =
        innholdIForholdet(paaberopelse).hovedkategori === 'force_majeure' ? '§ 33.3' : '§ 33.1';
      return `byggherren ${p.oppfylt ? 'legger til grunn' : 'legger ikke til grunn'} at fremdriften hindres som følge av forholdet (NS 8407 ${hjemmel}).`;
    }
    case 'spesifisering':
      return p.iTide
        ? 'byggherren gjør ikke gjeldende at kravet om fristforlengelse ble spesifisert for sent (NS 8407 § 33.6.1).'
        : `byggherren gjør gjeldende at kravet om fristforlengelse ble spesifisert for sent, og at TE bare har krav på den fristforlengelsen byggherren måtte forstå at TE hadde krav på, ${dager(p.dager!)} (NS 8407 § 33.6.1).`;
    case 'dager':
      return verdi(p.resultat, dager(p.vurdert), dager(innholdIFristen(krav).dager));
  }
}

/** Forespørselen et standpunkt etter § 33.6.2 gjelder svaret på: kravet eller begrunnelsen. */
function foresporselenTil(gjelder: string, j: Journalen): string {
  const f = svarPaaForesporsler(j.dokumenter).find((x) => x.svar === gjelder);
  if (!f) throw new KanIkkeUttrykkes(`${gjelder} er ikke et svar på en forespørsel`);
  return f.foresporsel;
}

const erPaaberopelseEtter3362 = (id: string, svar: Svar) =>
  svar.standpunkter.some((p) => p.id === id && p.art === 'rettidighet' && p.hjemmel === '33.6.2');

/** Det en innsigelse eller en protest viser til, med brevet det står i (LV-U4 punkt 7 og 8). */
function beskriv(id: string, j: Journalen): string {
  const e = j.element(id);
  switch (e.art) {
    case 'krav': {
      const om = brevtekstI(e.krav.spor).kravetOm;
      return `TEs krav${om ? ` om ${om}` : ''} i ${j.brevet(e.krav.dokument)}`;
    }
    case 'svar':
      return `byggherrens svar i ${j.brevet(e.svar.dokument)}`;
    case 'standpunkt':
      // LV-U20: påberopelsen etter § 33.6.2 gjelder TEs svar på forespørselen, ikke et varsel.
      return erPaaberopelseEtter3362(id, e.svar)
        ? `påberopelsen av at TEs svar på forespørselen etter NS 8407 § 33.6.2 kom for sent i svaret i ${j.brevet(e.svar.dokument)}`
        : `påberopelsen av for sen varsling i svaret i ${j.brevet(e.svar.dokument)}`;
    case 'utsagn':
      if (e.utsagn.art === 'varsel')
        return `TEs varsel ${VARSEL_OM[uttrykkbar(e.utsagn.hjemmel)]} i ${j.brevet(e.dokument)}`;
      if (e.utsagn.art === 'innsigelse') return `innsigelsen i ${j.brevet(e.dokument)}`;
      if (e.utsagn.art === 'foresporselssvar')
        return `TEs svar i ${j.brevet(e.dokument)} på forespørselen etter NS 8407 § 33.6.2`;
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

/** Hjemmelen for varselet en datoopplysning gjelder (HF-U1). */
function varselhjemmel(id: string, j: Journalen): Varselhjemmel {
  const e = j.element(id);
  if (e.art === 'utsagn' && e.utsagn.art === 'varsel') return e.utsagn.hjemmel;
  throw new KanIkkeUttrykkes(`${id} er ikke et varsel`);
}

/** LV-U4 punkt 3 og 6–13, og VS-U15, KA-U22, KA-U25 og KA-U34 (opphevet av KA-U46) ordrett. */
function utsagnstekst(u: Utsagn, { j, saken, nytt, sak }: Tekst): string {
  const part = PART[nytt.avsender];
  switch (u.art) {
    case 'varsel': {
      const hjemmel = uttrykkbar(u.hjemmel);
      const dato = nytt.opplysninger.find((o) => erDato(o) && o.gjelder === u.id);
      // VS-U15: et brev med bare varselet, uten en dato for det, er selve varselet.
      // LV-U19: varselet etter § 34.1.2 har samme form.
      if (dato === undefined && nytt.utsagn.length === 1 && !nytt.krav.length && !nytt.svar.length)
        return `TE varsler etter ${VARSLET_ETTER[hjemmel]} at TE vil kreve ${VIL_KREVE[hjemmel]} som følge av forholdet i ${sak}.`;
      if (dato?.hva !== 'sendt')
        throw new KanIkkeUttrykkes('et varsel i et brev fra appen har datoen det ble sendt');
      return `TE opplyser at varsel ${VARSEL_OM[hjemmel]} ble sendt ${norskDato(dato.dato)}.`;
    }
    case 'aksept': {
      const svar = j.svar(u.gjelder);
      const aksept = `TE godtar byggherrens svar på ${brevtekstI(svar.spor).svaretGjelder} i ${j.brevet(svar.dokument)}.`;
      // GR-U7: enigheten gjelder beløpet eller dagene, ikke standpunktet til forholdet.
      if (svar.spor === 'forhold' || !saken.subsidiaer[svar.spor].length) return aksept;
      return `${aksept} TE er enig i ${brevtekstI(svar.spor).enigI}, men ikke i byggherrens standpunkt til grunnlaget.`;
    }
    case 'trekk': {
      const krav = j.krav(u.gjelder);
      // KA-U22, ordrett med saken satt inn.
      if (krav.spor === 'forhold')
        return `TE trekker sitt krav i ${sak}. Trekket er avkall på alle krav i saken, også vederlag og fristforlengelse byggherren har godkjent. Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.`;
      const sporet = brevtekstI(krav.spor);
      const verdi = sporet.trukket(krav);
      return `TE trekker kravet om ${sporet.kravetOm} i ${sak}, fremsatt i ${j.brevet(krav.dokument)} (${verdi}). Trekket er avkall på dette kravet, også det byggherren har godkjent.`;
    }
    case 'ingen_krav':
      // KA-U22 og KA-U25, ordrett med saken satt inn.
      return brevtekstI(u.spor).ingenKrav(sak);
    case 'innsigelse':
      // VS-U29: standpunktet om at begrunnelsen ikke er et svar etter § 33.6.2 annet ledd, uten
      // henvisningen til § 5 (arbeidsvalget 21.10 i #1095).
      if (u.grunn === 'ikke_svar')
        return `${part} gjør gjeldende at ${beskriv(u.gjelder, j)} ikke er et svar etter NS 8407 § 33.6.2 annet ledd.`;
      return `${part} gjør gjeldende at ${beskriv(u.gjelder, j)} kom for sent (NS 8407 § 5 tredje ledd).`;
    case 'foresporsel':
      // LV-U18 setning 1, ordrett med saken satt inn.
      return `Byggherren ber etter NS 8407 § 33.6.2 TE angi og begrunne det antall dager TE krever som fristforlengelse som følge av forholdet i ${sak}. Svarer ikke TE, tapes kravet på fristforlengelse. Har TE ikke grunnlag for å beregne kravet, skal TE i stedet begrunne hvorfor grunnlaget ikke foreligger.`;
    case 'foresporselssvar':
      // LV-U18 setning 2. TEs begrunnelse følger som utdypningen.
      return `TE svarer på byggherrens forespørsel etter NS 8407 § 33.6.2 i ${j.brevet(j.dokumentetTil(u.gjelder))} at grunnlaget for å beregne kravet ikke foreligger (§ 33.6.2 annet ledd b).`;
    case 'protest':
      return `${part} protesterer mot ${beskriv(u.gjelder, j)}.`;
    case 'passivitet': {
      const krav = j.krav(u.gjelder);
      return `TE gjør gjeldende at byggherren ikke svarte uten ugrunnet opphold på TEs varsel etter NS 8407 § 32.2 i ${j.brevet(krav.dokument)}, og at pålegget derfor anses å innebære en endring (NS 8407 § 32.3 annet ledd).`;
    }
    case 'bestridelse': {
      const e = j.element(u.gjelder);
      if (e.art !== 'opplysning') throw new KanIkkeUttrykkes(`${u.gjelder} er ikke en opplysning`);
      return `${part} bestrider opplysningen i ${j.brevet(e.opplysning.dokument)} om at ${opplysningen(e.opplysning, j)}.`;
    }
    case 'avklaring': {
      const e = j.element(u.gjelder);
      if (e.art !== 'opplysning' || e.opplysning.hva !== 'kan_ikke_uttrykkes')
        throw new KanIkkeUttrykkes(`${u.gjelder} er ikke en merking`);
      return `${part} bekrefter at standpunktene i ${j.brevet(e.opplysning.brev)} om ${liste(e.opplysning.spor.map((s) => brevtekstI(s).navn))} gjelder uten forbehold fra og med dette brevet.`;
    }
    case 'korrigering': {
      // Punkt 10 i samlevedtaket for retting av sendt brev (MM-U41 (opphevet av MM-U52)), med partene skrevet fullt
      // ut (LV-U35) og henvisningen etter LV-U53.
      const e = j.element(u.gjelder);
      const [dokument, tidligere] =
        e.art === 'krav'
          ? [e.krav.dokument, innholdIForholdet(e.krav).datoer[u.felt]]
          : e.art === 'utsagn' && e.utsagn.art === 'korrigering'
            ? [e.dokument, e.utsagn.dato]
            : [null, null];
      if (dokument === null || typeof tidligere !== 'string')
        throw new KanIkkeUttrykkes(`${u.gjelder} har ingen opplysning om datoen`);
      return `Totalentreprenøren oppgir nå at ${DATOEN_I_BREVET[u.felt]} ${norskDato(u.dato)}. I ${j.brevet(dokument)} oppga totalentreprenøren ${norskDato(tidligere)}.`;
    }
    case 'begrunnelse': {
      // KA-U34: byggherrens tekst følger som utdypningen.
      const svar = j.svar(u.gjelder);
      return `Byggherren begrunner sitt svar på ${brevtekstI(svar.spor).svaretGjelder} i ${j.brevet(svar.dokument)}:`;
    }
  }
}

/** Det en opplysning sier, som en leddsetning: «brevet ble sendt 2. oktober 2026» (LV-U4 punkt 10). */
function opplysningen(o: Opplysning, j: Journalen): string {
  switch (o.hva) {
    case 'sendt':
    case 'mottatt':
      return `${o.gjelder ? `varselet etter NS 8407 § ${varselhjemmel(o.gjelder, j)} i brevet` : 'brevet'} ble ${o.hva} ${norskDato(o.dato)}`;
    case 'endringsordre':
      return `${o.brev === o.dokument ? 'brevet' : j.brevet(o.brev)} ${o.oppfylt ? 'var' : 'ikke var'} en endringsordre etter NS 8407 § 31.3`;
    case 'kan_ikke_uttrykkes':
      return `${o.brev === o.dokument ? 'brevet' : j.brevet(o.brev)} har et forbehold eller annet innhold som ikke er uttrykt i appen`;
  }
}

/** LV-U4 punkt 11. */
function opplysningstekst(o: Opplysning, avsender: Part, j: Journalen): string {
  if (erDato(o) || o.brev === o.dokument)
    throw new KanIkkeUttrykkes(`opplysningen ${o.hva} i et brev fra appen har ingen brevtekst`);
  const sporene =
    o.hva === 'kan_ikke_uttrykkes'
      ? `, og som gjelder ${liste(o.spor.map((s) => brevtekstI(s).navn))}`
      : '';
  return `${PART[avsender]} opplyser at ${opplysningen(o, j)}${sporene}.`;
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
export function lagDeresRef(nytt: Dokument, foer: Domenehendelse[]): string[] {
  const j = new Journalen(foer, nytt);
  const viserTil: string[] = [
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
 * (VS-U43 punkt 10). Forespørselen, som brevteksten nevner for § 33.6.2, er byggherrens eget brev og holdes ute av
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
  return deler(brevtekst).join('\n\n');
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

/** Teksten i hvert spor. Fristen står her til den flyttes til sporet (#1745). */
const BREVTEKST: { forhold: Sporsbrevtekst } & Record<Kravspor, Kravsporsbrevtekst> = {
  forhold: BREVTEKSTEN_I_FORHOLDET,
  vederlag: BREVTEKSTEN_I_VEDERLAGET,
  frist: {
    navn: 'fristen',
    svaretGjelder: 'kravet om fristforlengelse',
    krav: fristkravtekst,
    // VS-U29: også påberopelsen etter § 33.6.2 mot begrunnelsen.
    ogsaaInnsigelserEtter: ['33.6.2'],
    nevnerErstattet: true,
    kravetOm: 'fristforlengelse',
    enigI: 'antallet dager',
    trukket: (krav) => dager(innholdIFristen(krav).dager),
    ingenKrav: (sak) =>
      `TE krever ikke fristforlengelse som følge av forholdet i ${sak}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag.`,
  },
};

/** Standpunktene i artene bare ett spor har, med teksten i sporet. */
type ArtISporene = keyof typeof STANDPUNKTENE_I_VEDERLAGET | keyof typeof STANDPUNKTENE_I_FORHOLDET;
const I_SPORENE: Standpunktstekster<ArtISporene> = adskilte(
  STANDPUNKTENE_I_FORHOLDET,
  STANDPUNKTENE_I_VEDERLAGET
);

/** Tekstene i to spor samlet. En art i begge gir typefeil, så den ene ikke skjuler den andre. */
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
