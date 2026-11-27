/**
 * Brevteksten i kjernen (#369): teksten mottakeren leser i et brev appen sender.
 * Forventningene har kilde i vedtakene: LV-U4 (ordlyden, punkt 1–3 og 13), GR-U15 (TEs varsel etter § 32.2 beskriver pålegget), GR-U16
 * (endringsordrens dato eller nummer), KA-U31–KA-U33 og KA-U46 (begrunnelsen),
 * LV-U2 (teksten avsenderen godkjenner, er den som fryses, og et dokument gjengir
 * den tro), LV-U3 (hvert utsagn med virkning står i teksten, ikke appens vurdering),
 * KA-U22 og KA-U25 (de faste tekstene, ordrett), B-13 om begrunnelsestekst (den låste delen og utdypningen hver for
 * seg), MM-U17 (opphevet av MM-U50) (et registrert brev får ingen tekst fra appen) og HF-U1 (hvert avsnitt
 * viser til et element i brevet). Arbeidsvalgene A1–A8 står i paragrafmatrisen, og
 * testene som bare følger et arbeidsvalg, sier det. At hvert element i bevis-sakene
 * har et avsnitt, prøves i `forloep.test.ts` og mot testbasen i
 * `sprakprove/kjernelagring/lagring.test.ts`. Svaret, varslene, forespørselen, avvisningen,
 * revisjonen, det særskilte kravet, lagene i svaret, kravpostene og akseptfristen står i egne
 * filer. Saken i minnet er `sak()` i `brevsak.ts`.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { KanIkkeUttrykkes, norskDato } from '../frosset/brevdeler.ts';
import { gjengi, gjengirTro, lagBrevtekst } from '../frosset/brevtekst.ts';
import { brevmerking } from '../frosset/brevtittel.ts';
import { innholdIFristen } from '../spor/frist/format.ts';
import { kroner, medHardeMellomrom } from '../frosset/tekst.ts';
import { kalenderdag, lesJournal } from '../format/leser.ts';
import { forhaandsvis, laastTekst, vurder } from '../kommandoer/skriving.ts';
import { P1 } from './klient.ts';
import type { Avsnitt, Dokument, Journalrad } from '../typer.ts';
import { KJERNE } from '../versjon.ts';
import { utenAvsnitt } from './formatprove.ts';
import { SOM_BREV } from './brevet.ts';
import {
  BEGRUNNELSE,
  BESKRIVELSE,
  type Data,
  FRISTKRAV,
  FRIST_FULLT,
  I_SAKEN,
  medFristen,
  KLAR_OVER,
  KLAR_OVER_TEKST,
  KOE_17,
  KR,
  MOTTATT,
  MOTTATT_TEKST,
  NAVNET,
  PAABEROPELSE,
  SAK,
  TITTEL,
  VARSELBREVET,
  VEDERLAG_DELVIS,
  esc,
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

describe('de faste tekstene står ordrett (KA-U22, KA-U25, LV-U4 punkt 13)', () => {
  it('trekk av forholdet', () => {
    const s = sakMedKrav();
    const rad = s.send('TE', { type: 'trekk', spor: 'forhold' });
    expect(laast(rad)).toEqual([
      `Totalentreprenøren trekker sitt krav ${I_SAKEN}. Trekket er avkall på alle krav i saken, også vederlag og fristforlengelse byggherren har godkjent. Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.`,
    ]);
  });

  it('trekk av vederlaget identifiserer den gjeldende kravversjonen', () => {
    const s = sakMedKrav();
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(150000) });
    const rad = s.send('TE', { type: 'trekk', spor: 'vederlag' });
    // Den gjeldende kravversjonen er den i brev 4 i saken, ikke den første i brev 2. Beløpet
    // står med kravposten det er krevd i (KA-U22, KA-U53).
    expect(tekst(rad)).toEqual([
      {
        gjelder: (rad.data.utsagn as Data[])[0].id,
        laast: `Totalentreprenøren trekker kravet om justering av vederlaget ${I_SAKEN}, fremsatt i brev K201-KOE-017-04 av 5. oktober 2026 (${KR('150 000')} i P1). Trekket er avkall på dette kravet, også det byggherren har godkjent.`,
      },
    ]);
  });

  it('trekk av fristen', () => {
    const s = sakMedKrav();
    const rad = s.send('TE', { type: 'trekk', spor: 'frist' });
    expect(laast(rad)).toEqual([
      `Totalentreprenøren trekker kravet om fristforlengelse ${I_SAKEN}, fremsatt i brev K201-KOE-017-03 av 4. oktober 2026 (20 dager for frist Sluttfristen). Trekket er avkall på dette kravet, også det byggherren har godkjent.`,
    ]);
  });
});

describe('kravene (LV-U4 punkt 1–3, GR-U16)', () => {
  const forhold = (innhold: Data, utdypning?: string) => {
    const s = sak();
    return s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold,
      ...(utdypning ? { utdypning } : {}),
    });
  };

  // LV-U43: sakstittelen er navnet på forholdet og står én gang. LV-U35 og LV-U39 for hele
  // påberopelsen, og VS-U26 for datoen etter setningen om punkt 32.2.
  it('en endring der § 32.2 gjelder, med varselet', () => {
    const rad = forhold(PAABEROPELSE.innhold, BESKRIVELSE);
    expect(tekst(rad)).toEqual([
      {
        gjelder: (rad.data.krav as Data[])[0].id,
        laast: `Totalentreprenøren krever endringsordre for ${NAVNET} som irregulær endring (NS 8407 punkt\u00a032.1). Totalentreprenøren varsler etter NS 8407 punkt\u00a032.2 at totalentreprenøren påberoper seg at pålegget innebærer en endring. ${MOTTATT_TEKST}`,
        // A8: TEs beskrivelse er kravets utdypning og står bare der, ikke i kravet.
        utdypning: BESKRIVELSE,
      },
    ]);
    expect((rad.data.krav as Data[])[0]).not.toHaveProperty('beskrivelse');
  });

  it('sakstittelen står én gang, uten parentes (LV-U43)', () => {
    const t = laast(forhold(PAABEROPELSE.innhold, BESKRIVELSE))[0];
    expect(t.split(`«${TITTEL}»`)).toHaveLength(2);
    expect(t).not.toContain(I_SAKEN);
  });

  // #1501: punkt 15.2 gjelder «de avtalte krav til prosessen», med navnet fra velgeren.
  it('endringer i lover og vedtak etter punkt 15.2 gjelder prosessen (#1501)', () => {
    const rad = forhold(
      { hovedkategori: 'endring', underkategori: 'lovendring_prosess', ...MOTTATT },
      BESKRIVELSE
    );
    expect(laast(rad)[0]).toMatch(
      new RegExp(
        `^Totalentreprenøren krever endringsordre for ${esc(NAVNET)} som endringer i lover og vedtak for prosessen \\(NS 8407 punkt\u00a015\\.2\\)\\.`
      )
    );
  });

  it('underkategorien endringsordre identifiserer endringsordren og varsler ikke etter § 32.2', () => {
    const rad = forhold({
      hovedkategori: 'endring',
      underkategori: 'endringsordre',
      endringsordre: 'EO 12 av 1. oktober 2026',
    });
    expect(laast(rad)).toEqual([
      `Totalentreprenøren gjør gjeldende krav som følge av en endringsordre fra byggherren for ${NAVNET} (NS 8407 punkt\u00a031.3). Totalentreprenøren viser til endringsordren «EO 12 av 1. oktober 2026».`,
    ]);
  });

  it('et registrert krav i underkategorien endringsordre uten endringsordrens dato eller nummer er ikke forstått (GR-U16)', () => {
    const s = sak();
    const krav = (innhold: Data) =>
      lesJournal(
        [
          ...s.journal,
          {
            ...s.journal[0],
            event_id: randomUUID(),
            event_type: 'dokument_registrert',
            versjon: 2,
            data: {
              krav: [{ id: randomUUID(), spor: 'forhold', hovedkategori: 'endring', ...innhold }],
              opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-01' }],
              ...SOM_BREV,
            },
          },
        ],
        KJERNE.leserformat
      ).at(-1)!.art;
    expect(krav({ underkategori: 'endringsordre' })).toBe('ukjent');
    expect(krav({ underkategori: 'endringsordre', endringsordre: 'EO 12' })).toBe('dokument');
  });

  it('svikt viser til § 33.1 b og § 34.1.2', () => {
    const rad = forhold({
      hovedkategori: 'svikt',
      underkategori: 'grunnforhold',
      ...KLAR_OVER,
    });
    expect(laast(rad)).toEqual([
      `Totalentreprenøren påberoper uforutsette forhold ved grunnen (NS 8407 punkt\u00a023.1, jf. punkt\u00a033.1 b og 34.1.2) for ${NAVNET}. ${KLAR_OVER_TEKST}`,
    ]);
  });

  it('annet forhold etter § 33.1 c nevner ikke bestemmelsen to ganger', () => {
    const rad = forhold({
      hovedkategori: 'andre_forhold',
      underkategori: 'annet_forhold',
      ...KLAR_OVER,
    });
    expect(laast(rad)).toEqual([
      `Totalentreprenøren påberoper annet forhold byggherren har risikoen for (NS 8407 punkt\u00a033.1 c og 34.1.2) for ${NAVNET}. ${KLAR_OVER_TEKST}`,
    ]);
  });

  it('vederlaget er et tilbud uten merverdiavgift, og fristkravet har datoen for varselet og brevet med det (OV-U5)', () => {
    const s = sakMedKrav();
    const [, , v, varselet, f] = s.journal;
    // Punktene i prototype v4 i BF-14 (#1824), ett avsnitt per kravpost, og brevet sier hvilke
    // poster som er tilbud (KA-U61, BF-14 U-6). Partene skrives fullt ut (LV-U35).
    // Ett avsnitt per punkt (LV-U70). Forholdet er en endring, så varselet etter
    // § 34.1.2 nevnes ikke (VS-U3, OV-U15).
    expect(tekst(v)).toEqual([
      {
        gjelder: s.krav('vederlag'),
        punkt: 'P1',
        overskrift: '1. Vederlagsjustering',
        laast: `1. Vederlagsjustering\n\nP1 Ny fundamentering. Totalentreprenøren krever ${KR('125 000')}`,
      },
      {
        gjelder: s.krav('vederlag'),
        punkt: 'tilbud',
        laast: 'Kravet for P1 er et tilbud etter NS 8407 punkt\u00a034.2.1.',
      },
    ]);
    // VS-U34, C1 i #2056: varselet fra kravskjemaet står i saken som et eget brev, og kravet viser
    // til det med parten, typen og datoen (LV-U42) og legger det ved, som i vederlaget (VS-U53).
    // Budskapet er LV-U4 punkt 3 (TE opplyser når varselet ble sendt); ordlyden «ble gitt i …,
    // som er vedlagt» er teksten for et varsel gitt før (`gitt` i brevdelene), og står som åpent
    // spørsmål i PR #2074.
    expect(varselet.data).toMatchObject({
      ...SOM_BREV,
      utsagn: [expect.objectContaining({ art: 'varsel', hjemmel: '33.4' })],
      opplysninger: [expect.objectContaining({ hva: 'sendt', dato: '2026-09-28' })],
      dokumentasjon: [expect.objectContaining({ vedlegg_id: VARSELBREVET })],
    });
    expect(tekst(f)).toEqual([
      {
        gjelder: s.krav('frist'),
        punkt: '33.4',
        overskrift: '1. Varselet om fristforlengelse',
        laast:
          '1. Varselet om fristforlengelse\n\nTotalentreprenøren opplyser at varsel om fristforlengelse etter NS 8407 punkt\u00a033.4 ble gitt i totalentreprenørens brev av 28. september 2026, som er vedlagt.',
      },
      {
        gjelder: s.krav('frist'),
        punkt: 'frister',
        overskrift: '2. Fristforlengelse',
        laast: fristforlengelse(2),
      },
      {
        gjelder: s.krav('frist'),
        punkt: 'begrunnelse',
        overskrift: '3. Begrunnelse',
        laast: '3. Begrunnelse',
        utdypning: FRISTKRAV.utdypning,
      },
      { gjelder: f.event_id, laast: `Brevet har vedlegg: «${VARSELBREVET}.pdf».` },
    ]);
    expect(f.data.dokumentasjon).toEqual([expect.objectContaining({ vedlegg_id: VARSELBREVET })]);
    expect(s.journal.flatMap(utenAvsnitt)).toEqual([]);
  });

  // LV-U56 og tilfellene 1, 5 og 6 i BF-10-brevtekst.md: den låste delen sier bare hva
  // påberopelsen gjelder, og datoen. Den sier ikke at noe erstattes, og gjentar ikke varselet
  // etter punkt 32.2.
  describe('forbeholdet i kravet (KA-U82, LV-U74)', () => {
    const forbeholdet = 'Kravet forutsetter at pelearbeidet kan gjøres på dagtid.';
    const paaberopt = () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      return s;
    };

    it('fristkravet har forbeholdet under «Forbehold» sist, etter begrunnelsen, og raden leses tilbake med det', () => {
      const s = paaberopt();
      const rad = s.send('TE', { ...FRISTKRAV, forbehold: forbeholdet });
      expect(
        tekst(rad).filter((a) => a.punkt === 'begrunnelse' || a.punkt === 'forbehold')
      ).toEqual([
        {
          gjelder: s.krav('frist'),
          punkt: 'begrunnelse',
          overskrift: '3. Begrunnelse',
          laast: '3. Begrunnelse',
          utdypning: FRISTKRAV.utdypning,
        },
        {
          gjelder: s.krav('frist'),
          punkt: 'forbehold',
          overskrift: '4. Forbehold',
          laast: '4. Forbehold',
          utdypning: forbeholdet,
        },
      ]);
      expect(
        tekst(rad)
          .filter((a) => a.gjelder === s.krav('frist'))
          .at(-1)!.punkt,
        'forbeholdet er det siste punktet i kravet'
      ).toBe('forbehold');
      expect(s.u().forstaatt).toBe(true);
    });

    it('forbeholdet oppfyller ikke kravet om begrunnelse i fristkravet (KA-U82, KA-U33)', () => {
      const s = paaberopt();
      expect(
        s.avvisning('TE', { ...utenFelt(FRISTKRAV, 'utdypning'), forbehold: forbeholdet })
      ).toEqual({
        regel: 'BEGRUNNELSE_MANGLER',
        melding: 'Kravet om fristforlengelse må begrunne antallet dager.',
      });
      expect(s.avvist('TE', { ...FRISTKRAV, forbehold: forbeholdet }), 'kontrollsak').toBeNull();
    });

    it('vederlagskravet har forbeholdet under «Forbehold» sist', () => {
      const s = paaberopt();
      const rad = s.send('TE', {
        type: 'krav',
        spor: 'vederlag',
        innhold: tilbud(125000),
        forbehold: forbeholdet,
      });
      expect(tekst(rad).at(-1)).toEqual({
        gjelder: s.krav('vederlag'),
        punkt: 'forbehold',
        overskrift: '2. Forbehold',
        laast: '2. Forbehold',
        utdypning: forbeholdet,
      });
    });

    it('påberopelsen av forholdet har ikke noe forbehold (KA-U82)', () => {
      const s = sak();
      expect(s.avvisning('TE', { ...PAABEROPELSE, forbehold: forbeholdet })?.melding).toBe(
        '$.forbehold: påberopelsen av forholdet har ikke noe forbehold'
      );
      expect(s.avvist('TE', PAABEROPELSE), 'kontrollsak').toBeNull();
    });
  });

  describe('en ny versjon av påberopelsen (LV-U56)', () => {
    const nyVersjon = (innhold: Data) => {
      const s = sak();
      s.send('TE', { type: 'krav', spor: 'forhold', innhold, utdypning: BESKRIVELSE });
      return laast(
        s.send('TE', { type: 'krav', spor: 'forhold', innhold, utdypning: BESKRIVELSE })
      );
    };

    it('en endring der § 32.2 gjelder', () => {
      expect(nyVersjon(PAABEROPELSE.innhold)).toEqual([
        `Påberopelsen gjelder irregulær endring (NS 8407 punkt\u00a032.1) for ${NAVNET}. ${MOTTATT_TEKST}`,
      ]);
    });

    it('svikt viser til § 33.1 b og § 34.1.2', () => {
      expect(
        nyVersjon({ hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER })
      ).toEqual([
        `Påberopelsen gjelder uforutsette forhold ved grunnen (NS 8407 punkt\u00a023.1, jf. punkt\u00a033.1 b og 34.1.2) for ${NAVNET}. ${KLAR_OVER_TEKST}`,
      ]);
    });

    it('underkategorien endringsordre har ingen dato', () => {
      expect(
        nyVersjon({
          hovedkategori: 'endring',
          underkategori: 'endringsordre',
          endringsordre: 'EO 12',
        })
      ).toEqual([
        `Påberopelsen gjelder endringsordre «EO 12» fra byggherren (NS 8407 punkt\u00a031.3) for ${NAVNET}.`,
      ]);
    });
  });

  it('en ny kravversjon viser til den den erstatter (KA-U52 punkt 4, #1379)', () => {
    const s = sakMedKrav();
    const utenVarsel = utenFelt(FRISTKRAV, 'varsel');
    const rad = s.send('TE', {
      ...utenVarsel,
      innhold: { frister: [{ navn: 'Sluttfristen', dager: 30 }] },
    });
    expect(laast(rad)).toEqual([
      'Kravet erstatter totalentreprenørens krav i brev K201-KOE-017-03 av 4. oktober 2026.',
      // VS-U34, LV-U42: varselet fra det første kravskjemaet er totalentreprenørens eget brev.
      varseletGitt('totalentreprenørens brev av 28. september 2026'),
      fristforlengelse(2, 30),
      '3. Begrunnelse',
    ]);
  });

  it('en frist som er trukket og tatt med igjen i en ny form, sier hvilken frist den erstatter (KA-U79)', () => {
    const s = sakMedKrav();
    const utenVarsel = utenFelt(FRISTKRAV, 'varsel');
    const forste = () => innholdIFristen(s.u().spor.frist.gjeldendeKrav!).frister;
    const a = forste()[0]!.id;
    s.send('TE', {
      ...utenVarsel,
      innhold: { frister: [{ navn: 'Delfristen', dager: 5 }], trekker: [a] },
    });
    const b = forste()[0]!.id;
    const rad = s.send('TE', {
      ...utenVarsel,
      innhold: {
        frister: [
          { id: a, navn: 'Sluttfrist', dager: 30 },
          { id: b, navn: 'Delfristen', dager: 5 },
        ],
      },
    });
    expect(laast(rad).join('\n\n')).toContain(
      'Frist Sluttfrist: 30 dager. Fristen erstatter frist Sluttfristen i brev K201-KOE-017-03 av 4. oktober 2026.'
    );
  });
});

describe('kravet til begrunnelse og beskrivelse (KA-U46, KA-U47, KA-U31–KA-U33, GR-U15)', () => {
  it('TEs varsel etter § 32.2 uten beskrivelse av pålegget avvises (GR-U15)', () => {
    const s = sak();
    const uten = utenFelt(PAABEROPELSE, 'utdypning');
    expect(s.avvist('TE', uten)).toBe('BESKRIVELSE_MANGLER');
    expect(s.avvist('TE', PAABEROPELSE)).toBeNull();
  });

  it('en beskrivelse eller begrunnelse med bare mellomrom teller ikke (GR-U15, KA-U33)', () => {
    const s = sak();
    expect(s.avvist('TE', { ...PAABEROPELSE, utdypning: ' \n ' })).toBe('BESKRIVELSE_MANGLER');
    s.send('TE', PAABEROPELSE);
    expect(s.avvist('TE', { ...FRISTKRAV, utdypning: '  ' })).toBe('BEGRUNNELSE_MANGLER');
  });

  it('forhåndsvisningen gir den låste teksten før begrunnelsen er skrevet (A1)', () => {
    const s = sakMedKrav();
    const avslag = {
      type: 'brev',
      svar: [
        svar(
          'forhold',
          s.krav('forhold'),
          { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
          {},
          null
        ),
      ],
    };
    // Innledningen, punktet om varselet etter punkt 32.2 og punktet om forholdet (LV-U34, LV-U41).
    expect(s.vis('BH', avslag)).toHaveLength(3);
    expect(s.avvist('BH', avslag)).toBe('BEGRUNNELSE_MANGLER');
  });

  it('kontrollsak: en påberopelse der § 32.2 ikke gjelder, trenger ingen beskrivelse', () => {
    const s = sak();
    expect(
      s.avvist('TE', {
        type: 'krav',
        spor: 'forhold',
        innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
      })
    ).toBeNull();
  });

  it('et fristkrav uten begrunnelse avvises (§ 33.6.1, KA-U33)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const uten = utenFelt(FRISTKRAV, 'utdypning');
    expect(s.avvist('TE', uten)).toBe('BEGRUNNELSE_MANGLER');
    expect(s.avvist('TE', FRISTKRAV)).toBeNull();
  });

  it('vederlagskravet trenger ingen utdypning, men kan ha en (A7)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const vederlag = { type: 'krav', spor: 'vederlag', innhold: tilbud(1) };
    expect(s.avvist('TE', vederlag)).toBeNull();
    const rad = s.send('TE', { ...vederlag, utdypning: 'Kalkylen er vedlagt.' });
    // Utdypningen for hele vederlagskravet er begrunnelsen (LV-U74).
    expect(tekst(rad).at(-1)).toMatchObject({
      punkt: 'begrunnelse',
      utdypning: 'Kalkylen er vedlagt.',
    });
  });

  const brev = (...svar: Data[]) => ({ type: 'brev', svar });

  it.each([
    [
      'påberopt preklusjon etter § 32.2 (KA-U21, KA-U47)',
      'forhold',
      { resultat: 'godkjent', grunnlag_varslet_i_tide: false },
      {},
    ],
    [
      'avslag av kravet på endringsordre (KA-U46 punkt\u00a01)',
      'forhold',
      { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
      {},
    ],
  ] as [string, 'forhold', Data, Data][])(
    'et svar med %s må ha en begrunnelse',
    (_n, spor, vurderinger, resultat) => {
      const s = sakMedKrav();
      const uten = brev(svar(spor, s.krav(spor), vurderinger, resultat, null));
      expect(s.avvist('BH', uten)).toBe('BEGRUNNELSE_MANGLER');
      expect(s.avvist('BH', brev(svar(spor, s.krav(spor), vurderinger, resultat)))).toBeNull();
    }
  );

  it('begrunnelsen for en påberopelse etter § 32.2 kan stå i punktet om varselet, men ikke under «Forbehold» (KA-U46 punkt 3, arbeidsvalg 1 i #1433)', () => {
    const s = sakMedKrav();
    const paaberopt = { resultat: 'godkjent', grunnlag_varslet_i_tide: false };
    const med = (felt: Data) =>
      brev({ ...svar('forhold', s.krav('forhold'), paaberopt, {}, null), ...felt });
    expect(s.avvist('BH', med({ utdypninger: { '32.2': BEGRUNNELSE } }))).toBeNull();
    expect(s.avvist('BH', med({ utdypning: BEGRUNNELSE }))).toBe('BEGRUNNELSE_MANGLER');
    expect(s.avvist('BH', med({ utdypninger: { forhold: '   ' } }))).toBe('BEGRUNNELSE_MANGLER');
  });

  it('begrunnelsen for et avslag av kravet på endringsordre står i punktet om forholdet, ikke i punktet om et varsel i tide (KA-U46 punkt 3)', () => {
    const s = sakMedKrav();
    const avslag = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
    const med = (felt: Data) =>
      brev({ ...svar('forhold', s.krav('forhold'), avslag, {}, null), ...felt });
    expect(s.avvist('BH', med({ utdypninger: { '32.2': BEGRUNNELSE } }))).toBe(
      'BEGRUNNELSE_MANGLER'
    );
    expect(s.avvist('BH', med({ utdypninger: { forhold: BEGRUNNELSE } }))).toBeNull();
  });

  it('svaret på forholdet ved svikt, der § 32.2 ikke gjelder, godtas uten begrunnelse også ved avslag (KA-U46 punkt 1)', () => {
    const s = sak();
    s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER },
    });
    const avslag = brev(svar('forhold', s.krav('forhold'), { resultat: 'avslaatt' }, {}, null));
    expect(s.avvist('BH', avslag)).toBeNull();
  });

  it.each([
    [
      'frafall etter § 32.3 c',
      'forhold',
      { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true },
      {},
    ],
    ['et beløp som ikke er godkjent fullt', 'vederlag', VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1]],
    [
      'påberopt preklusjon etter § 33.4',
      'frist',
      { ...FRIST_FULLT[0], frist_varsel_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 },
    ],
    [
      'et tilbud som ikke er akseptert (§ 34.2.2)',
      'vederlag',
      P1({ aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' }),
      { resultat: 'delvis_godkjent', godkjent_beloep: 0 },
    ],
    [
      'påberopt spesifisering for sent etter § 33.6.1',
      'frist',
      { ...FRIST_FULLT[0], spesifisert_krav_ok: false, dager_maatte_forstaa: 20 },
      { resultat: 'godkjent', godkjent_dager: 20 },
    ],
    [
      '«ingen hindring» (VS-U13)',
      'frist',
      { ...FRIST_FULLT[0], vilkar_oppfylt: false },
      { resultat: 'avslaatt', godkjent_dager: 0 },
    ],
    [
      'dager som ikke er godkjent fullt',
      'frist',
      { ...FRIST_FULLT[0], dager: 10 },
      { resultat: 'delvis_godkjent', godkjent_dager: 10 },
    ],
  ] as [string, 'forhold', Data, Data][])(
    'et svar med %s godtas uten begrunnelse (KA-U46 punkt\u00a01)',
    (_n, spor, vurderinger, resultat) => {
      const s = sakMedKrav();
      const uten = brev(svar(spor, s.krav(spor), vurderinger, resultat, null));
      expect(s.avvist('BH', uten)).toBeNull();
    }
  );

  it.each([
    ['grunnlaget godkjent', 'forhold', { resultat: 'godkjent', grunnlag_varslet_i_tide: true }, {}],
    [
      'hele beløpet godkjent',
      'vederlag',
      {
        ...P1({ vurdering: 'godkjent', godkjent_beloep: 125000, aksepterer: true }),
      },
      { resultat: 'godkjent', godkjent_beloep: 125000 },
    ],
    ['alle dagene godkjent', 'frist', FRIST_FULLT[0], FRIST_FULLT[1]],
  ] as [string, 'forhold', Data, Data][])(
    'kontrollsak: et svar med %s trenger ingen begrunnelse',
    (_n, spor, vurderinger, resultat) => {
      const s = sakMedKrav();
      expect(
        s.avvist('BH', brev(svar(spor, s.krav(spor), vurderinger, resultat, null)))
      ).toBeNull();
    }
  );

  it('et svar som bare er subsidiært fordi forholdet er avslått, trenger ingen egen begrunnelse (KA-U46 punkt 1)', () => {
    const s = sakMedKrav();
    s.send(
      'BH',
      brev(
        svar('forhold', s.krav('forhold'), {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        })
      )
    );
    expect(s.u().spor.frist.subsidiaer, 'forutsetning: fristen er subsidiær').toEqual(['avslaatt']);
    expect(
      s.avvist('BH', brev(svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1], null)))
    ).toBeNull();
  });
});

describe('den låste delen og utdypningen hver for seg (B-13 om begrunnelsestekst, KA-U31)', () => {
  it('begrunnelsen står under svaret den gjelder, uendret', () => {
    const s = sakMedKrav();
    const utdypning = 'Varselet kom tre uker etter pålegget.\n\nSe referatet fra byggemøte 4.';
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar(
          'forhold',
          s.krav('forhold'),
          { resultat: 'avslaatt', grunnlag_varslet_i_tide: false },
          {},
          utdypning
        ),
        svar(
          'vederlag',
          s.krav('vederlag'),
          VEDERLAG_DELVIS[0],
          VEDERLAG_DELVIS[1],
          'Påslaget er for høyt.'
        ),
      ],
    });
    // KA-U46 punkt 1 og KA-U47: begrunnelsen for forholdet står under punktet om forholdet, og
    // utdypningen for hele vederlagssvaret under punktet «Forbehold» (GR-U34).
    const avsnitt = tekst(rad);
    const g = avsnitt.find((a) => a.punkt === 'forhold')!;
    const v = avsnitt.at(-1)!;
    expect(g.utdypning).toBe(utdypning);
    expect(g.laast).not.toContain('tre uker');
    expect(v.punkt).toBe('forbehold');
    expect(v.utdypning).toBe('Påslaget er for høyt.');
  });
});

describe('teksten avsenderen godkjenner, er den som fryses (LV-U2, A1)', () => {
  it('kontrollsak: kommandoen med teksten fra forhåndsvisningen godtas', () => {
    expect(sak().avvist('TE', PAABEROPELSE)).toBeNull();
  });

  it('en kommando uten teksten avvises, også når alt annet stemmer (ikke fail-open)', () => {
    const s = sak();
    const u = vurder(
      PAABEROPELSE,
      {
        sakId: SAK,
        aktoerId: 'te',
        part: 'TE',
        teamId: null,
        sakskode: { kode: 'koe' as const, loepenummer: 17 },
        kontraktsforkortelse: 'K201',
        kontraktsfrister: [],
        tidspunkt: () => new Date(),
        nyId: randomUUID,
      },
      s.journal,
      KJERNE,
      new Map()
    );
    expect(u.godtatt ? null : u.avvisning.regel).toBe('BREVTEKST_MANGLER');
  });

  it('en annen tekst enn den serveren lager, avvises', () => {
    const s = sak();
    const vist = forhaandsvis(
      PAABEROPELSE,
      {
        sakId: SAK,
        aktoerId: 'te',
        part: 'TE',
        teamId: null,
        sakskode: { kode: 'koe' as const, loepenummer: 17 },
        kontraktsforkortelse: 'K201',
        kontraktsfrister: [],
        tidspunkt: () => new Date(),
        nyId: randomUUID,
      },
      s.journal,
      KJERNE
    );
    const t = vist.godtatt ? laastTekst(vist.hendelser[0])! : [];
    expect(t, 'forutsetning: forhåndsvisningen har teksten').toHaveLength(1);
    expect(s.avvist('TE', { ...PAABEROPELSE, brevtekst: [t[0].replace('32.1', '32.2')] })).toBe(
      'ANNEN_BREVTEKST'
    );
    expect(s.avvist('TE', { ...PAABEROPELSE, brevtekst: [...t, t[0]] })).toBe('ANNEN_BREVTEKST');
    expect(s.avvist('TE', { ...PAABEROPELSE, brevtekst: t })).toBeNull();
  });

  it('en registrering bærer ingen tekst (MM-U17, MM-U50)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varsel = {
      type: 'varsel',
      ...SOM_BREV,
      varsler: [{ hjemmel: '33.4' }],
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    };
    expect(s.avvist('TE', { ...varsel, brevtekst: ['x'] })).toBe('UGYLDIG_FORM');
    const rad = s.send('TE', varsel);
    expect(rad.data.brevtekst).toBeUndefined();
    expect(utenAvsnitt(rad)).toEqual([]);
  });
});

describe('meldingene før påberopelsen er sendt (språkfila, #1955)', () => {
  it('varselet avvises med en melding som sier «påberopelsen», ikke «grunnlaget»', () => {
    const uten = sak();
    expect(
      uten.avvisning('TE', {
        type: 'varsel',
        ...SOM_BREV,
        varsler: [{ hjemmel: '33.4' }],
        sendt: '2026-09-28',
        dokumentasjon: [randomUUID()],
      })
    ).toEqual({
      regel: 'PAABEROPELSE_IKKE_SENDT',
      melding: 'Påberopelsen må være sendt før du kan varsle.',
    });
  });
});

describe('vedleggene står i teksten (A4)', () => {
  const dokument = (filnavn: string[]): Dokument => ({
    id: 'brevet',
    avsender: 'TE',
    lagtTilAv: 'TE',
    registrert: '2026-10-05T10:00:00Z',
    opplysninger: [],
    dokumentasjon: filnavn.map((f) => ({
      vedlegg_id: randomUUID(),
      filnavn: f,
      innhold_sha256: '0'.repeat(64),
    })),
    krav: [],
    svar: [],
    utsagn: [{ id: 'u', art: 'foresporsel', hjemmel: '33.6.2' }],
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
  });
  const saken = {
    sakskode: { kode: 'koe' as const, loepenummer: 17 },
    tittel: TITTEL,
    svarPaaPaaberopelsen: null,
    datoopplysninger: [],
    sisteKunnskapsdato: null,
    subsidiaer: { vederlag: [], frist: [] },
    avklartVedFrafall: false,
    varslerIEldreKrav: [],
    kravpostvarsler: {},
    utenVirkning: [],
    varsletFoer: {},
    paaberopelse: null,
  };

  it('et brev med vedlegg får et avsnitt som lister filnavnene og gjelder dokumentet (arbeidsvalg 10 i #790)', () => {
    const t = lagBrevtekst(dokument(['tegning-12.pdf', 'referat-4.pdf']), [], saken, KJERNE.regler);
    expect(t.at(-1)).toEqual({
      gjelder: 'brevet',
      laast: 'Brevet har vedlegg: «tegning-12.pdf» og «referat-4.pdf».',
    });
  });

  it('kontrollsak: et brev uten vedlegg har ikke avsnittet', () => {
    const t = lagBrevtekst(dokument([]), [], saken, KJERNE.regler);
    expect(t.map((a) => a.gjelder)).toEqual(['u']);
  });
});

describe('leseren kontrollerer brevteksten (HF-U1, MM-U17 (opphevet av MM-U50))', () => {
  const lest = (rader: Journalrad[]) => lesJournal(rader, KJERNE.leserformat).at(-1)!;
  const medTekst = (endre: (data: Data, rad: Journalrad) => void) => {
    const s = sakMedKrav();
    const rad = structuredClone(s.journal.at(-1)!);
    // Fristkravet uten brevet med varselet (OV-U5), så avsnittene er de tre punktene i kravet:
    // varselet, som er et eget brev (VS-U34), fristene og begrunnelsen.
    delete rad.data.dokumentasjon;
    rad.data.brevtekst = tekst(rad).filter((a) => a.gjelder !== rad.event_id);
    endre(rad.data, rad);
    return lest([...s.journal.slice(0, -1), rad]);
  };

  it('kontrollsak: brevet slik kjernen skrev det, er forstått og har teksten', () => {
    const h = medTekst(() => {});
    expect(h.art).toBe('dokument');
    expect(h.art === 'dokument' && h.dokument.brevtekst?.length).toBe(3);
  });

  it('et avsnitt som ikke gjelder et element i brevet, gjør raden ikke forstått', () => {
    const h = medTekst((d) => ((d.brevtekst as Avsnitt[])[0].gjelder = randomUUID()));
    expect(h.art).toBe('ukjent');
  });

  it('et avsnitt for dokumentet uten vedlegg gjør raden ikke forstått (A4)', () => {
    expect(
      medTekst((d, r) =>
        (d.brevtekst as Avsnitt[]).push({
          gjelder: r.event_id,
          laast: 'Brevet har vedlegg: «tegning.pdf».',
        })
      ).art
    ).toBe('ukjent');
    // Kontrollsak: med vedlegg kan et avsnitt gjelde dokumentet.
    const h = medTekst((d, r) => {
      d.dokumentasjon = [
        { vedlegg_id: randomUUID(), filnavn: 'tegning.pdf', innhold_sha256: '0'.repeat(64) },
      ];
      (d.brevtekst as Avsnitt[]).push({
        gjelder: r.event_id,
        laast: 'Brevet har vedlegg: «tegning.pdf».',
      });
    });
    expect(h.art).toBe('dokument');
  });

  it('to avsnitt for samme element gjør raden ikke forstått', () => {
    const h = medTekst((d) => {
      const t = d.brevtekst as Avsnitt[];
      expect(t, 'forutsetning: fristkravet har tre punkter').toHaveLength(3);
      // Et avsnitt uten punkt rett etter et avsnitt for samme element (LV-U70).
      delete t[2].punkt;
    });
    expect(h.art).toBe('ukjent');
  });

  it('brevtekst i et registrert brev gjør raden ikke forstått', () => {
    // Registrert korrespondanse slik leseren ellers forstår den (LV-U42, LV-U45), så bare
    // brevteksten skiller raden fra kontrollsaken.
    const registrert = (medBrevtekst: boolean) =>
      medTekst((d) => {
        d.opplysninger = [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }];
        d.korrespondansetype = 'e_post';
        delete d.merking;
        delete d.brevnummer;
        delete d.brevtittel;
        if (!medBrevtekst) delete d.brevtekst;
      });
    expect(registrert(false).art, 'kontrollsak uten brevtekst').toBe('dokument');
    expect(registrert(true).art).toBe('ukjent');
  });
});

describe('gjengivelsen er tro mot den frosne teksten (LV-U2)', () => {
  const avsnitt: Avsnitt[] = [
    { gjelder: 'a', laast: 'Byggherren avslår grunnlaget.', utdypning: 'Fordi\nalt var kjent.' },
    { gjelder: 'b', laast: 'Byggherren godkjenner 10 dager av de krevde 20 dager.' },
  ];

  it('kontrollsak: gjengivelsen og en gjengivelse med andre linjeskift er tro', () => {
    expect(gjengirTro(gjengi(avsnitt), avsnitt)).toBe(true);
    expect(gjengirTro(`Brev 5\n${gjengi(avsnitt).replace(/ /g, '\n')}\nSide 1 av 1`, avsnitt)).toBe(
      true
    );
  });

  it.each([
    ['et avsnitt mangler', gjengi([avsnitt[0]])],
    ['utdypningen mangler', gjengi([{ ...avsnitt[0], utdypning: undefined }, avsnitt[1]])],
    ['et ord er endret', gjengi(avsnitt).replace('10 dager', '12 dager')],
    ['rekkefølgen er byttet', gjengi([avsnitt[1], avsnitt[0]])],
  ])('ikke tro når %s', (_n, gjengitt) => {
    expect(gjengirTro(gjengitt, avsnitt)).toBe(false);
  });
});

describe('formen på tall og datoer', () => {
  it('beløpet rundes til hele øre som reglene runder (B-13)', () => {
    expect(kroner(1.005)).toBe('1,01\u00a0kr');
    expect(kroner(0.004)).toBe('0\u00a0kr');
  });

  it('en dato som ikke finnes i kalenderen, avvises i kommandoen', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    for (const sendt of ['02.10.2026', '2026-13-45', 'xxxxxxxxxx'])
      expect(s.avvist('TE', { ...FRISTKRAV, varsel: { sendt } })).toBe('UGYLDIG_FORM');
    expect(
      s.avvist('TE', {
        type: 'varsel',
        ...SOM_BREV,
        varsler: [{ hjemmel: '33.4' }],
        sendt: '2026-02-30',
        dokumentasjon: [randomUUID()],
      })
    ).toBe('UGYLDIG_FORM');
  });

  it('kroner og datoer i Oslo', () => {
    expect(kroner(125000)).toBe('125 000 kr');
    expect(kroner(1234567.5)).toBe('1 234 567,50 kr');
    expect(norskDato('2026-09-28')).toBe('28. september 2026');
    // Klokka 23.30 UTC 31.12 er 1. januar i Oslo.
    expect(norskDato('2026-12-31T23:30:00Z')).toBe('1. januar 2027');
  });

  // T1 i #770 (#766, #472): brevet og kontrollene leser datoen med samme kalenderdag.
  it.each([
    ['2026-10-02', '2026-10-02'],
    ['2026-10-02T22:30:00Z', '2026-10-03'],
    ['2026-10-02T23:30:00+02:00', '2026-10-02'],
    ['2026-10-02T23:30:00', null],
    ['2026-02-30', null],
    ['2026-02-30T10:00:00Z', null],
    ['2026-10-02T24:00:00+02:00', null],
    ['2. oktober', null],
  ])('kalenderdagen for %s er %s', (dato, dag) => {
    expect(kalenderdag(dato)).toBe(dag);
    if (dag === null) expect(() => norskDato(dato)).toThrow(KanIkkeUttrykkes);
    else expect(norskDato(dato)).toBe(norskDato(dag));
  });
});

/**
 * #801: et brev fra appen kan ikke ha et tegn PDF-en ikke kan vise (oppdragsgiver 20.10:
 * «Avvis tegnet ved skriving»), med arbeidsvalgene 22.10: alle tekstfelt som havner i
 * PDF-en, usynlige tegn unntatt myk bindestrek, ikke et registrert brev, og en melding
 * med tegnet, kodepunktet og feltet. Ingen kommando for et registrert brev har fritekst
 * (`begrunnelse` avvises etter OV-U7), så det tredje valget prøves ikke her. Tegnene PDF-en kan vise, prøves mot skriftene i
 * `server/tester/brevpdf.test.ts`.
 */
describe('tegn PDF-en av brevet ikke kan vise, avvises når brevet skrives (#801)', () => {
  it('en emoji i utdypningen avvises med tegnet, kodepunktet og feltet, også i forhåndsvisningen', () => {
    const s = sak();
    const kommando = { ...PAABEROPELSE, utdypning: 'Pelingen er forsinket 😀' };
    const avvisning = {
      regel: 'UGYLDIG_FORM',
      melding: '$.utdypning har tegnet «😀» (U+1F600), som PDF-en av brevet ikke kan vise.',
    };
    expect(s.avvisning('TE', kommando)).toEqual(avvisning);
    expect(s.vis('TE', kommando)).toBeNull();
    expect(s.journal).toHaveLength(1);
    expect(s.avvist('TE', PAABEROPELSE), 'kontrollsak').toBeNull();
  });

  it('endringsordren i kravet og utdypningen i et svar kontrolleres også', () => {
    const s = sak();
    expect(
      s.avvisning('TE', {
        ...PAABEROPELSE,
        innhold: { hovedkategori: 'endring', underkategori: 'endringsordre', endringsordre: '☺' },
      })
    ).toEqual({
      regel: 'UGYLDIG_FORM',
      melding:
        '$.innhold.endringsordre har tegnet «☺» (U+263A), som PDF-en av brevet ikke kan vise.',
    });
    s.send('TE', PAABEROPELSE);
    const brev = (utdypning: string) => ({
      type: 'brev',
      svar: [
        svar(
          'forhold',
          s.krav('forhold'),
          { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
          {},
          utdypning
        ),
      ],
    });
    expect(s.avvisning('BH', brev('Avslått \u{1F44E}'))?.melding).toBe(
      '$.svar[0].utdypninger.forhold har tegnet «\u{1F44E}» (U+1F44E), som PDF-en av brevet ikke kan vise.'
    );
    expect(s.avvist('BH', brev('Avslått.')), 'kontrollsak').toBeNull();
  });

  it('et usynlig tegn avvises, mens myk bindestrek, → og linjeskift godtas', () => {
    const s = sak();
    const med = (utdypning: string) => ({ ...PAABEROPELSE, utdypning });
    expect(s.avvisning('TE', med('fundament\u200bering'))?.melding).toBe(
      '$.utdypning har det usynlige tegnet U+200B, som PDF-en av brevet ikke kan vise.'
    );
    expect(s.avvisning('TE', med('\ufeffFundamentering'))?.melding).toBe(
      '$.utdypning har det usynlige tegnet U+FEFF, som PDF-en av brevet ikke kan vise.'
    );
    expect(s.avvist('TE', med('fundament\u00adering → peling\r\n\tny linje'))).toBeNull();
  });

  // #1138: meldingen sier hva som hindrer (CLAUDE.md, «Skriv etter hva teksten gjør»).
  const iSakstittelen = {
    regel: 'UGYLDIG_FORM',
    melding: 'Sakstittelen har tegnet «😀» (U+1F600), som PDF-en av brevet ikke kan vise.',
  };

  it('en sakstittel med et slikt tegn fra før stopper brevet i den låste teksten, og meldingen nevner sakstittelen', () => {
    const s = sak('Fundament 😀');
    expect(s.vis('TE', PAABEROPELSE)).toBeNull();
    expect(s.avvisning('TE', PAABEROPELSE)).toEqual(iSakstittelen);
  });

  it('ved sending nevner meldingen sakstittelen, ikke den låste teksten klienten sendte med (#1138)', () => {
    const s = sak('Fundament 😀');
    const vist = [
      `Totalentreprenøren krever endringsordre for «Fundament 😀» i sak KOE-17 som irregulær endring (NS 8407 punkt\u00a032.1).`,
    ];
    expect(s.avvisning('TE', { ...PAABEROPELSE, brevtekst: vist })).toEqual(iSakstittelen);
  });

  it('en sakstittel med et slikt tegn stopper ikke et brev der sakstittelen ikke står i teksten (#801, #1138)', () => {
    const s = sak('Fundament 😀');
    const krav = randomUUID();
    s.rad('TE', {
      krav: [
        {
          id: krav,
          spor: 'forhold',
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
      ...SOM_BREV,
    });
    const aksept = {
      type: 'brev',
      svar: [svar('forhold', krav, { resultat: 'godkjent', grunnlag_varslet_i_tide: true })],
    };
    expect(s.avvisning('BH', aksept)).toBeNull();
    expect(s.vis('BH', aksept)?.join(' '), 'forutsetning').not.toContain('Fundament');
  });

  it('et filnavn med et slikt tegn fra før stopper brevet, og meldingen nevner vedlegget (#1138)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
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
    const lager = (filnavn: string) =>
      new Map([
        [VARSELBREVET, { vedlegg_id: VARSELBREVET, filnavn, innhold_sha256: '0'.repeat(64) }],
      ]);
    const kontroll = forhaandsvis(FRISTKRAV, kontekst, s.journal, KJERNE, lager('varsel.pdf'));
    expect(kontroll.godtatt, 'kontrollsak').toBe(true);
    const vist = kontroll.godtatt ? laastTekst(kontroll.hendelser.at(-1)!)! : [];
    const melding =
      'Filnavnet til vedlegget «varsel 😀.pdf» har tegnet «😀» (U+1F600), som PDF-en av brevet ikke kan vise.';
    for (const kommando of [FRISTKRAV, { ...FRISTKRAV, brevtekst: vist }]) {
      const u = vurder(kommando, kontekst, s.journal, KJERNE, lager('varsel 😀.pdf'));
      expect(u.godtatt ? null : u.avvisning).toEqual({ regel: 'UGYLDIG_FORM', melding });
    }
  });

  // #1229: TEs beskrivelse siteres i godkjenningen (GR-U14) og har ingen egen kontroll når
  // brevet skrives, så bare kontrollen av den låste teksten stopper den.
  it('en beskrivelse med et slikt tegn fra før stopper godkjenningen som siterer den (GR-U14, #1229)', () => {
    const s = sak();
    const krav = s.send('TE', PAABEROPELSE);
    const godkjenning = {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    };
    expect(s.vis('BH', godkjenning)?.join('\n\n') ?? '', 'kontrollsak').toContain(
      `«${BESKRIVELSE}»`
    );
    const avsnitt = (krav.data as { brevtekst: { utdypning?: string }[] }).brevtekst;
    const medBeskrivelse = avsnitt.find((a) => a.utdypning === BESKRIVELSE);
    expect(medBeskrivelse, 'forutsetning').toBeDefined();
    medBeskrivelse!.utdypning = 'Byggherren har pålagt en annen fundamentering 😀';
    expect(s.vis('BH', godkjenning)).toBeNull();
    expect(s.avvisning('BH', godkjenning)).toEqual({
      regel: 'UGYLDIG_FORM',
      melding:
        // LV-U70: sitatet står i punktet om forholdet, og meldingen sier hvilket punkt.
        'Punktet «2. Forholdet» i brevteksten har tegnet «😀» (U+1F600), som PDF-en av brevet ikke kan vise.',
    });
  });
});

describe('brevtittelen fryses med brevet (MM-U3, MM-U50, svaret 03.11 i #1488)', () => {
  it('påberopelsen får tittelen med navnet på forholdet fra kjernens liste, og leseren gir den', () => {
    const s = sak();
    const rad = s.send('TE', PAABEROPELSE);
    expect(rad.data.brevtittel).toBe('Påberopelse av irregulær endring i sak KOE-17');
    const lest = lesJournal(s.journal, KJERNE.leserformat).at(-1)!;
    expect(lest.art === 'dokument' && lest.dokument.brevtittel).toBe(
      'Påberopelse av irregulær endring i sak KOE-17'
    );
  });

  // #1536: hvert brev løsningen sender, fryser tittelen visningen ga det (tekster.ts før #1536).
  it('kravet og svaret fryser tittelen sin med teksten (#1536)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const krav = s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(1000),
    });
    expect(krav.data.brevtittel).toBe('Krav om vederlagsjustering i sak KOE-17');
    const svaret = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      ],
    });
    expect(svaret.data.brevtittel).toBe('Svar på forholdet i sak KOE-17');
    const lest = lesJournal(s.journal, KJERNE.leserformat).at(-1)!;
    expect(lest.art === 'dokument' && lest.dokument.brevtittel).toBe(
      'Svar på forholdet i sak KOE-17'
    );
  });

  // LV-U27: sakens kode står i brevtittelen, og saken omtales «i sak KOE-17» (LV-U44, svaret på Q1).
  it('tittelen har sakens kode uten utfylling, og leseren forstår den (LV-U27, LV-U44)', () => {
    const s = sak(TITTEL, { kode: 'koe', loepenummer: 5 });
    const rad = s.send('TE', PAABEROPELSE);
    expect(rad.data.brevtittel).toBe('Påberopelse av irregulær endring i sak KOE-5');
    const svaret = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      ],
    });
    expect(svaret.data.brevtittel).toBe('Svar på forholdet i sak KOE-5');
    expect(lesJournal(s.journal, KJERNE.leserformat).map((h) => h.art)).not.toContain('ukjent');
  });

  it('en endringsordresak omtales med EO og løpenummeret (LV-U44)', () => {
    const s = sak(TITTEL, { kode: 'eo', loepenummer: 12 });
    expect(s.send('TE', PAABEROPELSE).data.brevtittel).toBe(
      'Påberopelse av irregulær endring i sak EO-12'
    );
  });

  // #1533, MM-U2: leseren avviser en tittel skrivingen ikke lager.
  const lestMed = (s: ReturnType<typeof sak>, rad: Journalrad, data: Data) =>
    lesJournal(
      [...s.journal.slice(0, -1), { ...rad, data: { ...rad.data, ...data } }],
      KJERNE.leserformat
    ).at(-1)!.art;

  it('en påberopelse med tittelen for et annet forhold er ikke forstått (#1533)', () => {
    const s = sak();
    const rad = s.send('TE', PAABEROPELSE);
    expect(lestMed(s, rad, {}), 'kontrollsak').toBe('dokument');
    expect(lestMed(s, rad, { brevtittel: 'Påberopelse av forsinkelse' })).toBe('ukjent');
    expect(lestMed(s, rad, { brevtittel: 'Krav om endring' })).toBe('ukjent');
    expect(lestMed(s, rad, { brevtittel: 'Påberopelse av irregulær endringsordre' })).toBe(
      'ukjent'
    );
    expect(lestMed(s, rad, { brevtittel: 'Påberopelse av irregulær endring og forsinkelse' })).toBe(
      'ukjent'
    );
    expect(
      lestMed(s, rad, { brevtittel: 'Påberopelse av irregulær endring i sak KOE-3 og forsinkelse' })
    ).toBe('ukjent');
    // Leseren kjenner igjen formen fra medSakskode. Koden står ikke for seg i journalen (DM-06), men
    // merkingen i samme brev har den, og de to må nevne samme sak (#1588).
    expect(
      lestMed(s, rad, { brevtittel: 'Påberopelse av irregulær endring i sak KOE-17' }),
      'kontrollsak: samme sak som merkingen'
    ).toBe('dokument');
    expect(lestMed(s, rad, { brevtittel: 'Påberopelse av irregulær endring i sak KOE-3' })).toBe(
      'ukjent'
    );
  });

  it('et svar med tittelen for en påberopelse er ikke forstått (#1533)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'godkjent', grunnlag_varslet_i_tide: true }),
      ],
    });
    expect(lestMed(s, rad, {}), 'kontrollsak').toBe('dokument');
    expect(lestMed(s, rad, { brevtittel: 'Påberopelse av irregulær endring' })).toBe('ukjent');
  });

  it('en brevtittel uten tekst fra appen er ikke forstått, og kontrollsaken med teksten er det', () => {
    const s = sak();
    const rad = s.send('TE', PAABEROPELSE);
    const uten = { ...rad, data: { ...rad.data, brevtekst: undefined } };
    delete uten.data.brevtekst;
    expect(lesJournal([...s.journal.slice(0, -1), rad], KJERNE.leserformat).at(-1)!.art).toBe(
      'dokument'
    );
    expect(lesJournal([...s.journal.slice(0, -1), uten], KJERNE.leserformat).at(-1)!.art).toBe(
      'ukjent'
    );
  });
});

describe('brevets nummer i saken (LV-U44, LV-U45, N3 i #1497)', () => {
  it('løsningens brev får nummeret etter det høyeste i saken', () => {
    const s = sak();
    expect(s.send('TE', PAABEROPELSE).data.brevnummer).toBe(1);
    const neste = s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(1000),
    });
    expect(neste.data.brevnummer).toBe(2);
    const lest = lesJournal(s.journal, KJERNE.leserformat).at(-1)!;
    expect(lest.art === 'dokument' && lest.dokument.brevnummer).toBe(2);
  });

  // LV-U44: et nummer kan stå to ganger, så det neste regnes fra det høyeste.
  it('et høyere nummer i journalen gir det neste, og to brev kan ha samme nummer', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    Object.assign(s.journal.at(-1)!.data, { brevnummer: 5, merking: 'K201-KOE-017-05' });
    const neste = s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(1000),
    });
    expect(neste.data.brevnummer).toBe(6);
    Object.assign(s.journal.at(-1)!.data, { brevnummer: 5, merking: 'K201-KOE-017-05' });
    expect(lesJournal(s.journal, KJERNE.leserformat).every((h) => h.art !== 'ukjent')).toBe(true);
  });

  // G-15 i BF-49 og kravet 11.11 i #807: nummeret avsenderen oppgir, venter på LV-U45.
  it('korrespondanse lagt til med et nummer er ikke forstått, og kontrollsaken uten nummer er det', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', {
      type: 'registrert_brev',
      sendt: '2026-10-02',
      korrespondansetype: 'e_post',
      beskrivelse: 'Referat fra byggemøte',
      dokumentasjon: [randomUUID()],
    });
    const med = (data: Record<string, unknown>) =>
      lesJournal([...s.journal.slice(0, -1), { ...rad, data }], KJERNE.leserformat).at(-1)!.art;
    expect(med(rad.data), 'kontrollsak').toBe('dokument');
    expect(med({ ...rad.data, brevnummer: 7 })).toBe('ukjent');
  });

  it('et brevnummer som ikke er et positivt heltall, er ikke forstått', () => {
    const s = sak();
    const rad = s.send('TE', PAABEROPELSE);
    const med = (brevnummer: unknown) =>
      lesJournal(
        [...s.journal.slice(0, -1), { ...rad, data: { ...rad.data, brevnummer } }],
        KJERNE.leserformat
      ).at(-1)!.art;
    expect(med(1), 'kontrollsak').toBe('dokument');
    expect(med(0)).toBe('ukjent');
    expect(med(1.5)).toBe('ukjent');
  });
});

describe('henvisningen til et tidligere brev (LV-U42, LV-U53, S3 i #1497)', () => {
  /** TEs trekk av vederlagskravet i en sak der det er sendt etter påberopelsen og en e-post. */
  const trekkEtterEpost = (s: ReturnType<typeof sak>) => {
    s.send('TE', PAABEROPELSE);
    // Registrert korrespondanse får ikke noe nummer i saken (LV-U45).
    s.send('TE', {
      type: 'registrert_brev',
      sendt: '2026-10-02',
      korrespondansetype: 'e_post',
      beskrivelse: 'Referat fra byggemøte',
      dokumentasjon: [randomUUID()],
    });
    const krav = s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(1000),
    });
    expect(krav.versjon, 'forutsetning: versjonen er ikke nummeret').toBe(4);
    expect(krav.data.brevnummer).toBe(2);
    return { type: 'trekk', spor: 'vederlag' };
  };

  it('et brev fra løsningen omtales med merkingen og datoen, ikke saksversjonen (LV-U53)', () => {
    const s = sak();
    const trekk = s.send('TE', trekkEtterEpost(s));
    expect(tekst(trekk)[0].laast).toContain(
      'Totalentreprenøren trekker kravet om justering av vederlaget i sak KOE-17 («Endret fundamentering»), fremsatt i brev K201-KOE-017-02 av 4. oktober 2026'
    );
  });

  it('merkingen i henvisningen har sakens kode og tre sifre i løpenummeret, også i en EO-sak (LV-U53, LV-U48)', () => {
    const s = sak(TITTEL, { kode: 'eo', loepenummer: 5 }, 'K7');
    expect(s.vis('TE', trekkEtterEpost(s))?.[0]).toContain(
      'fremsatt i brev K7-EO-005-02 av 4. oktober 2026'
    );
  });

  it('brevmerkingen har tre sifre i løpenummeret og to i brevnummeret (LV-U48)', () => {
    expect(brevmerking('K7', { kode: 'eo', loepenummer: 5 }, 2)).toBe('K7-EO-005-02');
    expect(brevmerking('K201', { kode: 'koe', loepenummer: 1234 }, 103)).toBe('K201-KOE-1234-103');
  });

  it('uten kontraktsforkortelsen kan brevet ikke vise til merkingen, og skrives ikke (LV-U53)', () => {
    const s = sak(TITTEL, KOE_17, null);
    const trekk = trekkEtterEpost(s);
    expect(() => s.vis('TE', trekk)).toThrow(/ingen kontraktsforkortelse/);
  });

  it('henvisningen beholder merkingen fra brevet når kontraktsforkortelsen er endret etterpå (LV-U53, LV-U24)', () => {
    const s = sak();
    const trekk = trekkEtterEpost(s);
    expect(s.journal.at(-1)!.data.merking, 'kravet ble merket da det ble skrevet').toBe(
      'K201-KOE-017-02'
    );
    s.endreForkortelse('K305');
    const sendt = s.send('TE', trekk);
    expect(tekst(sendt)[0].laast).toContain('fremsatt i brev K201-KOE-017-02 av 4. oktober 2026');
    expect(sendt.data.merking, 'det nye brevet merkes med forkortelsen nå').toBe('K305-KOE-017-03');
  });

  it('en merking som ikke slutter med brevnummeret, eller står uten nummeret, er ikke forstått (LV-U53, LV-U48, MM-U2)', () => {
    const s = sak();
    const rad = s.send('TE', PAABEROPELSE);
    expect(rad.data.merking).toBe('K201-KOE-017-01');
    const med = (data: Data) =>
      lesJournal(
        [...s.journal.slice(0, -1), { ...rad, data: { ...rad.data, ...data } }],
        KJERNE.leserformat
      ).at(-1)!.art;
    expect(med({}), 'kontrollsak').toBe('dokument');
    expect(med({ merking: 'K201-KOE-017-02' })).toBe('ukjent');
    expect(med({ brevnummer: undefined })).toBe('ukjent');
  });

  it('en merking med en annen sak enn brevtittelen er ikke forstått (LV-U27, LV-U48, MM-U2, #1588)', () => {
    const s = sak();
    const rad = s.send('TE', PAABEROPELSE);
    expect(rad.data.brevtittel, 'forutsetning: tittelen nevner saken').toMatch(/ i sak KOE-17$/);
    const med = (data: Data) =>
      lesJournal(
        [...s.journal.slice(0, -1), { ...rad, data: { ...rad.data, ...data } }],
        KJERNE.leserformat
      ).at(-1)!.art;
    expect(med({}), 'kontrollsak').toBe('dokument');
    expect(med({ merking: 'K201-EO-005-01' })).toBe('ukjent');
    expect(med({ merking: 'K201-KOE-018-01' })).toBe('ukjent');
    expect(med({ merking: 'K201-EO-017-01' }), 'samme løpenummer, annen kode').toBe('ukjent');
  });

  it.each([
    ['uten forkortelsen og sakens kode', 'X-01'],
    ['med to sifre i løpenummeret', 'K201-KOE-17-01'],
    ['med en annen kode enn KOE og EO', 'K201-ABC-017-01'],
    ['med små bokstaver i forkortelsen', 'k201-KOE-017-01'],
    ['med en null for mye i løpenummeret', 'K201-KOE-0017-01'],
  ])(
    'en merking %s, som ikke har formen fra brevmerkingen, er ikke forstått (LV-U44, LV-U48, MM-U2)',
    (_, merking) => {
      const s = sak();
      const rad = s.send('TE', PAABEROPELSE);
      const med = (data: Data) =>
        lesJournal(
          [...s.journal.slice(0, -1), { ...rad, data: { ...rad.data, ...data } }],
          KJERNE.leserformat
        ).at(-1)!.art;
      expect(med({ merking: 'K201-KOE-017-01' }), 'kontrollsak').toBe('dokument');
      expect(
        med({
          merking: 'K201-KOE-1017-01',
          brevtittel: (rad.data.brevtittel as string).replace('KOE-17', 'KOE-1017'),
        }),
        'kontrollsak med fire sifre, og tittelen med samme sak'
      ).toBe('dokument');
      expect(med({ merking })).toBe('ukjent');
    }
  );

  it('registrert korrespondanse omtales med parten, typen og datoen (LV-U42)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const varselet = (korrespondansetype: string, sendt: string) =>
      s.send('TE', {
        type: 'varsel',
        varsler: [{ hjemmel: '33.4' }],
        sendt,
        korrespondansetype,
        beskrivelse: 'Varsel om fristforlengelse',
        dokumentasjon: [randomUUID()],
      });
    const epost = varselet('e_post', '2026-10-02');
    expect(epost.data.korrespondansetype).toBe('e_post');
    /** Byggherrens svar på fristkravet, som påberoper at varselet kom for sent. */
    const fristsvaret = (t: ReturnType<typeof sak>) => {
      t.send('TE', utenFelt(FRISTKRAV, 'varsel'));
      const brev = {
        type: 'brev',
        svar: [
          svar(
            'frist',
            t.krav('frist'),
            medFristen({ ...FRIST_FULLT[0], frist_varsel_ok: false }),
            {
              resultat: 'avslaatt',
              godkjent_dager: 0,
            }
          ),
        ],
      };
      expect(t.avvisning('BH', brev)).toBeNull();
      return t.vis('BH', brev)?.join('\n');
    };
    expect(fristsvaret(s)).toContain('i totalentreprenørens e-post av 2. oktober 2026');
    // Arbeidsvalget 1 A 16.11 i #807 (LV-U42): møtereferatet med typen, og et notat eller annet
    // dokument som «dokument».
    for (const [korrespondansetype, omtalt] of [
      ['moetereferat', 'møtereferat'],
      ['notat', 'dokument'],
    ]) {
      const t = sak();
      t.send('TE', PAABEROPELSE);
      t.send('TE', {
        type: 'varsel',
        varsler: [{ hjemmel: '33.4' }],
        sendt: '2026-10-02',
        korrespondansetype,
        beskrivelse: 'Varsel om fristforlengelse',
        dokumentasjon: [randomUUID()],
      });
      expect(fristsvaret(t)).toContain(`i totalentreprenørens ${omtalt} av 2. oktober 2026`);
    }
  });

  it('registrert korrespondanse uten typen, og typen i et brev fra løsningen, er ikke forstått (LV-U42)', () => {
    const s = sak();
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'forhold',
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
    });
    expect(s.u().forstaatt).toBe(false);
    const t = sak();
    t.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'forhold',
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
        },
      ],
      ...SOM_BREV,
    });
    expect(t.u().forstaatt).toBe(false);
  });

  it('registreringen må oppgi typen (LV-U42, D1 A i #1497)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(
      s.avvisning('TE', {
        type: 'varsel',
        varsler: [{ hjemmel: '34.1.2' }],
        sendt: '2026-10-02',
        dokumentasjon: [randomUUID()],
      })?.melding
    ).toContain('$.korrespondansetype');
  });

  it('beskrivelsen lagres med registrert korrespondanse med virkning, og står den i et brev fra løsningen, er raden ikke forstått (OV-U79, arbeidsvalget 2 A 16.11 i #807)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', {
      type: 'varsel',
      varsler: [{ hjemmel: '33.4' }],
      sendt: '2026-10-02',
      korrespondansetype: 'e_post',
      beskrivelse: 'Varsel om fristforlengelse for pelingen',
      dokumentasjon: [randomUUID()],
    });
    expect(rad.data.beskrivelse).toBe('Varsel om fristforlengelse for pelingen');
    expect(s.u().forstaatt, 'varselet med beskrivelsen er forstått').toBe(true);
    expect(s.u().spor.frist.varsler['33.4'], 'varselet har virkning').toBeTruthy();
    expect(s.u().registrerteBrev, 'og er ikke dokumentasjon').toEqual([]);
    expect(
      s.avvisning('TE', {
        type: 'varsel',
        varsler: [{ hjemmel: '34.1.2' }],
        sendt: '2026-10-02',
        ...SOM_BREV,
        beskrivelse: '  ',
        dokumentasjon: [randomUUID()],
      })?.melding
    ).toBe('$.beskrivelse: brevet har ingen beskrivelse');
    const fraLoesningen = s.journal[1]!;
    const lestMed = (data: Data) =>
      lesJournal(
        [
          ...s.journal.filter((j) => j.event_id !== fraLoesningen.event_id),
          { ...fraLoesningen, data: { ...fraLoesningen.data, ...data } },
        ],
        KJERNE.leserformat
      ).at(-1)!.art;
    expect(lestMed({}), 'kontrollsak').toBe('dokument');
    expect(lestMed({ beskrivelse: 'Påberopelsen' })).toBe('ukjent');
  });

  it('sendemåten lagres med et registrert brev, og står den ved annen korrespondanse eller et brev fra løsningen, er raden ikke forstått (OV-U79)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const rad = s.send('TE', {
      type: 'varsel',
      varsler: [{ hjemmel: '33.4' }],
      sendt: '2026-10-02',
      ...SOM_BREV,
      sendemaate: 'prosjekthotell',
      dokumentasjon: [randomUUID()],
    });
    expect(rad.data.sendemaate).toBe('prosjekthotell');
    const lestMed = (r: Journalrad, data: Data) =>
      lesJournal(
        [
          ...s.journal.filter((j) => j.event_id !== r.event_id),
          { ...r, data: { ...r.data, ...data } },
        ],
        KJERNE.leserformat
      ).at(-1)!;
    const lest = lestMed(rad, {});
    expect(lest.art === 'dokument' && lest.dokument.sendemaate, 'kontrollsak').toBe(
      'prosjekthotell'
    );
    expect(lestMed(rad, { korrespondansetype: 'e_post' }).art).toBe('ukjent');
    expect(lestMed(rad, { korrespondansetype: 'moetereferat' }).art).toBe('ukjent');
    const fraLoesningen = s.journal[1]!;
    expect(lestMed(fraLoesningen, {}).art, 'kontrollsak').toBe('dokument');
    expect(lestMed(fraLoesningen, { sendemaate: 'post' }).art).toBe('ukjent');
  });
});

describe('hardt mellomrom etter «punkt», «pkt.» og «kl.» (svaret 16.11 i #2049, docs/sprak.md)', () => {
  it('står foran et tall, og ikke foran et ord eller i et lengre ord', () => {
    expect(
      medHardeMellomrom(
        'Punkt 5 og punkt 33.4, Pkt. 34.1.2 og kl. 14.00, Kl. 9.00, men punktene 33.4 og punkt b.'
      )
    ).toBe(
      'Punkt\u00a05 og punkt\u00a033.4, Pkt.\u00a034.1.2 og kl.\u00a014.00, Kl.\u00a09.00, men punktene 33.4 og punkt b.'
    );
  });
});
