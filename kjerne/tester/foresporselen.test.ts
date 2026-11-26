/**
 * Forespørselen og svaret etter § 33.6.2 i brevene.
 * Saken i minnet er `sak()` i `brevsak.ts`.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { lagBrevtekst } from '../frosset/brevtekst.ts';
import { lesJournal, standpunkterISvaret } from '../format/leser.ts';
import type { Dokument, Journalrad } from '../typer.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import { foresporselForFristsvar } from '../spor/frist/utledning.ts';
import { visning } from '../utledning/visning.ts';
import { KJERNE } from '../versjon.ts';
import { SOM_BREV } from './brevet.ts';
import {
  type Data,
  FRISTKRAV,
  FRIST_FULLT,
  I_SAKEN,
  MOT,
  PAABEROPELSE,
  SLUTTFRISTEN_20,
  TITTEL,
  laast,
  sak,
  svar,
  tekst,
  utenFelt,
} from './brevsak.ts';

describe('forespørselen og svaret etter § 33.6.2 (VS-U17, VS-U19, VS-U27, VS-U29, LV-U18)', () => {
  const foresporsel = { type: 'foresporsel', spor: 'frist', hjemmel: '33.6.2' };
  const begrunnelseB = 'Omfanget av omprosjekteringen er ikke kjent ennå.';
  const id = (rad: Journalrad) => (rad.data.utsagn as Data[])[0].id as string;
  const medForesporsel = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const f = s.send('BH', foresporsel);
    return { s, f: id(f), rad: f };
  };
  const medBegrunnelse = () => {
    const { s, f } = medForesporsel();
    const b = s.send('TE', { type: 'foresporselssvar', gjelder: f, utdypning: begrunnelseB });
    return { s, f, b: id(b), rad: b };
  };
  const fristsvar = (s: ReturnType<typeof sak>, vurderinger: Data, resultat: Data) =>
    s.send('BH', { type: 'brev', svar: [svar('frist', s.krav('frist'), vurderinger, resultat)] });

  it('forespørselen har setning 1 i LV-U18, uten dager og uten oppgitt dato', () => {
    const { rad } = medForesporsel();
    expect(laast(rad)).toEqual([
      `Byggherren ber etter NS 8407 punkt\u00a033.6.2 totalentreprenøren angi og begrunne det antall dager totalentreprenøren krever som fristforlengelse som følge av forholdet ${I_SAKEN}. Svarer ikke totalentreprenøren, tapes kravet på fristforlengelse. Har totalentreprenøren ikke grunnlag for å beregne kravet, skal totalentreprenøren i stedet begrunne hvorfor grunnlaget ikke foreligger.`,
    ]);
    expect(rad.data.opplysninger).toBeUndefined();
  });

  describe('forbeholdet når byggherren har innsigelser (LV-U76, LV-U77)', () => {
    const setningenEtterLvU18 = (rad: Journalrad) =>
      laast(rad)[0].split(' Byggherren fastholder')[0];
    const forbeholdet = (rad: Journalrad) =>
      laast(rad)[0].slice(setningenEtterLvU18(rad).length + 1);
    const forholdssvar = (s: ReturnType<typeof sak>, vurderinger: Data) =>
      s.send('BH', { type: 'brev', svar: [svar('forhold', s.krav('forhold'), vurderinger)] });
    const innsigelseMot334 = (s: ReturnType<typeof sak>) => {
      s.send('TE', { type: 'send_varsel', varsler: [{ hjemmel: '33.4' }] });
      s.send('BH', { type: 'innsigelse', gjelder: s.u().spor.frist.varsler['33.4']!.id });
    };

    it('LV-U76: etter en påberopelse etter § 33.4 fastholder forespørselen den prinsipalt, med brevet innsigelsen står i', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      innsigelseMot334(s);
      const rad = s.send('BH', foresporsel);
      expect(forbeholdet(rad)).toBe(
        'Byggherren fastholder prinsipalt at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent, jf. innsigelsen i brev K201-KOE-017-03 av 4. oktober 2026. Forespørselen sendes for det tilfellet at innsigelsen ikke fører frem.'
      );
    });

    it('LV-U77: preklusjonen etter § 32.2, avslaget og påberopelsen etter § 33.4 står i rekkefølgen etter OV-U32', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      forholdssvar(s, { resultat: 'avslaatt', grunnlag_varslet_i_tide: false });
      innsigelseMot334(s);
      const rad = s.send('BH', foresporsel);
      expect(forbeholdet(rad)).toBe(
        [
          'Byggherren fastholder prinsipalt at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent, jf. innsigelsen i brev K201-KOE-017-02 av 3. oktober 2026.',
          'Subsidiært fastholder byggherren avslaget av kravet på endringsordre, jf. svaret i brev K201-KOE-017-02 av 3. oktober 2026.',
          'Videre subsidiært fastholder byggherren at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i brev K201-KOE-017-03 av 4. oktober 2026 kom for sent, jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026.',
          'Forespørselen sendes for det tilfellet at innsigelsene ikke fører frem.',
        ].join(' ')
      );
    });

    it('LV-U77: et avslått forhold står prinsipalt også uten påberopelsen etter § 33.4', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      forholdssvar(s, { resultat: 'avslaatt', grunnlag_varslet_i_tide: true });
      const rad = s.send('BH', foresporsel);
      expect(forbeholdet(rad)).toBe(
        'Byggherren fastholder prinsipalt avslaget av kravet på endringsordre, jf. svaret i brev K201-KOE-017-02 av 3. oktober 2026. Forespørselen sendes for det tilfellet at innsigelsen ikke fører frem.'
      );
    });

    it('LV-U77: byggherrens egen påberopelse etter § 32.2 står prinsipalt, foran påberopelsen etter § 33.4', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('BH', { type: 'innsigelse', gjelder: s.krav('forhold') });
      innsigelseMot334(s);
      const rad = s.send('BH', foresporsel);
      expect(forbeholdet(rad)).toBe(
        [
          'Byggherren fastholder prinsipalt at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent, jf. innsigelsen i brev K201-KOE-017-02 av 3. oktober 2026.',
          'Subsidiært fastholder byggherren at varselet om fristforlengelse etter NS 8407 punkt\u00a033.4 i brev K201-KOE-017-03 av 4. oktober 2026 kom for sent, jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026.',
          'Forespørselen sendes for det tilfellet at innsigelsene ikke fører frem.',
        ].join(' ')
      );
    });

    it('LV-U77: en egen påberopelse etter § 32.2 som svaret på forholdet gjentar, viser til begge brevene i rekkefølgen de ble sendt', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('BH', { type: 'innsigelse', gjelder: s.krav('forhold') });
      forholdssvar(s, { resultat: 'godkjent', grunnlag_varslet_i_tide: false });
      const rad = s.send('BH', foresporsel);
      expect(forbeholdet(rad)).toBe(
        'Byggherren fastholder prinsipalt at totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent, jf. innsigelsene i brev K201-KOE-017-02 av 3. oktober 2026 og brev K201-KOE-017-03 av 4. oktober 2026. Forespørselen sendes for det tilfellet at innsigelsen ikke fører frem.'
      );
    });

    it('LV-U77: preklusjonen etter § 32.2 i svaret på en tidligere påberopelsesversjon står, også når den nye versjonen er ubesvart (arbeidsvalget 15.10 i #500)', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      forholdssvar(s, { resultat: 'avslaatt', grunnlag_varslet_i_tide: false });
      s.send('TE', PAABEROPELSE);
      innsigelseMot334(s);
      const rad = s.send('BH', foresporsel);
      expect(forbeholdet(rad)).toBe(
        [
          'Byggherren fastholder prinsipalt at totalentreprenørens varsel etter NS 8407 punkt 32.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent, jf. innsigelsen i brev K201-KOE-017-02 av 3. oktober 2026.',
          'Subsidiært fastholder byggherren at varselet om fristforlengelse etter NS 8407 punkt 33.4 i brev K201-KOE-017-04 av 5. oktober 2026 kom for sent, jf. innsigelsen i brev K201-KOE-017-05 av 6. oktober 2026.',
          'Forespørselen sendes for det tilfellet at innsigelsene ikke fører frem.',
        ].join(' ')
      );
    });

    it('LV-U49: brevene med varslene forbeholdet sier kom for sent, står under «Deres ref.»', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      forholdssvar(s, { resultat: 'avslaatt', grunnlag_varslet_i_tide: false });
      innsigelseMot334(s);
      expect(s.send('BH', foresporsel).data.deres_ref).toEqual([
        'K201-KOE-017-01',
        'K201-KOE-017-03',
      ]);
      const k = sak();
      k.send('TE', PAABEROPELSE);
      expect(
        k.send('BH', foresporsel).data.deres_ref,
        'kontrollsak: uten innsigelser viser forespørselen ikke til et brev'
      ).toBeUndefined();
    });

    it('LV-U77: et avslag og en preklusjon byggherren har gitt opp i et nytt svar på forholdet, står ikke i forespørselen', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      forholdssvar(s, { resultat: 'avslaatt', grunnlag_varslet_i_tide: false });
      s.send('BH', {
        type: 'revisjon',
        erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
        svar: svar('forhold', s.krav('forhold'), {
          resultat: 'godkjent',
          grunnlag_varslet_i_tide: true,
        }),
      });
      const rad = s.send('BH', foresporsel);
      expect(laast(rad)[0], 'bare setningen etter LV-U18').toBe(setningenEtterLvU18(rad));
      expect(laast(rad)[0]).not.toContain('fastholder');
    });

    it('LV-U77: en egen påberopelse etter § 32.2 som et senere svar på forholdet gir opp, står ikke i forespørselen', () => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      s.send('BH', { type: 'innsigelse', gjelder: s.krav('forhold') });
      forholdssvar(s, { resultat: 'godkjent', grunnlag_varslet_i_tide: true });
      const rad = s.send('BH', foresporsel);
      expect(laast(rad)[0]).not.toContain('fastholder');
    });
  });

  it('VS-U19: forespørselen avvises når TE har krevd dager, og bare BH kan sende den', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(s.avvist('TE', foresporsel)).toBe('FEIL_PART');
    s.send('TE', FRISTKRAV);
    expect(s.avvist('BH', foresporsel)).toBe('FRISTKRAV_SENDT');
  });

  const fristkravLagtTil = {
    krav: [
      { id: 'K-lagt-til', spor: 'frist', frister: [{ id: 'f1', navn: 'Sluttfristen', dager: 20 }] },
    ],
    opplysninger: [{ id: 'O-sendt', hva: 'sendt', dato: '2026-10-01' }],
    ...SOM_BREV,
  };

  it('VS-U88 punkt 3: en forespørsel etter et fristkrav lagt til med kravskjemaet gjør saken uforstått', () => {
    const utsagnet = (() => {
      const k = sak();
      k.send('TE', PAABEROPELSE);
      return (k.send('BH', foresporsel).data.utsagn as Data[])[0];
    })();
    const forstaatt = (medKravet: boolean) => {
      const s = sak();
      s.send('TE', PAABEROPELSE);
      if (medKravet) s.rad('TE', structuredClone(fristkravLagtTil));
      s.rad('BH', { utsagn: [{ ...utsagnet, id: randomUUID() }] });
      return s.u().forstaatt;
    };
    expect(forstaatt(false), 'kontrollsak: forespørselen uten kravet').toBe(true);
    expect(forstaatt(true)).toBe(false);
  });

  /** Fristkravet lagt til med datoen `sendt`, regnet fra dagen forespørselen ble sendt. */
  const fristkravMedDato = (sendt: string) => ({
    ...utenFelt(utenFelt(FRISTKRAV, 'varsel'), 'utdypning'),
    sendt,
    ...SOM_BREV,
    dokumentasjon: [randomUUID()],
  });
  const kravetLagtTil = (sendt: (foresporselen: string) => string) => {
    const { s, f, rad } = medForesporsel();
    const dag = rad.tidsstempel.slice(0, 10);
    const krav = (s.send('TE', fristkravMedDato(sendt(dag))).data.krav as Data[])[0];
    return { s, f, krav, dag };
  };

  it('OV-U109: et fristkrav lagt til, sendt før forespørselen, godtas uten å svare på den, og forespørselen er ikke ubesvart', () => {
    const { s, f, krav, dag } = kravetLagtTil(() => '2026-09-01');
    expect(krav.gjelder, 'HF-U1').toBeUndefined();
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    // Forespørselen er sendt fra løsningen, så dagen er dagen den ble registrert (VS-U8).
    expect(u.spor.frist.foresporsler).toEqual([
      { foresporsel: f, svar: null, medKrav: false, kravFoer: krav.id, sendt: dag },
    ]);
    expect(visning(u, GJELDENDE_REGLER).merknader).toContain('krav_foer_foresporselen');
    expect(visning(u, GJELDENDE_REGLER).spor.frist.betegnelse).not.toBe(
      'spesifisert_krav_etterspurt'
    );
    expect(s.avvist('TE', { type: 'foresporselssvar', gjelder: f, utdypning: begrunnelseB })).toBe(
      'KRAV_FOER_FORESPORSELEN'
    );
    expect(foresporselForFristsvar(u), 'ingen virkning etter § 33.6.2 i et nytt svar').toBeNull();
    // Et nytt krav fra løsningen svarer heller ikke på forespørselen.
    const nytt = (s.send('TE', utenFelt(FRISTKRAV, 'varsel')).data.krav as Data[])[0];
    expect(nytt.gjelder).toBeUndefined();
    expect(s.u().forstaatt).toBe(true);
  });

  it('kontrollsak OV-U109, OV-U104: et fristkrav sendt samme dag som forespørselen svarer på den, og rekkefølgen er ukjent', () => {
    const { s, f, krav } = kravetLagtTil((dag) => dag);
    expect(krav.gjelder).toBe(f);
    const u = s.u();
    expect(u.spor.frist.foresporsler[0].kravFoer).toBeNull();
    expect(u.sendtSammeDag).toEqual([{ element: krav.id, med: f }]);
    expect(visning(u, GJELDENDE_REGLER).merknader).toContain('sendt_samme_dag');
  });

  it('OV-U109, MM-U50 punkt 1: et krav sendt før forespørselen, lagt til etter svaret på kravet som besvarte den, gir ingen virkning etter § 33.6.2 i et svar skrevet etterpå', () => {
    const { s, f } = medForesporsel();
    const besvarte = (s.send('TE', utenFelt(FRISTKRAV, 'varsel')).data.krav as Data[])[0];
    const svaret = fristsvar(
      s,
      { ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'), foresporsel_svar_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    expect(foresporselForFristsvar(s.u()), 'kontrollsak: før kravet er lagt til').toEqual({
      art: 'svar',
      gjelder: besvarte.id,
    });
    const eldre = (s.send('TE', fristkravMedDato('2026-09-01')).data.krav as Data[])[0];
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.spor.frist.kravUtenforRekken.map((k) => k.id)).toEqual([eldre.id]);
    expect(u.spor.frist.foresporsler).toEqual([
      {
        foresporsel: f,
        svar: besvarte.id,
        medKrav: true,
        kravFoer: eldre.id,
        sendt: expect.any(String),
      },
    ]);
    expect(foresporselForFristsvar(u)).toBeNull();
    // Svaret sendt før kravet ble lagt til, står med påberopelsen.
    const svar = (svaret.data.svar as Data[])[0];
    expect(
      (svar.standpunkter as Data[]).some((p) => p.hjemmel === '33.6.2' && p.gjelder === besvarte.id)
    ).toBe(true);
    expect(u.svar[svar.id as string].svar.standpunkter.map((p) => p.art)).toContain('rettidighet');
  });

  it('OV-U111: etter et krav sendt før forespørselen sperrer løsningen ikke påberopelsen etter punkt 33.6.1 mot kravet som svarte på den', () => {
    const paaberopt = { ...FRIST_FULLT[0], spesifisert_krav_ok: false, dager_maatte_forstaa: 20 };
    const brev = (s: ReturnType<typeof sak>, vurderinger: Data) => ({
      type: 'brev',
      svar: [
        svar('frist', s.krav('frist'), vurderinger, { resultat: 'godkjent', godkjent_dager: 20 }),
      ],
    });
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(
      s.avvist('BH', brev(s, { ...paaberopt, foresporsel_svar_ok: true })),
      'kontrollsak: fjerde ledd før det eldre kravet er lagt til'
    ).toBe('UGYLDIG_VURDERING');
    s.send('TE', fristkravMedDato('2026-09-01'));
    expect(s.avvist('BH', brev(s, paaberopt))).toBeNull();
  });

  it('VS-U88 punkt 3: et fristkrav lagt til med kravskjemaet stopper forespørselen fra løsningen', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'frist',
          frister: [{ id: 'f1', navn: 'Sluttfristen', dager: 20 }],
        },
      ],
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-01' }],
      ...SOM_BREV,
    });
    expect(s.avvist('BH', foresporsel)).toBe('FRISTKRAV_SENDT');
  });

  it('VS-U33: et fristkrav fremmet i appen stopper forespørselen (kontrollsak)', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(s.avvist('BH', foresporsel)).toBe('FRISTKRAV_SENDT');
  });

  it('KA-U84: innsigelsen etter § 33.6.2 følger etter innsigelsen etter § 33.4', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      {
        ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'),
        frist_varsel_ok: false,
        foresporsel_svar_ok: false,
      },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
    expect(b.linje).toBe(
      'Byggherrens standpunkt: prinsipalt varselet etter punkt\u00a033.4 kom for sent, subsidiært svaret på forespørselen etter punkt\u00a033.6.2 kom for sent, videre subsidiært fremdriften er hindret av forholdet (punkt\u00a033.1), godkjent med 20 dager for frist Sluttfristen.'
    );
    expect((b.virkninger as Data[]).map((v) => v.lag)).toEqual([1, 2, 3, 3]);
    expect(
      laast(rad)
        .join('\n\n')
        .match(/^(Prinsipalt|Subsidiært|Videre subsidiært).*$/gm)
    ).toEqual([
      'Prinsipalt',
      `Subsidiært, hvis ${MOT.varselet('33.4')} ikke fører frem`,
      `Videre subsidiært, hvis heller ikke ${MOT.forespoerselssvaret} fører frem`,
      `Videre subsidiært, hvis heller ikke ${MOT.forespoerselssvaret} fører frem`,
    ]);
  });

  it('VG-A-01: beslutningslinja sier at svaret på forespørselen etter § 33.6.2 kom for sent, ikke «prekludert» (HF-U11, MM-U23)', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      {
        ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'),
        frist_varsel_ok: true,
        foresporsel_svar_ok: false,
      },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    expect(((rad.data.svar as Data[])[0].beslutningsgrunnlag as Data).linje).toBe(
      'Byggherrens standpunkt: prinsipalt svaret på forespørselen etter punkt\u00a033.6.2 kom for sent, subsidiært fremdriften er hindret av forholdet (punkt\u00a033.1), godkjent med 20 dager for frist Sluttfristen.'
    );
  });

  it('KA-U86: etter innsigelsen etter § 33.6.2 alene er også en bekreftet hindring subsidiær', () => {
    const vurdering = { ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'), frist_varsel_ok: true };
    const lagene = (iTide: boolean) => {
      const { s } = medForesporsel();
      s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
      const rad = fristsvar(
        s,
        { ...vurdering, foresporsel_svar_ok: iTide },
        iTide
          ? { resultat: 'godkjent', godkjent_dager: 20 }
          : { resultat: 'avslaatt', godkjent_dager: 0 }
      );
      const b = (rad.data.svar as Data[])[0].beslutningsgrunnlag as Data;
      return (b.virkninger as Data[]).map((v) => v.lag);
    };
    // Innsigelsen etter § 33.6.2, hindringen og dagene.
    expect(lagene(false)).toEqual([1, 2, 2]);
    // Kontrollsak: svaret på forespørselen kom i tide, og hindringen står uten vilkår.
    expect(lagene(true)).toEqual([1]);
  });

  it('et svar som gjør gjeldende at svaret på forespørselen etter § 33.6.2 kom for sent, godtas uten begrunnelse (KA-U46 punkt 1, VS-U17)', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const vurdert = (vurderinger: Data) => ({
      ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'),
      ...vurderinger,
    });
    const resultat = { resultat: 'avslaatt', godkjent_dager: 0 };
    const brevet = (vurderinger: Data) => ({
      type: 'brev',
      svar: [svar('frist', s.krav('frist'), vurdert(vurderinger), resultat, null)],
    });
    expect(
      s.avvisning('BH', brevet({ frist_varsel_ok: true, foresporsel_svar_ok: false }))
    ).toBeNull();
    expect(
      s.avvisning(
        'BH',
        brevet({ frist_varsel_ok: false, foresporsel_svar_ok: false, vilkar_oppfylt: false })
      )
    ).toBeNull();
  });

  it('VG-A-01: en beslutningslinje frosset før #1302 leses med den gamle ordlyden (MM-U9)', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      {
        ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'),
        frist_varsel_ok: false,
        foresporsel_svar_ok: true,
      },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    // Linja slik kjernen frøs den før #1302. Kjernen regner den ikke ut på nytt.
    const gammel =
      'Byggherrens standpunkt: prinsipalt prekludert (§ 33.4), subsidiært godkjent med 20 dager.';
    ((rad.data.svar as Data[])[0].beslutningsgrunnlag as Data).linje = gammel;
    const lest = lesJournal(s.journal, KJERNE.leserformat).find((h) => h.id === rad.event_id)!;
    expect(lest.art === 'dokument' && lest.dokument.svar![0].beslutningsgrunnlag.linje).toBe(
      gammel
    );
    expect(s.u().spor.frist.gjeldendeSvar!.beslutningsgrunnlag.linje).toBe(gammel);
  });

  it('kravet som svarer på forespørselen, sier det (LV-U18 setning 3), og § 33.6.1 kan ikke påberopes (fjerde ledd)', () => {
    const { s } = medForesporsel();
    const krav = s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(laast(krav)).toEqual([
      'Kravet er svar på byggherrens forespørsel etter NS 8407 punkt\u00a033.6.2 i brev K201-KOE-017-02 av 3. oktober 2026.',
      ...SLUTTFRISTEN_20,
    ]);
    const kravId = s.krav('frist');
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [
          svar(
            'frist',
            kravId,
            {
              ...FRIST_FULLT[0],
              foresporsel_svar_ok: true,
              spesifisert_krav_ok: false,
              dager_maatte_forstaa: 0,
            },
            { resultat: 'godkjent', godkjent_dager: 20 }
          ),
        ],
      })
    ).toBe('UGYLDIG_VURDERING');
  });

  it('VS-U17: «svaret kom for sent» etter § 33.6.2 tredje ledd avslår kravet prinsipalt, med teksten i setning 4', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const kravId = s.krav('frist');
    const rad = fristsvar(
      s,
      { ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'), foresporsel_svar_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    const standpunkter = (rad.data.svar as Data[])[0].standpunkter as Data[];
    expect(standpunkter.find((p) => p.hjemmel === '33.6.2')).toMatchObject({
      art: 'rettidighet',
      gjelder: kravId,
      i_tide: false,
    });
    expect(laast(rad).join('\n\n')).toContain(
      '2. Svaret på forespørselen (punkt\u00a033.6.2)\n\nPrinsipalt\n\nByggherren gjør gjeldende at totalentreprenørens svar på forespørselen etter punkt\u00a033.6.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
    );
    expect((rad.data.svar as Data[])[0].utregning).toMatchObject({
      frister: [{ resultat: 'avslaatt' }],
    });
  });

  it('VS-U24: rettidigheten etter § 33.6.2 foran rettidigheten etter § 33.4 er ikke forstått', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      { ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'), foresporsel_svar_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    const svar = (rad.data.svar as Data[])[0];
    const standpunkter = svar.standpunkter as Data[];
    expect(
      standpunkter.filter((p) => p.art === 'rettidighet').map((p) => p.hjemmel),
      'kontrollsak: begge hjemlene står, § 33.4 først'
    ).toEqual(['33.4', '33.6.2']);
    expect(() => standpunkterISvaret('frist', svar)).not.toThrow();
    const ombyttet = [standpunkter[1], standpunkter[0], ...standpunkter.slice(2)];
    expect(() => standpunkterISvaret('frist', { ...svar, standpunkter: ombyttet })).toThrow(
      /bare § 33.4 og deretter § 33.6.2 er lov/
    );
  });

  it('begrunnelsen etter annet ledd b har setning 2 i LV-U18 og TEs tekst som utdypning', () => {
    const { rad, b } = medBegrunnelse();
    expect(tekst(rad)).toEqual([
      {
        gjelder: b,
        laast:
          'Totalentreprenøren svarer på byggherrens forespørsel etter NS 8407 punkt\u00a033.6.2 i brev K201-KOE-017-02 av 3. oktober 2026 at grunnlaget for å beregne kravet ikke foreligger (punkt\u00a033.6.2 annet ledd b).',
        utdypning: begrunnelseB,
      },
    ]);
  });

  it('KA-U1, VS-U27: én begrunnelse per forespørsel fra appen, bare fra TE', () => {
    const { s, f } = medForesporsel();
    const kommando = { type: 'foresporselssvar', gjelder: f, utdypning: begrunnelseB };
    expect(s.avvist('BH', kommando)).toBe('FEIL_PART');
    s.send('TE', kommando);
    expect(s.avvist('TE', kommando)).toBe('FORESPORSEL_BESVART');
    expect(s.avvist('TE', { ...kommando, gjelder: randomUUID() })).toBe('INGEN_FORESPORSEL');
  });

  it('et krav etter begrunnelsen svarer ikke på forespørselen, og § 33.6.1 gjelder (femte ledd)', () => {
    const { s } = medBegrunnelse();
    const krav = s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(laast(krav)).toEqual(SLUTTFRISTEN_20);
    // Uten innsigelse mot begrunnelsen er det ingen påberopelse etter § 33.6.2 å gjenta (VS-U29).
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [
          svar(
            'frist',
            s.krav('frist'),
            { ...FRIST_FULLT[0], foresporsel_svar_ok: false },
            FRIST_FULLT[1]
          ),
        ],
      })
    ).toBe('UGYLDIG_VURDERING');
  });

  it('VS-U29: innsigelsen mot begrunnelsen er en påberopelse etter § 33.6.2, som svaret på kravet gjentar', () => {
    const { s, b } = medBegrunnelse();
    const innsigelse = s.send('BH', { type: 'innsigelse', gjelder: b });
    expect(laast(innsigelse)).toEqual([
      'Byggherren gjør gjeldende at totalentreprenørens svar i brev K201-KOE-017-03 av 4. oktober 2026 på forespørselen etter NS 8407 punkt\u00a033.6.2 kom for sent (NS 8407 punkt\u00a05 tredje ledd).',
    ]);
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      { ...FRIST_FULLT[0], foresporsel_svar_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    const p = ((rad.data.svar as Data[])[0].standpunkter as Data[]).find(
      (x) => x.hjemmel === '33.6.2'
    );
    expect(p).toMatchObject({ gjelder: b, i_tide: false });
    expect(laast(rad).join('\n\n')).toContain(
      'Byggherren gjør gjeldende at totalentreprenørens svar på forespørselen etter punkt\u00a033.6.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent, jf. innsigelsen i brev K201-KOE-017-04 av 5. oktober 2026.'
    );
  });

  it('standpunktet etter § 33.6.2 gir TEs brev med begrunnelsen under Deres ref., men ikke forespørselen (LV-U49, D-1 i BF-07, arbeidsvalget A i #1497)', () => {
    const { s, b } = medBegrunnelse();
    s.send('BH', { type: 'innsigelse', gjelder: b });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      { ...FRIST_FULLT[0], foresporsel_svar_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    expect(rad.data.deres_ref).toEqual(['K201-KOE-017-03', 'K201-KOE-017-05']);
  });

  it('etter «i tide» etter § 33.6.2 godtas en senere innsigelse mot begrunnelsen (MM-U34 punkt 6, HF-U4)', () => {
    const { s, b } = medBegrunnelse();
    s.send('BH', { type: 'innsigelse', gjelder: b });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    // Delvis godkjent, så svaret ikke gir registrert enighet ved sammenfall (GR-U7).
    const rad = fristsvar(
      s,
      { ...FRIST_FULLT[0], dager: 10, foresporsel_svar_ok: true },
      { resultat: 'delvis_godkjent', godkjent_dager: 10 }
    );
    expect(laast(rad).join('\n\n')).toContain(
      'Byggherren gir opp innsigelsen etter NS 8407 punkt\u00a05 i brev K201-KOE-017-04 av 5. oktober 2026 og gjør ikke gjeldende at totalentreprenørens svar på forespørselen etter punkt\u00a033.6.2 i brev K201-KOE-017-02 av 3. oktober 2026 kom for sent.'
    );
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: b })).toBeNull();
  });

  it('HF-U4, VS-U29: etter «i tide» etter § 33.6.2 gir svaret på en senere kravversjon ikke opp innsigelsen mot begrunnelsen på nytt', () => {
    const { s, b } = medBegrunnelse();
    s.send('BH', { type: 'innsigelse', gjelder: b });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    // Delvis godkjent, så svaret ikke gir enighet og kravet kan endres (GR-U10).
    const delvis = [
      { ...FRIST_FULLT[0], dager: 10, foresporsel_svar_ok: true },
      { resultat: 'delvis_godkjent', godkjent_dager: 10 },
    ] as const;
    const foerste = fristsvar(s, ...delvis);
    expect(laast(foerste).join('\n\n'), 'kontrollsak: det første svaret').toContain(
      'gir opp innsigelsen'
    );
    s.send('TE', {
      type: 'krav',
      spor: 'frist',
      innhold: { frister: [{ navn: 'Sluttfristen', dager: 25 }] },
      utdypning: 'Mer.',
    });
    expect(laast(fristsvar(s, ...delvis)).join('\n\n')).not.toContain('innsigelsen');
  });

  it('VS-U29, VS-U11: etter en innsigelse mot begrunnelsen må svaret på kravet gjenta den eller gi den opp', () => {
    const { s, b } = medBegrunnelse();
    s.send('BH', { type: 'innsigelse', gjelder: b });
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
      })
    ).toBe('UGYLDIG_VURDERING');
  });

  it('VS-U31: en ny forespørsel fra appen avvises når saken alt har en, også før TE har svart', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    expect(s.avvist('BH', foresporsel), 'kontrollsak: ingen forespørsel').toBeNull();
    const { s: medF } = medForesporsel();
    expect(medF.avvist('BH', foresporsel)).toBe('FORESPORSEL_SENDT');
  });

  it('VS-U31: en lest rad med en andre forespørsel gjør saken ikke forstått', () => {
    const andre = { utsagn: [{ id: randomUUID(), art: 'foresporsel', hjemmel: '33.6.2' }] };
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.rad('BH', andre);
    expect(s.u().forstaatt, 'kontrollsak: én forespørsel').toBe(true);
    const { s: medF } = medForesporsel();
    medF.rad('BH', andre);
    const u = medF.u();
    expect(u.forstaatt).toBe(false);
    expect(u.begrensninger.map((b) => b.grunn)).toContain(
      'saken har alt en forespørsel etter punkt 33.6.2 sendt herfra'
    );
  });

  it('HF-U1, LV-U18 punkt 3, LV-U49: kravet sendt mens forespørselen er ubesvart, viser til den i `gjelder` og har brevet i Deres ref.', () => {
    const { s, f } = medForesporsel();
    const krav = (s.send('TE', utenFelt(FRISTKRAV, 'varsel')).data.krav as Data[])[0];
    expect(krav.gjelder).toBe(f);
    expect(s.u().spor.frist.foresporsler).toEqual([
      { foresporsel: f, svar: krav.id, medKrav: true, kravFoer: null, sendt: expect.any(String) },
    ]);
    expect(s.journal.at(-1)!.data.deres_ref).toEqual(['K201-KOE-017-02']);
    // VS-U17: etter begrunnelsen er kravet ikke svaret på forespørselen.
    const { s: medB } = medBegrunnelse();
    const senere = (medB.send('TE', utenFelt(FRISTKRAV, 'varsel')).data.krav as Data[])[0];
    expect(senere.gjelder).toBeUndefined();
  });

  it('HF-U1: en lest rad med et fristkrav uten henvisning til den ubesvarte forespørselen gjør saken ikke forstått', () => {
    const krav = (gjelder?: string) => ({
      krav: [
        {
          id: randomUUID(),
          spor: 'frist',
          frister: [{ id: 'f1', navn: 'Sluttfristen', dager: 20 }],
          ...(gjelder ? { gjelder } : {}),
        },
      ],
    });
    const { s: kontroll, f } = medForesporsel();
    kontroll.rad('TE', krav(f));
    expect(kontroll.u().forstaatt, 'kontrollsak: kravet viser til forespørselen').toBe(true);
    const { s } = medForesporsel();
    s.rad('TE', krav());
    expect(s.u().forstaatt).toBe(false);
    expect(s.u().begrensninger.map((b) => b.grunn)).toContain(
      'fristkravet viser ikke til forespørselen etter punkt 33.6.2 det svarer på'
    );
  });

  it('HF-U1: en lest rad med et fristkrav som viser til noe annet enn en ubesvart forespørsel, gjør saken ikke forstått', () => {
    const krav = (gjelder: string) => ({
      krav: [
        {
          id: randomUUID(),
          spor: 'frist',
          frister: [{ id: 'f1', navn: 'Sluttfristen', dager: 20 }],
          gjelder,
        },
      ],
    });
    const { s: annet } = medForesporsel();
    annet.rad('TE', krav(annet.krav('forhold')));
    expect(annet.u().begrensninger.map((b) => b.grunn)).toContain(
      'fristkravet viser ikke til en forespørsel etter punkt 33.6.2 før kravet'
    );
    const { s: besvart, f } = medBegrunnelse();
    besvart.rad('TE', krav(f));
    expect(besvart.u().begrensninger.map((b) => b.grunn)).toContain(
      'fristkravet viser til en forespørsel etter punkt 33.6.2 som alt er besvart'
    );
  });

  it('VS-U30: etter TEs begrunnelse avvises en ny forespørsel fra appen', () => {
    const { s } = medForesporsel();
    expect(s.avvist('BH', foresporsel), 'kontrollsak: før begrunnelsen').toBe('FORESPORSEL_SENDT');
    const { s: medB } = medBegrunnelse();
    expect(medB.avvist('BH', foresporsel)).toBe('FORESPORSEL_BEGRUNNET');
  });

  it('meldingene som stopper forespørselen, sier påberopelsen og skriver partene fullt ut (språkfila, #1953, #1955)', () => {
    const uten = sak();
    expect(uten.avvisning('BH', foresporsel)).toEqual({
      regel: 'PAABEROPELSE_IKKE_SENDT',
      melding: 'Påberopelsen må være sendt før du kan sende forespørselen.',
    });
    // VS-U34, C1 i #2056: varselet fra kravskjemaet skrives først, så avvisningen er varselets.
    expect(uten.avvisning('TE', FRISTKRAV)).toEqual({
      regel: 'PAABEROPELSE_IKKE_SENDT',
      melding: 'Varselet etter punkt 33.4: Påberopelsen må være sendt før du kan varsle.',
    });
    expect(uten.avvisning('TE', utenFelt(FRISTKRAV, 'varsel'))).toEqual({
      regel: 'PAABEROPELSE_IKKE_SENDT',
      melding: 'Påberopelsen må være sendt før du kan sende krav.',
    });
    const { s } = medForesporsel();
    expect(s.avvisning('TE', foresporsel)).toEqual({
      regel: 'FEIL_PART',
      melding: 'Bare byggherren kan gjøre dette.',
    });
    expect(s.avvisning('BH', foresporsel)).toEqual({
      regel: 'FORESPORSEL_SENDT',
      melding:
        'Forespørselen etter punkt 33.6.2 er alt sendt herfra. En ny forespørsel sendes på annen måte.',
    });
    const { s: medB } = medBegrunnelse();
    expect(medB.avvisning('BH', foresporsel)).toEqual({
      regel: 'FORESPORSEL_BEGRUNNET',
      melding:
        'Totalentreprenøren har svart på en forespørsel med en begrunnelse etter punkt 33.6.2 annet ledd b, så en ny forespørsel kan ikke sendes herfra.',
    });
    const medKrav = sak();
    medKrav.send('TE', PAABEROPELSE);
    medKrav.send('TE', FRISTKRAV);
    expect(medKrav.avvisning('BH', foresporsel)).toEqual({
      regel: 'FRISTKRAV_SENDT',
      melding:
        'Totalentreprenøren har krevd dager her, så forespørselen etter punkt 33.6.2 kan ikke sendes.',
    });
  });

  it('LV-U20: protesten mot påberopelsen etter § 33.6.2 sier at den gjelder TEs svar på forespørselen', () => {
    const { s } = medForesporsel();
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    const rad = fristsvar(
      s,
      { ...utenFelt(FRIST_FULLT[0], 'spesifisert_krav_ok'), foresporsel_svar_ok: false },
      { resultat: 'avslaatt', godkjent_dager: 0 }
    );
    const standpunkter = (rad.data.svar as Data[])[0].standpunkter as Data[];
    const id = (hjemmel: string) => standpunkter.find((p) => p.hjemmel === hjemmel)!.id as string;
    const protest = (gjelder: string): Dokument => ({
      id: 'protesten',
      avsender: 'TE',
      lagtTilAv: 'TE',
      registrert: '2026-10-07T10:00:00Z',
      opplysninger: [],
      dokumentasjon: [],
      krav: [],
      svar: [],
      utsagn: [{ id: 'p', art: 'protest', gjelder }],
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
    const tekst = (gjelder: string) =>
      lagBrevtekst(protest(gjelder), s.u().journal, saken, KJERNE.regler)[0].laast;
    expect(tekst(id('33.6.2'))).toBe(
      'Totalentreprenøren protesterer mot påberopelsen av at totalentreprenørens svar på forespørselen etter NS 8407 punkt\u00a033.6.2 kom for sent i svaret i brev K201-KOE-017-04 av 5. oktober 2026.'
    );
    expect(tekst(id('33.4')), 'kontrollsak: § 33.4 har dagens tekst').toBe(
      'Totalentreprenøren protesterer mot påberopelsen av for sen varsling i svaret i brev K201-KOE-017-04 av 5. oktober 2026.'
    );
  });

  it('VS-U29: «ikke et svar etter annet ledd» registreres uten virkning, og gjelder bare begrunnelsen', () => {
    const { s, b } = medBegrunnelse();
    const rad = s.send('BH', { type: 'innsigelse', gjelder: b, grunn: 'ikke_svar' });
    expect(laast(rad)).toEqual([
      'Byggherren gjør gjeldende at totalentreprenørens svar i brev K201-KOE-017-03 av 4. oktober 2026 på forespørselen etter NS 8407 punkt\u00a033.6.2 ikke er et svar etter punkt\u00a033.6.2 annet ledd.',
    ]);
    // Ingen påberopelse etter § 33.6.2 å gjenta i svaret på kravet.
    s.send('TE', utenFelt(FRISTKRAV, 'varsel'));
    expect(
      s.avvist('BH', {
        type: 'brev',
        svar: [
          svar(
            'frist',
            s.krav('frist'),
            { ...FRIST_FULLT[0], foresporsel_svar_ok: false },
            FRIST_FULLT[1]
          ),
        ],
      })
    ).toBe('UGYLDIG_VURDERING');
    const forhold = s.krav('forhold');
    expect(s.avvist('BH', { type: 'innsigelse', gjelder: forhold, grunn: 'ikke_svar' })).toBe(
      'UGYLDIG_INNSIGELSE'
    );
  });
});
