/**
 * Varselet skjemaet viser for en kravpost når et eldre krav er lagt til (OV-U118, OV-U120), lest
 * av kjernen som kommandoen gjør. Saken bygges med prefikset `krav_irreg`, der vederlagskravet
 * 22.09 har P1 med fast sum, og P1 skifter til regningsarbeid i kravet fra løsningen 24.09.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from '#kjerne/tester/bane.ts';
import { kjoer } from '#kjerne/tester/kjoerer.ts';
import type { Handling } from '#kjerne/tester/klient.ts';
import { dagklokke } from '#kjerne/tester/testmiljoe.ts';
import {
  kravversjoneneKravetProevesMot,
  utledJournal,
  type Utledning,
} from '#kjerne/utledning/utled.ts';
import { kravposterI } from '#kjerne/spor/vederlag/format.ts';
import { KJERNE } from '#kjerne/versjon.ts';
import { varslenePerKravpost } from '#lib/kjernesak/vederlagskrav.ts';

const medP1 = (oppgjoersform: string): Handling => ({
  handling: 'krav',
  spor: 'vederlag',
  kravposter: [{ post: 'P1', oppgjoersform }],
});

/** Saken etter stegene, med P1 lagt til som regningsarbeid i et brev sendt 21.09 når `eldre` er satt. */
async function saken(steg: Handling[], eldre: boolean): Promise<Utledning> {
  const bane = minnebane();
  const k = await kjoer(
    { id: 'eldre-krav-skjema', rader: [], start: 'krav_irreg', steg, kontroller: [] },
    bane,
    { valg: { klokke: dagklokke() } }
  );
  if (eldre) {
    const utfall = await k.send({ ...medP1('regningsarbeid'), sendt: '2026-09-21' });
    expect(utfall?.godtatt ? null : utfall?.avvisning).toBeNull();
  }
  return utledJournal(await bane.journal(), KJERNE);
}

const p1 = (u: Utledning) => ({
  id: kravposterI(u.spor.vederlag.krav[0]!)[0]!.id,
  oppgjoersform: 'regningsarbeid' as const,
});

describe('varselet skjemaet viser når et eldre krav er lagt til (OV-U120)', () => {
  it('er det eldre kravet varselet, viser den neste versjonen det som varselet posten hadde før', async () => {
    const u = await saken([medP1('regningsarbeid')], true);
    const [v] = varslenePerKravpost(u, u.spor.vederlag.krav, [p1(u)], null);
    expect(v).toMatchObject({ art: 'foer', krav: u.spor.vederlag.kravUtenforRekken[0]!.dokument });
  });

  it('kontrollsak: uten det eldre kravet er kravet 24.09 varselet posten hadde før (VS-U49)', async () => {
    const u = await saken([medP1('regningsarbeid')], false);
    const [v] = varslenePerKravpost(u, u.spor.vederlag.krav, [p1(u)], null);
    expect(v).toMatchObject({ art: 'foer', krav: u.spor.vederlag.krav.at(-1)!.dokument });
  });

  it('et krav som legges til, sendt før det eldre kravet, er selv varselet (OV-U120 vilkår 5, OV-U118)', async () => {
    const u = await saken([], true);
    expect(
      varslenePerKravpost(
        u,
        kravversjoneneKravetProevesMot(u, 'vederlag', '2026-09-20').tidligere,
        [p1(u)],
        '2026-09-20'
      )
    ).toEqual([{ art: 'kravet', hjemmel: '34.4' }]);
  });

  it('kontrollsak: et krav fra løsningen har det eldre kravet som varsel (OV-U120)', async () => {
    const u = await saken([], true);
    const [v] = varslenePerKravpost(u, u.spor.vederlag.krav, [p1(u)], null);
    expect(v).toMatchObject({ art: 'gitt', varsel: u.spor.vederlag.kravUtenforRekken[0]!.id });
  });
});
