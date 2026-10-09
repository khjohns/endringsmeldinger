/**
 * Karakteriserer dagens atferd i språkprøvens kjerne for forløpene i
 * modellforslaget (#300). Skriptet viser hva kjernen gjør i dag, ikke hva
 * modellen skal gjøre, og forventningene er ikke tester. Historisk bevis,
 * kjørt mot commit 32ff911.
 *
 *   node docs/vedlegg/maalmodell-2026-10-09/kontroll.ts
 */

import { forstebrudd } from '../../../sprakprove/kjerne/forretningsregler.ts';
import {
  erEnighet,
  erOppgjort,
  gjeldendeSvar,
  projiser,
  samletStatus,
  sporstatus,
  UkjentHendelse,
} from '../../../sprakprove/kjerne/sak.ts';
import type { Hendelse, Hendelsestype, Rolle } from '../../../sprakprove/kjerne/typer.ts';

const hendelse = (
  id: string,
  type: string,
  rolle: Rolle,
  data: Record<string, unknown>,
  ref: string | null = null
): Hendelse => ({
  event_id: id,
  sak_id: 's',
  event_type: type as Hendelsestype,
  versjon: 0,
  tidsstempel: '2026-10-09T00:00:00Z',
  aktor_id: 'a',
  aktor_rolle: rolle,
  aktor_team_id: 't',
  refererer_til_event_id: ref,
  data,
});

const grunnlag = (underkategori: string) =>
  hendelse('g1', 'grunnlag_opprettet', 'TE', { hovedkategori: 'ENDRING', underkategori });
const vederlag = (id: string, belop: number, type = 'vederlag_krav_sendt') =>
  hendelse(id, type, 'TE', { metode: 'REGNINGSARBEID', kostnads_overslag: belop });

// Forløp A (GR-U7): enighet om beløp mens grunnlaget er avslått.
{
  const sak = projiser('s', [
    grunnlag('IRREG'),
    vederlag('v1', 100000),
    hendelse(
      'sg',
      'respons_grunnlag',
      'BH',
      { resultat: 'avslatt', grunnlag_varslet_i_tide: true },
      'g1'
    ),
    hendelse('sv', 'respons_vederlag', 'BH', { beregnings_resultat: 'delvis_godkjent' }, 'v1'),
    hendelse('av', 'te_aksepterer_respons', 'TE', { spor: 'vederlag' }, 'sv'),
  ]);
  console.log(
    'A  vederlag:',
    sporstatus(sak, 'vederlag'),
    '| enighet:',
    erEnighet(sak, 'vederlag'),
    '| oppgjort:',
    erOppgjort(sak, 'vederlag'),
    '| sak:',
    samletStatus(sak)
  );
}

// Forløp A (#298): et fullt godkjent svar stoppes ikke av RESPONSE_ACCEPTED.
{
  const sak = projiser('s', [
    grunnlag('IRREG'),
    vederlag('v1', 100000),
    hendelse('sv', 'respons_vederlag', 'BH', { beregnings_resultat: 'godkjent' }, 'v1'),
  ]);
  const revisjon = hendelse(
    'r',
    'respons_vederlag_oppdatert',
    'BH',
    { original_respons_id: 'sv', vederlag_krav_id: 'v1', beregnings_resultat: 'delvis_godkjent' },
    'v1'
  );
  console.log(
    'A  revisjon av fullt godkjent svar, første brudd:',
    forstebrudd(revisjon, sak)?.regel
  );
}

// Forløp B (SK-04): frafall gir grunnlaget status `trukket`.
{
  const sak = projiser('s', [
    grunnlag('IRREG'),
    hendelse(
      'sg',
      'respons_grunnlag',
      'BH',
      { resultat: 'frafalt', grunnlag_varslet_i_tide: true },
      'g1'
    ),
  ]);
  console.log('B  grunnlag etter frafall:', sporstatus(sak, 'grunnlag'));
}

// Forløp C: samme godtatte svar, prinsipalt prekludert og subsidiært godkjent,
// med og uten § 32.2. EO står for en kategori regelen ikke omfatter.
for (const underkategori of ['IRREG', 'EO']) {
  const sak = projiser('s', [
    grunnlag(underkategori),
    hendelse(
      'sg',
      'respons_grunnlag',
      'BH',
      { resultat: 'godkjent', grunnlag_varslet_i_tide: false },
      'g1'
    ),
    hendelse('ag', 'te_aksepterer_respons', 'TE', { spor: 'grunnlag' }, 'sg'),
  ]);
  console.log(
    `C  ${underkategori}: grunnlag:`,
    sporstatus(sak, 'grunnlag'),
    '| sak:',
    samletStatus(sak)
  );
}

// Forløp E (SP-04): et svar som viser til versjon 1, lagret etter versjon 2.
{
  const journal = [
    grunnlag('EO'),
    vederlag('v1', 100000),
    vederlag('v2', 120000, 'vederlag_krav_oppdatert'),
    hendelse(
      's1',
      'respons_vederlag',
      'BH',
      { vederlag_krav_id: 'v1', beregnings_resultat: 'delvis_godkjent' },
      'v1'
    ),
  ];
  const sak = projiser('s', journal);
  const aksept = hendelse('a1', 'te_aksepterer_respons', 'TE', { spor: 'vederlag' }, 's1');
  console.log(
    'E  svaret knyttet til:',
    sak.vederlag.svar?.kravId,
    '| gjeldende svar:',
    gjeldendeSvar(sak.vederlag)?.eventId,
    '| aksept:',
    forstebrudd(aksept, sak)?.regel ?? 'godtas'
  );

  // B-10: en hendelse kjernen ikke kjenner.
  try {
    projiser('s', [...journal, hendelse('x', 'frist_foresporsel_sendt', 'BH', {})]);
    console.log('E  ukjent hendelse: hoppet over');
  } catch (feil) {
    console.log('E  ukjent hendelse: UkjentHendelse =', feil instanceof UkjentHendelse);
  }
}
