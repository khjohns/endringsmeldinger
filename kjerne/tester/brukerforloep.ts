/**
 * Brukerforløpene i `docs/domenetabell/brukerforlop/` (#1330). Et brukerforløp følger en
 * hel sak med samme stegformat (`Handling`), prefikser og kjører som bevis-sakene, og
 * har navngitte kontrollpunkter med egne kontroller. Bevis-sakene er regelbevis og endres
 * ikke herfra; et forløp viser til dem, men henvisningen erstatter ikke kontrollene.
 *
 *   node kjerne/tester/brukerforloep.ts --skriv
 *
 * skriver dekningsoversikten (`dekning.md`) og startjournalene demoruta laster
 * (`startjournaler.json`). Vakttesten i `brukerforloep.test.ts` feiler når de ikke
 * stemmer med forløpsfilene.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Journalrad, Part } from '../typer.ts';
import { minnebane, type Bane } from './bane.ts';
import { partFor, type Handling } from './klient.ts';
import { kjoer, type Forloep, type Kjoering, type Kontroll, type Paastand } from './kjoerer.ts';
import { fasteIder, testklokke, type Klokke, type NyId } from './testmiljoe.ts';

export const MAPPE = resolve(
  fileURLToPath(import.meta.url),
  '../../../docs/domenetabell/brukerforlop'
);
const KONTROLLSETT = 'kontrollsett.json';
const STARTJOURNALER = 'startjournaler.json';
const DEKNING = 'dekning.md';

export type Status = 'kjørbar' | 'planlagt';
export type Visning = 'demoruta' | 'saksruta';

export type Kontrollpunkt = {
  id: string;
  etter: number;
  beskrivelse: string;
  kontrollsett?: { sett: string; med: Record<string, unknown> }[];
  kontroller?: Omit<Kontroll, 'etter'>[];
  /** Det brukeren skal forstå her. Prøves manuelt og i brukertest, ikke i CI. */
  forstaaelse: Forstaaelse[];
};

/** Det brukeren skal forstå, med vedtakene eller radene i domenetabellen det bygger på. */
export type Forstaaelse = { tekst: string; kilde: string[] };

export type Brukerforloep = {
  id: string;
  tittel: string;
  brukerhistorie: string;
  status: Status;
  utgangspunkt: { start: string | null; beskrivelse: string };
  steg?: Handling[];
  kontrollpunkter?: Kontrollpunkt[];
  /** Vedtakene et planlagt forløp bygger på. */
  kilder?: string[];
  /** Issuene et planlagt forløp venter på. */
  venter_paa?: string[];
  /** Bestillingen i samme mappe: ønsket arbeidsmåte, forventningene og de åpne spørsmålene. */
  bestilling?: string;
  bevis_saker: string[];
  visninger: Visning[];
  endringer: { dato: string; grunnlag: string; hva: string }[];
};

type Kontrollsett = {
  beskrivelse: string;
  parametre: string[];
  kontroller: Omit<Kontroll, 'etter'>[];
};

const lesJson = (fil: string): unknown => JSON.parse(readFileSync(join(MAPPE, fil), 'utf8'));

/** Forløpsfilene, sortert etter ID. */
export const forloepsfiler = (): string[] =>
  readdirSync(MAPPE)
    .filter((f) => /^BF-.+\.json$/.test(f))
    .sort();

export const BRUKERFORLOEP: Brukerforloep[] = forloepsfiler().map(
  (f) => lesJson(f) as Brukerforloep
);

export const SETT = (lesJson(KONTROLLSETT) as { sett: Record<string, Kontrollsett> }).sett;

/** Verdien med `{navn}` fylt ut. En verdi som bare er `{navn}`, får parameterens verdi. */
function fyll(verdi: unknown, med: Record<string, unknown>): unknown {
  if (typeof verdi === 'string') {
    const hel = /^\{(\w+)\}$/.exec(verdi);
    if (hel) {
      if (!(hel[1] in med)) throw new Error(`Parameteren ${hel[1]} mangler`);
      return med[hel[1]];
    }
    return verdi.replace(/\{(\w+)\}/g, (_, navn: string) => {
      if (!(navn in med)) throw new Error(`Parameteren ${navn} mangler`);
      return String(med[navn]);
    });
  }
  if (Array.isArray(verdi)) return verdi.map((v) => fyll(v, med));
  if (verdi && typeof verdi === 'object')
    return Object.fromEntries(
      Object.entries(verdi).map(([k, v]) => [fyll(k, med) as string, fyll(v, med)])
    );
  return verdi;
}

/** Kontrollene i kontrollpunktet: settene, fylt ut, og de egne. */
export function kontrollerI(p: Kontrollpunkt): Kontroll[] {
  const fraSett = (p.kontrollsett ?? []).flatMap(({ sett, med }) => {
    const s = SETT[sett];
    if (!s) throw new Error(`Kontrollsettet ${sett} finnes ikke`);
    const mangler = s.parametre.filter((x) => !(x in med));
    if (mangler.length) throw new Error(`${sett} mangler ${mangler.join(', ')}`);
    return s.kontroller.map((k) => fyll(k, med) as Omit<Kontroll, 'etter'>);
  });
  return [...fraSett, ...(p.kontroller ?? [])].map((k) => ({ ...k, etter: p.etter }));
}

/** Forløpet som bevis-sakene har det, så kjøreren kan kjøre det. Bare et kjørbart forløp. */
export function somForloep(b: Brukerforloep): Forloep {
  if (b.status !== 'kjørbar') throw new Error(`${b.id} er planlagt og kjøres ikke`);
  return {
    id: b.id,
    rader: [],
    start: b.utgangspunkt.start,
    steg: b.steg ?? [],
    kontroller: (b.kontrollpunkter ?? []).flatMap(kontrollerI),
  };
}

export const kjoerbare = (): Brukerforloep[] => BRUKERFORLOEP.filter((b) => b.status === 'kjørbar');

export function finn(id: string): Brukerforloep {
  const b = BRUKERFORLOEP.find((x) => x.id === id);
  if (!b) throw new Error(`Brukerforløpet ${id} finnes ikke`);
  return b;
}

export function kontrollpunkt(b: Brukerforloep, id: string): Kontrollpunkt {
  const p = b.kontrollpunkter?.find((x) => x.id === id);
  if (!p) throw new Error(`${b.id} har ikke kontrollpunktet ${id}`);
  return p;
}

/** Tidspunktet saken opprettes i et isolert forløp; klokka går ett minutt per hendelse. */
export const START = '2026-10-01T08:00:00.000Z';

/** ID-ene og klokka i et isolert forløp: faste, med forløpets ID som navnerom. */
export function isolert(b: Brukerforloep): { nyId: NyId; klokke: Klokke } {
  return { nyId: fasteIder(b.id), klokke: testklokke(START) };
}

/** Navnerommet demoruta lager ID-ene sine i etter kontrollpunktet. */
export const demonavnerom = (b: Brukerforloep) => `${b.id}/demoruta`;

/** En sak i minnet for forløpet. Kjøringen må bruke de samme ID-ene og klokka (`valg`). */
function isolertBane(b: Brukerforloep, valg: { nyId: NyId; klokke: Klokke }): Bane {
  return minnebane({
    nyId: valg.nyId,
    opprettet: valg.klokke.naa().toISOString(),
    sakstittel: b.tittel,
  });
}

/**
 * Kjør forløpet i `bane`, til og med kontrollene i kontrollpunktet `til` når det er
 * oppgitt. Uten `bane` kjøres det isolert i minnet.
 */
export async function kjoerBrukerforloep(
  b: Brukerforloep,
  {
    bane,
    til,
    paastand,
    valg = isolert(b),
  }: {
    bane?: Bane;
    til?: string;
    paastand?: Paastand;
    valg?: { nyId: NyId; klokke: Klokke };
  } = {}
): Promise<{ k: Kjoering; bane: Bane }> {
  const b2 = bane ?? isolertBane(b, valg);
  const k = await kjoer(somForloep(b), b2, {
    paastand,
    til: til === undefined ? undefined : kontrollpunkt(b, til).etter,
    valg,
  });
  return { k, bane: b2 };
}

// --- Startjournalene og dekningsoversikten ---------------------------------------

/** Det demoruta trenger for å starte forløpet fra et kontrollpunkt. */
export type Startjournal = {
  id: string;
  tittel: string;
  brukerhistorie: string;
  /** Aktørene og teamene radene i journalen har, per side. */
  aktoerer: Record<Part, { aktor_id: string; aktor_team_id: string }>;
  /**
   * De første åtte sifrene i ID-ene demoruta lager etter kontrollpunktet, fra `fasteIder`
   * med `demonavnerom`. Resten er nummeret, som i `fasteIder`.
   */
  idhode: string;
  kontrollpunkter: {
    id: string;
    beskrivelse: string;
    /** Saksversjonen ved kontrollpunktet: journalen er radene til og med den. */
    versjon: number;
    forstaaelse: string[];
    /** Parten som handler i neste steg i forløpet, eller `null` etter siste steg. */
    neste: { part: Part; handling: string } | null;
  }[];
  journal: Journalrad[];
};

export async function startjournal(b: Brukerforloep): Promise<Startjournal> {
  const steg = b.steg ?? [];
  const versjoner: number[] = [];
  for (const p of b.kontrollpunkter ?? []) {
    const { bane } = await kjoerBrukerforloep(b, { til: p.id });
    versjoner.push((await bane.journal()).at(-1)!.versjon);
  }
  const { bane } = await kjoerBrukerforloep(b);
  return {
    id: b.id,
    tittel: b.tittel,
    brukerhistorie: b.brukerhistorie,
    aktoerer: {
      TE: { aktor_id: bane.aktor('TE'), aktor_team_id: 'team-te' },
      BH: { aktor_id: bane.aktor('BH'), aktor_team_id: 'team-bh' },
    },
    idhode: fasteIder(demonavnerom(b))().slice(0, 8),
    kontrollpunkter: (b.kontrollpunkter ?? []).map((p, i) => ({
      id: p.id,
      beskrivelse: p.beskrivelse,
      versjon: versjoner[i],
      forstaaelse: p.forstaaelse.map((f) => f.tekst),
      neste:
        p.etter < steg.length
          ? { part: partFor(steg[p.etter]), handling: steg[p.etter].handling }
          : null,
    })),
    journal: await bane.journal(),
  };
}

export async function startjournaler(): Promise<{ generert_av: string; forlop: Startjournal[] }> {
  const ut: Startjournal[] = [];
  for (const b of kjoerbare().filter((x) => x.visninger.includes('demoruta')))
    ut.push(await startjournal(b));
  return { generert_av: 'node kjerne/tester/brukerforloep.ts --skriv', forlop: ut };
}

const PROEVD_I = (b: Brukerforloep): string[] =>
  b.status === 'kjørbar' ? ['kjernen i minnet', 'testbasen', ...b.visninger] : [];

const celle = (t: string) => t.replaceAll('|', '\\|').replaceAll('\n', ' ');

export function dekning(): string {
  const linjer = [
    '<!-- Generert av `node kjerne/tester/brukerforloep.ts --skriv` fra forløpsfilene. Rett i forløpsfilene, ikke her. -->',
    '',
    '# Dekningsoversikten for brukerforløpene',
    '',
    'Formatet og arbeidsregelen står i [README](README.md).',
    '',
    '| Forløp | Brukerhistorie | Status | Prøvd i | Venter på | Bevis-saker | Bestilling |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const b of BRUKERFORLOEP)
    linjer.push(
      `| [${b.id}](${b.id}.json) ${celle(b.tittel)} | ${celle(b.brukerhistorie)} | ${b.status} | ${
        PROEVD_I(b).join(', ') || '—'
      } | ${(b.venter_paa ?? []).join(', ') || '—'} | ${b.bevis_saker.join(', ') || '—'} | ${
        b.bestilling ? `[${b.bestilling}](${b.bestilling})` : '—'
      } |`
    );
  linjer.push(
    '',
    '## Kildene',
    '',
    'Hvert vedtak og hver rad i domenetabellen forløpene viser til, og hvor. En kontroll',
    'kjøres i CI. En forståelse prøves manuelt og i brukertest. Et planlagt forløp bygger',
    'på kilden, men har ingen kontroller ennå.',
    '',
    '| Kilde | Kontroller | Forståelse | Planlagt |',
    '| --- | --- | --- | --- |'
  );
  for (const [kilde, bruk] of kildebruk())
    linjer.push(
      `| ${kildelenke(kilde)} | ${bruk.kontroll.join(', ') || '—'} | ${
        bruk.forstaaelse.join(', ') || '—'
      } | ${bruk.planlagt.join(', ') || '—'} |`
    );
  return linjer.join('\n') + '\n';
}

type Kildebruk = { kontroll: string[]; forstaaelse: string[]; planlagt: string[] };

/** Hvor forløpene viser til hver kilde, sortert etter kilden. */
export function kildebruk(forloep = BRUKERFORLOEP): [string, Kildebruk][] {
  const bruk = new Map<string, Kildebruk>();
  const legg = (kilder: string[], hvor: keyof Kildebruk, sted: string) => {
    for (const k of kilder) {
      const b = bruk.get(k) ?? { kontroll: [], forstaaelse: [], planlagt: [] };
      if (!b[hvor].includes(sted)) b[hvor].push(sted);
      bruk.set(k, b);
    }
  };
  for (const b of forloep) {
    if (b.status === 'planlagt') legg(b.kilder ?? [], 'planlagt', b.id);
    for (const p of b.kontrollpunkter ?? []) {
      for (const k of kontrollerI(p)) legg(k.kilde, 'kontroll', `${b.id} ${p.id}`);
      for (const f of p.forstaaelse) legg(f.kilde, 'forstaaelse', `${b.id} ${p.id}`);
    }
  }
  return [...bruk].sort(([a], [b]) => a.localeCompare(b, 'nb', { numeric: true }));
}

/** Et vedtak lenkes til raden i vedtaksfila. En rad i domenetabellen står som den er. */
const kildelenke = (kilde: string) =>
  /^([A-Z]{2,3}-U\d+|B-\d{2})$/.test(kilde)
    ? `[${kilde}](../../plans/vedtak.md#${kilde.toLowerCase()})`
    : kilde;

export async function genererte(): Promise<Record<string, string>> {
  return {
    [DEKNING]: dekning(),
    [STARTJOURNALER]: JSON.stringify(await startjournaler(), null, 2) + '\n',
  };
}

export const lagret = (fil: string): string | null => {
  try {
    return readFileSync(join(MAPPE, fil), 'utf8');
  } catch {
    return null;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes('--skriv')) {
    console.error('Bruk: node kjerne/tester/brukerforloep.ts --skriv');
    process.exit(2);
  }
  for (const [fil, innhold] of Object.entries(await genererte())) {
    writeFileSync(join(MAPPE, fil), innhold);
    console.log(`Skrev ${join('docs/domenetabell/brukerforlop', fil)}`);
  }
}
