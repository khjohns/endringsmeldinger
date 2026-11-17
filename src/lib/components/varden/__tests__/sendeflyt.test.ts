/**
 * Sendeflyten i skjemaene (#2118). Forventningene er MM-U32: knappen er aldri sperret, det som
 * mangler, vises først etter et forsøk med fokus på feltet, og det som hindrer at brevet kan lages,
 * står ved knappen med fokus. Testen fastholder ellers atferden skjemaene hadde før modulen.
 */

import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
import type { Sendesteg } from '../sendeflyt.svelte';
import SendeflytTest from './SendeflytTest.svelte';

const AVSNITT = [{ laast: 'Brevteksten.' }];

function kjerne(o: { brev?: unknown; send?: boolean; feil?: string | null } = {}) {
  return {
    brev: vi.fn(() => o.brev ?? null),
    send: vi.fn(async () => o.send ?? true),
    feil: o.feil ?? null,
  } as unknown as Kjernesakkontekst & {
    brev: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };
}

function proev(kjernesak: Kjernesakkontekst, steg: (felt: () => HTMLElement | null) => Sendesteg) {
  render(SendeflytTest, { kjernesak, steg });
  return userEvent.setup();
}

const knappen = () => screen.getByRole('button', { name: 'Se brevet' });

describe('sendeflyten (MM-U32)', () => {
  it('når noe mangler, sendes ingenting, feilen står ved feltet og feltet får fokus', async () => {
    const k = kjerne();
    const tilBrevkontrollen = vi.fn();
    const bruker = proev(k, (felt) => ({
      mangler: felt,
      kommando: {},
      kanIkkeLages: 'Kan ikke lages.',
      tilBrevkontrollen,
    }));
    expect(screen.getByTestId('feil').textContent).toBe('');
    await bruker.click(knappen());
    expect(screen.getByTestId('feil').textContent).toBe('Fyll ut feltet.');
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Feltet' }));
    expect(k.brev).not.toHaveBeenCalled();
    expect(tilBrevkontrollen).not.toHaveBeenCalled();
  });

  it('et brev med tekst går til brevkontrollen med teksten, merkingen og tittelen', async () => {
    const k = kjerne({
      brev: { avsnitt: AVSNITT, merking: 'K-1', deresRef: null, brevtittel: 'Krav' },
    });
    const tilBrevkontrollen = vi.fn();
    const bruker = proev(k, () => ({
      mangler: null,
      kommando: { type: 'krav' },
      kanIkkeLages: 'Kan ikke lages.',
      tilBrevkontrollen,
    }));
    await bruker.click(knappen());
    expect(k.brev).toHaveBeenCalledWith({ type: 'krav' }, undefined, true);
    expect(tilBrevkontrollen).toHaveBeenCalledWith({
      avsnitt: AVSNITT,
      merking: 'K-1',
      deresRef: null,
      tittel: 'Krav',
    });
    expect(screen.queryByText('Kan ikke lages.')).toBeNull();
  });

  it('en avvisning fra kjernen står ved knappen med årsaken og får fokus, og knappen viser til den', async () => {
    const k = kjerne({ brev: { avvisning: { regel: 'X', melding: 'Datoen mangler.' } } });
    const bruker = proev(k, () => ({
      mangler: null,
      kommando: {},
      kanIkkeLages: 'Kan ikke lages.',
      tilBrevkontrollen: vi.fn(),
    }));
    await bruker.click(knappen());
    const hindring = screen.getByText('Brevet kan ikke sendes ennå. Datoen mangler.');
    expect(document.activeElement).toBe(hindring);
    expect(knappen().getAttribute('aria-describedby')).toBe(hindring.id);
  });

  it('uten årsak fra kjernen står reserveteksten, også når skjemaet overstyrer årsaken', async () => {
    const k = kjerne({ brev: { avvisning: { regel: 'UGYLDIG_VURDERING', melding: 'Intern.' } } });
    const bruker = proev(k, () => ({
      mangler: null,
      kommando: {},
      kanIkkeLages: 'Kan ikke lages.',
      aarsak: () => null,
      tilBrevkontrollen: vi.fn(),
    }));
    await bruker.click(knappen());
    expect(screen.getByText('Kan ikke lages.')).toBeTruthy();
  });

  it('korrespondanse lagt til sendes uten brevkontroll; feiler det, står feilen fra saken', async () => {
    const ferdig = vi.fn();
    const k = kjerne({ send: false, feil: 'Saken er endret.' });
    const bruker = proev(k, () => ({
      mangler: null,
      lagtTil: { kommando: { type: 'registrert' }, vedlegg: new Map(), ferdig },
      kommando: { type: 'krav' },
      kanIkkeLages: 'Kan ikke lages.',
      tilBrevkontrollen: vi.fn(),
    }));
    await bruker.click(knappen());
    expect(k.send).toHaveBeenCalledWith({ type: 'registrert' }, undefined, new Map());
    expect(k.brev).not.toHaveBeenCalled();
    expect(ferdig).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByText('Saken er endret.'));
  });

  it('korrespondanse som er lagt til, gir det som skjer etterpå', async () => {
    const ferdig = vi.fn();
    const k = kjerne({ send: true });
    const bruker = proev(k, () => ({
      mangler: null,
      lagtTil: { kommando: {}, vedlegg: new Map(), ferdig },
      kommando: {},
      kanIkkeLages: 'Kan ikke lages.',
      tilBrevkontrollen: vi.fn(),
    }));
    await bruker.click(knappen());
    expect(ferdig).toHaveBeenCalledOnce();
  });

  it('et varsel som registreres, sendes uten brevkontroll; uten feil fra saken står reserveteksten', async () => {
    const registrert = vi.fn();
    const k = kjerne({ send: false });
    const bruker = proev(k, () => ({
      mangler: null,
      kommando: { type: 'varsel' },
      registrert,
      kanIkkeLages: 'Kan ikke lages.',
      tilBrevkontrollen: vi.fn(),
    }));
    await bruker.click(knappen());
    expect(k.send).toHaveBeenCalledWith({ type: 'varsel' }, undefined, undefined);
    expect(registrert).not.toHaveBeenCalled();
    expect(screen.getByText('Kan ikke lages.')).toBeTruthy();
  });

  it('et nytt forsøk fjerner hindringen fra forrige', async () => {
    let mangler = false;
    const k = kjerne({ brev: { avvisning: { regel: 'X', melding: 'Nei.' } } });
    const bruker = proev(k, (felt) => ({
      mangler: mangler ? felt : null,
      kommando: {},
      kanIkkeLages: 'Kan ikke lages.',
      tilBrevkontrollen: vi.fn(),
    }));
    await bruker.click(knappen());
    expect(screen.queryByText('Brevet kan ikke sendes ennå. Nei.')).not.toBeNull();
    mangler = true;
    await bruker.click(knappen());
    expect(screen.queryByText('Brevet kan ikke sendes ennå. Nei.')).toBeNull();
  });
});
