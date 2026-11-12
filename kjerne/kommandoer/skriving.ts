/**
 * Én kommando blir ett dokument i journalen, eller en avvisning: formen,
 * utledningen av journalen, forutsetningene, nyttelastkontrollen og til sist
 * raden med det serveren fryser. Et brev med flere svar er én rad (4.1 i
 * designnotatet). Serveren gir hvert krav, svar, utsagn og hver opplysning en ny
 * ID, og relasjonene står som `gjelder` og `erstatter` (4.2).
 */

import { SKRIVING_I_VEDERLAGET } from '../spor/vederlag/kommando.ts';
import { iSporet } from '../frosset/byggeklosser.ts';
import { avvisning } from './avvisning.ts';
import { formfeil, korrigertDato, vedleggI, type Kommando, type Svarutkast } from './kommando.ts';
import { frys } from '../frosset/frysing.ts';
import { standpunkter } from './standpunkter.ts';
import { lagBrevtekst, lagDeresRef } from '../frosset/brevtekst.ts';
import { BrevetAvvises, KanIkkeUttrykkes } from '../frosset/brevdeler.ts';
import { brevmerking, lagBrevtittel, medSakskode } from '../frosset/brevtittel.ts';
import {
  brevtekstI,
  erRegistrert,
  lesJournal,
  registrertDato,
  standpunkterISvaret,
} from '../format/leser.ts';
import {
  kommandoenHarTegnSomIkkeKanVises,
  tegnSomIkkeKanVises,
  tekstSomIkkeKanLagres,
  Uforstaatt,
} from '../format/skjema.ts';
import { paaberopelseFor, utled, utledJournal, type Utledning } from '../utledning/utled.ts';
import type { Kjerne } from '../versjon.ts';
import {
  avvis,
  type Avsnitt,
  type Avvisning,
  type Beslutningsgrunnlag,
  type Dokument,
  type Journalrad,
  type Krav,
  type Domenehendelse,
  type Kravpostvarselet,
  type Kravpostvarselhjemmel,
  type Part,
  type Sakskode,
  type Spor,
  type Svar,
  type Vedlegg,
} from '../typer.ts';
import { lagFraForholdet } from '../spor/forhold/frysing.ts';

/** Det serveren stempler kommandoen med. Klienten bestemmer ingen av dem. */
export interface Kontekst {
  sakId: string;
  aktoerId: string;
  part: Part;
  teamId: string | null;
  tidspunkt: () => Date;
  nyId: () => string;
  /**
   * Sakens kode, eller koden og løpenummeret saken får med sitt første brev (LV-U44, LV-U46).
   * Tittelen og teksten omtaler saken med den (S3 i #1497), så nettleseren henter den før
   * forhåndsvisningen, og serveren leser den i skrivetransaksjonen.
   */
  sakskode: Sakskode;
  /**
   * Kontraktsforkortelsen i prosjektinnstillingene, `null` når prosjektet ikke har den. Et brev
   * viser til et tidligere brev med merkingen, og merkingen begynner med den (LV-U53, LV-U44).
   */
  kontraktsforkortelse: string | null;
}

/**
 * Vedleggene kommandoen kan binde, etter ID med små bokstaver (LV-U14). Serveren leser
 * dem i skrivetransaksjonen: de i saken og prosjektet, og et ubundet vedlegg bare for
 * teamet som lastet det opp (arbeidsvalg 3 i #790).
 */
export type Vedleggsoppslag = ReadonlyMap<string, Vedlegg>;

/**
 * `hendelser` er radene kommandoen gir, i rekkefølge, og den siste er brevet kommandoen gjelder.
 * Bare `vurderTrinnvis` gir `neste`, som lager raden etter (VS-U51, VS-U53).
 */
export type Utfall =
  | { godtatt: true; hendelser: Journalrad[]; neste?: Neste }
  | { godtatt: false; feil: 'UGYLDIG_FORM' | 'REGELBRUDD'; avvisning: Avvisning };

/**
 * Raden etter i samme handling, laget med sin egen klokke og journalen med radene handlingen
 * alt har gitt. Serveren skriver hver rad med basens klokke for sin skriving (VS-U51, VS-U53).
 */
export type Neste = (kontekst: Kontekst, journal: Journalrad[]) => Utfall;

const ugyldigForm = (avvisning: Avvisning): Utfall => ({
  godtatt: false,
  feil: 'UGYLDIG_FORM',
  avvisning,
});

// Videreeksportert, så kallerne kan hente utledningen sammen med kommandoene (#1354).
export { utledJournal };

/** Kjernen forstår ikke raden den selv skriver. Raden lagres ikke (MM-U2). */
export class Skrivefeil extends Error {}

type Data = Record<string, unknown>;

/**
 * Beslutningsgrunnlaget i formatet. Virkningene viser til standpunktet, og arten
 * leses derfra. Laget lagres som et nummer fra 1, og upåvirket står uttrykkelig for
 * seg (OV-U32). Standpunktene uten virkning står for seg, fordi det er appens
 * vurdering og ikke noe byggherren har sagt (HF-U2).
 */
function lagret({ virkninger, ...resten }: Beslutningsgrunnlag): Data {
  const med = (virkning: 'upaavirket' | 'uten_virkning') =>
    virkninger.filter((v) => v.virkning === virkning).map((v) => v.standpunkt);
  const [upaavirket, uten] = [med('upaavirket'), med('uten_virkning')];
  return {
    ...resten,
    virkninger: virkninger.flatMap(({ standpunkt, virkning }) =>
      typeof virkning === 'number' ? [{ standpunkt, lag: virkning }] : []
    ),
    ...(upaavirket.length ? { upaavirket } : {}),
    ...(uten.length ? { uten_virkning: uten } : {}),
  };
}

/** Partens utdypning per element i brevet, til brevteksten (B-13 om begrunnelsestekst). */
type Utdypninger = Map<string, string>;

/**
 * Standpunktene og serverens utregning nyttelastkontrollen leste i hvert svarutkast, i
 * formen brevet lagrer dem (#804, #814). Brevet lagrer det kontrollen leste.
 */
type Bygde = Map<Svarutkast, { standpunkter: Data[]; utregning: Data }>;

function svar(
  s: Svarutkast,
  u: Utledning,
  nyId: () => string,
  utdypninger: Utdypninger,
  bygde: Bygde,
  erstatter?: string
): Data {
  const bygd = bygde.get(s);
  if (!bygd)
    throw new Skrivefeil(`Nyttelastkontrollen har ikke kontrollert svaret på ${s.spor} (#814).`);
  const id = nyId();
  if (s.utdypning !== undefined) utdypninger.set(id, s.utdypning);
  const e: Data = {
    id,
    spor: s.spor,
    gjelder: s.gjelder,
    ...(erstatter ? { erstatter } : {}),
    // #342: påberopelsesversjonen svaret regnes mot, som `regnUtSvar` i nyttelastkontrollen.
    ...(s.spor === 'forhold' ? {} : { paaberopelse: u.spor.forhold.gjeldendeKrav!.id }),
    standpunkter: bygd.standpunkter,
  };
  // B-13: serverens utregning lagres, ikke klientens. Svaret på påberopelsen har ingen.
  if (s.spor !== 'forhold') e.utregning = bygd.utregning;
  return e;
}

/**
 * Fryser brevet i hvert svar i dokumentet (MM-U9, MM-U11 (opphevet av MM-U50)). Lagene i vederlag og frist
 * flyttes ned med lagene svaret på forholdet opptar foran dem: svaret i samme dokument,
 * ellers `gjeldende`, som i brevteksten (OV-U32, OV-U33, svaret i #1199). `kravet` gir kravet
 * svaret gjelder.
 */
function frysSvarene(
  svarene: Data[],
  gjeldende: Svar | null,
  paaberopelse: (s: Data) => Krav | null | undefined,
  kravet: (s: Data) => Krav | undefined,
  kjerne: Kjerne
): void {
  const g = svarene.find((s) => s.spor === 'forhold');
  let forskyvning = gjeldende
    ? lagFraForholdet(gjeldende, gjeldende.beslutningsgrunnlag.virkninger)
    : 0;
  if (g) {
    const frosset = frys(g, paaberopelse(g), kjerne.regler, 0);
    g.beslutningsgrunnlag = lagret(frosset);
    const innhold = { spor: 'forhold' as const, standpunkter: standpunkterISvaret('forhold', g) };
    forskyvning = lagFraForholdet({ ...innhold, utregning: {} }, frosset.virkninger);
  }
  for (const s of svarene)
    if (s !== g)
      s.beslutningsgrunnlag = lagret(
        frys(s, paaberopelse(s), kjerne.regler, forskyvning, kravet(s))
      );
}

/** Svarene i et brev eller en revisjon, med brevet frosset i hvert. */
function frosneSvar(svarene: Data[], u: Utledning, kjerne: Kjerne): Data[] {
  frysSvarene(
    svarene,
    u.spor.forhold.gjeldendeSvar,
    (s) => paaberopelseFor({ spor: s.spor as Spor, gjelder: s.gjelder as string }, u),
    (s) => u.spor[s.spor as Spor].krav.find((k) => k.id === s.gjelder),
    kjerne
  );
  return svarene;
}

/** Det som er sporets eget i skrivingen (#1783). */
export interface Sporsskriving {
  /** Innholdet i kravet slik det lagres. */
  kravinnhold(innhold: Data, u: Utledning, nyId: () => string): Data;
  /**
   * Kravet som flere rader, når sporet skriver noe før kravet i samme handling, ellers `null`,
   * og kravet er én rad (VS-U51, VS-U53).
   */
  handlingen?(
    k: Extract<Kommando, { type: 'krav' }>,
    kontekst: Kontekst,
    journal: Journalrad[],
    skriving: Skrivesteg
  ): Utfall | null;
  /**
   * Varselet for hver post i kravet `k` i det nye dokumentet som trenger et, etter postens `id`,
   * til brevteksten. `lest` er journalen før dokumentet.
   */
  postvarsler?(
    k: Krav,
    nytt: Dokument,
    lest: readonly Domenehendelse[],
    u: Utledning
  ): Record<string, Kravpostvarselet>;
}

/**
 * Det skrivingen gir sporet for en handling med flere rader (`Sporsskriving.handlingen`):
 * kontrollen av formen, én rad med kjernen og vedleggene i handlingen, og hele handlingen
 * prøvd til den er avvist eller ferdig.
 */
export interface Skrivesteg {
  sendes: boolean;
  formen(kommando: unknown): Utfall | null;
  /** Én rad, som `skriv`. */
  skriv(
    k: Kommando,
    kontekst: Kontekst,
    journal: Journalrad[],
    vedKravet?: readonly string[],
    ogsaaEtter?: readonly Kravpostvarselhjemmel[]
  ): Utfall;
  hele(utfall: Utfall, kontekst: Kontekst, journal: Journalrad[]): Utfall;
}

/** Skrivingen i hvert spor. Forholdet og fristen står her til de flyttes (#1745). */
const SKRIVING: Record<Spor, Sporsskriving> = {
  forhold: { kravinnhold: (innhold) => innhold },
  vederlag: SKRIVING_I_VEDERLAGET,
  frist: { kravinnhold: (innhold) => innhold },
};

/** Innholdet i dokumentet kommandoen gir. */
function dokument(
  k: Kommando,
  u: Utledning,
  kjerne: Kjerne,
  nyId: () => string,
  utdypninger: Utdypninger,
  bygde: Bygde,
  bundne: Vedlegg[],
  ogsaaEtter: readonly Kravpostvarselhjemmel[] = []
): Data {
  switch (k.type) {
    case 'krav': {
      const forrige = u.spor[k.spor].gjeldendeKrav;
      const id = nyId();
      if (k.utdypning !== undefined) utdypninger.set(id, k.utdypning);
      // HF-U1, LV-U18 punkt 3: et krav om dager mens forespørselen etter § 33.6.2 er ubesvart,
      // er svaret på den og viser til den (avgrensningen i #1567).
      const foresporsel =
        k.spor === 'frist' ? u.spor.frist.foresporsler.find((f) => f.svar === null) : undefined;
      const data: Data = {
        krav: [
          {
            id,
            spor: k.spor,
            ...(forrige ? { erstatter: forrige.id } : {}),
            ...(foresporsel ? { gjelder: foresporsel.foresporsel } : {}),
            ...iSporet(SKRIVING, k.spor).kravinnhold(k.innhold, u, nyId),
          },
        ],
      };
      // MM-U1: et varsel i kravet registreres første gang det kommer.
      // HF-U1: datoen gjelder varselet, ikke kravet, som er sendt i appen.
      if (k.varsel && !u.spor.frist.varsler['33.4']) {
        const varsel = nyId();
        data.utsagn = [{ id: varsel, art: 'varsel', hjemmel: '33.4' }];
        data.opplysninger = [{ id: nyId(), hva: 'sendt', dato: k.varsel.sendt, gjelder: varsel }];
      }
      // OV-U5: brevet med varselet ligger ved kravet.
      if (bundne.length) data.dokumentasjon = bundne;
      return data;
    }
    case 'brev':
      return {
        svar: frosneSvar(
          k.svar.map((s) => svar(s, u, nyId, utdypninger, bygde)),
          u,
          kjerne
        ),
      };
    case 'revisjon':
      return {
        svar: frosneSvar([svar(k.svar, u, nyId, utdypninger, bygde, k.erstatter)], u, kjerne),
      };
    case 'aksept':
      // KA-U10, MM-U50: aksepten viser til svaret og lagrer regelversjonen TE fikk se.
      return {
        utsagn: [{ id: nyId(), art: 'aksept', gjelder: k.svar, regelversjon: k.regelversjon }],
      };
    case 'trekk':
      return { utsagn: [{ id: nyId(), art: 'trekk', gjelder: u.spor[k.spor].gjeldendeKrav!.id }] };
    case 'varsel':
      // VS-U52: dokumentet fra kravskjemaet kan være varsel etter begge bestemmelsene (VS-U53).
      return {
        utsagn: [k.hjemmel, ...ogsaaEtter].map((hjemmel) => ({
          id: nyId(),
          art: 'varsel',
          hjemmel,
        })),
        opplysninger: [{ id: nyId(), hva: 'sendt', dato: k.sendt }],
        korrespondansetype: k.korrespondansetype,
        dokumentasjon: bundne,
      };
    case 'registrert_brev':
      // OV-U4, OV-U16: dokumentasjon, med datoen avsenderen oppgir og brevet som vedlegg.
      return {
        beskrivelse: k.beskrivelse,
        ...(k.spor ? { spor: k.spor } : {}),
        opplysninger: [{ id: nyId(), hva: 'sendt', dato: k.sendt }],
        korrespondansetype: k.korrespondansetype,
        dokumentasjon: bundne,
        // OV-U17: rettingen er en fullstendig ny registrering med henvisning til den feil.
        ...(k.retter ? { retter: k.retter } : {}),
      };
    case 'ikke_i_saken':
      // OV-U18: rettingen har bare henvisningen.
      return { retter: k.retter, ikke_i_saken: true };
    case 'send_varsel':
      // VS-U15, VS-U8: brevet er varselet, og datoen er serverens.
      return { utsagn: [{ id: nyId(), art: 'varsel', hjemmel: k.hjemmel }] };
    case 'ingen_krav':
      return { utsagn: [{ id: nyId(), art: 'ingen_krav', spor: k.spor }] };
    case 'innsigelse':
      return {
        utsagn: [
          { id: nyId(), art: k.type, gjelder: k.gjelder, ...(k.grunn ? { grunn: k.grunn } : {}) },
        ],
      };
    case 'protest':
    case 'passivitet':
      return { utsagn: [{ id: nyId(), art: k.type, gjelder: k.gjelder }] };
    case 'foresporsel':
      // VS-U19: brevet er forespørselen, og datoen er serverens.
      return { utsagn: [{ id: nyId(), art: 'foresporsel', hjemmel: k.hjemmel }] };
    case 'foresporselssvar': {
      // LV-U18 setning 2: TEs begrunnelse følger som utdypningen.
      const id = nyId();
      utdypninger.set(id, k.utdypning);
      return { utsagn: [{ id, art: 'foresporselssvar', gjelder: k.gjelder }] };
    }
    case 'begrunnelse': {
      const id = nyId();
      const utsagn = [{ id, art: 'begrunnelse', gjelder: k.gjelder }];
      // KA-U35: et registrert brev, som varselet over.
      if (k.sendt !== undefined)
        return {
          utsagn,
          opplysninger: [{ id: nyId(), hva: 'sendt', dato: k.sendt }],
          korrespondansetype: k.korrespondansetype,
          ...(k.dokumentasjon ? { dokumentasjon: bundne } : {}),
        };
      if (k.utdypning !== undefined) utdypninger.set(id, k.utdypning);
      return { utsagn };
    }
    case 'korrigering': {
      // Punkt 10 i samlevedtaket for retting av sendt brev (MM-U41 (opphevet av MM-U52)): datoen i feltet kravet har.
      const { felt, dato } = korrigertDato(k);
      const id = nyId();
      // MM-U53: TEs forklaring følger som utdypningen.
      if (k.utdypning !== undefined) utdypninger.set(id, k.utdypning);
      return { utsagn: [{ id, art: 'korrigering', gjelder: k.gjelder, [felt]: dato }] };
    }
    case 'bestridelse':
    case 'merking':
    case 'avklaring':
      // OV-U7: forutsetningene avviser kommandoen før dokumentet lages.
      throw new Error(`kommandoen ${k.type} skrives ikke i første versjon (OV-U7)`);
  }
}

/**
 * Kommandoen vurdert og skrevet som rader, uten å lagre dem: alle radene handlingen gir,
 * laget med samme kontekst etter hverandre. Den låste teksten kommandoen bærer, må være den
 * serveren lager (LV-U2, A1 i paragrafmatrisen).
 */
export function vurder(
  kommando: unknown,
  kontekst: Kontekst,
  journal: Journalrad[],
  kjerne: Kjerne,
  vedlegg: Vedleggsoppslag
): Utfall {
  return hele(vurderTrinnvis(kommando, kontekst, journal, kjerne, vedlegg), kontekst, journal);
}

/**
 * Som `vurder`, men én rad om gangen: `hendelser` har én rad, og `neste` lager raden etter
 * med sin egen kontekst. Serveren bruker den, så hver rad får basens klokke (VS-U51, VS-U53).
 */
export function vurderTrinnvis(
  kommando: unknown,
  kontekst: Kontekst,
  journal: Journalrad[],
  kjerne: Kjerne,
  vedlegg: Vedleggsoppslag
): Utfall {
  return handlingen(kommando, kontekst, journal, kjerne, vedlegg, true);
}

function hele(utfall: Utfall, kontekst: Kontekst, journal: Journalrad[]): Utfall {
  const hendelser: Journalrad[] = [];
  for (let u = utfall; ; ) {
    if (!u.godtatt) return u;
    hendelser.push(...u.hendelser);
    if (!u.neste) return { godtatt: true, hendelser };
    u = u.neste(kontekst, [...journal, ...hendelser]);
  }
}

/**
 * Det klienten viser avsenderen før brevet sendes: raden kommandoen ville gitt,
 * med brevteksten, uten kontrollen av teksten kommandoen bærer og uten kravet til
 * begrunnelse og beskrivelse, som ikke endrer den låste teksten. Klienten sender
 * den låste teksten herfra med kommandoen (A1). Forhåndsvisningen trenger vedleggene
 * kommandoen viser til: et registrert brev godtas med dem, og et brev fra appen har
 * filnavnene i teksten (A4), som fristkravet med varselet (OV-U5).
 */
export function forhaandsvis(
  kommando: unknown,
  kontekst: Kontekst,
  journal: Journalrad[],
  kjerne: Kjerne,
  vedlegg: Vedleggsoppslag = new Map()
): Utfall {
  return hele(handlingen(kommando, kontekst, journal, kjerne, vedlegg, false), kontekst, journal);
}

/** Den låste teksten i en rad, slik kommandoen bærer den (A1). `null` for et registrert brev. */
export const laastTekst = (rad: Journalrad): string[] | null =>
  brevtekstI(rad)?.map((a) => a.laast) ?? null;

/** Avvisningen av formen, eller `null`. */
function formen(kommando: unknown): Utfall | null {
  // #373: det basen ikke kan lagre, avvises før noe annet, med sin egen kode.
  const ulagringsbar = tekstSomIkkeKanLagres(kommando);
  if (ulagringsbar) return ugyldigForm(ulagringsbar);
  const feil = formfeil(kommando);
  return feil.length ? ugyldigForm({ regel: 'UGYLDIG_FORM', melding: feil.join('; ') }) : null;
}

/**
 * Kommandoen som én eller flere rader. Et spor kan skrive rader før kravet i samme handling
 * (`Sporsskriving.handlingen`), og prøver da hele handlingen før den første raden gis.
 */
function handlingen(
  kommando: unknown,
  kontekst: Kontekst,
  journal: Journalrad[],
  kjerne: Kjerne,
  vedlegg: Vedleggsoppslag,
  sendes: boolean
): Utfall {
  const form = formen(kommando);
  if (form) return form;
  const k = kommando as Kommando;
  const skriving: Skrivesteg = {
    sendes,
    formen,
    skriv: (kx, kont, jx, vedKravet, ogsaaEtter) =>
      skriv(kx, kont, jx, kjerne, vedlegg, sendes, vedKravet, ogsaaEtter),
    hele,
  };
  return (
    (k.type === 'krav'
      ? iSporet(SKRIVING, k.spor).handlingen?.(k, kontekst, journal, skriving)
      : null) ?? skriv(k, kontekst, journal, kjerne, vedlegg, sendes)
  );
}

/**
 * Én rad. `vedKravet` er dokumentene kravskjemaet la til som varsel for en kravpost, som
 * legges ved kravet (VS-U51).
 */
function skriv(
  k: Kommando,
  kontekst: Kontekst,
  journal: Journalrad[],
  kjerne: Kjerne,
  vedlegg: Vedleggsoppslag,
  sendes: boolean,
  vedKravet: readonly string[] = [],
  ogsaaEtter: readonly Kravpostvarselhjemmel[] = []
): Utfall {
  const kommando: unknown = k;
  const lest = lesJournal(journal, kjerne.leserformat);
  const u = utled(lest, kjerne.regler);
  const tidspunkt = kontekst.tidspunkt();
  const bygde: Bygde = new Map();
  // Nyttelastkontrollen leser standpunktene slik brevet lagrer dem (#776).
  const svarstandpunkter = (s: Svarutkast, utregning: Data) => {
    const lagret = standpunkter(s, u.spor[s.spor].gjeldendeKrav!, u, kontekst.nyId);
    bygde.set(s, { standpunkter: lagret, utregning });
    try {
      return standpunkterISvaret(s.spor, { standpunkter: lagret, utregning });
    } catch (feil) {
      if (feil instanceof Uforstaatt)
        throw new Skrivefeil(`Kjernen forstår ikke dokumentet den selv skriver: ${feil.message}`);
      throw feil;
    }
  };
  const brevetsDato = registrertDato({ registrert: tidspunkt.toISOString() });
  const brudd = avvisning(
    k,
    kontekst.part,
    u,
    kjerne.regler,
    svarstandpunkter,
    brevetsDato,
    sendes
  );
  if (brudd) return { godtatt: false, feil: 'REGELBRUDD', avvisning: brudd };
  // LV-U14: brevet lagrer ID-en, filnavnet og summen fra mellomlageret.
  const bundne: Vedlegg[] = [];
  for (const id of [...vedleggI(k), ...vedKravet]) {
    const funnet = vedlegg.get(id.toLowerCase());
    if (!funnet)
      return {
        godtatt: false,
        feil: 'REGELBRUDD',
        avvisning: avvis('VEDLEGG_FINNES_IKKE', `Vedlegget ${id} finnes ikke i saken.`),
      };
    bundne.push(funnet);
  }

  const eventId = kontekst.nyId();
  const utdypninger: Utdypninger = new Map();
  let data: Data;
  try {
    data = dokument(k, u, kjerne, kontekst.nyId, utdypninger, bygde, bundne, ogsaaEtter);
  } catch (feil) {
    // Frysingen leser standpunktene kjernen nettopp skrev; kan den ikke det, er raden feil.
    if (feil instanceof Uforstaatt)
      throw new Skrivefeil(`Kjernen forstår ikke dokumentet den selv skriver: ${feil.message}`);
    throw feil;
  }
  const rad: Journalrad = {
    event_id: eventId,
    sak_id: kontekst.sakId,
    event_type: 'dokument_registrert',
    versjon: (journal.at(-1)?.versjon ?? 0) + 1,
    tidsstempel: tidspunkt.toISOString(),
    aktor_id: kontekst.aktoerId,
    aktor_rolle: kontekst.part,
    aktor_team_id: kontekst.teamId,
    refererer_til_event_id: null,
    format: kjerne.format,
    data,
  };
  let brevtekst: Avsnitt[] | null;
  let brevtittel: string | null = null;
  let deresRef: string[] = [];
  try {
    const brevet = brevtekstFor(rad, lest, u, kjerne, utdypninger, kontekst);
    brevtekst = brevet?.tekst ?? null;
    brevtittel = brevet?.tittel ?? null;
    deresRef = brevet?.deresRef ?? [];
  } catch (feil) {
    if (feil instanceof BrevetAvvises)
      return {
        godtatt: false,
        feil: 'REGELBRUDD',
        avvisning: { regel: feil.regel, melding: feil.message },
      };
    throw feil;
  }
  if (brevtekst) {
    // #801: brevet PDF-en lages av, har bare tegn den kan vise. Et registrert brev har ingen PDF.
    // Sakstittelen og filnavnene er lagret, ikke i kommandoen, så de nevnes for seg (#1138).
    // Bare noen brev nevner saken (KA-U22); filnavnene står i hvert brev som binder dem (A4).
    const teksten = brevtekst.map((a) => a.laast).join('\n');
    const sak = lest.find((h) => h.art === 'sak');
    const tegn =
      (sak?.art === 'sak' && teksten.includes(`«${sak.tittel}»`)
        ? tegnSomIkkeKanVises(sak.tittel, 'Sakstittelen')
        : null) ??
      bundne.reduce<Avvisning | null>(
        (funnet, v) =>
          funnet ?? tegnSomIkkeKanVises(v.filnavn, `Filnavnet til vedlegget «${v.filnavn}»`),
        null
      ) ??
      kommandoenHarTegnSomIkkeKanVises(kommando) ??
      brevtekst.reduce<Avvisning | null>(
        (funnet, a, i) => funnet ?? tegnSomIkkeKanVises(a.laast, `Avsnitt ${i + 1} i brevteksten`),
        null
      );
    if (tegn) return ugyldigForm(tegn);
    data.brevtekst = brevtekst;
    if (brevtittel) data.brevtittel = brevtittel;
    // LV-U44, LV-U45: nummeret etter det høyeste i saken, også det avsenderen har oppgitt.
    const brevnummer = nesteBrevnummer(lest);
    data.brevnummer = brevnummer;
    // LV-U53, LV-U24: merkingen fryses i brevet, så en senere henvisning viser til den som
    // står på det, også om kontraktsforkortelsen endres (oppdragsgiver 04.11 i #1570). Uten
    // forkortelsen merkes brevet ikke, og leveringen avviser sendingen (S2 A i #1497).
    if (kontekst.kontraktsforkortelse) {
      data.merking = brevmerking(kontekst.kontraktsforkortelse, kontekst.sakskode, brevnummer);
      // LV-U23, LV-U27, A-3 A i #1497: Deres ref. fryses med hodet, slik journalen står nå.
      // Versjonssjekken før sending sørger for at det er den avsenderen godkjente (LV-U2, LV-U51).
      if (deresRef.length) data.deres_ref = deresRef;
    }
  }
  if (sendes) {
    const avvik = tekstavvik(k.brevtekst, brevtekst);
    if (avvik) return { godtatt: false, feil: 'REGELBRUDD', avvisning: avvik };
  }
  // Kjernen må forstå det den selv skriver (MM-U2, 7.1.2 i designnotatet). Hver rad leses
  // for seg, så bare den nye leses; hele journalen utledes på nytt med den. I en sak som
  // ikke er forstått, godtas bare registreringen etter OV-U4, og den nye raden må forstås.
  const etter = utled([...lest, ...lesJournal([rad], kjerne.leserformat)], kjerne.regler);
  // En begrensning raden gir, kan stå på en eldre hendelse, så den nye leses som differansen.
  const hindrer = etter.begrensninger.filter(
    (b) => !u.begrensninger.some((f) => f.hendelse === b.hendelse && f.grunn === b.grunn)
  );
  if (u.forstaatt ? !etter.forstaatt : hindrer.length > 0)
    throw new Skrivefeil(
      `Kjernen forstår ikke dokumentet den selv skriver: ${hindrer.map((b) => b.grunn).join('; ')}`
    );
  return { godtatt: true, hendelser: [rad] };
}

/** LV-U45: et nummer kan stå to ganger i saken, så det neste regnes fra det høyeste. */
function nesteBrevnummer(lest: ReturnType<typeof lesJournal>): number {
  return (
    Math.max(0, ...lest.map((h) => (h.art === 'dokument' ? (h.dokument.brevnummer ?? 0) : 0))) + 1
  );
}

/**
 * A1 i paragrafmatrisen (LV-U2, B-13 om regelversjon): teksten avsenderen
 * godkjente, er den som fryses. Kommandoen bærer de låste avsnittene klienten
 * viste, og de må være like dem serveren lager, i samme rekkefølge. Mangler
 * teksten, avvises kommandoen; kontrollen er ikke fail-open.
 */
function tekstavvik(vist: string[] | undefined, laget: Avsnitt[] | null): Avvisning | null {
  if (laget === null)
    return vist === undefined
      ? null
      : avvis('ANNEN_BREVTEKST', 'Et registrert brev har ingen tekst fra appen (MM-U50).');
  if (vist === undefined)
    return avvis(
      'BREVTEKST_MANGLER',
      'Kommandoen må ha den låste teksten avsenderen har sett og godkjent (LV-U2).'
    );
  const laast = laget.map((a) => a.laast);
  return laast.length === vist.length && laast.every((t, i) => t === vist[i])
    ? null
    : avvis(
        'ANNEN_BREVTEKST',
        'Teksten avsenderen har sett, er ikke den serveren lager. Last inn saken på nytt, og last inn appen på nytt om den er oppdatert.'
      );
}

/**
 * LV-U2, LV-U3: teksten i brevet appen sender, laget av alle partens utsagn i det.
 * Et registrert brev, som et varsel sendt utenfor appen, får ingen (MM-U17 (opphevet av MM-U50)).
 * Svaret på påberopelsen og om sporene er subsidiære, leses av utledningen før brevet og
 * kommer som argumenter, så `frosset/` ikke når utledningen (A6).
 */
function brevtekstFor(
  rad: Journalrad,
  lest: ReturnType<typeof lesJournal>,
  u: Utledning,
  kjerne: Kjerne,
  utdypninger: Utdypninger,
  { sakskode }: Pick<Kontekst, 'sakskode'>
): { tekst: Avsnitt[]; tittel: string | null; deresRef: string[] } | null {
  const [ny] = lesJournal([rad], kjerne.leserformat);
  if (ny.art !== 'dokument')
    throw new Skrivefeil(
      `Kjernen forstår ikke dokumentet den selv skriver: ${ny.art === 'ukjent' ? ny.grunn : ny.art}`
    );
  // OV-U18: rettingen om feil sak er heller ikke et brev fra appen.
  if (erRegistrert(ny.dokument.opplysninger) || ny.dokument.ikkeISaken) return null;
  const sak = lest.find((h) => h.art === 'sak');
  if (sak?.art !== 'sak') throw new Skrivefeil('Saken har ingen tittel å sette i brevteksten.');
  try {
    const tekst = lagBrevtekst(
      ny.dokument,
      lest,
      {
        sakskode,
        tittel: sak.tittel,
        svarPaaPaaberopelsen: u.spor.forhold.gjeldendeSvar?.id ?? null,
        datoopplysninger: u.datoopplysninger,
        subsidiaer: { vederlag: u.spor.vederlag.subsidiaer, frist: u.spor.frist.subsidiaer },
        avklartVedFrafall: u.frafalt,
        kravpostvarsler: Object.fromEntries(
          ny.dokument.krav.flatMap((k) =>
            Object.entries(iSporet(SKRIVING, k.spor).postvarsler?.(k, ny.dokument, lest, u) ?? {})
          )
        ),
      },
      kjerne.regler,
      utdypninger
    );
    // LV-U27: sakens kode står i tittelen, «Krav om endring i sak KOE-17».
    const tittel = lagBrevtittel(ny.dokument);
    return {
      tekst,
      tittel: tittel && medSakskode(tittel, sakskode),
      deresRef: lagDeresRef(ny.dokument, lest),
    };
  } catch (feil) {
    if (feil instanceof KanIkkeUttrykkes)
      throw new Skrivefeil(`Kjernen kan ikke lage brevteksten: ${feil.message}`);
    throw feil;
  }
}

/**
 * Fryser brevet i hvert svar i en rad som er registrert uten kommandoen, for
 * eksempel registrert korrespondanse (merknaden til MM-U9, GR-U12). Kategorien
 * brevet regnes med, leses fra radene før, også når saken ikke er forstått.
 * Kaster `Uforstaatt` når et svar ikke kan leses.
 */
export function frysBrev(rad: Journalrad, foer: Journalrad[], kjerne: Kjerne): void {
  const kravene: Krav[] = [];
  for (const h of lesJournal(foer, kjerne.leserformat))
    if (h.art === 'dokument') kravene.push(...h.dokument.krav);
  const paaberopelse = kravene.filter((k) => k.spor === 'forhold');
  // Kategorien i påberopelsen: § 32.2 i forholdet (GR-U12), § 34.1.2 i vederlaget (HF-U1, #342).
  frysSvarene(
    (rad.data.svar ?? []) as Data[],
    utledJournal(foer, kjerne).spor.forhold.gjeldendeSvar,
    (s) => paaberopelse.find((k) => k.id === (s.spor === 'forhold' ? s.gjelder : s.paaberopelse)),
    (s) => kravene.find((k) => k.id === s.gjelder),
    kjerne
  );
}
