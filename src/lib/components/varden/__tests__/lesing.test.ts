/**
 * Lagene i et sendt svar slik brevet ga dem (OV-U32, OV-U33). Grunnene fra svaret på forholdet
 * står foran sporet når brevet hadde dem foran seg, og et svar på forholdet revidert etter
 * brevet endrer ikke det brevet sa (vedtaket 05.10: at svaret er subsidiært til forholdet, er
 * en relasjon som vises for seg, `subsidiaer`). Forventningen i hver sak er linja i det frosne
 * brevet, `beslutningsgrunnlag.linje`, som brevteksten skriver.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from '$kjerne/tester/bane';
import { kjoer, type Forloep } from '$kjerne/tester/kjoerer';
import type { Handling } from '$kjerne/tester/klient';
import { kroner } from '$kjerne/frosset/tekst';
import {
  brevene,
  kravposterUtenFastBeloep,
  standpunktene,
  tilknyttetKrav,
} from '$lib/components/varden/lesing';
import { leselinjene, STILLING } from '$lib/components/varden/tekster';
import { kravposterI } from '$kjerne/spor/vederlag/format';

async function utledning(steg: Handling[]) {
  const forloep: Forloep = { id: 'lagene', rader: [], start: null, steg, kontroller: [] };
  const k = await kjoer(forloep, minnebane({ sakstittel: 'Fasaden' }));
  return k.utledning();
}

const PAABEROPELSE: Handling = {
  handling: 'krav',
  spor: 'forhold',
  underkategori: 'irregulaer_endring',
  navn: 'K-g1',
};
const VEDERLAG: Handling = { handling: 'krav', spor: 'vederlag', belop: 100000, navn: 'K-v1' };
const forholdet = (resultat: string) => ({
  spor: 'forhold',
  navn: 'S-g1',
  resultat,
  varslet_i_tide: true,
});
const vederlaget = { spor: 'vederlag', navn: 'S-v1', vurdering: 'delvis', godkjent_belop: 60000 };
const brevet = (...svar: Record<string, unknown>[]): Handling => ({
  handling: 'brev',
  navn: 'D3',
  svar,
});
const revisjon = (resultat: string): Handling => ({
  handling: 'revisjon',
  spor: 'forhold',
  navn: 'S-g2',
  dokument: 'D4',
  resultat,
  varslet_i_tide: true,
});

/** Linjene i svaret på vederlaget, med grunnen eller standpunktet og etiketten. */
async function linjene(steg: Handling[]) {
  const u = await utledning(steg);
  const svar = u.spor.vederlag.svar[0];
  return {
    linje: svar.beslutningsgrunnlag.linje,
    subsidiaer: u.spor.vederlag.subsidiaer,
    linjer: standpunktene(svar, u).map((l) =>
      'grunn' in l ? [l.grunn, l.lag] : [l.standpunkt.art, l.lag]
    ),
  };
}

const MED_AVSLAGET = [
  ['avslaatt', 'prinsipalt'],
  ['oppgjoersform', 'subsidiært'],
  ['beloep', 'subsidiært'],
];
const UTEN_LAG = [
  ['oppgjoersform', null],
  ['beloep', null],
];

describe('lagene i svaret på vederlaget følger brevet (OV-U32, OV-U33)', () => {
  it('forholdet avslått i samme brev: avslaget står prinsipalt og beløpet subsidiært', async () => {
    const l = await linjene([PAABEROPELSE, VEDERLAG, brevet(forholdet('avslaatt'), vederlaget)]);
    expect(l.linje).toBe(`Byggherrens standpunkt: subsidiært godkjent med ${kroner(60000)}.`);
    expect(l.linjer).toEqual(MED_AVSLAGET);
  });

  it('forholdet godkjent i brevet og senere revidert til avslått: brevet hadde ingen lag', async () => {
    const l = await linjene([
      PAABEROPELSE,
      VEDERLAG,
      brevet(forholdet('godkjent'), vederlaget),
      revisjon('avslaatt'),
    ]);
    expect(l.linje).toBe(`Byggherrens standpunkt: godkjent med ${kroner(60000)}.`);
    expect(l.linjer).toEqual(UTEN_LAG);
    // Relasjonen til det reviderte svaret vises for seg (vedtaket 05.10).
    expect(l.subsidiaer).toEqual(['avslaatt']);
  });

  it('forholdet avslått i brevet og senere revidert til godkjent: beløpet står fortsatt subsidiært', async () => {
    const l = await linjene([
      PAABEROPELSE,
      VEDERLAG,
      brevet(forholdet('avslaatt'), vederlaget),
      revisjon('godkjent'),
    ]);
    expect(l.linje).toBe(`Byggherrens standpunkt: subsidiært godkjent med ${kroner(60000)}.`);
    expect(l.linjer).toEqual(MED_AVSLAGET);
  });

  it('et utkast i forhåndsvisningen etter at forholdet er avslått: lagene frysingen gir det (Vederlagssvar.svelte)', async () => {
    // `Vederlagssvar.svelte` gir `standpunktene` forhåndsvisningen med utkastet, som her er
    // saken etter at utkastet er sendt i et eget brev.
    const l = await linjene([
      PAABEROPELSE,
      VEDERLAG,
      brevet(forholdet('avslaatt')),
      { handling: 'brev', navn: 'D4', svar: [vederlaget] },
    ]);
    expect(l.linje).toBe(`Byggherrens standpunkt: subsidiært godkjent med ${kroner(60000)}.`);
    expect(l.linjer).toEqual(MED_AVSLAGET);
  });

  it('en ny påberopelsesversjon venter på svar: lagene står som brevet ga dem', async () => {
    const l = await linjene([
      PAABEROPELSE,
      VEDERLAG,
      brevet(forholdet('avslaatt'), vederlaget),
      { ...PAABEROPELSE, navn: 'K-g2' },
    ]);
    expect(l.linje).toBe(`Byggherrens standpunkt: subsidiært godkjent med ${kroner(60000)}.`);
    expect(l.linjer).toEqual(MED_AVSLAGET);
  });
});

describe('beløpet og kravpostene uten fast beløp i aksepten (OV-U73, svar 6 A i #1663)', () => {
  const KRAVET: Handling = {
    handling: 'krav',
    spor: 'vederlag',
    navn: 'K-v1',
    kravposter: [{ belop: 100000 }, { belop: 40000 }],
  };
  const regningsarbeid = (post: string) => ({
    post,
    metode_akseptert: false,
    oensket_metode: 'regningsarbeid',
  });
  const fastSum = (post: string) => ({
    post,
    vurdering: 'godkjent',
    godkjent_belop: post === 'P1' ? 100000 : 40000,
  });

  /** Linjene om beløpet i aksepten, av enigheten kjernen registrerer etter svaret. */
  async function linjeneOmBeloepet(kravposter: Record<string, unknown>[], godtar = true) {
    const u = await utledning([
      PAABEROPELSE,
      KRAVET,
      brevet(forholdet('godkjent'), { spor: 'vederlag', navn: 'S-v1', kravposter }),
      ...(godtar ? [{ handling: 'aksept', spor: 'vederlag', navn: 'A-v1' } as Handling] : []),
    ]);
    const s = u.spor.vederlag;
    expect(s.enighet, 'Forutsetning: partene er enige om vederlaget').not.toBeNull();
    const utfall = s.enighet!.grunnlag.utfall;
    const svarbrevet = brevene(u).find((b) => b.id === s.gjeldendeSvar!.dokument)!;
    return STILLING.beloepet(utfall.beloep!, kravposterUtenFastBeloep(utfall, s.krav), svarbrevet);
  }

  it('en kravpost BH mener skal gjøres opp som regningsarbeid, navngis med betegnelsen ved siden av beløpet for den andre', async () => {
    expect(await linjeneOmBeloepet([fastSum('P1'), regningsarbeid('P2')])).toEqual([
      `Godtar du, er beløpet dere er enige om for vederlagsjusteringen ${kroner(100000)}, etter brev 3 slik det ble sendt.`,
      'P2 har ikke et fast beløp prinsipalt og er ikke regnet med i beløpet.',
    ]);
  });

  it('uten noen kravpost med fast beløp navngis kravpostene, og 0 kr står ikke', async () => {
    const linjene = await linjeneOmBeloepet([regningsarbeid('P1'), regningsarbeid('P2')]);
    expect(linjene).toEqual([
      'Godtar du, har P1 og P2 ikke et fast beløp prinsipalt, og dere er ikke enige om et beløp for dem.',
    ]);
  });

  it('kontrollsak: BH godkjenner begge kravpostene med fast sum, enigheten registreres uten aksept, og bare beløpet står', async () => {
    expect(await linjeneOmBeloepet([fastSum('P1'), fastSum('P2')], false)).toEqual([
      `Godtar du, er beløpet dere er enige om for vederlagsjusteringen ${kroner(140000)}, etter brev 3 slik det ble sendt.`,
    ]);
  });
});

describe('leselinjene i den lukkede kravposten (prototype v3, `leselinje`; KA-U57)', () => {
  it('linjene er korte og navngir ikke kravposten, og uten aksept av tilbudet står ingen linje for beløpet (KA-U72)', async () => {
    const u = await utledning([
      PAABEROPELSE,
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        kravposter: [{ belop: 100000 }, { belop: 40000 }],
      },
      brevet(forholdet('godkjent'), {
        spor: 'vederlag',
        navn: 'S-v1',
        kravposter: [
          { post: 'P1', vurdering: 'godkjent', godkjent_belop: 100000 },
          {
            post: 'P2',
            metode_akseptert: false,
            oensket_metode: 'regningsarbeid',
          },
        ],
      }),
    ]);
    const svar = u.spor.vederlag.svar[0];
    const [p1, p2] = kravposterI(u.spor.vederlag.gjeldendeKrav!);
    const linjer = standpunktene(svar, u);
    expect(leselinjene(linjer, p1!)).toEqual([
      'Godkjenner fast sum (punkt 34.2.1)',
      `${kroner(100000)}, godkjent som krevd`,
    ]);
    expect(leselinjene(linjer, p2!)).toEqual(['Mener regningsarbeid (punkt 34.4)']);
  });
});

describe('«Tilknyttede krav» og postene uten fast beløp (#1752 punkt 2, oppdragsgiver 12.11)', () => {
  const svaretPaaPostene = (...poster: Record<string, unknown>[]) =>
    brevet(forholdet('godkjent'), { spor: 'vederlag', navn: 'S-v1', kravposter: poster });
  const ikkeAkseptert = (post: string) => ({
    post,
    metode_akseptert: false,
    oensket_metode: 'regningsarbeid',
  });
  const TO_POSTER: Handling = {
    handling: 'krav',
    spor: 'vederlag',
    navn: 'K-v1',
    kravposter: [{ belop: 100000 }, { belop: 40000 }],
  };

  it('med to kravposter der tilbudet for P2 ikke er akseptert, er byggherrens beløp summen for P1, og én post er uten fast beløp (KA-U72)', async () => {
    const u = await utledning([
      PAABEROPELSE,
      TO_POSTER,
      svaretPaaPostene(
        { post: 'P1', vurdering: 'godkjent', godkjent_belop: 100000 },
        ikkeAkseptert('P2')
      ),
    ]);
    const svaret = tilknyttetKrav(u, 'vederlag').svaret!;
    expect(svaret.poster).toEqual([{ tall: 100000, lag: null }]);
    expect(svaret.utenFast).toBe(1);
  });

  it('med to godkjente kravposter er byggherrens beløp summen av dem, og ingen post er uten fast beløp', async () => {
    const u = await utledning([
      PAABEROPELSE,
      TO_POSTER,
      svaretPaaPostene(
        { post: 'P1', vurdering: 'godkjent', godkjent_belop: 100000 },
        { post: 'P2', vurdering: 'delvis', godkjent_belop: 30000 }
      ),
    ]);
    const svaret = tilknyttetKrav(u, 'vederlag').svaret!;
    expect(svaret.poster).toEqual([{ tall: 130000, lag: null }]);
    expect(svaret.utenFast).toBe(0);
  });

  it('med én kravpost uten aksept har svaret ingen beløp og én post uten fast beløp (KA-U72)', async () => {
    const u = await utledning([
      PAABEROPELSE,
      { handling: 'krav', spor: 'vederlag', navn: 'K-v1', kravposter: [{ belop: 100000 }] },
      svaretPaaPostene(ikkeAkseptert('P1')),
    ]);
    const svaret = tilknyttetKrav(u, 'vederlag').svaret!;
    expect(svaret.poster).toEqual([]);
    expect(svaret.utenFast).toBe(1);
  });

  it('når byggherren gjør gjeldende at varselet om vederlaget kom for sent, er kravposten der tilbudet ikke er akseptert, fortsatt uten fast beløp, som i brevet (KA-U72)', async () => {
    const u = await utledning([
      // § 34.1.2 gjelder svikt og andre forhold, som grunnforholdene.
      { ...PAABEROPELSE, hovedkategori: 'svikt', underkategori: 'grunnforhold' },
      TO_POSTER,
      brevet(
        { spor: 'forhold', navn: 'S-g1', resultat: 'godkjent' },
        {
          spor: 'vederlag',
          navn: 'S-v1',
          varslet_i_tide: false,
          kravposter: [
            { post: 'P1', vurdering: 'godkjent', godkjent_belop: 100000 },
            ikkeAkseptert('P2'),
          ],
        }
      ),
    ]);
    expect(tilknyttetKrav(u, 'vederlag').svaret!.utenFast).toBe(1);
  });

  it('kontrollsak: når tilbudet er akseptert, er ingen post uten fast beløp', async () => {
    const u = await utledning([
      PAABEROPELSE,
      { handling: 'krav', spor: 'vederlag', navn: 'K-v1', kravposter: [{ belop: 100000 }] },
      svaretPaaPostene({ post: 'P1', vurdering: 'godkjent', godkjent_belop: 100000 }),
    ]);
    expect(tilknyttetKrav(u, 'vederlag').svaret!.utenFast).toBe(0);
  });

  it('i kravet er summen de faste beløpene, og en kravpost etter en beregningsregel er uten fast beløp (KA-U61, BF-14 U-5)', async () => {
    const u = await utledning([
      PAABEROPELSE,
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        kravposter: [{ belop: 100000 }, { oppgjoersform: 'regningsarbeid' }],
      },
    ]);
    const krevd = tilknyttetKrav(u, 'vederlag').krevd!;
    expect(krevd.tall).toBe(100000);
    expect(krevd.utenFast).toBe(1);
  });

  it('har ingen kravpost et fast beløp, har kravet ikke et tall, og postene er uten fast beløp (KA-U61)', async () => {
    const u = await utledning([
      PAABEROPELSE,
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        kravposter: [{ oppgjoersform: 'regningsarbeid' }],
      },
    ]);
    const krevd = tilknyttetKrav(u, 'vederlag').krevd!;
    expect(krevd.tall).toBeNull();
    expect(krevd.utenFast).toBe(1);
  });
});

describe('sporene et brev hører til, fra kjernen (#1663)', () => {
  it('et brev med en korrigering hører til forholdet, også når det korrigerer en korrigering (MM-U52)', async () => {
    const u = await utledning([
      PAABEROPELSE,
      { handling: 'korrigering', navn: 'D2', dato: '2026-09-20' },
      { handling: 'korrigering', navn: 'D3', dato: '2026-09-19' },
    ]);
    const korrigeringene = u.journal.flatMap((h) =>
      h.art === 'dokument' && h.dokument.utsagn.some((x) => x.art === 'korrigering')
        ? [h.dokument.id]
        : []
    );
    expect(korrigeringene, 'forutsetning: to brev med en korrigering').toHaveLength(2);
    const brev = brevene(u);
    for (const id of korrigeringene)
      expect(brev.find((b) => b.id === id)!.spor, id).toEqual(['forhold']);
  });
});
