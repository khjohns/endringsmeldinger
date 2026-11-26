/**
 * Kunnskapsdatoen etter § 34.1.3 annet ledd: datoen totalentreprenøren oppgir å ha blitt klar over
 * at økte utgifter på grunn av nedsatt produktivitet eller forstyrrelser ville påløpe (BF-48, #2012).
 * Kildene er punkt 9 og 11–16 i samlevedtaket for varslingsdatoen (VS-U86), punkt 12 og 24 i
 * samlevedtaket for retting av sendt brev (MM-U59), VS-U82–VS-U85 og designdelen i VS-U86.
 * Ordlyden i det egne brevet og i tittelen er designvalg (U-5 i BF-48). Saken i minnet er `sak()` i
 * `brevsak.ts`, og forløpet er `kjoer` med testklienten (G-9).
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { handlinger } from '../kommandoer/handlinger.ts';
import { lesJournal } from '../format/leser.ts';
import { sisteKunnskapsdato } from '../spor/vederlag/utledning.ts';
import { utledJournal } from '../utledning/utled.ts';
import { KJERNE } from '../versjon.ts';
import { minnebane } from './bane.ts';
import { SOM_BREV } from './brevet.ts';
import { kjoer, type Forloep } from './kjoerer.ts';
import type { Handling } from './klient.ts';
import { type Data, laast, PAABEROPELSE, sak, svar, tekst, utenFelt } from './brevsak.ts';

const PRODUKTIVITET = 'økte utgifter på grunn av nedsatt produktivitet eller forstyrrelser';
const VARSELET = `varselet om særskilt justering for nedsatt produktivitet eller forstyrrelser etter NS 8407 punkt\u00a034.1.3 tredje ledd`;
const OPPGIR = (dato: string) =>
  `Totalentreprenøren oppgir å ha blitt klar over at utgiftene ville påløpe ${dato}.`;

const sendVarsel = (dato?: string) => ({
  type: 'send_varsel',
  varsler: [{ hjemmel: '34.1.3' }],
  ...(dato ? { klar_over_utgiftene: dato } : {}),
});
const registrer = (sendt: string, dato?: string) => ({
  type: 'varsel',
  ...SOM_BREV,
  varsler: [{ hjemmel: '34.1.3' }],
  sendt,
  dokumentasjon: [randomUUID()],
  ...(dato ? { klar_over_utgiftene: dato } : {}),
});
const kravet = (dato?: string, beloep = 40000) => ({
  type: 'krav',
  spor: 'vederlag',
  innhold: {
    saerskilt: { produktivitet: { beloep, ...(dato ? { klar_over_utgiftene: dato } : {}) } },
  },
});
const kunnskapsdato = (s: ReturnType<typeof sak>, dato: string, gjelder?: string) => ({
  type: 'kunnskapsdato',
  gjelder: gjelder ?? varselet(s),
  klar_over_utgiftene: dato,
});
/** Det første varselet etter § 34.1.3, som handlingen gjelder. */
const varselet = (s: ReturnType<typeof sak>) =>
  handlinger(s.u(), 'TE')
    .find((h) => h.startsWith('oppgi_kunnskapsdato:'))
    ?.slice('oppgi_kunnskapsdato:'.length) ?? 'ingen';
const siste = (s: ReturnType<typeof sak>) => sisteKunnskapsdato(s.u())?.dato ?? null;

/** Påberopelsen i brev 1 (2. oktober). */
function medPaaberopelsen() {
  const s = sak();
  s.send('TE', PAABEROPELSE);
  return s;
}

/** Svaret på vederlagskravet der byggherren gjør gjeldende at varselet etter § 34.1.3 kom for sent. */
const forSent = (s: ReturnType<typeof sak>) => ({
  type: 'brev',
  svar: [
    svar(
      'vederlag',
      s.krav('vederlag'),
      {
        produktivitet_vurdering: 'godkjent',
        produktivitet_varslet_i_tide: false,
        produktivitet_begrenset_beloep: 10000,
      },
      { resultat: 'delvis_godkjent', godkjent_beloep: 10000 }
    ),
  ],
});

describe('datoen i brevet med varselet (VS-U86 punkt 12 og 13, VS-U82)', () => {
  it('variant A: det særskilte varselet fra løsningen har datoen etter varselet, og den er totalentreprenørens siste opplysning (U-3 i BF-48, designdelen)', () => {
    const s = medPaaberopelsen();
    const rad = s.send('TE', sendVarsel('2026-09-28'));
    const utsagn = (rad.data.utsagn as Data[])[0];
    expect(utsagn.klar_over_utgiftene).toBe('2026-09-28');
    expect(laast(rad)).toEqual([
      `Totalentreprenøren varsler etter NS 8407 punkt\u00a034.1.3 tredje ledd at totalentreprenøren vil kreve særskilt justering av vederlaget etter annet ledd for ${PRODUKTIVITET} på annet arbeid som følge av forholdet i sak KOE-17 («Endret fundamentering»). ${OPPGIR('28. september 2026')}`,
    ]);
    expect(s.u().kunnskapsdatoer).toEqual([
      { id: utsagn.id, dokument: rad.event_id, dato: '2026-09-28', blirSiste: true },
    ]);
  });

  it('kontrollsak: datoen er valgfri, og varselet uten den har ikke setningen (VS-U86 punkt 13)', () => {
    const s = medPaaberopelsen();
    const rad = s.send('TE', sendVarsel());
    expect((rad.data.utsagn as Data[])[0]).not.toHaveProperty('klar_over_utgiftene');
    expect(laast(rad)[0]).not.toContain('klar over');
    expect(s.u().kunnskapsdatoer).toEqual([]);
  });

  it('variant B: vederlagskravet som er det første varselet, har datoen i punktet for varselet (VS-U86 punkt 9 og 12)', () => {
    const s = medPaaberopelsen();
    const rad = s.send('TE', kravet('2026-09-28'));
    const krav = s.u().spor.vederlag.gjeldendeKrav!;
    expect(krav.innhold).toEqual({
      saerskilt: { produktivitet: { beloep: 40000, klar_over_utgiftene: '2026-09-28' } },
    });
    expect(laast(rad)[0]).toContain(
      `Totalentreprenøren varsler særskilt etter NS 8407 punkt\u00a034.1.3 tredje ledd. ${OPPGIR('28. september 2026')}`
    );
    expect(sisteKunnskapsdato(s.u())).toMatchObject({ id: krav.id, dato: '2026-09-28' });
  });

  it('vederlagskravet oppgir ikke datoen når et varsel etter § 34.1.3 er gitt før, og kontrollsaken uten dato godtas (VS-U86 punkt 9, D-2 i BF-48)', () => {
    const s = medPaaberopelsen();
    s.send('TE', sendVarsel());
    expect(s.avvisning('TE', kravet('2026-09-28'))).toEqual({
      regel: 'KRAVET_ER_IKKE_VARSELET',
      melding:
        'Vederlagskravet er ikke det første varselet om den særskilte vederlagsjusteringen etter punkt 34.1.3, så datoen totalentreprenøren ble klar over at utgiftene ville påløpe, oppgis ikke i kravet. Den oppgis i et eget brev.',
    });
    expect(s.avvist('TE', kravet())).toBeNull();
  });

  it('et vederlagskrav lagt til, sendt før varselet saken har, er det første varselet og kan ha datoen, og samme dag kan det ikke (VS-U86 punkt 9 og 12)', () => {
    const lagtTil = (sendt: string, dato?: string) => ({
      ...kravet(dato),
      ...SOM_BREV,
      sendt,
      dokumentasjon: [randomUUID()],
    });
    const varselFoerst = medPaaberopelsen();
    varselFoerst.send('TE', registrer('2026-09-30'));
    expect(varselFoerst.avvist('TE', lagtTil('2026-09-30', '2026-09-26')), 'samme dag').toBe(
      'KRAVET_ER_IKKE_VARSELET'
    );
    varselFoerst.send('TE', lagtTil('2026-09-27', '2026-09-26'));
    expect(siste(varselFoerst)).toBe('2026-09-26');

    const kravFoerst = medPaaberopelsen();
    kravFoerst.send('TE', kravet());
    kravFoerst.send('TE', lagtTil('2026-09-27', '2026-09-26'));
    expect(siste(kravFoerst)).toBe('2026-09-26');
    expect(kravFoerst.u().forstaatt).toBe(true);
  });

  it('en ny versjon av vederlagskravet kan ikke endre datoen, og en versjon uten datoen godtas og endrer ikke opplysningen (VS-U85, D-2 og D-7 i BF-48)', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet('2026-09-28'));
    expect(s.avvisning('TE', kravet('2026-09-20', 50000))).toEqual({
      regel: 'DATOEN_KAN_IKKE_ENDRES',
      melding:
        'Vederlagskravet kan ikke oppgi datoen totalentreprenøren ble klar over at utgiftene ville påløpe, fordi totalentreprenøren alt har oppgitt å ha blitt klar over at utgiftene ville påløpe 28. september 2026. Datoen endres i et eget brev.',
    });
    const ny = s.send('TE', kravet(undefined, 50000));
    expect(laast(ny).join('\n')).not.toContain('klar over');
    expect(siste(s)).toBe('2026-09-28');
  });

  it('variant C: varselet lagt til har datoen det oppga, også før datoen i påberopelsen, for andre datoer sperrer ikke (VS-U83, VS-U86 punkt 12a)', () => {
    const s = medPaaberopelsen();
    const rad = s.send('TE', registrer('2026-09-30', '2026-09-01'));
    expect((rad.data.utsagn as Data[])[0].klar_over_utgiftene).toBe('2026-09-01');
    expect(rad.data.brevtekst, 'et brev lagt til har ingen tekst fra løsningen').toBeUndefined();
    expect(siste(s)).toBe('2026-09-01');
  });

  it('datoen kan ikke være senere enn datoen brevet sendes eller, for korrespondanse, ble sendt, og samme dag godtas (VS-U83, U-6 i BF-48)', () => {
    const s = medPaaberopelsen();
    // Brevet fra løsningen sendes 3. oktober.
    expect(s.avvisning('TE', sendVarsel('2026-10-04'))).toEqual({
      regel: 'DATO_ETTER_BREVET',
      melding:
        'Totalentreprenøren har oppgitt å ha blitt klar over at utgiftene ville påløpe 4. oktober 2026, etter datoen brevet sendes, 3. oktober 2026.',
    });
    expect(s.avvisning('TE', registrer('2026-09-30', '2026-10-01'))).toEqual({
      regel: 'DATO_ETTER_BREVET',
      melding:
        'Totalentreprenøren har oppgitt å ha blitt klar over at utgiftene ville påløpe 1. oktober 2026, etter datoen brevet ble sendt, 30. september 2026.',
    });
    expect(s.avvist('TE', kravet('2026-10-04')), 'vederlagskravet').toBe('DATO_ETTER_BREVET');
    expect(s.avvist('TE', registrer('2026-09-30', '2026-09-30')), 'samme dag').toBeNull();
    expect(s.avvist('TE', sendVarsel('2026-10-03')), 'samme dag').toBeNull();
  });

  it('bare varselet etter § 34.1.3 har datoen, og en dato som ikke finnes, avvises av formen (VS-U86 punkt 12)', () => {
    const s = medPaaberopelsen();
    expect(
      s.avvist('TE', { ...sendVarsel(), hjemmel: '34.1.2', klar_over_utgiftene: '2026-09-28' })
    ).toBe('UGYLDIG_FORM');
    expect(s.avvist('TE', sendVarsel('2026-02-30'))).toBe('UGYLDIG_FORM');
    expect(s.avvist('TE', kravet('2026-02-30'))).toBe('UGYLDIG_FORM');
  });
});

describe('det egne brevet som supplerer eller endrer datoen (VS-U86 punkt 14, MM-U59 punkt 12, VS-U82)', () => {
  it('et svar lagt til står med opplysningen som gjaldt dagen det ble sendt, ikke en dato oppgitt senere (U-8 i BF-48, VS-U86 punkt 15)', () => {
    const s = medPaaberopelsen();
    const krav = s.send('TE', kravet('2026-09-20'));
    s.send('TE', kunnskapsdato(s, '2026-09-28'));
    const {
      svar: [svaret],
    } = forSent(s);
    // Byggherren sendte svaret 3. oktober, før brevet med den nye datoen 4. oktober.
    s.send('BH', {
      type: 'brev',
      svar: [utenFelt(utenFelt(svaret, 'utdypning'), 'utdypninger')],
      sendt: '2026-10-03',
      ...SOM_BREV,
      dokumentasjon: [randomUUID()],
    });
    const u = s.u();
    const id = u.spor.vederlag.gjeldendeSvar!.id;
    expect(u.svar[id].kunnskapsdato).toBe((krav.data.krav as Data[])[0].id);
    expect(siste(s)).toBe('2026-09-28');
  });

  it('et varsel lagt til etter svaret, sendt samme dag som svaret, er ikke opplysningen svaret står med (U-8 i BF-48, VS-U86 punkt 15)', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet());
    // Svaret sendes 4. oktober, og varselet lagt til etterpå ble sendt samme dag.
    s.send('BH', forSent(s));
    const svaret = s.u().spor.vederlag.gjeldendeSvar!;
    s.send('TE', registrer('2026-10-04', '2026-10-01'));
    expect(siste(s)).toBe('2026-10-01');
    expect(s.u().svar[svaret.id].kunnskapsdato).toBeNull();
  });

  it('variant D: totalentreprenøren oppgir datoen etter byggherrens svar, og svaret står med opplysningen det hadde (MM-U59 punkt 12, U-5 og U-8 i BF-48)', () => {
    const s = medPaaberopelsen();
    const krav = s.send('TE', kravet());
    s.send('BH', forSent(s));
    const svaret = s.u().spor.vederlag.gjeldendeSvar!;
    expect(laast(s.journal.at(-1)!).join('\n'), 'uten oppgitt dato').not.toContain('klar over');
    const rad = s.send('TE', kunnskapsdato(s, '2026-09-28'));
    expect(rad.data.brevtittel).toBe(
      'Når utgiftene etter punkt\u00a034.1.3 ble kjent i sak KOE-17'
    );
    expect(laast(rad)).toEqual([
      `Totalentreprenøren oppgir nå å ha blitt klar over at utgiftene ville påløpe 28. september 2026. Opplysningen gjelder ${VARSELET} i brev K201-KOE-017-02 av 3. oktober 2026.`,
    ]);
    expect(rad.data.krav, 'ikke en kravversjon').toBeUndefined();
    expect(rad.data.svar).toBeUndefined();
    const u = s.u();
    expect((rad.data.utsagn as Data[])[0].gjelder).toBe(u.spor.vederlag.gjeldendeKrav!.id);
    expect(u.spor.vederlag.gjeldendeKrav!.dokument).toBe(krav.event_id);
    // Svaret står, og opplysningen som gjaldt da det ble sendt, var ingen.
    expect(u.spor.vederlag.gjeldendeSvar!.id).toBe(svaret.id);
    expect(u.svar[svaret.id].kunnskapsdato).toBeNull();
    expect(siste(s)).toBe('2026-09-28');
  });

  it('en annen dato senere, også en senere dato, nevner den tidligere med brevet den sto i, og et nytt svar viser den siste (VS-U86 punkt 14 og designdelen, MM-U59 punkt 12)', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet('2026-09-20'));
    const rad = s.send('TE', kunnskapsdato(s, '2026-09-28'));
    expect(laast(rad)).toEqual([
      `Totalentreprenøren oppgir nå å ha blitt klar over at utgiftene ville påløpe 28. september 2026. Opplysningen gjelder ${VARSELET} i brev K201-KOE-017-02 av 3. oktober 2026. I brev K201-KOE-017-02 av 3. oktober 2026 oppga totalentreprenøren 20. september 2026.`,
    ]);
    const tilbake = s.send('TE', kunnskapsdato(s, '2026-09-15'));
    expect(laast(tilbake)[0]).toContain(
      'I brev K201-KOE-017-03 av 4. oktober 2026 oppga totalentreprenøren 28. september 2026.'
    );
    s.send('BH', forSent(s));
    const svaret = s.u().spor.vederlag.gjeldendeSvar!;
    // Designdelen i VS-U86: datoen står ved siden av varselet når byggherren gjør gjeldende at
    // det kom for sent.
    const brevet = laast(s.journal.at(-1)!).join('\n');
    expect(brevet).toContain(OPPGIR('15. september 2026'));
    // LV-U78: beløpet etter begrensningen følger innsigelsen, og datoen står etter beløpet.
    expect(brevet.indexOf('godkjenner etter dette')).toBeGreaterThan(-1);
    expect(brevet.indexOf('godkjenner etter dette')).toBeLessThan(
      brevet.indexOf(OPPGIR('15. september 2026'))
    );
    expect(s.u().svar[svaret.id].kunnskapsdato).toBe((tilbake.data.utsagn as Data[])[0].id);
    expect(s.u().kunnskapsdatoer.map((o) => [o.dato, o.blirSiste])).toEqual([
      ['2026-09-20', true],
      ['2026-09-28', true],
      ['2026-09-15', true],
    ]);
  });

  it('kontrollsak: når byggherren ikke gjør gjeldende at varselet kom for sent, nevner svaret ikke datoen', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet('2026-09-20'));
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          { produktivitet_vurdering: 'godkjent', produktivitet_varslet_i_tide: true },
          { resultat: 'godkjent', godkjent_beloep: 40000 }
        ),
      ],
    });
    expect(laast(rad).join('\n')).not.toContain('klar over');
  });

  it('TEs forklaring står i fritekst under den faste teksten og er valgfri (D-5 i BF-48, etter MM-U53)', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet());
    const forklaring = 'Forstyrrelsene ble kjent på byggemøtet.';
    const rad = s.send('TE', { ...kunnskapsdato(s, '2026-09-28'), utdypning: forklaring });
    expect(tekst(rad)[0].utdypning).toBe(forklaring);
    expect(siste(s)).toBe('2026-09-28');
  });

  it('det egne brevet avvises når datoen er uendret, når den er senere enn brevet, og uten varsel å vise til (D-6 i BF-48, VS-U83)', () => {
    const s = medPaaberopelsen();
    expect(s.avvisning('TE', kunnskapsdato(s, '2026-09-28', s.krav('forhold')))).toEqual({
      regel: 'INGEN_VARSEL',
      melding:
        'Totalentreprenøren har ikke varslet særskilt justering etter punkt 34.1.3, så det er ikke noe varsel å oppgi datoen for.',
    });
    s.send('TE', kravet('2026-09-20'));
    expect(s.avvisning('TE', kunnskapsdato(s, '2026-09-20'))).toEqual({
      regel: 'DATOEN_ER_UENDRET',
      melding:
        'Totalentreprenøren har alt oppgitt å ha blitt klar over at utgiftene ville påløpe 20. september 2026. Brevet må oppgi en annen dato.',
    });
    // Brevet sendes 4. oktober.
    expect(s.avvist('TE', kunnskapsdato(s, '2026-10-05'))).toBe('DATO_ETTER_BREVET');
    expect(s.avvist('TE', kunnskapsdato(s, '2026-10-04')), 'samme dag').toBeNull();
    expect(s.avvist('TE', kunnskapsdato(s, '2026-09-21', s.krav('forhold')))).toBe(
      'UGYLDIG_HENVISNING'
    );
    expect(s.avvist('BH', kunnskapsdato(s, '2026-09-21'))).toBe('FEIL_PART');
  });

  it('handlingen tilbys totalentreprenøren ved det første varselet etter § 34.1.3, og ikke byggherren (U-4 i BF-48)', () => {
    const s = medPaaberopelsen();
    expect(varselet(s), 'uten varsel').toBe('ingen');
    const rad = s.send('TE', sendVarsel());
    const id = (rad.data.utsagn as Data[])[0].id as string;
    expect(handlinger(s.u(), 'TE')).toContain(`oppgi_kunnskapsdato:${id}`);
    expect(handlinger(s.u(), 'BH').some((h) => h.startsWith('oppgi_kunnskapsdato'))).toBe(false);
  });
});

describe('totalentreprenørens siste opplysning når datoen står i flere brev (VS-U85, D-7 i BF-48)', () => {
  it('et varsel lagt til etter at datoen er oppgitt, kan ha datoen det oppga, men endrer ikke den siste opplysningen', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet('2026-09-28'));
    s.send('TE', registrer('2026-09-29', '2026-09-10'));
    expect(siste(s)).toBe('2026-09-28');
    expect(s.u().kunnskapsdatoer.map((o) => [o.dato, o.blirSiste])).toEqual([
      ['2026-09-28', true],
      ['2026-09-10', false],
    ]);
  });

  it('et varsel lagt til, sendt før datoen i den siste opplysningen, avvises ikke av den (VS-U85)', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet('2026-09-28'));
    expect(s.avvist('TE', registrer('2026-09-26', '2026-09-25'))).toBeNull();
  });

  it('et varsel sendt fra løsningen etter at datoen er oppgitt, oppgir ikke en ny dato, og kontrollsaken uten dato godtas', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet('2026-09-28'));
    expect(s.avvist('TE', sendVarsel('2026-09-20'))).toBe('DATOEN_KAN_IKKE_ENDRES');
    expect(s.avvist('TE', sendVarsel())).toBeNull();
  });

  it('er datoen ikke oppgitt før, gjelder datoen i varselet som legges til', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet());
    s.send('TE', registrer('2026-10-02', '2026-09-22'));
    expect(siste(s)).toBe('2026-09-22');
  });

  it('datoen i kravet står når et varsel lagt til senere blir det første varselet, og det egne brevet viser da til det varselet (VS-U85, VS-U86 punkt 9)', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet('2026-09-28'));
    const kravId = s.krav('vederlag');
    expect(varselet(s)).toBe(kravId);
    // Varselet lagt til ble sendt før kravet, så det er det første varselet.
    const rad = s.send('TE', registrer('2026-09-29', '2026-09-10'));
    const varselId = (rad.data.utsagn as Data[])[0].id as string;
    expect(siste(s)).toBe('2026-09-28');
    expect(varselet(s)).toBe(varselId);
    expect(s.avvist('TE', kunnskapsdato(s, '2026-09-12', kravId))).toBe('UGYLDIG_HENVISNING');
    const eget = s.send('TE', kunnskapsdato(s, '2026-09-12'));
    expect(laast(eget)[0]).toContain(
      'I brev K201-KOE-017-02 av 3. oktober 2026 oppga totalentreprenøren 28. september 2026.'
    );
  });
});

describe('det egne brevet i en sak som er avgjort eller lukket (VS-U84, MM-U59 punkt 24)', () => {
  it('variant E: i en sak lukket etter GR-U27 godtas brevet, og saken står lukket', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet());
    const avslag = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { grunnlag_varslet_i_tide: true, resultat: 'avslaatt' }),
      ],
    });
    s.send('TE', {
      type: 'aksept',
      spor: 'forhold',
      svar: (avslag.data.svar as Data[])[0].id,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(s.u().forholdAvvist, 'forutsetning: saken er lukket').toBe(true);
    expect(s.avvist('TE', kravet(undefined, 50000)), 'kontroll: kravet avvises').toBe(
      'FORHOLD_AVVIST'
    );
    s.send('TE', kunnskapsdato(s, '2026-09-28'));
    expect(s.u().forholdAvvist).toBe(true);
    expect(siste(s)).toBe('2026-09-28');
    // Avvisningen etter VS-U83 gjelder også her.
    expect(s.avvist('TE', kunnskapsdato(s, '2026-12-01'))).toBe('DATO_ETTER_BREVET');
  });

  it('i et spor med enighet godtas brevet, og enigheten står', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet());
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          { produktivitet_vurdering: 'godkjent', produktivitet_varslet_i_tide: true },
          { resultat: 'godkjent', godkjent_beloep: 40000 }
        ),
      ],
    });
    expect(s.u().spor.vederlag.enighet, 'forutsetning: enighet ved sammenfall').not.toBeNull();
    s.send('TE', kunnskapsdato(s, '2026-09-28'));
    expect(s.u().spor.vederlag.enighet?.holder).toBe((rad.data.svar as Data[])[0].id);
  });
});

describe('det kjernen leser (MM-U2, DM-06)', () => {
  it('et brev om datoen lagt til som korrespondanse er ikke forstått, for det legges til som korrespondanse (P-1 i BF-48, OV-U123)', () => {
    const s = medPaaberopelsen();
    const rad = s.send('TE', kravet());
    s.rad('TE', {
      utsagn: [
        {
          id: randomUUID(),
          art: 'kunnskapsdato',
          gjelder: (rad.data.krav as Data[])[0].id,
          klar_over_utgiftene: '2026-09-28',
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-03' }],
      korrespondansetype: 'e_post',
      dokumentasjon: [
        { vedlegg_id: randomUUID(), filnavn: 'e-post.pdf', innhold_sha256: 'a'.repeat(64) },
      ],
    });
    expect(s.u().forstaatt).toBe(false);
  });

  it('en lagret senere kravversjon med datoen gjør saken ikke forstått, og kontrollsaken uten datoen er forstått (D-2 i BF-48)', () => {
    const s = medPaaberopelsen();
    s.send('TE', kravet('2026-09-28'));
    const neste = s.send('TE', kravet(undefined, 50000));
    const krav = (neste.data.krav as Data[])[0];
    const med = structuredClone(neste);
    (med.data.krav as Data[])[0] = {
      ...krav,
      saerskilt: { produktivitet: { beloep: 50000, klar_over_utgiftene: '2026-09-20' } },
    };
    expect(utledJournal(s.journal, KJERNE).forstaatt).toBe(true);
    expect(utledJournal([...s.journal.slice(0, -1), med], KJERNE).forstaatt).toBe(false);
  });

  it('datoen i et lagret varsel etter en annen bestemmelse er ikke forstått', () => {
    const s = medPaaberopelsen();
    const rad = s.send('TE', sendVarsel());
    const annen = structuredClone(rad);
    (annen.data.utsagn as Data[])[0] = {
      ...(rad.data.utsagn as Data[])[0],
      hjemmel: '34.1.2',
      klar_over_utgiftene: '2026-09-28',
    };
    const lest = lesJournal([...s.journal.slice(0, -1), annen], KJERNE.leserformat).at(-1)!;
    expect(lest.art).toBe('ukjent');
  });
});

describe('forløpet i minnet med testklienten (G-9 i BF-48)', () => {
  it('variant B og D: kravet uten dato, byggherrens svar og to egne brev', async () => {
    const steg: Handling[] = [
      { handling: 'krav', spor: 'forhold', underkategori: 'irregulaer_endring', navn: 'K-g1' },
      { handling: 'krav', spor: 'vederlag', produktivitet: 40000, navn: 'K-v1' },
      { handling: 'kunnskapsdato', klar_over_utgiftene: '2026-09-01' },
      { handling: 'kunnskapsdato', klar_over_utgiftene: '2026-09-03' },
    ];
    const forloep: Forloep = {
      id: 'kunnskapsdatoen',
      rader: [],
      start: null,
      steg,
      kontroller: [],
    };
    const k = await kjoer(forloep, minnebane({ sakstittel: 'Fasaden' }));
    const u = await k.utledning();
    expect(u.forstaatt).toBe(true);
    expect(u.kunnskapsdatoer.map((o) => o.dato)).toEqual(['2026-09-01', '2026-09-03']);
    expect(sisteKunnskapsdato(u)?.dato).toBe('2026-09-03');
  });

  it('variant A og C: varselet med datoen fra løsningen og lagt til', async () => {
    for (const varsel of [
      {
        handling: 'varsel',
        spor: 'vederlag',
        hjemmel: '34.1.3',
        klar_over_utgiftene: '2026-09-01',
      },
      {
        handling: 'varsel',
        spor: 'vederlag',
        hjemmel: '34.1.3',
        sendt: '2026-09-18',
        klar_over_utgiftene: '2026-09-01',
      },
    ]) {
      const steg: Handling[] = [
        { handling: 'krav', spor: 'forhold', underkategori: 'irregulaer_endring', navn: 'K-g1' },
        varsel,
      ];
      const forloep: Forloep = { id: 'varselet', rader: [], start: null, steg, kontroller: [] };
      const u = await (await kjoer(forloep, minnebane({ sakstittel: 'Fasaden' }))).utledning();
      expect(sisteKunnskapsdato(u)?.dato).toBe('2026-09-01');
    }
  });
});
