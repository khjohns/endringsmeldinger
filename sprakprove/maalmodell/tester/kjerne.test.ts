/**
 * Grensene i kjernen som bevis-sakene ikke når: formen på kommandoene, rader
 * kompatibilitetsleseren ikke skal godta, og en aksept av et standpunkt som er
 * uavklart. Hver avvisning har en kontrollsak som bare skiller seg i det ene.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Hendelse } from '../../kjerne/typer.ts';
import { forutsetninger } from '../kjerne/forutsetninger.ts';
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

describe('et standpunkt som er uavklart, kan ikke godtas (MM-U1, MM-U3)', () => {
  it('avviser aksepten av et svar uten beslutningsgrunnlag når preklusjonen er uavklart', async () => {
    const bane = minnebane();
    const k = await bygg(bane, [
      'godkjent_grunnlag',
      { handling: 'krav', spor: 'frist', dager: 20, navn: 'K-f1' },
    ]);
    // Et svar fra en eldre skriver, uten beslutningsgrunnlag: prinsipalt prekludert etter § 33.4.
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
            frist_varsel_ok: false,
            spesifisert_krav_ok: true,
            vilkar_oppfylt: true,
            beregnings_resultat: 'avslatt',
            godkjent_dager: 0,
            subsidiaer_resultat: 'godkjent',
            subsidiaer_godkjent_dager: 20,
            frist_krav_id: krav,
          },
        },
      ],
      journal.at(-1)!.versjon
    );
    const godta = { type: 'godta', spor: 'frist' } as const;
    const for_ = await k.utledning();
    expect(forutsetninger(godta, 'TE', for_)?.regel).not.toBe('RESPONSE_UNRESOLVED');

    expect(
      (await k.send({ handling: 'varsel', spor: 'frist', sendt: '2026-09-02' }))?.godtatt
    ).toBe(true);
    const u = await k.utledning();
    const svar = u.svar[u.spor.frist.gjeldendeSvar!.id];
    if (svar.avvik !== null) throw new Error('Forutsetning: svaret har beslutningsgrunnlag');
    const etter = await bane.journal();
    const aksept = await k.send({ handling: 'aksept', spor: 'frist' });
    expect(aksept?.godtatt ? 'godtatt' : aksept?.avvisning.regel).toBe('RESPONSE_UNRESOLVED');
    expect(await bane.journal()).toEqual(etter);
    expect(handlinger(u, 'TE')).not.toContain('godta:frist');
  });
});
