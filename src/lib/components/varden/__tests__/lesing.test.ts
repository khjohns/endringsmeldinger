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
import { brevene, kravposterUtenFastBeloep, standpunktene } from '$lib/components/varden/lesing';
import { STILLING } from '$lib/components/varden/tekster';

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
    vurdering: 'godkjent',
    godkjent_belop: post === 'P1' ? 100000 : 40000,
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
    return STILLING.beloepet(
      utfall.beloep!,
      kravposterUtenFastBeloep(utfall, s.gjeldendeKrav),
      svarbrevet
    );
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
