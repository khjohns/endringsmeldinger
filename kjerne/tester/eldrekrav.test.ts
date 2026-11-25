/**
 * Et krav eller en påberopelse sendt utenfor løsningen før totalentreprenørens siste krav i sporet,
 * med annet innhold enn de andre kravversjonene (#2011 punkt 2, OV-U118–OV-U122). Kravet legges
 * til gjennom kommandoen, raden skrives, og saken utledes av journalen. Hver kontroll har en
 * kontrollsak som bare skiller seg i datoen brevet ble sendt.
 *
 * Klokka går én dag per handling, så prefikset `krav_irreg` sender påberopelsen 21.09 med datoen
 * 15.09 for pålegget, vederlagskravet 22.09 med kravposten P1 og fristkravet 23.09, og steg n i
 * forløpet skrives 23.09 + n dager.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from './bane.ts';
import { kjoer } from './kjoerer.ts';
import type { Handling } from './klient.ts';
import { dagklokke } from './testmiljoe.ts';
import { utledJournal, type Utledning } from '../utledning/utled.ts';
import { kravposterI } from '../spor/vederlag/format.ts';
import { innholdIFristen } from '../spor/frist/format.ts';
import { sisteDatoopplysning } from '../spor/forhold/utledning.ts';
import { KJERNE } from '../versjon.ts';
import type { Utfall } from '../kommandoer/skriving.ts';
import type { Krav } from '../typer.ts';

interface LagtTil {
  utfall: Utfall;
  /** Utfallet av hver handling i `etter`, når kravet er godtatt. */
  etter: (Utfall | null)[];
  /** Saken etter det siste steget, når kravet er godtatt. */
  u: Utledning | null;
}

/**
 * Kjører `steg` etter prefikset, legger til handlingen `h` som et brev sendt `sendt`, skriver raden
 * når den godtas, og sender så handlingene i `etter`.
 */
async function leggTil(
  steg: Handling[],
  h: Handling,
  sendt: string,
  etter: Handling[] = []
): Promise<LagtTil> {
  const bane = minnebane();
  const k = await kjoer(
    { id: 'eldre-krav', rader: [], start: 'krav_irreg', steg, kontroller: [] },
    bane,
    { valg: { klokke: dagklokke() } }
  );
  const utfall = await k.prov({ ...h, sendt });
  if (!utfall.godtatt) return { utfall, etter: [], u: null };
  await bane.skriv(utfall.hendelser, (await bane.journal()).at(-1)!.versjon);
  const resten: (Utfall | null)[] = [];
  for (const e of etter) resten.push(await k.send(e));
  return { utfall, etter: resten, u: utledJournal(await bane.journal(), KJERNE) };
}

/** Kravet i raden kommandoen ga, slik saken leser det. Kravet må være godtatt. */
function kravetIRaden(utfall: Utfall, u: Utledning | null): Krav {
  expect(utfall.godtatt ? null : utfall.avvisning, 'kravet er godtatt').toBeNull();
  const id = utfall.godtatt
    ? utfall.hendelser.flatMap((r) => ((r.data.krav ?? []) as { id: string }[]).map((k) => k.id))
    : [];
  expect(id, 'raden har ett krav').toHaveLength(1);
  const krav = Object.values(u?.spor ?? {})
    .flatMap((s) => [...s.krav, ...s.kravUtenforRekken])
    .find((k) => k.id === id[0]);
  expect(krav, 'saken har kravet').toBeDefined();
  return krav!;
}

const betegnelser = (k: Krav) => kravposterI(k).map((p) => p.betegnelse);

/** Saken er forstått, og kravet står utenfor rekken uten virkning ellers. */
function staarUtenforRekken(u: Utledning | null, krav: Krav) {
  expect(u?.forstaatt, 'saken er forstått').toBe(true);
  expect(u?.begrensninger).toEqual([]);
  expect(u?.spor[krav.spor].kravUtenforRekken.map((k) => k.id)).toEqual([krav.id]);
  expect(u?.spor[krav.spor].gjeldendeKrav?.id).not.toBe(krav.id);
}

/** Totalentreprenørens vederlagskrav med kravpostene; `post` er betegnelsen i sporet. */
const vederlagskrav = (
  kravposter: { post?: string; belop: number }[],
  trekker?: string[]
): Handling => ({
  handling: 'krav',
  spor: 'vederlag',
  kravposter,
  ...(trekker ? { trekker } : {}),
});

/** Kravet fra løsningen 24.09 med P1 Riving og den nye kravposten P2 Montering. */
const toPoster = vederlagskrav([{ post: 'P1', belop: 60000 }, { belop: 40000 }]);

describe('et vederlagskrav sendt før det siste prøves mot kravversjonene sendt før det (OV-U118)', () => {
  const riving = vederlagskrav([{ post: 'P1', belop: 60000 }]);

  it('et brev uten Montering, sendt før kravet som tok den med, tas imot og står utenfor rekken', async () => {
    const { utfall, u } = await leggTil([toPoster], riving, '2026-09-23');
    expect(utfall.godtatt ? null : utfall.avvisning).toBeNull();
    staarUtenforRekken(u, kravetIRaden(utfall, u));
  });

  it('kontrollsak: det samme brevet sendt etter det siste kravet mangler Montering uten trekk og avvises', async () => {
    const { utfall } = await leggTil([toPoster], riving, '2026-09-25');
    expect(utfall).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'KRAVPOSTENE', melding: expect.stringContaining('mangler P2') },
    });
  });

  /** Montering er med fra 24.09, og 28.09 kommer en ny kravversjon. Brevet er sendt 26.09. */
  const tre = [
    toPoster,
    { handling: 'tiden_gaar', til: '2026-09-27' },
    vederlagskrav([{ post: 'P1', belop: 60000 }, { post: 'P2', belop: 40000 }, { belop: 5000 }]),
  ];

  it('mangler brevet Montering fra kravversjonen sendt før det, avvises det uten trekk', async () => {
    const { utfall } = await leggTil(tre, riving, '2026-09-26');
    expect(utfall).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'KRAVPOSTENE', melding: expect.stringContaining('mangler P2') },
    });
  });

  it('sier brevet at Montering trekkes, tas det imot, og trekket registreres som brevet sier', async () => {
    const { utfall, u } = await leggTil(
      tre,
      vederlagskrav([{ post: 'P1', belop: 60000 }], ['P2']),
      '2026-09-26'
    );
    const krav = kravetIRaden(utfall, u);
    const p2 = u!.spor.vederlag.krav.flatMap(kravposterI).find((p) => p.betegnelse === 'P2')!;
    expect(krav.innhold.trekker).toEqual([p2.id]);
    staarUtenforRekken(u, krav);
  });

  it('kontrollsak: et brev sendt før Montering ble tatt med, prøves ikke mot den', async () => {
    const { utfall, u } = await leggTil(tre, riving, '2026-09-23');
    staarUtenforRekken(u, kravetIRaden(utfall, u));
  });
});

describe('kravpostene i et vederlagskrav sendt før det siste (OV-U119)', () => {
  /** Brevet 23.09 krever Riving, som er P1, og Stillas, som ikke står i sporet. */
  const brevet = vederlagskrav([{ post: 'P1', belop: 50000 }, { belop: 10000 }]);

  it('Riving er P1, og Stillas får en ny betegnelse i sporet', async () => {
    const { utfall, u } = await leggTil([toPoster], brevet, '2026-09-23');
    const krav = kravetIRaden(utfall, u);
    expect(betegnelser(krav)).toEqual(['P1', 'P3']);
    const p1 = u!.spor.vederlag.gjeldendeKrav!;
    expect(kravposterI(krav)[0].id).toBe(kravposterI(p1)[0].id);
    staarUtenforRekken(u, krav);
  });

  it('en senere kravversjon kan utelate Stillas uten trekk, eller ta den med som P3', async () => {
    const { etter, u } = await leggTil([toPoster], brevet, '2026-09-23', [
      vederlagskrav([
        { post: 'P1', belop: 60000 },
        { post: 'P2', belop: 40000 },
      ]),
      vederlagskrav([
        { post: 'P1', belop: 60000 },
        { post: 'P2', belop: 40000 },
        { post: 'P3', belop: 10000 },
      ]),
    ]);
    expect(etter.map((x) => (x?.godtatt ? null : x?.avvisning))).toEqual([null, null]);
    expect(u?.forstaatt).toBe(true);
    expect(u?.begrensninger).toEqual([]);
    const [stillas] = u!.spor.vederlag.kravUtenforRekken.flatMap(kravposterI).slice(1);
    const sist = kravposterI(u!.spor.vederlag.gjeldendeKrav!);
    expect(sist.map((p) => p.betegnelse)).toEqual(['P1', 'P2', 'P3']);
    expect(sist[2].id).toBe(stillas.id);
  });

  it('kontrollsak: en senere kravversjon som utelater Montering fra rekken, avvises uten trekk', async () => {
    const { etter } = await leggTil([toPoster], brevet, '2026-09-23', [
      vederlagskrav([{ post: 'P1', belop: 60000 }]),
    ]);
    expect(etter[0]).toMatchObject({ godtatt: false, avvisning: { regel: 'KRAVPOSTENE' } });
  });
});

describe('et fristkrav sendt før det siste (OV-U118)', () => {
  /** Kravet 24.09 tar med fristen fra 23.09 og en frist til i kontrakten. */
  const toFrister: Handling = {
    handling: 'krav',
    spor: 'frist',
    frister: [
      { erstatter: 'Sluttfristen', navn: 'Sluttfristen', dager: 20 },
      { frist_id: 2, dager: 5 },
    ],
  };
  const enFrist: Handling = {
    handling: 'krav',
    spor: 'frist',
    frister: [{ erstatter: 'Sluttfristen', navn: 'Sluttfristen', dager: 15 }],
  };

  it('et brev uten den andre fristen, sendt før kravet som tok den med, tas imot med fristen som har stått i sporet', async () => {
    const { utfall, u } = await leggTil([toFrister], enFrist, '2026-09-22');
    const krav = kravetIRaden(utfall, u);
    const foerste = innholdIFristen(u!.spor.frist.krav[0]).frister[0];
    expect(innholdIFristen(krav).frister.map((f) => f.id)).toEqual([foerste.id]);
    staarUtenforRekken(u, krav);
  });

  it('kontrollsak: det samme brevet sendt etter det siste kravet avvises uten trekk', async () => {
    const { utfall } = await leggTil([toFrister], enFrist, '2026-09-25');
    expect(utfall).toMatchObject({ godtatt: false, avvisning: { regel: 'FRISTENE' } });
  });
});

describe('en påberopelse sendt før den siste (OV-U121, OV-U122)', () => {
  /** `dato` er datoen pålegget ble mottatt, i stedet for 15.09 som påberopelsen har. */
  const paaberopelse = (underkategori: string, dato?: string): Handling => ({
    handling: 'krav',
    spor: 'forhold',
    underkategori,
    ...(dato ? { dato } : {}),
  });
  it('en påberopelse med en annen gruppe tas ikke imot, og meldingen viser til dokumentasjon og en ny sak (OV-U121)', async () => {
    const { utfall } = await leggTil([], paaberopelse('endringsordre'), '2026-09-19');
    expect(utfall).toMatchObject({
      godtatt: false,
      avvisning: {
        regel: 'ANNEN_HJEMMEL',
        melding: expect.stringMatching(/før totalentreprenørens siste påberopelse.*ny sak/),
      },
    });
  });

  it('kontrollsak: med samme forhold tas den imot (OV-U121)', async () => {
    const { utfall, u } = await leggTil([], paaberopelse('irregulaer_endring'), '2026-09-19');
    staarUtenforRekken(u, kravetIRaden(utfall, u));
  });

  it('med en annen dato for pålegget tas den imot, og totalentreprenørens siste opplysning står (OV-U122)', async () => {
    const { utfall, u } = await leggTil(
      [],
      paaberopelse('irregulaer_endring', '2026-09-10'),
      '2026-09-19'
    );
    staarUtenforRekken(u, kravetIRaden(utfall, u));
    expect(sisteDatoopplysning(u!, 'paalegg_mottatt')?.dato).toBe('2026-09-15');
  });

  it('kontrollsak: en ny versjon sendt etter den siste kan ikke endre datoen (MM-U55 punkt 10)', async () => {
    const { utfall } = await leggTil(
      [],
      paaberopelse('irregulaer_endring', '2026-09-10'),
      '2026-09-23'
    );
    expect(utfall).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'DATOEN_KAN_IKKE_ENDRES' },
    });
  });

  it('er den siste opplysningen senere enn dagen brevet ble sendt, tas det ikke imot (OV-U122)', async () => {
    const { utfall } = await leggTil(
      [],
      paaberopelse('irregulaer_endring', '2026-09-10'),
      '2026-09-12'
    );
    expect(utfall).toMatchObject({ godtatt: false, avvisning: { regel: 'DATOEN_ETTER_BREVET' } });
  });

  it('kontrollsak: når opplysningen er korrigert til en dato før brevet, tas det imot (OV-U122)', async () => {
    const { utfall, u } = await leggTil(
      [{ handling: 'korrigering', dato: '2026-09-10' }],
      paaberopelse('irregulaer_endring', '2026-09-10'),
      '2026-09-12'
    );
    staarUtenforRekken(u, kravetIRaden(utfall, u));
  });
});
