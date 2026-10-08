/**
 * Kontrakten for flyten (KT-U1, KT-U2) mot TS-kjernen: skjemaet, enumene,
 * radene og tilstanden i korpuset, den strenge aksepten, de tolerante
 * kommandoene og serverfeltene. Samme forventninger som
 * `test_kontrakt.py` og `test_kontrakt_aksept.py` i Python.
 */

import { describe, expect, it } from 'vitest';
import skjema from '../../docs/domenetabell/kontrakt.json' with { type: 'json' };
import { vurderKommando } from '../kjerne/kommando.ts';
import { ukjenteNokkelord, valider } from '../kjerne/kontrakt.ts';
import { offentligTilstand } from '../kjerne/offentlig.ts';
import { fraRad, tilRad } from '../kjerne/rad.ts';
import { projiser } from '../kjerne/sak.ts';
import {
  BELOPSVURDERINGER,
  FRISTRESULTATER,
  GRUNNLAGSRESULTATER,
  SAKSSTATUSER,
  SPORSTATUSER,
  SUBSIDIAERE_UTLOSERE,
  VEDERLAGSRESULTATER,
  type Kontekst,
  type Rolle,
} from '../kjerne/typer.ts';
import { FLYTEN, KORPUS, kjor, kommando, minnebane, type Bane } from './korpus.ts';

const defs = (skjema as { $defs: Record<string, { enum?: unknown[] }> }).$defs;

function kontekst(bane: Bane, rolle: Rolle): Kontekst {
  return {
    sakId: bane.sakId,
    aktorId: rolle.toLowerCase(),
    rolle,
    teamId: null,
    tidspunkt: () => new Date('2026-10-09T08:00:00Z'),
    nyId: () => 'ny-hendelse',
  };
}

function medPrefiks(navn: string, ekstra: Record<string, unknown>[] = []): Bane {
  const bane = minnebane();
  for (const h of [...KORPUS.prefikser[navn], ...ekstra]) {
    const u = bane.send(h as never);
    if (!u.godtatt) throw new Error(`Forutsetning: ${u.avvisning.melding}`);
  }
  return bane;
}

const aksept = (bane: Bane, endring: Record<string, unknown> = {}) => {
  const [, k] = kommando({ handling: 'aksept', spor: 'vederlag' }, bane.sak());
  return { ...k, ...endring };
};

describe('skjemaet', () => {
  it('bruker bare nøkkelordene validatoren kan', () => {
    expect(ukjenteNokkelord()).toEqual([]);
  });

  it.each([
    ['sporstatus', SPORSTATUSER],
    ['saksstatus', SAKSSTATUSER],
    ['grunnlagsresultat', GRUNNLAGSRESULTATER],
    ['vederlagsresultat', VEDERLAGSRESULTATER],
    ['fristresultat', FRISTRESULTATER],
    ['belopsvurdering', BELOPSVURDERINGER],
    ['subsidiaer_utloser', SUBSIDIAERE_UTLOSERE],
  ])('enumen %s er kontraktens', (navn, verdier) => {
    expect([...verdier].sort()).toEqual([...(defs[navn].enum as string[])].sort());
  });
});

describe('korpuset holder kontrakten', () => {
  it.each(FLYTEN.map((f) => [f.id, f] as const))('%s: rader og tilstand', (_id, forlop) => {
    const bane = minnebane();
    kjor(forlop, bane);
    for (const h of bane.journal) {
      const rad = tilRad(h, 'p-sprakprove');
      expect(valider(rad, 'rad')).toEqual([]);
      if (defs[`hendelse.${h.event_type}`])
        expect(valider(rad, `hendelse.${h.event_type}`)).toEqual([]);
    }
    const tilstand = offentligTilstand(bane.sak());
    expect(valider(tilstand, 'tilstand')).toEqual([]);
    // Tilstanden er den samme etter serialisering av journalen (invarianten om gjenlesing, i minnet).
    const gjenlest = JSON.parse(
      JSON.stringify(bane.journal.map((h) => tilRad(h, 'p-sprakprove')))
    ).map(fraRad);
    expect(offentligTilstand(projiser(bane.sakId, gjenlest))).toEqual(tilstand);
  });
});

describe('aksepten er streng (KA-U1, KT-U1)', () => {
  const delvis = { handling: 'vederlagssvar', vurdering: 'delvis', godkjent_belop: 60000 };

  it('kontrollsaken godtas og lagrer referansen', () => {
    const bane = medPrefiks('basis', [delvis]);
    const u = vurderKommando(bane.sak(), aksept(bane), kontekst(bane, 'TE'));
    expect(u.godtatt).toBe(true);
    if (u.godtatt) {
      expect(u.hendelse.refererer_til_event_id).toBe(bane.sak().vederlag.svar?.eventId);
      expect(tilRad(u.hendelse, 'p').referstoid).toBe(u.hendelse.refererer_til_event_id);
      expect(u.hendelse.data).toEqual({ spor: 'vederlag' });
    }
  });

  it.each([
    ['uten referanse', { refererer_til_event_id: undefined }, 'VALIDATION_ERROR'],
    ['ukjent felt i data', { data: { begrunnelse: 'Enig' } }, 'VALIDATION_ERROR'],
    ['ukjent felt i kommandoen', { begrunnelse: 'Enig' }, 'VALIDATION_ERROR'],
    ['et annet svar', { refererer_til_event_id: 'annen-hendelse' }, 'CURRENT_RESPONSE'],
  ])('%s avvises', (_navn, endring, regel) => {
    const bane = medPrefiks('basis', [delvis]);
    const k = aksept(bane, endring);
    if ('refererer_til_event_id' in endring && endring.refererer_til_event_id === undefined)
      delete k.refererer_til_event_id;
    const u = vurderKommando(bane.sak(), k, kontekst(bane, 'TE'));
    expect(u.godtatt).toBe(false);
    if (!u.godtatt) expect(u.avvisning.regel).toBe(regel);
  });

  it('kommentar som null godtas og lagres som utelatt', () => {
    const bane = medPrefiks('basis', [delvis]);
    const u = vurderKommando(
      bane.sak(),
      aksept(bane, { data: { kommentar: null } }),
      kontekst(bane, 'TE')
    );
    expect(u.godtatt && u.hendelse.data).toEqual({ spor: 'vederlag' });
  });
});

describe('serverfelt', () => {
  it('event_id og tidsstempel avvises', () => {
    const bane = medPrefiks('basis', [{ handling: 'vederlagssvar', vurdering: 'avslatt' }]);
    for (const felt of ['event_id', 'tidsstempel']) {
      const u = vurderKommando(
        bane.sak(),
        { ...aksept(bane), [felt]: 'fra-klienten' },
        kontekst(bane, 'TE')
      );
      expect(!u.godtatt && u.feil).toBe('VALIDATION_ERROR');
    }
  });

  it('aktørfeltene og sak_id overskrives med konteksten', () => {
    const bane = medPrefiks('basis', [{ handling: 'vederlagssvar', vurdering: 'avslatt' }]);
    const k = {
      ...aksept(bane),
      aktor_id: 'noen-andre',
      aktor_rolle: 'BH',
      aktor_team_id: 'team-x',
      sak_id: 'annen-sak',
    };
    const u = vurderKommando(bane.sak(), k, kontekst(bane, 'TE'));
    expect(u.godtatt).toBe(true);
    if (u.godtatt) {
      expect([
        u.hendelse.aktor_id,
        u.hendelse.aktor_rolle,
        u.hendelse.aktor_team_id,
        u.hendelse.sak_id,
      ]).toEqual(['te', 'TE', null, bane.sakId]);
    }
  });
});

describe('tolerante kommandoer og nullpolitikken (KA-U4)', () => {
  it('et ukjent felt i data forkastes ved lagring', () => {
    const bane = medPrefiks('godkjent_grunnlag');
    const [, k] = kommando({ handling: 'vederlagskrav', belop: 100000 }, bane.sak());
    (k.data as Record<string, unknown>).auto_begrunnelse = 'fra skjemaet';
    const u = vurderKommando(bane.sak(), k, kontekst(bane, 'TE'));
    expect(u.godtatt && 'auto_begrunnelse' in u.hendelse.data).toBe(false);
  });

  it('en vurdering som ikke er gjort, lagres utelatt og er null i tilstanden', () => {
    const bane = medPrefiks('basis');
    const [, k] = kommando(
      { handling: 'fristsvar', varsel_i_tide: true, spesifisering_i_tide: true, hindring: true },
      bane.sak()
    );
    (k.data as Record<string, unknown>).foresporsel_svar_ok = null;
    const u = vurderKommando(bane.sak(), k, kontekst(bane, 'BH'));
    expect(u.godtatt).toBe(true);
    if (u.godtatt) {
      expect('foresporsel_svar_ok' in u.hendelse.data).toBe(false);
      bane.journal.push(u.hendelse);
      expect(
        offentligTilstand(projiser(bane.sakId, bane.journal)).frist.foresporsel_svar_ok
      ).toBeNull();
    }
  });
});
