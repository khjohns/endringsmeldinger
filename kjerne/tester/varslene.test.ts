/**
 * Varslene og datoene i brevene: datoen varslingsplikten løper fra, korrigeringen av datoen,
 * varslene etter § 32.2, § 33.4, § 34.1.2, punkt 34.3.3 og 34.4, også sendt utenfor løsningen,
 * og vedleggene ved påberopelsen.
 * Saken i minnet er `sak()` i `brevsak.ts`.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { lagBrevtekst } from '../frosset/brevtekst.ts';
import { kravposterI } from '../spor/vederlag/format.ts';
import { handlinger } from '../kommandoer/handlinger.ts';
import { HOVEDKATEGORIER, type Hovedkategori, KATEGORIER } from '../format/koder.ts';
import { lesJournal } from '../format/leser.ts';
import {
  forhaandsvis,
  laastTekst,
  utledJournal,
  vurder,
  vurderTrinnvis,
} from '../kommandoer/skriving.ts';
import { innholdssummen, mellomlager } from './klient.ts';
import { type Kommando, formfeil } from '../kommandoer/kommando.ts';
import { oppgittDatoEtterBrevet } from '../kommandoer/nyttelast.ts';
import type { Dokument, Journalrad } from '../typer.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import { varseletForNyttSvar, venterPaaSvar } from '../utledning/utled.ts';
import { visning } from '../utledning/visning.ts';
import { KJERNE } from '../versjon.ts';
import { utenAvsnitt } from './formatprove.ts';
import { oppgittDato } from '../spor/forhold/format.ts';
import { SOM_BREV } from './brevet.ts';
import {
  BEGRUNNELSE,
  BESKRIVELSE,
  type Data,
  FRISTKRAV,
  FRIST_FULLT,
  I_SAKEN,
  KLAR_OVER,
  KOE_17,
  MOTTATT_TEKST,
  NAVNET,
  PAABEROPELSE,
  PLAN,
  SAK,
  TITTEL,
  VARSELBREVET,
  VEDERLAG_DELVIS,
  fristforlengelse,
  laast,
  sak,
  sakMedKrav,
  svar,
  tekst,
  tilbud,
  utenFelt,
  varseletGitt,
} from './brevsak.ts';

/**
 * VS-U26: datoen varslingsplikten løper fra står i brevteksten som TEs opplysning.
 * At en dato etter brevets dato avvises, er arbeidsvalg 1 i #664, og vurderer ikke
 * rettidigheten. Datoen endres i en korrigering, ikke i en ny kravversjon (punkt 10 i
 * samlevedtaket for retting av sendt brev, MM-U55).
 */
describe('datoen varslingsplikten løper fra (VS-U26)', () => {
  it('en dato etter brevets dato avvises; samme dag godtas (arbeidsvalg 1 i #664)', () => {
    const s = sak();
    // Det første brevet i `sak()` er datert 2. oktober 2026.
    const med = (dato: string) => ({
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: dato },
    });
    expect(s.avvisning('TE', med('2026-10-03'))).toEqual({
      regel: 'DATO_ETTER_BREVET',
      melding:
        'Totalentreprenøren har oppgitt at pålegget ble mottatt 3. oktober 2026, etter brevets dato 2. oktober 2026.',
    });
    expect(s.avvist('TE', med('2026-10-02'))).toBeNull();
    const svikt = {
      type: 'krav',
      spor: 'forhold',
      innhold: {
        hovedkategori: 'svikt',
        underkategori: 'grunnforhold',
        klar_over_forholdet: '2026-10-03',
      },
    };
    expect(s.avvisning('TE', svikt)?.melding).toBe(
      'Totalentreprenøren har oppgitt at totalentreprenøren ble klar over forholdet 3. oktober 2026, etter brevets dato 2. oktober 2026.'
    );
  });

  it('en dato for varselet etter § 33.4 etter brevets dato avvises, i registreringen og i fristkravet; samme dag godtas (#968, arbeidsvalg 1 i #664)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    // Brevet er datert 3. oktober 2026.
    const varsel = (sendt: string) => ({
      type: 'varsel',
      ...SOM_BREV,
      spor: 'frist',
      hjemmel: '33.4',
      sendt,
      dokumentasjon: [VARSELBREVET],
    });
    const krav = (sendt: string) => ({ ...FRISTKRAV, varsel: { ...FRISTKRAV.varsel, sendt } });
    const melding =
      'Totalentreprenøren har oppgitt at varselet etter punkt 33.4 ble sendt 4. oktober 2026, etter brevets dato 3. oktober 2026.';
    expect(s.avvisning('TE', varsel('2026-10-04'))).toEqual({
      regel: 'DATO_ETTER_BREVET',
      melding,
    });
    // VS-U34, C1 i #2056: varselet i fristkravet skrives som et eget registrert varsel først.
    expect(s.avvisning('TE', krav('2026-10-04'))).toEqual({
      regel: 'DATO_ETTER_BREVET',
      melding: `Varselet etter punkt 33.4: ${melding}`,
    });
    expect(s.avvist('TE', varsel('2026-10-03')), 'kontrollsak').toBeNull();
    expect(s.avvist('TE', krav('2026-10-03')), 'kontrollsak').toBeNull();
  });

  it('en oppgitt dato med klokkeslett samme dag som brevet godtas, og dagen etter avvises (#474)', () => {
    const med = (dato: string) =>
      oppgittDatoEtterBrevet(
        {
          ...PAABEROPELSE,
          innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: dato },
        } as Kommando,
        '2026-10-02'
      )?.regel ?? null;
    expect(med('2026-10-02T15:00:00Z')).toBeNull();
    expect(med('2026-10-03T08:00:00Z'), 'kontrollsak').toBe('DATO_ETTER_BREVET');
  });

  it('brevets dato er datoen i norsk tid, ikke i UTC (VS-U8)', () => {
    const s = sak();
    // 15. oktober kl. 22.30 UTC er 16. oktober kl. 00.30 i Oslo.
    const kontekst = {
      sakId: s.journal[0].sak_id,
      aktoerId: 'te',
      part: 'TE' as const,
      teamId: null,
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      kontraktsforkortelse: 'K201',
      kontraktsfrister: [],
      tidspunkt: () => new Date('2026-10-15T22:30:00Z'),
      nyId: randomUUID,
    };
    const med = (dato: string) => ({
      ...utenFelt(PAABEROPELSE, 'utdypning'),
      innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: dato },
    });
    const regel = (dato: string) => {
      const u = forhaandsvis(med(dato), kontekst, s.journal, KJERNE);
      return u.godtatt ? null : u.avvisning.regel;
    };
    expect(regel('2026-10-16')).toBeNull();
    expect(regel('2026-10-17')).toBe('DATO_ETTER_BREVET');
  });

  it('underkategorien endringsordre har ingen dato i brevet (VS-U26)', () => {
    const s = sak();
    const rad = s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: { hovedkategori: 'endring', underkategori: 'endringsordre', endringsordre: 'EO 12' },
    });
    expect(laast(rad)[0]).not.toContain('Totalentreprenøren opplyser');
  });
});

/**
 * Punkt 10 og 11 i samlevedtaket for retting av sendt brev (MM-U55), med partene skrevet fullt
 * ut (LV-U35) og henvisningen etter LV-U53. Teksten i en ny grunnlagsversjon etter en
 * korrigering er LV-U56, og korrigeringen i en lukket sak er MM-U51. At korrigeringen avvises
 * når henvisningen er ugyldig, når datoen er uendret og når datoen er etter brevets dato, er
 * arbeidsvalgene i avgrensningen av #1308.
 */
describe('korrigeringen av datoen (punkt 10 i samlevedtaket for retting av sendt brev, MM-U55)', () => {
  /** Korrigeringen med henvisning til TEs siste opplysning om datoen. */
  const korrigering = (
    s: ReturnType<typeof sak>,
    felt: string,
    dato: string,
    gjelder?: string
  ) => ({
    type: 'korrigering',
    gjelder: gjelder ?? s.u().datoopplysninger.at(-1)!.id,
    [felt]: dato,
  });

  it('brevet har teksten i punkt 10 og viser til brevet med opplysningen (LV-U35, LV-U53)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    expect(laast(rad)).toEqual([
      'Totalentreprenøren oppgir nå at pålegget ble mottatt 20. september 2026. I brev K201-KOE-017-01 av 2. oktober 2026 oppga totalentreprenøren 25. september 2026.',
    ]);
    expect(rad.data.krav, 'punkt\u00a010: ikke en ny kravversjon').toBeUndefined();
    expect(rad.data.svar).toBeUndefined();
  });

  it('brevet har tittelen «Korrigering av datoen i sak <kode>», og leseren gir den (LV-U55, LV-U27)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    expect(rad.data.brevtittel).toBe('Korrigering av datoen i sak KOE-17');
    const lest = lesJournal(s.journal, KJERNE.leserformat).at(-1)!;
    expect(lest.art === 'dokument' && lest.dokument.brevtittel).toBe(
      'Korrigering av datoen i sak KOE-17'
    );
    // MM-U9: et brev sendt før tittelen fantes, står uten tittel og er forstått.
    const uten = { ...rad, data: { ...rad.data } };
    delete uten.data.brevtittel;
    expect(lesJournal([...s.journal.slice(0, -1), uten], KJERNE.leserformat).at(-1)!.art).toBe(
      'dokument'
    );
  });

  it('TEs forklaring står i fritekst under den vedtatte teksten og er valgfri (MM-U53)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const forklaring = 'Datoen i kravet var datoen for byggemøtet, ikke for pålegget.';
    const med = s.send('TE', {
      ...korrigering(s, 'paalegg_mottatt', '2026-09-20'),
      utdypning: forklaring,
    });
    expect(tekst(med)).toEqual([
      {
        gjelder: (med.data.utsagn as { id: string }[])[0].id,
        laast:
          'Totalentreprenøren oppgir nå at pålegget ble mottatt 20. september 2026. I brev K201-KOE-017-01 av 2. oktober 2026 oppga totalentreprenøren 25. september 2026.',
        utdypning: forklaring,
      },
    ]);
    // Forklaringen endrer ikke opplysningen: løsningen tolker den ikke (MM-U53).
    expect(s.u().datoopplysninger.at(-1)!.dato).toBe('2026-09-20');
    const uten = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-22'));
    expect(tekst(uten)[0].utdypning).toBeUndefined();
  });

  it('meldingene ved et annet forhold, en annen dato og en korrigering av et annet felt bruker kontraktens ord for forholdet, ikke «grunnlaget» (GR-U31, OV-U82, #2042)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const meldinger = [
      s.avvisning('TE', {
        ...PAABEROPELSE,
        innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
      }),
      s.avvisning('TE', {
        ...PAABEROPELSE,
        innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: '2026-09-20' },
      }),
      s.avvisning('TE', korrigering(s, 'klar_over_forholdet', '2026-09-20')),
    ];
    expect(meldinger).toEqual([
      {
        regel: 'ANNEN_HJEMMEL',
        melding:
          'Påberopelsen er sendt, så en oppdatert påberopelse kan ikke endre forholdet eller gruppen det hører til. Et annet forhold påberopes i en ny sak.',
      },
      {
        regel: 'DATOEN_KAN_IKKE_ENDRES',
        melding:
          'En oppdatert påberopelse kan ikke endre datoen pålegget ble mottatt. Totalentreprenørens siste opplysning er 25. september 2026. Datoen korrigeres i et eget brev.',
      },
      {
        regel: 'UGYLDIG_KORRIGERING',
        melding:
          'For forholdet som er påberopt, oppgir totalentreprenøren datoen pålegget ble mottatt, ikke datoen totalentreprenøren ble klar over forholdet.',
      },
    ]);
    for (const m of meldinger) expect(m!.melding).not.toMatch(/grunnlag/i);
  });

  it('i svikt og andre forhold gjelder korrigeringen datoen TE ble klar over forholdet', () => {
    const s = sak();
    s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
    });
    expect(
      s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20')),
      'feltet kategorien ikke har'
    ).toBe('UGYLDIG_KORRIGERING');
    const rad = s.send('TE', korrigering(s, 'klar_over_forholdet', '2026-09-28'));
    expect(laast(rad)).toEqual([
      'Totalentreprenøren oppgir nå at totalentreprenøren ble klar over forholdet 28. september 2026. I brev K201-KOE-017-01 av 2. oktober 2026 oppga totalentreprenøren 25. september 2026.',
    ]);
  });

  it('den nye opplysningen gjelder straks, også en senere dato, og svaret står og gjaldt den forrige (punkt 10 og 11, designdelen)', () => {
    const s = sakMedKrav();
    const svaret = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'forhold',
          s.krav('forhold'),
          { resultat: 'godkjent', grunnlag_varslet_i_tide: false },
          {},
          BEGRUNNELSE
        ),
      ],
    });
    const svarId = (svaret.data.svar as { id: string }[])[0].id;
    const kravId = s.krav('forhold');
    const rad = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-28'));
    const korrigeringen = (rad.data.utsagn as { id: string }[])[0].id;
    const u = s.u();
    expect(u.datoopplysninger.map((o) => [o.id, o.dato])).toEqual([
      [kravId, '2026-09-25'],
      [korrigeringen, '2026-09-28'],
    ]);
    expect(u.spor.forhold.gjeldendeSvar?.id, 'svaret står').toBe(svarId);
    expect(u.svar[svarId].datoopplysning, 'svaret gjaldt opplysningen i kravet').toBe(kravId);
    expect(venterPaaSvar(u, 'forhold'), 'punkt\u00a011: sporet venter ikke på et nytt svar').toBe(
      false
    );
  });

  it('en ny grunnlagsversjon kan ikke endre datoen, og gjengir TEs siste opplysning med den opprinnelige datoen og brevet (punkt 10, LV-U56)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(
      s.avvisning('TE', {
        ...PAABEROPELSE,
        innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: '2026-09-20' },
      })
    ).toEqual({
      regel: 'DATOEN_KAN_IKKE_ENDRES',
      melding:
        'En oppdatert påberopelse kan ikke endre datoen pålegget ble mottatt. Totalentreprenørens siste opplysning er 25. september 2026. Datoen korrigeres i et eget brev.',
    });
    expect(laast(s.send('TE', PAABEROPELSE))[0], 'kontrollsak: samme dato').toContain(
      MOTTATT_TEKST
    );
    s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    expect(s.avvist('TE', PAABEROPELSE), 'den tidligere datoen').toBe('DATOEN_KAN_IKKE_ENDRES');
    const ny = s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: '2026-09-20' },
    });
    expect(laast(ny)).toEqual([
      `Påberopelsen gjelder irregulær endring (NS 8407 punkt\u00a032.1) for ${NAVNET}. Pålegget ble mottatt 20. september 2026. Totalentreprenøren oppga tidligere 25. september 2026 i brev K201-KOE-017-01 av 2. oktober 2026.`,
    ]);
    expect(s.u().datoopplysninger, 'gjengivelsen er ikke en ny opplysning').toHaveLength(2);
  });

  it('en ny korrigering viser til den forrige, og en ny grunnlagsversjon nevner hver tidligere dato, den opprinnelige først (punkt 10, LV-U56)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    const krav = s.krav('forhold');
    expect(
      s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-22', krav)),
      'henvisning til kravet, som ikke har TEs siste opplysning'
    ).toBe('UGYLDIG_KORRIGERING');
    const andre = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-22'));
    expect(laast(andre)).toEqual([
      'Totalentreprenøren oppgir nå at pålegget ble mottatt 22. september 2026. I brev K201-KOE-017-02 av 3. oktober 2026 oppga totalentreprenøren 20. september 2026.',
    ]);
    const ny = s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: '2026-09-22' },
    });
    expect(laast(ny)[0]).toContain(
      'Pålegget ble mottatt 22. september 2026. Totalentreprenøren oppga tidligere 25. september 2026 i brev K201-KOE-017-01 av 2. oktober 2026 og 20. september 2026 i brev K201-KOE-017-02 av 3. oktober 2026.'
    );
  });

  it('en ny grunnlagsversjon nevner datoen i en versjon fra en annen skriver, som utledningen leser (LV-U56, MM-U43 punkt 6)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'forhold',
          erstatter: s.krav('forhold'),
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
          paalegg_mottatt: '2026-09-18',
        },
      ],
    });
    s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    expect(
      s.u().datoopplysninger.map((o) => o.dato),
      'forutsetning: utledningen leser datoen i versjonen fra den andre skriveren'
    ).toEqual(['2026-09-25', '2026-09-18', '2026-09-20']);
    const ny = s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold, paalegg_mottatt: '2026-09-20' },
    });
    expect(laast(ny)[0]).toContain(
      'Pålegget ble mottatt 20. september 2026. Totalentreprenøren oppga tidligere 25. september 2026 i brev K201-KOE-017-01 av 2. oktober 2026 og 18. september 2026 i brev K201-KOE-017-02 av 3. oktober 2026.'
    );
  });

  it('korrigeringen avvises når datoen er uendret eller etter brevets dato, og godtas samme dag (arbeidsvalgene i #1308)', () => {
    // I svikt er påberopelsen ikke et varsel etter § 32.2, så VS-U60 avviser ikke en dato etter den.
    const s = sak();
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
    });
    expect(s.avvisning('TE', korrigering(s, 'klar_over_forholdet', '2026-09-25'))).toEqual({
      regel: 'DATOEN_ER_UENDRET',
      melding:
        'Totalentreprenøren har alt oppgitt at totalentreprenøren ble klar over forholdet 25. september 2026. Korrigeringen må oppgi en annen dato.',
    });
    // Brevet med korrigeringen er datert 3. oktober 2026.
    expect(s.avvisning('TE', korrigering(s, 'klar_over_forholdet', '2026-10-04'))).toEqual({
      regel: 'DATO_ETTER_BREVET',
      melding:
        'Totalentreprenøren har oppgitt at totalentreprenøren ble klar over forholdet 4. oktober 2026, etter brevets dato 3. oktober 2026.',
    });
    expect(
      s.avvist('TE', korrigering(s, 'klar_over_forholdet', '2026-10-03')),
      'kontrollsak'
    ).toBeNull();
  });

  it('korrigeringen avvises når henvisningen er ugyldig, fra byggherren og før påberopelsen er sendt', () => {
    const s = sak();
    expect(
      s.avvisning('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20', randomUUID()))
    ).toEqual({
      regel: 'PAABEROPELSE_IKKE_SENDT',
      melding: 'Påberopelsen må være sendt før datoen kan korrigeres.',
    });
    s.send('TE', PAABEROPELSE);
    expect(s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20', randomUUID()))).toBe(
      'UGYLDIG_KORRIGERING'
    );
    expect(s.avvist('BH', korrigering(s, 'paalegg_mottatt', '2026-09-20'))).toBe('FEIL_PART');
    expect(
      s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20')),
      'kontrollsak'
    ).toBeNull();
  });

  it('datoen varslingsplikten løper fra, finnes i endring utenom endringsordre, svikt og andre forhold, men ikke ved force majeure (VS-U26, VS-U76 punkt 1)', () => {
    const forventet: Record<Hovedkategori, string | null> = {
      endring: 'paalegg_mottatt',
      svikt: 'klar_over_forholdet',
      andre_forhold: 'klar_over_forholdet',
      force_majeure: null,
    };
    for (const hoved of HOVEDKATEGORIER)
      for (const under of KATEGORIER[hoved].length ? KATEGORIER[hoved] : [null])
        expect(oppgittDato(hoved, under), `${hoved} ${under}`).toBe(
          under === 'endringsordre' ? null : forventet[hoved]
        );
  });

  it('korrigeringen avvises i underkategorien endringsordre, der TE ikke oppgir noen slik dato (punkt 10)', () => {
    const s = sak();
    const eo = s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: { hovedkategori: 'endring', underkategori: 'endringsordre', endringsordre: 'EO 12' },
    });
    const kravId = (eo.data.krav as { id: string }[])[0].id;
    expect(s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20', kravId))).toBe(
      'INGEN_DATO_I_KATEGORIEN'
    );
    expect(handlinger(s.u(), 'TE').some((h) => h.startsWith('korrigere:'))).toBe(false);
  });

  it('TE får tilbud om korrigeringen med henvisning til TEs siste opplysning (INV-MM-1)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const krav = s.krav('forhold');
    expect(handlinger(s.u(), 'TE')).toContain(`korrigere:${krav}`);
    const rad = s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    const korrigeringen = (rad.data.utsagn as { id: string }[])[0].id;
    expect(handlinger(s.u(), 'TE')).toContain(`korrigere:${korrigeringen}`);
    expect(handlinger(s.u(), 'TE')).not.toContain(`korrigere:${krav}`);
    expect(handlinger(s.u(), 'BH').some((h) => h.startsWith('korrigere:'))).toBe(false);
  });
});

/**
 * OV-U5: TE oppgir datoen for et varsel sendt utenfor appen med varselet som vedlegg.
 * Vedlegget kreves når kravet registrerer varselet; er det registrert, kreves bare samme
 * dato (SK-12, rad KA-19; arbeidsvalget i #909).
 */
describe('fristkravet med varselet sendt utenfor appen (OV-U5)', () => {
  const utenBrevet = { ...FRISTKRAV, varsel: { sendt: FRISTKRAV.varsel.sendt } };

  it('et fristkrav som registrerer varselet uten brevet med det, avvises (OV-U5)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(s.avvisning('TE', utenBrevet)).toEqual({
      regel: 'VEDLEGG_MANGLER',
      melding:
        'Kravet oppgir datoen varselet etter punkt 33.4 ble sendt, men brevet med varselet ligger ikke ved.',
    });
    expect(s.avvist('TE', FRISTKRAV), 'kontrollsak').toBeNull();
  });

  it('er varselet registrert med brevet, kreves bare samme dato i kravet (SK-12, arbeidsvalget i #909)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'frist',
      hjemmel: '33.4',
      sendt: FRISTKRAV.varsel.sendt,
      dokumentasjon: [VARSELBREVET],
    });
    // Typen, sendemåten og beskrivelsen står i brevet som alt er registrert (VS-U34).
    expect(
      s.avvisning('TE', {
        ...utenBrevet,
        varsel: { ...utenBrevet.varsel, korrespondansetype: 'e_post', beskrivelse: 'Varselet' },
      })
    ).toEqual({
      regel: 'VARSEL_REGISTRERT',
      melding:
        'Varselet etter punkt 33.4 står alt i saken, så kravet kan bare oppgi datoen for det. Fjern typen og beskrivelsen.',
    });
    const rad = s.send('TE', utenBrevet);
    expect(rad.data.dokumentasjon).toBeUndefined();
    expect(rad.data.utsagn).toBeUndefined();
  });

  // #2082: korrespondansen registreres én gang (OV-U80), og avsenderen velger senere et nytt
  // varsel for den (OV-U84).
  it('et fristkrav med et brev som alt står i saken med varselet etter punkt 32.2, avvises, og et nytt brev med ett av vedleggene godtas (#2082, OV-U80, OV-U84)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'forhold',
      hjemmel: '32.2',
      sendt: '2026-09-28',
      dokumentasjon: [VARSELBREVET],
    });
    expect(s.avvisning('TE', FRISTKRAV)).toEqual({
      regel: 'VARSEL_REGISTRERT',
      melding:
        'Brevet med varselet står alt i saken som totalentreprenørens brev av 28. september 2026. Velg varselet etter punkt 33.4 for det brevet i stedet for å legge det ved kravet på nytt.',
    });
    // Samme brev med vedleggene i en annen rekkefølge og skrivemåte er samme brev.
    expect(
      s.avvist('TE', {
        ...FRISTKRAV,
        varsel: { ...FRISTKRAV.varsel, dokumentasjon: [VARSELBREVET.toUpperCase()] },
      })
    ).toBe('VARSEL_REGISTRERT');
    // Et annet brev med ett av vedleggene er ikke det registrerte brevet.
    expect(
      s.avvist('TE', {
        ...FRISTKRAV,
        varsel: { ...FRISTKRAV.varsel, dokumentasjon: [VARSELBREVET, PLAN] },
      }),
      'kontrollsak'
    ).toBeNull();
  });

  it('et brev byggherren har sendt, eller et brev som ikke hører til saken, med de samme vedleggene hindrer ikke fristkravet (#2082, OV-U18)', () => {
    const registrert = {
      type: 'registrert_brev',
      sendt: '2026-09-28',
      ...SOM_BREV,
      beskrivelse: 'Brevet med varselet',
      dokumentasjon: [VARSELBREVET],
    };
    const fraByggherren = sak();
    fraByggherren.send('TE', PAABEROPELSE);
    fraByggherren.send('BH', registrert);
    expect(fraByggherren.avvist('TE', FRISTKRAV)).toBeNull();
    const ikkeISaken = sak();
    ikkeISaken.send('TE', PAABEROPELSE);
    const rad = ikkeISaken.send('TE', registrert);
    expect(ikkeISaken.avvist('TE', FRISTKRAV), 'kontrollsak').toBe('VARSEL_REGISTRERT');
    ikkeISaken.send('TE', { type: 'ikke_i_saken', retter: rad.event_id });
    expect(ikkeISaken.avvist('TE', FRISTKRAV)).toBeNull();
  });

  it('et fristkrav med brevet der varselet etter punkt 33.4 alt er registrert, avvises, og kravet uten brevet godtas (#2082, VS-U55)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'frist',
      hjemmel: '33.4',
      sendt: FRISTKRAV.varsel.sendt,
      dokumentasjon: [VARSELBREVET],
    });
    expect(
      s.avvisning('TE', {
        ...FRISTKRAV,
        varsel: { sendt: FRISTKRAV.varsel.sendt, dokumentasjon: [VARSELBREVET] },
      })
    ).toEqual({
      regel: 'VARSEL_REGISTRERT',
      melding:
        'Brevet med varselet står alt i saken som totalentreprenørens brev av 28. september 2026, og kravet viser til varselet etter punkt 33.4 som står i saken. Fjern brevet og vedleggene ved varselet fra kravet. Begrunnelsen kan vise til dem.',
    });
    expect(s.avvist('TE', utenBrevet), 'kontrollsak').toBeNull();
  });

  it('et fristkrav sendt fra løsningen med brevet der varselet etter punkt 33.4 alt er registrert, avvises, og kravet med et annet vedlegg godtas (VS-U73, #2100)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'frist',
      hjemmel: '33.4',
      sendt: FRISTKRAV.varsel.sendt,
      dokumentasjon: [VARSELBREVET],
    });
    expect(s.avvisning('TE', { ...utenBrevet, dokumentasjon: [VARSELBREVET, PLAN] })).toEqual({
      regel: 'VARSEL_REGISTRERT',
      melding:
        'Brevet med varselet står alt i saken som totalentreprenørens brev av 28. september 2026, og kravet viser til varselet etter punkt 33.4 som står i saken. Fjern brevet og vedleggene ved varselet fra kravet. Begrunnelsen kan vise til dem.',
    });
    expect(s.avvist('TE', { ...utenBrevet, dokumentasjon: [PLAN] }), 'kontrollsak').toBeNull();
  });

  it('et fristkrav sendt fra løsningen avvises også med ett av vedleggene ved varselet etter punkt 33.4, som i vederlaget (VS-U75)', () => {
    const vedlegget = randomUUID();
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'frist',
      hjemmel: '33.4',
      sendt: FRISTKRAV.varsel.sendt,
      dokumentasjon: [VARSELBREVET, vedlegget],
    });
    expect(s.avvist('TE', { ...utenBrevet, dokumentasjon: [vedlegget] }), 'ett av to vedlegg').toBe(
      'VARSEL_REGISTRERT'
    );
    expect(s.avvist('TE', { ...utenBrevet, dokumentasjon: [PLAN] }), 'kontrollsak').toBeNull();
  });

  it('et fristkrav lagt til som korrespondanse har brevet som ble sendt som vedlegg, også når brevet står i saken som varselet etter punkt 33.4 (VS-U73, OV-U80)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'frist',
      hjemmel: '33.4',
      sendt: FRISTKRAV.varsel.sendt,
      dokumentasjon: [VARSELBREVET],
    });
    const lagtTil = {
      ...utenFelt(utenFelt(FRISTKRAV, 'varsel'), 'utdypning'),
      ...SOM_BREV,
      sendt: '2026-10-01',
      dokumentasjon: [VARSELBREVET, PLAN],
    };
    expect(s.avvist('TE', lagtTil)).toBeNull();
    expect(
      s.avvist('TE', { ...utenBrevet, dokumentasjon: [VARSELBREVET, PLAN] }),
      'kontrollsak: det samme kravet sendt fra løsningen'
    ).toBe('VARSEL_REGISTRERT');
  });

  it('samme fil lastet opp på nytt som brevet med varselet er brevet som står i saken, og en annen fil er det ikke (#2100, OV-U80)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'forhold',
      hjemmel: '32.2',
      sendt: '2026-09-28',
      dokumentasjon: [VARSELBREVET],
    });
    const kontekst = {
      sakId: SAK,
      aktoerId: 'te',
      part: 'TE' as const,
      teamId: null,
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      kontraktsforkortelse: 'K201',
      kontraktsfrister: [],
      tidspunkt: () => new Date('2026-10-07T08:00:00Z'),
      nyId: randomUUID,
    };
    const lastetOpp = randomUUID();
    const kravet = { ...FRISTKRAV, varsel: { ...FRISTKRAV.varsel, dokumentasjon: [lastetOpp] } };
    const lager = (sum: string) =>
      new Map([[lastetOpp, { vedlegg_id: lastetOpp, filnavn: 'varsel.pdf', innhold_sha256: sum }]]);
    const avvisning = (u: ReturnType<typeof forhaandsvis>) =>
      u.godtatt ? null : u.avvisning.regel;
    expect(
      avvisning(
        forhaandsvis(kravet, kontekst, s.journal, KJERNE, lager(innholdssummen(VARSELBREVET)))
      )
    ).toBe('VARSEL_REGISTRERT');
    expect(
      avvisning(
        forhaandsvis(kravet, kontekst, s.journal, KJERNE, lager(innholdssummen(lastetOpp)))
      ),
      'kontrollsak'
    ).toBeNull();
  });

  it('et varsel uten typen meldes på feltet i varselet i fristkravet (LV-U42, VS-U34)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(
      s.avvisning('TE', {
        ...FRISTKRAV,
        varsel: utenFelt(utenFelt(FRISTKRAV.varsel, 'korrespondansetype'), 'sendemaate'),
      })
    ).toEqual({ regel: 'UGYLDIG_FORM', melding: '$.varsel.korrespondansetype: mangler' });
  });

  it('samme vedlegg to ganger i varselet avvises i formen', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const dobbelt = {
      ...FRISTKRAV,
      varsel: { sendt: '2026-09-28', dokumentasjon: [VARSELBREVET, VARSELBREVET.toUpperCase()] },
    };
    expect(s.avvisning('TE', dobbelt)?.melding).toBe(
      '$.varsel.dokumentasjon: samme vedlegg står to ganger'
    );
  });

  it('et vedlegg serveren ikke fant i saken, avvises, og ID-en lagres med små bokstaver (LV-U14, arbeidsvalg 3 i #790)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const vedlegg = randomUUID();
    const kommando = {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'frist',
      hjemmel: '33.4',
      sendt: '2026-09-28',
      dokumentasjon: [vedlegg.toUpperCase()],
    };
    const kontekst = {
      sakId: SAK,
      aktoerId: 'te',
      part: 'TE' as const,
      teamId: null,
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      kontraktsforkortelse: 'K201',
      kontraktsfrister: [],
      tidspunkt: () => new Date('2026-10-07T08:00:00Z'),
      nyId: randomUUID,
    };
    const godtatt = vurder(
      kommando,
      kontekst,
      s.journal,
      KJERNE,
      mellomlager({ dokumentasjon: [vedlegg] })
    );
    expect(godtatt.godtatt && godtatt.hendelser[0].data.dokumentasjon, 'kontrollsak').toEqual([
      { vedlegg_id: vedlegg, filnavn: `${vedlegg}.pdf`, innhold_sha256: innholdssummen(vedlegg) },
    ]);
    const u = vurder(kommando, kontekst, s.journal, KJERNE, new Map());
    expect(u.godtatt ? null : u.avvisning.regel).toBe('VEDLEGG_FINNES_IKKE');
  });
});

describe('et brev sendt utenfor løsningen som både varsler og krever, legges til som krav (VS-U74)', () => {
  const kravbrevet = '7f1c2d3e-0000-4000-8000-000000002133';
  const melding = (punkt: string) =>
    `Brevet står alt i saken som krav, og kravet gjelder som varselet etter punkt ${punkt}. Det samme brevet kan ikke legges til som varsel etter punkt ${punkt}. Har totalentreprenøren sendt et eget varsel før kravet, kan det brevet legges til.`;
  const lagtTil = (krav: Data) => ({
    ...krav,
    ...SOM_BREV,
    sendt: '2026-10-01',
    dokumentasjon: [kravbrevet],
  });
  const fristkravet = lagtTil(utenFelt(utenFelt(FRISTKRAV, 'varsel'), 'utdypning'));
  const vederlagskravet = lagtTil({
    type: 'krav',
    spor: 'vederlag',
    innhold: tilbud(125000, { saerskilt: { produktivitet: { beloep: 40000 } } }),
  });
  const varsel = (
    spor: string,
    hjemmel: string,
    dokumentasjon: string[],
    sendt = '2026-10-01'
  ) => ({
    type: 'varsel',
    ...SOM_BREV,
    spor,
    hjemmel,
    sendt,
    dokumentasjon,
  });

  it.each([
    ['33.4', 'frist', fristkravet],
    ['34.1.2', 'vederlag', vederlagskravet],
    ['34.1.3', 'vederlag', vederlagskravet],
  ] as const)(
    'brevet som er lagt til som krav, avvises som varsel etter punkt %s, og et annet brev godtas',
    (hjemmel, spor, krav) => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('TE', krav);
      expect(s.avvisning('TE', varsel(spor, hjemmel, [kravbrevet]))).toEqual({
        regel: 'KRAVET_ER_VARSELET',
        melding: melding(hjemmel),
      });
      expect(
        s.avvist('TE', varsel(spor, hjemmel, [randomUUID()], '2026-09-28')),
        'kontrollsak: et eget varsel sendt før kravet'
      ).toBeNull();
    }
  );

  it('et vederlagskrav uten posten etter punkt 34.1.3 annet ledd gjelder ikke som varselet etter punkt 34.1.3, og brevet godtas som det varselet (VS-U74, OV-U5)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', lagtTil({ type: 'krav', spor: 'vederlag', innhold: tilbud(125000) }));
    expect(s.avvist('TE', varsel('vederlag', '34.1.3', [kravbrevet]))).toBeNull();
    expect(s.avvist('TE', varsel('vederlag', '34.1.2', [kravbrevet])), 'kontrollsak').toBe(
      'KRAVET_ER_VARSELET'
    );
  });

  it('et krav sendt fra løsningen med brevet som vedlegg sperrer ikke brevet som varsel, fordi brevet ikke er kravet (VS-U74)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(125000),
      dokumentasjon: [kravbrevet],
    });
    expect(s.avvist('TE', varsel('vederlag', '34.1.2', [kravbrevet], '2026-09-28'))).toBeNull();
  });

  it('et tidligere varsel etter samme bestemmelse legges til uten retting, og det tidligste regnes (VS-U66, VS-U70)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', fristkravet);
    const varselet = s.send('TE', varsel('frist', '33.4', [VARSELBREVET], '2026-09-28'));
    const u = s.u();
    expect(u.spor.frist.varsler['33.4']?.dokument).toBe(varselet.event_id);
    expect(varseletForNyttSvar(u, '33.4'), 'påberopelsen gjelder varselet sendt før kravet').toBe(
      u.spor.frist.varsler['33.4']?.id
    );
  });

  it('samme brev lastet opp på nytt er samme brev, og et brev med et vedlegg til er et annet (#2100)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', fristkravet);
    const lastetOpp = randomUUID();
    const lager = new Map([
      [
        lastetOpp,
        { vedlegg_id: lastetOpp, filnavn: 'krav.pdf', innhold_sha256: innholdssummen(kravbrevet) },
      ],
    ]);
    const kontekst = {
      sakId: SAK,
      aktoerId: 'te',
      part: 'TE' as const,
      teamId: null,
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      kontraktsforkortelse: 'K201',
      kontraktsfrister: [],
      tidspunkt: () => new Date('2026-10-07T08:00:00Z'),
      nyId: randomUUID,
    };
    const utfall = forhaandsvis(
      varsel('frist', '33.4', [lastetOpp]),
      kontekst,
      s.journal,
      KJERNE,
      lager
    );
    expect(utfall.godtatt ? null : utfall.avvisning.regel).toBe('KRAVET_ER_VARSELET');
    expect(
      s.avvist('TE', varsel('frist', '33.4', [kravbrevet, PLAN])),
      'kontrollsak: hele dokumentet sammenliknes'
    ).toBeNull();
  });

  it('punkt 32.2 er uendret: brevet med påberopelsen kan legges til som varsel etter punkt 32.2 (VS-U74, svaret 2a)', () => {
    const s = sak();
    s.send('TE', lagtTil(utenFelt(PAABEROPELSE, 'utdypning')));
    expect(s.avvist('TE', varsel('forhold', '32.2', [kravbrevet], '2026-09-28'))).toBeNull();
  });
});

/**
 * VS-U38: har TE alt sendt varselet etter punkt 32.2 utenfor løsningen, legges dokumentet
 * med varselet ved påberopelsen. Et fristkrav har brevet med varselet i `varsel` (OV-U5).
 */
describe('vedleggene ved påberopelsen (VS-U38)', () => {
  it('påberopelsen lagrer vedlegget med ID, filnavn og sum (VS-U38, LV-U14)', () => {
    const s = sak();
    const rad = s.send('TE', { ...PAABEROPELSE, dokumentasjon: [VARSELBREVET] });
    expect(rad.data.dokumentasjon).toEqual([
      {
        vedlegg_id: VARSELBREVET,
        filnavn: `${VARSELBREVET}.pdf`,
        innhold_sha256: innholdssummen(VARSELBREVET),
      },
    ]);
  });

  it('vederlagskravet lagrer vedleggene ved kravet (#1823 punkt 3)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(125000),
      dokumentasjon: [PLAN],
    });
    expect(rad.data.dokumentasjon).toEqual([expect.objectContaining({ vedlegg_id: PLAN })]);
    expect(laast(rad).at(-1)).toBe(`Brevet har vedlegg: «${PLAN}.pdf».`);
    expect(s.u().forstaatt).toBe(true);
  });

  it('fristkravet har vedleggene ved kravet og brevet med varselet i samme brev, og brevet nevner begge (#1823, OV-U5)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', { ...FRISTKRAV, dokumentasjon: [PLAN] });
    expect(rad.data.dokumentasjon).toEqual([
      expect.objectContaining({ vedlegg_id: PLAN }),
      expect.objectContaining({ vedlegg_id: VARSELBREVET }),
    ]);
    expect(laast(rad).at(-1)).toBe(`Brevet har vedlegg: «${PLAN}.pdf» og «${VARSELBREVET}.pdf».`);
    expect(s.u().forstaatt).toBe(true);
  });

  it('fristkravet med vedlegg, uten varsel i kravet, lagrer vedleggene', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', { ...utenFelt(FRISTKRAV, 'varsel'), dokumentasjon: [PLAN] });
    expect(rad.data.dokumentasjon).toEqual([expect.objectContaining({ vedlegg_id: PLAN })]);
  });

  it('samme vedlegg ved fristkravet og ved varselet avvises i formen', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(s.avvist('TE', { ...FRISTKRAV, dokumentasjon: [VARSELBREVET] })).toBe('UGYLDIG_FORM');
  });

  it('samme vedlegg to ganger ved påberopelsen avvises i formen', () => {
    const s = sak();
    expect(
      s.avvisning('TE', {
        ...PAABEROPELSE,
        dokumentasjon: [VARSELBREVET, VARSELBREVET.toUpperCase()],
      })?.melding
    ).toBe('$.dokumentasjon: samme vedlegg står to ganger');
  });
});

describe('varselet etter § 33.4 sendt fra appen (VS-U15)', () => {
  const sendVarsel = { type: 'send_varsel', spor: 'frist', hjemmel: '33.4' };
  const medVarsel = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varsel = s.send('TE', sendVarsel);
    return { s, varsel, id: (varsel.data.utsagn as Data[])[0].id as string };
  };

  it('brevet er varselet, uten dager og uten en oppgitt dato, med teksten i VS-U15', () => {
    const { varsel, id } = medVarsel();
    expect(tekst(varsel)).toEqual([
      {
        gjelder: id,
        laast: `Totalentreprenøren varsler etter NS 8407 punkt\u00a033.4 at totalentreprenøren vil kreve fristforlengelse som følge av forholdet ${I_SAKEN}.`,
      },
    ]);
    // VS-U8: datoen er serverens, så brevet har ingen opplysning om når det ble sendt.
    expect(varsel.data.opplysninger).toBeUndefined();
    expect(utenAvsnitt(varsel)).toEqual([]);
  });

  it('et varsel uten dato i et brev med krav er ikke brevet selv, og kan ikke uttrykkes', () => {
    const dokument: Dokument = {
      id: 'brevet',
      avsender: 'TE',
      registrert: '2026-10-05T10:00:00Z',
      opplysninger: [],
      dokumentasjon: [],
      krav: [
        {
          id: 'k',
          spor: 'frist',
          dokument: 'brevet',
          erstatter: null,
          innhold: { frister: [{ id: 'f1', navn: 'Sluttfristen', dager: 20 }] },
        },
      ],
      svar: [],
      utsagn: [{ id: 'v', art: 'varsel', hjemmel: '33.4', dokument: 'brevet' }],
      brevtekst: null,
      brevtittel: null,
      brevnummer: null,
      merking: null,
      deresRef: [],
      korrespondansetype: null,
      sendemaate: null,
      beskrivelse: null,
      spor: [],
      retter: null,
      ikkeISaken: false,
    };
    const saken = {
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      tittel: TITTEL,
      svarPaaPaaberopelsen: null,
      datoopplysninger: [],
      subsidiaer: { vederlag: [], frist: [] },
      avklartVedFrafall: false,
      kravpostvarsler: {},
      utenVirkning: [],
      varsletFoer: {},
      paaberopelse: null,
    };
    expect(() => lagBrevtekst(dokument, [], saken, KJERNE.regler)).toThrow(
      'et varsel i et brev fra appen har datoen det ble sendt'
    );
  });

  it('serveren avviser en annen tekst enn den den lager (A1)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(s.avvist('TE', { ...sendVarsel, brevtekst: ['Totalentreprenøren varsler.'] })).toBe(
      'ANNEN_BREVTEKST'
    );
  });

  it('innsigelsen viser til varselet i brevet det står i (LV-U4 punkt 7)', () => {
    const { s, id } = medVarsel();
    const rad = s.send('BH', { type: 'innsigelse', gjelder: id });
    expect(laast(rad)).toEqual([
      'Byggherren gjør gjeldende at totalentreprenørens varsel om fristforlengelse etter NS 8407 punkt\u00a033.4 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent (NS 8407 punkt\u00a05 tredje ledd).',
    ]);
  });

  it('svaret på et senere fristkrav vurderer rettidigheten av varselet (MM-U1)', () => {
    const { s, id } = medVarsel();
    const krav = s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(laast(krav)).toEqual([
      varseletGitt('brev K201-KOE-017-02 av 3. oktober 2026'),
      fristforlengelse(2),
      '3. Begrunnelse',
    ]);
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { ...FRIST_FULLT[0], frist_varsel_ok: false },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    const standpunkt = ((rad.data.svar as Data[])[0].standpunkter as Data[]).find(
      (p) => p.art === 'rettidighet'
    );
    expect(standpunkt?.gjelder).toBe(id);
    expect(laast(rad).join('\n\n')).toContain(
      'Byggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
    );
  });

  it('et fristkrav kan ikke oppgi en dato for varselet appen sendte (SK-12)', () => {
    const { s } = medVarsel();
    expect(s.avvist('TE', { ...FRISTKRAV, varsel: { sendt: '2026-10-03' } })).toBe(
      'VARSEL_REGISTRERT'
    );
    expect(s.avvist('TE', utenFelt(FRISTKRAV, 'varsel'))).toBeNull();
  });
});

describe('varselet etter § 34.1.2 (OV-U5, #1096)', () => {
  const sendVarsel = { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.2' };
  const vederlagskrav = {
    type: 'krav',
    spor: 'vederlag',
    innhold: tilbud(125000),
  };
  /** Forholdet i brev 2; `hovedkategori` avgjør om § 34.1.2 gjelder (§ 34.1.1, KA-46). */
  const medPaaberopelse = (hovedkategori: 'svikt' | 'endring') => {
    const s = sak();
    s.send(
      'TE',
      hovedkategori === 'svikt'
        ? {
            ...PAABEROPELSE,
            innhold: {
              hovedkategori,
              underkategori: 'medvirkning',
              ...KLAR_OVER,
            },
          }
        : PAABEROPELSE
    );
    return s;
  };
  /** Varselet fra appen i brev 3. */
  const medVarsel = (hovedkategori: 'svikt' | 'endring' = 'svikt') => {
    const s = medPaaberopelse(hovedkategori);
    const varsel = s.send('TE', sendVarsel);
    return { s, varsel, id: (varsel.data.utsagn as Data[])[0].id as string };
  };
  const svarMedPaaberopelse = (s: ReturnType<typeof sak>) =>
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...VEDERLAG_DELVIS[0], hovedkrav_varslet_i_tide: false },
          { resultat: 'avslaatt', godkjent_beloep: 0 }
        ),
      ],
    });

  it('brevet er varselet, uten beløp og uten en oppgitt dato, med teksten i LV-U19', () => {
    const { varsel, id } = medVarsel();
    expect(tekst(varsel)).toEqual([
      {
        gjelder: id,
        laast: `Totalentreprenøren varsler etter NS 8407 punkt\u00a034.1.2 at totalentreprenøren vil kreve justering av vederlaget som følge av forholdet ${I_SAKEN}.`,
      },
    ]);
    // VS-U8: datoen er serverens, så brevet har ingen opplysning om når det ble sendt.
    expect(varsel.data.opplysninger).toBeUndefined();
    expect(varsel.data.utsagn).toEqual([{ id, art: 'varsel', hjemmel: '34.1.2' }]);
  });

  it('der TE krever endring, godtas varselet uten virkning (OV-U15)', () => {
    const { s } = medVarsel('endring');
    expect(s.u().spor.vederlag.varsler['34.1.2']?.hjemmel).toBe('34.1.2');
  });

  it('der TE krever endring, sier visningen at varselet ikke kreves, og ved svikt ikke (OV-U15, § 34.1.1)', () => {
    const etiketter = (kategori: 'endring' | 'svikt') =>
      visning(medPaaberopelse(kategori).u(), GJELDENDE_REGLER).spor.vederlag.etiketter;
    expect(etiketter('endring')).toContain('varsel_kreves_ikke');
    expect(etiketter('svikt')).not.toContain('varsel_kreves_ikke');
  });

  it('et varsel sendt utenfor appen registreres med datoen og brevet, uten tekst fra appen (OV-U5, MM-U17 (opphevet av MM-U50))', () => {
    const s = medPaaberopelse('svikt');
    const rad = s.send('TE', {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'vederlag',
      hjemmel: '34.1.2',
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    });
    expect(rad.data.brevtekst).toBeUndefined();
    expect(rad.data.opplysninger).toMatchObject([{ hva: 'sendt', dato: '2026-09-28' }]);
    expect(s.u().spor.vederlag.varsler['34.1.2']?.dokument).toBe(rad.event_id);
  });

  it('varselet etter § 34.1.2 står i vederlaget, og varselet etter § 33.4 i fristen (OV-U5)', () => {
    const s = medPaaberopelse('svikt');
    expect(s.avvist('TE', { ...sendVarsel, spor: 'frist' })).toBe('UGYLDIG_FORM');
    expect(s.avvist('TE', { ...sendVarsel, hjemmel: '33.4' })).toBe('UGYLDIG_FORM');
  });

  it('et nytt varsel fra appen etter vederlagskravet avvises, og et tidligere varsel kan registreres (OV-U5, VS-U16)', () => {
    const s = medPaaberopelse('svikt');
    s.send('TE', vederlagskrav);
    expect(s.avvist('TE', sendVarsel)).toBe('VEDERLAGSKRAV_SENDT');
    const registrering = {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'vederlag',
      hjemmel: '34.1.2',
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    };
    s.send('TE', registrering);
    // SK-12: datoen settes én gang.
    expect(s.avvist('TE', { ...registrering, dokumentasjon: [randomUUID()] })).toBe(
      'VARSEL_REGISTRERT'
    );
  });

  it('svaret påberoper at varselet før svaret kom for sent, og brevet nevner brevet varselet står i (VS-U20, LV-U21)', () => {
    const { s, id } = medVarsel();
    s.send('TE', vederlagskrav);
    const rad = svarMedPaaberopelse(s);
    const standpunkt = ((rad.data.svar as Data[])[1].standpunkter as Data[]).find(
      (p) => p.art === 'rettidighet'
    );
    expect(standpunkt?.gjelder).toBe(id);
    expect(laast(rad)[3]).toContain(
      'Byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 punkt\u00a034.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
    );
  });

  it('uten eget varsel gjelder påberopelsen det første vederlagskravet, og brevet nevner brevet med kravet (OV-U5, LV-U21)', () => {
    const s = medPaaberopelse('svikt');
    s.send('TE', vederlagskrav);
    const rad = svarMedPaaberopelse(s);
    const standpunkt = ((rad.data.svar as Data[])[1].standpunkter as Data[]).find(
      (p) => p.art === 'rettidighet'
    );
    expect(standpunkt?.gjelder).toBe(s.krav('vederlag'));
    expect(laast(rad)[3]).toContain(
      'Byggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 punkt\u00a034.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
    );
  });

  it('en innsigelse mot varselet er en påberopelse etter § 34.1.2, og svaret gjentar den (VS-U24, VS-U11)', () => {
    const { s, id } = medVarsel();
    const innsigelse = s.send('BH', { type: 'innsigelse', gjelder: id });
    expect(laast(innsigelse)).toEqual([
      'Byggherren gjør gjeldende at totalentreprenørens varsel om vederlagsjustering etter NS 8407 punkt\u00a034.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent (NS 8407 punkt\u00a05 tredje ledd).',
    ]);
    s.send('TE', vederlagskrav);
    expect(laast(svarMedPaaberopelse(s))[3]).toContain(
      'kom for sent, jf. innsigelsen i brev K201-KOE-017-03 av 4. oktober 2026.'
    );
  });

  it('der TE krever endring, avvises innsigelsen mot varselet som vurderingen (KA-46, OV-U15)', () => {
    const { s, id } = medVarsel('endring');
    expect(s.avvisning('BH', { type: 'innsigelse', gjelder: id })).toEqual({
      regel: 'VARSLINGSPLIKT_GJELDER_IKKE',
      melding:
        'Punkt 34.1.2 gjelder bare svikt og andre forhold, ikke forholdet som er påberopt, så byggherren tar ikke stilling til om varselet kom i tide.',
    });
  });

  it('etter «i tide» i et svar fra appen godtas en innsigelse mot varselet (MM-U34 punkt 6, HF-U4, VS-U24)', () => {
    const { s, id } = medVarsel();
    s.send('TE', vederlagskrav);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...VEDERLAG_DELVIS[0], hovedkrav_varslet_i_tide: true },
          VEDERLAG_DELVIS[1]
        ),
      ],
    });
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: id })).toBeNull();
  });
});

describe('varselet etter § 32.2 sendt utenfor løsningen (VS-U34, VS-U38, G-2 i #807)', () => {
  // Påberopelsen er brev K201-KOE-017-01 av 2. oktober 2026, og registreringen er brev K201-KOE-017-02 av 3. oktober.
  const registrering = (sendt = '2026-09-28') => ({
    type: 'varsel',
    ...SOM_BREV,
    spor: 'forhold',
    hjemmel: '32.2',
    sendt,
    dokumentasjon: [randomUUID()],
  });
  const medPaaberopelse = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    return s;
  };

  it('registreres som varsel i forholdet med datoen og dokumentet, uten tekst fra løsningen (VS-U34, OV-U80, MM-U17 (opphevet av MM-U50))', () => {
    const s = medPaaberopelse();
    const rad = s.send('TE', registrering());
    expect(rad.data.brevtekst).toBeUndefined();
    expect(rad.data.utsagn).toMatchObject([{ art: 'varsel', hjemmel: '32.2' }]);
    expect(rad.data.opplysninger).toMatchObject([{ hva: 'sendt', dato: '2026-09-28' }]);
    expect(s.u().spor.forhold.varsler['32.2']?.dokument).toBe(rad.event_id);
    expect(s.u().forstaatt).toBe(true);
  });

  it('datoen settes én gang (OV-U80, SK-12)', () => {
    const s = medPaaberopelse();
    s.send('TE', registrering());
    expect(s.avvist('TE', registrering('2026-09-27'))).toBe('VARSEL_REGISTRERT');
  });

  it('datoen kan ikke være senere enn påberopelsen, men samme dag (VS-U38)', () => {
    const s = medPaaberopelse();
    expect(s.avvist('TE', registrering('2026-10-03'))).toBe('VARSEL_ETTER_PAABEROPELSEN');
    expect(s.avvist('TE', registrering('2026-10-02'))).toBeNull();
  });

  it('registreres bare der varslingsplikten etter § 32.2 gjelder kategorien (VS-U39, GR-U11)', () => {
    const s = sak();
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: {
        hovedkategori: 'svikt',
        underkategori: 'medvirkning',
        ...KLAR_OVER,
      },
    });
    expect(s.avvist('TE', registrering())).toBe('VARSLINGSPLIKT_GJELDER_IKKE');
  });

  it('registreres ikke før påberopelsen er sendt (VS-U38, S-2 i #807)', () => {
    const s = sak();
    expect(s.avvist('TE', registrering())).toBe('PAABEROPELSE_IKKE_SENDT');
  });

  it('byggherren tilbys ikke innsigelse mot det registrerte varselet før det har brevtekst (S-4 i #807)', () => {
    const s = medPaaberopelse();
    s.send('TE', registrering());
    const varsel = s.u().spor.forhold.varsler['32.2']?.id;
    expect(varsel).toBeDefined();
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: varsel })).toBe('IKKE_I_FOERSTE_VERSJON');
    expect(handlinger(s.u(), 'BH')).not.toContain(`innsigelse:${varsel}`);
  });

  it('bare TE registrerer varselet (OV-U80)', () => {
    expect(medPaaberopelse().avvist('BH', registrering())).toBe('FEIL_PART');
  });

  it('står i forholdet og sendes ikke fra løsningen, der påberopelsen er varselet (VS-U34, GR-U31)', () => {
    const s = medPaaberopelse();
    expect(s.avvist('TE', { ...registrering(), spor: 'frist' })).toBe('UGYLDIG_FORM');
    expect(s.avvist('TE', { type: 'send_varsel', spor: 'forhold', hjemmel: '32.2' })).toBe(
      'UGYLDIG_FORM'
    );
  });

  // VS-U76 punkt 6 og 10: påberopelsen gjelder det registrerte varselet når det har en
  // tidligere dato. Brevteksten for det registrerte varselet bygges i #1600, så kjernen
  // avviser svaret med en regelkode i stedet for å nevne grunnlagskravet (CLAUDE.md,
  // «Domenekjernen»), og svaret tilbys ikke.
  it('byggherrens svar på grunnlaget når varselet etter § 32.2 er registrert, avvises og tilbys ikke til varselet har brevtekst', () => {
    const s = medPaaberopelse();
    const brev = () => ({
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    expect(s.avvist('BH', brev()), 'kontrollsak uten registrert varsel').toBeNull();
    expect(handlinger(s.u(), 'BH'), 'kontrollsak').toContain('svare:forhold');
    s.send('TE', registrering());
    expect(s.avvist('BH', brev())).toBe('IKKE_I_FOERSTE_VERSJON');
    expect(handlinger(s.u(), 'BH')).not.toContain('svare:forhold');
  });

  it('revisjonen av svaret på grunnlaget etter at varselet etter § 32.2 er registrert, avvises til varselet har brevtekst, og svaret på fristen tilbys (VS-U76 punkt 10)', () => {
    const s = medPaaberopelse();
    s.send('TE', FRISTKRAV);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      ],
    });
    const revisjon = () => ({
      type: 'revisjon',
      erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
      svar: svar('forhold', s.krav('forhold'), {
        resultat: 'godkjent',
        grunnlag_varslet_i_tide: false,
      }),
    });
    expect(s.avvist('BH', revisjon()), 'kontrollsak uten registrert varsel').toBeNull();
    s.send('TE', registrering());
    expect(s.avvist('BH', revisjon())).toBe('IKKE_I_FOERSTE_VERSJON');
    expect(handlinger(s.u(), 'BH')).not.toContain('revidere:forhold');
    expect(handlinger(s.u(), 'BH'), 'kontrollsak i fristen').toContain('svare:frist');
  });
});

/**
 * VS-U58 og VS-U59 (#1730): et varsel om forholdet kan ikke være oppgitt sendt før datoen TE har
 * oppgitt i grunnlagskravet (VS-U76 punkt 1–5), og en korrigering av datoen kan ikke snu
 * rekkefølgen. Påberopelsen er brev K201-KOE-017-01 av 2. oktober 2026, med datoen 25. september.
 */
describe('varselet om forholdet og datoen i grunnlagskravet (VS-U58, VS-U59)', () => {
  const registrering = (spor: string, hjemmel: string, sendt: string) => ({
    type: 'varsel',
    ...SOM_BREV,
    spor,
    hjemmel,
    sendt,
    dokumentasjon: [randomUUID()],
  });
  const svikt = {
    ...PAABEROPELSE,
    innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
  };
  const korrigering = (s: ReturnType<typeof sak>, felt: string, dato: string) => ({
    type: 'korrigering',
    gjelder: s.u().datoopplysninger.at(-1)!.id,
    [felt]: dato,
  });
  const medForhold = (paaberopelse: Data = PAABEROPELSE) => {
    const s = sak();
    s.send('TE', paaberopelse);
    return s;
  };

  it('varselet etter § 32.2 oppgitt sendt før datoen pålegget ble mottatt, avvises, samme dag godtas (VS-U58)', () => {
    const s = medForhold();
    expect(s.avvisning('TE', registrering('forhold', '32.2', '2026-09-24'))).toMatchObject({
      regel: 'VARSEL_FOER_GRUNNLAGSDATOEN',
      melding: expect.stringMatching(/24\. september 2026.*25\. september 2026/),
    });
    expect(s.avvist('TE', registrering('forhold', '32.2', '2026-09-25'))).toBeNull();
  });

  it.each([
    ['vederlag', '34.1.2'],
    ['vederlag', '34.1.3'],
    ['frist', '33.4'],
  ])(
    'varselet i %s etter § %s oppgitt sendt før datoen TE ble klar over forholdet, avvises (VS-U58)',
    (spor, hjemmel) => {
      const s = medForhold(svikt);
      expect(s.avvist('TE', registrering(spor, hjemmel, '2026-09-24'))).toBe(
        'VARSEL_FOER_GRUNNLAGSDATOEN'
      );
      expect(s.avvist('TE', registrering(spor, hjemmel, '2026-09-25'))).toBeNull();
    }
  );

  it('et fristkrav med varselet etter § 33.4 sendt før datoen i grunnlagskravet, avvises helt (VS-U58)', () => {
    const s = medForhold();
    const krav = (sendt: string) => ({ ...FRISTKRAV, varsel: { ...FRISTKRAV.varsel, sendt } });
    expect(s.avvist('TE', krav('2026-09-24'))).toBe('VARSEL_FOER_GRUNNLAGSDATOEN');
    expect(s.avvist('TE', krav('2026-09-25'))).toBeNull();
  });

  it('kontrollerer varselet mot den korrigerte datoen (VS-U58, MM-U55 punkt 10)', () => {
    const s = medForhold();
    s.send('TE', korrigering(s, 'paalegg_mottatt', '2026-09-20'));
    expect(s.avvist('TE', registrering('forhold', '32.2', '2026-09-22'))).toBeNull();
    const t = medForhold();
    t.send('TE', korrigering(t, 'paalegg_mottatt', '2026-09-27'));
    expect(t.avvist('TE', registrering('forhold', '32.2', '2026-09-26'))).toBe(
      'VARSEL_FOER_GRUNNLAGSDATOEN'
    );
  });

  it('i underkategorien endringsordre er det ingen dato, og ingenting kontrolleres (VS-U76)', () => {
    const s = medForhold({
      ...PAABEROPELSE,
      innhold: { hovedkategori: 'endring', underkategori: 'endringsordre', endringsordre: 'EO 12' },
    });
    expect(s.avvist('TE', registrering('frist', '33.4', '2020-01-01'))).toBeNull();
  });

  it('en korrigering til en dato etter et registrert varsel avvises, til samme dag godtas (VS-U59)', () => {
    const s = medForhold();
    s.send('TE', registrering('forhold', '32.2', '2026-09-28'));
    expect(s.avvisning('TE', korrigering(s, 'paalegg_mottatt', '2026-09-29'))).toMatchObject({
      regel: 'VARSEL_FOER_GRUNNLAGSDATOEN',
      melding: expect.stringMatching(/29\. september 2026.*28\. september 2026/),
    });
    expect(s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-09-28'))).toBeNull();
  });

  it('en korrigering til en dato etter et varsel sendt fra løsningen avvises (VS-U59)', () => {
    const s = medForhold(svikt);
    // Varselet sendes fra løsningen 3. oktober (brev 2); grunnlagskravet sier 25. september.
    s.send('TE', { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.2' });
    expect(s.avvist('TE', korrigering(s, 'klar_over_forholdet', '2026-10-04'))).toBe(
      'VARSEL_FOER_GRUNNLAGSDATOEN'
    );
    expect(s.avvist('TE', korrigering(s, 'klar_over_forholdet', '2026-09-30'))).toBeNull();
  });

  it('uten eget varsel avvises en korrigering til en dato etter påberopelsen, som er varselet etter § 32.2 (VS-U60)', () => {
    const s = medForhold();
    expect(s.avvisning('TE', korrigering(s, 'paalegg_mottatt', '2026-10-03'))).toMatchObject({
      regel: 'VARSEL_FOER_GRUNNLAGSDATOEN',
      melding: expect.stringMatching(/3\. oktober 2026.*punkt 32\.2.*2\. oktober 2026/),
    });
    expect(s.avvist('TE', korrigering(s, 'paalegg_mottatt', '2026-10-02'))).toBeNull();
  });

  it('i svikt er påberopelsen ikke et varsel etter § 32.2, og en korrigering til en dato etter den godtas (VS-U60, VS-U76 punkt 6)', () => {
    const s = medForhold(svikt);
    expect(s.avvist('TE', korrigering(s, 'klar_over_forholdet', '2026-10-03'))).toBeNull();
  });

  it.each([
    [
      'det første fristkravet',
      '33.4',
      { type: 'krav', spor: 'frist', innhold: { frister: [{ navn: 'Sluttfristen', dager: 20 }] } },
    ],
    [
      'den første kravversjonen i vederlaget',
      '34.1.2',
      { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) },
    ],
  ])(
    'uten eget varsel avvises en korrigering til en dato etter %s, som er varselet etter § %s (VS-U60)',
    (_, hjemmel, krav) => {
      // Påberopelsen er sendt 2. oktober og kravet 3. oktober; korrigeringen sendes 4. oktober.
      const s = medForhold(svikt);
      s.send('TE', { ...krav, utdypning: BESKRIVELSE });
      expect(s.avvisning('TE', korrigering(s, 'klar_over_forholdet', '2026-10-04'))).toMatchObject({
        regel: 'VARSEL_FOER_GRUNNLAGSDATOEN',
        melding: expect.stringContaining(`punkt ${hjemmel} ble sendt 3. oktober 2026`),
      });
      expect(s.avvist('TE', korrigering(s, 'klar_over_forholdet', '2026-10-03'))).toBeNull();
    }
  );

  it('et eget varsel registrert etter det første fristkravet, skjuler ikke kravet: en korrigering til en dato etter kravet avvises (VS-U66)', () => {
    // Påberopelsen er sendt 2. oktober og fristkravet uten varsel 3. oktober. Varselet etter
    // § 33.4 registreres 4. oktober med den datoen, og korrigeringen sendes 5. oktober.
    const s = medForhold(svikt);
    s.send('TE', {
      type: 'krav',
      spor: 'frist',
      innhold: { frister: [{ navn: 'Sluttfristen', dager: 20 }] },
      utdypning: BESKRIVELSE,
    });
    s.send('TE', registrering('frist', '33.4', '2026-10-04'));
    expect(s.u().spor.frist.varsler['33.4'], 'forutsetning: varselet er registrert').toBeDefined();
    expect(s.avvisning('TE', korrigering(s, 'klar_over_forholdet', '2026-10-04'))).toMatchObject({
      regel: 'VARSEL_FOER_GRUNNLAGSDATOEN',
      melding: expect.stringContaining('punkt 33.4 ble sendt 3. oktober 2026'),
    });
    expect(s.avvist('TE', korrigering(s, 'klar_over_forholdet', '2026-10-03'))).toBeNull();
  });

  // VS-U70 og VS-U66, med kontrollsakene for samme dato og en tidligere dato.
  it.each([
    [
      'et eget varsel datert etter det første kravet: det første kravet',
      '2026-10-04',
      'kravet',
      'brev K201-KOE-017-02 av 3. oktober 2026',
    ],
    [
      'et eget varsel datert før det første kravet (kontrollsak): varselet',
      '2026-09-30',
      'varselet',
      'totalentreprenørens brev av 30. september 2026',
    ],
    [
      'et eget varsel datert samme dag som det første kravet: varselet',
      '2026-10-03',
      'varselet',
      'totalentreprenørens brev av 3. oktober 2026',
    ],
  ])(
    'påberopelsen etter § 34.1.2 og punktet om varselet i en ny kravversjon gjelder det tidligste, %s (VS-U70, VS-U66)',
    (_navn, dato, gjelder, brevet) => {
      // Påberopelsen er sendt 2. oktober og vederlagskravet uten varsel 3. oktober (brev 2).
      const s = medForhold(svikt);
      s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
      const kravet = s.krav('vederlag');
      s.send('TE', registrering('vederlag', '34.1.2', dato));
      const varselet = s.u().spor.vederlag.varsler['34.1.2']!.id;
      const forventet = gjelder === 'kravet' ? kravet : varselet;
      expect(varseletForNyttSvar(s.u(), '34.1.2')).toBe(forventet);
      const punktene = tekst(
        s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(130000) })
      ).filter((a) => a.punkt === '34.1.2');
      expect(punktene.map((a) => a.laast)).toEqual([
        `1. Varselet om vederlagsjustering\n\nVarsel om vederlagsjustering etter NS 8407 punkt\u00a034.1.2 ble gitt i ${brevet}.`,
      ]);
    }
  );

  it('byggherrens påberopelse etter § 34.1.2 gjelder det første kravet når det egne varselet er datert etter det, og et svar som viser til det egne varselet, står (VS-U70, MM-U50)', () => {
    const s = medForhold(svikt);
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
    const kravet = s.krav('vederlag');
    s.send('TE', registrering('vederlag', '34.1.2', '2026-10-04'));
    const varselet = s.u().spor.vederlag.varsler['34.1.2']!.id;
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }),
        svar(
          'vederlag',
          kravet,
          { ...VEDERLAG_DELVIS[0], hovedkrav_varslet_i_tide: false },
          { resultat: 'avslaatt', godkjent_beloep: 0 }
        ),
      ],
    });
    const rettidighet = (rad.data.svar as Data[])
      .flatMap((x) => x.standpunkter as Data[])
      .find((p) => p.art === 'rettidighet' && p.hjemmel === '34.1.2')!;
    expect(rettidighet.gjelder).toBe(kravet);
    expect(s.u().forstaatt, 'kontrollsak').toBe(true);
    // Et svar sendt før VS-U70 viste til det egne varselet, og står med det (MM-U50).
    rettidighet.gjelder = varselet;
    expect(s.u().forstaatt).toBe(true);
    rettidighet.gjelder = s.krav('forhold');
    expect(s.u().forstaatt).toBe(false);
  });

  it('påberopelsen etter § 33.4 gjelder det første fristkravet når det egne varselet er datert etter det (VS-U70)', () => {
    const s = medForhold(svikt);
    s.send('TE', {
      type: 'krav',
      spor: 'frist',
      innhold: { frister: [{ navn: 'Sluttfristen', dager: 20 }] },
      utdypning: BESKRIVELSE,
    });
    const kravet = s.krav('frist');
    s.send('TE', registrering('frist', '33.4', '2026-10-04'));
    expect(varseletForNyttSvar(s.u(), '33.4')).toBe(kravet);
  });
});

describe('varselet etter § 32.2 er det første grunnlagskravet (VS-U76 punkt 6 og 10, #1489)', () => {
  // Versjon 1 er brev K201-KOE-017-01 av 2. oktober 2026, og versjon 2 er brev K201-KOE-017-02.
  const medToVersjoner = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', PAABEROPELSE);
    expect(s.u().spor.forhold.krav.length, 'forutsetning: to versjoner').toBe(2);
    return s;
  };
  const svarPaaGjeldende = (s: ReturnType<typeof sak>, iTide: boolean) =>
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: iTide,
        }),
      ],
    });
  const rettidigheten = (rad: Journalrad) => {
    const p = ((rad.data.svar as Data[])[0].standpunkter as Data[]).find(
      (x) => x.art === 'rettidighet'
    );
    expect(p, 'forutsetning: svaret har et standpunkt om rettidigheten').toBeDefined();
    return p!;
  };

  it('svaret på versjon 2 påberoper varselet i den første versjonen, og brevet nevner det brevet (VS-U76 punkt 6 og 10 med designdelen)', () => {
    const s = medToVersjoner();
    const [v1, v2] = s.u().spor.forhold.krav;
    const rad = svarPaaGjeldende(s, false);
    expect((rad.data.svar as Data[])[0].gjelder, 'forutsetning: svaret gjelder versjon 2').toBe(
      v2!.id
    );
    expect(rettidigheten(rad).gjelder).toBe(v1!.id);
    expect(laast(rad)[1]).toBe(
      '1. Varselet etter punkt\u00a032.2\n\nPrinsipalt\n\nByggherren gjør gjeldende at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent.'
    );
    // LV-U49: brevet rettidigheten gjelder, står under Deres ref.
    expect(rad.data.deres_ref).toContain('K201-KOE-017-01');
    expect(s.u().forstaatt).toBe(true);
  });

  it('en lagret påberopelse etter § 32.2 som viser til versjon 2, gjør saken ikke forstått, og en som viser til versjon 1, forstås (VS-U76 punkt 6)', () => {
    const lagret = (versjon: 0 | 1) => {
      const s = medToVersjoner();
      const krav = s.u().spor.forhold.krav;
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'forhold',
            gjelder: krav[1]!.id,
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: krav[versjon]!.id,
                hjemmel: '32.2',
                i_tide: false,
              },
              { id: randomUUID(), art: 'forhold', resultat: 'avslaatt' },
            ],
          },
        ],
      });
      return s.u();
    };
    const kontroll = lagret(0);
    expect(kontroll.forstaatt, JSON.stringify(kontroll.begrensninger)).toBe(true);
    expect(lagret(1).forstaatt).toBe(false);
  });

  it('et varsel etter § 32.2 TE registrerer etter svaret, markerer standpunktet, og svaret står med virkningen det hadde (VS-U76 punkt 10, OV-U5)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    svarPaaGjeldende(s, false);
    const gjeldende = s.u().spor.forhold.gjeldendeSvar!;
    const rettidighet = gjeldende.standpunkter.find((p) => p.art === 'rettidighet');
    expect(rettidighet, 'forutsetning: svaret har et standpunkt om rettidigheten').toBeDefined();
    s.send('TE', {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'forhold',
      hjemmel: '32.2',
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    });
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.svar[gjeldende.id].gjaldtEtAnnetVarsel).toEqual([rettidighet!.id]);
    expect(u.svar[gjeldende.id].virkninger).toEqual(gjeldende.beslutningsgrunnlag.virkninger);
  });
});

/**
 * #698 punkt 1: formatet krever datoen pålegget ble mottatt der regelsettet sier at punkt 32.2
 * gjelder, og brevet skriver datosetningen etter setningen om punkt 32.2 (VS-U26). Snevrer et
 * regelsett inn punkt 32.2, må formatet følge med, ellers står datoen uten setningen.
 */
it('datoen pålegget ble mottatt følger varslingsplikten etter punkt 32.2 for hvert par i KATEGORIER (VS-U26, #698)', () => {
  const avvik = HOVEDKATEGORIER.flatMap((h) =>
    (KATEGORIER[h] as readonly string[])
      .filter(
        (u) =>
          (oppgittDato(h, u) === 'paalegg_mottatt') !==
          GJELDENDE_REGLER.gjelderVarslingsplikten(h, u)
      )
      .map((u) => `${h}/${u}`)
  );
  expect(avvik).toEqual([]);
});

describe('varselet etter punkt 34.3.3 og 34.4 som står alene (VS-U48, VS-U52, VS-U55, D-16 i BF-14, #1663)', () => {
  const vederlagskrav = (kravposter: Data[]) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: { kravposter },
  });
  const tilbudspost = { betegnelse: 'P1', beskrivelse: 'Graving', oppgjoersform: 'tilbud' };
  const regning = { beskrivelse: 'Pumping', oppgjoersform: 'regningsarbeid' };
  const justert = { beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true };
  const sendVarsel = (hjemmel: '34.3.3' | '34.4') => ({
    type: 'send_varsel',
    spor: 'vederlag',
    hjemmel,
  });
  const registrertVarsel = (hjemmel: string) => ({
    type: 'varsel',
    korrespondansetype: 'e_post',
    beskrivelse: 'Varsel om vederlagsjustering',
    spor: 'vederlag',
    hjemmel,
    sendt: '2026-09-28',
    dokumentasjon: [randomUUID()],
  });
  const varselRegning = 'Kravet er varsel før regningsarbeidet settes i gang';
  const varselEnhetspriser = 'Kravet er varsel om justering av enhetsprisene';
  const paaberopt = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    return s;
  };

  // Ordlyden er design etter VS-U48 (#1663); at varselet kan sendes alene, er VS-U48.
  it('TE sender varselet etter punkt 34.4 og etter punkt 34.3.3 fra løsningen uten krav (VS-U48)', () => {
    const s = paaberopt();
    expect(laast(s.send('TE', sendVarsel('34.4')))).toEqual([
      `Totalentreprenøren varsler etter NS 8407 punkt\u00a034.4 at totalentreprenøren vil kreve oppgjør som regningsarbeid som følge av forholdet ${I_SAKEN}.`,
    ]);
    expect(laast(s.send('TE', sendVarsel('34.3.3')))).toEqual([
      `Totalentreprenøren varsler etter NS 8407 punkt\u00a034.3.3 første ledd at totalentreprenøren vil kreve justering av enhetsprisene som følge av forholdet ${I_SAKEN}.`,
    ]);
    expect(s.u().spor.vederlag.kravpostvarsler.map((v) => v.hjemmel)).toEqual(['34.4', '34.3.3']);
    expect(s.u().spor.vederlag.varsler, 'ikke et varsel etter SK-12').toEqual({});
  });

  it('saken kan ha flere varsler etter punkt 34.3.3 og 34.4, sendt og registrert, før og etter kravet, men fortsatt bare ett etter punkt 34.1.3 (VS-U48, VS-U52, SK-12)', () => {
    const s = paaberopt();
    s.send('TE', sendVarsel('34.4'));
    s.send('TE', registrertVarsel('34.4'));
    s.send('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000 }]));
    expect(handlinger(s.u(), 'TE')).toEqual(
      expect.arrayContaining([
        'varsle:34.3.3',
        'varsle:34.4',
        'sende_varsel:34.3.3',
        'sende_varsel:34.4',
      ])
    );
    s.send('TE', sendVarsel('34.4'));
    s.send('TE', registrertVarsel('34.3.3'));
    expect(s.u().spor.vederlag.kravpostvarsler.map((v) => v.hjemmel)).toEqual([
      '34.4',
      '34.4',
      '34.4',
      '34.3.3',
    ]);
    // Kontrollsak: SK-12 gjelder fortsatt varselet etter punkt 34.1.3.
    s.send('TE', registrertVarsel('34.1.3'));
    expect(s.avvist('TE', registrertVarsel('34.1.3'))).toBe('VARSEL_REGISTRERT');
  });

  it('et varsel etter punkt 34.4 står ikke i fristen (OV-U5)', () => {
    const s = paaberopt();
    expect(s.avvist('TE', { ...sendVarsel('34.4'), spor: 'frist' })).not.toBeNull();
  });

  it('et varsel sendt før det første kravet gjelder kravpostene med den beregningsregelen, og kravet viser til det i stedet for å være varselet (D-16, VS-U55)', () => {
    const s = paaberopt();
    s.send('TE', sendVarsel('34.4'));
    const tekst = laast(
      s.send('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000 }, regning, justert]))
    ).join(' ');
    expect(tekst).toContain(
      'Totalentreprenøren krever at P2 gjøres opp som regningsarbeid etter NS 8407 punkt\u00a034.4 og punkt\u00a030.'
    );
    expect(tekst).not.toContain(varselRegning);
    expect(tekst).toContain(
      'Varselet før regningsarbeidet settes i gang (NS 8407 punkt\u00a034.4) ble gitt i brev K201-KOE-017-02 av 3. oktober 2026.'
    );
    // Varselet etter punkt 34.4 gjelder ikke justeringen av enhetsprisene.
    expect(tekst).toContain(varselEnhetspriser);
  });

  it('et varsel registrert før det første kravet gjelder på samme måte, og kravet viser til korrespondansen (D-16, VS-U52, VS-U55)', () => {
    const s = paaberopt();
    s.send('TE', registrertVarsel('34.3.3'));
    const tekst = laast(s.send('TE', vederlagskrav([regning, justert]))).join(' ');
    expect(tekst).not.toContain(varselEnhetspriser);
    expect(tekst).toContain(
      'Varselet om justering av enhetsprisene etter NS 8407 punkt\u00a034.3.3 ble gitt i totalentreprenørens e-post av 28. september 2026.'
    );
    expect(tekst).toContain(varselRegning);
  });

  it('et varsel etter det første kravet gjelder ikke en ny kravpost uten valget i VS-U50, så kravet er varselet for den (VS-U49, D-19)', () => {
    const s = paaberopt();
    s.send('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000 }]));
    s.send('TE', sendVarsel('34.4'));
    const tekst = laast(
      s.send('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000 }, regning]))
    ).join(' ');
    expect(tekst).toContain(varselRegning);
  });

  it('byggherrens innsigelse mot varselet etter punkt 34.3.3 eller 34.4 venter på økt 2, mens innsigelsen mot varselet etter punkt 34.1.3 godtas (G-9 i BF-14)', () => {
    const s = paaberopt();
    s.send('TE', sendVarsel('34.3.3'));
    s.send('TE', { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.3' });
    const u = s.u();
    const varsel = u.spor.vederlag.kravpostvarsler[0]!.id;
    expect(handlinger(u, 'BH')).not.toContain(`innsigelse:${varsel}`);
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: varsel })).toBe('IKKE_I_FOERSTE_VERSJON');
    const kontroll = u.spor.vederlag.varsler['34.1.3']!.id;
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: kontroll }), 'kontrollsak').toBeNull();
  });
});

describe('kravposten viser til varselet for posten (VS-U50, VS-U54, VS-U55, #1663 del 2)', () => {
  const vederlagskrav = (kravposter: Data[]) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: { kravposter },
  });
  const tilbudspost = { betegnelse: 'P1', beskrivelse: 'Graving', oppgjoersform: 'tilbud' };
  const regning = { beskrivelse: 'Pumping', oppgjoersform: 'regningsarbeid' };
  const justert = { beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true };
  const sendVarsel = (hjemmel: '34.3.3' | '34.4') => ({
    type: 'send_varsel',
    spor: 'vederlag',
    hjemmel,
  });
  const registrertVarsel = (hjemmel: string, sendt = '2026-09-28') => ({
    type: 'varsel',
    korrespondansetype: 'e_post',
    beskrivelse: 'Varsel om vederlagsjustering',
    spor: 'vederlag',
    hjemmel,
    sendt,
    dokumentasjon: [randomUUID()],
  });
  const varselRegning = 'Kravet er varsel før regningsarbeidet settes i gang';
  const paaberopt = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    return s;
  };
  const varslene = (s: ReturnType<typeof sak>) => s.u().spor.vederlag.kravpostvarsler;

  // #1700 punkt 1: varselet er gitt etter det første kravet, før kravposten kommer.
  it('en ny kravpost i en senere kravversjon viser til et varsel sendt etter det første kravet, og kravet sier hvor varselet ble gitt (VS-U50, VS-U55)', () => {
    const s = paaberopt();
    s.send('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000 }]));
    s.send('TE', sendVarsel('34.4'));
    const varsel = varslene(s)[0]!.id;
    const tekst = laast(
      s.send(
        'TE',
        vederlagskrav([
          { ...tilbudspost, beloep: 1000 },
          { ...regning, varsel },
        ])
      )
    ).join(' ');
    expect(tekst).not.toContain(varselRegning);
    expect(tekst).toContain(
      'Varselet før regningsarbeidet settes i gang (NS 8407 punkt\u00a034.4) ble gitt i brev K201-KOE-017-03 av 4. oktober 2026.'
    );
    const post = kravposterI(s.u().spor.vederlag.gjeldendeKrav!)[1]!;
    expect(post.varsel, 'kravposten viser til varselet, ikke omvendt (VS-U54)').toBe(varsel);
    expect(s.u().forstaatt, JSON.stringify(s.u().begrensninger)).toBe(true);
  });

  it('en kravpost som trekkes og tas med igjen, kan vise til varselet den viste til før trekket (VS-U50, KA-U75)', () => {
    const s = paaberopt();
    s.send('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000 }]));
    s.send('TE', sendVarsel('34.4'));
    const varsel = varslene(s)[0]!.id;
    const p1 = { ...tilbudspost, beloep: 1000 };
    s.send('TE', vederlagskrav([p1, { ...regning, varsel }]));
    const p2 = kravposterI(s.u().spor.vederlag.gjeldendeKrav!)[1]!.id;
    s.send('TE', { ...vederlagskrav([p1]), innhold: { kravposter: [p1], trekker: [p2] } });
    expect(
      s.avvist('TE', vederlagskrav([p1, { ...regning, id: p2, varsel }])),
      'samme varsel som før trekket'
    ).toBeNull();
    expect(
      s.avvist('TE', vederlagskrav([p1, { ...regning, id: p2, varsel: randomUUID() }])),
      'kontrollsak: et annet varsel'
    ).toBe('KRAVPOSTVARSELET');
  });

  // #1700 punkt 2: TE velger varselet når saken har flere.
  it('har saken flere varsler før det første kravet, viser kravet til det TE velger, ikke det første (VS-U50)', () => {
    const s = paaberopt();
    s.send('TE', sendVarsel('34.3.3'));
    s.send('TE', registrertVarsel('34.3.3'));
    const valgt = varslene(s)[1]!.id;
    const gittI = (t: string[] | null) => {
      expect(t, 'forutsetning: kravet godtas').not.toBeNull();
      return t!.join(' ').match(/ble gitt i (.*?\d{4})\./)?.[1];
    };
    // Kontrollsak: uten valget gjelder det første (D-16, VS-U55).
    expect(gittI(s.vis('TE', vederlagskrav([justert])))).toBe(
      'brev K201-KOE-017-02 av 3. oktober 2026'
    );
    expect(gittI(laast(s.send('TE', vederlagskrav([{ ...justert, varsel: valgt }]))))).toBe(
      'totalentreprenørens e-post av 28. september 2026'
    );
  });

  it('kravposten kan bare vise til et varsel etter samme bestemmelse i saken, og bare når posten er varsel for seg (VS-U49, VS-U50)', () => {
    const s = paaberopt();
    s.send('TE', sendVarsel('34.4'));
    const varsel = varslene(s)[0]!.id;
    expect(s.avvist('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000, varsel }]))).toBe(
      'KRAVPOSTVARSELET'
    );
    expect(s.avvist('TE', vederlagskrav([{ ...justert, varsel }])), 'annen bestemmelse').toBe(
      'KRAVPOSTVARSELET'
    );
    expect(s.avvist('TE', vederlagskrav([{ ...regning, varsel: randomUUID() }]))).toBe(
      'KRAVPOSTVARSELET'
    );
    expect(s.avvist('TE', vederlagskrav([{ ...regning, varsel }])), 'kontrollsak').toBeNull();
    s.send('TE', vederlagskrav([{ ...regning, varsel }]));
    // P1 hadde regningsarbeid i forrige versjon, så varselet er gitt før (VS-U49), og posten kan
    // bare gjenta det den viste til.
    s.send('TE', registrertVarsel('34.4'));
    const annet = varslene(s).at(-1)!.id;
    expect(s.avvist('TE', vederlagskrav([{ ...regning, betegnelse: 'P1', varsel: annet }]))).toBe(
      'KRAVPOSTVARSELET'
    );
    expect(
      s.avvist('TE', vederlagskrav([{ ...regning, betegnelse: 'P1' }])),
      'kontrollsak'
    ).toBeNull();
  });

  it('en lagret kravpost som viser til noe annet enn et varsel for posten før kravet, gjør saken ikke forstått (VS-U50, MM-U2)', () => {
    const s = paaberopt();
    s.send('TE', sendVarsel('34.4'));
    const varsel = varslene(s)[0]!.id;
    s.send('TE', vederlagskrav([{ ...regning, varsel }]));
    expect(s.u().forstaatt, 'kontrollsak').toBe(true);
    const krav = (s.journal.at(-1)!.data.krav as Data[])[0]!;
    const post = (krav.innhold ?? krav) as Data;
    const kravposter = post.kravposter as Data[];
    kravposter[0]!.varsel = krav.id;
    const u = s.u();
    expect(u.forstaatt).toBe(false);
    expect(JSON.stringify(u.begrensninger)).toContain('ikke er et varsel etter punkt 34.4');
  });

  it('et varsel i saken som én kravpost viser til, gjelder også en annen post med samme beregningsregel i det første kravet (D-16, VS-U50)', () => {
    const s = paaberopt();
    s.send('TE', registrertVarsel('34.4'));
    const varsel = varslene(s)[0]!.id;
    const tekst = laast(s.send('TE', vederlagskrav([{ ...regning, varsel }, regning]))).join(' ');
    expect(tekst).not.toContain(varselRegning);
    expect(tekst.match(/ble gitt i totalentreprenørens e-post/g)).toHaveLength(2);
  });

  it('et vedlegg ved kravet som alt ligger ved et varsel for en kravpost i saken, avvises, så brevet ikke tar varselet for et dokument fra kravskjemaet (VS-U73, VS-U51, #1823)', () => {
    const s = paaberopt();
    const varselet = registrertVarsel('34.4');
    s.send('TE', varselet);
    const varsel = varslene(s)[0]!.id;
    for (const poster of [[regning], [{ ...regning, varsel }, regning]])
      expect(
        s.avvisning('TE', { ...vederlagskrav(poster), dokumentasjon: varselet.dokumentasjon })
      ).toEqual({
        regel: 'KRAVPOSTVARSELET',
        melding:
          'Et vedlegg ved kravet ligger alt ved varselet for en kravpost i totalentreprenørens e-post av 28. september 2026. Kravposten viser til varselet, og begrunnelsen kan vise til vedlegget der.',
      });
    const rad = s.send('TE', { ...vederlagskrav([regning]), dokumentasjon: [PLAN] });
    expect(laast(rad).join(' '), 'kontrollsak').toContain('ble gitt i totalentreprenørens e-post');
  });

  it('samme fil lastet opp på nytt som vedlegget ved et varsel for en kravpost, avvises ved et vederlagskrav sendt fra løsningen, og en annen fil godtas (VS-U73, #2100)', () => {
    const s = paaberopt();
    const varselet = registrertVarsel('34.4');
    s.send('TE', varselet);
    const kontekst = {
      sakId: SAK,
      aktoerId: 'te',
      part: 'TE' as const,
      teamId: null,
      sakskode: { kode: 'koe' as const, loepenummer: 17 },
      kontraktsforkortelse: 'K201',
      kontraktsfrister: [],
      tidspunkt: () => new Date('2026-10-07T08:00:00Z'),
      nyId: randomUUID,
    };
    const lastetOpp = randomUUID();
    const kravet = { ...vederlagskrav([regning]), dokumentasjon: [lastetOpp] };
    const lager = (sum: string) =>
      new Map([[lastetOpp, { vedlegg_id: lastetOpp, filnavn: 'varsel.pdf', innhold_sha256: sum }]]);
    const avvisning = (u: ReturnType<typeof forhaandsvis>) =>
      u.godtatt ? null : u.avvisning.regel;
    expect(
      avvisning(
        forhaandsvis(
          kravet,
          kontekst,
          s.journal,
          KJERNE,
          lager(innholdssummen(varselet.dokumentasjon[0]!))
        )
      )
    ).toBe('KRAVPOSTVARSELET');
    expect(
      avvisning(forhaandsvis(kravet, kontekst, s.journal, KJERNE, lager('0'.repeat(64)))),
      'kontrollsak: en annen fil'
    ).toBeNull();
  });

  it('et vederlagskrav lagt til som korrespondanse har brevet som ble sendt som vedlegg, også når brevet står i saken som et varsel for en kravpost (VS-U73, OV-U80)', () => {
    const s = paaberopt();
    const varselet = registrertVarsel('34.4');
    s.send('TE', varselet);
    const varsel = varslene(s)[0]!.id;
    const lagtTil = {
      ...vederlagskrav([{ ...regning, varsel }]),
      ...SOM_BREV,
      sendt: '2026-10-01',
      dokumentasjon: varselet.dokumentasjon,
    };
    expect(s.avvist('TE', lagtTil)).toBeNull();
    expect(
      s.avvist('TE', {
        ...vederlagskrav([{ ...regning, varsel }]),
        dokumentasjon: varselet.dokumentasjon,
      }),
      'kontrollsak: det samme kravet sendt fra løsningen'
    ).toBe('KRAVPOSTVARSELET');
  });

  it('en kravpost i en ny versjon kan gjenta varselet den viste til, men ikke vise til et annet (KA-U56, VS-U50)', () => {
    const s = paaberopt();
    s.send('TE', sendVarsel('34.4'));
    s.send('TE', registrertVarsel('34.4'));
    const [foerste, andre] = varslene(s).map((v) => v.id);
    s.send('TE', vederlagskrav([{ ...regning, varsel: foerste }]));
    expect(
      s.avvist('TE', vederlagskrav([{ ...regning, betegnelse: 'P1', varsel: foerste }]))
    ).toBeNull();
    expect(s.avvist('TE', vederlagskrav([{ ...regning, betegnelse: 'P1', varsel: andre }]))).toBe(
      'KRAVPOSTVARSELET'
    );
  });

  describe('dokumentet TE legger til i kravskjemaet som varselet for posten (VS-U51, VS-U53)', () => {
    const dokument = () => ({
      sendt: '2026-09-25',
      ...SOM_BREV,
      dokumentasjon: [randomUUID()],
    });
    const kontekst = (dato: string) => ({
      sakId: SAK,
      aktoerId: 'te',
      part: 'TE' as const,
      teamId: null,
      sakskode: KOE_17,
      kontraktsforkortelse: 'K201',
      kontraktsfrister: [],
      tidspunkt: () => new Date(`${dato}T08:00:00Z`),
      nyId: randomUUID,
    });

    it('dokumentet står som et eget registrert varsel før kravet, kravposten viser til det, og kravet legger det ved og sier at TE opplyser det (VS-U51, VS-U53, VS-U54)', () => {
      const s = paaberopt();
      const varsel = dokument();
      const foer = s.journal.length;
      const krav = s.send('TE', vederlagskrav([{ ...regning, varsel }]));
      const [varselrad] = s.journal.slice(foer);
      expect(s.journal.length - foer, 'to rader: varselet og kravet').toBe(2);
      expect(varselrad!.data).toMatchObject({
        utsagn: [{ art: 'varsel', hjemmel: '34.4' }],
        opplysninger: [{ hva: 'sendt', dato: '2026-09-25' }],
        ...SOM_BREV,
      });
      expect(varselrad!.data.brevtekst, 'registrert korrespondanse har ingen brevtekst').toBe(
        undefined
      );
      const utsagn = (varselrad!.data.utsagn as Data[])[0]!.id;
      expect(kravposterI(s.u().spor.vederlag.gjeldendeKrav!)[0]!.varsel).toBe(utsagn);
      expect(varslene(s).map((v) => v.id)).toEqual([utsagn]);
      const vedlegg = varsel.dokumentasjon[0]!.toLowerCase();
      expect(((krav.data.dokumentasjon ?? []) as Data[]).map((v) => v.vedlegg_id)).toEqual([
        vedlegg,
      ]);
      expect(laast(krav)).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'Totalentreprenøren opplyser at varselet før regningsarbeidet settes i gang (NS 8407 punkt\u00a034.4) ble gitt i totalentreprenørens brev av 25. september 2026, som er vedlagt.'
          ),
          `Brevet har vedlegg: «${vedlegg}.pdf».`,
        ])
      );
      expect(laast(krav).join(' ')).not.toContain(varselRegning);
      expect(s.u().forstaatt, JSON.stringify(s.u().begrensninger)).toBe(true);
    });

    it('dokumentet for én kravpost er ikke varselet for en annen post etter samme bestemmelse i det første kravet (VS-U51, VS-U53, D-16)', () => {
      const s = paaberopt();
      const krav = s.send(
        'TE',
        vederlagskrav([
          { ...regning, varsel: dokument() },
          regning,
          { ...regning, varsel: dokument() },
        ])
      );
      const tekst = laast(krav).join(' ');
      expect(tekst.match(/Totalentreprenøren opplyser at/g)).toHaveLength(2);
      expect(tekst.match(new RegExp(varselRegning, 'g')), 'P2 er varsel for seg').toHaveLength(1);
      expect((krav.data.dokumentasjon ?? []) as Data[]).toHaveLength(2);
    });

    it('et dokument fra kravskjemaet med et vedlegg som alt ligger ved et varsel i saken, avvises, så varselet fortsatt gjelder den andre kravposten (VS-U55, VS-U51, #1993)', () => {
      const s = paaberopt();
      const varselet = { ...registrertVarsel('34.4'), dokumentasjon: [randomUUID(), randomUUID()] };
      s.send('TE', varselet);
      const delt = { ...dokument(), dokumentasjon: [varselet.dokumentasjon[0]!.toUpperCase()] };
      const foer = s.journal.length;
      expect(s.avvisning('TE', vederlagskrav([{ ...regning, varsel: delt }, regning]))).toEqual({
        regel: 'KRAVPOSTVARSELET',
        melding:
          'Et vedlegg i varselet for kravpost nr. 1 ligger alt ved varselet for en kravpost i saken. Kravposten viser til varselet, og begrunnelsen kan vise til vedlegget der.',
      });
      expect(s.journal.length, 'ingen rad skrives').toBe(foer);
      expect(
        s.avvisning(
          'TE',
          vederlagskrav([{ ...regning, varsel: dokument() }, regning, { ...regning, varsel: delt }])
        )?.melding,
        'det andre dokumentet i kravskjemaet'
      ).toContain('i varselet for kravpost nr. 3 ligger alt ved');
      expect(s.journal.length, 'heller ikke varselet for kravpost nr. 1 skrives').toBe(foer);
      expect(
        s.avvist('BH', vederlagskrav([{ ...regning, varsel: delt }, regning])),
        'byggherren får grunnen til at kravet ikke kan sendes, før vedleggene i varslene'
      ).toBe('FEIL_PART');
      // Kontrollsak: med et eget dokument gjelder varselet i saken den andre posten (D-16, VS-U55).
      const tekst = laast(
        s.send('TE', vederlagskrav([{ ...regning, varsel: dokument() }, regning]))
      ).join(' ');
      expect(tekst).not.toContain(varselRegning);
      expect(tekst).toContain('ble gitt i totalentreprenørens e-post');
    });

    it('samme dokument for to kravposter er ett registrert brev med ett varsel per bestemmelse, og hver post viser til sitt (VS-U52, VS-U53)', () => {
      const s = paaberopt();
      const varsel = dokument();
      const foer = s.journal.length;
      const krav = s.send(
        'TE',
        vederlagskrav([
          { ...regning, varsel },
          { ...justert, varsel },
          { ...regning, varsel },
        ])
      );
      const rader = s.journal.slice(foer);
      expect(rader, 'ett brev og kravet').toHaveLength(2);
      const utsagn = rader[0]!.data.utsagn as Data[];
      expect(utsagn.map((x) => x.hjemmel)).toEqual(['34.4', '34.3.3']);
      const poster = kravposterI(s.u().spor.vederlag.gjeldendeKrav!);
      expect(poster.map((p) => p.varsel)).toEqual([utsagn[0]!.id, utsagn[1]!.id, utsagn[0]!.id]);
      expect((krav.data.dokumentasjon ?? []) as Data[]).toHaveLength(1);
      expect(
        laast(krav)
          .join(' ')
          .match(/Totalentreprenøren opplyser at/g)
      ).toHaveLength(3);
      expect(s.u().forstaatt, JSON.stringify(s.u().begrensninger)).toBe(true);
    });

    it('samme dokument med ulik dato eller med andre vedlegg for en annen kravpost avvises (VS-U53)', () => {
      const s = paaberopt();
      const varsel = dokument();
      expect(
        s.avvist(
          'TE',
          vederlagskrav([
            { ...regning, varsel },
            { ...justert, varsel: { ...varsel, sendt: '2026-09-26' } },
          ])
        )
      ).toBe('UGYLDIG_FORM');
      expect(
        s.avvist(
          'TE',
          vederlagskrav([
            { ...regning, varsel },
            {
              ...justert,
              varsel: { ...varsel, dokumentasjon: [...varsel.dokumentasjon, randomUUID()] },
            },
          ])
        )
      ).toBe('UGYLDIG_FORM');
      expect(
        s.avvist(
          'TE',
          vederlagskrav([
            { ...regning, varsel },
            { ...justert, varsel: dokument() },
          ])
        ),
        'kontrollsak'
      ).toBeNull();
    });

    it('serveren får radene én og én: varselet først, så kravet med sin egen klokke (VS-U53)', () => {
      const s = paaberopt();
      const kommando = vederlagskrav([
        { ...justert, varsel: dokument() },
        { ...regning, varsel: dokument() },
      ]);
      const vedlegg = mellomlager(kommando);
      const vist = forhaandsvis(kommando, kontekst('2026-10-07'), s.journal, KJERNE, vedlegg);
      expect(vist.godtatt && vist.hendelser.length, 'forhåndsvisningen har hele handlingen').toBe(
        3
      );
      const brevtekst = vist.godtatt ? laastTekst(vist.hendelser.at(-1)!) : null;
      const journal = [...s.journal];
      let utfall = vurderTrinnvis(
        { ...kommando, brevtekst },
        kontekst('2026-10-07'),
        journal,
        KJERNE,
        vedlegg
      );
      const dager = ['2026-10-08', '2026-10-09'];
      const typer: unknown[] = [];
      for (;;) {
        if (!utfall.godtatt) expect.fail(JSON.stringify(utfall.avvisning));
        expect(utfall.hendelser).toHaveLength(1);
        const [rad] = utfall.hendelser;
        journal.push({ ...rad!, versjon: journal.at(-1)!.versjon + 1 });
        typer.push(rad!.data.brevtekst === undefined ? 'varsel' : 'krav');
        if (!utfall.neste) break;
        utfall = utfall.neste(kontekst(dager.shift()!), journal);
      }
      expect(typer).toEqual(['varsel', 'varsel', 'krav']);
      expect(journal.at(-1)!.tidsstempel).toBe('2026-10-09T08:00:00.000Z');
      expect(utledJournal(journal, KJERNE).forstaatt).toBe(true);
    });

    it('avvises kravet, gis ingen rad, heller ikke varselet (VS-U53)', () => {
      const s = paaberopt();
      s.send('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000 }]));
      // KA-U56: P1 verken tas med eller trekkes.
      const kommando = vederlagskrav([{ ...regning, varsel: dokument() }]);
      // Serveren får den første raden før den skriver noe; den skal være avvisningen.
      const u = vurderTrinnvis(
        kommando,
        kontekst('2026-10-07'),
        s.journal,
        KJERNE,
        mellomlager(kommando)
      );
      expect(u.godtatt ? null : u.avvisning.regel).toBe('KRAVPOSTENE');
      expect(
        s.avvist(
          'TE',
          vederlagskrav([
            { ...tilbudspost, beloep: 1000 },
            { ...regning, varsel: dokument() },
          ])
        ),
        'kontrollsak'
      ).toBeNull();
    });

    it('et dokument for en post som ikke trenger varselet, eller med en dato som ikke er en dato, avvises før noe skrives (VS-U50)', () => {
      const s = paaberopt();
      expect(
        s.avvist('TE', vederlagskrav([{ ...tilbudspost, beloep: 1000, varsel: dokument() }]))
      ).toBe('KRAVPOSTVARSELET');
      const feil = s.avvisning(
        'TE',
        vederlagskrav([{ ...regning, varsel: { ...dokument(), sendt: '2026-13-40' } }])
      );
      expect(feil?.regel).toBe('UGYLDIG_FORM');
      expect(feil?.melding).toContain('Varselet for kravpost nr. 1');
    });

    it('vederlagskravet har egne vedlegg og dokumentet med varselet for en kravpost i samme brev, og brevet nevner begge (#1823 punkt 3, VS-U51)', () => {
      const s = paaberopt();
      const varselet = dokument();
      const krav = s.send('TE', {
        ...vederlagskrav([{ ...regning, varsel: varselet }]),
        dokumentasjon: [PLAN],
      });
      expect(((krav.data.dokumentasjon ?? []) as Data[]).map((v) => v.vedlegg_id)).toEqual([
        PLAN,
        varselet.dokumentasjon[0],
      ]);
      expect(laast(krav).at(-1)).toBe(
        `Brevet har vedlegg: «${PLAN}.pdf» og «${varselet.dokumentasjon[0]}.pdf».`
      );
      expect(s.u().forstaatt).toBe(true);
    });

    it('et vedlegg ved vederlagskravet som også er dokumentet med varselet for en kravpost, avvises i formen (VS-U51)', () => {
      const s = paaberopt();
      const varselet = dokument();
      const krav = vederlagskrav([{ ...regning, varsel: varselet }]);
      expect(
        s.avvisning('TE', { ...krav, dokumentasjon: [varselet.dokumentasjon[0]!.toUpperCase()] })
          ?.melding
      ).toBe(
        '$.dokumentasjon: vedlegget ved kravet er også dokumentet med varselet for en kravpost'
      );
      expect(s.avvist('TE', { ...krav, dokumentasjon: [PLAN] }), 'kontrollsak').toBeNull();
      // Et innhold med feil form gir feil i formen, også med vedlegg ved kravet, og kaster ikke.
      for (const innhold of [{ kravposter: 5 }, { kravposter: [null] }])
        for (const ved of [{}, { dokumentasjon: [PLAN] }])
          expect(formfeil({ type: 'krav', spor: 'vederlag', innhold, ...ved })).not.toEqual([]);
    });
  });
});
