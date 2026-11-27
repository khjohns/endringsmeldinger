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
import type { Journalrad, Krav } from '../typer.ts';
import { laast } from './brevsak.ts';
import { standpunkteneTilVarslene } from '../spor/vederlag/utledning.ts';
import { varseleneIEldreKrav } from '../spor/vederlag/visning.ts';

interface LagtTil {
  utfall: Utfall;
  /** Utfallet av hver handling i `etter`, når kravet er godtatt. */
  etter: (Utfall | null)[];
  /** Saken etter det siste steget, når kravet er godtatt. */
  u: Utledning | null;
  /** Journalen etter det siste steget. */
  journal: Journalrad[];
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
  if (!utfall.godtatt) return { utfall, etter: [], u: null, journal: await bane.journal() };
  await bane.skriv(utfall.hendelser, (await bane.journal()).at(-1)!.versjon);
  const resten: (Utfall | null)[] = [];
  for (const e of etter) resten.push(await k.send(e));
  const journal = await bane.journal();
  return { utfall, etter: resten, u: utledJournal(journal, KJERNE), journal };
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

  it('et brev sendt samme dag som kravversjonen som tok med Montering, prøves mot den (OV-U104)', async () => {
    const { utfall } = await leggTil(tre, riving, '2026-09-24');
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

describe('en frist som er registrert etter et brev (OV-U118, KA-U79)', () => {
  /** Fristen fra 23.09, angitt med navnet, erstattes 24.09 med en registrert frist på samme rad. */
  const registrert: Handling = {
    handling: 'krav',
    spor: 'frist',
    frister: [{ erstatter: 'Sluttfristen', frist_id: 1, dager: 20 }],
  };
  const medNavnet: Handling = {
    handling: 'krav',
    spor: 'frist',
    frister: [{ navn: 'Sluttfristen', dager: 15 }],
  };

  it('et brev sendt før fristen ble registrert, kan angi den med navnet', async () => {
    const { utfall, u } = await leggTil([registrert], medNavnet, '2026-09-22');
    staarUtenforRekken(u, kravetIRaden(utfall, u));
  });

  it('kontrollsak: et brev sendt etter at fristen ble registrert, kan ikke bytte den', async () => {
    const { utfall } = await leggTil([registrert], medNavnet, '2026-09-25');
    expect(utfall).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'FRISTENE', melding: expect.stringContaining('bytter den registrerte') },
    });
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

  it('kontrollsak: en ny versjon sendt etter den siste kan ikke endre datoen (MM-U59 punkt 10)', async () => {
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
    expect(utfall).toMatchObject({
      godtatt: false,
      avvisning: { regel: 'OPPLYSNINGEN_ETTER_BREVET' },
    });
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

/** Totalentreprenørens vederlagskrav med P1 med oppgjørsformen, og eventuelt varselet P1 viser til. */
const medP1 = (oppgjoersform: string, ekstra: Record<string, unknown> = {}): Handling => ({
  handling: 'krav',
  spor: 'vederlag',
  kravposter: [{ post: 'P1', oppgjoersform, ...ekstra }],
});

/** Brevteksten i raden kommandoen ga, som én tekst. */
const brevteksten = (utfall: Utfall | null): string => {
  expect(utfall?.godtatt ? null : utfall?.avvisning, 'kravet er godtatt').toBeNull();
  return utfall!.godtatt ? laast(utfall!.hendelser[0]!).join(' ') : '';
};

const VARSEL_344 = 'Kravet er varsel før regningsarbeidet settes i gang';
const GITT_344 = 'Varselet før regningsarbeidet settes i gang (NS 8407 punkt 34.4) ble gitt i';

describe('et eldre vederlagskrav som varsel for en kravpost (OV-U120)', () => {
  // Kravet fra løsningen 22.09 har P1 med fast sum. Brevet 21.09 legges til før den neste versjonen.
  it('har brevet P1 med regningsarbeid, sier den neste versjonen at varselet ble gitt i brevet, ikke at kravet er varselet (OV-U120, VS-U49)', async () => {
    const { etter, u } = await leggTil([], medP1('regningsarbeid'), '2026-09-21', [
      medP1('regningsarbeid'),
    ]);
    const tekst = brevteksten(etter[0]!);
    expect(tekst).not.toContain(VARSEL_344);
    expect(tekst).toContain(GITT_344);
    expect(u?.begrensninger).toEqual([]);
  });

  it('byggherren ser brevet og dagen det ble sendt som varselet for P1 (OV-U120, D-15 og U-15 i BF-49)', async () => {
    const { u, journal } = await leggTil([], medP1('regningsarbeid'), '2026-09-21', [
      medP1('regningsarbeid'),
    ]);
    expect(u ?? null, 'brevet er lagt til').not.toBeNull();
    const brevet = u!.spor.vederlag.kravUtenforRekken[0]!.dokument;
    const p1 = kravposterI(u!.spor.vederlag.gjeldendeKrav!)[0]!.id;
    expect(varseleneIEldreKrav(u!)).toEqual([
      { gjelder: p1, hjemmel: '34.4', dokument: brevet, sendt: '2026-09-21' },
    ]);
    expect(journal.some((r) => r.event_id === brevet)).toBe(true);
  });

  it('kontrollsak: har den neste versjonen justerte enhetspriser for P1, er kravet varselet etter punkt 34.3.3 (OV-U120 vilkår 1, VS-U49)', async () => {
    const { etter } = await leggTil([], medP1('regningsarbeid'), '2026-09-21', [
      medP1('enhetspriser', { justert: true }),
    ]);
    const tekst = brevteksten(etter[0]!);
    expect(tekst).toContain('Kravet er varsel om justering av enhetsprisene');
    expect(tekst).not.toContain('ble gitt i');
  });

  it('kontrollsak: har brevet P1 med fast sum, er den neste versjonen varselet for regningsarbeidet (OV-U120 vilkår 1)', async () => {
    const { etter } = await leggTil([], medP1('tilbud', { belop: 50000 }), '2026-09-21', [
      medP1('regningsarbeid'),
    ]);
    expect(brevteksten(etter[0]!)).toContain(VARSEL_344);
  });

  // Varselet etter § 34.4 registreres 24.09, før den neste versjonen viser til det.
  const varselet: Handling = {
    handling: 'varsel',
    spor: 'vederlag',
    hjemmel: '34.4',
    sendt: '2026-09-23',
    navn: 'V',
  };

  it('er brevet varselet for P1, kan den neste versjonen ikke vise til et annet varsel for P1 (OV-U118, OV-U120, VS-U54)', async () => {
    const { etter } = await leggTil([varselet], medP1('regningsarbeid'), '2026-09-21', [
      medP1('regningsarbeid', { varsel: 'V' }),
    ]);
    expect(etter[0]).toMatchObject({
      godtatt: false,
      avvisning: {
        regel: 'KRAVPOSTVARSELET',
        melding: expect.stringContaining('hadde oppgjørsformen i en tidligere kravversjon'),
      },
    });
  });

  it('kontrollsak: har brevet P1 med fast sum, kan den neste versjonen vise til varselet (VS-U50)', async () => {
    const { etter, u } = await leggTil(
      [varselet],
      medP1('tilbud', { belop: 50000 }),
      '2026-09-21',
      [medP1('regningsarbeid', { varsel: 'V' })]
    );
    expect(brevteksten(etter[0]!)).toContain(GITT_344);
    expect(u?.begrensninger).toEqual([]);
  });

  it('viser P1 i brevet til et varsel, er brevet ikke varselet, og den neste versjonen er det heller ikke (OV-U120 vilkår 3, OV-U118, VS-U49)', async () => {
    const { etter } = await leggTil(
      [{ ...varselet, sendt: '2026-09-20' }],
      medP1('regningsarbeid', { varsel: 'V' }),
      '2026-09-21',
      [medP1('regningsarbeid')]
    );
    const tekst = brevteksten(etter[0]!);
    expect(tekst).not.toContain(VARSEL_344);
    expect(tekst).not.toContain(GITT_344);
  });

  it('viser P1 i et annet eldre krav til et varsel, er det første eldre kravet ikke varselet (OV-U120 vilkår 3)', async () => {
    const { etter } = await leggTil(
      [{ ...varselet, hjemmel: '34.3.3', sendt: '2026-09-19' }],
      medP1('enhetspriser', { justert: true, varsel: 'V' }),
      '2026-09-20',
      [{ ...medP1('regningsarbeid'), sendt: '2026-09-21' }, medP1('regningsarbeid')]
    );
    expect(etter[0], 'det andre eldre kravet er lagt til').toMatchObject({ godtatt: true });
    expect(brevteksten(etter[1]!)).not.toContain(GITT_344);
  });

  it('en lagret versjon som viser til et annet varsel for P1 enn brevet før den, gjør saken ikke forstått (OV-U120, MM-U2)', async () => {
    const { utfall, journal } = await leggTil(
      [varselet],
      medP1('tilbud', { belop: 50000 }),
      '2026-09-21',
      [medP1('regningsarbeid', { varsel: 'V' })]
    );
    expect(utledJournal(journal, KJERNE).begrensninger, 'kontrollsak').toEqual([]);
    // Brevet i journalen får P1 med regningsarbeid, slik det kunne vært lagt til.
    const id = utfall.godtatt ? utfall.hendelser[0]!.event_id : null;
    const rad = journal.find((r) => r.event_id === id);
    expect(rad, 'brevet er lagt til').toBeDefined();
    if (!rad) return;
    const [p1] = (rad.data.krav as { kravposter: Record<string, unknown>[] }[])[0]!.kravposter;
    p1!.oppgjoersform = 'regningsarbeid';
    delete p1!.beloep;
    expect(utledJournal(journal, KJERNE).begrensninger.map((b) => b.grunn)).toEqual([
      expect.stringContaining('hadde oppgjørsformen i en tidligere kravversjon'),
    ]);
  });

  // 24.09 skifter P1 til regningsarbeid, og byggherren svarer 25.09 at varselet kom for sent.
  const svaretForSent: Handling = {
    handling: 'brev',
    svar: [
      {
        spor: 'vederlag',
        kravposter: [{ post: 'P1', varslet_i_tide: false }],
      },
    ],
  };
  /** Innsigelsene etter § 34.4 som står. Saken må finnes, altså brevet være lagt til. */
  const forSent = (u: Utledning | null, kjentFoer?: string) => {
    expect(u, 'brevet er lagt til').not.toBeNull();
    return u
      ? standpunkteneTilVarslene(u, null, false, kjentFoer).filter(
          (x) => x.hjemmel === '34.4' && !x.iTide
        )
      : [];
  };

  it('innsigelsen i et svar før brevet ble lagt til, følger ikke med til det eldre kravet (OV-U120 andre ledd)', async () => {
    const { utfall, u } = await leggTil(
      [medP1('regningsarbeid'), svaretForSent],
      medP1('regningsarbeid'),
      '2026-09-21'
    );
    expect(u?.begrensninger).toEqual([]);
    expect(forSent(u)).toEqual([]);
    // Svaret står med virkningen det hadde, slik saken var da brevet ble lagt til.
    const lagtTil = kravetIRaden(utfall, u).dokument;
    expect(forSent(u, lagtTil)).toHaveLength(1);
  });

  /** Byggherrens nye svar etter at brevet er lagt til, som igjen sier at varselet kom for sent. */
  const nyttSvar: Handling = {
    handling: 'revisjon',
    spor: 'vederlag',
    kravposter: [{ post: 'P1', varslet_i_tide: false }],
  };

  it('et svar etter brevet viser ikke til innsigelsen før det (OV-U120 andre ledd)', async () => {
    const { etter } = await leggTil(
      [medP1('regningsarbeid'), svaretForSent],
      medP1('regningsarbeid'),
      '2026-09-21',
      [nyttSvar]
    );
    const tekst = brevteksten(etter[0]!);
    expect(tekst).toContain('ikke ble gitt eller kom for sent');
    expect(tekst).not.toContain('jf. innsigelsen');
  });

  it('kontrollsak: har brevet P1 med fast sum, viser svaret til innsigelsen (VS-U77 punkt 6)', async () => {
    const { etter } = await leggTil(
      [medP1('regningsarbeid'), svaretForSent],
      medP1('tilbud', { belop: 50000 }),
      '2026-09-21',
      [nyttSvar]
    );
    expect(brevteksten(etter[0]!)).toContain('jf. innsigelsen');
  });

  it('viser P1 i en senere kravversjon til et varsel, står innsigelsen (OV-U120 vilkår 3)', async () => {
    const { u } = await leggTil(
      [medP1('regningsarbeid'), svaretForSent],
      medP1('regningsarbeid'),
      '2026-09-21',
      [
        { ...varselet, hjemmel: '34.3.3', sendt: '2026-09-26' },
        medP1('enhetspriser', { justert: true, varsel: 'V' }),
      ]
    );
    expect(u?.begrensninger).toEqual([]);
    expect(forSent(u)).toHaveLength(1);
  });

  it('med journalen kuttet foran det eldre kravet, som skjemaet leser et brev, står innsigelsen (VS-U81, MM-U50)', async () => {
    const { utfall, u } = await leggTil(
      [medP1('regningsarbeid'), svaretForSent],
      medP1('regningsarbeid'),
      '2026-09-21'
    );
    const lagtTil = kravetIRaden(utfall, u).dokument;
    const i = u!.journal.findIndex((h) => h.art === 'dokument' && h.dokument.id === lagtTil);
    expect(forSent({ ...u!, journal: u!.journal.slice(0, i) })).toHaveLength(1);
  });

  it('kontrollsak: har brevet P1 med fast sum, står innsigelsen (OV-U120 vilkår 1, VS-U80)', async () => {
    const { u } = await leggTil(
      [medP1('regningsarbeid'), svaretForSent],
      medP1('tilbud', { belop: 50000 }),
      '2026-09-21'
    );
    expect(forSent(u)).toHaveLength(1);
  });

  it('kontrollsak: er brevet sendt etter kravversjonen som er varselet, står innsigelsen (OV-U120 vilkår 5)', async () => {
    const { u } = await leggTil(
      [
        medP1('regningsarbeid'),
        { handling: 'tiden_gaar', til: '2026-09-27' },
        svaretForSent,
        medP1('regningsarbeid'),
      ],
      medP1('regningsarbeid'),
      '2026-09-26'
    );
    expect(forSent(u)).toHaveLength(1);
  });
});
