/**
 * Totalentreprenørens retting av datoen for et varsel eller et krav sendt utenfor løsningen og lagt
 * til som korrespondanse (BF-50, #1309 punkt 8 og 18). Kildene er punkt 8 og 18–24 i samlevedtaket
 * for retting av sendt brev (MM-U59), svaret B 27.11 i #1309 (rettingen gjelder straks, også til en
 * tidligere dato), VS-U58, VS-U86 og EO-U39 punkt 68. Avvisningene når
 * datoen er etter brevets dato, og når kravdatoen er før datoen i påberopelsen, er arbeidsvalgene i
 * D-7 i BF-50. Brevet med rettingen er ikke bygget (G-8), så en retting kontrollene godtar, avvises
 * til slutt med `IKKE_I_FOERSTE_VERSJON`, og rettingene i journalen skrives med `rad`.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { datoenSomGjelder, varseletForNyttSvar, type Utledning } from '../utledning/utled.ts';
import { regnUtSvar } from '../frosset/utregning.ts';
import { KJERNE } from '../versjon.ts';
import { SOM_BREV } from './brevet.ts';
import {
  type Data,
  FRIST_FULLT,
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
/** En retting i journalen, skrevet uten kommandoen fordi brevet ikke er bygget (G-8). */
const rettingIJournalen = (s: Sak, gjelder: string, dato: string): string => {
  const id = randomUUID();
  s.rad('TE', { utsagn: [{ id, art: 'retting', gjelder, dato }] });
  return id;
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

/** Kontrollene har godtatt rettingen, og den avvises fordi brevet ikke er bygget (G-8). */
const GODTATT_AV_KONTROLLENE = 'IKKE_I_FOERSTE_VERSJON';

describe('rettingen viser til et varsel eller et krav lagt til (MM-U59 punkt 8 og 18, D-1 og D-2 i BF-50)', () => {
  it('variant A: et varsel lagt til som korrespondanse kan rettes', () => {
    const { s, varselet } = medVarselet();
    expect(s.avvist('TE', retting(varselet, '2026-10-01'))).toBe(GODTATT_AV_KONTROLLENE);
  });

  it('variant C: et krav lagt til med kategorien krav kan rettes', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const krav = kravet(s.send('TE', fristkravLagtTil('2026-09-30')));
    expect(s.avvist('TE', retting(krav, '2026-09-27'))).toBe(GODTATT_AV_KONTROLLENE);
  });

  it('D-2: et varsel sendt fra løsningen rettes ikke, og kontrollsaken er varselet lagt til fra kravskjemaet', () => {
    const s = sakMedKrav();
    expect(s.avvisning('TE', retting(s.krav('frist'), '2026-09-27'))).toMatchObject({
      regel: 'UGYLDIG_HENVISNING',
      melding:
        'Datoen kan bare rettes for et varsel eller et krav totalentreprenøren har sendt utenfor løsningen og lagt til.',
    });
    const varselet = varseletIFristkravet(s).id as string;
    expect(s.avvist('TE', retting(varselet, '2026-09-27'))).toBe(GODTATT_AV_KONTROLLENE);
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
    expect(s.avvist('BH', retting(varselet, '2026-10-01'))).not.toBe(GODTATT_AV_KONTROLLENE);
  });

  it('leseren: en retting som viser til et varsel sendt fra løsningen, gjør saken ikke forstått', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varselet = utsagnet(
      s.send('TE', { type: 'send_varsel', varsler: [{ hjemmel: '33.4' }] })
    );
    rettingIJournalen(s, varselet, '2026-09-28');
    expect(s.u().forstaatt).toBe(false);
    expect(s.u().begrensninger.map((b) => b.grunn)).toContain(
      'rettingen viser ikke til et varsel eller et krav totalentreprenøren har lagt til før den'
    );
  });

  it('kontrollsak for leseren: en retting av varselet lagt til gjør saken forstått', () => {
    const { s, varselet } = medVarselet();
    rettingIJournalen(s, varselet, '2026-10-01');
    expect(s.u().forstaatt).toBe(true);
  });
});

describe('datoen som gjelder (MM-U59 punkt 8 og 18, svaret B 27.11 i #1309, D-3 og D-4 i BF-50)', () => {
  it('variant A: en senere dato gjelder straks', () => {
    const { s, varselet } = medVarselet();
    const id = rettingIJournalen(s, varselet, '2026-10-01');
    expect(datoen(s.u(), varselet)).toBe('2026-10-01');
    expect(s.u().rettinger).toMatchObject([{ id, gjelder: varselet, dato: '2026-10-01' }]);
  });

  it('variant B: en tidligere dato gjelder også straks, uten byggherrens aksept', () => {
    const { s, varselet } = medVarselet();
    rettingIJournalen(s, varselet, '2026-09-26');
    expect(datoen(s.u(), varselet)).toBe('2026-09-26');
  });

  it('D-4: datoen som gjelder, er den i den siste rettingen', () => {
    const { s, varselet } = medVarselet();
    rettingIJournalen(s, varselet, '2026-10-01');
    rettingIJournalen(s, varselet, '2026-09-26');
    expect(datoen(s.u(), varselet)).toBe('2026-09-26');
  });

  it('kontrollsak: rettingen av ett varsel endrer ikke datoen for et annet', () => {
    const { s, varselet } = medVarselet();
    const krav = kravet(s.send('TE', fristkravLagtTil('2026-09-30')));
    rettingIJournalen(s, varselet, '2026-10-01');
    expect(datoen(s.u(), krav)).toBe('2026-09-30');
  });

  it('VS-U86: det første varselet skifter når varselet rettes til en dag etter kravet', () => {
    const { s, varselet } = medVarselet();
    const krav = kravet(s.send('TE', fristkravLagtTil('2026-09-30')));
    expect(varseletForNyttSvar(s.u(), '33.4')).toBe(varselet);
    rettingIJournalen(s, varselet, '2026-10-01');
    expect(varseletForNyttSvar(s.u(), '33.4')).toBe(krav);
  });

  it('VS-U86: det første varselet skifter også når varselet rettes til en dag før kravet', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varselet = utsagnet(s.send('TE', registrer('33.4', '2026-10-01')));
    const krav = kravet(s.send('TE', fristkravLagtTil('2026-09-30')));
    expect(varseletForNyttSvar(s.u(), '33.4')).toBe(krav);
    rettingIJournalen(s, varselet, '2026-09-29');
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
    rettingIJournalen(s, krav.id, '2026-10-02');
    expect(s.u().begrensninger).toEqual([]);
    expect(rettidighet()).toMatchObject({ gjelder: krav.id });
    expect(varseletForNyttSvar(s.u(), '33.4')).toBe(varselet);
  });
});

describe('avvisningene (D-7 i BF-50)', () => {
  it('svaret B 27.11 i #1309: en retting til datoen som gjelder, avvises og nevner datoen', () => {
    const { s, varselet } = medVarselet();
    expect(s.avvisning('TE', retting(varselet, '2026-09-28'))).toEqual({
      regel: 'DATOEN_ER_UENDRET',
      melding:
        'Datoen som gjelder for varselet etter punkt 33.4, er alt 28. september 2026. Rettingen må oppgi en annen dato.',
    });
  });

  it('D-4: etter en senere retting sammenlignes den nye med datoen som gjelder', () => {
    const { s, varselet } = medVarselet();
    rettingIJournalen(s, varselet, '2026-10-01');
    expect(s.avvist('TE', retting(varselet, '2026-10-01'))).toBe('DATOEN_ER_UENDRET');
    expect(s.avvist('TE', retting(varselet, '2026-09-28'))).toBe(GODTATT_AV_KONTROLLENE);
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
    expect(s.avvist('TE', retting(varselet, '2026-09-25'))).toBe(GODTATT_AV_KONTROLLENE);
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
    expect(s.avvist('TE', retting(krav, '2026-09-25'))).toBe(GODTATT_AV_KONTROLLENE);
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
  it('variant E: rettingen godtas av kontrollene i en sak lukket etter GR-U27', () => {
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
    expect(s.avvist('TE', retting(varselet, '2026-09-27'))).toBe(GODTATT_AV_KONTROLLENE);
  });
});
