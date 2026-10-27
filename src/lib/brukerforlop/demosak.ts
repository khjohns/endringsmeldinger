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
import type { hentKjernesak, Journallinje, sendKommando } from '$lib/api/kjerne';
import { vurder } from '$kjerne/kommandoer/skriving';
import type { Journalrad, Part } from '$kjerne/typer';
import { KJERNE } from '$kjerne/versjon';

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

/** Prosjektet i demoruta. Det finnes ikke på serveren, og ingenting sendes dit. */
export const DEMOPROSJEKT = 'demo';

export function lagDemosak(forloep: Startjournal, punktId: string, part: Part) {
  const punkt = forloep.kontrollpunkter.find((p) => p.id === punktId);
  if (!punkt) throw new Error(`${forloep.id} har ikke kontrollpunktet ${punktId}`);
  const rader: Journalrad[] = structuredClone(
    forloep.journal.filter((r) => r.versjon <= punkt.versjon)
  );
  const sakId = rader[0].sak_id;
  let nummer = 0;
  let klokke = Date.parse(rader.at(-1)!.tidsstempel);
  const nyId = () =>
    `${forloep.idhode}-0000-4000-8000-${(++nummer).toString(16).padStart(12, '0')}`;

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

  const hent: typeof hentKjernesak = async () => ({
    versjon: rader.at(-1)!.versjon,
    part: demosak.part,
    visning: {} as Awaited<ReturnType<typeof hentKjernesak>>['visning'],
    journal: rader.map(linje),
    leveringsoppdrag: [],
  });

  const send: typeof sendKommando = async (_sak, forventet, _kommandoId, kommando) => {
    const naa = rader.at(-1)!.versjon;
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
      },
      rader,
      KJERNE,
      new Map()
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
      event_id: utfall.hendelser[0].event_id,
      leveringsoppdrag: '',
      versjon: rader.at(-1)!.versjon,
    };
  };

  const demosak = {
    sakId,
    forloep,
    punkt,
    /** Siden brukeren handler som. Visningen lages på nytt når den byttes. */
    part,
    hent,
    send,
    /** Journalen slik kjernen har skrevet den, med demoaktørene. */
    journal: (): Journalrad[] => structuredClone(rader),
  };
  return demosak;
}

export type Demosak = ReturnType<typeof lagDemosak>;
