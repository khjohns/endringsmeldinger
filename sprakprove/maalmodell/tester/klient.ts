/**
 * Klientsiden i prøven: handlingene i bevis-sakene som kommandoer, regnet med
 * kjernen slik nettleseren gjør (B-15), og radene en annen skriver lagrer.
 * Regelsettet `n+1` er en kontrollert regelendring i prøven, ikke et vedtak.
 */

import { randomUUID } from 'node:crypto';
import type { Hendelse } from '../../kjerne/typer.ts';
import { UgyldigVurdering } from '../../kjerne/regler/feil.ts';
import type { Kommando, Svarutkast } from '../kjerne/kommando.ts';
import { GJELDENDE_REGLER, type Regelsett } from '../kjerne/regelsett.ts';
import { regnUtSvar, type Svarvurdering } from '../kjerne/standpunkt.ts';
import { forhandsvisAksept, type Utledning } from '../kjerne/utled.ts';
import type { Krav, Part, Spor } from '../kjerne/typer.ts';

export type Handling = Record<string, unknown> & { handling: string };

/** § 32.2 gjelder ikke SAMORD. Står for innsnevringen #220 kan gi; omfanget avgjøres ikke her. */
export const NESTE_REGLER: Regelsett = {
  versjon: GJELDENDE_REGLER.versjon + 1,
  gjelder32_2: (h, u) => GJELDENDE_REGLER.gjelder32_2(h, u) && u !== 'SAMORD',
};

export const REGELSETT: Record<string, Regelsett> = { n: GJELDENDE_REGLER, 'n+1': NESTE_REGLER };

/** Etikettene i bevis-sakene og ID-ene kjøringen ga dem. */
export class Navn {
  private readonly tilId = new Map<string, string>();
  private readonly tilNavn = new Map<string, string>();
  /** Etiketter en rad har vist til før hendelsen med etiketten er skrevet. */
  private readonly reservert = new Set<string>();

  sett(navn: unknown, id: string): void {
    if (typeof navn !== 'string') return;
    if (this.tilId.has(navn) && this.tilId.get(navn) !== id)
      throw new Error(`Etiketten ${navn} er allerede brukt i bevis-saken`);
    this.tilId.set(navn, id);
    this.tilNavn.set(id, navn);
    this.reservert.delete(navn);
  }

  /** `D4#sendt` blir `<ID-en til D4>#sendt`. En ukjent etikett blir en ID som ikke finnes. */
  id(navn: string): string {
    const [hode, ...hale] = navn.split('#');
    const id = this.tilId.get(hode) ?? `ukjent-${hode}-${randomUUID()}`;
    return [id, ...hale].join('#');
  }

  /**
   * ID-en til etiketten, reservert om den ikke finnes ennå, så en rad kan vise
   * til seg selv eller til en rad som skrives senere. Bare en `rad` kan ta en
   * reservert etikett (`ta`); `sett` for en annen ID feiler.
   */
  reserver(navn: string): string {
    if (!this.tilId.has(navn)) {
      const id = randomUUID();
      this.tilId.set(navn, id);
      this.tilNavn.set(id, navn);
      this.reservert.add(navn);
    }
    return this.tilId.get(navn)!;
  }

  /** ID-en en ny rad med etiketten får. Feiler når etiketten alt er brukt av en annen hendelse. */
  ta(navn: string): string {
    if (this.tilId.has(navn) && !this.reservert.has(navn))
      throw new Error(`Etiketten ${navn} er allerede brukt i bevis-saken`);
    const id = this.reserver(navn);
    this.reservert.delete(navn);
    return id;
  }

  /** Verdien med hver kjent ID erstattet av etiketten. */
  navngi(verdi: unknown): unknown {
    if (typeof verdi === 'string') {
      let ut = verdi;
      for (const [id, navn] of this.tilNavn) ut = ut.split(id).join(navn);
      return ut;
    }
    if (Array.isArray(verdi)) return verdi.map((v) => this.navngi(v));
    if (verdi && typeof verdi === 'object')
      return Object.fromEntries(Object.entries(verdi).map(([k, v]) => [k, this.navngi(v)]));
    return verdi;
  }
}

export const PART: Record<string, Part> = {
  krav: 'TE',
  aksept: 'TE',
  trekk: 'TE',
  varsel: 'TE',
  brev: 'BH',
  revisjon: 'BH',
};

function vurderinger(spor: Spor, h: Record<string, unknown>, krav: Krav | null): Svarvurdering {
  if (spor === 'grunnlag')
    return { resultat: h.resultat, grunnlag_varslet_i_tide: h.varslet_i_tide };
  if (spor === 'vederlag')
    return {
      hovedkrav_vurdering: h.vurdering,
      hovedkrav_godkjent_belop: h.godkjent_belop,
      aksepterer_metode: true,
    };
  return {
    frist_varsel_ok: h.varsel_i_tide,
    spesifisert_krav_ok: h.spesifisering_i_tide,
    vilkar_oppfylt: h.hindring,
    dager: h.dager ?? krav?.innhold.antall_dager,
  };
}

function svarutkast(
  h: Record<string, unknown>,
  u: Utledning,
  regler: Regelsett,
  navn: Navn
): Svarutkast {
  const spor = h.spor as Spor;
  const krav = u.spor[spor].gjeldendeKrav;
  const v = vurderinger(spor, h, krav);
  let resultat: Record<string, unknown> = {};
  try {
    if (krav)
      resultat = regnUtSvar(
        spor,
        v,
        { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav },
        regler
      );
  } catch (feil) {
    // Klienten sender likevel, så serveren avviser med sin begrunnelse.
    if (!(feil instanceof UgyldigVurdering)) throw feil;
  }
  return {
    spor,
    gjelder: typeof h.gjelder === 'string' ? navn.id(h.gjelder) : (krav?.id ?? 'ingen'),
    regelversjon: regler.versjon,
    vurderinger: v,
    resultat,
  };
}

function flett(a: unknown, b: unknown): unknown {
  if (!b || typeof b !== 'object' || !a || typeof a !== 'object') return b;
  const ut: Record<string, unknown> = { ...(a as Record<string, unknown>) };
  for (const [k, v] of Object.entries(b)) ut[k] = flett(ut[k], v);
  return ut;
}

const INNHOLD = {
  grunnlag: (h: Handling) => ({ hovedkategori: 'ENDRING', underkategori: h.underkategori }),
  vederlag: (h: Handling) => ({ metode: 'FASTPRIS_TILBUD', belop_direkte: h.belop }),
  frist: (h: Handling) => ({ varsel_type: 'spesifisert', antall_dager: h.dager }),
};

/** Kommandoen klienten sender for handlingen, regnet av klientens utledning `u`. */
export function kommandoFor(h: Handling, u: Utledning, regler: Regelsett, navn: Navn): Kommando {
  const spor = h.spor as Spor;
  switch (h.handling) {
    case 'krav':
      return {
        type: 'krav',
        spor,
        innhold: INNHOLD[spor](h),
        ...(typeof h.varsel_sendt === 'string' ? { varsel: { sendt: h.varsel_sendt } } : {}),
      };
    case 'brev':
      return {
        type: 'brev',
        svar: (h.svar as Handling[]).map((s) => svarutkast(s, u, regler, navn)),
      };
    case 'revisjon':
      return {
        type: 'revisjon',
        erstatter:
          typeof h.erstatter === 'string'
            ? navn.id(h.erstatter)
            : (u.spor[spor].gjeldendeSvar?.id ?? u.spor[spor].svar.at(-1)?.id ?? 'ingen'),
        svar: svarutkast(h, u, regler, navn),
      };
    case 'aksept': {
      // TE godtar svaret TE har sett: gjeldende svar, ellers det siste i sporet (KA-07).
      const svar =
        typeof h.svar === 'string'
          ? navn.id(h.svar)
          : (u.spor[spor].gjeldendeSvar?.id ?? u.spor[spor].svar.at(-1)?.id ?? 'ingen');
      const forhandsvist = forhandsvisAksept(u, svar, regler);
      return {
        type: 'aksept',
        spor,
        svar,
        regelversjon: regler.versjon,
        enighetsgrunnlag: (h.enighetsgrunnlag_endring
          ? flett(forhandsvist, h.enighetsgrunnlag_endring)
          : forhandsvist) as never,
      };
    }
    case 'trekk':
      return { type: 'trekk', spor };
    case 'varsel':
      return {
        type: 'varsel',
        spor: 'frist',
        hjemmel: '33.4',
        sendt: h.sendt as string,
        ...(Array.isArray(h.dokumentasjon) ? { dokumentasjon: h.dokumentasjon as string[] } : {}),
      };
    case 'bestridelse': {
      const varsel = u.spor.frist.varsel;
      const gjelder = h.gjelder as string;
      return {
        type: 'bestridelse',
        // `varsel#sendt` i de genererte forløpene er sendingen av det registrerte varselet.
        gjelder: gjelder.startsWith('varsel#')
          ? `${varsel?.dokument ?? 'ingen'}#sendt`
          : navn.id(gjelder),
        hva: h.hva as 'sendt' | 'mottatt',
      };
    }
    default:
      throw new Error(`Handlingen ${h.handling} er ikke en kommando`);
  }
}

/** Parten som sender handlingen. Bestridelsen har parten i bevis-saken. */
export function partFor(h: Handling): Part {
  if (h.handling === 'bestridelse') return h.part as Part;
  return PART[h.handling];
}

/**
 * En rad fra en annen skriver, for eksempel en eldre skriver i overgangen
 * (forløp E). Den har dagens form uten feltene prøven legger til, og går ikke
 * gjennom kommandovalideringen.
 */
export function radFor(
  h: Handling,
  u: Utledning,
  navn: Navn,
  felles: Pick<Hendelse, 'sak_id' | 'versjon' | 'tidsstempel' | 'aktor_id' | 'aktor_team_id'>
): Hendelse {
  // En referanse til noe som ikke finnes i saken, er en UUID som ikke finnes.
  const kjent = navn.id(h.gjelder as string);
  const gjelder = kjent.startsWith('ukjent-') ? randomUUID() : kjent;
  const type = h.type as string;
  let data: Record<string, unknown> = { begrunnelse: 'Fra en annen skriver' };
  if (type.startsWith('respons_vederlag')) {
    const krav = u.spor.vederlag.krav.find((k) => k.id === gjelder) ?? {
      id: gjelder,
      spor: 'vederlag' as const,
      dokument: gjelder,
      innhold: { belop_direkte: 100000 },
    };
    const v = vurderinger('vederlag', h, krav);
    data = {
      ...data,
      ...v,
      ...regnUtSvar(
        'vederlag',
        v,
        { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav },
        GJELDENDE_REGLER
      ),
      regelversjon: GJELDENDE_REGLER.versjon,
      vederlag_krav_id: gjelder,
    };
    if (typeof h.erstatter === 'string') data.original_respons_id = navn.reserver(h.erstatter);
  } else {
    data.frist_krav_id = gjelder;
  }
  return {
    ...felles,
    event_id: typeof h.navn === 'string' ? navn.ta(h.navn) : randomUUID(),
    event_type: type as Hendelse['event_type'],
    aktor_rolle: 'BH',
    refererer_til_event_id: gjelder,
    data,
  };
}
