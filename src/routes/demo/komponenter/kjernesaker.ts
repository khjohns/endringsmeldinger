/**
 * Sakene i showcasen for Varden (#1371): startjournalen for BF-01 ved et kontrollpunkt, med
 * `lagKjernesak` som i demoruta og `Varden.test.ts`. En feil fra serveren er et avslag fra
 * `hent` eller `send` med den feilen klienten ellers ville gitt.
 */
import { ApiError } from '$lib/api/client';
import { DEMOPROSJEKT, finnForloep, lagDemosak } from '$lib/kjernesak/demosak';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import type { Part } from '$kjerne/typer';

export const FORLOEPET = finnForloep('BF-01')!;

export type Serverfeil = 'lasting' | 'sending' | 'konflikt';

// Teksten `src/lib/api/client.ts` gir for en 500 uten JSON, og demosakens 409.
const feilkode500 = () =>
  Promise.reject(new ApiError(500, 'Serveren svarte med feilkode 500 uten forklaring.'));
const konflikt = () =>
  Promise.reject(
    new ApiError(409, 'Saken er endret siden den ble lastet.', { error: 'VERSJONSKONFLIKT' })
  );

export function aapneSak(punkt: string, part: Part, feil?: Serverfeil | null) {
  const demosak = lagDemosak(FORLOEPET, punkt, part);
  const kjernesak = lagKjernesak({
    sakId: demosak.sakId,
    prosjektId: DEMOPROSJEKT,
    part,
    hent: feil === 'lasting' ? feilkode500 : demosak.hent,
    send: feil === 'sending' ? feilkode500 : feil === 'konflikt' ? konflikt : demosak.send,
    lastOppVedlegg: demosak.lastOppVedlegg,
  });
  void kjernesak.last();
  return kjernesak;
}

/** Tilstandene for hele visningen, med kontrollpunktet i BF-01 og eventuelt en serverfeil. */
export const TILSTANDER: {
  id: string;
  navn: string;
  punkt: string;
  feil?: Serverfeil;
}[] = [
  { id: 'tom', navn: 'Tom: bare grunnlaget er sendt', punkt: 'start' },
  {
    id: 'uten-krav',
    navn: 'Grunnlaget er godkjent, ingen vederlagskrav',
    punkt: 'grunnlaget-er-godkjent',
  },
  { id: 'ubesvart', navn: 'Ubesvart vederlagskrav', punkt: 'bh-har-mottatt-vederlagskravet' },
  { id: 'besvart', navn: 'Svaret er mottatt', punkt: 'te-har-mottatt-svaret' },
  { id: 'godtatt', navn: 'Svaret er godtatt', punkt: 'te-har-godtatt-svaret' },
  {
    id: 'lastefeil',
    navn: 'Feil fra serveren ved lasting (500)',
    punkt: 'bh-har-mottatt-vederlagskravet',
    feil: 'lasting',
  },
];
