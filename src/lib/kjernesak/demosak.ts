/**
 * Saken i demoruta (#1330): journalen til et brukerforløp i minnet, fra startjournalen
 * ved et kontrollpunkt. `hent` og `send` har formen `lagKjernesak` tar, så saksvisningen
 * er den samme som i saksruta. Det brukeren sender, vurderes og skrives av kjernen i
 * nettleseren med demoaktøren for siden, som testkjøreren gjør; ingenting sendes.
 * Demoen beviser ikke tilgang, CSRF eller aktørstempling, som serveren har ansvaret for.
 *
 * ID-ene og tidspunktene er faste: ID-ene er nummerert i navnerommet startjournalen gir,
 * og klokka går ett minutt per hendelse fra siste rad. En omstart fra samme kontrollpunkt
 * med de samme handlingene gir derfor samme journal.
 */

import startjournaler from '../../../docs/domenetabell/brukerforlop/startjournaler.json';
import { ApiError } from '$lib/api/client';
import {
  nySakKropp,
  type hentKjernesakMedMerking,
  type Journallinje,
  type Kjernevedlegg,
  type lastOppKjernevedlegg,
  type NySakTilServeren,
  type sendKommando,
} from '$lib/api/kjerne';
import { feilINySak } from '../../../server/nysak';
import { opprettelse } from '$kjerne/kommandoer/opprettelse';
import { vurder } from '$kjerne/kommandoer/skriving';
import type { Journalrad, Part, Vedlegg } from '$kjerne/typer';
import { KJERNE } from '$kjerne/versjon';
import type { Saksmerking } from './brevtekst';

/**
 * Koden og kontraktsforkortelsen i demoen, de samme som startjournalene er skrevet med i
 * `kjerne/tester/kjoerer.ts`, så teksten i demoen er den forløpet har.
 */
export const DEMOMERKING: Saksmerking = {
  sakskode: { kode: 'koe', loepenummer: 17 },
  kontraktsforkortelse: 'K201',
};

/** Startjournalen for et forløp, som `node kjerne/tester/brukerforloep.ts --skriv` lager den. */
export interface Startjournal {
  id: string;
  tittel: string;
  brukerhistorie: string;
  aktoerer: Record<Part, { aktor_id: string; aktor_team_id: string }>;
  idhode: string;
  kontrollpunkter: {
    id: string;
    beskrivelse: string;
    versjon: number;
    forstaaelse: string[];
    neste: { part: Part; handling: string } | null;
  }[];
  journal: Journalrad[];
}

export const FORLOEP = (startjournaler as unknown as { forlop: Startjournal[] }).forlop;

export const finnForloep = (id: string): Startjournal | null =>
  FORLOEP.find((f) => f.id === id) ?? null;

/** Kommando-ID-en for opprettelsen i demoruta, som ikke sender noe og ikke prøver idempotens. */
const DEMOKOMMANDO = '00000000-0000-4000-8000-000000000000';

/** Prosjektet i demoruta. Det finnes ikke på serveren, og ingenting sendes dit. */
export const DEMOPROSJEKT = 'demo';

/** Partene og prosjektet i demoruta, med eksempelnavnene fra `/mockup/oversikt`. TS-stien har ikke navnene ennå (#1398). */
export const DEMOKONTRAKT = {
  prosjekt: 'Operatunnelen — Parsell 3',
  kontraktsform: 'Totalentreprise NS 8407',
  byggherre: 'Oslobygg KF',
  entreprenoer: 'Veidekke Entreprenør AS',
};

export function lagDemosak(forloep: Startjournal, punktId: string, part: Part) {
  const punkt = forloep.kontrollpunkter.find((p) => p.id === punktId);
  if (!punkt) throw new Error(`${forloep.id} har ikke kontrollpunktet ${punktId}`);
  const rader: Journalrad[] = structuredClone(
    forloep.journal.filter((r) => r.versjon <= punkt.versjon)
  );
  // Et forløp som oppretter saken (BF-05), starter uten rader; saken får ID-en og
  // tidspunktet fra startjournalen.
  const sakId = forloep.journal[0].sak_id;
  let nummer = 0;
  let klokke = rader.length
    ? Date.parse(rader.at(-1)!.tidsstempel)
    : Date.parse(forloep.journal[0].tidsstempel) - 60_000;
  const nyId = () =>
    `${forloep.idhode}-0000-4000-8000-${(++nummer).toString(16).padStart(12, '0')}`;

  // Vedleggene til den nye saken, som mellomlageret på serveren. Kjernen slår dem opp.
  const mellomlager = new Map<string, Vedlegg>();

  const linje = ({
    event_id,
    versjon,
    event_type,
    tidsstempel,
    aktor_rolle,
    format,
    data,
  }: Journalrad): Journallinje => ({
    event_id,
    versjon,
    event_type,
    tidsstempel,
    aktor_rolle,
    format,
    data,
  });

  const hent: typeof hentKjernesakMedMerking = async () => {
    if (!rader.length) throw new ApiError(404, 'Saken finnes ikke.');
    return {
      versjon: rader.at(-1)!.versjon,
      part: demosak.part,
      visning: {} as Awaited<ReturnType<typeof hentKjernesakMedMerking>>['visning'],
      journal: rader.map(linje),
      leveringsoppdrag: [],
      merking: DEMOMERKING,
    };
  };

  const send: typeof sendKommando = async (_sak, forventet, _kommandoId, kommando) => {
    const naa = rader.at(-1)?.versjon ?? 0;
    if (naa !== forventet)
      throw new ApiError(409, 'Saken er endret siden den ble lastet.', {
        error: 'VERSJONSKONFLIKT',
      });
    const { aktor_id, aktor_team_id } = forloep.aktoerer[demosak.part];
    const utfall = vurder(
      kommando,
      {
        sakId,
        aktoerId: aktor_id,
        part: demosak.part,
        teamId: aktor_team_id,
        tidspunkt: () => new Date((klokke += 60_000)),
        nyId,
        ...DEMOMERKING,
      },
      rader,
      KJERNE,
      mellomlager
    );
    if (!utfall.godtatt)
      // Samme form som regelavvisningen fra TS-serveren (`server/app.ts`).
      throw new ApiError(400, utfall.avvisning.melding, {
        success: false,
        error: utfall.feil,
        rule: utfall.avvisning.regel,
        message: utfall.avvisning.melding,
      });
    utfall.hendelser.forEach((h, i) => rader.push({ ...h, versjon: naa + i + 1 }));
    return {
      event_id: utfall.hendelser.at(-1)!.event_id,
      leveringsoppdrag: '',
      versjon: rader.at(-1)!.versjon,
    };
  };

  /**
   * Saken og påberopelsen i én handling (KT-U11), som grensen `SendNySak` i Varden: saken
   * skrives bare når kjernen godtar begge, så en avvisning etterlater ingen sak. Kroppen er
   * den `sendNySak` sender, prøvd med serverens kontroll (#1526 punkt 3).
   */
  const opprett = async (nySak: NySakTilServeren) => {
    if (rader.length || nySak.sakId !== sakId)
      throw new ApiError(409, 'Saken er alt opprettet.', { error: 'VERSJONSKONFLIKT' });
    const kropp = nySakKropp(nySak, DEMOKOMMANDO);
    const feil = feilINySak(kropp);
    if (feil)
      // Samme form som `ugyldig` i `server/inngang.ts`.
      throw new ApiError(400, feil, {
        success: false,
        error: 'UGYLDIG_FORESPOERSEL',
        message: feil,
      });
    const opprettet = opprettelse({ type: 'opprett_sak', sakstittel: kropp.tittel }, demosak.part);
    if (!opprettet.godtatt)
      throw new ApiError(400, opprettet.avvisning.melding, {
        success: false,
        error: opprettet.feil,
        rule: opprettet.avvisning.regel,
        message: opprettet.avvisning.melding,
      });
    const { aktor_id, aktor_team_id } = forloep.aktoerer[demosak.part];
    rader.push({
      event_id: nyId(),
      sak_id: sakId,
      event_type: 'sak_opprettet',
      versjon: 1,
      tidsstempel: new Date((klokke += 60_000)).toISOString(),
      aktor_id,
      aktor_rolle: demosak.part,
      aktor_team_id,
      refererer_til_event_id: null,
      format: opprettet.format,
      data: opprettet.data,
    });
    try {
      const { paaberopelse, brevtekst } = kropp;
      await send(sakId, 1, '', { ...paaberopelse, brevtekst }, DEMOPROSJEKT);
    } catch (e) {
      rader.length = 0;
      throw e;
    }
    return { sakId };
  };

  /** Grensen for vedleggene til den nye saken, som `lastOppVedleggForNySak`. Ingenting sendes. */
  const vedleggForNySak = {
    async lastOpp(fil: File): Promise<Kjernevedlegg> {
      const sum = await crypto.subtle.digest('SHA-256', await fil.arrayBuffer());
      const vedlegg = {
        vedlegg_id: crypto.randomUUID(),
        filnavn: fil.name,
        innhold_sha256: [...new Uint8Array(sum)]
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(''),
        stoerrelse: fil.size,
      };
      const { vedlegg_id, filnavn, innhold_sha256 } = vedlegg;
      mellomlager.set(vedlegg_id, { vedlegg_id, filnavn, innhold_sha256 });
      return vedlegg;
    },
    async slett(vedleggId: string) {
      mellomlager.delete(vedleggId);
    },
  };

  // Vedlegget ville blitt lastet opp til serveren, og demoruta sender ingenting.
  const lastOppVedlegg: typeof lastOppKjernevedlegg = async () => {
    throw new ApiError(400, 'Vedlegg kan ikke lastes opp i demoen, som ikke sender noe.');
  };

  const demosak = {
    sakId,
    forloep,
    punkt,
    /** Siden brukeren handler som. Visningen lages på nytt når den byttes. */
    part,
    hent,
    send,
    opprett,
    vedleggForNySak,
    lastOppVedlegg,
    /** Journalen slik kjernen har skrevet den, med demoaktørene. */
    journal: (): Journalrad[] => structuredClone(rader),
  };
  return demosak;
}

export type Demosak = ReturnType<typeof lagDemosak>;
