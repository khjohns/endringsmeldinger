/**
 * Bevis-sakene i docs/domenetabell/ som kommandoer til TS-kjernen. Samme
 * kontroller som `backend/tests/test_domenetabell/korpus.py`: forutsetninger
 * og kontrollsaker feiler med `forutsetning`, målet med `expect`, og en
 * avvisning skal la journalen stå uendret.
 *
 * Adapteren bygger byggherrens svar slik klienten ville gjort det, med kjernens
 * egne regler (`beregnVederlag`, `beregnFrist`). Python-reglene brukes ikke.
 *
 * Modulen importerer ikke Vitest, så samme kjører kan bygges for nettleseren
 * (port 2). Målet meldes gjennom `pastand`; Vitest-testene sender `expect`.
 */

import bevis from '../../docs/domenetabell/bevis-saker.json' with { type: 'json' };
import { tilTall } from '../../kjerne/regler/beloep.ts';
import { vurderKommando, type Utfall } from '../kjerne/kommando.ts';
import { RADER } from '../kjerne/kontrakt.ts';
import { offentligTilstand, type OffentligTilstand } from '../kjerne/offentlig.ts';
import { REGELVERSJON } from '../kjerne/regelversjon.ts';
import { beregnFrist, beregnVederlag } from '../kjerne/regler.ts';
import { anvend, nySak, type Sak } from '../kjerne/sak.ts';
import { fristkrav, vederlagskrav } from '../kjerne/sammenlikning.ts';
import type { Hendelse, Kontekst, Rolle } from '../kjerne/typer.ts';

export type Handling = Record<string, unknown> & { handling: string };
type Kontroll = {
  etter: number;
  rolle: 'mal' | 'forutsetning' | 'kontroll';
  forventet: Record<string, unknown>;
  prov?: Handling;
};
export type Forlop = {
  id: string;
  rader: string[];
  start: string | null;
  steg: Handling[];
  kontroller: Kontroll[];
  kjent_avvik?: { funn: string };
};

export const KORPUS = bevis as unknown as {
  prefikser: Record<string, Handling[]>;
  forlop: Forlop[];
};

/**
 * Forløpene i flyten som prøvekoden ikke er skrevet om etter: KA-U7 (09.10) avviser
 * en ny kravversjon i et spor med enighet, mens prøvekoden lar den oppheve enigheten
 * (SK-02). Kjernen i `kjerne/` bygger KA-U7 (#308); prøvekoden rettes ikke (B-14).
 * Testene kjører dem med `it.fails`, så en retting blir synlig.
 */
export const FORELDET_I_PROVEN = ['F-KA-03', 'F-KA-04', 'F-KA-05', 'F-KA-13'];

const iFlyten = (f: Forlop) => f.rader.every((r) => RADER.includes(r));
/** Forløpene der alle radene er i kontraktens flyt (`x-rader`), utenom de foreldede. */
export const FLYTEN = KORPUS.forlop.filter((f) => iFlyten(f) && !FORELDET_I_PROVEN.includes(f.id));
export const FORELDET = KORPUS.forlop.filter((f) => iFlyten(f) && FORELDET_I_PROVEN.includes(f.id));

export class Forutsetning extends Error {}

/** Et mål som ikke holder, når kjøreren går uten Vitest. */
export class Malbrudd extends Error {}

export type Pastand = (holder: boolean, melding: string) => void;

const kastVedBrudd: Pastand = (holder, melding) => {
  if (!holder) throw new Malbrudd(melding);
};

const FRISTVURDERINGER: Record<string, string> = {
  varsel_i_tide: 'frist_varsel_ok',
  spesifisering_i_tide: 'spesifisert_krav_ok',
  foresporselssvar_i_tide: 'foresporsel_svar_ok',
  hindring: 'vilkar_oppfylt',
};

function vederlagssvar(h: Handling, sak: Sak, revidert: boolean) {
  const vurderinger: Record<string, unknown> = {
    hovedkrav_vurdering: h.vurdering,
    aksepterer_metode: true,
  };
  if ('godkjent_belop' in h) vurderinger.hovedkrav_godkjent_belop = h.godkjent_belop;
  const r = beregnVederlag(vederlagskrav(sak), vurderinger);
  const data: Record<string, unknown> = {
    ...vurderinger,
    regelversjon: REGELVERSJON,
    begrunnelse: 'Vurdert',
    beregnings_resultat: r.beregnings_resultat,
    total_godkjent_belop: tilTall(r.total_godkjent_belop),
    total_krevd_belop: tilTall(r.total_krevd_belop),
    hovedkrav_godkjent_belop: tilTall(r.hovedkrav_godkjent_belop),
  };
  if (r.subsidiaer_triggers.length) data.subsidiaer_triggers = r.subsidiaer_triggers;
  if (revidert) data.original_respons_id = sak.vederlag.svar?.eventId;
  else data.vederlag_krav_id = sak.vederlag.krav?.eventId;
  return {
    event_type: revidert ? 'respons_vederlag_oppdatert' : 'respons_vederlag',
    refererer_til_event_id: sak.vederlag.krav?.eventId,
    data,
  };
}

function fristsvar(h: Handling, sak: Sak) {
  const vurderinger: Record<string, unknown> = {};
  for (const [navn, felt] of Object.entries(FRISTVURDERINGER))
    if (navn in h) vurderinger[felt] = h[navn];
  const krav = fristkrav(sak);
  const dager = (h.dager as number | undefined) ?? krav.krevd_dager;
  const r = beregnFrist(krav, { ...vurderinger, godkjent_dager: dager });
  const data: Record<string, unknown> = {
    ...vurderinger,
    regelversjon: REGELVERSJON,
    begrunnelse: 'Vurdert',
    frist_krav_id: sak.frist.krav?.eventId,
    beregnings_resultat: r.beregnings_resultat,
    godkjent_dager: r.godkjent_dager,
  };
  if (r.subsidiaer_triggers.length) data.subsidiaer_triggers = r.subsidiaer_triggers;
  if (r.subsidiaer_resultat !== null) {
    data.subsidiaer_resultat = r.subsidiaer_resultat;
    data.subsidiaer_godkjent_dager = r.subsidiaer_godkjent_dager;
  }
  return { event_type: 'respons_frist', refererer_til_event_id: sak.frist.krav?.eventId, data };
}

/** Rollen og kommandoen for handlingen `h`, som `korpus.foresporsel` i Python. */
export function kommando(h: Handling, sak: Sak): [Rolle, Record<string, unknown>] {
  switch (h.handling) {
    case 'grunnlag':
    case 'grunnlag_ny_versjon':
      return [
        'TE',
        {
          event_type: h.handling === 'grunnlag' ? 'grunnlag_opprettet' : 'grunnlag_oppdatert',
          data: {
            tittel: 'Endret fundamentering',
            hovedkategori: 'ENDRING',
            underkategori: h.underkategori,
            beskrivelse: 'Byggherren endret fundamenteringen.',
            dato_oppdaget: '2026-09-01',
          },
        },
      ];
    case 'grunnlagssvar': {
      const data: Record<string, unknown> = {
        resultat: h.resultat,
        begrunnelse: 'Vurdert',
        regelversjon: REGELVERSJON,
      };
      if ('varslet_i_tide' in h) data.grunnlag_varslet_i_tide = h.varslet_i_tide;
      return [
        'BH',
        {
          event_type: 'respons_grunnlag',
          refererer_til_event_id: sak.grunnlag.krav?.eventId,
          data,
        },
      ];
    }
    case 'vederlagskrav':
    case 'vederlagskrav_ny_versjon':
      return [
        'TE',
        {
          event_type:
            h.handling === 'vederlagskrav' ? 'vederlag_krav_sendt' : 'vederlag_krav_oppdatert',
          data: { metode: 'FASTPRIS_TILBUD', belop_direkte: h.belop, begrunnelse: 'Kostnader' },
        },
      ];
    case 'vederlagssvar':
    case 'vederlagssvar_revidert':
      return ['BH', vederlagssvar(h, sak, h.handling === 'vederlagssvar_revidert')];
    case 'fristkrav':
      return [
        'TE',
        {
          event_type: 'frist_krav_sendt',
          data: {
            varsel_type: 'spesifisert',
            begrunnelse: 'Hindret',
            antall_dager: h.dager,
            spesifisert_varsel: { dato_sendt: '2026-09-20', metode: ['epost'] },
          },
        },
      ];
    case 'fristsvar':
      return ['BH', fristsvar(h, sak)];
    case 'aksept': {
      // TE godtar svaret TE har sett: det siste i sporet (KA-07). Regelen avgjør om det er gjeldende.
      const spor = h.spor as 'grunnlag' | 'vederlag' | 'frist';
      return [
        'TE',
        {
          event_type: 'te_aksepterer_respons',
          spor,
          refererer_til_event_id: sak[spor].svar?.eventId ?? null,
          data: {},
        },
      ];
    }
    default:
      throw new Error(`Handlingen ${h.handling} er utenfor flyten i TS-kjernen`);
  }
}

/**
 * En vei kommandoene kan gå. `sak()` er saken klienten bygger kommandoene av;
 * `tilstand()` er den offentlige tilstanden målene leses av, i serverbanen
 * den gjenleste. `prov` skal ikke skrive.
 */
export interface Bane {
  sakId: string;
  journal: Hendelse[];
  sak(): Sak;
  tilstand(): OffentligTilstand;
  send(h: Handling): Utfall | Promise<Utfall>;
  prov(h: Handling): Utfall | Promise<Utfall>;
}

export interface Minnebane extends Bane {
  send(h: Handling): Utfall;
  prov(h: Handling): Utfall;
}

let lopenummer = 0;

/** Banen i minnet: kjernen alene, med kontrollerbar klokke og ID-er. */
export function minnebane(start = Date.UTC(2026, 9, 9, 8, 0, 0)): Minnebane {
  const sakId = `S-274-${++lopenummer}`;
  let klokke = start;
  let id = 0;
  const journal: Hendelse[] = [];
  let sak = nySak(sakId);
  const kontekst = (rolle: Rolle): Kontekst => ({
    sakId,
    aktorId: rolle.toLowerCase(),
    rolle,
    teamId: `team-${rolle.toLowerCase()}`,
    tidspunkt: () => new Date((klokke += 1000)),
    nyId: () => `${sakId}-h${++id}`,
  });
  const vurder = (h: Handling) => {
    const [rolle, k] = kommando(h, sak);
    return vurderKommando(sak, structuredClone(k), kontekst(rolle));
  };
  return {
    sakId,
    journal,
    sak: () => sak,
    tilstand: () => offentligTilstand(sak),
    prov: vurder,
    send(h) {
      const utfall = vurder(h);
      if (utfall.godtatt) {
        journal.push(utfall.hendelse);
        sak = anvend(sak, utfall.hendelse);
      }
      return utfall;
    },
  };
}

function lesSti(tilstand: unknown, sti: string): unknown {
  return sti.split('.').reduce<unknown>((v, del) => {
    if (v === null || typeof v !== 'object' || !(del in v))
      throw new Forutsetning(`Stien ${sti} finnes ikke i tilstanden`);
    return (v as Record<string, unknown>)[del];
  }, tilstand);
}

function stemmer(faktisk: unknown, forventet: unknown): boolean {
  if (forventet && typeof forventet === 'object' && 'ikke' in forventet)
    return faktisk !== (forventet as { ikke: unknown }).ikke;
  if (forventet && typeof forventet === 'object' && 'inneholder' in forventet) {
    return ((faktisk as unknown[]) ?? []).includes(
      (forventet as { inneholder: unknown }).inneholder
    );
  }
  return faktisk === forventet;
}

export interface Kjoring {
  pastand?: Pastand;
  /** Kalles etter prefikset (steg 0) og etter hvert steg, før kontrollene. */
  etterSteg?: (steg: number, utfall: Utfall | null) => void;
}

/** Kjør forløpet i banen og kontroller forventningene. */
export async function kjor(
  forlop: Forlop,
  bane: Bane = minnebane(),
  { pastand = kastVedBrudd, etterSteg }: Kjoring = {}
): Promise<void> {
  const prefiks = forlop.start ? KORPUS.prefikser[forlop.start] : [];
  for (const h of prefiks) {
    const u = await bane.send(h);
    if (!u.godtatt)
      throw new Forutsetning(`prefikset avviste ${h.handling}: ${u.avvisning.melding}`);
  }
  let sist: Utfall | null = null;
  const sjekk = async (etter: number) => {
    etterSteg?.(etter, sist);
    for (const k of forlop.kontroller.filter((k) => k.etter === etter)) {
      if (k.rolle === 'kontroll') {
        const u = await bane.prov(k.prov!);
        if (u.godtatt !== !k.forventet.avvist) {
          throw new Forutsetning(
            `kontrollsak etter steg ${etter}: ${k.prov!.handling} ga ${u.godtatt ? 'godtatt' : u.avvisning.melding}`
          );
        }
        continue;
      }
      const tilstand = bane.tilstand();
      for (const [sti, forventet] of Object.entries(k.forventet)) {
        let faktisk: unknown;
        if (sti === 'avvist') faktisk = sist !== null && !sist.godtatt;
        else if (sti.startsWith('lagret.')) {
          const [, type, felt] = sti.split('.');
          const h = [...bane.journal].reverse().find((h) => h.event_type === type);
          faktisk = h && felt in h.data ? h.data[felt] : 'utelatt';
        } else faktisk = lesSti(tilstand, sti);
        const melding = `${forlop.id} etter steg ${etter}: ${sti} er ${JSON.stringify(faktisk)}, ventet ${JSON.stringify(forventet)}`;
        if (k.rolle === 'forutsetning') {
          if (!stemmer(faktisk, forventet)) throw new Forutsetning(melding);
        } else {
          pastand(stemmer(faktisk, forventet), melding);
        }
      }
    }
  };
  await sjekk(0);
  for (const [i, h] of forlop.steg.entries()) {
    const for_ = bane.journal.map((h) => h.event_id).join();
    sist = await bane.send(h);
    if (!sist.godtatt) {
      if (bane.journal.map((h) => h.event_id).join() !== for_)
        throw new Forutsetning(`steg ${i + 1} ble avvist, men journalen endret seg`);
      const forventetAvvist = forlop.kontroller.some(
        (k) => k.etter === i + 1 && k.rolle !== 'kontroll' && 'avvist' in k.forventet
      );
      if (!forventetAvvist)
        throw new Forutsetning(
          `steg ${i + 1} (${h.handling}) avvist: ${sist.avvisning.regel}: ${sist.avvisning.melding}`
        );
    }
    await sjekk(i + 1);
  }
}

/**
 * Tilstanden uten ID-ene som skiller to kjøringer: saken blir «sak», og hver
 * hendelse etter `sak_opprettet` blir «h1», «h2» … i journalens rekkefølge.
 */
export function normalisert(bane: Bane, tilstand: unknown = bane.tilstand()): unknown {
  const navn = new Map<string, string>([[bane.sakId, 'sak']]);
  bane.journal
    .filter((h) => h.event_type !== 'sak_opprettet')
    .forEach((h, i) => navn.set(h.event_id, `h${i + 1}`));
  return JSON.parse(JSON.stringify(tilstand), (_n, v) =>
    typeof v === 'string' && navn.has(v) ? navn.get(v) : v
  );
}
