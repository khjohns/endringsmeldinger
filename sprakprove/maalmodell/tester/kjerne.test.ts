/**
 * Grensene i kjernen som bevis-sakene ikke når: formen på kommandoene, rader
 * kompatibilitetsleseren ikke skal godta, og en aksept av et standpunkt som er
 * uavklart. Hver avvisning har en kontrollsak som bare skiller seg i det ene.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Hendelse } from '../../kjerne/typer.ts';
import { handlinger } from '../kjerne/handlinger.ts';
import { formfeil } from '../kjerne/kommando.ts';
import { lesJournal } from '../kjerne/leser.ts';
import { minnebane } from './bane.ts';
import { bygg } from './baner.ts';

describe('formen på kravet', () => {
  const krav = (innhold: Record<string, unknown>, ekstra: Record<string, unknown> = {}) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'FASTPRIS_TILBUD', belop_direkte: 1000, ...innhold },
    ...ekstra,
  });

  it('godtar et krav med feltene kravhendelsen har', () => {
    expect(formfeil(krav({}))).toEqual([]);
  });

  it.each(['hendelsesformat', 'dokument_id', 'beslutningsgrunnlag', 'enighetsgrunnlag'])(
    'avviser %s i innholdet, som bare serveren setter',
    (felt) => {
      expect(formfeil(krav({ [felt]: 99 }))).toEqual([`$.innhold.${felt}: ukjent felt`]);
    }
  );

  it('avviser et varsel etter § 33.4 i et krav utenfor fristen', () => {
    expect(formfeil(krav({}, { varsel: { sendt: '2026-09-02' } }))).not.toEqual([]);
    expect(
      formfeil({
        type: 'krav',
        spor: 'frist',
        innhold: { varsel_type: 'spesifisert', antall_dager: 20 },
        varsel: { sendt: '2026-09-02' },
      })
    ).toEqual([]);
  });
});

describe('kompatibilitetsleseren', () => {
  const rad = (
    event_type: string,
    data: Record<string, unknown>,
    ref: string | null = null
  ): Hendelse => ({
    event_id: randomUUID(),
    sak_id: 'S',
    event_type: event_type as Hendelse['event_type'],
    versjon: 2,
    tidsstempel: '2026-10-09T08:00:00Z',
    aktor_id: 'te',
    aktor_rolle: 'TE',
    aktor_team_id: null,
    refererer_til_event_id: ref,
    data,
  });
  const art = (h: Hendelse) => lesJournal([h], 1)[0].art;
  const fristkrav = { varsel_type: 'spesifisert', antall_dager: 20 };

  it.each([
    [
      'et varsel i kravet uten sendedato',
      rad('frist_krav_sendt', { ...fristkrav, frist_varsel: {} }),
    ],
    ['et registrert varsel uten sendedato', rad('frist_varsel_registrert', { hjemmel: '33.4' })],
    [
      'en aksept med tomt enighetsgrunnlag',
      rad('te_aksepterer_respons', { spor: 'frist', enighetsgrunnlag: null }, randomUUID()),
    ],
  ])('forstår ikke %s', (_hva, h) => {
    expect(art(h)).toBe('ukjent');
  });

  it.each([
    [
      'et varsel i kravet med sendedato',
      rad('frist_krav_sendt', { ...fristkrav, frist_varsel: { dato_sendt: '2026-09-02' } }),
    ],
    [
      'et registrert varsel med sendedato',
      rad('frist_varsel_registrert', { hjemmel: '33.4', sendt: '2026-09-02' }),
    ],
    [
      'en aksept uten enighetsgrunnlag',
      rad('te_aksepterer_respons', { spor: 'frist' }, randomUUID()),
    ],
  ])('kontrollsak: forstår %s', (_hva, h) => {
    expect(art(h)).toBe('dokument');
  });
});

/** Et fristsvar fra en eldre skriver, uten beslutningsgrunnlag: 15 av 20 dager. */
async function medEldreFristsvar() {
  const bane = minnebane();
  const k = await bygg(bane, [
    'godkjent_grunnlag',
    { handling: 'krav', spor: 'frist', dager: 20, navn: 'K-f1' },
  ]);
  const journal = await bane.journal();
  const krav = k.navn.id('K-f1');
  await bane.skriv(
    [
      {
        ...journal.at(-1)!,
        event_id: randomUUID(),
        event_type: 'respons_frist',
        versjon: journal.at(-1)!.versjon + 1,
        aktor_rolle: 'BH',
        refererer_til_event_id: krav,
        data: {
          frist_varsel_ok: true,
          spesifisert_krav_ok: true,
          vilkar_oppfylt: true,
          beregnings_resultat: 'delvis_godkjent',
          godkjent_dager: 15,
          frist_krav_id: krav,
        },
      },
    ],
    journal.at(-1)!.versjon
  );
  return { bane, k };
}

describe('MM-U6: et svar uten lagret beslutningsgrunnlag kan ikke godtas', () => {
  it('avviser aksepten og tilbyr den ikke, og journalen er uendret', async () => {
    const { bane, k } = await medEldreFristsvar();
    const u = await k.utledning();
    if (u.svar[u.spor.frist.gjeldendeSvar!.id].avvik !== null)
      throw new Error('Forutsetning: svaret har beslutningsgrunnlag');
    const for_ = await bane.journal();
    const aksept = await k.send({ handling: 'aksept', spor: 'frist' });
    expect(aksept?.godtatt ? 'godtatt' : aksept?.avvisning.regel).toBe('DECISION_BASIS_MISSING');
    expect(await bane.journal()).toEqual(for_);
    expect(handlinger(u, 'TE')).not.toContain('godta:frist');
    expect(handlinger(u, 'BH')).toContain('revidere:frist');
  });

  it('kontrollsak: etter byggherrens revisjon har svaret beslutningsgrunnlag og kan godtas', async () => {
    const { k } = await medEldreFristsvar();
    const revisjon = {
      handling: 'revisjon',
      spor: 'frist',
      varsel_i_tide: true,
      spesifisering_i_tide: true,
      hindring: true,
      dager: 15,
    };
    expect((await k.send(revisjon))?.godtatt).toBe(true);
    const aksept = await k.send({ handling: 'aksept', spor: 'frist' });
    expect(aksept?.godtatt ? 'godtatt' : aksept?.avvisning.regel).toBe('godtatt');
    expect((await k.utledning()).spor.frist.enighet?.grunnlag.utfall.dager).toBe(15);
  });
});

describe('fristsvaret uten fremdriftshindring (§ 33.1; B-13, vedtaket 05.10, #211)', () => {
  const svar = (hindring: boolean) => ({
    handling: 'brev',
    svar: [
      {
        spor: 'frist',
        navn: 'S-f1',
        varsel_i_tide: true,
        spesifisering_i_tide: true,
        hindring,
        dager: 20,
      },
    ],
  });

  it('avslår prinsipalt, med dagene som subsidiært standpunkt, og en aksept gir 0 dager', async () => {
    const k = await bygg(minnebane(), [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20 },
      svar(false),
    ]);
    const s = (await k.utledning()).svar[k.navn.id('S-f1')];
    expect(s.svar.utregning.beregnings_resultat).toBe('avslatt');
    expect(s.standpunkter.map((p) => [p.art, p.virkning])).toEqual([
      ['rettidighet', 'uten_virkning'],
      ['hindring', 'hovedgrunn'],
      ['dager', 'subsidiaer'],
    ]);
    expect(s.svar.beslutningsgrunnlag?.linje).toBe(
      'Prinsipalt avslått uten fremdriftshindring (§ 33.1), subsidiært godkjent med 20 dager.'
    );
    expect((await k.send({ handling: 'aksept', spor: 'frist' }))?.godtatt).toBe(true);
    expect((await k.utledning()).spor.frist.enighet?.grunnlag.utfall.dager).toBe(0);
  });

  it('kontrollsak: med fremdriftshindring er de 20 dagene enighet ved sammenfall', async () => {
    const k = await bygg(minnebane(), [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20 },
      svar(true),
    ]);
    const u = await k.utledning();
    expect(u.spor.frist.enighet?.grunnlag.kilde).toBe('sammenfall');
    expect(u.spor.frist.enighet?.grunnlag.utfall.dager).toBe(20);
  });
});

describe('en vurdering prøven ikke har et utsagn for, avvises', () => {
  it.each([
    ['frist', { spor: 'frist', varsel_i_tide: true, spesifisering_i_tide: false, hindring: true }],
  ])('%s: reduksjon etter § 33.6.1', async (_spor, s) => {
    const k = await bygg(minnebane(), [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20 },
    ]);
    const u = await k.prov({ handling: 'brev', svar: [s] });
    expect(u.godtatt ? 'godtatt' : u.avvisning.regel).toBe('ASSESSMENT_UNSUPPORTED');
    // Kontrollsak: samme svar med spesifiseringen i tide.
    const ok = await k.prov({ handling: 'brev', svar: [{ ...s, spesifisering_i_tide: true }] });
    expect(ok.godtatt).toBe(true);
  });

  it('en lagret rad med en slik vurdering leses som ikke forstått', () => {
    const rad = (spesifisert: boolean): Hendelse => ({
      event_id: randomUUID(),
      sak_id: 'S',
      event_type: 'respons_frist',
      versjon: 2,
      tidsstempel: '2026-10-09T08:00:00Z',
      aktor_id: 'bh',
      aktor_rolle: 'BH',
      aktor_team_id: null,
      refererer_til_event_id: 'K',
      data: {
        spesifisert_krav_ok: spesifisert,
        vilkar_oppfylt: true,
        beregnings_resultat: 'godkjent',
        godkjent_dager: 20,
      },
    });
    expect(lesJournal([rad(false)], 1)[0].art).toBe('ukjent');
    expect(lesJournal([rad(true)], 1)[0].art).toBe('dokument');
  });
});

describe('aksept av et grunnlag byggherren har avklart, avvises (GR-U8, GR-U9)', () => {
  const grunnlag = (resultat: string) => ({
    handling: 'brev',
    svar: [{ spor: 'grunnlag', resultat, varslet_i_tide: true }],
  });

  // To vedtak med hver sin begrunnelse og regelkode: partene er alt enige (GR-U8), og
  // frafall er ikke enighet (GR-U9).
  it.each([
    ['godkjent og låst (GR-U2, GR-U8)', 'godkjent', 'NOT_ALREADY_ACCEPTED'],
    ['frafalt (GR-U3, GR-U9)', 'frafalt', 'WAIVER_NOT_ACCEPTABLE'],
  ])('%s', async (_hva, resultat, regel) => {
    const k = await bygg(minnebane(), ['krav_irreg', grunnlag(resultat)]);
    const u = await k.prov({ handling: 'aksept', spor: 'grunnlag' });
    expect(u.godtatt ? 'godtatt' : u.avvisning.regel).toBe(regel);
    expect(handlinger(await k.utledning(), 'TE')).not.toContain('godta:grunnlag');
  });

  it('kontrollsak: et avslag på grunnlaget kan godtas', async () => {
    const k = await bygg(minnebane(), ['krav_irreg', grunnlag('avslatt')]);
    expect((await k.prov({ handling: 'aksept', spor: 'grunnlag' })).godtatt).toBe(true);
  });
});
