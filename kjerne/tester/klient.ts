/**
 * Klientsiden i prøven: handlingene i bevis-sakene som kommandoer, regnet med
 * kjernen slik nettleseren gjør (B-15), og radene en annen skriver lagrer.
 * Regelsettet `n+1` er en kontrollert regelendring i prøven, ikke et vedtak.
 */

import { randomUUID } from 'node:crypto';
import type { Journalrad } from '../typer.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import type { Kommando, Svarutkast } from '../kommandoer/kommando.ts';
import { GJELDENDE_REGLER, type Regelsett } from '../regler/regelsett.ts';
import { regnUtSvar, type Svarvurdering } from '../frosset/standpunkt.ts';
import type { Utledning } from '../utledning/utled.ts';
import type { Krav, Part, Spor } from '../typer.ts';

export type Handling = Record<string, unknown> & { handling: string };

/** § 32.2 gjelder ikke `samordning`. Står for innsnevringen #220 kan gi; omfanget avgjøres ikke her. */
export const NESTE_REGLER: Regelsett = {
  versjon: GJELDENDE_REGLER.versjon + 1,
  gjelderVarslingsplikten: (h, u) =>
    GJELDENDE_REGLER.gjelderVarslingsplikten(h, u) && u !== 'samordning',
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
      throw new Error(
        this.reservert.has(navn)
          ? `Etiketten ${navn} er reservert av en rad og må skrives av en rad`
          : `Etiketten ${navn} er allerede brukt i bevis-saken`
      );
    this.tilId.set(navn, id);
    this.tilNavn.set(id, navn);
    this.reservert.delete(navn);
  }

  /** ID-en til etiketten. En ukjent etikett blir en ID som ikke finnes. */
  id(navn: string): string {
    return this.tilId.get(navn) ?? `ukjent-${navn}-${randomUUID()}`;
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
  ingen_krav: 'TE',
  passivitet: 'TE',
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
    dager: h.dager ?? krav?.innhold.dager,
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

const INNHOLD = {
  grunnlag: (h: Handling) => ({
    hovedkategori: h.hovedkategori ?? 'endring',
    underkategori: h.underkategori,
  }),
  vederlag: (h: Handling) => ({ metode: 'tilbud', beloep: h.belop }),
  frist: (h: Handling) => ({ dager: h.dager }),
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
      return { type: 'aksept', spor, svar, regelversjon: regler.versjon };
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
      const sendt = u.opplysninger.find(
        (o) => o.opplysning.dokument === varsel?.dokument && o.opplysning.hva === 'sendt'
      );
      return {
        type: 'bestridelse',
        // `varsel#sendt` i de genererte forløpene er sendingen av det registrerte varselet.
        gjelder: gjelder.startsWith('varsel#')
          ? (sendt?.opplysning.id ?? 'ingen')
          : navn.id(gjelder),
        hva: h.hva as 'sendt' | 'mottatt',
      };
    }
    case 'ingen_krav':
      return { type: 'ingen_krav', spor: h.spor as 'vederlag' };
    case 'innsigelse':
    case 'protest':
    case 'passivitet':
    case 'avklaring':
      return { type: h.handling, gjelder: navn.id(h.gjelder as string) };
    case 'merking':
      return { type: 'merking', gjelder: navn.id(h.gjelder as string), spor: h.sporene as Spor[] };
    default:
      throw new Error(`Handlingen ${h.handling} er ikke en kommando`);
  }
}

/** Parten som sender handlingen. En handling begge parter kan sende, har parten i bevis-saken. */
export function partFor(h: Handling): Part {
  return PART[h.handling] ?? (h.part as Part);
}

/**
 * En rad fra en annen skriver i format 1, for eksempel en eldre TS-versjon
 * (forløp E). Den går ikke gjennom kommandovalideringen, så relasjonene er
 * de bevis-saken oppgir. En `rad` med `art` er et utsagn, ellers et svar. Raden
 * er fra byggherren uten `part`, og `format` gir den et annet format. Beslutningsgrunnlaget
 * fryses av kjøreren (`frysBrev`).
 */
export function radFor(
  h: Handling,
  u: Utledning,
  navn: Navn,
  felles: Pick<Journalrad, 'sak_id' | 'versjon' | 'tidsstempel' | 'aktor_id' | 'aktor_team_id'>
): Journalrad {
  // En referanse til noe som ikke finnes i saken, er en UUID som ikke finnes.
  const ref = (etikett: string) => {
    const kjent = navn.id(etikett);
    return kjent.startsWith('ukjent-') ? randomUUID() : kjent;
  };
  let data: Record<string, unknown>;
  let eventId = typeof h.dokument === 'string' ? navn.ta(h.dokument) : randomUUID();
  if (typeof h.avklarer === 'string') {
    // MM-U12: en senere avklaring av om et registrert brev var en endringsordre (§ 31.3).
    eventId = navn.ta(h.navn as string);
    data = {
      opplysninger: [
        { id: randomUUID(), hva: 'endringsordre', oppfylt: h.oppfylt, gjelder: ref(h.avklarer) },
      ],
    };
  } else if (typeof h.art === 'string') {
    eventId = navn.ta(h.navn as string);
    data = {
      utsagn: [
        {
          id: randomUUID(),
          art: h.art,
          ...(typeof h.gjelder === 'string' ? { gjelder: ref(h.gjelder) } : {}),
          ...(typeof h.spor === 'string' ? { spor: h.spor } : {}),
          ...(h.art === 'aksept' ? { regelversjon: GJELDENDE_REGLER.versjon } : {}),
        },
      ],
    };
  } else if (h.krav === true) {
    // En kravversjon fra TE, for eksempel registrert korrespondanse (MM-U18).
    const spor = h.spor as Spor;
    const forrige = u.spor[spor].gjeldendeKrav;
    data = {
      krav: [
        {
          id: navn.ta(h.navn as string),
          spor,
          ...(forrige ? { erstatter: forrige.id } : {}),
          ...INNHOLD[spor](h),
        },
      ],
    };
  } else {
    const spor = h.spor as Spor;
    const gjelder = ref(h.gjelder as string);
    const krav = u.spor[spor].krav.find((k) => k.id === gjelder) ?? {
      id: gjelder,
      spor,
      dokument: gjelder,
      erstatter: null,
      innhold: spor === 'vederlag' ? { beloep: 100000 } : { dager: 20 },
    };
    const v = vurderinger(spor, h, krav);
    const standpunkter: Record<string, unknown>[] = [];
    if (spor === 'grunnlag' && typeof h.varslet_i_tide === 'boolean')
      standpunkter.push({
        id: randomUUID(),
        art: 'rettidighet',
        gjelder,
        hjemmel: '32.2',
        i_tide: h.varslet_i_tide,
      });
    standpunkter.push(
      spor === 'grunnlag'
        ? { id: randomUUID(), art: 'grunnlag', resultat: h.resultat }
        : { id: randomUUID(), art: spor === 'vederlag' ? 'beloep' : 'dager' }
    );
    const svar: Record<string, unknown> = {
      id: navn.ta(h.navn as string),
      spor,
      gjelder,
      ...(typeof h.erstatter === 'string' ? { erstatter: navn.reserver(h.erstatter) } : {}),
      // #342: grunnlagsversjonen svaret er regnet mot; bevis-saken kan oppgi en annen.
      ...(spor === 'grunnlag'
        ? {}
        : {
            grunnlagskrav:
              typeof h.grunnlagskrav === 'string'
                ? ref(h.grunnlagskrav)
                : (u.spor.grunnlag.gjeldendeKrav?.id ?? randomUUID()),
          }),
      standpunkter,
    };
    if (spor !== 'grunnlag')
      svar.utregning = regnUtSvar(
        spor,
        v,
        { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav },
        GJELDENDE_REGLER
      );
    data = { svar: [svar] };
  }
  // Registrert korrespondanse: sendt utenfor appen, om § 31.3 er oppfylt, og en
  // merking etter KA-U20 med sporene den gjelder.
  if (typeof h.sendt === 'string')
    data.opplysninger = [
      { id: randomUUID(), hva: 'sendt', dato: h.sendt },
      ...(typeof h.endringsordre === 'boolean'
        ? [{ id: randomUUID(), hva: 'endringsordre', oppfylt: h.endringsordre }]
        : []),
      ...(Array.isArray(h.merking)
        ? [{ id: randomUUID(), hva: 'kan_ikke_uttrykkes', spor: h.merking }]
        : []),
    ];
  return {
    ...felles,
    event_id: eventId,
    event_type: 'dokument_registrert',
    aktor_rolle: h.part === 'TE' ? 'TE' : 'BH',
    refererer_til_event_id: null,
    format: typeof h.format === 'number' ? h.format : 1,
    data,
  };
}
