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
import { SOM_BREV } from '#kjerne/tester/brevet.ts';
import { PAABEROPELSE, sak } from '#kjerne/tester/brevsak.ts';

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

describe('varselet skjemaet viser når et eldre krav er rettet (MM-U63, OV-U120, A2 i #2509)', () => {
  const lagtTil = (sendt: string, oppgjoersform: string) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: {
      kravposter: [
        {
          betegnelse: 'P1',
          beskrivelse: 'Riving',
          oppgjoersform,
          ...(oppgjoersform === 'tilbud' ? { beloep: 50000 } : {}),
        },
      ],
    },
    sendt,
    ...SOM_BREV,
    dokumentasjon: [crypto.randomUUID()],
  });
  const kravet = (rad: { data: Record<string, unknown> }) =>
    (rad.data.krav as { id: string }[])[0]!.id;
  /** K1 lagt til 30.09 med P1 til fast sum, og K2 26.09 og K3 28.09 med P1 som regningsarbeid. */
  function medEldreKrav() {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', lagtTil('2026-09-30', 'tilbud'));
    const k2 = kravet(s.send('TE', lagtTil('2026-09-26', 'regningsarbeid')));
    const k3 = kravet(s.send('TE', lagtTil('2026-09-28', 'regningsarbeid')));
    return { s, k2, k3 };
  }
  const iSkjemaet = (u: Utledning) =>
    varslenePerKravpost(
      u,
      u.spor.vederlag.krav,
      [{ ...p1(u), betegnelse: 'P1', beskrivelse: 'Riving' }],
      null
    )[0];

  it('rettes K2 til en dag etter K3, er K3 varselet, som i brevet', () => {
    const { s, k2, k3 } = medEldreKrav();
    s.send('TE', { type: 'retting', gjelder: k2, dato: '2026-09-29' });
    expect(iSkjemaet(s.u())).toMatchObject({ art: 'gitt', varsel: k3 });
  });

  it('kontrollsak: uten rettingen er K2 varselet', () => {
    const { s, k2 } = medEldreKrav();
    expect(iSkjemaet(s.u())).toMatchObject({ art: 'gitt', varsel: k2 });
  });
});
