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
import type {
  hentKjernesak,
  Journallinje,
  lastOppKjernevedlegg,
  sendKommando,
} from '$lib/api/kjerne';
import { opprettelse } from '$kjerne/kommandoer/opprettelse';
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

  const hent: typeof hentKjernesak = async () => {
    if (!rader.length) throw new ApiError(404, 'Saken finnes ikke.');
    return {
      versjon: rader.at(-1)!.versjon,
      part: demosak.part,
      visning: {} as Awaited<ReturnType<typeof hentKjernesak>>['visning'],
      journal: rader.map(linje),
      leveringsoppdrag: [],
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

  /**
   * Saken og påberopelsen i én handling (KT-U11), som grensen `SendNySak` i Varden: saken
   * skrives bare når kjernen godtar begge, så en avvisning etterlater ingen sak.
   */
  const opprett = async (nySak: {
    sakId: string;
    opprettelse: Record<string, unknown>;
    paaberopelse: Record<string, unknown>;
    tekst: string[];
  }) => {
    if (rader.length || nySak.sakId !== sakId)
      throw new ApiError(409, 'Saken er alt opprettet.', { error: 'VERSJONSKONFLIKT' });
    const opprettet = opprettelse(nySak.opprettelse, demosak.part);
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
      await send(sakId, 1, '', { ...nySak.paaberopelse, brevtekst: nySak.tekst }, DEMOPROSJEKT);
    } catch (e) {
      rader.length = 0;
      throw e;
    }
    return { sakId };
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
    lastOppVedlegg,
    /** Journalen slik kjernen har skrevet den, med demoaktørene. */
    journal: (): Journalrad[] => structuredClone(rader),
  };
  return demosak;
}

export type Demosak = ReturnType<typeof lagDemosak>;
