/**
 * Siden «Om Varden» (#1452). Forklaringene av hvordan løsningen virker, står her og ikke ved
 * feltene (OV-U81, regelen fra #1443 i `.interface-design/system.md`). Siden nås fra innloggingen
 * og leses uten sesjon.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import OmVarden from '$lib/components/om-varden/OmVarden.svelte';
import Login from '../../../../routes/login/+page.svelte';
import { load } from '../../../../routes/+layout';
import { OM_VARDEN_STI } from '$lib/components/om-varden/sti';
import { FORHOLDET } from '$lib/components/varden/tekster';

const getSession = vi.hoisted(() => vi.fn());
vi.mock('$lib/api/auth', () => ({ getSession, loginUrl: (r: string) => r }));
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/login') } }));

afterEach(() => {
  cleanup();
  getSession.mockReset();
});

describe('siden «Om Varden»', () => {
  it('innloggingen lenker til siden', () => {
    render(Login);
    expect(screen.getByRole('link', { name: 'Om Varden' })).toHaveAttribute('href', OM_VARDEN_STI);
  });

  it('siden lastes uten sesjon og uten kall til serveren', async () => {
    const data = await load({ url: new URL(`http://localhost${OM_VARDEN_STI}`) } as never);
    expect(data).toEqual({ user: null });
    expect(getSession).not.toHaveBeenCalled();
  });

  it('OV-U81: siden sier at innholdet ikke vurderes og hva løsningen viser ved korrespondansen', () => {
    render(OmVarden);
    expect(screen.getByRole('heading', { level: 1, name: 'Om Varden' })).toBeInTheDocument();
    const tekst = (document.body.textContent ?? '').replace(/\s+/g, ' ');
    expect(tekst).toMatch(
      /vurderer ikke innholdet i dokumentene som legges til, og avgjør ikke hvilken betydning de har for partenes rettigheter og plikter/
    );
    expect(tekst).toMatch(
      /typen, avsenderen, datoen, sendemåten, hvem som la den til og når, og kategorien/
    );
    expect(tekst).toMatch(
      /Begrunnelsen står i brevet slik parten skrev den, og løsningen tolker den ikke/
    );
  });

  it('#1443: ingen fil i Varden forklarer ved feltene at innholdet ikke vurderes eller teksten ikke tolkes', () => {
    const mappe = join(process.cwd(), 'src/lib/components/varden');
    const filer = readdirSync(mappe).filter((f) => /\.(svelte|ts)$/.test(f));
    // OV-U81 lar forklaringen ved korrespondansen stå i et infotips, ikke ved feltet.
    const treff = filer.filter((f) =>
      /(vurderes|tolkes) ikke|(vurderer|tolker) ikke (innholdet|teksten|begrunnelsen)/i.test(
        readFileSync(join(mappe, f), 'utf8').replace(FORHOLDET.omKorrespondansenTekst, '')
      )
    );
    expect(treff).toEqual([]);
  });
});
