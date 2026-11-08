/**
 * Kommandoene til TS-kjernen i språkprøven, i minnet. Adapteren bygger
 * byggherrens svar slik klienten ville gjort det, med kjernens egne regler
 * (`beregnVederlag`, `beregnFrist`).
 *
 * Prefiksene var de samme i `docs/domenetabell/bevis-saker.json` da den ble
 * frosset som arkiv (#49). Ingen test kjører bevis-sakene mot prøvekoden.
 */

import { tilTall } from '../../kjerne/regler/beloep.ts';
import { vurderKommando, type Utfall } from '../kjerne/kommando.ts';
import { offentligTilstand, type OffentligTilstand } from '../kjerne/offentlig.ts';
import { REGELVERSJON } from '../kjerne/regelversjon.ts';
import { beregnFrist, beregnVederlag } from '../kjerne/regler.ts';
import { anvend, nySak, type Sak } from '../kjerne/sak.ts';
import { fristkrav, vederlagskrav } from '../kjerne/sammenlikning.ts';
import type { Hendelse, Kontekst, Rolle } from '../kjerne/typer.ts';

export type Handling = Record<string, unknown> & { handling: string };
/** Startpunktene testene bygger saken fra. */
export const PREFIKSER: Record<'basis' | 'godkjent_grunnlag' | 'krav_eo', Handling[]> = {
  basis: [
    { handling: 'grunnlag', underkategori: 'EO' },
    { handling: 'grunnlagssvar', resultat: 'godkjent' },
    { handling: 'vederlagskrav', belop: 100000 },
    { handling: 'fristkrav', dager: 20 },
  ],
  godkjent_grunnlag: [
    { handling: 'grunnlag', underkategori: 'EO' },
    { handling: 'grunnlagssvar', resultat: 'godkjent' },
  ],
  krav_eo: [
    { handling: 'grunnlag', underkategori: 'EO' },
    { handling: 'vederlagskrav', belop: 100000 },
    { handling: 'fristkrav', dager: 20 },
  ],
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
    hovedkrav_godkjent_belop: tilTall(r.hovedkrav_godkjent_belop!),
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
 * `tilstand()` er den offentlige tilstanden målene leses av. `prov` skal ikke
 * skrive.
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
