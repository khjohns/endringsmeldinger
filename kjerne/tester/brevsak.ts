/**
 * Saken i minnet for testene av brevene og kommandoene : `sak()` sender hver kommando gjennom
 * `vurder` og fryser brevet slik klienten gjør, og konstantene er kommandoene og tekstene
 * testene bygger på. Bevis-sakene kjøres med `kjoerer.ts` i en bane fra `bane.ts`.
 */

import { AssertionError } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { brevmerking } from '../frosset/brevtittel.ts';
import { kravposterI } from '../spor/vederlag/format.ts';
import { innholdIFristen } from '../spor/frist/format.ts';
import { erRegistrert } from '../format/leser.ts';
import {
  type Kontekst,
  Skrivefeil,
  type Utfall,
  forhaandsvis,
  frysBrev,
  laastTekst,
  utledJournal,
  vurder,
} from '../kommandoer/skriving.ts';
import { P1, medKravpostIder, mellomlager } from './klient.ts';
import type { Avsnitt, Journalrad, Krav, Opplysning, Part, Sakskode } from '../typer.ts';
import type { Utledning } from '../utledning/utled.ts';
import { KJERNE } from '../versjon.ts';
import { SOM_BREV } from './brevet.ts';

export type Data = Record<string, unknown>;

export const SAK = 'SAK-20261002-001';
export const TITTEL = 'Endret fundamentering';
/** Sakens kode i brevene (LV-U44, S3 i #1497). */
export const KOE_17 = { kode: 'koe', loepenummer: 17 } as const;
export const I_SAKEN = `i sak KOE-17 («${TITTEL}»)`;
/** Navnet på forholdet i påberopelsen, som er sakstittelen (LV-U43). */
export const NAVNET = `«${TITTEL}» i sak KOE-17`;
/** Statusen når kravene er avgjort etter OV-U3, med teksten i OV-U99 punkt 6 (svar S1 15.11 i #2017). */
export const AVGJORT =
  'Partene er enige om hvert krav som er sendt i løsningen, eller kravet er trukket';
export const KR = (n: string) => `${n.replace(' ', '\u00a0')}\u00a0kr eks. mva.`;
/** Beløpet i byggherrens svar, der merverdiavgiften står i innledningen (LV-U34). */
export const kr = (n: string) => `${n.replace(' ', '\u00a0')}\u00a0kr`;

/**
 * En sak i minnet der hver kommando går gjennom `vurder`, én dag etter den forrige.
 * Klienten sender den låste teksten fra forhåndsvisningen (A1), med mindre
 * kommandoen alt har en.
 */
/**
 * KA-U74: dagene vurderes per frist. Sakene i testene har én frist, så dagene og dagene byggherren
 * måtte forstå skrives på toppen av vurderingene og flyttes til vurderingen for den fristen.
 */
export function medFristen(v: Data): Data {
  if (!('dager' in v) && !('dager_maatte_forstaa' in v)) return v;
  const { dager, dager_maatte_forstaa: maatteForstaa, ...resten } = v;
  return { ...resten, frister: [{ dager, dager_maatte_forstaa: maatteForstaa }] };
}

/** Resultatet klienten regnet ut for den ene fristen, som raden for den i utregningen. */
export function medFristrad(r: Data | undefined, krav: Krav | null): Data | undefined {
  // VS-U96 punkt 32: svaret på varselet etter § 33.4 har ingen utregning.
  if (!r || 'frister' in r || !krav || !Object.keys(r).length) return r;
  return { frister: [{ gjelder: innholdIFristen(krav).frister[0]!.id, ...r }] };
}

export function sak(sakstittel = TITTEL, sakskode?: Sakskode, forkortelse: string | null = 'K201') {
  // Driften kan endre kontraktsforkortelsen etter at saken har brev (`koe_drift.sett_kontraktsparter`).
  let kontraktsforkortelse = forkortelse;
  const journal: Journalrad[] = [
    {
      event_id: randomUUID(),
      sak_id: SAK,
      event_type: 'sak_opprettet',
      versjon: 1,
      tidsstempel: '2026-10-01T08:00:00.000Z',
      aktor_id: 'te',
      aktor_rolle: 'TE',
      aktor_team_id: null,
      refererer_til_event_id: null,
      format: 1,
      data: { sakstittel, sakstype: 'standard' },
    },
  ];
  let dag = 2;
  const kontekst = (part: Part): Kontekst => {
    const tid = new Date(`2026-10-${String(dag).padStart(2, '0')}T10:00:00Z`);
    return {
      sakId: SAK,
      aktoerId: part.toLowerCase(),
      part,
      teamId: null,
      sakskode: sakskode ?? KOE_17,
      kontraktsforkortelse,
      kontraktsfrister: [],
      tidspunkt: () => tid,
      nyId: randomUUID,
    };
  };
  /**
   * Som skjemaet i klienten: en kravpost med betegnelsen til en kravpost i den gjeldende
   * kravversjonen får dens `id`, og ellers er den ny og sendes uten betegnelse (arbeidsvalget 07.11 i domenetabellen).
   */
  const medIder = (kommando: Data): Data => {
    const innhold = kommando.innhold as Data | undefined;
    if (kommando.type === 'brev' || kommando.type === 'revisjon') {
      const krav = utledJournal(journal, KJERNE).spor.vederlag.gjeldendeKrav;
      const fristkravet = utledJournal(journal, KJERNE).spor.frist.gjeldendeKrav;
      const medId = (s: Data) =>
        s.spor === 'vederlag'
          ? { ...s, vurderinger: medKravpostIder(s.vurderinger, krav) }
          : s.spor === 'frist'
            ? {
                ...s,
                vurderinger: medFristen(s.vurderinger as Data),
                resultat: medFristrad(s.resultat as Data, fristkravet),
              }
            : s;
      const svar = kommando.svar as Data[] | Data | undefined;
      return structuredClone({
        ...kommando,
        ...(svar ? { svar: Array.isArray(svar) ? svar.map(medId) : medId(svar) } : {}),
      });
    }
    if (kommando.type !== 'krav' || kommando.spor !== 'vederlag' || !innhold?.kravposter)
      return structuredClone(kommando);
    const forrige = utledJournal(journal, KJERNE).spor.vederlag.gjeldendeKrav;
    const ider = new Map(forrige ? kravposterI(forrige).map((p) => [p.betegnelse, p.id]) : []);
    const kravposter = (innhold.kravposter as Data[]).map(({ betegnelse, ...p }) =>
      p.id === undefined && ider.has(betegnelse as string)
        ? { id: ider.get(betegnelse as string), ...p }
        : p
    );
    return structuredClone({ ...kommando, innhold: { ...innhold, kravposter } });
  };
  const prov = (part: Part, kommando: Data, kjerne = KJERNE): Utfall => {
    const k = medIder(kommando);
    try {
      if (!('brevtekst' in k)) {
        const vist = forhaandsvis(
          structuredClone(k),
          kontekst(part),
          journal,
          kjerne,
          mellomlager(k)
        );
        const t = vist.godtatt ? laastTekst(vist.hendelser.at(-1)!) : null;
        if (t) k.brevtekst = t;
      }
      return vurder(k, kontekst(part), journal, kjerne, mellomlager(k));
    } catch (feil) {
      // 7.1.2 i designnotatet: kjernen skal forstå det den selv skriver.
      if (feil instanceof Skrivefeil) throw new AssertionError({ message: feil.message });
      throw feil;
    }
  };
  /** `sammeDag`: det neste brevet sendes samme dag (OV-U104). */
  const send = (part: Part, kommando: Data, sammeDag = false): Journalrad => {
    const utfall = prov(part, kommando);
    if (!utfall.godtatt)
      expect.fail(`Forutsetning: kommandoen ble avvist: ${JSON.stringify(utfall.avvisning)}`);
    if (!sammeDag) dag++;
    journal.push(...utfall.hendelser);
    return utfall.hendelser.at(-1)!;
  };
  /** Den låste teksten forhåndsvisningen gir, eller `null` når den avvises (A1). */
  const vis = (part: Part, kommando: Data, kjerne = KJERNE): string[] | null => {
    try {
      const vist = forhaandsvis(
        medIder(kommando),
        kontekst(part),
        journal,
        kjerne,
        mellomlager(kommando)
      );
      return vist.godtatt ? laastTekst(vist.hendelser.at(-1)!) : null;
    } catch (feil) {
      if (feil instanceof Skrivefeil) throw new AssertionError({ message: feil.message });
      throw feil;
    }
  };
  /** Avvisningen kommandoen får, eller `null` når den godtas. */
  const avvisning = (part: Part, kommando: Data, kjerne = KJERNE) => {
    const u = prov(part, kommando, kjerne);
    return u.godtatt ? null : u.avvisning;
  };
  const avvist = (part: Part, kommando: Data, kjerne = KJERNE) =>
    avvisning(part, kommando, kjerne)?.regel ?? null;
  /** En rad skrevet utenfor kommandoene, som registrert korrespondanse; svarene fryses. */
  const rad = (part: Part, data: Data): Journalrad => {
    const r: Journalrad = {
      event_id: randomUUID(),
      sak_id: SAK,
      event_type: 'dokument_registrert',
      versjon: journal.at(-1)!.versjon + 1,
      tidsstempel: `2026-10-${String(dag++).padStart(2, '0')}T10:00:00.000Z`,
      aktor_id: part.toLowerCase(),
      aktor_rolle: part,
      aktor_team_id: null,
      refererer_til_event_id: null,
      format: 1,
      // Et brev fra løsningen, skrevet her uten teksten, har nummeret og merkingen skrivingen
      // gir (LV-U44, LV-U53).
      data:
        erRegistrert((data.opplysninger as Opplysning[] | undefined) ?? []) || 'brevnummer' in data
          ? data
          : medNummer(data),
    };
    frysBrev(r, journal, KJERNE);
    journal.push(r);
    return r;
  };
  const nesteNummer = () =>
    Math.max(0, ...journal.map((h) => (h.data.brevnummer as number | undefined) ?? 0)) + 1;
  const medNummer = (data: Data): Data => {
    const brevnummer = nesteNummer();
    return kontraktsforkortelse
      ? {
          ...data,
          brevnummer,
          merking: brevmerking(kontraktsforkortelse, sakskode ?? KOE_17, brevnummer),
        }
      : { ...data, brevnummer };
  };
  const endreForkortelse = (ny: string) => {
    kontraktsforkortelse = ny;
  };
  const u = () => utledJournal(journal, KJERNE);
  const krav = (spor: 'forhold' | 'vederlag' | 'frist') => gjeldendeKrav(u(), spor).id;
  return { journal, send, vis, avvisning, avvist, rad, u, krav, endreForkortelse };
}

/** Det gjeldende kravet i sporet. Mangler det, feiler testen med en assertion. */
export const gjeldendeKrav = (
  u: ReturnType<typeof utledJournal>,
  spor: 'forhold' | 'vederlag' | 'frist'
) => {
  const krav = u.spor[spor].gjeldendeKrav;
  expect(krav, `Forutsetning: TE har et gjeldende krav i ${spor}`).not.toBeNull();
  return krav!;
};

/** Dagen etter siste rad i journalen: dagen neste rad skrives, i `sak` én dag per rad. */
export const dagenEtterSisteRad = (s: { journal: Journalrad[] }) => {
  const d = new Date(s.journal.at(-1)!.tidsstempel);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export const tekst = (rad: Journalrad): Avsnitt[] => {
  expect(rad.data.brevtekst, 'brevet fra appen har brevtekst (LV-U2)').toBeDefined();
  return rad.data.brevtekst as Avsnitt[];
};
export const laast = (rad: Journalrad) => tekst(rad).map((a) => a.laast);

export const BESKRIVELSE = 'Byggherren har pålagt en annen fundamentering.';

/** Vederlagskravet med én kravpost med fast sum, P1 (OV-U115 punkt 19), og eventuelt postene utenfor. */
/** `id` for P1 i den gjeldende vederlagskravversjonen, for et krav som trekker den (KA-U56). */
export const p1I = (s: { u: () => Utledning }): string =>
  kravposterI(s.u().spor.vederlag.gjeldendeKrav!)[0]!.id;

export const tilbud = (beloep?: number, rest: Data = {}): Data => ({
  ...(beloep === undefined
    ? {}
    : {
        kravposter: [
          { betegnelse: 'P1', beskrivelse: 'Ny fundamentering', oppgjoersform: 'tilbud', beloep },
        ],
      }),
  ...rest,
});

/**
 * VS-U26: datoen varslingsplikten løper fra, som TE oppgir i påberopelsen. Setningen er den samme
 * i det første brevet og i en ny versjon (LV-U57, LV-U56).
 */
export const MOTTATT = { paalegg_mottatt: '2026-09-25' };
export const KLAR_OVER = { klar_over_forholdet: '2026-09-25' };
export const MOTTATT_TEKST = 'Pålegget ble mottatt 25. september 2026.';
export const KLAR_OVER_TEKST = 'Totalentreprenøren ble klar over forholdet 25. september 2026.';

export const PAABEROPELSE = {
  type: 'krav',
  spor: 'forhold',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    ...MOTTATT,
  },
  utdypning: BESKRIVELSE,
};

/** OV-U5: kravet registrerer varselet, så brevet med det ligger ved (arbeidsvalget i #909). */
export const VARSELBREVET = '7f1c2d3e-0000-4000-8000-000000003304';
/** Et vedlegg ved kravet om fristforlengelse (#1823). */
export const PLAN = '7f1c2d3e-0000-4000-8000-000000003361';

export const FRISTKRAV = {
  type: 'krav',
  spor: 'frist',
  innhold: { frister: [{ navn: 'Sluttfristen', dager: 20 }] },
  varsel: { sendt: '2026-09-28', ...SOM_BREV, dokumentasjon: [VARSELBREVET] },
  utdypning: 'Pelingen tar fire uker lenger.',
};
/** KA-U74, KA-U79: den faste innledningen i fristkravet. */
export const FRISTKRAVET =
  'Totalentreprenøren krever fristforlengelse for fristene i kontrakten under, med antall dager etter NS 8407 punkt\u00a033.6.1. Dagene gjelder hver frist for seg.';
/** LV-U72: punktet med fristene i kravet, nummer `n`. */
export const fristforlengelse = (n: number, dager = 20) =>
  `${n}. Fristforlengelse\n\n${FRISTKRAVET}\n\nFrist Sluttfristen: ${dager} dager.`;
/** VS-U15: uten varsel før kravet er kravet varselet etter § 33.4 (prototypen `fristkrav-te.html`). */
export const VARSLER_NAA =
  '1. Varselet om fristforlengelse\n\nTotalentreprenøren varsler krav om fristforlengelse etter NS 8407 punkt\u00a033.4.';
/** VS-U55: varselet etter § 33.4 ble gitt i et tidligere brev. */
export const varseletGitt = (brev: string) =>
  `1. Varselet om fristforlengelse\n\nVarsel om fristforlengelse etter NS 8407 punkt\u00a033.4 ble gitt i ${brev}.`;
/** Kravet som varsler, med fristene og begrunnelsen i punkt 2 og 3. */
export const SLUTTFRISTEN_20 = [VARSLER_NAA, fristforlengelse(2), '3. Begrunnelse'];

/** Saken med forhold (brev 2), vederlag (brev 3, 125 000 kr) og frist (brev 4, 20 dager). */
/** VS-U34, C1 i #2056: raden kravskjemaet skriver foran fristkravet, med varselet etter § 33.4. */
export function varselradenIFristkravet(s: { journal: Journalrad[] }): Journalrad {
  const rad = s.journal.find((r) =>
    ((r.data.utsagn ?? []) as Data[]).some((u) => u.art === 'varsel' && u.hjemmel === '33.4')
  );
  expect(rad, 'varselet fra kravskjemaet står i saken som eget brev (VS-U34)').toBeDefined();
  return rad!;
}
export const varseletIFristkravet = (s: { journal: Journalrad[] }): Data =>
  (varselradenIFristkravet(s).data.utsagn as Data[]).find((u) => u.art === 'varsel')!;
export const sendtForVarseletIFristkravet = (s: { journal: Journalrad[] }): string =>
  (varselradenIFristkravet(s).data.opplysninger as Data[])[0].id as string;

export function sakMedKrav() {
  const s = sak();
  s.send('TE', PAABEROPELSE);
  s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
  s.send('TE', FRISTKRAV);
  return s;
}

export const BEGRUNNELSE = 'Byggherrens begrunnelse.';

/** «Ja» på § 34.2.2 og § 33.6.1 står i brevet uten å ordnes, som byggherren sa det (#341, LV-U3). */
// LV-U31 og LV-U32: setningen når byggherren godkjenner oppgjør som fast sum.
export const METODE_JA =
  'Byggherren godkjenner oppgjør som fast sum med beløpet og forbeholdene som fremgår av svaret.';
/** LV-U34 og LV-U41: innledningen i svaret på vederlagskravet i brev 2. */
export const INNLEDNING_VEDERLAG =
  'Byggherren svarer på totalentreprenørens krav om justering av vederlaget i brev K201-KOE-017-02 av 3. oktober 2026. Beløpene i brevet er eks. mva.';
/** GR-U34 og GR-U33: forbeholdet i punktet «Forbehold» når forholdet i brev 1 ikke er besvart. */
export const FORBEHOLDET =
  'Byggherren har ennå ikke svart på totalentreprenørens påberopelse av irregulær endring i brev K201-KOE-017-01 av 2. oktober 2026. Standpunktene ovenfor gjelder under forutsetning av at forholdet gir grunnlag for kravet.';
/** LV-U80: overskriften på svaret på hvert krav, når brevet svarer på flere krav. */
export const DELEN = {
  forhold: 'Svar på forholdet',
  vederlag: 'Svar på kravet om vederlagsjustering',
  frist: 'Svar på kravet om fristforlengelse',
} as const;
/** LV-U80: innledningen under overskriften på svaret, når brevet svarer på flere krav. */
export const iDelen = (spor: keyof typeof DELEN, innledning: string) =>
  `${DELEN[spor]}\n\n${innledning}`;
/** LV-U81, 4 A: byggherrens forbehold for hvert svar, med navnet på kravet, i et brev med flere svar. */
export const FORBEHOLD_FOR = {
  forhold: 'Forbehold for svaret på forholdet:',
  vederlag: 'Forbehold for svaret på kravet om vederlagsjustering:',
  frist: 'Forbehold for svaret på kravet om fristforlengelse:',
} as const;
/** LV-U79: navnene på innsigelsene i lagslinjen. */
export const MOT = {
  forholdet: 'innsigelsen mot forholdet',
  varselet: (hjemmel: string, post?: string) =>
    `innsigelsen mot varselet etter punkt\u00a0${hjemmel}${post ? ` for ${post}` : ''}`,
  hindringen: 'innsigelsen mot hindringen og årsaken til den',
  spesifiseringen: 'innsigelsen mot spesifiseringen etter punkt\u00a033.6.1',
  forespoerselssvaret: 'innsigelsen mot svaret på forespørselen etter punkt\u00a033.6.2',
  beregningsregelen: (post: string) => `innsigelsen mot beregningsregelen for ${post}`,
  tilbudet: (post: string) => `innsigelsen mot tilbudet for ${post}`,
} as const;
/** LV-U34 og LV-U41: innledningen i svaret på påberopelsen i brev 1. */
export const INNLEDNING_FORHOLDET =
  'Byggherren svarer på totalentreprenørens påberopelse av irregulær endring i brev K201-KOE-017-01 av 2. oktober 2026.';
/** LV-U35 og LV-U41: punktet om varselet etter punkt 32.2 når byggherren sier «i tide». */
export const VARSELET_I_TIDE =
  '1. Varselet etter punkt\u00a032.2\n\nByggherren gjør ikke gjeldende at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent.';
/** LV-U72: innledningen i svaret på fristkravet i brev 3. */
export const INNLEDNING_FRIST =
  'Byggherren svarer på totalentreprenørens krav om fristforlengelse i brev K201-KOE-017-03 av 4. oktober 2026.';
/** LV-U72: punktet om varselet etter § 33.4 når byggherren sier «i tide», nummer `n`. */
export const VARSELET_33_4_I_TIDE = (n: number) =>
  `${n}. Varselet om fristforlengelse (punkt\u00a033.4)\n\nByggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i totalentreprenørens brev av 28. september 2026 kom for sent.`;
/** KA-U81: punktet om hindringen når byggherren legger den til grunn, nummer `n`. */
export const HINDRET = (n: number) =>
  `${n}. Hindringen\n\nByggherren legger til grunn at fremdriften er hindret, og at hindringen skyldes forholdet (punkt\u00a033.1).`;
export const SPESIFISERING_JA =
  'Byggherren gjør ikke gjeldende at kravet om fristforlengelse ble spesifisert for sent (punkt\u00a033.6.1).';

export const svar = (
  spor: string,
  gjelder: string,
  vurderinger: Data,
  resultat: Data = {},
  utdypning: string | null = BEGRUNNELSE
) => ({
  spor,
  gjelder,
  regelversjon: KJERNE.regler.versjon,
  vurderinger,
  resultat,
  // KA-U46 punkt 1 og KA-U47: begrunnelsen for et svar på forholdet står i punktet om forholdet.
  ...(utdypning === null
    ? {}
    : spor === 'forhold'
      ? { utdypninger: { forhold: utdypning } }
      : { utdypning }),
});

export const VEDERLAG_DELVIS = [
  P1({ vurdering: 'delvis', godkjent_beloep: 100000, aksepterer: true }),
  { resultat: 'delvis_godkjent', godkjent_beloep: 100000 },
] as const;

export const FRIST_FULLT = [
  { frist_varsel_ok: true, spesifisert_krav_ok: true, vilkar_oppfylt: true, dager: 20 },
  { resultat: 'godkjent', godkjent_dager: 20 },
] as const;

export function utenFelt(k: Data, felt: string): Data {
  return Object.fromEntries(Object.entries(k).filter(([n]) => n !== felt));
}

export function esc(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
