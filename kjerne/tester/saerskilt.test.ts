/**
 * Det særskilte kravet etter § 34.1.3 annet ledd, på begge sider.
 * Saken i minnet er `sak()` i `brevsak.ts`.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { postlisten } from '../spor/vederlag/frysing.ts';
import { kroner } from '../frosset/tekst.ts';
import { handlinger } from '../kommandoer/handlinger.ts';
import { P1, medP1IkkeAkseptert } from './klient.ts';
import type { Avsnitt, Journalrad, Standpunkt } from '../typer.ts';
import { varseletForNyttSvar } from '../utledning/utled.ts';
import { vederlagssvaret } from '../spor/vederlag/visning.ts';
import { KJERNE } from '../versjon.ts';
import { SOM_BREV } from './brevet.ts';
import {
  type Data,
  FORBEHOLDET,
  FRISTKRAV,
  I_SAKEN,
  KLAR_OVER,
  KR,
  METODE_JA,
  PAABEROPELSE,
  kr,
  laast,
  p1I,
  sak,
  sakMedKrav,
  svar,
  tekst,
  tilbud,
  utenFelt,
} from './brevsak.ts';

describe('det særskilte kravet etter § 34.1.3 annet ledd, TEs side (OV-U22–OV-U25, #1047)', () => {
  const sendVarsel = { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.3' };
  const registrer = (hjemmel: '34.1.2' | '34.1.3') => ({
    type: 'varsel',
    ...SOM_BREV,
    spor: 'vederlag',
    hjemmel,
    sendt: '2026-09-28',
    dokumentasjon: [randomUUID()],
  });
  const vederlagskrav = (innhold: Data) => ({ type: 'krav', spor: 'vederlag', innhold });
  const post = { produktivitet: { beloep: 40000 } };
  const produktivitet =
    'økte utgifter på grunn av nedsatt produktivitet eller forstyrrelser på annet arbeid';
  // LV-U30, med partene skrevet fullt ut (LV-U35) og «punkt» (LV-U39).
  const iTillegg = `Totalentreprenøren krever i tillegg særskilt justering av vederlaget etter NS 8407 punkt\u00a034.1.3 annet ledd for ${produktivitet} med ${KR('40 000')}`;

  it('brevet er varselet etter § 34.1.3 tredje ledd for kravet etter annet ledd, uten beløp og dato (OV-U5, OV-U25, LV-U29)', () => {
    const s = sakMedKrav();
    const varsel = s.send('TE', sendVarsel);
    const id = (varsel.data.utsagn as Data[])[0].id as string;
    // Ordlyden er LV-U29.
    expect(tekst(varsel)).toEqual([
      {
        gjelder: id,
        laast: `Totalentreprenøren varsler etter NS 8407 punkt\u00a034.1.3 tredje ledd at totalentreprenøren vil kreve særskilt justering av vederlaget etter annet ledd for ${produktivitet} som følge av forholdet ${I_SAKEN}.`,
      },
    ]);
    expect(varsel.data.utsagn).toEqual([{ id, art: 'varsel', hjemmel: '34.1.3' }]);
  });

  it('det særskilte varselet kan sendes etter vederlagskravet, varselet etter § 34.1.2 ikke (OV-U8 (opphevet av OV-U89), VS-U16)', () => {
    const s = sakMedKrav();
    expect(s.avvist('TE', { ...sendVarsel, hjemmel: '34.1.2' })).toBe('VEDERLAGSKRAV_SENDT');
    expect(s.avvist('TE', sendVarsel)).toBeNull();
    expect(handlinger(s.u(), 'TE')).toEqual(
      expect.arrayContaining(['sende_varsel:34.1.3', 'varsle:34.1.3'])
    );
  });

  it('saken har ett registrert varsel per hjemmel, og det særskilte flytter ikke varselet etter § 34.1.2 (SK-12)', () => {
    const s = sakMedKrav();
    const saerskilt = s.send('TE', registrer('34.1.3'));
    expect(s.avvist('TE', sendVarsel)).toBe('VARSEL_REGISTRERT');
    expect(s.avvist('TE', registrer('34.1.3'))).toBe('VARSEL_REGISTRERT');
    expect(s.avvist('TE', registrer('34.1.2'))).toBeNull();
    const hoved = s.send('TE', registrer('34.1.2'));
    const u = s.u();
    expect(u.spor.vederlag.varsler['34.1.3']?.dokument).toBe(saerskilt.event_id);
    expect(u.spor.vederlag.varsler['34.1.2']?.dokument).toBe(hoved.event_id);
  });

  it('et registrert brev med bare det særskilte varselet er et brev appen vurderer (#1167, OV-U19)', () => {
    const s = sakMedKrav();
    s.send('TE', registrer('34.1.3'));
    expect(s.u().ikkeVurderteBrev).toEqual([]);
  });

  it('vederlagskravet kan ha bare posten, uten hovedbeløp, men ikke ingen av dem (OV-U23)', () => {
    const s = sakMedKrav();
    expect(s.avvist('TE', vederlagskrav({}))).toBe('UGYLDIG_FORM');
    expect(
      s.avvist(
        'TE',
        vederlagskrav(tilbud(undefined, { saerskilt: { produktivitet: { beloep: 0 } } }))
      )
    ).toBe('UGYLDIG_FORM');
    // Kravet har bare posten når P1 fra brev 2 er trukket (KA-U56).
    expect(s.avvist('TE', vederlagskrav(tilbud(undefined, { saerskilt: post })))).toBe(
      'KRAVPOSTENE'
    );
    const rad = s.send(
      'TE',
      vederlagskrav(tilbud(undefined, { saerskilt: post, trekker: [p1I(s)] }))
    );
    // Ordlyden er LV-U30 med LV-U35 og LV-U39, og tilbudssetningen nevner posten (OV-U115
    // punkt 3, BF-14 U-6). Punktene er prototype v4 i BF-14 (#1824); P1 er trukket.
    // Forholdet er en endring, så varselet etter § 34.1.2 nevnes ikke (VS-U3, OV-U15).
    expect(tekst(rad).map((a) => [a.punkt, a.overskrift])).toEqual([
      ['innledning', undefined],
      ['34.1.3', '1. Varselet om særskilt vederlagsjustering'],
      ['P1', '2. Vederlagsjustering'],
      ['produktivitet', '3. Særskilt vederlagsjustering'],
      ['tilbud', undefined],
    ]);
    expect(
      tekst(rad)
        .map((a) => a.laast)
        .join('\n\n')
    ).toContain(
      `3. Særskilt vederlagsjustering\n\nTotalentreprenøren krever særskilt justering av vederlaget etter NS 8407 punkt\u00a034.1.3 annet ledd for ${produktivitet} med ${KR('40 000')}\n\nKravet for den særskilte vederlagsjusteringen er et tilbud etter NS 8407 punkt\u00a034.2.1.`
    );
  });

  it('posten står etter hovedbeløpet i kravteksten, og trekket viser begge beløpene (OV-U23, KA-U22)', () => {
    const s = sakMedKrav();
    const krav = s.send('TE', vederlagskrav(tilbud(150000, { saerskilt: post })));
    const laast = tekst(krav)
      .map((a) => a.laast.replaceAll('\n\n', ' '))
      .join(' ');
    // Ordlyden er LV-U30, i punktet for posten etter punktet for kravpostene (prototype v4 i BF-14).
    expect(laast).toContain(
      `P1 Ny fundamentering. Totalentreprenøren krever ${KR('150 000')} 3. Særskilt vederlagsjustering ${iTillegg} Kravet for P1 og den særskilte vederlagsjusteringen er et tilbud etter NS 8407 punkt\u00a034.2.1.`
    );
    const trekk = s.send('TE', { type: 'trekk', spor: 'vederlag' });
    expect(tekst(trekk)[0].laast).toContain(
      `(${KR('150 000')} i P1 og ${KR('40 000')} etter NS 8407 punkt\u00a034.1.3 annet ledd)`
    );
  });

  it('uten registrert varsel er det første kjente varselet den første kravversjonen med posten (OV-U24)', () => {
    const s = sakMedKrav();
    const uten = s.krav('vederlag');
    s.send('TE', vederlagskrav(tilbud(150000, { saerskilt: post })));
    const medPost = s.krav('vederlag');
    s.send('TE', vederlagskrav(tilbud(160000, { saerskilt: post })));
    expect(medPost).not.toBe(uten);
    expect(varseletForNyttSvar(s.u(), '34.1.3')).toBe(medPost);
    // Etter § 34.1.2 er det fortsatt det første vederlagskravet (OV-U5).
    expect(varseletForNyttSvar(s.u(), '34.1.2')).toBe(uten);
    // MM-U1: det utledede varselet låses ikke; et registrert varsel går foran (OV-U24).
    const registrert = s.send('TE', registrer('34.1.3'));
    expect(varseletForNyttSvar(s.u(), '34.1.3')).toBe((registrert.data.utsagn as Data[])[0].id);
  });

  it('uten krav med posten og uten varsel finnes det ikke noe varsel etter § 34.1.3 (OV-U24)', () => {
    expect(() => varseletForNyttSvar(sakMedKrav().u(), '34.1.3')).toThrow('§ 34.1.3');
  });
});

/**
 * Byggherrens svar på det særskilte kravet etter § 34.1.3 annet ledd (#1047 B2b). Kravet i
 * brev 5 er 150 000 kr for justeringen ellers og 40 000 kr for posten. Forventningene er
 * vedtakene som står ved hvert tilfelle.
 */
describe('det særskilte kravet etter § 34.1.3 annet ledd, byggherrens side (OV-U26–OV-U33, VS-U5, #1047)', () => {
  const post = { produktivitet: { beloep: 40000 } };
  /** LV-U33/LV-U38 og LV-U35: setningen når byggherren påberoper varselet etter punkt 34.1.3. */
  const saerskiltForSent =
    'Byggherren gjør gjeldende at varselet om særskilt justering for nedsatt produktivitet eller forstyrrelser etter NS 8407 punkt\u00a034.1.3 tredje ledd i brev K201-KOE-017-04 av 5. oktober 2026 kom for sent, og at totalentreprenøren har tapt retten til å påberope seg påløpte utgifter som grunnlag for kravet.';
  /** OV-U73: tabellen i punktet «Oversikt», linje for linje. */
  const oversikt = (n: number, ...linjer: string[]) => `${n}. Oversikt\n\n${linjer.join('\n')}`;
  const forbeholdet = (n: number) => `${n}. Forbehold\n\n${FORBEHOLDET}`;
  /** Saken med vederlagskravet med posten i brev 5. `svikt` gir varslingsplikt etter § 34.1.2. */
  const sakMedPost = (innhold: Data = tilbud(150000, { saerskilt: post }), svikt = false) => {
    const s = sak();
    s.send(
      'TE',
      svikt
        ? {
            type: 'krav',
            spor: 'forhold',
            innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
          }
        : PAABEROPELSE
    );
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
    s.send('TE', FRISTKRAV);
    // Et krav uten kravposter trekker P1 fra brev 2 (KA-U56).
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: innhold.kravposter ? innhold : { ...innhold, trekker: [p1I(s)] },
    });
    return s;
  };
  /** Justeringen ellers delvis 100 000 kr, posten delvis 30 000 kr. */
  const postene = {
    ...P1({ vurdering: 'delvis', godkjent_beloep: 100000, aksepterer: true }),
    produktivitet_vurdering: 'delvis',
    produktivitet_godkjent_beloep: 30000,
  };
  const begrenset = { produktivitet_varslet_i_tide: false, produktivitet_begrenset_beloep: 10000 };
  const brevet = (s: ReturnType<typeof sak>, vurderinger: Data, resultat: Data) =>
    s.send('BH', {
      type: 'brev',
      svar: [svar('vederlag', s.krav('vederlag'), vurderinger, resultat)],
    });
  const lagret = (rad: Journalrad) => (rad.data.svar as Data[])[0];
  const virkningene = (s: ReturnType<typeof sak>) =>
    s
      .u()
      .spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.virkninger.map((v) => [v.art, v.virkning]);

  it('svaret på forholdet ved svikt i et tidligere brev står med ordene det hadde: byggherren har ikke risikoen (LV-U41, MM-U50)', () => {
    const s = sakMedPost(tilbud(150000, { saerskilt: post }), true);
    s.send('BH', {
      type: 'brev',
      svar: [svar('forhold', s.krav('forhold'), { resultat: 'avslaatt' })],
    });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...postene, hovedkrav_varslet_i_tide: true, produktivitet_varslet_i_tide: true },
          { resultat: 'delvis_godkjent', godkjent_beloep: 130000 }
        ),
      ],
    });
    expect((rad.data.brevtekst as Avsnitt[])[1].laast).toBe(
      '1. Forholdet\n\nPrinsipalt\n\nByggherren har i brev K201-KOE-017-05 av 6. oktober 2026 svart at byggherren ikke har risikoen for forholdet.'
    );
  });

  it('tabellen regner lagene i sporet: med forholdet avslått i samme brev og ett lag i vederlaget har svaret ingen tabell (OV-U73, OV-U32)', () => {
    const s = sakMedPost();
    const avslag = svar('forhold', s.krav('forhold'), {
      resultat: 'avslaatt',
      grunnlag_varslet_i_tide: true,
    });
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        avslag,
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...postene, produktivitet_varslet_i_tide: true },
          { resultat: 'delvis_godkjent', godkjent_beloep: 130000 }
        ),
      ],
    });
    expect(
      s.u().spor.vederlag.gjeldendeSvar!.utregning.godkjent_beloep,
      'kontrollsak: ett lag i utregningen'
    ).toBe(130000);
    expect((rad.data.brevtekst as Avsnitt[]).map((a) => a.punkt)).not.toContain('oversikt');
  });

  it('beløpet for hver post og beløpet etter begrensningen står på standpunktene, og utregningen har totalene og beløpet for hver post i hvert lag (OV-U26, OV-U31, KA-U57 (e))', () => {
    const s = sakMedPost();
    const rad = brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    const sv = lagret(rad);
    // KA-U57 (c) og (d): oppgjørsformen og beløpet gjelder kravposten.
    const kravpost = (s.u().spor.vederlag.gjeldendeKrav!.innhold.kravposter as Data[])[0].id;
    expect((sv.standpunkter as Data[]).map((p) => utenFelt(p, 'id'))).toEqual([
      { art: 'oppgjoersform', gjelder: kravpost, hjemmel: '34.2.2', aksepterer: true },
      { art: 'beloep', beloep: 100000, gjelder: kravpost },
      {
        art: 'rettidighet',
        gjelder: s.krav('vederlag'),
        hjemmel: '34.1.3',
        i_tide: false,
        begrenset_beloep: 10000,
      },
      { art: 'beloep', beloep: 30000, saerskilt: 'produktivitet' },
    ]);
    // VS-U5: begrensningen avviser ikke hele kravet; prinsipalt er justeringen ellers og
    // beløpet etter begrensningen, subsidiært begge postene. Arbeidsvalg 1.1 og 1.3 i
    // spørsmålsfila 09.11 for #1663: kravposten har samme beløp i begge lag.
    expect(sv.utregning).toEqual({
      resultat: 'delvis_godkjent',
      godkjent_beloep: 110000,
      subsidiaert_resultat: 'delvis_godkjent',
      subsidiaert_godkjent_beloep: 130000,
      poster: [
        {
          gjelder: kravpost,
          lag: [
            { lag: 1, beloep: 100000 },
            { lag: 2, beloep: 100000 },
          ],
        },
        {
          saerskilt: 'produktivitet',
          lag: [
            { lag: 1, beloep: 10000 },
            { lag: 2, beloep: 30000 },
          ],
        },
      ],
    });
  });

  it('bare § 34.1.3 påberopt: justeringen ellers er upåvirket, begrensningen prinsipal og posten subsidiær (OV-U28, OV-U33)', () => {
    const s = sakMedPost();
    const rad = brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    expect(virkningene(s)).toEqual([
      ['oppgjoersform', 'upaavirket'],
      ['beloep', 'upaavirket'],
      ['rettidighet', 1],
      ['beloep', 2],
    ]);
    // Ordlyden er OV-U28: hver post for seg, og etikettene følger innsigelsene.
    // LV-U34, LV-U40 og OV-U73: begrensningen står i punktet om den særskilte justeringen.
    expect(laast(rad).slice(1)).toEqual([
      `1. Varselet om særskilt vederlagsjustering (punkt\u00a034.1.3)\n\nPrinsipalt\n\n${saerskiltForSent}`,
      `2. Beregningsmetode (punkt\u00a034.2)\n\n${METODE_JA}`,
      `3. Vederlagsjustering (punkt\u00a034.1.1)\n\nByggherren godkjenner ${kr('100 000')} av de krevde ${kr('150 000')}.`,
      `4. Særskilt vederlagsjustering (punkt\u00a034.1.3 annet ledd)\n\nPrinsipalt\n\nByggherren godkjenner ${kr('10 000')} etter begrensningen i punkt\u00a01 ovenfor.\n\nSubsidiært, hvis innsigelsen i punkt\u00a01 ovenfor ikke fører frem\n\nByggherren godkjenner ${kr('30 000')} av de krevde ${kr('40 000')}.`,
      oversikt(
        5,
        'Post\tKrevd\tPrinsipalt\tSubsidiært',
        `Vederlagsjustering\t${kr('150 000')}\t${kr('100 000')}\t${kr('100 000')}`,
        `Særskilt vederlagsjustering\t${kr('40 000')}\t${kr('10 000')}\t${kr('30 000')}`,
        `Sum\t${kr('190 000')}\t${kr('110 000')}\t${kr('130 000')}`
      ),
      forbeholdet(6),
    ]);
    // Svaret 16.11 i #1997: avsnittet med tabellen har nøkkelen til posten i hver rad, i samme
    // rekkefølge, og bare det avsnittet har den.
    const avsnittene = rad.data.brevtekst as Avsnitt[];
    expect(avsnittene.filter((a) => a.poster).map((a) => [a.punkt, a.poster])).toEqual([
      ['oversikt', ['P1', 'produktivitet']],
    ]);
    // AK 4 i #1199: en upåvirket post er ingen grunn og får ingen etikett i linjen.
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(
      `Byggherrens standpunkt: godkjent med ${kroner(100000)} for justeringen ellers, prinsipalt begrenset etter punkt\u00a034.1.3 til ${kroner(10000)}, subsidiært godkjent med ${kroner(30000)} for særskilt justering (punkt\u00a034.1.3 annet ledd).`
    );
  });

  it.each([
    ['innledningen', 'innledning', 'Innledningen'],
    ['oversikten', 'oversikt', 'Oversikt'],
  ])(
    'en utdypning for %s i svaret avvises, fordi skjemaet ikke har noe felt for den (LV-U71, #2153)',
    (_n, punkt, overskrift) => {
      const s = sakMedPost();
      const svaret = (utdypninger: Record<string, string>) => ({
        type: 'brev',
        svar: [
          {
            ...svar(
              'vederlag',
              s.krav('vederlag'),
              { ...postene, ...begrenset },
              { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
            ),
            utdypninger,
          },
        ],
      });
      expect(s.avvisning('BH', svaret({ [punkt]: 'Byggherrens tekst.' }))?.melding).toBe(
        `Punktet «${overskrift}» i brevet har ingen begrunnelse.`
      );
      // Kontrollsak: punktet står i brevet, og en utdypning for kravposten står under den.
      const rad = s.send('BH', svaret({ P1: 'Byggherrens tekst.' }));
      const avsnittene = rad.data.brevtekst as Avsnitt[];
      expect(avsnittene.map((a) => a.punkt)).toContain(punkt);
      const medUtdypning = avsnittene.filter((a) => a.utdypning).map((a) => a.punkt);
      expect(medUtdypning).toContain('P1');
      expect(medUtdypning).not.toContain(punkt);
    }
  );

  it('nøkler til postene som ikke svarer til radene i tabellen, eller står i et annet avsnitt, gjør saken ikke forstått (MM-U2, svaret 16.11 i #1997)', () => {
    const s = sakMedPost();
    const rad = brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    const original = (rad.data.brevtekst as Avsnitt[]).map((a) => ({ ...a }));
    const proev = (endre: (a: Avsnitt[]) => void) => {
      rad.data.brevtekst = original.map((a) => ({ ...a }));
      endre(rad.data.brevtekst as Avsnitt[]);
      return s.u().forstaatt;
    };
    const punktet = (a: Avsnitt[], punkt: string) => a.find((x) => x.punkt === punkt)!;
    expect(
      proev(() => {}),
      'kontrollsak'
    ).toBe(true);
    expect(proev((a) => (punktet(a, 'oversikt').poster = ['P1']))).toBe(false);
    expect(proev((a) => (punktet(a, 'oversikt').poster = ['P1', 'P1']))).toBe(false);
    expect(proev((a) => delete punktet(a, 'oversikt').poster)).toBe(false);
    expect(proev((a) => (punktet(a, 'forbehold').poster = ['P1']))).toBe(false);
  });

  it('en aksept av svaret gir prinsipalt beløp etter begrensningen, ikke 0 (VS-U5, valg e)', () => {
    const s = sakMedPost();
    brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    s.send('TE', {
      type: 'aksept',
      spor: 'vederlag',
      svar: s.u().spor.vederlag.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(s.u().spor.vederlag.enighet?.grunnlag.utfall).toEqual({ beloep: 110000 });
  });

  it('en aksept av svaret med § 34.1.2 og § 34.1.3 påberopt gir 0, ikke beløpet etter begrensningen (VS-U3, OV-U27)', () => {
    const s = sakMedPost(undefined, true);
    brevet(
      s,
      { ...postene, ...begrenset, hovedkrav_varslet_i_tide: false },
      { resultat: 'avslaatt', godkjent_beloep: 0 }
    );
    s.send('TE', {
      type: 'aksept',
      spor: 'vederlag',
      svar: s.u().spor.vederlag.gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(s.u().spor.vederlag.enighet?.grunnlag.utfall).toEqual({ beloep: 0 });
  });

  // KA-U72: uten aksept av tilbudet tar svaret ikke stilling til beløpet for kravposten, så
  // tilbudet gir ikke et eget lag. Det rammer kravposten i det første laget, sammen med
  // begrensningen (arbeidsvalget 10.11 i #1760). Begrensningen rammer bare den særskilte posten
  // (arbeidsvalg 1.3 i spørsmålsfila 09.11 for #1663).
  it('tilbudet ikke akseptert og § 34.1.3 påberopt: tilbudet og begrensningen står prinsipalt og den særskilte posten subsidiært, og beløpet for kravposten står ikke (KA-U72, OV-U32, OV-U33, #1760)', () => {
    const s = sakMedPost();
    const rad = brevet(s, medP1IkkeAkseptert({ ...postene, ...begrenset }, 'regningsarbeid'), {
      resultat: 'delvis_godkjent',
      godkjent_beloep: 10000,
    });
    expect(virkningene(s)).toEqual([
      ['oppgjoersform', 1],
      ['beloep', 1],
      ['rettidighet', 1],
      ['beloep', 2],
    ]);
    // LV-U40 og OV-U32: to innsigelser i det første laget gir flertall i lagslinjen.
    expect(laast(rad).slice(1)).toEqual([
      `1. Varselet om særskilt vederlagsjustering (punkt\u00a034.1.3)\n\nPrinsipalt\n\n${saerskiltForSent}`,
      '2. Beregningsmetode (punkt\u00a034.2)\n\nPrinsipalt\n\nByggherren aksepterer ikke totalentreprenørens tilbud (punkt\u00a034.2.2 første ledd), og mener vederlaget skal justeres som regningsarbeid (punkt\u00a034.4).',
      `3. Særskilt vederlagsjustering (punkt\u00a034.1.3 annet ledd)\n\nPrinsipalt\n\nByggherren godkjenner ${kr('10 000')} etter begrensningen i punkt\u00a01 ovenfor.\n\nSubsidiært, hvis innsigelsene i punkt\u00a01 og 2 ovenfor ikke fører frem\n\nByggherren godkjenner ${kr('30 000')} av de krevde ${kr('40 000')}.`,
      forbeholdet(4),
    ]);
    expect(laast(rad).join(' ')).not.toContain('justeringen ellers');
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(
      `Byggherrens standpunkt: prinsipalt tilbudet ikke akseptert (punkt\u00a034.2.2), begrenset etter punkt\u00a034.1.3 til ${kroner(10000)}, subsidiært godkjent med ${kroner(30000)} for særskilt justering (punkt\u00a034.1.3 annet ledd).`
    );
  });

  it('et lag uten preklusjon har 0 kr, men tilbudet er ikke akseptert: en lagret rad med § 34.1.3 påberopt er ikke forstått (KA-U72, MM-U2)', () => {
    /** Saken med svaret fra appen og en revisjon som er en kopi av det, med `endre` brukt på P1. */
    const medKopi = (endre: (lag: Data[]) => void) => {
      const s = sakMedPost();
      const rad = brevet(s, medP1IkkeAkseptert({ ...postene, ...begrenset }, 'regningsarbeid'), {
        resultat: 'delvis_godkjent',
        godkjent_beloep: 10000,
      });
      const svar = structuredClone(lagret(rad));
      const lag = ((svar.utregning as Data).poster as { lag: Data[] }[])[0].lag;
      expect(lag, 'forutsetning: to lag uten preklusjon etter § 34.1.2').toEqual([
        { lag: 1 },
        { lag: 2 },
      ]);
      svar.id = randomUUID();
      svar.erstatter = lagret(rad).id;
      for (const p of svar.standpunkter as Data[]) p.id = randomUUID();
      endre(lag);
      s.rad('BH', { svar: [svar] });
      return s.u();
    };
    expect(medKopi(() => {}).forstaatt, 'kontrollsak: en uendret kopi').toBe(true);
    const u = medKopi((lag) => (lag[0].beloep = 0));
    expect(u.forstaatt).toBe(false);
    expect(u.begrensninger.map((b) => b.grunn).join(' ')).toContain(
      'har ikke 0 kr i laget for § 34.1.2'
    );
  });

  // KA-U72: tilbudet som ikke er akseptert, gir ikke et lag, så svaret har ett lag, og leseren
  // forstår brevet kjernen skriver.
  it('tilbudet ikke akseptert og posten etter § 34.1.3 annet ledd i tide: svaret har ett lag, den særskilte posten er upåvirket, og brevet leses (KA-U72, OV-U33, #1760)', () => {
    const s = sakMedPost();
    const rad = brevet(
      s,
      medP1IkkeAkseptert({ ...postene, produktivitet_varslet_i_tide: true }, 'regningsarbeid'),
      { resultat: 'delvis_godkjent', godkjent_beloep: 30000 }
    );
    // Tilbudet rammer bare P1 (arbeidsvalget 10.11 i #1760, OV-U33).
    expect(virkningene(s)).toEqual([
      ['oppgjoersform', 1],
      ['beloep', 1],
      ['rettidighet', 'uten_virkning'],
      ['beloep', 'upaavirket'],
    ]);
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(
      `Byggherrens standpunkt: tilbudet ikke akseptert (punkt\u00a034.2.2), godkjent med ${kroner(30000)} for særskilt justering (punkt\u00a034.1.3 annet ledd).`
    );
    expect(laast(rad).slice(1)).toEqual([
      '1. Varselet om særskilt vederlagsjustering (punkt\u00a034.1.3)\n\nByggherren gjør ikke gjeldende at varselet om særskilt justering for nedsatt produktivitet eller forstyrrelser etter NS 8407 punkt\u00a034.1.3 tredje ledd i brev K201-KOE-017-04 av 5. oktober 2026 kom for sent.',
      '2. Beregningsmetode (punkt\u00a034.2)\n\nByggherren aksepterer ikke totalentreprenørens tilbud (punkt\u00a034.2.2 første ledd), og mener vederlaget skal justeres som regningsarbeid (punkt\u00a034.4).',
      `3. Særskilt vederlagsjustering (punkt\u00a034.1.3 annet ledd)\n\nByggherren godkjenner ${kr('30 000')} av de krevde ${kr('40 000')}.`,
      forbeholdet(4),
    ]);
  });

  it('begge påberopt: § 34.1.2 prinsipalt, justeringen ellers og begrensningen subsidiært, posten videre subsidiært (OV-U27, OV-U28)', () => {
    const s = sakMedPost(undefined, true);
    const rad = brevet(
      s,
      { ...postene, ...begrenset, hovedkrav_varslet_i_tide: false },
      { resultat: 'avslaatt', godkjent_beloep: 0 }
    );
    // OV-U31: mellomlaget står bare i radene, ikke som total.
    const kravpost = (s.u().spor.vederlag.gjeldendeKrav!.innhold.kravposter as Data[])[0].id;
    expect(lagret(rad).utregning).toEqual({
      resultat: 'avslaatt',
      godkjent_beloep: 0,
      subsidiaert_resultat: 'delvis_godkjent',
      subsidiaert_godkjent_beloep: 130000,
      poster: [
        {
          gjelder: kravpost,
          lag: [
            { lag: 1, beloep: 0 },
            { lag: 2, beloep: 100000 },
            { lag: 3, beloep: 100000 },
          ],
        },
        {
          saerskilt: 'produktivitet',
          lag: [
            { lag: 1, beloep: 0 },
            { lag: 2, beloep: 10000 },
            { lag: 3, beloep: 30000 },
          ],
        },
      ],
    });
    expect(virkningene(s)).toEqual([
      ['rettidighet', 1],
      ['oppgjoersform', 2],
      ['beloep', 2],
      ['rettidighet', 2],
      ['beloep', 3],
    ]);
    // LV-U40, LV-U39 og OV-U73: med tabellen står ikke setningen om at ingenting er godkjent.
    const sub = 'Subsidiært, hvis innsigelsen i punkt\u00a01 ovenfor ikke fører frem';
    expect(laast(rad).slice(1)).toEqual([
      '1. Varselet om vederlagsjustering (punkt\u00a034.1.2)\n\nPrinsipalt\n\nByggherren gjør gjeldende at varselet om vederlagsjustering etter NS 8407 punkt\u00a034.1.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.',
      `2. Varselet om særskilt vederlagsjustering (punkt\u00a034.1.3)\n\n${sub}\n\nByggherren gjør gjeldende at varselet om særskilt justering for nedsatt produktivitet eller forstyrrelser etter punkt\u00a034.1.3 tredje ledd i brev K201-KOE-017-04 av 5. oktober 2026 kom for sent, og at totalentreprenøren har tapt retten til å påberope seg påløpte utgifter som grunnlag for kravet.`,
      `3. Beregningsmetode (punkt\u00a034.2)\n\n${sub}\n\n${METODE_JA}`,
      `4. Vederlagsjustering (punkt\u00a034.1.2)\n\n${sub}\n\nByggherren godkjenner ${kr('100 000')} av de krevde ${kr('150 000')}.`,
      `5. Særskilt vederlagsjustering (punkt\u00a034.1.3 annet ledd)\n\n${sub}\n\nByggherren godkjenner ${kr('10 000')} etter begrensningen i punkt\u00a02 ovenfor.\n\nVidere subsidiært, hvis heller ikke innsigelsen i punkt\u00a02 ovenfor fører frem\n\nByggherren godkjenner ${kr('30 000')} av de krevde ${kr('40 000')}.`,
      oversikt(
        6,
        'Post\tKrevd\tPrinsipalt\tSubsidiært\tVidere subsidiært',
        `Vederlagsjustering\t${kr('150 000')}\t${kr('0')}\t${kr('100 000')}\t${kr('100 000')}`,
        `Særskilt vederlagsjustering\t${kr('40 000')}\t${kr('0')}\t${kr('10 000')}\t${kr('30 000')}`,
        `Sum\t${kr('190 000')}\t${kr('0')}\t${kr('110 000')}\t${kr('130 000')}`
      ),
      `7. Forbehold\n\nByggherren har ennå ikke svart på totalentreprenørens påberopelse av uforutsette forhold ved grunnen i brev K201-KOE-017-01 av 2. oktober 2026. Standpunktene ovenfor gjelder under forutsetning av at forholdet gir grunnlag for kravet.`,
    ]);
    // OV-U32: standpunktene i samme lag står under én etikett, også i linjen.
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(
      `Byggherrens standpunkt: prinsipalt varselet etter punkt\u00a034.1.2 kom for sent, subsidiært godkjent med ${kroner(100000)} for justeringen ellers, begrenset etter punkt\u00a034.1.3 til ${kroner(10000)}, videre subsidiært godkjent med ${kroner(30000)} for særskilt justering (punkt\u00a034.1.3 annet ledd).`
    );
  });

  it('uten påberopelse har svaret ett lag, og linjen har ingen etikett for postene (OV-U33)', () => {
    const s = sakMedPost();
    brevet(
      s,
      { ...postene, produktivitet_varslet_i_tide: true },
      { resultat: 'delvis_godkjent', godkjent_beloep: 130000 }
    );
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(
      `Byggherrens standpunkt: godkjent med ${kroner(100000)} for justeringen ellers, godkjent med ${kroner(30000)} for særskilt justering (punkt\u00a034.1.3 annet ledd).`
    );
  });

  it('med avslått forhold er justeringen ellers i sporets første lag og ikke upåvirket (OV-U33)', () => {
    const s = sakMedPost();
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          grunnlag_varslet_i_tide: true,
          resultat: 'avslaatt',
        }),
        svar(
          'vederlag',
          s.krav('vederlag'),
          { ...postene, ...begrenset },
          {
            resultat: 'delvis_godkjent',
            godkjent_beloep: 110000,
          }
        ),
      ],
    });
    expect(virkningene(s)).toEqual([
      ['oppgjoersform', 1],
      ['beloep', 1],
      ['rettidighet', 1],
      ['beloep', 2],
    ]);
    // OV-U32, OV-U33: lagene flyttes ett ned, og laget med justeringen og begrensningen har én etikett.
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(
      `Byggherrens standpunkt: subsidiært godkjent med ${kroner(100000)} for justeringen ellers, begrenset etter punkt\u00a034.1.3 til ${kroner(10000)}, videre subsidiært godkjent med ${kroner(30000)} for særskilt justering (punkt\u00a034.1.3 annet ledd).`
    );
  });

  it('et krav med bare posten besvares uten justeringen ellers, og en vurdering av den avvises (OV-U23)', () => {
    const s = sakMedPost(tilbud(undefined, { saerskilt: post }));
    const uten = {
      produktivitet_vurdering: 'godkjent',
      produktivitet_varslet_i_tide: true,
    };
    // KA-U57 (d): standpunktet til oppgjørsformen gjelder en kravpost, og kravet har ingen.
    for (const kravpost of [P1({ vurdering: 'godkjent' }), P1({ aksepterer: true })])
      expect(
        s.avvist('BH', {
          type: 'brev',
          svar: [
            svar(
              'vederlag',
              s.krav('vederlag'),
              { ...uten, ...kravpost },
              {
                resultat: 'godkjent',
                godkjent_beloep: 40000,
              }
            ),
          ],
        })
      ).toBe('UGYLDIG_VURDERING');
    const rad = brevet(s, uten, { resultat: 'godkjent', godkjent_beloep: 40000 });
    expect(laast(rad)[2]).toBe(
      `2. Særskilt vederlagsjustering (punkt\u00a034.1.3 annet ledd)\n\nByggherren godkjenner ${kr('40 000')}.`
    );
  });

  it.each([
    ['beløpet etter begrensningen mangler', { produktivitet_varslet_i_tide: false }],
    [
      'beløpet etter begrensningen er høyere enn det byggherren godkjenner for posten',
      { produktivitet_varslet_i_tide: false, produktivitet_begrenset_beloep: 30001 },
    ],
    [
      'beløpet etter begrensningen står uten påberopt begrensning',
      { produktivitet_varslet_i_tide: true, produktivitet_begrenset_beloep: 10000 },
    ],
    ['rettidigheten etter § 34.1.3 mangler', {}],
  ])('%s, og svaret avvises (valg 2 og 3 i #1047)', (_, rettidighet) => {
    const s = sakMedPost();
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [
          svar(
            'vederlag',
            s.krav('vederlag'),
            { ...postene, ...rettidighet },
            {
              resultat: 'delvis_godkjent',
              godkjent_beloep: 110000,
            }
          ),
        ],
      })
    ).toBe('UGYLDIG_VURDERING');
  });

  it('en begrensning godtas uten begrunnelse, også når beløpet etter den er likt (KA-U46 punkt 1, valg d)', () => {
    const s = sakMedPost();
    const fullt = {
      ...P1({ vurdering: 'godkjent', aksepterer: true }),
      produktivitet_vurdering: 'godkjent',
      produktivitet_varslet_i_tide: false,
      produktivitet_begrenset_beloep: 40000,
    };
    const uten = svar(
      'vederlag',
      s.krav('vederlag'),
      fullt,
      { resultat: 'godkjent', godkjent_beloep: 190000 },
      null
    );
    expect(s.avvist('BH', { type: 'brev', svar: [uten] })).toBeNull();
    // Uten påberopelse og med alt godkjent trengs heller ingen begrunnelse.
    const iTide = {
      ...fullt,
      produktivitet_varslet_i_tide: true,
      produktivitet_begrenset_beloep: undefined,
    };
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [
          svar(
            'vederlag',
            s.krav('vederlag'),
            iTide,
            { resultat: 'godkjent', godkjent_beloep: 190000 },
            null
          ),
        ],
      })
    ).toBeNull();
  });

  it('en begrensning i et lag gir ikke sammenfall, også når posten er godkjent fullt etter den (HF-U7, VS-U5)', () => {
    const s = sakMedPost();
    brevet(
      s,
      {
        ...P1({ vurdering: 'godkjent', aksepterer: true }),
        produktivitet_vurdering: 'godkjent',
        produktivitet_varslet_i_tide: false,
        produktivitet_begrenset_beloep: 40000,
      },
      { resultat: 'godkjent', godkjent_beloep: 190000 }
    );
    expect(s.u().spor.vederlag.gjeldendeSvar!.beslutningsgrunnlag.sammenfall).toBe(false);
    expect(s.u().spor.vederlag.enighet).toBeNull();
  });

  it('en revisjon som senker posten eller beløpet etter begrensningen, godtas, som en som hever (MM-U34 punkt 4, HF-U5)', () => {
    const s = sakMedPost();
    brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    const revisjon = (v: Data, godkjent: number) => ({
      type: 'revisjon',
      erstatter: s.u().spor.vederlag.gjeldendeSvar!.id,
      svar: svar(
        'vederlag',
        s.krav('vederlag'),
        { ...postene, ...begrenset, ...v },
        {
          resultat: 'delvis_godkjent',
          godkjent_beloep: godkjent,
        }
      ),
    });
    // Posten senkes og justeringen heves, så totalen er den samme.
    expect(
      s.avvist(
        'BH',
        revisjon(
          {
            produktivitet_godkjent_beloep: 20000,
            ...P1({ vurdering: 'delvis', godkjent_beloep: 110000, aksepterer: true }),
          },
          120000
        )
      )
    ).toBeNull();
    expect(s.avvist('BH', revisjon({ produktivitet_begrenset_beloep: 5000 }, 105000))).toBeNull();
    expect(s.avvist('BH', revisjon({ produktivitet_begrenset_beloep: 20000 }, 120000))).toBeNull();
  });

  it('et varsel TE registrerer etter svaret, markerer standpunktet etter § 34.1.3 og sperrer ikke aksept (OV-U5, svaret 23.10)', () => {
    const s = sakMedPost();
    brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    const gjeldende = s.u().spor.vederlag.gjeldendeSvar!;
    const rettidighet = gjeldende.standpunkter.find((p) => p.art === 'rettidighet')!;
    s.send('TE', {
      type: 'varsel',
      ...SOM_BREV,
      spor: 'vederlag',
      hjemmel: '34.1.3',
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    });
    const u = s.u();
    expect(u.svar[gjeldende.id].gjaldtEtAnnetVarsel).toEqual([rettidighet.id]);
    // Svaret står med virkningen det hadde (OV-U5).
    expect(u.svar[gjeldende.id].virkninger).toEqual(gjeldende.beslutningsgrunnlag.virkninger);
    expect(
      s.avvist('TE', {
        type: 'aksept',
        spor: 'vederlag',
        svar: gjeldende.id,
        regelversjon: KJERNE.regler.versjon,
      })
    ).toBeNull();
  });

  it('svaret gjentar byggherrens egen innsigelse mot det særskilte varselet (VS-U24)', () => {
    const s = sakMedPost();
    const varsel = s.send('TE', { type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.3' });
    const innsigelse = s.send('BH', {
      type: 'innsigelse',
      gjelder: (varsel.data.utsagn as Data[])[0].id,
    });
    const rad = brevet(
      s,
      { ...postene, ...begrenset },
      { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
    );
    expect(laast(rad).join(' ')).toContain(
      `kom for sent, jf. innsigelsen i brev K201-KOE-017-${String(innsigelse.data.brevnummer).padStart(2, '0')}`
    );
  });

  describe('postlisten visningen leser (svarene i #1047 24.10, MM-U23, OV-U28)', () => {
    const svaret = (s: ReturnType<typeof sak>) => {
      const u = s.u();
      return vederlagssvaret(u, u.spor.vederlag.svar.at(-1)!);
    };
    const iTide = { ...postene, produktivitet_varslet_i_tide: true };

    it('hver post for seg med beløpet og laget brevet ga den, og begrensningen bare på posten den rammer (OV-U28, VS-U5)', () => {
      const s = sakMedPost();
      brevet(
        s,
        { ...postene, ...begrenset },
        { resultat: 'delvis_godkjent', godkjent_beloep: 110000 }
      );
      const v = svaret(s);
      // Som brevteksten over: justeringen ellers uten etikett, begrensningen prinsipalt og
      // posten subsidiært. Ingen total per lag (MM-U23).
      expect(v.poster).toEqual([
        {
          standpunkt: expect.any(String),
          gjelder: expect.any(String),
          godkjent: 100000,
          lag: null,
          etikett: null,
          begrensning: null,
        },
        {
          standpunkt: expect.any(String),
          saerskilt: 'produktivitet',
          godkjent: 30000,
          lag: 2,
          etikett: 'subsidiært',
          begrensning: {
            standpunkt: v.paaberopt[0].standpunkt,
            beloep: 10000,
            lag: 1,
            etikett: 'prinsipalt',
          },
        },
      ]);
      expect(v.paaberopt).toEqual([
        {
          standpunkt: expect.any(String),
          hjemmel: '34.1.3',
          begrenset: 10000,
          lag: 1,
          etikett: 'prinsipalt',
        },
      ]);
      expect(v).toMatchObject({
        part: 'BH',
        eldreKravversjon: false,
        vurdertVedRegistreringen: false,
      });
      // Utfallet summerer de samme postene (VS-U5): 100 000 + 10 000.
      s.send('TE', {
        type: 'aksept',
        spor: 'vederlag',
        svar: v.svar,
        regelversjon: KJERNE.regler.versjon,
      });
      expect(s.u().spor.vederlag.enighet?.grunnlag.utfall).toEqual({ beloep: 110000 });
    });

    it('en påberopelse uten virkning står som byggherrens utsagn uten lag, og gir ingen post et annet beløp (presiseringen 24.10, HF-U2)', () => {
      // Kommandoene avviser en påberopelse som ikke gjelder kravet, men et registrert svar kan
      // ha den (MM-U17, MM-U50). Postlisten leser virkningene brevet frøs.
      const standpunkter: Standpunkt[] = [
        {
          id: 'r',
          art: 'rettidighet',
          gjelder: 'k',
          hjemmel: '34.1.3',
          iTide: false,
          begrenset: 10000,
        },
        { id: 'b1', art: 'beloep', resultat: 'delvis_godkjent', godkjent: 100000 },
        {
          id: 'b2',
          art: 'beloep',
          resultat: 'delvis_godkjent',
          godkjent: 30000,
          saerskilt: 'produktivitet',
        },
      ];
      const { poster, paaberopt } = postlisten(
        { spor: 'vederlag', standpunkter, utregning: {} },
        [
          { standpunkt: 'r', art: 'rettidighet', virkning: 'uten_virkning' },
          { standpunkt: 'b1', art: 'beloep', virkning: 1 },
          { standpunkt: 'b2', art: 'beloep', virkning: 1 },
        ],
        0
      );
      expect(paaberopt).toEqual([
        { standpunkt: 'r', hjemmel: '34.1.3', begrenset: 10000, lag: null, etikett: null },
      ]);
      expect(poster.map((p) => [p.godkjent, p.lag, p.etikett, p.begrensning])).toEqual([
        [100000, 1, null, null],
        [30000, 1, null, null],
      ]);
    });

    it('lagene fra svaret på forholdet står foran postene, som i brevet (OV-U32)', () => {
      const s = sakMedPost();
      s.send('BH', {
        type: 'brev',
        svar: [
          svar('forhold', s.krav('forhold'), {
            resultat: 'avslaatt',
            grunnlag_varslet_i_tide: true,
          }),
        ],
      });
      brevet(s, iTide, { resultat: 'delvis_godkjent', godkjent_beloep: 130000 });
      expect(svaret(s).poster.map((p) => [p.lag, p.etikett])).toEqual([
        [2, 'subsidiært'],
        [2, 'subsidiært'],
      ]);
    });

    it('svaret på en eldre kravversjon skilles fra kravet som venter på svar (MM-U24, MM-U9)', () => {
      const s = sakMedPost();
      brevet(s, iTide, { resultat: 'delvis_godkjent', godkjent_beloep: 130000 });
      s.send('TE', {
        type: 'krav',
        spor: 'vederlag',
        innhold: tilbud(160000, { saerskilt: post }),
      });
      const v = svaret(s);
      expect(v.eldreKravversjon).toBe(true);
      expect(v.kravversjon).not.toBe(s.u().spor.vederlag.gjeldendeKrav!.id);
      expect(v.poster.map((p) => p.godkjent)).toEqual([100000, 30000]);
    });
  });
});
