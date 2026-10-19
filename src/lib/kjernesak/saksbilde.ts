/**
 * Saksbildet for en TS-sak (#313, #665): det visningen trenger, lest av
 * utledningen og `visning` i kjernen. Komponentene leser bare dette, ikke
 * utledningen. Her står ingen regel, bare oppslag og tekst.
 */

import type { Leveringsoppdrag } from '$lib/api/kjerne';
import { formatDateNorwegian, formatDateTimeNorwegian } from '$lib/utils/dateFormatters';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Statuskode, Visning } from '$kjerne/utledning/visning';
import { brevtekstI } from '$kjerne/format/leser';
import { SPOR, type Avsnitt, type Journalrad, type Spor } from '$kjerne/typer';

export interface Etikett {
  kode: string;
  tekst: string;
}

export interface Sporpost {
  art: 'krav' | 'svar';
  id: string;
  /** Versjonen i journalen for brevet posten står i. */
  brev: number | null;
  /** Det gjeldende kravet eller svaret i sporet. */
  gjeldende: boolean;
  /** Kravet erstatter et tidligere krav, eller svaret et tidligere svar. */
  revidert: boolean;
  tekst: string;
}

export interface Sporbilde {
  spor: Spor;
  navn: string;
  etiketter: Etikett[];
  poster: Sporpost[];
}

/** En opplysning i brevet, med etikettene fra `visning`: hvem som oppgir den, og bestridelsene. */
export interface Opplysningspost {
  id: string;
  /** Datoen som er oppgitt sendt eller mottatt. `null` for en opplysning om endringsordre. */
  dato: string | null;
  etiketter: Etikett[];
  tekst: string;
}

export interface Journalpost {
  hendelse: string;
  versjon: number;
  tidsstempel: string;
  tittel: string;
  /** `false` når kjernen ikke har tolket hendelsen (MM-U2). */
  tolket: boolean;
  /** Hendelseskoden for en rad kjernen ikke har tolket, så den kan meldes. */
  hendelseskode: string | null;
  /**
   * Brevteksten slik den ble frosset, med det låste avsnittet og partens utdypning
   * hver for seg (B-15, LV-U2). `null` for et registrert brev.
   */
  tekst: Avsnitt[] | null;
  opplysninger: Opplysningspost[];
  oppdrag: Leveringsoppdrag[];
}

export interface Saksbilde {
  tittel: string | null;
  versjon: number;
  status: { kode: Statuskode; tekst: string };
  merknader: Etikett[];
  spor: Sporbilde[];
  journal: Journalpost[];
}

const SPORNAVN: Record<Spor, string> = {
  grunnlag: 'Grunnlag',
  vederlag: 'Vederlag',
  frist: 'Frist',
};

/** Tekstene til kodene fra `visning`. En kode uten tekst vises som seg selv. */
const TEKST: Record<string, string> = {
  trukket: 'Trukket',
  venter_paa_svar: 'Venter på svar',
  paalegg_frafalt: 'Pålegget er frafalt',
  avslaatt: 'Avslått',
  avklart: 'Avklart',
  enige: 'Enige',
  enige_betinget: 'Enige, betinget',
  oppgjort: 'Oppgjort',
  enighet_uten_virkning: 'Enighet uten virkning',
  subsidiaert: 'Subsidiært standpunkt',
  regel_endret_etter_enighet: 'Regelen er endret etter enigheten',
  regel_endret_etter_brevet: 'Regelen er endret etter brevet',
  appens_vurdering_ved_registreringen: 'Appens vurdering ved registreringen',
  svaret_gjaldt_et_annet_varsel: 'Svaret gjaldt et annet varsel',
  innsigelse_fra_TE: 'Innsigelse fra TE',
  innsigelse_fra_BH: 'Innsigelse fra BH',
  passivitet_paaberopt: 'Passivitet påberopt',
  ingen_krav: 'Ingen krav',
  varsel_ikke_registrert: 'Varsel ikke registrert',
  sendt_ifolge_TE: 'Sendt ifølge TE',
  sendt_ifolge_BH: 'Sendt ifølge BH',
  mottatt_ifolge_TE: 'Mottatt ifølge TE',
  mottatt_ifolge_BH: 'Mottatt ifølge BH',
  endringsordre_ifolge_TE: 'Endringsordre ifølge TE',
  endringsordre_ifolge_BH: 'Endringsordre ifølge BH',
  ikke_endringsordre_ifolge_TE: 'Ikke endringsordre ifølge TE',
  ikke_endringsordre_ifolge_BH: 'Ikke endringsordre ifølge BH',
  mottaksdato_mangler: 'Mottaksdatoen mangler',
  sending_bestridt: 'Sendingen er bestridt',
  mottak_bestridt: 'Mottaket er bestridt',
  endringsordre_bestridt: 'Endringsordren er bestridt',
  registrert_brev_uten_virkning: 'Et registrert brev står uten virkning',
  varsel_med_frist_utenfor_appen:
    'Saken kan ikke utledes. Et varsel med frist må sendes utenfor appen og registreres senere.',
};

export const etikett = (kode: string): Etikett => ({ kode, tekst: TEKST[kode] ?? kode });

/**
 * Leveringen av et oppdrag for TE og BH (#764): levert med tidspunktet i kvitteringen,
 * eller ikke levert ennå. Et registrert brev har ikke noe dokument fra appen og er
 * sendt utenfor appen (LV-U11). Parkering vises ikke; den er for driften.
 */
export function leveringstekst(o: Leveringsoppdrag): string {
  const navn = o.filnavn ?? o.dokumentnoekkel;
  const frosset = `frosset ${formatDateTimeNorwegian(o.opprettet)}`;
  if (o.filnavn === null) return `${navn}: ${frosset}, sendt utenfor appen`;
  return `${navn}: ${frosset}, ${o.levert ? `levert ${formatDateTimeNorwegian(o.levert)}` : 'ikke levert ennå'}`;
}

/**
 * Brevteksten i en rad kjernen har tolket. En rad den ikke har tolket, eller en tekst
 * med en annen form, vises uten tekst og velter ikke saksbildet (MM-U2).
 */
function brevtekst(rad: Journalrad, tolket: boolean): Avsnitt[] | null {
  return tolket ? brevtekstI(rad) : null;
}

function journaltittel(rad: Journalrad, tolket: boolean, tekst: Avsnitt[] | null): string {
  const ukjent = `Hendelse appen ikke forstår, fra ${rad.aktor_rolle}`;
  if (!tolket) return ukjent;
  if (rad.event_type === 'sak_opprettet') return `Saken er opprettet av ${rad.aktor_rolle}`;
  if (rad.event_type === 'dokument_registrert')
    return tekst ? `Brev fra ${rad.aktor_rolle}` : `Registrert brev fra ${rad.aktor_rolle}`;
  return ukjent;
}

function postTekst(p: Omit<Sporpost, 'tekst'>): string {
  const art = p.art === 'krav' ? 'krav' : 'svar';
  const navn = p.revidert ? `Revidert ${art}` : art === 'krav' ? 'Krav' : 'Svar';
  return `${navn}${p.brev !== null ? `, i brev ${p.brev}` : ''}${p.gjeldende ? ' (gjeldende)' : ''}`;
}

export function lagSaksbilde(
  journal: Journalrad[],
  oppdrag: Leveringsoppdrag[],
  u: Utledning,
  vist: Visning
): Saksbilde {
  const versjonFor = new Map(journal.map((r) => [r.event_id, r.versjon]));
  const brev = (id: string) => versjonFor.get(u.elementer[id]?.hendelse ?? '') ?? null;
  const tolket = new Map(vist.journal.map((j) => [j.hendelse, j.tolket]));
  const opprettet = journal.find((r) => r.event_type === 'sak_opprettet');
  const opplysningerI = (hendelse: string): Opplysningspost[] =>
    u.opplysninger
      .filter(({ opplysning: o }) => u.elementer[o.id]?.hendelse === hendelse)
      .map(({ opplysning: o }) => {
        const etiketter = (vist.opplysninger[o.id] ?? []).map(etikett);
        const dato = o.hva === 'endringsordre' ? null : o.dato;
        const tekster = etiketter.map((e) => e.tekst);
        if (dato && tekster.length) tekster[0] += ` ${formatDateNorwegian(dato)}`;
        return { id: o.id, dato, etiketter, tekst: tekster.join('. ') };
      });

  return {
    tittel: typeof opprettet?.data.sakstittel === 'string' ? opprettet.data.sakstittel : null,
    versjon: u.versjon,
    status: vist.status,
    merknader: vist.merknader.map(etikett),
    spor: SPOR.map((spor) => {
      const s = u.spor[spor];
      return {
        spor,
        navn: SPORNAVN[spor],
        etiketter: vist.spor[spor].etiketter.map(etikett),
        poster: [
          ...s.krav.map((k) => ({
            art: 'krav' as const,
            id: k.id,
            brev: brev(k.id),
            gjeldende: k.id === s.gjeldendeKrav?.id,
            revidert: k.erstatter !== null,
          })),
          ...s.svar.map((v) => ({
            art: 'svar' as const,
            id: v.id,
            brev: brev(v.id),
            gjeldende: v.id === s.gjeldendeSvar?.id,
            revidert: v.erstatter !== null,
          })),
        ]
          .sort((a, b) => (a.brev ?? 0) - (b.brev ?? 0))
          .map((p) => ({ ...p, tekst: postTekst(p) })),
      };
    }),
    journal: journal.map((r) => {
      const erTolket = tolket.get(r.event_id) ?? false;
      const tekst = brevtekst(r, erTolket);
      return {
        hendelse: r.event_id,
        versjon: r.versjon,
        tidsstempel: r.tidsstempel,
        tittel: journaltittel(r, erTolket, tekst),
        tolket: erTolket,
        hendelseskode: erTolket ? null : r.event_type,
        tekst,
        opplysninger: opplysningerI(r.event_id),
        oppdrag: oppdrag.filter((o) => o.event_id === r.event_id),
      };
    }),
  };
}
