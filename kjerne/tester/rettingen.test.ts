/**
 * Totalentreprenørens retting av datoen for et varsel eller et krav sendt utenfor løsningen og lagt
 * til som korrespondanse (BF-50, #1309 punkt 8 og 18). Kildene er punkt 8 og 18–24 i samlevedtaket
 * for retting av sendt brev (MM-U59), MM-U63 (rettingen gjelder straks, også til en
 * tidligere dato), VS-U58, VS-U86 og EO-U39 punkt 68. Avvisningene når
 * datoen er etter brevets dato, og når kravdatoen er før datoen i påberopelsen, er arbeidsvalgene i
 * D-7 i BF-50. Brevet med rettingen er U-3 og D-9 i BF-50, og varselsetningen i kravet LV-U83,
 * endret av MM-U63.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { datoenSomGjelder, varseletForNyttSvar, type Utledning } from '../utledning/utled.ts';
import { regnUtSvar } from '../frosset/utregning.ts';
import { laastTekst } from '../kommandoer/skriving.ts';
import { tilbudte } from '../kommandoer/handlinger.ts';
import { KJERNE } from '../versjon.ts';
import { SOM_BREV } from './brevet.ts';
import {
  type Data,
  FRISTKRAV,
  FRIST_FULLT,
  fristforlengelse,
  medFristen,
  PAABEROPELSE,
  sak,
  sakMedKrav,
  svar,
  varseletIFristkravet,
} from './brevsak.ts';

type Sak = ReturnType<typeof sak>;

/** Datoen i påberopelsen er 25. september 2026 (`MOTTATT` i `brevsak.ts`). */
const registrer = (hjemmel: string, sendt: string) => ({
  type: 'varsel',
  ...SOM_BREV,
  varsler: [{ hjemmel }],
  sendt,
  dokumentasjon: [randomUUID()],
});
const fristkravLagtTil = (sendt: string) => ({
  type: 'krav',
  spor: 'frist',
  innhold: { frister: [{ navn: 'Sluttfristen', dager: 20 }] },
  sendt,
  ...SOM_BREV,
  dokumentasjon: [randomUUID()],
});
const retting = (gjelder: string, dato: string) => ({ type: 'retting', gjelder, dato });
/** TE sender rettingen. Gir ID-en til rettingen. */
const rett = (s: Sak, gjelder: string, dato: string): string =>
  utsagnet(s.send('TE', retting(gjelder, dato)));
/** En retting skrevet uten kommandoen, slik leseren kan møte den. */
const rettingUtenomKommandoen = (s: Sak, gjelder: string, dato: string): void => {
  s.rad('TE', { utsagn: [{ id: randomUUID(), art: 'retting', gjelder, dato }] });
};
const utsagnet = (rad: { data: Data }): string => (rad.data.utsagn as Data[])[0].id as string;
const kravet = (rad: { data: Data }): string => (rad.data.krav as Data[])[0].id as string;
const datoen = (u: Utledning, id: string) => {
  const e = Object.values(u.spor)
    .flatMap((s) => [...s.krav, ...s.kravUtenforRekken, ...Object.values(s.varsler)])
    .find((x) => x?.id === id);
  expect(e, `Forutsetning: ${id} står i saken`).toBeDefined();
  return datoenSomGjelder(u, e!);
};

/** Påberopelsen i brev 1 og varselet om fristforlengelse lagt til, sendt 28. september. */
function medVarselet() {
  const s = sak();
  s.send('TE', PAABEROPELSE);
  const varselet = utsagnet(s.send('TE', registrer('33.4', '2026-09-28')));
  return { s, varselet };
}

describe('rettingen viser til et varsel eller et krav lagt til (MM-U59 punkt 8 og 18, D-1 og D-2 i BF-50)', () => {
  it('variant A: et varsel lagt til som korrespondanse kan rettes', () => {
    const { s, varselet } = medVarselet();
    expect(s.avvist('TE', retting(varselet, '2026-10-01'))).toBeNull();
  });

  it('variant C: et krav lagt til med kategorien krav kan rettes', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const krav = kravet(s.send('TE', fristkravLagtTil('2026-09-30')));
    expect(s.avvist('TE', retting(krav, '2026-09-27'))).toBeNull();
  });

  it('D-2: et varsel sendt fra løsningen rettes ikke, og kontrollsaken er varselet lagt til fra kravskjemaet', () => {
    const s = sakMedKrav();
    expect(s.avvisning('TE', retting(s.krav('frist'), '2026-09-27'))).toMatchObject({
      regel: 'UGYLDIG_HENVISNING',
      melding:
        'Datoen kan bare rettes for et varsel eller et krav totalentreprenøren har sendt utenfor løsningen og lagt til.',
    });
    const varselet = varseletIFristkravet(s).id as string;
    expect(s.avvist('TE', retting(varselet, '2026-09-27'))).toBeNull();
  });

  it('D-2: et varsel sendt fra løsningen rettes ikke', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varselet = utsagnet(
      s.send('TE', { type: 'send_varsel', varsler: [{ hjemmel: '33.4' }] })
    );
    expect(s.avvist('TE', retting(varselet, '2026-09-28'))).toBe('UGYLDIG_HENVISNING');
  });

  it('D-1: byggherren kan ikke sende rettingen', () => {
    const { s, varselet } = medVarselet();
    expect(s.avvist('BH', retting(varselet, '2026-10-01'))).not.toBeNull();
    expect(s.avvist('BH', retting(varselet, '2026-10-01'))).not.toBeNull();
  });

  it('leseren: en retting som viser til et varsel sendt fra løsningen, gjør saken ikke forstått', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varselet = utsagnet(
      s.send('TE', { type: 'send_varsel', varsler: [{ hjemmel: '33.4' }] })
    );
    rettingUtenomKommandoen(s, varselet, '2026-09-28');
    expect(s.u().forstaatt).toBe(false);
    expect(s.u().begrensninger.map((b) => b.grunn)).toContain(
      'rettingen viser ikke til et varsel eller et krav totalentreprenøren har lagt til før den'
    );
  });

  it('leseren: en retting som ikke står alene i brevet, gjør saken ikke forstått (U-3 i BF-50)', () => {
    const { s, varselet } = medVarselet();
    s.rad('TE', {
      utsagn: [
        { id: randomUUID(), art: 'retting', gjelder: varselet, dato: '2026-10-01' },
        { id: randomUUID(), art: 'retting', gjelder: varselet, dato: '2026-10-02' },
      ],
    });
    expect(s.u().forstaatt).toBe(false);
    expect(s.u().begrensninger.map((b) => b.grunn)).toContain(
      'rettingen av datoen står ikke alene i brevet'
    );
  });

  it('kontrollsak for leseren: en retting av varselet lagt til gjør saken forstått', () => {
    const { s, varselet } = medVarselet();
    rett(s, varselet, '2026-10-01');
    expect(s.u().forstaatt).toBe(true);
  });
});

describe('datoen som gjelder (MM-U59 punkt 8 og 18, MM-U63, D-3 og D-4 i BF-50)', () => {
  it('variant A: en senere dato gjelder straks', () => {
    const { s, varselet } = medVarselet();
    const id = rett(s, varselet, '2026-10-01');
    expect(datoen(s.u(), varselet)).toBe('2026-10-01');
    expect(s.u().rettinger).toMatchObject([{ id, gjelder: varselet, dato: '2026-10-01' }]);
  });

  it('variant B: en tidligere dato gjelder også straks, uten byggherrens aksept', () => {
    const { s, varselet } = medVarselet();
    rett(s, varselet, '2026-09-26');
    expect(datoen(s.u(), varselet)).toBe('2026-09-26');
  });

  it('D-4: datoen som gjelder, er den i den siste rettingen', () => {
    const { s, varselet } = medVarselet();
    rett(s, varselet, '2026-10-01');
    rett(s, varselet, '2026-09-26');
    expect(datoen(s.u(), varselet)).toBe('2026-09-26');
  });

  it('kontrollsak: rettingen av ett varsel endrer ikke datoen for et annet', () => {
    const { s, varselet } = medVarselet();
    const krav = kravet(s.send('TE', fristkravLagtTil('2026-09-30')));
    rett(s, varselet, '2026-10-01');
    expect(datoen(s.u(), krav)).toBe('2026-09-30');
  });

  it('VS-U86: det første varselet skifter når varselet rettes til en dag etter kravet', () => {
    const { s, varselet } = medVarselet();
    const krav = kravet(s.send('TE', fristkravLagtTil('2026-09-30')));
    expect(varseletForNyttSvar(s.u(), '33.4')).toBe(varselet);
    rett(s, varselet, '2026-10-01');
    expect(varseletForNyttSvar(s.u(), '33.4')).toBe(krav);
  });

  it('VS-U86: det første varselet skifter også når varselet rettes til en dag før kravet', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varselet = utsagnet(s.send('TE', registrer('33.4', '2026-10-01')));
    const krav = kravet(s.send('TE', fristkravLagtTil('2026-09-30')));
    expect(varseletForNyttSvar(s.u(), '33.4')).toBe(krav);
    rett(s, varselet, '2026-09-29');
    expect(varseletForNyttSvar(s.u(), '33.4')).toBe(varselet);
  });

  it('punkt 8: et svar sendt før rettingen står med varselet det gjaldt, og saken er forstått', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varselet = utsagnet(s.send('TE', registrer('33.4', '2026-10-01')));
    s.send('TE', fristkravLagtTil('2026-09-30'));
    const u = s.u();
    const krav = u.spor.frist.gjeldendeKrav!;
    const v = medFristen({ ...FRIST_FULLT[0], frist_varsel_ok: false });
    s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          krav.id,
          v,
          regnUtSvar(
            'frist',
            v,
            { krav, paaberopelse: u.spor.forhold.gjeldendeKrav },
            KJERNE.regler
          )
        ),
      ],
    });
    const rettidighet = () =>
      s.u().spor.frist.gjeldendeSvar!.standpunkter.find((p) => p.art === 'rettidighet');
    expect(rettidighet()).toMatchObject({ hjemmel: '33.4', gjelder: krav.id });
    // Kravet rettes til en dag etter varselet, og varselet blir det første for et nytt svar.
    rett(s, krav.id, '2026-10-02');
    expect(s.u().begrensninger).toEqual([]);
    expect(rettidighet()).toMatchObject({ gjelder: krav.id });
    expect(varseletForNyttSvar(s.u(), '33.4')).toBe(varselet);
  });
});

describe('et svar lagt til før rettingen (MM-U59 punkt 8, OV-U98)', () => {
  it('et svar lagt til, oppgitt sendt før rettingen, står med varselet som gjaldt den dagen', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varselet = utsagnet(s.send('TE', registrer('33.4', '2026-09-28')));
    s.send('TE', fristkravLagtTil('2026-09-30'));
    // Rettingen sendes 5. oktober, og varselet er da ikke lenger det første.
    rett(s, varselet, '2026-10-01');
    const u = s.u();
    const krav = u.spor.frist.gjeldendeKrav!;
    expect(varseletForNyttSvar(u, '33.4'), 'Forutsetning: kravet er det første nå').toBe(krav.id);
    const v = medFristen({ ...FRIST_FULLT[0], frist_varsel_ok: false });
    const utregning = regnUtSvar(
      'frist',
      v,
      { krav, paaberopelse: u.spor.forhold.gjeldendeKrav },
      KJERNE.regler
    );
    s.send('BH', {
      type: 'brev',
      ...SOM_BREV,
      sendt: '2026-10-03',
      dokumentasjon: [randomUUID()],
      svar: [svar('frist', krav.id, v, utregning, null)],
    });
    const rettidighet = s
      .u()
      .spor.frist.gjeldendeSvar!.standpunkter.find((p) => p.art === 'rettidighet');
    expect(rettidighet).toMatchObject({ hjemmel: '33.4', gjelder: varselet });
    expect(s.u().begrensninger).toEqual([]);
  });
});

describe('et svar lagt til før en retting til en tidligere dato (MM-U59 punkt 8, OV-U98)', () => {
  it('et svar lagt til, oppgitt sendt før rettingen, står med kravet som var det første varselet den dagen', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varselet = utsagnet(s.send('TE', registrer('33.4', '2026-10-01')));
    s.send('TE', fristkravLagtTil('2026-09-30'));
    // Rettingen sendes 5. oktober, og varselet blir da det første.
    rett(s, varselet, '2026-09-29');
    const u = s.u();
    const krav = u.spor.frist.gjeldendeKrav!;
    expect(varseletForNyttSvar(u, '33.4'), 'Forutsetning: varselet er det første nå').toBe(
      varselet
    );
    const v = medFristen({ ...FRIST_FULLT[0], frist_varsel_ok: false });
    const utregning = regnUtSvar(
      'frist',
      v,
      { krav, paaberopelse: u.spor.forhold.gjeldendeKrav },
      KJERNE.regler
    );
    s.send('BH', {
      type: 'brev',
      ...SOM_BREV,
      sendt: '2026-10-03',
      dokumentasjon: [randomUUID()],
      svar: [svar('frist', krav.id, v, utregning, null)],
    });
    const rettidighet = s
      .u()
      .spor.frist.gjeldendeSvar!.standpunkter.find((p) => p.art === 'rettidighet');
    expect(rettidighet).toMatchObject({ hjemmel: '33.4', gjelder: krav.id });
    expect(s.u().begrensninger).toEqual([]);
  });
});

describe('avvisningene (D-7 i BF-50)', () => {
  it('MM-U63: en retting til datoen som gjelder, avvises og nevner datoen', () => {
    const { s, varselet } = medVarselet();
    expect(s.avvisning('TE', retting(varselet, '2026-09-28'))).toEqual({
      regel: 'DATOEN_ER_UENDRET',
      melding:
        'Datoen som gjelder for varselet etter punkt 33.4, er alt 28. september 2026. Rettingen må oppgi en annen dato.',
    });
  });

  it('D-4: etter en senere retting sammenlignes den nye med datoen som gjelder', () => {
    const { s, varselet } = medVarselet();
    rett(s, varselet, '2026-10-01');
    expect(s.avvist('TE', retting(varselet, '2026-10-01'))).toBe('DATOEN_ER_UENDRET');
    expect(s.avvist('TE', retting(varselet, '2026-09-28'))).toBeNull();
  });

  it('VS-U58: en varseldato før datoen i påberopelsen avvises og nevner begge datoene', () => {
    const { s, varselet } = medVarselet();
    expect(s.avvisning('TE', retting(varselet, '2026-09-24'))).toEqual({
      regel: 'VARSEL_FOER_GRUNNLAGSDATOEN',
      melding:
        'Varselet etter punkt 33.4 er oppgitt sendt 24. september 2026, før datoen pålegget ble mottatt, 25. september 2026, slik totalentreprenøren har oppgitt den i påberopelsen.',
    });
  });

  it('VS-U58, kontrollsak: samme dag som datoen i påberopelsen godtas', () => {
    const { s, varselet } = medVarselet();
    expect(s.avvist('TE', retting(varselet, '2026-09-25'))).toBeNull();
  });

  it('arbeidsvalget i D-7: en kravdato før datoen i påberopelsen avvises når kravet er det første varselet', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const krav = kravet(s.send('TE', fristkravLagtTil('2026-09-30')));
    expect(s.avvisning('TE', retting(krav, '2026-09-24'))).toEqual({
      regel: 'VARSEL_FOER_GRUNNLAGSDATOEN',
      melding:
        'Den nye datoen for kravet om fristforlengelse, 24. september 2026, er før datoen pålegget ble mottatt, 25. september 2026, slik totalentreprenøren har oppgitt den i påberopelsen. Kravet er det første varselet etter punkt 33.4 løsningen kjenner.',
    });
    expect(s.avvist('TE', retting(krav, '2026-09-25'))).toBeNull();
  });

  it('arbeidsvalget i D-7: en dato etter brevets dato avvises', () => {
    const { s, varselet } = medVarselet();
    expect(s.avvisning('TE', retting(varselet, '2026-12-01'))).toMatchObject({
      regel: 'DATO_ETTER_BREVET',
    });
  });

  it('formen: datoen må være en dato', () => {
    const { s, varselet } = medVarselet();
    expect(s.avvist('TE', retting(varselet, '1. oktober'))).toBe('UGYLDIG_FORM');
  });
});

describe('lukket sak (MM-U59 punkt 24, EO-U39 punkt 68, D-8 i BF-50)', () => {
  it('variant E: rettingen godtas i en sak lukket etter GR-U27', () => {
    const s = sakMedKrav();
    const u = s.u();
    const forholdet = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
    s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'forhold',
          u.spor.forhold.gjeldendeKrav!.id,
          forholdet,
          regnUtSvar(
            'forhold',
            forholdet,
            { krav: u.spor.forhold.gjeldendeKrav!, paaberopelse: null },
            KJERNE.regler
          )
        ),
      ],
    });
    s.send('TE', {
      type: 'aksept',
      spor: 'forhold',
      svar: s.u().spor.forhold.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(s.u().forholdAvvist, 'Forutsetning: saken er lukket').toBe(true);
    const varselet = varseletIFristkravet(s).id as string;
    expect(s.avvist('TE', retting(varselet, '2026-09-27'))).toBeNull();
  });
});

describe('brevet med rettingen (U-3 og D-9 i BF-50)', () => {
  it('variant A: brevet nevner den nye datoen, varselet med henvisningen og datoen som gjaldt', () => {
    const { s, varselet } = medVarselet();
    const rad = s.send('TE', {
      ...retting(varselet, '2026-10-01'),
      utdypning: 'Feil i registreringen.',
    });
    expect(rad.data.brevtittel).toBe('Retting av varseldatoen i sak KOE-17');
    expect(laastTekst(rad)).toEqual([
      'Totalentreprenøren retter datoen for varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i totalentreprenørens brev av 28. september 2026 til 1. oktober 2026. Datoen som gjaldt, var 28. september 2026.',
    ]);
  });

  it('variant C: tittelen på rettingen av et krav sier kravdatoen', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const krav = kravet(s.send('TE', fristkravLagtTil('2026-09-30')));
    const rad = s.send('TE', retting(krav, '2026-09-27'));
    expect(rad.data.brevtittel).toBe('Retting av kravdatoen i sak KOE-17');
    expect(laastTekst(rad)).toEqual([
      'Totalentreprenøren retter datoen for kravet om fristforlengelse i totalentreprenørens brev av 30. september 2026 til 27. september 2026. Datoen som gjaldt, var 30. september 2026.',
    ]);
  });

  it('D-4: etter to rettinger nevner brevet datoen i den siste, med rettingen den kom fra', () => {
    const { s, varselet } = medVarselet();
    rett(s, varselet, '2026-09-30');
    rett(s, varselet, '2026-10-01');
    expect(laastTekst(s.send('TE', retting(varselet, '2026-09-27')))).toEqual([
      'Totalentreprenøren retter datoen for varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i totalentreprenørens brev av 28. september 2026 til 27. september 2026. Datoen som gjaldt, var 1. oktober 2026, etter rettingen i brev K201-KOE-017-03 av 5. oktober 2026.',
    ]);
  });
});

/** Fristkravet uten varselet fra kravskjemaet: varselet er lagt til før. */
const FRISTKRAV_FRA_LOESNINGEN = Object.fromEntries(
  Object.entries(FRISTKRAV).filter(([felt]) => felt !== 'varsel')
);

describe('varselet i et krav fra løsningen (LV-U83, endret av MM-U63)', () => {
  it('kravet oppgir datoen som gjelder og viser til rettingen', () => {
    const { s, varselet } = medVarselet();
    rett(s, varselet, '2026-10-01');
    expect(laastTekst(s.send('TE', FRISTKRAV_FRA_LOESNINGEN))).toEqual([
      '1. Varselet om fristforlengelse\n\nVarsel om fristforlengelse etter NS 8407 punkt\u00a033.4 ble gitt i totalentreprenørens brev av 28. september 2026. Totalentreprenøren har rettet datoen for varselet til 1. oktober 2026 i brev K201-KOE-017-02 av 4. oktober 2026.',
      fristforlengelse(2),
      '3. Begrunnelse',
    ]);
  });

  it('kontrollsak: uten en retting sier kravet datoen som før', () => {
    const { s } = medVarselet();
    expect(laastTekst(s.send('TE', FRISTKRAV_FRA_LOESNINGEN))).toEqual([
      '1. Varselet om fristforlengelse\n\nVarsel om fristforlengelse etter NS 8407 punkt\u00a033.4 ble gitt i totalentreprenørens brev av 28. september 2026.',
      fristforlengelse(2),
      '3. Begrunnelse',
    ]);
  });
});

describe('tilbudet (G-7 i BF-50, INV-MM-1)', () => {
  const rettinger = (s: Sak, part: 'TE' | 'BH') =>
    tilbudte(s.u(), part).filter((h) => h.type === 'rette_datoen');

  it('TE får tilbud om å rette datoen for varselet og kravet lagt til, i sporet de står i', () => {
    const { s, varselet } = medVarselet();
    const krav = kravet(s.send('TE', fristkravLagtTil('2026-09-30')));
    expect(rettinger(s, 'TE')).toEqual([
      {
        noekkel: `rette_datoen:${krav}`,
        type: 'rette_datoen',
        spor: 'frist',
        hjemmel: null,
        gjelder: krav,
      },
      {
        noekkel: `rette_datoen:${varselet}`,
        type: 'rette_datoen',
        spor: 'frist',
        hjemmel: null,
        gjelder: varselet,
      },
    ]);
    expect(rettinger(s, 'BH')).toEqual([]);
  });

  it('D-2: varselet og kravet sendt fra løsningen tilbys ikke, og avvisningen sier det samme', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varselet = utsagnet(
      s.send('TE', { type: 'send_varsel', varsler: [{ hjemmel: '33.4' }] })
    );
    expect(rettinger(s, 'TE')).toEqual([]);
    expect(s.avvist('TE', retting(varselet, '2026-09-28'))).toBe('UGYLDIG_HENVISNING');
    expect(s.avvist('TE', retting(s.krav('forhold'), '2026-09-28'))).toBe('UGYLDIG_HENVISNING');
  });
});

describe('VS-U38: varselet etter punkt 32.2 er ikke senere enn påberopelsen etter rettingen (D-7 i BF-50)', () => {
  /** Påberopelsen lagt til, sendt 30. september, og varselet etter § 32.2 lagt til, sendt 28. september. */
  function medPaaberopelsenLagtTil() {
    const s = sak();
    const paaberopelsen = kravet(
      s.send('TE', {
        type: 'krav',
        spor: 'forhold',
        innhold: PAABEROPELSE.innhold,
        sendt: '2026-09-30',
        ...SOM_BREV,
        dokumentasjon: [randomUUID()],
      })
    );
    const varselet = utsagnet(s.send('TE', registrer('32.2', '2026-09-28')));
    return { s, paaberopelsen, varselet };
  }

  it('varseldatoen rettes ikke til en dag etter påberopelsen, og samme dag godtas', () => {
    const { s, varselet } = medPaaberopelsenLagtTil();
    expect(s.avvisning('TE', retting(varselet, '2026-10-01'))).toEqual({
      regel: 'VARSEL_ETTER_PAABEROPELSEN',
      melding:
        'Varselet etter punkt 32.2 er oppgitt sendt 1. oktober 2026, etter påberopelsen av forholdet, som ble sendt 30. september 2026.',
    });
    expect(s.avvist('TE', retting(varselet, '2026-09-30'))).toBeNull();
  });

  it('påberopelsen rettes ikke til en dag før varselet, og samme dag godtas', () => {
    const { s, paaberopelsen } = medPaaberopelsenLagtTil();
    expect(s.avvisning('TE', retting(paaberopelsen, '2026-09-27'))).toEqual({
      regel: 'VARSEL_ETTER_PAABEROPELSEN',
      melding:
        'Den nye datoen for påberopelsen av forholdet, 27. september 2026, er før varselet etter punkt 32.2, som er oppgitt sendt 28. september 2026. Varselet kan ikke være sendt etter påberopelsen.',
    });
    expect(s.avvist('TE', retting(paaberopelsen, '2026-09-28'))).toBeNull();
  });
});

describe('varselet i et fristkrav etter en retting (LV-U83, OV-U123 punkt 12)', () => {
  it('fristkravet oppgir datoen som gjelder for varselet, ikke datoen først oppgitt', () => {
    const { s, varselet } = medVarselet();
    rett(s, varselet, '2026-10-01');
    expect(s.avvist('TE', { ...FRISTKRAV, varsel: { sendt: '2026-09-28' } })).toBe(
      'VARSEL_REGISTRERT'
    );
    expect(s.avvist('TE', { ...FRISTKRAV, varsel: { sendt: '2026-10-01' } })).toBeNull();
  });
});

describe('arbeidet i brevet med rettingen (VS-U87 punkt 27, U-3 i BF-50)', () => {
  it('brevet nevner arbeidet når brevet med varselet har flere varsler etter samme bestemmelse', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', {
      ...registrer('34.3.3', '2026-09-28'),
      varsler: [
        { hjemmel: '34.3.3', arbeid: 'Graving' },
        { hjemmel: '34.3.3', arbeid: 'Peling' },
      ],
    });
    const graving = utsagnet(rad);
    expect(laastTekst(s.send('TE', retting(graving, '2026-09-30')))).toEqual([
      'Totalentreprenøren retter datoen for varselet om justering av enhetsprisene etter NS 8407 punkt\u00a034.3.3 første ledd for arbeidet «Graving» i totalentreprenørens brev av 28. september 2026 til 30. september 2026. Datoen som gjaldt, var 28. september 2026.',
    ]);
  });
});
