/**
 * Byggherrens svar i brevene: svaret, forbeholdet, oppgjøret som fast sum, aksepten,
 * innsigelsen, protesten og passiviteten, bestridelsen, den senere begrunnelsen og svaret når
 * kravene er avgjort. Forventningene har kilde i LV-U4 (punkt 4–12, og 5.2, 5.5b og 5.6 i
 * svaret), GR-U14 (teksten etter § 31.3 i en godkjenning som er en endringsordre), VS-U9 og
 * VS-U11 (svaret gjentar eller gir opp innsigelsen) og B-13 05.10 (svaret når forholdet er
 * avslått eller prekludert), og vedtakene i navnet på hver gruppe.
 * Saken i minnet er `sak()` i `brevsak.ts`.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { innsigelsenErOppgitt } from '../frosset/standpunkt.ts';
import { innholdIFristen } from '../spor/frist/format.ts';
import { LINJEN_I_FRISTEN } from '../spor/frist/tekst.ts';
import { Uforstaatt } from '../format/skjema.ts';
import { punkteneMedBegrunnelse } from '../frosset/tekst.ts';
import { handlinger } from '../kommandoer/handlinger.ts';
import { lesJournal } from '../format/leser.ts';
import { utledJournal } from '../kommandoer/skriving.ts';
import { P1, medP1, medP1IkkeAkseptert } from './klient.ts';
import type { Journalrad, Part, Standpunktsvirkning } from '../typer.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import {
  enighetensVirkning,
  kraveneErAvgjort,
  standpunktetErSubsidiaert,
  venterPaaSvar,
} from '../utledning/utled.ts';
import { kanInngaaIEo } from '../spor/forhold/utledning.ts';
import { visning } from '../utledning/visning.ts';
import { KJERNE } from '../versjon.ts';
import { SOM_BREV } from './brevet.ts';
import {
  AVGJORT,
  BEGRUNNELSE,
  BESKRIVELSE,
  type Data,
  FORBEHOLDET,
  FORBEHOLD_FOR,
  FRISTKRAV,
  FRIST_FULLT,
  HINDRET,
  INNLEDNING_FORHOLDET,
  INNLEDNING_FRIST,
  INNLEDNING_VEDERLAG,
  KLAR_OVER,
  METODE_JA,
  MOT,
  PAABEROPELSE,
  SPESIFISERING_JA,
  VARSELET_33_4_I_TIDE,
  VARSELET_I_TIDE,
  VEDERLAG_DELVIS,
  iDelen,
  kr,
  laast,
  sak,
  sakMedKrav,
  sendtForVarseletIFristkravet,
  svar,
  tekst,
  tilbud,
  utenFelt,
  varseletIFristkravet,
} from './brevsak.ts';

describe('svaret (LV-U4 punkt 4 og 5, GR-U14)', () => {
  /** Forholdet er svikt (§ 34.1.2), vederlaget 125 000 kr (brev 3). */
  const sviktMedVederlag = () => {
    const s = sak();
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: {
        hovedkategori: 'svikt',
        underkategori: 'medvirkning',
        ...KLAR_OVER,
      },
    });
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
    return s;
  };
  const vederlagssvar = (iTide: boolean) => {
    const s = sviktMedVederlag();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...VEDERLAG_DELVIS[0], hovedkrav_varslet_i_tide: iTide },
          iTide ? VEDERLAG_DELVIS[1] : { resultat: 'avslaatt', godkjent_beloep: 0 }
        ),
      ],
    });
    return laast(rad).slice(2);
  };

  it('§ 34.1.2 «nei»: byggherren påberoper prinsipalt at varselet kom for sent, og beløpet står subsidiært (VS-U3, B-13)', () => {
    // HF-U1: teksten viser til brevet varselet etter § 34.1.2 står i (oppdragsgiver 17.10, #497).
    // LV-U34, LV-U40 og LV-U33/LV-U38: punktene i svaret, med lagslinjene. LV-U78: metoden og
    // beløpet står i punktet for kravposten. LV-U79: lagslinjen nevner innsigelsen. LV-U80 og
    // LV-U81: brevet svarer på to krav.
    expect(vederlagssvar(false)).toEqual([
      iDelen('vederlag', INNLEDNING_VEDERLAG),
      `2. Varselet om vederlagsjustering (punkt\u00a034.1.2)\n\nPrinsipalt\n\nByggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 punkt\u00a034.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent. Byggherren godkjenner etter dette ikke noe beløp for vederlagsjusteringen.`,
      `3. Vederlagsjustering for P1 Ny fundamentering (punkt\u00a034.1.2)\n\nSubsidiært, hvis ${MOT.varselet('34.1.2')} ikke fører frem\n\n${METODE_JA} Byggherren godkjenner ${kr('100 000')} av de krevde ${kr('125 000')}.`,
      `4. Forbehold\n\n${FORBEHOLD_FOR.vederlag}`,
    ]);
  });

  it('§ 34.2.2 «nei» sammen med preklusjon etter § 34.1.2: oppgjørsformen står subsidiært, og brevet sier ikke noe om beløpet (KA-U60, KA-U72, arbeidsvalget i #479)', () => {
    const s = sviktMedVederlag();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          medP1IkkeAkseptert(
            { ...VEDERLAG_DELVIS[0], hovedkrav_varslet_i_tide: false },
            'regningsarbeid'
          ),
          { resultat: 'avslaatt', godkjent_beloep: 0 }
        ),
      ],
    });
    // HF-U1: teksten viser til brevet varselet etter § 34.1.2 står i (oppdragsgiver 17.10, #497).
    expect(laast(rad).slice(2)).toEqual([
      iDelen('vederlag', INNLEDNING_VEDERLAG),
      `2. Varselet om vederlagsjustering (punkt\u00a034.1.2)\n\nPrinsipalt\n\nByggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 punkt\u00a034.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent. Byggherren godkjenner etter dette ikke noe beløp for vederlagsjusteringen.`,
      `3. Vederlagsjustering for P1 Ny fundamentering (punkt\u00a034.1.2)\n\nSubsidiært, hvis ${MOT.varselet('34.1.2')} ikke fører frem\n\nByggherren aksepterer ikke totalentreprenørens tilbud (punkt\u00a034.2.2 første ledd), og mener vederlaget skal justeres som regningsarbeid (punkt\u00a034.4).`,
      `4. Forbehold\n\n${FORBEHOLD_FOR.vederlag}`,
    ]);
  });

  it('§ 34.2.2 «nei» med et beløp avvises, fordi svaret ikke tar stilling til beløpet når tilbudet ikke er akseptert (KA-U72)', () => {
    const s = sakMedKrav();
    const brevet = (p1: Record<string, unknown>) => ({
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          P1({ aksepterer: false, oensket_oppgjoersform: 'enhetspriser', ...p1 }),
          { resultat: 'delvis_godkjent', godkjent_beloep: 0 }
        ),
      ],
    });
    expect(s.avvist('BH', brevet({})), 'kontrollsak').toBeNull();
    expect(
      s.avvisning('BH', brevet({ vurdering: 'godkjent', godkjent_beloep: 125000 }))?.melding
    ).toBe(
      'Vurderingene kan ikke regnes ut: P1.vurdering: byggherren aksepterer ikke tilbudet, men tar stilling til beløpet; P1.godkjent_beloep: byggherren aksepterer ikke tilbudet, men tar stilling til beløpet.'
    );
    expect(s.avvisning('BH', brevet({ vurdering: 'avslaatt' }))?.melding).toBe(
      'Vurderingene kan ikke regnes ut: P1.vurdering: byggherren aksepterer ikke tilbudet, men tar stilling til beløpet.'
    );
  });

  it('et godkjent beløp som ikke er et tall, avvises som en ugyldig vurdering, ikke som en feil på serveren (#550)', () => {
    const s = sakMedKrav();
    const brev = (beloep: unknown) => ({
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          medP1({ ...VEDERLAG_DELVIS[0] }, { godkjent_beloep: beloep }),
          VEDERLAG_DELVIS[1]
        ),
      ],
    });
    expect(s.avvist('BH', brev(100000)), 'kontrollsak').toBeNull();
    expect(() => s.avvisning('BH', brev('abc'))).not.toThrow();
    expect(s.avvisning('BH', brev('abc'))).toEqual({
      regel: 'UGYLDIG_VURDERING',
      melding: 'Vurderingene kan ikke regnes ut: P1.godkjent_beloep: er ikke et tall.',
    });
  });

  it('et ugyldig beløp i det lagrede kravet gjør saken ikke forstått, og meldes ikke som byggherrens ugyldige vurdering (#766)', () => {
    const s = sakMedKrav();
    const brev = {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
    };
    expect(s.avvist('BH', brev), 'kontrollsak').toBeNull();
    const lagret = s.journal
      .flatMap((r) => ((r.data as { krav?: Data[] }).krav ?? []) as Data[])
      .find((k) => k.id === s.krav('vederlag'))!;
    const p1 = (lagret.kravposter as Data[])[0]!;
    expect(p1.beloep, 'forutsetning').toBe(125000);
    p1.beloep = 'abc';
    // Leseren tolker ikke kravet, så saken er ikke forstått før svaret regnes ut (MM-U2).
    expect(s.avvist('BH', brev)).toBe('SAK_IKKE_FORSTAATT');
  });

  it('§ 34.2.2 «nei»: byggherren aksepterer ikke tilbudet og oppgir metoden, som standpunkt og ikke som appens avgjørelse, og brevet sier ikke noe om beløpet (KA-U72, arbeidsvalget i #479)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          medP1IkkeAkseptert({ ...VEDERLAG_DELVIS[0] }, 'enhetspriser'),
          { resultat: 'delvis_godkjent', godkjent_beloep: 0 }
        ),
      ],
    });
    expect(laast(rad)).toEqual([
      INNLEDNING_VEDERLAG,
      `1. Vederlagsjustering for P1 Ny fundamentering (punkt\u00a034.1.1)\n\nByggherren aksepterer ikke totalentreprenørens tilbud (NS 8407 punkt\u00a034.2.2 første ledd), og mener vederlaget skal justeres etter enhetspriser (punkt\u00a034.3).`,
      `2. Forbehold\n\n${FORBEHOLDET}`,
    ]);
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.sammenfall).toBe(false);
    expect(b.linje).toBe('Byggherrens standpunkt: tilbudet ikke akseptert (punkt\u00a034.2.2).');
  });

  it('§ 33.6.1 «nei»: dagene byggherren måtte forstå at TE hadde krav på, står prinsipalt, og de vurderte dagene subsidiært (VS-U4)', () => {
    const s = sakMedKrav();
    const kommando = {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { ...FRIST_FULLT[0], spesifisert_krav_ok: false, dager_maatte_forstaa: 5, dager: 15 },
          // B-13: resultatet regnes av de prinsipale dagene (VS-U4).
          { resultat: 'delvis_godkjent', godkjent_dager: 5 }
        ),
      ],
    };
    expect(s.avvist('BH', kommando)).toBeNull();
    const rad = s.send('BH', kommando);
    expect(laast(rad)).toEqual([
      INNLEDNING_FRIST,
      VARSELET_33_4_I_TIDE(1),
      HINDRET(2),
      '3. Spesifiseringen av kravet (punkt\u00a033.6.1)\n\nPrinsipalt\n\nByggherren gjør gjeldende at kravet om fristforlengelse ble spesifisert for sent, og at totalentreprenøren bare har krav på den fristforlengelsen byggherren måtte forstå at totalentreprenøren hadde krav på: 5 dager for frist Sluttfristen (punkt\u00a033.6.1).',
      `4. Dagene for frist Sluttfristen\n\nSubsidiært, hvis ${MOT.spesifiseringen} ikke fører frem\n\nFor frist Sluttfristen godkjenner byggherren 15 dager av de krevde 20 dager.`,
      `5. Forbehold\n\n${FORBEHOLDET}`,
    ]);
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.linje).toBe(
      'Byggherrens standpunkt: prinsipalt godkjent med 5 dager for frist Sluttfristen (punkt\u00a033.6.1), subsidiært godkjent med 15 dager for frist Sluttfristen.'
    );
  });

  it('linjen skriver «1 dag» for én dag, prinsipalt og subsidiært, som brevteksten (#1870)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { ...FRIST_FULLT[0], spesifisert_krav_ok: false, dager_maatte_forstaa: 1, dager: 1 },
          { resultat: 'delvis_godkjent', godkjent_dager: 1 }
        ),
      ],
    });
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.linje).toBe(
      'Byggherrens standpunkt: prinsipalt godkjent med 1 dag for frist Sluttfristen (punkt\u00a033.6.1), subsidiært godkjent med 1 dag for frist Sluttfristen.'
    );
  });

  it('med to frister nevner linjen fristen dagene byggherren måtte forstå gjelder, og ikke en frist med 0 dager som brevteksten nevner (#1931, VS-U4)', () => {
    const s = sakMedKrav();
    s.send('TE', {
      ...utenFelt(FRISTKRAV, 'varsel'),
      innhold: {
        frister: [
          {
            id: innholdIFristen(s.u().spor.frist.gjeldendeKrav!).frister[0]!.id,
            navn: 'Sluttfristen',
            dager: 20,
          },
          { navn: 'Delfristen', dager: 10 },
        ],
      },
    });
    const [a, b] = innholdIFristen(s.u().spor.frist.gjeldendeKrav!).frister.map((f) => f.id);
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          {
            ...utenFelt(FRIST_FULLT[0], 'dager'),
            spesifisert_krav_ok: false,
            frister: [
              { dager: 15, dager_maatte_forstaa: 0 },
              { dager: 10, dager_maatte_forstaa: 5 },
            ],
          },
          {
            frister: [
              { gjelder: a, resultat: 'avslaatt', godkjent_dager: 0 },
              { gjelder: b, resultat: 'delvis_godkjent', godkjent_dager: 5 },
            ],
          }
        ),
      ],
    });
    expect(laast(rad).join('\n\n')).toContain(
      'måtte forstå at totalentreprenøren hadde krav på: 0 dager for frist Sluttfristen og 5 dager for frist Delfristen (punkt\u00a033.6.1).'
    );
    const b2 = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    // Leddene for dagene nevner fristen (#1943).
    expect(b2.linje).toBe(
      'Byggherrens standpunkt: prinsipalt godkjent med 5 dager for frist Delfristen (punkt\u00a033.6.1), subsidiært godkjent med 15 dager for frist Sluttfristen, godkjent med 10 dager for frist Delfristen.'
    );
  });

  it('et fristsvar med dagene byggherren måtte forstå, uten kjent krav eller for en frist kravet ikke har, kan ikke leses i linjen (MM-U2, #1931)', () => {
    const svar = {
      spor: 'frist',
      standpunkter: [
        { id: 's', art: 'spesifisering', iTide: false, maatteForstaa: [{ frist: 'a', dager: 5 }] },
      ],
      utregning: {},
    } as unknown as Parameters<typeof LINJEN_I_FRISTEN.grunner>[0];
    expect(() => LINJEN_I_FRISTEN.grunner(svar, null, undefined)).toThrow(Uforstaatt);
    const s = sakMedKrav();
    const kravet = s.u().spor.frist.gjeldendeKrav!;
    expect(() => LINJEN_I_FRISTEN.grunner(svar, null, kravet)).toThrow(Uforstaatt);
    const a = innholdIFristen(kravet).frister[0]!.id;
    const kontroll = {
      ...svar,
      standpunkter: [{ ...svar.standpunkter[0]!, maatteForstaa: [{ frist: a, dager: 5 }] }],
    } as typeof svar;
    expect(LINJEN_I_FRISTEN.grunner(kontroll, null, kravet).spesifisering).toBe(
      'godkjent med 5 dager for frist Sluttfristen (punkt 33.6.1)'
    );
  });

  it('leddene for dagene nevner fristen også når kravet har én frist, og kan ikke leses uten kravet (#1943, MM-U2)', () => {
    const s = sakMedKrav();
    const kravet = s.u().spor.frist.gjeldendeKrav!;
    const a = innholdIFristen(kravet).frister[0]!.id;
    const svar = {
      spor: 'frist',
      standpunkter: [
        { id: 'd1', art: 'dager', gjelder: a, resultat: 'avslaatt', vurdert: 0 },
        { id: 'd2', art: 'dager', gjelder: a, resultat: 'delvis_godkjent', vurdert: 7 },
      ],
      utregning: {},
    } as unknown as Parameters<typeof LINJEN_I_FRISTEN.ledd>[0];
    const v = [
      { standpunkt: 'd1', art: 'dager', virkning: 0 },
      { standpunkt: 'd2', art: 'dager', virkning: 1 },
    ] satisfies Standpunktsvirkning[];
    expect(LINJEN_I_FRISTEN.ledd(svar, v, kravet).map((l) => l.tekst)).toEqual([
      'avslått for frist Sluttfristen',
      'godkjent med 7 dager for frist Sluttfristen',
    ]);
    expect(() => LINJEN_I_FRISTEN.ledd(svar, v, undefined)).toThrow(Uforstaatt);
  });

  it('§ 34.1.2 «nei» med hele beløpet godkjent subsidiært godtas uten begrunnelse (KA-U46 punkt 1)', () => {
    const s = sviktMedVederlag();
    const brevet = (utdypning: string | null) => ({
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent' }, {}, null),
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            ...P1({ vurdering: 'godkjent', godkjent_beloep: 125000, aksepterer: true }),
            hovedkrav_varslet_i_tide: false,
          },
          { resultat: 'avslaatt', godkjent_beloep: 0 },
          utdypning
        ),
      ],
    });
    expect(s.avvist('BH', brevet(null))).toBeNull();
  });

  it('§ 34.1.2 «ja»: byggherrens standpunkt står i brevet, uten å ordnes (KA-U4, LV-U3)', () => {
    // HF-U1: teksten viser til brevet varselet etter § 34.1.2 står i (oppdragsgiver 17.10, #497).
    // LV-U78, LV-U80 og LV-U81.
    expect(vederlagssvar(true)).toEqual([
      iDelen('vederlag', INNLEDNING_VEDERLAG),
      `2. Varselet om vederlagsjustering (punkt\u00a034.1.2)\n\nByggherren gjør ikke gjeldende at varselet om vederlagsjustering etter NS 8407 punkt\u00a034.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.`,
      `3. Vederlagsjustering for P1 Ny fundamentering (punkt\u00a034.1.2)\n\n${METODE_JA} Byggherren godkjenner ${kr('100 000')} av de krevde ${kr('125 000')}.`,
      `4. Forbehold\n\n${FORBEHOLD_FOR.vederlag}`,
    ]);
  });

  it('§ 34.2.2 «nei» godtas uten begrunnelse for tilbudet (KA-U46 punkt 1, KA-U72)', () => {
    const s = sakMedKrav();
    const brevet = {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          medP1IkkeAkseptert({}, 'enhetspriser'),
          // OV-U73, KA-U72: uten aksept har kravposten ikke et fast beløp.
          { resultat: 'delvis_godkjent', godkjent_beloep: 0 },
          null
        ),
      ],
    };
    expect(s.avvisning('BH', brevet)).toBeNull();
  });

  it('avslag på et krav under 0,50 kr godtas uten begrunnelse (KA-U46 punkt 1)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(0.4) });
    const brevet = {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          P1({ vurdering: 'avslaatt', aksepterer: true }),
          { resultat: 'avslaatt', godkjent_beloep: 0 },
          null
        ),
      ],
    };
    expect(s.avvisning('BH', brevet)).toBeNull();
  });

  it('linjen ordner byggherrens standpunkter prinsipalt, subsidiært og videre subsidiært, som brevteksten (HF-U2, VS-U3, arbeidsvalget 15.10 i #492)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          {
            frist_varsel_ok: false,
            spesifisert_krav_ok: false,
            dager_maatte_forstaa: 5,
            vilkar_oppfylt: false,
            dager: 10,
          },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.linje).toBe(
      'Byggherrens standpunkt: prinsipalt varselet etter punkt\u00a033.4 kom for sent, subsidiært avslått: fremdriften er ikke hindret, eller hindringen skyldes ikke forholdet (punkt\u00a033.1), videre subsidiært godkjent med 5 dager for frist Sluttfristen (punkt\u00a033.6.1), videre subsidiært godkjent med 10 dager for frist Sluttfristen.'
    );
  });

  // OV-U32: appen fryser laget hvert standpunkt står i som et nummer, og brevet setter én
  // etikett per lag etter den fryste verdien. Brevet og beslutningsgrunnlaget sier det samme
  // (#1047, B4-1b).
  it('§ 33.4 for sent, ingen hindring og dagene står i lag 1, 2 og 3, i brevet og i beslutningsgrunnlaget (OV-U32)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { frist_varsel_ok: false, spesifisert_krav_ok: true, vilkar_oppfylt: false, dager: 10 },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect((b.virkninger as Data[]).map((v) => v.lag)).toEqual([1, 2, 3, 3]);
    expect(b.uten_virkning).toBeUndefined();
    expect(b.linje).toBe(
      'Byggherrens standpunkt: prinsipalt varselet etter punkt\u00a033.4 kom for sent, subsidiært avslått: fremdriften er ikke hindret, eller hindringen skyldes ikke forholdet (punkt\u00a033.1), videre subsidiært ingen innsigelse om at kravet ble spesifisert for sent (punkt\u00a033.6.1), godkjent med 10 dager for frist Sluttfristen.'
    );
    // KA-U84: vurderingen av spesifiseringen følger innsigelsene, i samme lag som dagene.
    expect(laast(rad)).toEqual([
      INNLEDNING_FRIST,
      '1. Varselet om fristforlengelse (punkt\u00a033.4)\n\nPrinsipalt\n\nByggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i totalentreprenørens brev av 28. september 2026 kom for sent.',
      `2. Hindringen\n\nSubsidiært, hvis ${MOT.varselet('33.4')} ikke fører frem\n\nByggherren legger ikke til grunn at fremdriften er hindret, eller at en hindring skyldes forholdet (punkt\u00a033.1).`,
      `3. Spesifiseringen av kravet (punkt\u00a033.6.1)\n\nVidere subsidiært, hvis heller ikke ${MOT.hindringen} fører frem\n\n${SPESIFISERING_JA}`,
      `4. Dagene for frist Sluttfristen\n\nVidere subsidiært, hvis heller ikke ${MOT.hindringen} fører frem\n\nFor frist Sluttfristen godkjenner byggherren 10 dager av de krevde 20 dager.`,
      `5. Forbehold\n\n${FORBEHOLDET}`,
    ]);
    const dagene = s.u().spor.frist.gjeldendeSvar!.standpunkter.find((p) => p.art === 'dager')!;
    expect(standpunktetErSubsidiaert(s.u(), 'frist', dagene.id), 'OV-U32').toBe(true);
  });

  it('KA-U84: bekreftet hindring får vilkåret fra varselet uten å åpne et eget lag for dagene', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'frist',
          s.krav('frist'),
          { frist_varsel_ok: false, spesifisert_krav_ok: true, vilkar_oppfylt: true, dager: 10 },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect((b.virkninger as Data[]).map((v) => v.lag)).toEqual([1, 2, 2, 2]);
    expect(laast(rad)[2]).toBe(
      HINDRET(2).replace('\n\n', `\n\nSubsidiært, hvis ${MOT.varselet('33.4')} ikke fører frem\n\n`)
    );
    expect(laast(rad)[4]).toBe(
      `4. Dagene for frist Sluttfristen\n\nSubsidiært, hvis ${MOT.varselet('33.4')} ikke fører frem\n\nFor frist Sluttfristen godkjenner byggherren 10 dager av de krevde 20 dager.`
    );
  });

  it('innledningen nevner sporet, og standpunktene ordnes slik brevet ordner dem', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: false,
        }),
        svar(
          'frist',
          s.krav('frist'),
          { frist_varsel_ok: false, spesifisert_krav_ok: true, vilkar_oppfylt: false, dager: 10 },
          { resultat: 'avslaatt', godkjent_dager: 0 }
        ),
      ],
    });
    // LV-U34, LV-U40 og GR-U32: svarene i punkter med lagslinjer, nummerert gjennom brevet.
    // A2: fristen er subsidiær fordi forholdet er prekludert i samme brev, og lagslinjen nevner
    // innsigelsen i svaret på forholdet (LV-U79). KA-U84 gjelder også vurderingen av
    // spesifiseringen. LV-U80: hvert svar begynner med en overskrift. LV-U81: forbeholdet sist.
    expect(laast(rad)).toEqual([
      iDelen('forhold', INNLEDNING_FORHOLDET),
      '1. Varselet etter punkt\u00a032.2\n\nPrinsipalt\n\nByggherren gjør gjeldende at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent.',
      `2. Forholdet\n\nSubsidiært, hvis ${MOT.varselet('32.2')} ikke fører frem\n\nByggherren er enig i at pålegget innebærer en endring.`,
      iDelen('frist', INNLEDNING_FRIST),
      `3. Varselet om fristforlengelse (punkt\u00a033.4)\n\nSubsidiært, hvis ${MOT.varselet('32.2')} ikke fører frem\n\nByggherren gjør gjeldende at varselet om fristforlengelse etter punkt\u00a033.4 i totalentreprenørens brev av 28. september 2026 kom for sent.`,
      `4. Hindringen\n\nVidere subsidiært, hvis heller ikke ${MOT.varselet('33.4')} fører frem\n\nByggherren legger ikke til grunn at fremdriften er hindret, eller at en hindring skyldes forholdet (punkt\u00a033.1).`,
      `5. Spesifiseringen av kravet (punkt\u00a033.6.1)\n\nVidere subsidiært, hvis heller ikke ${MOT.hindringen} fører frem\n\n${SPESIFISERING_JA}`,
      `6. Dagene for frist Sluttfristen\n\nVidere subsidiært, hvis heller ikke ${MOT.hindringen} fører frem\n\nFor frist Sluttfristen godkjenner byggherren 10 dager av de krevde 20 dager.`,
      `7. Forbehold\n\n${FORBEHOLD_FOR.frist}`,
    ]);
  });

  it('MM-U2, KA-U74: et lest fristsvar med dagene for en annen frist enn i kravet gjør saken ikke forstått', () => {
    const s = sakMedKrav();
    const frist = innholdIFristen(s.u().spor.frist.gjeldendeKrav!).frister[0]!.id;
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    expect(s.u().forstaatt, 'kontrollsak: svaret gjelder fristen i kravet').toBe(true);
    rad.data.svar = JSON.parse(JSON.stringify(rad.data.svar).replaceAll(frist, randomUUID()));
    const u = s.u();
    expect(u.forstaatt).toBe(false);
    expect(u.begrensninger.map((b) => b.grunn)).toContain(
      'dagene i svaret er ikke de samme fristene som i kravet'
    );
  });

  it('et standpunkt appen regner som uten virkning, står som byggherren sa det', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(
      b.uten_virkning,
      'forutsetning: appen regner tre standpunkter som uten virkning'
    ).toHaveLength(3);
    expect(laast(rad)).toEqual([
      INNLEDNING_FRIST,
      VARSELET_33_4_I_TIDE(1),
      HINDRET(2),
      `3. Spesifiseringen av kravet (punkt\u00a033.6.1)\n\n${SPESIFISERING_JA}`,
      '4. Dagene for frist Sluttfristen\n\nFor frist Sluttfristen godkjenner byggherren 20 dager.',
      `5. Forbehold\n\n${FORBEHOLDET}`,
    ]);
  });

  it('beløpet i et delvis godkjent vederlag står med det krevde, uten merverdiavgift', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
    });
    expect(laast(rad)).toEqual([
      INNLEDNING_VEDERLAG,
      `1. Vederlagsjustering for P1 Ny fundamentering (punkt\u00a034.1.1)\n\n${METODE_JA} Byggherren godkjenner ${kr('100 000')} av de krevde ${kr('125 000')}.`,
      `2. Forbehold\n\n${FORBEHOLDET}`,
    ]);
  });

  it('avslaget der § 32.2 gjelder, er et avslag av kravet på endringsordre (§ 32.3 b)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    // GR-U32 og LV-U41; «NS 8407» står bare første gang (LV-U39).
    expect(laast(rad)).toEqual([
      INNLEDNING_FORHOLDET,
      VARSELET_I_TIDE,
      '2. Forholdet\n\nByggherren avslår kravet på endringsordre (punkt\u00a032.3 første ledd b).',
    ]);
  });

  it('kontrollsak: avslaget der § 32.2 ikke gjelder, sier at byggherren ikke har risikoen for forholdet (GR-U32)', () => {
    const s = sak();
    s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
    });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('forhold', s.krav('forhold'), { resultat: 'avslaatt' })],
    });
    expect(laast(rad)).toEqual([
      'Byggherren svarer på totalentreprenørens påberopelse av uforutsette forhold ved grunnen i brev K201-KOE-017-01 av 2. oktober 2026.',
      '1. Forholdet\n\nByggherren har ikke risikoen for forholdet (NS 8407 punkt\u00a023.1).',
    ]);
  });

  it('frafallet lover endringsordre for allerede utført arbeid (§ 32.3 c, LV-U4 5.5b)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'paalegg_frafalt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)[2]).toBe(
      '2. Forholdet\n\nByggherren frafaller pålegget mot å utstede endringsordre for allerede utført arbeid (punkt\u00a032.3 første ledd c).'
    );
  });

  it('en revisjon viser til svaret den erstatter (HF-U1)', () => {
    const s = sakMedKrav();
    const dager = (n: number) =>
      svar(
        'frist',
        s.krav('frist'),
        { ...FRIST_FULLT[0], dager: n },
        { resultat: 'delvis_godkjent', godkjent_dager: n }
      );
    s.send('BH', { type: 'brev', svar: [dager(10)] });
    const rad = s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.frist.gjeldendeSvar!.id,
      svar: dager(15),
    });
    // LV-U73: setningene om byggherrens forrige svar står i innledningen (LV-U34).
    expect(laast(rad)[0]).toBe(
      `${INNLEDNING_FRIST} Dette er byggherrens nye svar. Byggherrens forrige svar står i brev K201-KOE-017-04 av 5. oktober 2026.`
    );
    expect(laast(rad)[4]).toBe(
      '4. Dagene for frist Sluttfristen\n\nFor frist Sluttfristen godkjenner byggherren 15 dager av de krevde 20 dager.'
    );
  });

  it('godkjenningen som er en endringsordre, krever endringen og siterer TEs beskrivelse (GR-U14)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)).toEqual([
      INNLEDNING_FORHOLDET,
      VARSELET_I_TIDE,
      `2. Forholdet\n\nSvaret er en endringsordre etter punkt\u00a032.3 første ledd a, jf. punkt\u00a031.3: byggherren krever at endringen utføres slik pålegget er beskrevet i totalentreprenørens krav i brev K201-KOE-017-01 av 2. oktober 2026: «${BESKRIVELSE}».`,
    ]);
  });

  it('brevet viser til kravversjonen svaret gjelder, også etter en ny kravversjon (GR-U14)', () => {
    const s = sakMedKrav();
    s.send('TE', { ...PAABEROPELSE, utdypning: 'Ny beskrivelse.' });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad).at(-1) ?? '').toMatch(
      /beskrevet i totalentreprenørens krav i brev K201-KOE-017-04 av 5\. oktober 2026: «Ny beskrivelse\.»\.$/
    );
  });

  it('et krav lagt til med kravskjemaet blir gjeldende krav, og byggherren svarer på det fra løsningen (OV-U80, OV-U98)', () => {
    const s = sak();
    const id = randomUUID();
    s.rad('TE', {
      krav: [
        { id, spor: 'forhold', hovedkategori: 'endring', underkategori: 'irregulaer_endring' },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
      ...SOM_BREV,
    });
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.spor.forhold.gjeldendeKrav?.id, 'kravet er gjeldende krav (OV-U80)').toBe(id);
    const godkjent = {
      type: 'brev',
      svar: [svar('forhold', id, { resultat: 'godkjent', grunnlag_varslet_i_tide: true })],
    };
    expect(
      s.avvist('BH', godkjent),
      'samme virkning som et krav fra løsningen (OV-U80)'
    ).toBeNull();
  });

  it('et krav fra appen uten beskrivelse gir ingen godkjenning som endringsordre (GR-U14)', () => {
    const s = sak();
    // Et krav fra en annen skriver uten brevtekst, som en eldre TS-versjon.
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'forhold',
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
        },
      ],
    });
    const godkjent = (iTide: boolean) => ({
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: iTide,
        }),
      ],
    });
    expect(s.avvist('BH', godkjent(true))).toBe('PAALEGGET_IKKE_BESKREVET');
    // Kontrollsak: med påberopt preklusjon er svaret ikke en endringsordre.
    expect(s.avvist('BH', godkjent(false))).toBeNull();
  });
});

describe('svaret på vederlag og frist når forholdet er avslått eller prekludert (A2, B-13 05.10)', () => {
  const vederlag = (s: ReturnType<typeof sak>) =>
    svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]);
  const forhold = (s: ReturnType<typeof sak>, resultat: string, iTide: boolean) =>
    svar('forhold', s.krav('forhold'), { resultat, grunnlag_varslet_i_tide: iTide });
  // LV-U34, LV-U40 og OV-U32: punktet i vederlagssvaret, med lagslinjen foran standpunktene.
  // LV-U78: metoden og beløpet står i punktet for kravposten, i samme avsnitt.
  const delvis = (n: number, lag: string) =>
    `${n}. Vederlagsjustering for P1 Ny fundamentering (punkt\u00a034.1.1)\n\n${lag}\n\n${METODE_JA} Byggherren godkjenner ${kr('100 000')} av de krevde ${kr('125 000')}.`;
  // LV-U79: lagslinjen nevner innsigelsen i det nærmeste laget foran.
  const subsidiaert = (innsigelsen: string) => `Subsidiært, hvis ${innsigelsen} ikke fører frem`;
  const videre = (innsigelsen: string) =>
    `Videre subsidiært, hvis heller ikke ${innsigelsen} fører frem`;
  const prekludert =
    '1. Varselet etter punkt\u00a032.2\n\nPrinsipalt\n\nByggherren gjør gjeldende at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent.';

  it.each([
    [
      'avslått i samme brev',
      'avslaatt',
      true,
      [
        VARSELET_I_TIDE,
        // LV-U82: avslaget får «Prinsipalt» når vederlaget står subsidiært til det.
        '2. Forholdet\n\nPrinsipalt\n\nByggherren avslår kravet på endringsordre (punkt\u00a032.3 første ledd b).',
        iDelen('vederlag', INNLEDNING_VEDERLAG),
        delvis(3, subsidiaert(MOT.forholdet)),
      ],
    ],
    [
      'prekludert og godkjent subsidiært i samme brev',
      'godkjent',
      false,
      [
        prekludert,
        `2. Forholdet\n\n${subsidiaert(MOT.varselet('32.2'))}\n\nByggherren er enig i at pålegget innebærer en endring.`,
        iDelen('vederlag', INNLEDNING_VEDERLAG),
        delvis(3, subsidiaert(MOT.varselet('32.2'))),
      ],
    ],
    [
      'prekludert og avslått subsidiært i samme brev',
      'avslaatt',
      false,
      [
        prekludert,
        `2. Forholdet\n\n${subsidiaert(MOT.varselet('32.2'))}\n\nByggherren avslår kravet på endringsordre (punkt\u00a032.3 første ledd b).`,
        iDelen('vederlag', INNLEDNING_VEDERLAG),
        delvis(3, videre(MOT.forholdet)),
      ],
    ],
  ])('forholdet %s', (_n, resultat, iTide, forventet) => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'brev', svar: [forhold(s, resultat, iTide), vederlag(s)] });
    // LV-U80 og LV-U81: hvert svar begynner med en overskrift, og forbeholdet for vederlaget har
    // ledeteksten sin.
    expect(laast(rad)).toEqual([
      iDelen('forhold', INNLEDNING_FORHOLDET),
      ...forventet,
      `4. Forbehold\n\n${FORBEHOLD_FOR.vederlag}`,
    ]);
  });

  // Ordlyden er alternativ A i spørsmål 3 i #1433 (kommentaren 6837001621), som venter på svar.
  it.each([
    [
      'avslått i et tidligere brev',
      'avslaatt',
      true,
      [
        '1. Forholdet\n\nPrinsipalt\n\nByggherren har avslått kravet på endringsordre i brev K201-KOE-017-04 av 5. oktober 2026.',
        delvis(2, subsidiaert(MOT.forholdet)),
      ],
    ],
    [
      'prekludert og godkjent subsidiært i et tidligere brev',
      'godkjent',
      false,
      [
        '1. Forholdet\n\nPrinsipalt\n\nByggherren har i brev K201-KOE-017-04 av 5. oktober 2026 gjort gjeldende at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 kom for sent.',
        delvis(2, subsidiaert(MOT.varselet('32.2'))),
      ],
    ],
    [
      'prekludert og avslått subsidiært i et tidligere brev',
      'avslaatt',
      false,
      [
        `1. Forholdet\n\nPrinsipalt\n\nByggherren har i brev K201-KOE-017-04 av 5. oktober 2026 gjort gjeldende at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 kom for sent.\n\n${subsidiaert(MOT.varselet('32.2'))}\n\nByggherren har avslått kravet på endringsordre i brev K201-KOE-017-04 av 5. oktober 2026.`,
        delvis(2, videre(MOT.forholdet)),
      ],
    ],
  ])('forholdet %s', (_n, resultat, iTide, forventet) => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, resultat, iTide)] });
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)).toEqual([INNLEDNING_VEDERLAG, ...forventet, '3. Forbehold']);
  });

  it('standpunktet om at varselet etter § 33.4 kom i tide, nevner hjemmelen etter § 32.2-preklusjonen (LV-U5)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, 'godkjent', false)] });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    // OV-U32, LV-U34: forholdet fra det tidligere svaret står i et eget punkt, og dagene i laget etter.
    expect(laast(rad)).toEqual([
      INNLEDNING_FRIST,
      '1. Forholdet\n\nPrinsipalt\n\nByggherren har i brev K201-KOE-017-04 av 5. oktober 2026 gjort gjeldende at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 kom for sent.',
      '2. Varselet om fristforlengelse (punkt\u00a033.4)\n\nByggherren gjør ikke gjeldende at varselet om fristforlengelse etter punkt\u00a033.4 i totalentreprenørens brev av 28. september 2026 kom for sent.',
      HINDRET(3),
      `4. Spesifiseringen av kravet (punkt\u00a033.6.1)\n\n${SPESIFISERING_JA}`,
      `5. Dagene for frist Sluttfristen\n\n${subsidiaert(MOT.varselet('32.2'))}\n\nFor frist Sluttfristen godkjenner byggherren 20 dager.`,
      '6. Forbehold',
    ]);
  });

  // Arbeidsvalget i #2145, etter LV-U41 og MM-U50 (LV-U71).
  const vederlaget = (s: ReturnType<typeof sak>) => vederlag(s);
  const fristen = (s: ReturnType<typeof sak>) =>
    svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1]);
  it.each([
    ['vederlaget', 'avslått', vederlaget, 'avslaatt', true],
    ['vederlaget', 'prekludert', vederlaget, 'godkjent', false],
    ['fristen', 'avslått', fristen, 'avslaatt', true],
    ['fristen', 'prekludert', fristen, 'godkjent', false],
  ])(
    'svaret på %s har ikke noe felt for begrunnelsen av forholdet fra et tidligere brev (%s), og avviser en begrunnelse for det (#2145, LV-U41, MM-U50)',
    (_n, _grunn, svaret, resultat, iTide) => {
      const s = sakMedKrav();
      s.send('BH', { type: 'brev', svar: [forhold(s, resultat, iTide)] });
      expect(
        s.avvisning('BH', {
          type: 'brev',
          svar: [{ ...svaret(s), utdypninger: { forholdet: BEGRUNNELSE } }],
        })?.melding
      ).toBe('Punktet «Forholdet» i brevet har ingen begrunnelse.');
      const rad = s.send('BH', { type: 'brev', svar: [svaret(s)] });
      expect(
        tekst(rad).map((a) => a.punkt),
        'punktet står i brevet'
      ).toContain('forholdet');
      const punktene = punkteneMedBegrunnelse(tekst(rad)).map((p) => p.punkt);
      expect(punktene, 'kontrollsak: de andre punktene har et felt').not.toEqual([]);
      expect(punktene).not.toContain('forholdet');
    }
  );

  it('kontrollsak: svarer byggherren på forholdet i samme brev, har brevet ikke punktet, og en begrunnelse for det avvises som et punkt brevet ikke har (#2145, LV-U71)', () => {
    const s = sakMedKrav();
    expect(
      s.avvisning('BH', {
        type: 'brev',
        svar: [
          forhold(s, 'avslaatt', true),
          { ...vederlag(s), utdypninger: { forholdet: BEGRUNNELSE } },
        ],
      })?.melding
    ).toBe('Brevet har ikke punktet utdypningen gjelder («forholdet»).');
  });

  it('kontrollsak: forholdet godkjent gir ingen prinsipal grunn fra forholdet', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, 'godkjent', true)] });
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)).toEqual([
      INNLEDNING_VEDERLAG,
      `1. Vederlagsjustering for P1 Ny fundamentering (punkt\u00a034.1.1)\n\n${METODE_JA} Byggherren godkjenner ${kr('100 000')} av de krevde ${kr('125 000')}.`,
      '2. Forbehold',
    ]);
  });

  it('teksten fryses som den var, og en senere revisjon av svaret på påberopelsen endrer den ikke (MM-U9)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, 'avslaatt', true)] });
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    const foer = laast(rad);
    s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
      svar: forhold(s, 'godkjent', true),
    });
    const lest = lesJournal(s.journal, KJERNE.leserformat).find((h) => h.id === rad.event_id)!;
    expect(lest.art === 'dokument' && lest.dokument.brevtekst!.map((a) => a.laast)).toEqual(foer);
  });
});

/**
 * GR-U26: svarer byggherren på vederlag eller frist uten å ha svart på gjeldende versjon av
 * forholdet, sier brevet det (arbeidsvalget S2 i #1239): i punktet «Forbehold», som står én gang,
 * sist i brevet (GR-U34, GR-U33, LV-U72, LV-U81). Forholdet avklart ved frafall gir ikke forbeholdet (GR-U23).
 */
describe('forbeholdet når forholdet ikke er besvart (GR-U26)', () => {
  type Sak = ReturnType<typeof sak>;
  /** GR-U34 og GR-U33: forbeholdet i punktet «Forbehold» i svaret på vederlaget. */
  const forbeholdet = (brev: string) =>
    `Byggherren har ennå ikke svart på totalentreprenørens påberopelse av irregulær endring i ${brev}. Standpunktene ovenfor gjelder under forutsetning av at forholdet gir grunnlag for kravet.`;
  const innledning = (brev: string) =>
    `Byggherren svarer på totalentreprenørens krav om justering av vederlaget i ${brev}. Beløpene i brevet er eks. mva.`;
  /** LV-U78: punktet for kravposten, med metoden og beløpet, nummer `n`. */
  const punktene = (n: number, beloep = '100 000') => [
    `${n}. Vederlagsjustering for P1 Ny fundamentering (punkt\u00a034.1.1)\n\n${METODE_JA} Byggherren godkjenner ${kr(beloep)} av de krevde ${kr('125 000')}.`,
  ];
  const vederlag = (s: Sak) =>
    svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]);
  const frist = (s: Sak) => svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1]);
  const forhold = (s: Sak, resultat: string) =>
    svar('forhold', s.krav('forhold'), { resultat, grunnlag_varslet_i_tide: true });

  it('det første svaret på vederlaget har forbeholdet, med brevet påberopelsen står i', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)).toEqual([
      INNLEDNING_VEDERLAG,
      ...punktene(1),
      `2. Forbehold\n\n${forbeholdet('brev K201-KOE-017-01 av 2. oktober 2026')}`,
    ]);
  });

  it('GR-08: en revisjon av vederlagssvaret mens en ny påberopelsesversjon venter, har forbeholdet og ikke avslaget på den forrige', () => {
    const s = sakMedKrav();
    // Brev 5: forholdet avslått og vederlaget delvis godkjent.
    s.send('BH', { type: 'brev', svar: [forhold(s, 'avslaatt'), vederlag(s)] });
    s.send('TE', PAABEROPELSE); // Brev 6: forholdet i versjon 2.
    expect(s.u().spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 er ikke besvart').toBeNull();
    const rad = s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.vederlag.gjeldendeSvar!.id,
      svar: svar(
        'vederlag',
        s.krav('vederlag'),
        medP1({ ...VEDERLAG_DELVIS[0] }, { godkjent_beloep: 110000 }),
        { ...VEDERLAG_DELVIS[1], godkjent_beloep: 110000 }
      ),
    });
    const tekst = laast(rad);
    expect(tekst).toEqual([
      `${innledning('brev K201-KOE-017-02 av 3. oktober 2026')} Dette er byggherrens nye svar. Byggherrens forrige svar står i brev K201-KOE-017-04 av 5. oktober 2026.`,
      ...punktene(1, '110 000'),
      `2. Forbehold\n\n${forbeholdet('brev K201-KOE-017-05 av 6. oktober 2026')}`,
    ]);
    expect(tekst.join('\n')).not.toMatch(/avsl/);
  });

  it('svar på vederlag og frist i samme brev har forbeholdet én gang, i punktet «Forbehold» sist i brevet (LV-U81, arbeidsvalget S2 i #1239)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s), frist(s)] });
    // LV-U80: hvert svar begynner med en overskrift, og punktene er nummerert gjennom brevet.
    // LV-U81: forbeholdet om forholdet først, så byggherrens forbehold for hvert svar i et eget
    // avsnitt med ledeteksten sin.
    expect(laast(rad)).toEqual([
      iDelen('vederlag', INNLEDNING_VEDERLAG),
      ...punktene(1),
      iDelen('frist', INNLEDNING_FRIST),
      VARSELET_33_4_I_TIDE(2),
      HINDRET(3),
      `4. Spesifiseringen av kravet (punkt\u00a033.6.1)\n\n${SPESIFISERING_JA}`,
      '5. Dagene for frist Sluttfristen\n\nFor frist Sluttfristen godkjenner byggherren 20 dager.',
      `6. Forbehold\n\n${forbeholdet('brev K201-KOE-017-01 av 2. oktober 2026')}\n\n${FORBEHOLD_FOR.vederlag}`,
      FORBEHOLD_FOR.frist,
    ]);
  });

  it('kontrollsak: med forholdet godkjent i samme brev har svaret ikke forbeholdet', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'brev', svar: [forhold(s, 'godkjent'), vederlag(s)] });
    // LV-U80 og LV-U81: svaret har overskriften sin, og forbeholdet for vederlaget ledeteksten sin.
    expect(laast(rad).slice(3)).toEqual([
      iDelen('vederlag', INNLEDNING_VEDERLAG),
      ...punktene(3),
      `4. Forbehold\n\n${FORBEHOLD_FOR.vederlag}`,
    ]);
  });

  it('kontrollsak: med forholdet godkjent i et tidligere brev har svaret ikke forbeholdet', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, 'godkjent')] });
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)).toEqual([INNLEDNING_VEDERLAG, ...punktene(1), '2. Forbehold']);
  });

  it('forløpet i #1239: svaret på vederlaget mens en ny påberopelsesversjon venter, har forbeholdet og ikke avslaget på den forrige', () => {
    const s = sakMedKrav();
    // Brev 5: forholdet avslått og vederlaget delvis godkjent.
    s.send('BH', { type: 'brev', svar: [forhold(s, 'avslaatt'), vederlag(s)] });
    s.send('TE', PAABEROPELSE); // Brev 6: forholdet i versjon 2.
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
    expect(s.u().spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 er ikke besvart').toBeNull();
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)).toEqual([
      innledning('brev K201-KOE-017-06 av 7. oktober 2026'),
      ...punktene(1),
      `2. Forbehold\n\n${forbeholdet('brev K201-KOE-017-05 av 6. oktober 2026')}`,
    ]);
  });

  it('etter et frafall er forholdet avklart mens en ny versjon venter, og svaret har ikke forbeholdet (GR-U23)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [forhold(s, 'paalegg_frafalt')] });
    s.send('TE', PAABEROPELSE);
    const u = s.u();
    expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 er ikke besvart').toBeNull();
    expect(u.frafalt, 'forutsetning: grunnlaget er avklart ved frafallet (GR-U23)').toBe(true);
    const rad = s.send('BH', { type: 'brev', svar: [vederlag(s)] });
    expect(laast(rad)).toEqual([INNLEDNING_VEDERLAG, ...punktene(1), '2. Forbehold']);
  });

  it('en full godkjenning under forbeholdet gir enighet om beløpet, betinget av forholdet (GR-U26, HF-U7, GR-U7)', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            ...P1({ vurdering: 'godkjent', godkjent_beloep: 125000, aksepterer: true }),
          },
          { resultat: 'godkjent', godkjent_beloep: 125000 }
        ),
      ],
    });
    expect(laast(rad).at(-1)).toBe(
      `2. Forbehold\n\n${forbeholdet('brev K201-KOE-017-01 av 2. oktober 2026')}`
    );
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.sammenfall, 'forbeholdet er ikke et vilkår etter HF-U7').toBe(true);
    expect(enighetensVirkning(s.u(), 'vederlag'), 'grunnlaget er ikke avklart (GR-U7)').toBe(
      'betinget'
    );
  });
});

/**
 * LV-U31 og LV-U32: godkjenner byggherren oppgjør som fast sum, betegner brevet ikke tilbudet
 * som akseptert, heller ikke når hele beløpet er godkjent. Etiketten for laget står i testene
 * av § 34.1.2 over (OV-U33).
 */
describe('oppgjør som fast sum (LV-U31, LV-U32)', () => {
  const godkjentFor = (beloep: number) => {
    const s = sakMedKrav();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          {
            ...P1({
              vurdering: beloep === 125000 ? 'godkjent' : 'delvis',
              godkjent_beloep: beloep,
              aksepterer: true,
            }),
          },
          { resultat: beloep === 125000 ? 'godkjent' : 'delvis_godkjent', godkjent_beloep: beloep }
        ),
      ],
    });
    return {
      tekst: laast(rad).slice(3, 6),
      b: (rad.data.svar as Data[])[1].beslutningsgrunnlag as Data,
    };
  };

  it('LV-U31 med lavere beløp: brevet sier at byggherren godkjenner oppgjør som fast sum, og beløpet', () => {
    const { tekst, b } = godkjentFor(100000);
    expect(tekst).toEqual([
      iDelen('vederlag', INNLEDNING_VEDERLAG),
      `3. Vederlagsjustering for P1 Ny fundamentering (punkt\u00a034.1.1)\n\n${METODE_JA} Byggherren godkjenner ${kr('100 000')} av de krevde ${kr('125 000')}.`,
      `4. Forbehold\n\n${FORBEHOLD_FOR.vederlag}`,
    ]);
    expect(tekst.join('\n')).not.toMatch(/akseptert|aksepterer/);
    expect(b.sammenfall).toBe(false);
  });

  it('LV-U32 med hele beløpet: samme setning, og standpunktene faller sammen (GR-U7)', () => {
    const { tekst, b } = godkjentFor(125000);
    expect(tekst).toEqual([
      iDelen('vederlag', INNLEDNING_VEDERLAG),
      `3. Vederlagsjustering for P1 Ny fundamentering (punkt\u00a034.1.1)\n\n${METODE_JA} Byggherren godkjenner ${kr('125 000')}.`,
      `4. Forbehold\n\n${FORBEHOLD_FOR.vederlag}`,
    ]);
    expect(b.sammenfall).toBe(true);
  });
});

describe('aksepten (LV-U4 punkt 6)', () => {
  it('aksepten viser til svaret og brevet det står i', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
    });
    const rad = s.send('TE', {
      type: 'aksept',
      spor: 'vederlag',
      svar: s.u().spor.vederlag.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(laast(rad)).toEqual([
      'Totalentreprenøren godtar byggherrens svar på kravet om justering av vederlaget i brev K201-KOE-017-04 av 5. oktober 2026.',
    ]);
  });

  it('aksepten av svaret på forholdet viser til påberopelsen av forholdet, ikke «grunnlaget» (LV-U41, #2029)', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    const rad = s.send('TE', {
      type: 'aksept',
      spor: 'forhold',
      svar: s.u().spor.forhold.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(laast(rad)).toEqual([
      'Totalentreprenøren godtar byggherrens svar på påberopelsen av irregulær endring i brev K201-KOE-017-04 av 5. oktober 2026.',
    ]);
  });

  it('når svaret er subsidiært fordi forholdet er avslått, sier aksepten at TE ikke er enig i det (GR-U7)', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
        svar(
          'frist',
          s.krav('frist'),
          { ...FRIST_FULLT[0], dager: 10 },
          { resultat: 'delvis_godkjent', godkjent_dager: 10 }
        ),
      ],
    });
    const rad = s.send('TE', {
      type: 'aksept',
      spor: 'frist',
      svar: s.u().spor.frist.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(laast(rad)).toEqual([
      'Totalentreprenøren godtar byggherrens svar på kravet om fristforlengelse i brev K201-KOE-017-04 av 5. oktober 2026. Totalentreprenøren er enig i antallet dager, men ikke i byggherrens standpunkt til forholdet.',
    ]);
  });
  it('godkjenner byggherren forholdet etter et subsidiært svar, leser aksepten saken når den sendes (GR-U1, arbeidsvalget om LV-U4 punkt 6)', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
        svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]),
      ],
    });
    const vederlagssvar = s.u().spor.vederlag.gjeldendeSvar!.id;
    s.send('BH', {
      type: 'revisjon',
      erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
      svar: svar('forhold', s.krav('forhold'), {
        resultat: 'godkjent',
        grunnlag_varslet_i_tide: true,
      }),
    });
    const rad = s.send('TE', {
      type: 'aksept',
      spor: 'vederlag',
      svar: vederlagssvar,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(laast(rad)).toEqual([
      'Totalentreprenøren godtar byggherrens svar på kravet om justering av vederlaget i brev K201-KOE-017-04 av 5. oktober 2026.',
    ]);
  });
});

describe('innsigelse, protest og passivitet (LV-U4 punkt 7–9, VS-U9, VS-U11)', () => {
  const medInnsigelse = () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('forhold') });
    return s;
  };

  it('innsigelsen står i brevet med det den gjelder', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'innsigelse', gjelder: s.krav('vederlag') });
    expect(laast(rad)).toEqual([
      'Byggherren gjør gjeldende at totalentreprenørens krav om justering av vederlaget i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent (NS 8407 punkt\u00a05 tredje ledd).',
    ]);
  });

  it('svaret gjentar innsigelsen og viser til den', () => {
    const s = medInnsigelse();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    expect(laast(rad)[1]).toBe(
      '1. Varselet etter punkt\u00a032.2\n\nPrinsipalt\n\nByggherren gjør gjeldende at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent, jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026.'
    );
  });

  // Arbeidsvalg 1 i #770 (#536): en påberopelse i et registrert brev er dokumentasjon
  // (OV-U4), og en innsigelse mot det er ingen påberopelse etter § 32.2. Kommandoene og
  // brevteksten leser det likt.
  describe('innsigelse mot et registrert påberopelse (#536)', () => {
    const medRegistrertKrav = () => {
      const s = sakMedKrav();
      const registrert = randomUUID();
      s.rad('TE', {
        krav: [
          {
            id: registrert,
            spor: 'forhold',
            hovedkategori: 'endring',
            underkategori: 'irregulaer_endring',
          },
        ],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
        ...SOM_BREV,
      });
      expect(s.u().forstaatt).toBe(true);
      return { s, registrert };
    };
    const avslag = (s: ReturnType<typeof sak>) => ({
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    // Avslått, så svaret ikke gir registrert enighet (GR-U7) og testen bare gjelder «i tide».
    const iTide = (s: ReturnType<typeof sak>) => ({
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });

    it('brevteksten gjentar den i svaret, som innsigelsen mot kravet fra løsningen (OV-U80)', () => {
      const { s, registrert } = medRegistrertKrav();
      s.send('BH', { type: 'innsigelse', gjelder: registrert });
      expect(laast(s.send('BH', avslag(s)))[1]).toContain('jf. innsigelsen');
      // Kontrollsak: samme forløp med innsigelsen mot påberopelsen fra appen.
      const k = medRegistrertKrav().s;
      k.send('BH', { type: 'innsigelse', gjelder: k.krav('forhold') });
      expect(laast(k.send('BH', avslag(k)))[1]).toContain('jf. innsigelsen');
    });

    it('kommandoene avviser den ikke etter et «i tide», og heller ikke innsigelsen mot kravet fra appen (MM-U34 punkt 6, HF-U4)', () => {
      const { s, registrert } = medRegistrertKrav();
      s.send('BH', iTide(s));
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: registrert })).toBeNull();
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('forhold') })).toBeNull();
    });
  });

  describe('innsigelsen i et brev lagt til, og et svar lagt til samme dag (#2037, OV-U98, OV-U104)', () => {
    const avslaget = (s: ReturnType<typeof sak>) => ({
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    const lagtTil = (dato: string) => ({
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato }],
      ...SOM_BREV,
    });

    it('en innsigelse i et brev lagt til er dokumentasjon og gjentas ikke i svaret fra løsningen', () => {
      const s = sakMedKrav();
      s.rad('BH', {
        utsagn: [{ id: randomUUID(), art: 'innsigelse', gjelder: s.krav('forhold') }],
        ...lagtTil('2026-09-30'),
      });
      expect(s.u().forstaatt).toBe(true);
      expect(laast(s.send('BH', avslaget(s)))[1]).not.toContain('jf. innsigelsen');
      // Kontrollsak: innsigelsen fra løsningen gjentas.
      const k = sakMedKrav();
      k.send('BH', { type: 'innsigelse', gjelder: k.krav('forhold') });
      expect(laast(k.send('BH', avslaget(k)))[1]).toContain('jf. innsigelsen');
    });

    it('et svar lagt til, sendt samme dag som byggherrens innsigelse i sporet, står i sendtSammeDag med den', () => {
      const merket = (dag: (innsigelsen: string) => string) => {
        const s = sakMedKrav();
        const rad = s.send('BH', { type: 'innsigelse', gjelder: s.krav('forhold') });
        const innsigelse = (rad.data.utsagn as Data[])[0].id;
        const svaret = avslaget(s).svar[0] as Data;
        delete svaret.utdypning;
        delete svaret.utdypninger;
        const lagt = s.send('BH', {
          type: 'brev',
          svar: [svaret],
          sendt: dag(rad.tidsstempel.slice(0, 10)),
          ...SOM_BREV,
          dokumentasjon: [randomUUID()],
        });
        return { u: s.u(), svar: (lagt.data.svar as Data[])[0].id, innsigelse };
      };
      const samme = merket((dag) => dag);
      expect(samme.u.sendtSammeDag).toContainEqual({ element: samme.svar, med: samme.innsigelse });
      const foer = merket(() => '2026-10-03');
      expect(
        foer.u.sendtSammeDag.filter((x) => x.med === foer.innsigelse),
        'kontrollsak: sendt dagen før'
      ).toEqual([]);
    });

    it('et svar lagt til sammenliknes ikke med en innsigelse et senere svar alt har gitt opp, som brevteksten heller ikke gjentar (OV-U104, OV-U105, VS-U9, #2090)', () => {
      const merket = (iTide: boolean) => {
        const s = sakMedKrav();
        const rad = s.send('BH', { type: 'innsigelse', gjelder: s.krav('forhold') });
        const innsigelse = (rad.data.utsagn as Data[])[0].id;
        s.send('BH', {
          type: 'brev',
          svar: [
            svar('forhold', s.krav('forhold'), {
              resultat: 'avslaatt',
              grunnlag_varslet_i_tide: iTide,
            }),
          ],
        });
        const godkjenning = svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }) as Data;
        delete godkjenning.utdypning;
        delete godkjenning.utdypninger;
        s.send('BH', {
          type: 'brev',
          svar: [godkjenning],
          sendt: rad.tidsstempel.slice(0, 10),
          ...SOM_BREV,
          dokumentasjon: [randomUUID()],
        });
        expect(s.u().forstaatt, 'forutsetning: saken er forstått').toBe(true);
        return s.u().sendtSammeDag.filter((x) => x.med === innsigelse);
      };
      expect(merket(true), '«i tide» i svaret fra løsningen ga opp innsigelsen').toEqual([]);
      expect(merket(false), 'kontrollsak: svaret fra løsningen gjentok den').toHaveLength(1);
    });

    it('i et forhold der § 32.2 ikke gjelder, sammenliknes svaret ikke med innsigelsen mot påberopelsen, som brevteksten heller ikke gjentar (VS-U24, MM-U43 punkt 8, #2050)', () => {
      const merket = (innhold: Data, vurderinger: Data) => {
        const s = sak();
        s.send('TE', { ...PAABEROPELSE, innhold });
        const rad = s.send('BH', { type: 'innsigelse', gjelder: s.krav('forhold') });
        const innsigelse = (rad.data.utsagn as Data[])[0].id;
        const svaret = svar('forhold', s.krav('forhold'), vurderinger) as Data;
        delete svaret.utdypning;
        delete svaret.utdypninger;
        s.send('BH', {
          type: 'brev',
          svar: [svaret],
          sendt: rad.tidsstempel.slice(0, 10),
          korrespondansetype: 'brev',
          sendemaate: 'post',
          beskrivelse: 'Svaret sendt per post.',
          dokumentasjon: [randomUUID()],
        });
        return s.u().sendtSammeDag.filter((x) => x.med === innsigelse);
      };
      const svikt = { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER };
      expect(merket(svikt, { resultat: 'avslaatt' })).toEqual([]);
      expect(
        merket(PAABEROPELSE.innhold, { resultat: 'avslaatt', grunnlag_varslet_i_tide: false }),
        'kontrollsak: § 32.2 gjelder'
      ).toHaveLength(1);
    });
  });

  /** Svarene som et brev lagt til, sendt `sendt`, uten tekst fra løsningen (OV-U80). */
  const lagtTilSomBrev = (svarene: Data[], sendt: string) => ({
    type: 'brev',
    svar: svarene.map((x) => utenFelt(utenFelt(x, 'utdypning'), 'utdypninger')),
    sendt,
    ...SOM_BREV,
    dokumentasjon: [randomUUID()],
  });

  it('OV-U32, OV-U103: et vederlagssvar lagt til leser svaret på forholdet i samme brev, også når det står utenfor rekken', () => {
    const lest = (senere: boolean) => {
      const s = sakMedKrav();
      if (senere)
        s.send('BH', {
          type: 'brev',
          svar: [
            svar('forhold', s.krav('forhold'), {
              resultat: 'avslaatt',
              grunnlag_varslet_i_tide: true,
            }),
          ],
        });
      const rad = s.send('BH', lagTilSomBrev(s, '2026-10-04'));
      const [forhold, vederlag] = (rad.data.svar as Data[]).map((x) => x.id as string);
      const u = s.u();
      return { u, forhold, vederlag };
    };
    const lagTilSomBrev = (s: ReturnType<typeof sak>, sendt: string) =>
      lagtTilSomBrev(
        [
          svar('forhold', s.krav('forhold'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: true,
          }),
          svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]),
        ],
        sendt
      );
    const utenfor = lest(true);
    expect(utenfor.u.spor.forhold.svarUtenforRekken.map((x) => x.id)).toEqual([utenfor.forhold]);
    expect(utenfor.u.svar[utenfor.vederlag].forholdssvaret).toBe(utenfor.forhold);
    const kontroll = lest(false);
    expect(
      kontroll.u.svar[kontroll.vederlag].forholdssvaret,
      'kontrollsak: uten det senere svaret'
    ).toBe(kontroll.forhold);
  });

  it('OV-U104: et vederlagssvar lagt til samme dag som en innsigelse mot vederlagskravet merkes ikke, fordi brevteksten ikke sammenlikner dem', () => {
    const s = sakMedKrav();
    const rad = s.send('BH', { type: 'innsigelse', gjelder: s.krav('vederlag') });
    s.send(
      'BH',
      lagtTilSomBrev(
        [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
        rad.tidsstempel.slice(0, 10)
      )
    );
    expect(s.u().sendtSammeDag).toEqual([]);
  });

  it('OV-U104, OV-U102: et krav utenfor rekken sendt samme dag som det egne varselet etter § 33.4, står i sendtSammeDag med det', () => {
    const merket = (kravet: string) => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      const varsel = randomUUID();
      s.rad('TE', {
        utsagn: [{ id: varsel, art: 'varsel', hjemmel: '33.4' }],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-20' }],
        ...SOM_BREV,
      });
      // Samme frist som i kravet fra løsningen (KA-U79), så bare datoen skiller dem.
      const { frister } = (s.send('TE', utenFelt(FRISTKRAV, 'varsel')).data.krav as Data[])[0];
      const krav = randomUUID();
      s.rad('TE', {
        krav: [{ id: krav, spor: 'frist', frister }],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: kravet }],
        ...SOM_BREV,
      });
      const u = s.u();
      expect(u.forstaatt).toBe(true);
      expect(u.spor.frist.kravUtenforRekken.map((k) => k.id)).toEqual([krav]);
      return { u, krav, varsel };
    };
    const samme = merket('2026-09-20');
    expect(samme.u.sendtSammeDag).toContainEqual({ element: samme.krav, med: samme.varsel });
    const foer = merket('2026-09-19');
    expect(foer.u.sendtSammeDag, 'kontrollsak: sendt dagen før varselet').toEqual([]);
  });

  it('gir byggherren innsigelsen opp, sier brevet det uttrykkelig (VS-U11)', () => {
    const s = medInnsigelse();
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(laast(rad)[1]).toBe(
      '1. Varselet etter punkt\u00a032.2\n\nByggherren gir opp innsigelsen etter NS 8407 punkt\u00a05 i brev K201-KOE-017-04 av 5. oktober 2026 og gjør ikke gjeldende at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent.'
    );
  });

  it('gir byggherren opp innsigelsen mot fristvarselet, nevner brevet varselet etter § 33.4 (LV-U5)', () => {
    const s = sakMedKrav();
    const varselet = varseletIFristkravet(s);
    s.send('BH', { type: 'innsigelse', gjelder: varselet.id });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    expect(laast(rad).join('\n\n')).toContain(
      'Byggherren gir opp innsigelsen etter NS 8407 punkt\u00a05 i brev K201-KOE-017-04 av 5. oktober 2026 og gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i totalentreprenørens brev av 28. september 2026 kom for sent.'
    );
  });

  const girOpp = 'gir opp innsigelsen';

  it('uten eget varsel er en innsigelse mot det første fristkravet ingen påberopelse etter § 33.4, og et «i tide» gir den ikke opp (VS-U24)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'krav',
      spor: 'frist',
      innhold: { frister: [{ navn: 'Sluttfristen', dager: 20 }] },
      utdypning: FRISTKRAV.utdypning,
    });
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('frist') });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    expect(laast(rad).join('\n\n')).toContain(
      'Byggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
    );
    expect(laast(rad).join('\n\n')).not.toContain(girOpp);
  });

  it('et «i tide» om varselet gir ikke opp en innsigelse mot fristkravet (VS-U24)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('frist') });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    expect(laast(rad).join('\n\n')).toContain(
      'Byggherren gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i totalentreprenørens brev av 28. september 2026 kom for sent.'
    );
    expect(laast(rad).join('\n\n')).not.toContain(girOpp);
  });

  it('et «i tide» om varselet nevner ikke en innsigelse mot en tidligere kravversjon (VS-U24)', () => {
    const s = sakMedKrav();
    const nyttKrav = (dager: number) => ({
      type: 'krav',
      spor: 'frist',
      innhold: { frister: [{ navn: 'Sluttfristen', dager }] },
      utdypning: FRISTKRAV.utdypning,
    });
    s.send('TE', nyttKrav(25));
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('frist') });
    s.send('TE', nyttKrav(30));
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('frist', s.krav('frist'), FRIST_FULLT[0], {
          resultat: 'delvis_godkjent',
          godkjent_dager: 20,
        }),
      ],
    });
    expect(laast(rad).join('\n\n')).not.toContain(girOpp);
  });

  it('et «nei» om varselet viser ikke til en innsigelse mot fristkravet (VS-U24, del 2 av #407)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('frist') });
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
    expect(laast(rad).join('\n\n')).toContain(
      'Byggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i totalentreprenørens brev av 28. september 2026 kom for sent.'
    );
    expect(laast(rad).join('\n\n')).not.toContain('jf. innsigelsen');
  });

  it('med innsigelser mot både fristkravet og varselet gir et «i tide» opp bare den mot varselet (VS-U11, VS-U24)', () => {
    const s = sakMedKrav();
    const varselet = varseletIFristkravet(s);
    s.send('BH', { type: 'innsigelse', gjelder: s.krav('frist') });
    s.send('BH', { type: 'innsigelse', gjelder: varselet.id });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    expect(laast(rad).join('\n\n')).toContain(
      'Byggherren gir opp innsigelsen etter NS 8407 punkt\u00a05 i brev K201-KOE-017-05 av 6. oktober 2026 og gjør ikke gjeldende at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i totalentreprenørens brev av 28. september 2026 kom for sent.'
    );
  });

  it('et «i tide» i forholdet gir ikke opp innsigelsen mot fristvarselet (VS-U9, VS-U11)', () => {
    const s = sakMedKrav();
    const varselet = varseletIFristkravet(s);
    s.send('BH', { type: 'innsigelse', gjelder: varselet.id });
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
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
    expect(laast(rad).join('\n\n')).toContain(
      'kom for sent, jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026.'
    );
  });

  it('VS-U20: i fristen gir et tidligere «i tide» etter § 33.4 opp innsigelsen, også når det siste svaret sier «for sent» (arbeidsvalget 15.10 i #309)', () => {
    const rettidighet = (
      spor: 'frist' | 'vederlag',
      hjemmel: '33.4' | '34.1.2',
      iTide: boolean
    ) => ({
      spor,
      standpunkter: [
        { id: randomUUID(), art: 'rettidighet' as const, gjelder: 'k', hjemmel, iTide },
      ],
    });
    expect(
      innsigelsenErOppgitt('frist', [rettidighet('frist', '33.4', false)]),
      'kontrollsak: bare «for sent» gir den ikke opp'
    ).toBe(false);
    expect(
      innsigelsenErOppgitt('vederlag', [
        rettidighet('vederlag', '34.1.2', true),
        rettidighet('vederlag', '34.1.2', false),
      ]),
      'kontrollsak: i vederlaget teller det siste standpunktet'
    ).toBe(false);
    expect(
      innsigelsenErOppgitt('frist', [
        rettidighet('frist', '33.4', true),
        rettidighet('frist', '33.4', false),
      ])
    ).toBe(true);
  });

  describe('varselet etter § 32.2 er det samme i hver påberopelsesversjon (VS-U24, arbeidsvalget 15.10 i #500)', () => {
    const medNyVersjon = () => {
      const s = medInnsigelse();
      s.send('TE', PAABEROPELSE);
      return s;
    };

    it('et «i tide» på den nye versjonen gir opp innsigelsen mot den første', () => {
      const s = medNyVersjon();
      const rad = s.send('BH', {
        type: 'brev',
        svar: [
          svar('forhold', s.krav('forhold'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: true,
          }),
        ],
      });
      expect(laast(rad)[1]).toContain(
        'Byggherren gir opp innsigelsen etter NS 8407 punkt\u00a05 i brev K201-KOE-017-04 av 5. oktober 2026'
      );
    });

    it('et «for sent» på den nye versjonen gjentar innsigelsen mot den første', () => {
      const s = medNyVersjon();
      const rad = s.send('BH', {
        type: 'brev',
        svar: [
          svar('forhold', s.krav('forhold'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: false,
          }),
        ],
      });
      expect(laast(rad)[1]).toContain('jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026');
    });

    it('et «i tide» i et svar lagt til gir opp innsigelsen fra dagen det ble sendt, men ikke et sendt før den (OV-U105, OV-U104)', () => {
      const forSent = (s: ReturnType<typeof sak>) => ({
        type: 'brev',
        svar: [
          svar('forhold', s.krav('forhold'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: false,
          }),
        ],
      });
      /** `utenVirkning`: svaret gjelder kravversjonen den nye påberopelsen har erstattet (OV-U98). */
      const etterITide = (sendt: string, utenVirkning = false) => {
        const s = medInnsigelse();
        const gjelder = s.krav('forhold');
        if (utenVirkning) s.send('TE', PAABEROPELSE);
        s.rad('BH', {
          svar: [
            {
              id: randomUUID(),
              spor: 'forhold',
              gjelder,
              standpunkter: [
                {
                  id: randomUUID(),
                  art: 'rettidighet',
                  gjelder,
                  hjemmel: '32.2',
                  i_tide: true,
                },
                { id: randomUUID(), art: 'forhold', resultat: 'avslaatt' },
              ],
            },
          ],
          opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: sendt }],
          ...SOM_BREV,
        });
        if (utenVirkning) expect(s.u().utenVirkning, 'forutsetning').toHaveLength(1);
        else s.send('TE', PAABEROPELSE);
        // Byggherren kan påberope det samme på nytt (VS-U77 punkt 13).
        expect(s.avvist('BH', forSent(s))).toBeNull();
        return laast(s.send('BH', forSent(s)))[1];
      };
      const innsigelsen = 'jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026';
      expect(etterITide('2026-10-06')).not.toContain(innsigelsen);
      expect(etterITide('2026-10-04'), 'kontrollsak: svaret er sendt før innsigelsen').toContain(
        innsigelsen
      );
      expect(
        etterITide('2026-12-01', true),
        'et svar uten virkning gir den ikke opp (MM-U43 punkt\u00a09)'
      ).toContain(innsigelsen);
    });

    /** GR-U11: § 32.2 gjelder ikke kategorien. */
    const svikt = {
      type: 'krav',
      spor: 'forhold',
      innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
    };

    /**
     * Skiftet mellom svikt og endring kan ikke sendes fra appen (GR-U22), så det står
     * som en kravversjon fra en annen skriver, og lesingen av den prøves (MM-U43 punkt 6). Et
     * registrert krav ville vært dokumentasjon uten virkning (OV-U4).
     */
    const skifte = (s: ReturnType<typeof sak>, kommando: { innhold: Data }) => {
      expect(s.avvist('TE', kommando)).toBe('ANNEN_HJEMMEL');
      s.rad('TE', {
        krav: [
          {
            id: randomUUID(),
            spor: 'forhold',
            erstatter: s.krav('forhold'),
            hovedkategori: kommando.innhold.hovedkategori,
            underkategori: kommando.innhold.underkategori,
          },
        ],
      });
    };

    it('en innsigelse mot en versjon der § 32.2 ikke gjelder, gjentas ikke og gis ikke opp i svaret på en senere versjon (VS-U24, GR-U11, MM-U43 punkt 8)', () => {
      const tekstMed = (iTide: boolean) => {
        const s = sak();
        s.send('TE', svikt);
        s.send('BH', { type: 'innsigelse', gjelder: s.krav('forhold') });
        skifte(s, PAABEROPELSE);
        return laast(
          s.send('BH', {
            type: 'brev',
            svar: [
              svar('forhold', s.krav('forhold'), {
                resultat: 'avslaatt',
                grunnlag_varslet_i_tide: iTide,
              }),
            ],
          })
        ).join('\n\n');
      };
      expect(tekstMed(true)).not.toContain(girOpp);
      const forSent = tekstMed(false);
      expect(forSent).toContain(
        'totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent'
      );
      expect(forSent).not.toContain('jf. innsigelsen');
    });

    it('etter et «i tide» etter § 32.2 godtas en innsigelse mot en versjon der § 32.2 ikke gjelder, og mot versjonen som fikk «i tide» (MM-U34 punkt 6, VS-U24, GR-U11, MM-U43 punkt 8)', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      const foerste = s.krav('forhold');
      s.send('BH', {
        type: 'brev',
        svar: [svar('forhold', foerste, { resultat: 'avslaatt', grunnlag_varslet_i_tide: true })],
      });
      skifte(s, svikt);
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('forhold') })).toBeNull();
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: foerste })).toBeNull();
    });

    /** Underkategorien skifter innenfor endring, og § 32.2 gjelder begge (GR-U11). */
    const samordning = {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold, underkategori: 'samordning' },
    };
    /** Svaret fra appen på den første versjonen, så skiftet til en ny underkategori. */
    const skifteEtter = (iTide: boolean) => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('BH', {
        type: 'brev',
        svar: [
          svar('forhold', s.krav('forhold'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: iTide,
          }),
        ],
      });
      skifte(s, samordning);
      return s;
    };
    /** Et svar på den nye versjonen utenfor kommandoene, uten et standpunkt om rettidigheten. */
    const besvar = (s: ReturnType<typeof sak>, registrert: boolean) =>
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'forhold',
            gjelder: s.krav('forhold'),
            standpunkter: [{ id: randomUUID(), art: 'forhold', resultat: 'avslaatt' }],
          },
        ],
        ...(registrert
          ? {
              opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-06' }],
              ...SOM_BREV,
            }
          : {}),
      });

    it.each([
      ['utenfor kommandoene', false],
      ['i et registrert brev (OV-U80, OV-U98)', true],
    ])(
      'etter et «i tide» på en tidligere versjon godtas en innsigelse mot en versjon i en annen underkategori der § 32.2 gjelder, når et svar %s har besvart den (MM-U34 punkt\u00a06, HF-U8)',
      (_, registrert) => {
        const s = skifteEtter(true);
        besvar(s, registrert);
        const u = s.u();
        expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
        const nytt = u.spor.forhold.svar.find((x) => x.gjelder === s.krav('forhold'));
        expect(
          nytt?.beslutningsgrunnlag.varslingsplikt,
          'forutsetning: svaret på den nye versjonen frøs at § 32.2 gjelder (GR-U12)'
        ).toBe(true);
        expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('forhold') })).toBeNull();
      }
    );

    it('etter et «i tide» på en tidligere versjon godtas en innsigelse mot en ubesvart versjon i en annen underkategori (restavviket i #798)', () => {
      // Karakteriserer dagens atferd, ikke en vedtatt forventning: ingen svar med virkning
      // har frosset varslingsplikten i den nye underkategorien, så innsigelsen leses ikke
      // som en påberopelse etter § 32.2. Avviket gjelder bare et kategoriskifte fra før GR-U22.
      const s = skifteEtter(true);
      expect(
        s.u().spor.forhold.svar.some((x) => x.gjelder === s.krav('forhold')),
        'forutsetning: ingen svar med virkning på den nye versjonen'
      ).toBe(false);
      expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('forhold') })).toBeNull();
    });

    it('hjemmelen for innsigelsen leses av svaret som sa «i tide», ikke av et nyere regelsett (MM-U43 punkt 8, GR-U12, #776)', () => {
      const s = sak();
      s.send('TE', {
        ...PAABEROPELSE,
        innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
      });
      const krav = s.krav('forhold');
      // Et svar utenfor kommandoene med «i tide» etter § 32.2, der § 32.2 ikke gjelder kategorien.
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'forhold',
            gjelder: krav,
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: krav,
                hjemmel: '32.2',
                i_tide: true,
              },
              { id: randomUUID(), art: 'forhold', resultat: 'avslaatt' },
            ],
          },
        ],
      });
      expect(
        s.u().spor.forhold.svar[0].beslutningsgrunnlag.varslingsplikt,
        'forutsetning: § 32.2 gjaldt ikke kategorien da svaret ble sendt (GR-U11)'
      ).toBe(false);
      const innsigelse = { type: 'innsigelse', gjelder: krav };
      expect(s.avvist('BH', innsigelse), 'innsigelsen er ingen påberopelse (VS-U24)').toBeNull();
      s.send('BH', innsigelse);
      const nyere = {
        ...KJERNE,
        regler: { ...KJERNE.regler, gjelderVarslingsplikten: () => true },
      };
      const u = utledJournal(s.journal, nyere);
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      expect(
        s.avvist('BH', innsigelse, nyere),
        'en ny innsigelse er heller ingen påberopelse under det nyere regelsettet (MM-U43 punkt\u00a08, #776)'
      ).toBeNull();
      const revisjon = {
        type: 'revisjon',
        erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
        svar: svar('forhold', krav, { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      };
      // Karakteriserer dagens atferd: brevteksten spør regelsettet når brevet skrives
      // (`innsigelsenPaaberoper`, #776). Revisjonen fryser at § 32.2 gjelder, så svaret og
      // teksten sier det samme (#798).
      expect(s.vis('BH', revisjon, nyere)?.[1]).toContain(
        `${girOpp} etter NS 8407 punkt\u00a05 i brev K201-KOE-017-03 av 4. oktober 2026`
      );
    });
  });

  /**
   * BHs innsigelse mot påberopelsen (brev 5) og svaret på forholdet med
   * påberopelsen av for sen varsling (brev 6): alt en protest, påberopt passivitet og
   * en senere begrunnelse kunne gjelde før OV-U7.
   */
  const medSvarPaaInnsigelsen = () => {
    const s = medInnsigelse();
    const innsigelse = s.journal.at(-1)!;
    const svaret = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: false,
        }),
      ],
    });
    const svarId = (svaret.data.svar as Data[])[0].id as string;
    return {
      s,
      innsigelse: (innsigelse.data.utsagn as Data[])[0].id as string,
      brevet: innsigelse.event_id,
      svarId,
      rettidighet: ((svaret.data.svar as Data[])[0].standpunkter as Data[])[0].id as string,
    };
  };

  it('protest, påberopt passivitet og senere begrunnelse avvises fra begge parter, med FEIL_PART for parten handlingen ikke tilhører (#997), og ingen hendelse skrives (OV-U7, arbeidsvalget 16.10 på #587)', () => {
    const { s, innsigelse, brevet, svarId, rettidighet } = medSvarPaaInnsigelsen();
    // Påberopt passivitet er TEs handling og den senere begrunnelsen byggherrens (#997).
    const kommandoer: [Data, Part | null][] = [
      [{ type: 'protest', gjelder: innsigelse }, null],
      [{ type: 'protest', gjelder: brevet }, null],
      [{ type: 'protest', gjelder: rettidighet }, null],
      [{ type: 'passivitet', gjelder: s.krav('forhold') }, 'TE'],
      [{ type: 'begrunnelse', gjelder: svarId, utdypning: BEGRUNNELSE }, 'BH'],
      [
        {
          type: 'begrunnelse',
          gjelder: svarId,
          sendt: '2026-10-07',
          ...SOM_BREV,
          dokumentasjon: [randomUUID()],
        },
        'BH',
      ],
    ];
    const foer = s.journal.length;
    for (const part of ['TE', 'BH'] as const)
      for (const [k, eier] of kommandoer)
        expect(s.avvist(part, k), `${part}: ${JSON.stringify(k)}`).toBe(
          eier === null || eier === part ? 'IKKE_I_FOERSTE_VERSJON' : 'FEIL_PART'
        );
    expect(s.journal).toHaveLength(foer);
  });

  it('«ingen krav» avvises fra totalentreprenøren med IKKE_I_FOERSTE_VERSJON og fra byggherren med FEIL_PART, tilbys ingen av partene, og ingen hendelse skrives (OV-U7, OV-U99 punkt 2)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const foer = s.journal.length;
    for (const spor of ['vederlag', 'frist'] as const) {
      expect(s.avvisning('TE', { type: 'ingen_krav', spor })).toEqual({
        regel: 'IKKE_I_FOERSTE_VERSJON',
        melding:
          '«Ingen krav» er ikke med i første versjon. Brevet kan registreres som dokumentasjon.',
      });
      expect(s.avvist('BH', { type: 'ingen_krav', spor })).toBe('FEIL_PART');
    }
    expect(s.journal).toHaveLength(foer);
    for (const part of ['TE', 'BH'] as const) {
      const tilbudt = handlinger(s.u(), part);
      expect(tilbudt, `kontrollsak: ${part} tilbys noe`).not.toEqual([]);
      expect(tilbudt.filter((h) => h.startsWith('ingen_krav:'))).toEqual([]);
    }
  });

  it('protest, påberopt passivitet og senere begrunnelse tilbys ingen av partene, også med en innsigelse, et dokument, en påberopelse og et svar (OV-U7)', () => {
    const { s, brevet, svarId } = medSvarPaaInnsigelsen();
    const u = s.u();
    expect(u.elementer[brevet]?.art, 'forutsetning: brevet med innsigelsen').toBe('dokument');
    expect(u.elementer[svarId]?.art, 'forutsetning: svaret').toBe('svar');
    for (const part of ['TE', 'BH'] as const) {
      const tilbudt = handlinger(u, part);
      expect(tilbudt, `kontrollsak: ${part} tilbys en innsigelse`).toContain(
        part === 'TE' ? `innsigelse:${svarId}` : `innsigelse:${s.krav('vederlag')}`
      );
      expect(tilbudt.filter((h) => /^(protest|passivitet|begrunne):/.test(h))).toEqual([]);
    }
  });

  it('en lest protest, påberopt passivitet og senere begrunnelse gjør saken fortsatt forstått og vises ved siden av, uten virkning på sporene (OV-U7, VS-U1, VS-U12, KA-U34 (opphevet av KA-U46))', () => {
    const { s, innsigelse, svarId } = medSvarPaaInnsigelsen();
    const foer = s.u();
    const utsagn = (art: string, gjelder: string) => ({
      utsagn: [{ id: randomUUID(), art, gjelder }],
    });
    const protest = s.rad('TE', utsagn('protest', innsigelse));
    const passivitet = s.rad('TE', utsagn('passivitet', s.krav('forhold')));
    const begrunnelse = s.rad('BH', utsagn('begrunnelse', svarId));
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.protester.map((p) => [p.part, p.gjelder, p.hendelse])).toEqual([
      ['TE', innsigelse, protest.event_id],
    ]);
    expect(u.passivitet.map((p) => [p.part, p.gjelder, p.hendelse])).toEqual([
      ['TE', s.krav('forhold'), passivitet.event_id],
    ]);
    const b = (begrunnelse.data.utsagn as Data[])[0].id as string;
    expect(u.elementer[b]).toEqual({
      hendelse: begrunnelse.event_id,
      part: 'BH',
      art: 'begrunnelse',
    });
    const v = visning(u, GJELDENDE_REGLER);
    expect(v.spor.forhold.etiketter).toContain('passivitet_paaberopt');
    expect(
      v.journal
        .filter((j) => [protest, passivitet, begrunnelse].some((r) => r.event_id === j.hendelse))
        .map((j) => j.tolket)
    ).toEqual([true, true, true]);
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor).toEqual(foer.spor);
    expect(u.svar).toEqual(foer.svar);
  });
});

describe('bestridelse (LV-U4 punkt 10–12), og merking og avklaring (KA-U45)', () => {
  /** Et registrert svar fra byggherren på forholdet, sendt 3.10 (brev 3). */
  const medRegistrertSvar = (opplysninger: Data[] = []) => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.rad('BH', {
      svar: [
        {
          id: randomUUID(),
          spor: 'forhold',
          gjelder: s.krav('forhold'),
          standpunkter: [
            {
              id: randomUUID(),
              art: 'rettidighet',
              gjelder: s.krav('forhold'),
              hjemmel: '32.2',
              i_tide: true,
            },
            { id: randomUUID(), art: 'forhold', resultat: 'godkjent' },
          ],
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-03' }, ...opplysninger],
      ...SOM_BREV,
    });
    const opplysning = (hva: string) =>
      (rad.data.opplysninger as Data[]).find((o) => o.hva === hva)!.id as string;
    return { s, rad, opplysning };
  };

  it('bestridelsen av datoen og av opplysningen om § 31.3 avvises i første versjon (OV-U7)', () => {
    const { s, opplysning } = medRegistrertSvar([
      { id: randomUUID(), hva: 'endringsordre', oppfylt: true },
    ]);
    expect(
      s.avvist('TE', { type: 'bestridelse', gjelder: opplysning('sendt'), hva: 'sendt' })
    ).toBe('IKKE_I_FOERSTE_VERSJON');
    expect(
      s.avvist('TE', {
        type: 'bestridelse',
        gjelder: opplysning('endringsordre'),
        hva: 'endringsordre',
      })
    ).toBe('IKKE_I_FOERSTE_VERSJON');
  });

  it('bestridelsen av datoen for et varsel etter § 33.4 avvises i første versjon (OV-U7)', () => {
    const s = sakMedKrav();
    const varsel = sendtForVarseletIFristkravet(s);
    expect(s.avvist('BH', { type: 'bestridelse', gjelder: varsel, hva: 'sendt' })).toBe(
      'IKKE_I_FOERSTE_VERSJON'
    );
  });

  it('merkingen av et registrert brev og avklaringen er ukjente kommandoer, og ingen hendelse skrives (KA-U45)', () => {
    const { s, rad } = medRegistrertSvar();
    const foer = s.journal.length;
    for (const k of [
      { type: 'merking', gjelder: rad.event_id, spor: ['forhold', 'frist'] },
      { type: 'avklaring', gjelder: rad.event_id },
    ])
      expect(s.avvisning('BH', k)).toEqual({
        regel: 'UGYLDIG_FORM',
        melding: `Ukjent kommando: ${k.type}`,
      });
    expect(s.journal).toHaveLength(foer);
  });
});

describe('den senere begrunnelsen (KA-U34)', () => {
  const forholdAvslaatt = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const svarId = (rad: Journalrad, i = 0) => (rad.data.svar as Data[])[i].id as string;

  /** Saken med kravene og byggherrens svar på alle tre i brev 5. */
  const medSvar = () => {
    const s = sakMedKrav();
    const brev = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), forholdAvslaatt),
        svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]),
        svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1]),
      ],
    });
    return { s, brev };
  };

  it('en begrunnelse fra TE eller av noe annet enn et svar gjør saken ikke forstått (MM-U2)', () => {
    const { s, brev } = medSvar();
    const lest = (part: Part, gjelder: string) =>
      utledJournal(
        [
          ...s.journal,
          {
            ...s.journal.at(-1)!,
            event_id: randomUUID(),
            versjon: s.journal.at(-1)!.versjon + 1,
            aktor_rolle: part,
            data: { utsagn: [{ id: randomUUID(), art: 'begrunnelse', gjelder }] },
          },
        ],
        KJERNE
      ).forstaatt;
    expect(lest('BH', svarId(brev)), 'kontrollsak').toBe(true);
    expect(lest('TE', svarId(brev))).toBe(false);
    expect(lest('BH', s.krav('forhold'))).toBe(false);
  });
});

/**
 * MM-U34 punkt 12: «kravene er avgjort» er en opplysning i visningen, og ingen regel sperrer
 * etter den. Sperren gjelder fra endringsordren er sendt (punkt 19), og saker der TE har
 * godtatt avslaget på forholdet eller trukket det, følger GR-U27.
 */
describe('når kravene er avgjort, er det en opplysning og ingen sperre (MM-U34 punkt 12, KA-U11, OV-U3)', () => {
  const godkjentForhold = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };
  const heltVederlag = [
    P1({ vurdering: 'godkjent', godkjent_beloep: 125000, aksepterer: true }),
    { resultat: 'godkjent', godkjent_beloep: 125000 },
  ] as const;

  /** Forholdet godkjent og vederlaget godkjent fullt (enighet ved sammenfall); fristen ikke sendt. */
  const utenFrist = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), godkjentForhold),
        svar('vederlag', s.krav('vederlag'), heltVederlag[0], heltVederlag[1]),
      ],
    });
    return s;
  };

  const vederlagskrav = {
    type: 'krav',
    spor: 'vederlag',
    innhold: tilbud(90000),
  };
  const revisjonAvVederlaget = (s: ReturnType<typeof sak>) => ({
    type: 'revisjon',
    erstatter: s.u().spor.vederlag.gjeldendeSvar!.id,
    svar: svar('vederlag', s.krav('vederlag'), heltVederlag[0], heltVederlag[1]),
  });
  /** Fristkravet uten varselet sendt utenfor appen, så TE kan oppgi varseldatoen senere (OV-U5). */
  const fristkravUtenVarsel = {
    type: 'krav',
    spor: 'frist',
    innhold: { frister: [{ navn: 'Sluttfristen', dager: 20 }] },
    utdypning: 'Pelingen tar fire uker lenger.',
  };
  const varseldato = () => ({
    type: 'varsel',
    ...SOM_BREV,
    spor: 'frist',
    hjemmel: '33.4',
    sendt: '2026-09-28',
    dokumentasjon: [randomUUID()],
  });

  it('et spor uten krav hindrer ikke: med ett sendt krav avgjort er kravene avgjort, og visningen sier det med OV-U10 (OV-U3)', () => {
    const u = utenFrist().u();
    expect(kraveneErAvgjort(u)).toBe(true);
    expect(visning(u, GJELDENDE_REGLER).status).toEqual({
      kode: 'alle_krav_avgjort',
      tekst: AVGJORT,
    });
    expect(
      kanInngaaIEo(u),
      'et spor TE fortsatt kan sende, hindrer ikke endringsordren (MM-U34 punkt\u00a020)'
    ).toBe(true);
  });

  it('når kravene er avgjort, godtas byggherrens innsigelse mot et varsel og mot kravet enigheten omfatter (OV-U3, MM-U34 punkt 13)', () => {
    const s = utenFrist();
    expect(kraveneErAvgjort(s.u()), 'forutsetning: kravene er avgjort').toBe(true);
    s.send('TE', { type: 'send_varsel', spor: 'frist', hjemmel: '33.4' });
    const varsel = s.u().spor.frist.varsler['33.4']!.id;
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: varsel })).toBeNull();
    expect(s.u().spor.vederlag.enighet, 'forutsetning: enighet i vederlaget').not.toBeNull();
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: s.krav('vederlag') })).toBeNull();
  });

  it('uten et sendt vederlags- eller fristkrav er kravene ikke avgjort, også når forholdet er godkjent (OV-U3)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('BH', {
      type: 'brev',
      svar: [svar('forhold', s.krav('forhold'), godkjentForhold)],
    });
    const u = s.u();
    expect(u.forholdAvklart, 'forutsetning: grunnlaget er avklart').toBe(true);
    expect(kraveneErAvgjort(u)).toBe(false);
    // MM-U22: saken har ingen samlet status før kravene er avgjort.
    expect(visning(u, GJELDENDE_REGLER).status).toBeNull();
  });

  it('når kravene er avgjort, godtas trekk av vederlagskravet, ny kravversjon, byggherrens revisjon og det særskilte varselet fra appen, og datoen for det kan registreres (MM-U34 punkt 9, 11 og 12, OV-U5, OV-U8 (opphevet av OV-U89))', () => {
    const s = utenFrist();
    expect(kraveneErAvgjort(s.u()), 'forutsetning: kravene er avgjort').toBe(true);
    expect(s.avvist('TE', { type: 'trekk', spor: 'vederlag' })).toBeNull();
    expect(s.avvist('TE', vederlagskrav)).toBeNull();
    expect(s.avvist('BH', revisjonAvVederlaget(s))).toBeNull();
    expect(s.avvist('TE', { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.3' })).toBeNull();
    // Kontrollsak: godkjenningen av forholdet er en endringsordre, så trekket av forholdet
    // avvises av sperren i KA-U13, ikke fordi kravene er avgjort (EO-U12).
    expect(s.avvist('TE', { type: 'trekk', spor: 'forhold' })).toBe('FORHOLD_ER_ENDRINGSORDRE');
    expect(
      s.avvist('TE', {
        type: 'varsel',
        ...SOM_BREV,
        spor: 'vederlag',
        hjemmel: '34.1.3',
        sendt: '2026-09-28',
        dokumentasjon: [randomUUID()],
      })
    ).toBeNull();
  });

  it('når kravene er avgjort, kan TE sende en ny kravversjon og byggherren revidere svaret, og saken er forstått (MM-U34 punkt 9, 11 og 12)', () => {
    const medKravversjon = utenFrist();
    medKravversjon.send('TE', vederlagskrav);
    const etterKrav = medKravversjon.u();
    expect(etterKrav.forstaatt, JSON.stringify(etterKrav.begrensninger)).toBe(true);
    expect(venterPaaSvar(etterKrav, 'vederlag'), 'den nye kravversjonen venter på svar').toBe(true);
    const medRevisjon = utenFrist();
    medRevisjon.send('BH', revisjonAvVederlaget(medRevisjon));
    const etterRevisjon = medRevisjon.u();
    expect(etterRevisjon.forstaatt, JSON.stringify(etterRevisjon.begrensninger)).toBe(true);
    expect(etterRevisjon.spor.vederlag.svar).toHaveLength(2);
  });

  it('i et spor uten krav godtas varselet, varseldatoen og det første kravet når kravene er avgjort (OV-U3, OV-U5)', () => {
    const s = utenFrist();
    expect(s.avvist('TE', { type: 'send_varsel', spor: 'frist', hjemmel: '33.4' })).toBeNull();
    expect(s.avvist('TE', varseldato())).toBeNull();
    expect(s.avvist('TE', FRISTKRAV)).toBeNull();
  });

  it('TEs opplysning om varseldato godtas i et spor som var avgjort (OV-U3, OV-U5)', () => {
    const s = utenFrist();
    s.send('TE', fristkravUtenVarsel);
    s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    const u = s.u();
    expect(kraveneErAvgjort(u), 'forutsetning: kravene er avgjort').toBe(true);
    expect(s.avvist('TE', varseldato())).toBeNull();
    s.send('TE', varseldato());
    const etter = s.u();
    expect(etter.spor.frist.varsler['33.4'], 'varselet har virkning (OV-U5)').toBeDefined();
    expect(etter.utenVirkning).toEqual([]);
    expect(kraveneErAvgjort(etter), 'varselet endrer ikke at kravene er avgjort').toBe(true);
  });

  it('det første kravet i sporet gjør at kravene ikke lenger er avgjort, og det som var avgjort, kan fortsatt endres (MM-U34 punkt 12, OV-U3)', () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    const u = s.u();
    expect(kraveneErAvgjort(u)).toBe(false);
    expect(visning(u, GJELDENDE_REGLER).status).toBeNull();
    expect(s.avvist('TE', { type: 'trekk', spor: 'vederlag' })).toBeNull();
    expect(s.avvist('TE', vederlagskrav)).toBeNull();
    expect(s.avvist('BH', revisjonAvVederlaget(s))).toBeNull();
    expect(s.avvist('TE', { type: 'trekk', spor: 'frist' })).toBeNull();

    s.send('BH', {
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
    });
    const etter = s.u();
    expect(kraveneErAvgjort(etter), 'det nye kravet er avgjort ved sammenfall').toBe(true);
    expect(kanInngaaIEo(etter)).toBe(true);
  });

  it('en rad som trekker et krav som var avgjort, gjør saken fortsatt forstått, og kravet er trukket (MM-U43 punkt 7, MM-U34 punkt 12)', () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    const vederlagskravId = s.krav('vederlag');
    s.rad('TE', utsagn(randomUUID(), 'trekk', vederlagskravId));
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.spor.vederlag.trukket).toBe(true);
  });

  it('en rad som trekker det nye første kravet, strider ikke (OV-U3)', () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    s.rad('TE', utsagn(randomUUID(), 'trekk', s.krav('frist')));
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.spor.frist.trukket).toBe(true);
  });

  it('med et brev lagt til som dokumentasjon sier visningen også at saken har brev sendt utenfor appen (OV-U10)', () => {
    const s = utenFrist();
    s.send('TE', {
      type: 'registrert_brev',
      sendt: '2026-09-30',
      ...SOM_BREV,
      beskrivelse: 'Referat fra byggemøte',
      dokumentasjon: [randomUUID()],
    });
    const u = s.u();
    expect(u.forstaatt, 'forutsetning: saken er forstått').toBe(true);
    expect(visning(u, GJELDENDE_REGLER).status).toEqual({
      kode: 'alle_krav_avgjort',
      tekst: `${AVGJORT}. Saken har brev sendt utenfor appen. Appen vurderer ikke innholdet.`,
    });
  });

  /** Kravene avgjort: forholdet og vederlaget godkjent, fristkravet trukket (KA-U11). */
  const avgjort = () => {
    const s = utenFrist();
    s.send('TE', FRISTKRAV);
    s.send('TE', { type: 'trekk', spor: 'frist' });
    const foer = s.u();
    expect(kraveneErAvgjort(foer), 'forutsetning: kravene er avgjort').toBe(true);
    return { s, foer };
  };
  const utsagn = (id: string, art: string, gjelder: string) => ({
    utsagn: [{ id, art, gjelder }],
  });

  it('en lest senere begrunnelse etter at kravene er avgjort, gjør saken fortsatt forstått og endrer ikke sporene (OV-U7, KA-U11, KA-U34 (opphevet av KA-U46))', () => {
    const { s, foer } = avgjort();
    const svarId = foer.spor.vederlag.gjeldendeSvar?.id;
    expect(svarId, 'forutsetning: svaret på vederlaget').toBeDefined();
    const id = randomUUID();
    s.rad('BH', utsagn(id, 'begrunnelse', svarId as string));
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.elementer[id]?.art).toBe('begrunnelse');
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor).toEqual(foer.spor);
  });

  it('en lest påberopt passivitet etter at kravene er avgjort, gjør saken fortsatt forstått og endrer ikke sporene (OV-U7, KA-U11, VS-U12)', () => {
    const { s, foer } = avgjort();
    const paaberopelse = s.krav('forhold');
    s.rad('TE', utsagn(randomUUID(), 'passivitet', paaberopelse));
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.passivitet.map((p) => [p.part, p.gjelder])).toEqual([['TE', paaberopelse]]);
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor).toEqual(foer.spor);
  });

  /** Saken lukket etter GR-U27: TE har godtatt avslaget på forholdet. */
  const lukket = () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    s.send('TE', {
      type: 'aksept',
      spor: 'forhold',
      svar: s.u().spor.forhold.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    const foer = s.u();
    expect(foer.forholdAvvist, 'forutsetning: saken er lukket etter GR-U27').toBe(true);
    return { s, foer };
  };

  it('en lest senere begrunnelse etter at saken er lukket etter GR-U27, gjør saken fortsatt forstått og endrer ikke sporene (OV-U7, KA-U11, KA-U34 (opphevet av KA-U46))', () => {
    const { s, foer } = lukket();
    const svarId = foer.spor.forhold.gjeldendeSvar!.id;
    const id = randomUUID();
    s.rad('BH', utsagn(id, 'begrunnelse', svarId));
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.elementer[id]?.art).toBe('begrunnelse');
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor).toEqual(foer.spor);
  });

  it('en lest påberopt passivitet etter at saken er lukket etter GR-U27, gjør saken fortsatt forstått og endrer ikke sporene (OV-U7, KA-U11, VS-U12)', () => {
    const { s, foer } = lukket();
    const paaberopelse = s.krav('forhold');
    s.rad('TE', utsagn(randomUUID(), 'passivitet', paaberopelse));
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.passivitet.map((p) => [p.part, p.gjelder])).toEqual([['TE', paaberopelse]]);
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor).toEqual(foer.spor);
  });
});
