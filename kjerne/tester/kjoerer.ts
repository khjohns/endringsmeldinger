/**
 * Kjører bevis-sakene i `docs/domenetabell/bevis-saker-maalmodell.json` mot
 * målmodellen i en bane. Samme kontrollroller som korpuset i språkprøven: en
 * forutsetning eller kontrollsak som ikke holder, feiler med `Forutsetning`;
 * målet meldes gjennom `paastand`. Et avvist steg skal la journalen stå uendret.
 */

import { AssertionError } from 'node:assert';
import bevis from '../../docs/domenetabell/bevis-saker-maalmodell.json' with { type: 'json' };
import { handlinger } from '../kommandoer/handlinger.ts';
import { GJELDENDE_REGLER, type Regelsett } from '../regler/regelsett.ts';
import { KJERNE, type Kjerne } from '../versjon.ts';
import { erRegistrert, Uforstaatt } from '../format/leser.ts';
import {
  forhaandsvis,
  frysBrev,
  laastTekst,
  Skrivefeil,
  utledJournal,
  vurder,
  type Kontekst,
  type Utfall,
} from '../kommandoer/skriving.ts';
import {
  enighetensVirkning,
  kanInngaaIEo,
  kraveneErAvgjort,
  type Utledning,
} from '../utledning/utled.ts';
import { visning } from '../utledning/visning.ts';
import type { Bane } from './bane.ts';
import {
  kommandoFor,
  mellomlager,
  Navn,
  NESTE_REGLER,
  partFor,
  radFor,
  REGELSETT,
  type Handling,
} from './klient.ts';

export type Kontroll = {
  etter: number;
  rolle: 'mal' | 'forutsetning' | 'kontroll';
  kilde: string[];
  forventet: Record<string, unknown>;
  prov?: Handling;
};

export type Forloep = {
  id: string;
  rader: string[];
  start: string | null;
  steg: Handling[];
  kontroller: Kontroll[];
};

export const MAALMODELL = bevis as unknown as {
  prefikser: Record<string, Handling[]>;
  forlop: Forloep[];
  genererte: {
    seed: number;
    antall: number;
    lengde: number;
    start: string;
    handlinger: Handling[];
  };
};

/** Like som JSON, uavhengig av rekkefølgen på nøklene. */
export function likeVerdier(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const na = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const nb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return (
    na.length === nb.length &&
    na.every((k) =>
      likeVerdier((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    )
  );
}

export class Forutsetning extends Error {}
export type Paastand = (holder: boolean, melding: string) => void;

const kastVedBrudd: Paastand = (holder, melding) => {
  if (!holder) throw new Error(melding);
};

export const medRegler = (regler: Regelsett, kjerne: Kjerne = KJERNE): Kjerne => ({
  ...kjerne,
  regler,
});

/** Det kjøringen holder rede på mellom stegene. */
export class Kjoering {
  readonly navn = new Navn();
  kjerne: Kjerne;
  sist: { utfall: Utfall | null; nye: number } = { utfall: null, nye: 0 };
  /** Radene kjernen har skrevet gjennom en kommando, til kontrollen av formatet. */
  readonly skrevet: string[] = [];
  private klokke = Date.UTC(2026, 8, 20, 8, 0, 0);

  readonly bane: Bane;

  constructor(bane: Bane, kjerne: Kjerne = KJERNE) {
    this.bane = bane;
    this.kjerne = kjerne;
  }

  kontekst(h: Handling, part = partFor(h)): Kontekst {
    return {
      sakId: this.bane.sakId,
      aktoerId: this.bane.aktor(part),
      part,
      teamId: `team-${part.toLowerCase()}`,
      tidspunkt: () => new Date((this.klokke += 60_000)),
      nyId: () => crypto.randomUUID(),
    };
  }

  async utledning(kjerne: Kjerne = this.kjerne): Promise<Utledning> {
    return utledJournal(await this.bane.journal(), kjerne);
  }

  /**
   * Vurder handlingen uten å lagre. Klienten regner med `klientregler`, ellers
   * kjernens regler. Klienten sender den låste teksten forhåndsvisningen viste; med
   * `brevtekst: false` sender den ingen, og med en liste sender den den. `endre` endrer
   * kommandoen før forhåndsvisningen. Skriver kjernen en rad den selv ikke forstår, er det
   * et brudd på 7.1.2 i designnotatet og meldes som en assertion, ikke som et oppsett som
   * feilet.
   */
  async prov(h: Handling, endre?: (kommando: Record<string, unknown>) => void): Promise<Utfall> {
    const journal = await this.bane.journal();
    const klientregler =
      typeof h.klientregler === 'string' ? REGELSETT[h.klientregler] : this.kjerne.regler;
    const klient = utledJournal(journal, medRegler(klientregler, this.kjerne));
    const k = kommandoFor(h, klient, klientregler, this.navn);
    endre?.(k as unknown as Record<string, unknown>);
    // A1: klienten sender den låste teksten den viste, laget med sine regler. Avviser
    // forhåndsvisningen kommandoen, sendes den uten tekst, og serveren avviser den.
    try {
      const vist = forhaandsvis(
        structuredClone(k),
        { ...this.kontekst(h), tidspunkt: () => new Date(this.klokke) },
        journal,
        medRegler(klientregler, this.kjerne),
        mellomlager(k)
      );
      const tekst = vist.godtatt ? laastTekst(vist.hendelser[0]) : null;
      if (Array.isArray(h.brevtekst)) k.brevtekst = h.brevtekst as string[];
      else if (tekst && h.brevtekst !== false) k.brevtekst = tekst;
      return vurder(structuredClone(k), this.kontekst(h), journal, this.kjerne, mellomlager(k));
    } catch (feil) {
      if (feil instanceof Skrivefeil)
        throw new AssertionError({ message: `${h.handling}: ${feil.message}` });
      throw feil;
    }
  }

  /** Utfør steget. En godtatt kommando lagres, og etikettene får ID-ene. */
  async send(h: Handling): Promise<Utfall | null> {
    if (h.handling === 'regelendring') {
      this.kjerne = medRegler(REGELSETT[h.regelsett as string], this.kjerne);
      this.sist = { utfall: null, nye: 0 };
      return null;
    }
    const journal = await this.bane.journal();
    const versjon = journal.at(-1)!.versjon;
    if (h.handling === 'rad') {
      const u = utledJournal(journal, this.kjerne);
      const { aktoerId, teamId } = this.kontekst(h, h.part === 'TE' ? 'TE' : 'BH');
      const rad = radFor(h, u, this.navn, {
        sak_id: this.bane.sakId,
        versjon: versjon + 1,
        tidsstempel: new Date((this.klokke += 60_000)).toISOString(),
        aktor_id: aktoerId,
        aktor_team_id: teamId,
      });
      // Registrert korrespondanse får brevet frosset som et svar fra kjernen (merknaden til
      // MM-U9), også når relasjonene ikke henger sammen, så forløp E prøver relasjonene.
      try {
        frysBrev(rad, journal, this.kjerne);
      } catch (feil) {
        if (!(feil instanceof Uforstaatt)) throw feil;
      }
      await this.bane.skriv([rad], versjon);
      const etikett = typeof h.dokument === 'string' ? h.dokument : h.navn;
      if (typeof etikett === 'string') {
        for (const o of (rad.data.opplysninger ?? []) as { id: string; hva: string }[])
          this.navn.sett(`${etikett}#${o.hva}`, o.id);
        for (const x of (rad.data.utsagn ?? []) as { id: string; art: string }[])
          this.navn.sett(`${etikett}#${x.art}`, x.id);
      }
      this.sist = { utfall: { godtatt: true, hendelser: [rad] }, nye: 1 };
      return this.sist.utfall;
    }
    const utfall = await this.prov(h);
    if (utfall.godtatt) {
      await this.bane.skriv(utfall.hendelser, versjon);
      this.skrevet.push(...utfall.hendelser.map((r) => r.event_id));
      this.navngi(h, utfall);
    }
    this.sist = { utfall, nye: utfall.godtatt ? utfall.hendelser.length : 0 };
    return utfall;
  }

  /**
   * Etikettene i bevis-saken: et krav og et svar navngis etter elementet, de andre
   * handlingene etter dokumentet. Opplysningene i dokumentet heter `<etikett>#sendt`
   * og `<etikett>#mottatt`.
   */
  private navngi(h: Handling, utfall: Extract<Utfall, { godtatt: true }>): void {
    const [rad] = utfall.hendelser;
    const data = rad.data as { krav?: { id: string }[]; svar?: { id: string }[] };
    if (h.handling === 'brev') {
      this.navn.sett(h.navn, rad.event_id);
      (h.svar as Handling[]).forEach((s, i) => this.navn.sett(s.navn, data.svar![i].id));
    } else if (h.handling === 'revisjon') {
      this.navn.sett(h.navn, data.svar![0].id);
      this.navn.sett(h.dokument, rad.event_id);
    } else if (h.handling === 'krav') {
      this.navn.sett(h.navn, data.krav![0].id);
    } else {
      this.navn.sett(h.navn, rad.event_id);
    }
    if (typeof h.navn === 'string') {
      for (const o of (rad.data.opplysninger ?? []) as { id: string; hva: string }[])
        this.navn.sett(`${h.navn}#${o.hva}`, o.id);
      for (const x of (rad.data.utsagn ?? []) as { id: string; art: string }[])
        this.navn.sett(`${h.navn}#${x.art}`, x.id);
    }
  }
}

/** Verdien på stien i utledningen, visningen, handlingene eller siste utfall. */
export function les(sti: string, u: Utledning, k: Kjoering): unknown {
  const [hode, ...hale] = sti.split('.');
  const id = (navn: string) => k.navn.id(navn);
  const svar = () => {
    const s = u.svar[id(hale[0])];
    if (!s) throw new Forutsetning(`${sti}: svaret ${hale[0]} finnes ikke`);
    return s;
  };
  // OV-U4: et svar i et registrert brev har ingen virkning og står bare i journalen.
  const svaretSomSendt = () => {
    const s =
      u.svar[id(hale[0])]?.svar ??
      u.journal
        .flatMap((h) => (h.art === 'dokument' ? h.dokument.svar : []))
        .find((x) => x.id === id(hale[0]));
    if (!s) throw new Forutsetning(`${sti}: svaret ${hale[0]} finnes ikke`);
    return s;
  };
  switch (hode) {
    case 'forstaatt':
      return u.forstaatt;
    case 'gjeldende_krav':
      return u.spor[hale[0] as 'grunnlag'].gjeldendeKrav?.id ?? null;
    case 'gjeldende_svar':
      return u.spor[hale[0] as 'grunnlag'].gjeldendeSvar?.id ?? null;
    case 'svar':
      return svaretSomSendt()[hale[1] as 'gjelder' | 'erstatter' | 'dokument'];
    case 'standpunkt': {
      const s = svaretSomSendt().standpunkter.find((x) => x.art === hale[1]);
      return s ? (s as Record<string, unknown>)[hale[2]] : null;
    }
    case 'virkning':
      return svar().virkninger.find((p) => p.art === hale[1])?.virkning ?? null;
    case 'annet_varsel':
      // Et standpunkt i svaret, eller innsigelsen svaret er lest med (VS-U11, OV-U5).
      return svar().gjaldtEtAnnetVarsel.map(
        (id) => svar().virkninger.find((x) => x.standpunkt === id)?.art
      );
    case 'beslutningsgrunnlag':
      return (
        (svar().svar.beslutningsgrunnlag as unknown as Record<string, unknown> | null)?.[hale[1]] ??
        null
      );
    case 'enighet': {
      const e = u.spor[hale[0] as 'grunnlag'].enighet;
      if (hale.length === 1 || e === null) return e === null ? null : 'finnes';
      const felt = hale[1];
      if (felt === 'utfall') return e.grunnlag.utfall[hale[2] as 'beloep'] ?? null;
      if (felt === 'virkning' && hale.length === 3)
        return e.grunnlag.virkninger.find((p) => p.art === hale[2])?.virkning ?? null;
      if (felt === 'svar' || felt === 'kilde' || felt === 'regelversjon') return e.grunnlag[felt];
      if (felt === 'virkning') return enighetensVirkning(u, hale[0] as 'grunnlag');
      return e[felt as 'holder'];
    }
    case 'subsidiaer_aarsaker':
      return u.spor[hale[0] as 'vederlag'].subsidiaer;
    case 'uten_virkning':
      return u.utenVirkning.map((x) => x.element);
    case 'innsigelser':
      return u.innsigelser.map((x) => `${x.part}:${x.gjelder}`);
    case 'protester':
      return u.protester.map((x) => `${x.part}:${x.gjelder}`);
    case 'passivitet':
      return u.passivitet.map((x) => x.gjelder);
    case 'grunnlagskrav':
      return svar().svar.grunnlagskrav;
    case 'grunnlag_avklart':
      return u.grunnlagAvklart;
    case 'grunnlag_avvist':
      return u.grunnlagAvvist;
    case 'frafalt':
      return u.frafalt;
    case 'endringsordre':
      return u.endringsordre;
    case 'registrert': {
      const h = u.journal.find((j) => j.id === hendelsenMed(id(hale[0]), u));
      return h?.art === 'dokument' ? erRegistrert(h.dokument.opplysninger) : null;
    }
    case 'kravene_avgjort':
      return kraveneErAvgjort(u);
    case 'kan_inngaa_i_eo':
      return kanInngaaIEo(u);
    case 'trukket':
      return u.spor[hale[0] as 'grunnlag'].trukket;
    case 'varsel':
      return u.spor[hale[0] as 'frist' | 'vederlag'].varsel?.dokument ?? null;
    case 'opplysning': {
      const o = u.opplysninger.find((x) => x.opplysning.id === id(hale[0]));
      if (hale.length === 1 || !o) return o ? 'finnes' : null;
      if (hale[1] === 'dato') return 'dato' in o.opplysning ? o.opplysning.dato : null;
      if (hale[1] === 'oppfylt') return 'oppfylt' in o.opplysning ? o.opplysning.oppfylt : null;
      if (hale[1] === 'gjelder') return 'gjelder' in o.opplysning ? o.opplysning.gjelder : null;
      if (hale[1] === 'oppgitt_av') return o.opplysning.oppgittAv;
      return o.bestridelser;
    }
    case 'handlinger':
      return handlinger(u, hale[0] as 'TE');
    case 'visning': {
      const v = visning(u, k.kjerne.regler);
      if (hale[0] === 'status') return v.status?.kode ?? null;
      if (hale[0] === 'etiketter') return v.spor[hale[1] as 'grunnlag'].etiketter;
      if (hale[0] === 'opplysning') return v.opplysninger[id(hale[1])] ?? null;
      if (hale[0] === 'merknader') return v.merknader;
      // Svar 2 22.10 i #1045: motpartens registrerte brev ved kravet i sporet.
      if (hale[0] === 'registrerte_brev') return v.spor[hale[1] as 'grunnlag'].registrerteBrev;
      // OV-U17, OV-U18: rettingen av registreringen, eller `null`.
      if (hale[0] === 'rettet')
        return v.registrerteBrev.find((b) => b.dokument === id(hale[1]))?.rettetAv ?? null;
      const rad = v.journal.find((j) => j.hendelse === hendelsenMed(id(hale[1]), u));
      return rad ? (rad.tolket ? 'tolket' : 'ikke_tolket') : null;
    }
    case 'avvist':
      return k.sist.utfall !== null && !k.sist.utfall.godtatt;
    case 'regel':
      return k.sist.utfall && !k.sist.utfall.godtatt ? k.sist.utfall.avvisning.regel : null;
    case 'nye_hendelser':
      return k.sist.nye;
  }
  throw new Forutsetning(`Ukjent sti i bevis-saken: ${sti}`);
}

/** Hendelsen med ID-en, eller hendelsen dokumentet med elementet står i. */
function hendelsenMed(id: string, u: Utledning): string {
  for (const h of u.journal) {
    if (h.id === id) return id;
    if (h.art !== 'dokument') continue;
    const d = h.dokument;
    const ider = [
      ...d.krav.map((x) => x.id),
      ...d.svar.flatMap((s) => [s.id, ...s.standpunkter.map((p) => p.id)]),
      ...d.utsagn.map((x) => x.id),
      ...d.opplysninger.map((x) => x.id),
    ];
    if (ider.includes(id)) return h.id;
  }
  return id;
}

const REGELVERSJONER: Record<string, number> = {
  n: GJELDENDE_REGLER.versjon,
  'n+1': NESTE_REGLER.versjon,
};

export function stemmer(sti: string, faktisk: unknown, forventet: unknown): boolean {
  if (sti.endsWith('regelversjon') && typeof forventet === 'string')
    forventet = REGELVERSJONER[forventet];
  if (
    forventet &&
    typeof forventet === 'object' &&
    !Array.isArray(forventet) &&
    ('inneholder' in forventet || 'mangler' in forventet)
  ) {
    const liste = (faktisk ?? []) as unknown[];
    const { inneholder = [], mangler = [] } = forventet as {
      inneholder?: unknown[];
      mangler?: unknown[];
    };
    return inneholder.every((x) => liste.includes(x)) && mangler.every((x) => !liste.includes(x));
  }
  return likeVerdier(faktisk, forventet);
}

/** Kjør prefikset og stegene, og kontroller forventningene etter hvert steg. */
export async function kjoer(
  forloep: Forloep,
  bane: Bane,
  { paastand = kastVedBrudd, kjerne = KJERNE }: { paastand?: Paastand; kjerne?: Kjerne } = {}
): Promise<Kjoering> {
  const k = new Kjoering(bane, kjerne);
  for (const h of forloep.start ? MAALMODELL.prefikser[forloep.start] : []) {
    const u = await k.send(h);
    if (u && !u.godtatt)
      throw new Forutsetning(
        `prefikset avviste ${h.handling}: ${u.avvisning.regel}: ${u.avvisning.melding}`
      );
  }
  k.sist = { utfall: null, nye: 0 };

  const sjekk = async (etter: number) => {
    for (const kontroll of forloep.kontroller.filter((x) => x.etter === etter)) {
      const hvor = `${forloep.id} etter steg ${etter} [${kontroll.kilde.join(', ')}]`;
      if (kontroll.prov) {
        const journalFor = JSON.stringify(await bane.journal());
        const u = await k.prov(kontroll.prov);
        if (JSON.stringify(await bane.journal()) !== journalFor)
          throw new Forutsetning(`${hvor}: prøven skrev til journalen`);
        const holder =
          u.godtatt === !kontroll.forventet.avvist &&
          (kontroll.forventet.regel === undefined ||
            (!u.godtatt && u.avvisning.regel === kontroll.forventet.regel));
        const melding = `${hvor}: ${kontroll.prov.handling} ga ${u.godtatt ? 'godtatt' : `${u.avvisning.regel}: ${u.avvisning.melding}`}, ventet ${JSON.stringify(kontroll.forventet)}`;
        if (kontroll.rolle === 'mal') paastand(holder, melding);
        else if (!holder) throw new Forutsetning(`kontrollsak ${melding}`);
        continue;
      }
      const u = await k.utledning();
      for (const [sti, forventet] of Object.entries(kontroll.forventet)) {
        const faktisk = k.navn.navngi(les(sti, u, k));
        const holder = stemmer(sti, faktisk, forventet);
        const melding = `${hvor}: ${sti} er ${JSON.stringify(faktisk)}, ventet ${JSON.stringify(forventet)}`;
        if (kontroll.rolle === 'mal') paastand(holder, melding);
        else if (!holder) throw new Forutsetning(`forutsetning ${melding}`);
      }
    }
  };

  await sjekk(0);
  for (const [i, h] of forloep.steg.entries()) {
    const journalFor = JSON.stringify(await bane.journal());
    const u = await k.send(h);
    if (u && !u.godtatt) {
      if (JSON.stringify(await bane.journal()) !== journalFor)
        throw new Forutsetning(`steg ${i + 1} ble avvist, men journalen endret seg`);
      const ventet = forloep.kontroller.some(
        (x) => x.etter === i + 1 && !x.prov && 'avvist' in x.forventet
      );
      if (!ventet)
        throw new Forutsetning(
          `steg ${i + 1} (${h.handling}) avvist: ${u.avvisning.regel}: ${u.avvisning.melding}`
        );
    }
    await sjekk(i + 1);
  }
  return k;
}
