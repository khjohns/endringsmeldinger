/**
 * Nye versjoner av kravet og svaret: et «i tide» fra appen, en ny påberopelsesversjon,
 * frafallet, revisjonen og senkningen, det som foreligger i et lukket spor og den registrerte
 * enigheten.
 * Saken i minnet er `sak()` i `brevsak.ts`.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { regnUtSvar } from '../frosset/utregning.ts';
import { innholdIFristen } from '../spor/frist/format.ts';
import { P1, medKravpostIder, medP1, medP1IkkeAkseptert } from './klient.ts';
import { KRAVSPOR } from '../typer.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import {
  enighetensVirkning,
  kraveneErAvgjort,
  standpunktetErSubsidiaert,
  svarIkkeGodtatt,
  venterPaaSvar,
} from '../utledning/utled.ts';
import { kanInngaaIEo } from '../spor/forhold/utledning.ts';
import { harIkkeVurdertBrev, visning } from '../utledning/visning.ts';
import { KJERNE } from '../versjon.ts';
import { SOM_BREV } from './brevet.ts';
import {
  type Data,
  FRIST_FULLT,
  KLAR_OVER,
  MOT,
  MOTTATT,
  PAABEROPELSE,
  VEDERLAG_DELVIS,
  dagenEtterSisteRad,
  gjeldendeKrav,
  kr,
  laast,
  medFristen,
  p1I,
  sak,
  sakMedKrav,
  svar,
  tilbud,
} from './brevsak.ts';

/**
 * MM-U34 punkt 6 opphever sperren i HF-U4: etter at byggherren har sagt i et svar fra appen
 * at varselet eller spesifiseringen kom i tide, godtas en senere påberopelse av at det kom
 * for sent, i en revisjon og i svaret på en senere versjon. Løsningen avgjør ikke om
 * byggherren er bundet av det tidligere standpunktet (MM-U12 (opphevet av MM-U50)).
 */
describe('et «i tide» fra appen sperrer ikke en senere påberopelse (MM-U34 punkt 6, HF-U4, #498)', () => {
  type Sak = ReturnType<typeof sak>;
  type Sporet = 'forhold' | 'vederlag' | 'frist';

  /** Svaret med serverens utregning, så bare påberopelsen kan gi en avvisning. */
  const utregnet = (s: Sak, spor: Sporet, v: Data) => {
    const u = s.u();
    const krav = gjeldendeKrav(u, spor);
    v = medKravpostIder(v, krav);
    return svar(
      spor,
      krav.id,
      v,
      regnUtSvar(
        spor,
        medFristen(v),
        { krav, paaberopelse: u.spor.forhold.gjeldendeKrav },
        KJERNE.regler
      )
    );
  };
  const brev = (s: Sak, spor: Sporet, v: Data) =>
    s.send('BH', { type: 'brev', svar: [utregnet(s, spor, v)] });
  const revisjon = (s: Sak, spor: Sporet, v: Data) => ({
    type: 'revisjon',
    erstatter: s.u().spor[spor].gjeldendeSvar!.id,
    svar: utregnet(s, spor, v),
  });
  const nyttSvar = (s: Sak, spor: Sporet, v: Data) => ({
    type: 'brev',
    svar: [utregnet(s, spor, v)],
  });
  const nyPaaberopelsesversjon = (s: Sak) =>
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold },
    });

  /** Delvis godkjent, så svaret ikke gir enighet ved sammenfall (GR-U10). */
  const iTide = {
    frist_varsel_ok: true,
    spesifisert_krav_ok: true,
    vilkar_oppfylt: true,
    dager: 10,
  };
  const forSent334 = { ...iTide, frist_varsel_ok: false };
  const forSent3361 = { ...iTide, spesifisert_krav_ok: false, dager_maatte_forstaa: 5 };
  const avslaatt = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const forSenPaaberopelse = { ...avslaatt, grunnlag_varslet_i_tide: false };
  const delvis = {
    ...P1({ vurdering: 'delvis', godkjent_beloep: 100000, aksepterer: true }),
  };
  const sakISvikt = () => {
    const s = sak();
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: {
        hovedkategori: 'svikt',
        underkategori: 'grunnforhold',
        ...KLAR_OVER,
      },
    });
    s.send('TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: tilbud(125000),
    });
    return s;
  };
  /** Det første fristkravet med varselet etter § 33.4 registrert etter svaret med «i tide». */
  const medVarselRegistrertEtterSvaret = () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', {
      type: 'krav',
      spor: 'frist',
      innhold: { frister: [{ navn: 'Sluttfristen', dager: 20 }] },
      utdypning: 'Fire uker.',
    });
    brev(s, 'frist', iTide);
    s.send('TE', {
      type: 'varsel',
      ...SOM_BREV,
      varsler: [{ hjemmel: '33.4' }],
      sendt: '2026-09-28',
      dokumentasjon: [randomUUID()],
    });
    expect(s.u().spor.frist.varsler['33.4'], 'forutsetning: varselet er registrert').toBeDefined();
    return s;
  };

  it.each<[string, () => { s: Sak; kommando: Data }]>([
    [
      '§ 33.4 i en revisjon',
      () => {
        const s = sakMedKrav();
        brev(s, 'frist', iTide);
        return { s, kommando: revisjon(s, 'frist', forSent334) };
      },
    ],
    [
      '§ 33.4 i svaret på en senere kravversjon',
      () => {
        const s = sakMedKrav();
        brev(s, 'frist', iTide);
        s.send('TE', {
          type: 'krav',
          spor: 'frist',
          innhold: { frister: [{ navn: 'Sluttfristen', dager: 25 }] },
          utdypning: 'Mer.',
        });
        return { s, kommando: nyttSvar(s, 'frist', forSent334) };
      },
    ],
    [
      '§ 33.4 i en revisjon etter en ny grunnlagsversjon',
      () => {
        const s = sakMedKrav();
        brev(s, 'frist', iTide);
        nyPaaberopelsesversjon(s);
        return { s, kommando: revisjon(s, 'frist', forSent334) };
      },
    ],
    [
      '§ 33.4 når TE har registrert et tidligere sendt varsel etter svaret (oppdragsgiver 15.10, #498)',
      () => {
        const s = medVarselRegistrertEtterSvaret();
        return { s, kommando: revisjon(s, 'frist', forSent334) };
      },
    ],
    [
      '§ 33.6.1 i en revisjon',
      () => {
        const s = sakMedKrav();
        brev(s, 'frist', iTide);
        return { s, kommando: revisjon(s, 'frist', forSent3361) };
      },
    ],
    [
      '§ 32.2 i en revisjon',
      () => {
        const s = sakMedKrav();
        brev(s, 'forhold', avslaatt);
        return { s, kommando: revisjon(s, 'forhold', forSenPaaberopelse) };
      },
    ],
    [
      '§ 32.2 i svaret på en senere grunnlagsversjon med samme hjemmel (HF-U8, GR-U22)',
      () => {
        const s = sakMedKrav();
        brev(s, 'forhold', avslaatt);
        nyPaaberopelsesversjon(s);
        return { s, kommando: nyttSvar(s, 'forhold', forSenPaaberopelse) };
      },
    ],
    [
      '§ 34.1.2 i en revisjon',
      () => {
        const s = sakISvikt();
        brev(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: true });
        return {
          s,
          kommando: revisjon(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: false }),
        };
      },
    ],
  ])(
    'etter «i tide» godtas en påberopelse etter %s, og saken er forstått (MM-U34 punkt\u00a06, HF-U4)',
    (_n, forloep) => {
      const { s, kommando } = forloep();
      expect(s.avvist('BH', kommando)).toBeNull();
      s.send('BH', kommando);
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    }
  );

  it('en revisjon som påberoper «for sent» etter § 32.2 etter «i tide», godtas og leses som påberopelse: forholdet er ikke lenger avklart (MM-U34 punkt 6, HF-U4, GR-U7)', () => {
    const s = sakMedKrav();
    const godkjent = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };
    brev(s, 'forhold', godkjent);
    expect(s.u().forholdAvklart, 'kontrollsak: godkjent uten påberopelse').toBe(true);
    const paaberopelse = revisjon(s, 'forhold', { ...godkjent, grunnlag_varslet_i_tide: false });
    expect(s.avvist('BH', paaberopelse)).toBeNull();
    const rad = s.send('BH', paaberopelse);
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(
      u.spor.forhold.gjeldendeSvar!.standpunkter.find((x) => x.art === 'rettidighet')
    ).toMatchObject({ hjemmel: '32.2', iTide: false });
    expect(laast(rad)[1]).toContain(
      'totalentreprenørens varsel etter NS 8407 punkt\u00a032.2 i brev K201-KOE-017-01 av 2. oktober 2026 kom for sent'
    );
    expect(u.forholdAvklart, 'påberopelsen er virksom, så godkjenningen er subsidiær').toBe(false);
  });

  it('en revisjon som påberoper «for sent» etter § 34.1.2 etter «i tide», godtas og leses som påberopelse av feltet for § 34.1.2 (MM-U34 punkt 6, HF-U4)', () => {
    const s = sakISvikt();
    brev(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: true });
    const rettidighet = () =>
      s.u().spor.vederlag.gjeldendeSvar!.standpunkter.find((x) => x.art === 'rettidighet');
    expect(rettidighet(), 'kontrollsak: «i tide»').toMatchObject({
      hjemmel: '34.1.2',
      iTide: true,
    });
    const paaberopelse = revisjon(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: false });
    expect(s.avvist('BH', paaberopelse)).toBeNull();
    s.send('BH', paaberopelse);
    expect(s.u().forstaatt).toBe(true);
    expect(rettidighet()).toMatchObject({ hjemmel: '34.1.2', iTide: false });
  });

  it('et registrert svar med «i tide», sendt før fristkravet, får ingen virkning, og byggherren kan svare «for sent» fra appen (OV-U98)', () => {
    const s = sakMedKrav();
    const u = s.u();
    expect(u.spor.frist.varsler['33.4'], 'forutsetning: varselet fra kravskjemaet').toBeDefined();
    const fristId = (u.spor.frist.gjeldendeKrav!.innhold.frister as Data[])[0].id;
    const svarId = randomUUID();
    s.rad('BH', {
      svar: [
        {
          id: svarId,
          spor: 'frist',
          gjelder: s.krav('frist'),
          paaberopelse: u.spor.forhold.gjeldendeKrav!.id,
          standpunkter: [
            {
              id: randomUUID(),
              art: 'rettidighet',
              gjelder: u.spor.frist.varsler['33.4']!.id,
              hjemmel: '33.4',
              i_tide: true,
            },
            { id: randomUUID(), art: 'dager', gjelder: fristId },
          ],
          utregning: {
            frister: [
              {
                gjelder: fristId,
                resultat: 'delvis_godkjent',
                godkjent_dager: 10,
                lag: [{ lag: 1, dager: 10 }],
              },
            ],
          },
        },
      ],
      // Fristkravet er sendt 04.10, så det var ikke gjeldende på sendedatoen.
      opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-09-30' }],
      ...SOM_BREV,
    });
    const etter = s.u();
    expect(etter.forstaatt, JSON.stringify(etter.begrensninger)).toBe(true);
    expect(etter.utenVirkning.map((x) => x.element)).toContain(svarId);
    expect(etter.spor.frist.gjeldendeSvar).toBeNull();
    expect(s.avvist('BH', nyttSvar(s, 'frist', forSent334))).toBeNull();
  });

  it('«for sent» etter § 32.2 på en registrert versjon i svikt avvises av utregningen (#520, GR-U11, MM-U43 punkt 8)', () => {
    const s = sakMedKrav();
    brev(s, 'forhold', avslaatt);
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'forhold',
          erstatter: s.krav('forhold'),
          hovedkategori: 'svikt',
          underkategori: 'grunnforhold',
        },
      ],
    });
    const uten = { resultat: 'avslaatt' };
    expect(s.avvist('BH', nyttSvar(s, 'forhold', uten)), 'kontrollsak').toBeNull();
    const { resultat } = utregnet(s, 'forhold', uten);
    const medFelt = svar('forhold', s.krav('forhold'), forSenPaaberopelse, resultat as Data);
    expect(s.avvist('BH', { type: 'brev', svar: [medFelt] })).toBe('UGYLDIG_VURDERING');
  });
});

/**
 * GR-U22: når forholdet er sendt, står hovedkategorien og underkategorien, også når § 32.2
 * gjelder likt. En ny versjon med samme hjemmel er tillatt (GR-U1), og endringsordrens dato
 * eller nummer kan rettes (GR-U16, arbeidsvalg 2 i kartleggingen 16.10 på #569).
 */
describe('en ny påberopelsesversjon beholder hjemmelen (GR-U22)', () => {
  const versjon = (innhold: Data) => ({
    ...PAABEROPELSE,
    innhold,
  });
  const endringsordre = {
    hovedkategori: 'endring',
    underkategori: 'endringsordre',
    endringsordre: 'EO-1',
  };
  const svikt = { hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER };

  it.each([
    ['irregulær endring til svikt', null, svikt, 'ANNEN_HJEMMEL'],
    // #551: § 32.2 gjelder ingen av versjonene, så bare hovedkategorien skiller dem.
    [
      'svikt til andre forhold',
      svikt,
      { hovedkategori: 'andre_forhold', underkategori: 'skade_fra_byggherren', ...KLAR_OVER },
      'ANNEN_HJEMMEL',
    ],
    [
      'grunnforhold til medvirkning, i samme hovedkategori',
      svikt,
      { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
      'ANNEN_HJEMMEL',
    ],
    ['irregulær endring til endringsordre', null, endringsordre, 'ANNEN_HJEMMEL'],
    ['endringsordre til irregulær endring', endringsordre, PAABEROPELSE.innhold, 'ANNEN_HJEMMEL'],
    [
      'irregulær endring til lovendring, der § 32.2 gjelder i begge',
      null,
      { hovedkategori: 'endring', underkategori: 'lovendring_gjenstand', ...MOTTATT },
      'ANNEN_HJEMMEL',
    ],
    ['samme hjemmel i irregulær endring', null, PAABEROPELSE.innhold, null],
    ['samme hjemmel i svikt', svikt, svikt, null],
    // GR-U40 punkt 7: endringsordren står.
    [
      'en annen endringsordre med uendret underkategori',
      endringsordre,
      { ...endringsordre, endringsordre: 'EO-2' },
      'ANNEN_ENDRINGSORDRE',
    ],
    ['samme endringsordre', endringsordre, endringsordre, null],
  ] as [string, Data | null, Data, string | null][])('%s', (_n, foerste, neste, regel) => {
    const s = sak();
    s.send('TE', foerste ? versjon(foerste) : PAABEROPELSE);
    expect(s.avvist('TE', versjon(neste))).toBe(regel);
  });

  it('meldingen ved en annen endringsordre sier hvilken endringsordre som står, og at en annen påberopes i en ny sak (GR-U40 punkt 7 og 9, #1952)', () => {
    const s = sak();
    s.send('TE', versjon(endringsordre));
    expect(s.avvisning('TE', versjon({ ...endringsordre, endringsordre: 'EO-2' }))).toEqual({
      regel: 'ANNEN_ENDRINGSORDRE',
      melding:
        'Påberopelsen er sendt, så en oppdatert påberopelse kan ikke endre endringsordren «EO-1». Et forslag om å rette betegnelsen sendes som innlegg, og en annen endringsordre påberopes i en ny sak.',
    });
  });

  it('det første påberopelsen kan ha enhver kategori', () => {
    const s = sak();
    expect(
      s.avvist(
        'TE',
        versjon({ hovedkategori: 'svikt', underkategori: 'grunnforhold', ...KLAR_OVER })
      )
    ).toBeNull();
  });
});

/**
 * MM-U34 punkt 7 opphever sperrene i GR-U17 og GR-U20: etter et frafall etter § 32.3 c fra
 * appen godtas et avslag, i en revisjon og i svaret på en ny påberopelsesversjon. Løsningen
 * avgjør ikke om byggherren er bundet av frafallet (MM-U12 (opphevet av MM-U50)). Revisjonen fra frafall til
 * frafall er arbeidsvalget 16.10 i #510.
 */
describe('et frafall fra appen kan følges av et avslag (MM-U34 punkt 7, GR-U17, GR-U20, #510)', () => {
  type Sak = ReturnType<typeof sak>;
  const frafall = { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true };
  const avslag = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const endringsordre = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };
  /** Forholdet godkjent subsidiært, med påberopelse av at varselet kom for sent. */
  const paaberopelse = { resultat: 'godkjent', grunnlag_varslet_i_tide: false };

  const utregnet = (s: Sak, v: Data) => {
    const u = s.u();
    const krav = u.spor.forhold.gjeldendeKrav!;
    return svar(
      'forhold',
      krav.id,
      v,
      regnUtSvar('forhold', v, { krav, paaberopelse: krav }, KJERNE.regler)
    );
  };
  const nyttSvar = (s: Sak, v: Data) => ({ type: 'brev', svar: [utregnet(s, v)] });
  const revisjon = (s: Sak, v: Data) => ({
    type: 'revisjon',
    erstatter: s.u().spor.forhold.gjeldendeSvar!.id,
    svar: utregnet(s, v),
  });
  const medFrafall = () => {
    const s = sakMedKrav();
    s.send('BH', nyttSvar(s, frafall));
    expect(s.u().frafalt, 'forutsetning: pålegget er frafalt').toBe(true);
    return s;
  };
  const versjon = (s: Sak, innhold: Data) =>
    s.send('TE', { ...PAABEROPELSE, innhold: { ...PAABEROPELSE.innhold, ...innhold } });
  /**
   * Et brev fra byggherren med et svar på gjeldende påberopelsesversjon. Et registrert brev
   * oppgis sendt dagen det registreres, etter dagen for siste rad, så det som var gjeldende
   * på sendedatoen, ikke avhenger av samme dag (OV-U98).
   */
  const registrertSvar = (s: Sak, resultat: string, sendt: boolean, iTide = true) => {
    const u = s.u();
    const id = randomUUID();
    s.rad('BH', {
      svar: [
        {
          id,
          spor: 'forhold',
          gjelder: u.spor.forhold.gjeldendeKrav!.id,
          ...(u.spor.forhold.gjeldendeSvar ? { erstatter: u.spor.forhold.gjeldendeSvar.id } : {}),
          standpunkter: [
            // VS-U86 punkt 6: rettidigheten gjelder det første grunnlagskravet.
            {
              id: randomUUID(),
              art: 'rettidighet',
              gjelder: u.spor.forhold.krav[0]!.id,
              hjemmel: '32.2',
              i_tide: iTide,
            },
            { id: randomUUID(), art: 'forhold', resultat },
          ],
        },
      ],
      ...(sendt
        ? {
            opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: dagenEtterSisteRad(s) }],
            ...SOM_BREV,
          }
        : {}),
    });
    return id;
  };

  describe('revisjonen av frafallet (GR-U17)', () => {
    it('en revisjon fra frafall til avslag godtas, pålegget står ikke lenger som frafalt, og forholdet er ikke avklart, fordi det siste svaret er avslaget (MM-U34 punkt 7, GR-U17, GR-U23)', () => {
      const s = medFrafall();
      expect(s.u().forholdAvklart, 'kontrollsak: avklart ved frafallet (GR-U7)').toBe(true);
      const avslaget = revisjon(s, avslag);
      expect(s.avvist('BH', avslaget)).toBeNull();
      s.send('BH', avslaget);
      expect(s.u().forstaatt).toBe(true);
      expect(s.u().frafalt).toBe(false);
      expect(s.u().forholdAvklart).toBe(false);
    });

    it('en revisjon fra frafall til endringsordre godtas', () => {
      const s = medFrafall();
      expect(s.avvist('BH', revisjon(s, endringsordre))).toBeNull();
    });

    it('en revisjon fra frafall til frafall godtas (arbeidsvalget 16.10, #510)', () => {
      const s = medFrafall();
      expect(s.avvist('BH', revisjon(s, frafall))).toBeNull();
    });

    it('en revisjon fra frafall til påberopelse etter § 32.2 godtas, selv om frafallet sa «i tide» (MM-U34 punkt 6 og 7, HF-U4, #235)', () => {
      const s = medFrafall();
      expect(s.avvist('BH', revisjon(s, paaberopelse))).toBeNull();
    });
  });

  describe('en ny påberopelsesversjon etter frafallet (GR-U20, GR-U22)', () => {
    it('med samme hjemmel kan byggherren svare med frafall, endringsordre, avslag eller påberopelse etter § 32.2 (MM-U34 punkt 6 og 7, GR-U20)', () => {
      const s = medFrafall();
      versjon(s, {});
      expect(s.u().spor.forhold.krav.length, 'forutsetning: ny grunnlagsversjon').toBe(2);
      expect(s.avvist('BH', nyttSvar(s, frafall))).toBeNull();
      expect(s.avvist('BH', nyttSvar(s, endringsordre))).toBeNull();
      expect(s.avvist('BH', nyttSvar(s, avslag))).toBeNull();
      expect(s.avvist('BH', nyttSvar(s, paaberopelse))).toBeNull();
    });

    it('et registrert frafall er gjeldende svar som et frafall fra appen, og etter en ny versjon godtas et avslag (OV-U80, OV-U98)', () => {
      const s = sakMedKrav();
      const id = registrertSvar(s, 'paalegg_frafalt', true);
      expect(s.u().frafalt).toBe(true);
      expect(s.u().spor.forhold.gjeldendeSvar?.id).toBe(id);
      versjon(s, {});
      expect(s.avvist('BH', nyttSvar(s, avslag))).toBeNull();
    });
  });

  /**
   * GR-U23: mens en ny påberopelsesversjon etter et frafall venter på svar, er forholdet
   * avklart ved frafallet, så en enighet i vederlag eller frist forblir virksom. Etter
   * OV-U3 oppstår tilfellet bare når et annet sendt krav står åpent, her fristkravet.
   */
  describe('mens en ny påberopelsesversjon venter etter frafallet (GR-U23)', () => {
    const vederlagFullt = [
      {
        ...P1({ vurdering: 'godkjent', godkjent_beloep: 125000, aksepterer: true }),
      },
      { resultat: 'godkjent', godkjent_beloep: 125000 },
    ] as const;
    /** Frafall på forholdet og vederlaget godkjent fullt, så partene er enige (GR-U10). */
    const medEnighetIVederlaget = (s: Sak) => {
      s.send('BH', {
        type: 'brev',
        svar: [svar('vederlag', s.krav('vederlag'), vederlagFullt[0], vederlagFullt[1])],
      });
      expect(enighetensVirkning(s.u(), 'vederlag'), 'forutsetning: enighet i vederlaget').toBe(
        'virksom'
      );
      return s;
    };

    it('versjon 2 venter på svar, forholdet er avklart ved frafallet, og enigheten i vederlaget forblir virksom', () => {
      const s = medEnighetIVederlaget(medFrafall());
      versjon(s, {});
      const u = s.u();
      expect(u.spor.forhold.krav.length, 'forutsetning: ny grunnlagsversjon').toBe(2);
      expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 er ikke besvart').toBeNull();
      expect(venterPaaSvar(u, 'forhold')).toBe(true);
      expect(u.forholdAvklart).toBe(true);
      expect(u.frafalt).toBe(true);
      expect(enighetensVirkning(u, 'vederlag')).toBe('virksom');
      expect(kraveneErAvgjort(u), 'fristkravet står åpent (OV-U3)').toBe(false);
      expect(kanInngaaIEo(u), 'et frafall hindrer ikke en endringsordre (GR-U28)').toBe(true);
    });

    it('byggherrens svar på versjon 2 avløser frafallet som gjeldende svar', () => {
      const s = medEnighetIVederlaget(medFrafall());
      versjon(s, {});
      s.send('BH', nyttSvar(s, endringsordre));
      const u = s.u();
      expect(u.frafalt).toBe(false);
      expect(u.forholdAvklart).toBe(true);
      expect(u.endringsordre).toBe('ja');
      expect(enighetensVirkning(u, 'vederlag')).toBe('virksom');
    });

    it('et registrert frafall avklarer forholdet som et frafall fra appen, så enigheten i vederlaget forblir virksom etter versjon 2 (OV-U80, OV-U98, GR-U23)', () => {
      const s = sakMedKrav();
      registrertSvar(s, 'paalegg_frafalt', true);
      medEnighetIVederlaget(s);
      versjon(s, {});
      const u = s.u();
      expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 er ikke besvart').toBeNull();
      expect(u.forholdAvklart).toBe(true);
      expect(u.frafalt).toBe(true);
      expect(enighetensVirkning(u, 'vederlag')).toBe('virksom');
    });

    it('etter frafall, revisjon til avslag og en ny påberopelsesversjon er forholdet ikke avklart ved frafallet, fordi det siste svaret er avslaget (MM-U34 punkt 7, GR-U23)', () => {
      const s = medFrafall();
      s.send('BH', revisjon(s, avslag));
      versjon(s, {});
      const u = s.u();
      expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 venter på svar').toBeNull();
      expect(u.forholdAvklart).toBe(false);
      expect(u.frafalt).toBe(false);
      // Kontrollsak: uten revisjonen er forholdet avklart ved frafallet (GR-U23).
      const k = medFrafall();
      versjon(k, {});
      expect(k.u().forholdAvklart, 'kontrollsak').toBe(true);
      expect(k.u().frafalt, 'kontrollsak').toBe(true);
    });

    it('etter frafall fra appen, en registrert endringsordre som godkjenner versjon 2 og en ny versjon 3 er forholdet ikke avklart ved frafallet, fordi det siste svaret er endringsordren, som for et svar fra appen (GR-U23, OV-U6, OV-U80, OV-U98)', () => {
      const s = medFrafall();
      versjon(s, {});
      const v2 = s.u().spor.forhold.gjeldendeKrav!.id;
      const eo = randomUUID();
      s.rad('BH', {
        svar: [
          {
            id: eo,
            spor: 'forhold',
            gjelder: v2,
            standpunkter: [
              // VS-U86 punkt 6: rettidigheten gjelder det første grunnlagskravet.
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: s.u().spor.forhold.krav[0]!.id,
                hjemmel: '32.2',
                i_tide: true,
              },
              { id: randomUUID(), art: 'forhold', resultat: 'godkjent' },
            ],
          },
        ],
        opplysninger: [
          { id: randomUUID(), hva: 'sendt', dato: '2026-10-06' },
          { id: randomUUID(), hva: 'endringsordre', oppfylt: true },
        ],
        ...SOM_BREV,
      });
      const etterEo = s.u();
      expect(etterEo.forstaatt, JSON.stringify(etterEo.begrensninger)).toBe(true);
      expect(
        etterEo.spor.forhold.gjeldendeSvar?.id,
        'forutsetning: den registrerte endringsordren er svaret på versjon 2 (OV-U6)'
      ).toBe(eo);
      expect(
        etterEo.utenVirkning.map((x) => x.element),
        'forutsetning: med virkning'
      ).toEqual([]);
      versjon(s, {});
      const u = s.u();
      expect(u.spor.forhold.krav.length, 'forutsetning: tre versjoner').toBe(3);
      expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 3 venter på svar').toBeNull();
      expect(venterPaaSvar(u, 'forhold')).toBe(true);
      expect(u.forholdAvklart).toBe(false);
      expect(u.frafalt).toBe(false);
      // Kontrollsak: endringsordren sendt fra appen gir det samme.
      const k = medFrafall();
      versjon(k, {});
      k.send('BH', nyttSvar(k, endringsordre));
      versjon(k, {});
      expect(k.u().forholdAvklart, 'kontrollsak').toBe(false);
      expect(k.u().frafalt, 'kontrollsak').toBe(false);
    });

    it('blir fristkravet avgjort mens versjon 2 venter, er kravene avgjort, og svaret på versjon 2 og trekket av forholdet godtas (MM-U34 punkt 12, OV-U3, KA-U11)', () => {
      const s = medEnighetIVederlaget(medFrafall());
      versjon(s, {});
      s.send('BH', {
        type: 'brev',
        svar: [svar('frist', s.krav('frist'), FRIST_FULLT[0], FRIST_FULLT[1])],
      });
      const u = s.u();
      expect(u.spor.forhold.gjeldendeSvar, 'forutsetning: versjon 2 venter på svar').toBeNull();
      expect(kraveneErAvgjort(u)).toBe(true);
      expect(kanInngaaIEo(u), 'et frafall hindrer ikke en endringsordre (GR-U28)').toBe(true);
      expect(s.avvist('BH', nyttSvar(s, endringsordre))).toBeNull();
      expect(s.avvist('TE', { type: 'trekk', spor: 'forhold' })).toBeNull();
      expect(
        visning(u, GJELDENDE_REGLER).spor.forhold.etiketter,
        'svaret godtas, så versjon 2 venter på svar (MM-U24)'
      ).toContain('venter_paa_svar');
      expect(visning(u, GJELDENDE_REGLER).status?.kode).toBe('alle_krav_avgjort');
    });
  });

  describe('et svar etter frafallet utenfor kommandoene, registrert eller ikke (MM-U43 punkt 6, OV-U80, OV-U98)', () => {
    const brevet = [
      ['et registrert brev', true],
      ['et brev som ikke er registrert og ikke er sendt fra appen', false],
    ] as [string, boolean][];

    it.each(brevet)(
      'et avslag av en ny påberopelsesversjon i %s er gjeldende svar og avløser frafallet',
      (_n, sendt) => {
        const s = medFrafall();
        versjon(s, {});
        const id = registrertSvar(s, 'avslaatt', sendt);
        const u = s.u();
        expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
        expect(u.spor.forhold.gjeldendeSvar?.id).toBe(id);
        expect(u.frafalt).toBe(false);
      }
    );

    it.each(
      brevet.flatMap(([brev, sendt]) => [
        [`et avslag i ${brev}`, 'avslaatt', true, sendt],
        [`en påberopelse etter § 32.2 i ${brev}`, 'godkjent', false, sendt],
      ]) as [string, string, boolean, boolean][]
    )(
      'en revisjon av frafallet til %s er forstått og avløser frafallet (MM-U34 punkt\u00a06 og 7, GR-U17)',
      (_n, resultat, iTide, sendt) => {
        const s = medFrafall();
        const id = registrertSvar(s, resultat, sendt, iTide);
        const u = s.u();
        expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
        expect(u.spor.forhold.gjeldendeSvar?.id).toBe(id);
        expect(u.frafalt).toBe(false);
      }
    );

    it('et registrert svar på en ny grunnlagsversjon med påberopelse etter § 32.2 er gjeldende svar (MM-U34 punkt 6 og 7, GR-U20)', () => {
      const s = medFrafall();
      versjon(s, {});
      const id = registrertSvar(s, 'godkjent', true, false);
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      expect(u.spor.forhold.gjeldendeSvar?.id).toBe(id);
    });

    it('et registrert avslag etter et registrert frafall avløser frafallet (OV-U80, OV-U98)', () => {
      const s = sakMedKrav();
      registrertSvar(s, 'paalegg_frafalt', true);
      const id = registrertSvar(s, 'avslaatt', true);
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      expect(u.frafalt).toBe(false);
      expect(u.spor.forhold.gjeldendeSvar?.id).toBe(id);
    });
  });

  /**
   * Arbeidsvalg 3 i #770 (#562). Radene står utenfor kommandoene, som en rad som verken er
   * registrert eller sendt fra appen (MM-U43 punkt 6). MM-U34 punkt 7 opphever sperren i GR-U17, så
   * avslaget gjør ikke lenger saken uforstått.
   */
  it('en revisjon av frafallet på versjon 1 til avslag, etter en versjon 2 uten frafall og utenfor kommandoene, er forstått (MM-U34 punkt 7, GR-U17, arbeidsvalg 3 i #770)', () => {
    const s = medFrafall();
    const foerste = s.u().spor.forhold.gjeldendeKrav!.id;
    const frafallet = s.u().spor.forhold.gjeldendeSvar!.id;
    // GR-U22: kommandoene kan ikke endre underkategorien, så versjon 2 står utenfor dem.
    s.rad('TE', {
      krav: [
        {
          id: randomUUID(),
          spor: 'forhold',
          erstatter: foerste,
          hovedkategori: 'svikt',
          underkategori: 'grunnforhold',
        },
      ],
    });
    s.rad('BH', {
      svar: [
        {
          id: randomUUID(),
          spor: 'forhold',
          gjelder: foerste,
          erstatter: frafallet,
          standpunkter: [
            {
              id: randomUUID(),
              art: 'rettidighet',
              gjelder: foerste,
              hjemmel: '32.2',
              i_tide: true,
            },
            { id: randomUUID(), art: 'forhold', resultat: 'avslaatt' },
          ],
        },
      ],
    });
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
  });

  describe('hver grunn i kontrollen mot journalen før brevet (MM-U43 punkt 6, #669)', () => {
    const grunner = (s: Sak) => s.u().begrensninger.map((b) => b.grunn);
    const medEnighet = () => {
      const s = sakMedKrav();
      s.send('BH', nyttSvar(s, endringsordre));
      expect(s.u().spor.forhold.enighet, 'forutsetning: enighet ved sammenfall').not.toBeNull();
      return s;
    };
    const raaAksept = (s: Sak, gjelder: string) =>
      s.rad('TE', {
        utsagn: [{ id: randomUUID(), art: 'aksept', gjelder, regelversjon: KJERNE.regler.versjon }],
      });

    it('en revisjon av en godkjenning av forholdet med registrert enighet gir ingen grunn, og saken er forstått (MM-U34 punkt 11, EO-U12)', () => {
      const s = medEnighet();
      const revisjon = registrertSvar(s, 'godkjent', false);
      expect(grunner(s)).toEqual([]);
      expect(s.u().forstaatt).toBe(true);
      expect(s.u().spor.forhold.gjeldendeSvar?.id).toBe(revisjon);
    });

    it('en aksept av et svar med registrert enighet (GR-U8)', () => {
      const s = medEnighet();
      raaAksept(s, s.u().spor.forhold.gjeldendeSvar!.id);
      // Leseren avviser også aksepten av et sammenfall (GR-U8).
      expect(grunner(s)).toContain('en aksept av et svar med registrert enighet (GR-U8)');
    });

    it('en aksept av et svar i et spor etter at kravet er trukket (MM-U43, GR-U5)', () => {
      const s = sakMedKrav();
      s.send('BH', {
        type: 'brev',
        svar: [svar('vederlag', s.krav('vederlag'), VEDERLAG_DELVIS[0], VEDERLAG_DELVIS[1])],
      });
      const svaret = s.u().spor.vederlag.gjeldendeSvar!.id;
      s.send('TE', { type: 'trekk', spor: 'vederlag' });
      raaAksept(s, svaret);
      expect(grunner(s)).toEqual([
        'en aksept av et svar i et spor etter at kravet er trukket (MM-U43, GR-U5)',
      ]);
    });

    /** Byggherrens registrerte endringsordre (OV-U6) etter trekket av forholdet, uten virkning. */
    const endringsordreUtenVirkning = () => {
      const s = sakMedKrav();
      const krav = s.krav('forhold');
      s.send('TE', { type: 'trekk', spor: 'forhold' });
      const id = randomUUID();
      s.rad('BH', {
        svar: [
          {
            id,
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
              { id: randomUUID(), art: 'forhold', resultat: 'godkjent' },
            ],
          },
        ],
        opplysninger: [
          { id: randomUUID(), hva: 'sendt', dato: '2026-10-06' },
          { id: randomUUID(), hva: 'endringsordre', oppfylt: true },
        ],
        ...SOM_BREV,
      });
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      expect(
        u.utenVirkning.map((x) => x.element),
        'forutsetning: endringsordren har ingen virkning'
      ).toEqual([id]);
      return { s, id };
    };

    it('OV-U19, MM-U19 (opphevet av MM-U43): en endringsordre uten virkning er vurdert av appen og gir ikke merknaden om brev utenfor appen; et brev registrert som dokumentasjon gir den', () => {
      const { s } = endringsordreUtenVirkning();
      const foer = visning(s.u(), GJELDENDE_REGLER);
      expect(foer.merknader).toContain('registrert_brev_uten_virkning');
      expect(foer.merknader).not.toContain('brev_utenfor_appen');
      expect(harIkkeVurdertBrev(s.u()), 'statusteksten og sakslisten').toBe(false);
      s.rad('BH', {
        ...SOM_BREV,
        beskrivelse: 'Brev om fremdriften',
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: '2026-10-06' }],
        dokumentasjon: [
          { vedlegg_id: randomUUID(), filnavn: 'brev.pdf', innhold_sha256: 'a'.repeat(64) },
        ],
      });
      expect(s.u().forstaatt, 'forutsetning').toBe(true);
      expect(visning(s.u(), GJELDENDE_REGLER).merknader, 'kontrollsak').toContain(
        'brev_utenfor_appen'
      );
      expect(harIkkeVurdertBrev(s.u()), 'kontrollsak').toBe(true);
    });

    it('en revisjon av et svar uten virkning (MM-U43 punkt 6)', () => {
      const { s, id } = endringsordreUtenVirkning();
      const krav = s.u().spor.forhold.krav[0].id;
      s.rad('BH', {
        svar: [
          {
            id: randomUUID(),
            spor: 'forhold',
            gjelder: krav,
            erstatter: id,
            standpunkter: [{ id: randomUUID(), art: 'forhold', resultat: 'avslaatt' }],
          },
        ],
      });
      // Leseren avviser også kjeden, fordi svaret uten virkning ikke er lest inn i sporet.
      expect(grunner(s)).toContain('svaret viser til et element uten virkning');
    });

    it('en protest mot egen endringsordre uten virkning viser ikke til noe den kan gjelde (VS-U1, MM-U43 punkt 6)', () => {
      const { s, id } = endringsordreUtenVirkning();
      s.rad('BH', { utsagn: [{ id: randomUUID(), art: 'protest', gjelder: id }] });
      expect(s.u().forstaatt).toBe(false);
      expect(grunner(s)).toContain('protest viser ikke til noe den kan gjelde før den');
    });
  });
});

/**
 * MM-U34 punkt 4 opphever vernet i HF-U5, og punkt 3 bindingen i HF-U21: byggherren kan
 * sende en revisjon som senker det byggherren har godkjent. Løsningen avgjør ikke om
 * endringen er rettslig virksom (MM-U12 (opphevet av MM-U50)). Aksepten av beregningsmåten kan også tas tilbake
 * (MM-U34 punkt 15).
 */
describe('en revisjon kan senke det byggherren har godkjent (MM-U34 punkt 4, HF-U5, HF-U21, #502)', () => {
  type Sak = ReturnType<typeof sak>;
  type Sporet = 'forhold' | 'vederlag' | 'frist';

  /** Svaret med serverens utregning, så bare revisjonen kan gi en avvisning. */
  const utregnet = (s: Sak, spor: Sporet, v: Data) => {
    const u = s.u();
    const krav = gjeldendeKrav(u, spor);
    v = medKravpostIder(v, krav);
    return svar(
      spor,
      krav.id,
      v,
      regnUtSvar(
        spor,
        medFristen(v),
        { krav, paaberopelse: u.spor.forhold.gjeldendeKrav },
        KJERNE.regler
      )
    );
  };
  const brev = (s: Sak, spor: Sporet, v: Data) =>
    s.send('BH', { type: 'brev', svar: [utregnet(s, spor, v)] });
  const revisjon = (s: Sak, spor: Sporet, v: Data) => ({
    type: 'revisjon',
    erstatter: s.u().spor[spor].gjeldendeSvar!.id,
    svar: utregnet(s, spor, v),
  });
  const nyttSvar = (s: Sak, spor: Sporet, v: Data) => ({
    type: 'brev',
    svar: [utregnet(s, spor, v)],
  });
  /** Revisjonen godtas, og saken er forstått etter at den er sendt. */
  const godtas = (s: Sak, kommando: Data) => {
    expect(s.avvist('BH', kommando)).toBeNull();
    s.send('BH', kommando);
    expect(s.u().forstaatt).toBe(true);
  };

  /** 100 000 av 125 000 kr, så svaret ikke gir enighet ved sammenfall (GR-U10). */
  const delvis = {
    ...P1({ vurdering: 'delvis', godkjent_beloep: 100000, aksepterer: true }),
  };
  const beloep = (n: number) => medP1({ ...delvis }, { godkjent_beloep: n });
  /** 10 av 20 dager. */
  const dager = {
    frist_varsel_ok: true,
    spesifisert_krav_ok: true,
    vilkar_oppfylt: true,
    dager: 10,
  };

  describe('vederlaget', () => {
    it('et lavere godkjent beløp godtas, også når aksepten av fast sum tas tilbake i samme revisjon (MM-U34 punkt 4 og 15, HF-U5)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      godtas(s, revisjon(s, 'vederlag', beloep(80000)));
      expect(s.u().spor.vederlag.gjeldendeSvar!.utregning).toMatchObject({
        godkjent_beloep: 80000,
      });
      const k = sakMedKrav();
      brev(k, 'vederlag', delvis);
      godtas(k, revisjon(k, 'vederlag', medP1IkkeAkseptert(beloep(90000), 'enhetspriser')));
    });

    it('et beløp som står likt, godtas, også når det er det eneste i revisjonen', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      expect(s.avvist('BH', revisjon(s, 'vederlag', delvis))).toBeNull();
    });

    it('en revisjon som tar tilbake aksepten av fast sum, godtas, og en aksept kan gis (MM-U34 punkt 15)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      const uten = medP1IkkeAkseptert({ ...delvis }, 'enhetspriser');
      expect(s.avvist('BH', revisjon(s, 'vederlag', uten))).toBeNull();

      const kontroll = sakMedKrav();
      brev(kontroll, 'vederlag', uten);
      expect(
        kontroll.avvist('BH', revisjon(kontroll, 'vederlag', delvis)),
        'kontrollsak'
      ).toBeNull();
    });

    it('byggherrens ønskede metode kan endres når tilbudet ikke er akseptert (MM-U12, MM-U50)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', medP1IkkeAkseptert({ ...delvis }, 'enhetspriser'));
      expect(
        s.avvist('BH', revisjon(s, 'vederlag', medP1IkkeAkseptert(delvis, 'regningsarbeid')))
      ).toBeNull();
    });

    it('subsidiært 100 000 kr kan bli prinsipalt 80 000 kr når preklusjonen gis opp (MM-U34 punkt 4, HF-U5, § 34.1.2)', () => {
      const s = sak();
      s.send('TE', {
        ...PAABEROPELSE,
        innhold: {
          hovedkategori: 'svikt',
          underkategori: 'grunnforhold',
          ...KLAR_OVER,
        },
      });
      s.send('TE', {
        type: 'krav',
        spor: 'vederlag',
        innhold: tilbud(125000),
      });
      brev(s, 'vederlag', { ...delvis, hovedkrav_varslet_i_tide: false });
      godtas(s, revisjon(s, 'vederlag', { ...beloep(80000), hovedkrav_varslet_i_tide: true }));
    });
  });

  describe('fristforlengelsen', () => {
    it.each([
      ['færre godkjente dager', dager, { ...dager, dager: 8 }],
      ['at fremdriften ikke er hindret (§ 33.1)', dager, { ...dager, vilkar_oppfylt: false }],
      [
        'færre dager byggherren måtte forstå etter § 33.6.1, når begge svar sier «for sent» (VS-U4)',
        { ...dager, spesifisert_krav_ok: false, dager_maatte_forstaa: 5 },
        { ...dager, spesifisert_krav_ok: false, dager_maatte_forstaa: 3 },
      ],
    ] as [string, Data, Data][])(
      'en revisjon med %s godtas (MM-U34 punkt\u00a04, HF-U5)',
      (_n, foer, etter) => {
        const s = sakMedKrav();
        brev(s, 'frist', foer);
        godtas(s, revisjon(s, 'frist', etter));
      }
    );
  });

  describe('forholdet', () => {
    const forSent = { grunnlag_varslet_i_tide: false };

    it.each([
      ['avslått', { ...forSent, resultat: 'avslaatt' }],
      ['frafalt', { grunnlag_varslet_i_tide: true, resultat: 'paalegg_frafalt' }],
    ] as [string, Data][])(
      'et forhold godkjent subsidiært kan revideres til %s (MM-U34 punkt\u00a04 og 7, HF-U5)',
      (_n, v) => {
        const s = sakMedKrav();
        brev(s, 'forhold', { ...forSent, resultat: 'godkjent' });
        godtas(s, revisjon(s, 'forhold', v));
      }
    );

    it('et avslag kan revideres til godkjenning (HF-U5)', () => {
      const s = sakMedKrav();
      brev(s, 'forhold', { ...forSent, resultat: 'avslaatt' });
      expect(
        s.avvist('BH', revisjon(s, 'forhold', { ...forSent, resultat: 'godkjent' }))
      ).toBeNull();
    });

    it('et registrert svar er gjeldende, og byggherren kan revidere det til avslag fra appen (OV-U80, OV-U98, HF-U5)', () => {
      const s = sakMedKrav();
      const u = s.u();
      const id = randomUUID();
      s.rad('BH', {
        svar: [
          {
            id,
            spor: 'forhold',
            gjelder: u.spor.forhold.gjeldendeKrav!.id,
            standpunkter: [
              {
                id: randomUUID(),
                art: 'rettidighet',
                gjelder: u.spor.forhold.gjeldendeKrav!.id,
                hjemmel: '32.2',
                i_tide: false,
              },
              { id: randomUUID(), art: 'forhold', resultat: 'godkjent' },
            ],
          },
        ],
        opplysninger: [{ id: randomUUID(), hva: 'sendt', dato: dagenEtterSisteRad(s) }],
        ...SOM_BREV,
      });
      expect(s.u().spor.forhold.gjeldendeSvar?.id).toBe(id);
      expect(s.avvist('BH', nyttSvar(s, 'forhold', { ...forSent, resultat: 'avslaatt' }))).toBe(
        'ALLEREDE_SVART'
      );
      expect(
        s.avvist('BH', revisjon(s, 'forhold', { ...forSent, resultat: 'avslaatt' }))
      ).toBeNull();
    });
  });

  describe('etter en ny versjon', () => {
    it('etter en ny påberopelsesversjon med samme hjemmel revideres svaret på vederlaget, og et lavere beløp godtas (MM-U34 punkt 3, HF-U21)', () => {
      const s = sakMedKrav();
      brev(s, 'forhold', { resultat: 'avslaatt', grunnlag_varslet_i_tide: true });
      brev(s, 'vederlag', delvis);
      s.send('TE', {
        ...PAABEROPELSE,
        innhold: { ...PAABEROPELSE.innhold },
      });
      expect(
        s.avvist('BH', nyttSvar(s, 'vederlag', beloep(80000))),
        'vederlaget er besvart, så byggherren må revidere'
      ).toBe('ALLEREDE_SVART');
      godtas(s, revisjon(s, 'vederlag', beloep(80000)));
    });

    it('etter en ny kravversjon er svaret nytt, og byggherren er fri (HF-U5, HF-U8)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      s.send('TE', {
        type: 'krav',
        spor: 'vederlag',
        innhold: tilbud(120000),
      });
      expect(s.avvist('BH', nyttSvar(s, 'vederlag', beloep(50000)))).toBeNull();
    });
  });

  /**
   * MM-U27: en rad som ikke er et registrert brev, og som byggherren ikke kunne sendt fra
   * appen, gjør saken ikke forstått. MM-U34 punkt 4 og 6 opphever sperrene i HF-U5 og HF-U4,
   * så en revisjon som senker beløpet eller påberoper «for sent» etter «i tide», er forstått.
   * Raden er en kopi av svaret fra appen med ett felt endret.
   */
  describe('en rad utenfor kommandoene som senker eller påberoper «for sent» (MM-U27)', () => {
    /** Revisjonen av det siste svaret, med `endre` brukt på en kopi av det. */
    const kopi = (s: Sak, endre: (svar: Data) => void) => {
      const forrige = (s.journal.at(-1)!.data.svar as Data[])[0];
      const svar = structuredClone(forrige);
      svar.id = randomUUID();
      svar.erstatter = forrige.id;
      for (const p of svar.standpunkter as Data[]) p.id = randomUUID();
      endre(svar);
      return svar;
    };
    /** Beløpet i posten, i raden for posten og i totalen i utregningen (OV-U31). Svaret har ett lag. */
    const beloepet = (kr: number) => (v: Data) => {
      const u = v.utregning as Data;
      u.godkjent_beloep = kr;
      u.poster = [{ ...(u.poster as Data[])[0], lag: [{ lag: 1, beloep: kr }] }];
      (v.standpunkter as Data[]).find((p) => p.art === 'beloep')!.beloep = kr;
    };

    it('en revisjon som senker det godkjente beløpet, er forstått og gjeldende svar (MM-U34 punkt 4, HF-U5)', () => {
      const s = sakMedKrav();
      brev(s, 'vederlag', delvis);
      const revisjonen = kopi(s, beloepet(80000));
      s.rad('BH', { svar: [revisjonen] });
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      expect(u.spor.vederlag.gjeldendeSvar?.id).toBe(revisjonen.id);
    });

    // OV-U31, KA-U57 (e), KA-U72: radene per post i utregningen stemmer med standpunktene og
    // totalene, og et lag står uten beløp bare når tilbudet for kravposten ikke er akseptert.
    describe('utregningen per post og lag i et lagret svar (OV-U31, KA-U57 (e), KA-U72)', () => {
      type Utregning = { poster: { gjelder?: string; lag: Data[] }[] } & Data;
      const uten = medP1IkkeAkseptert({ ...delvis }, 'regningsarbeid');
      /** Svikt, så § 34.1.2 gjelder, og med preklusjonen har svaret to lag (OV-U27). */
      const toLag = { ...delvis, hovedkrav_varslet_i_tide: false };
      const toLagUten = medP1IkkeAkseptert({ ...toLag }, 'regningsarbeid');
      const svikt = () => {
        const s = sak();
        s.send('TE', {
          ...PAABEROPELSE,
          innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
        });
        s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
        return s;
      };

      it('kontrollsaker: en uendret kopi er forstått, også med et lag uten beløp når tilbudet ikke er akseptert', () => {
        for (const v of [delvis, uten]) {
          const s = sakMedKrav();
          brev(s, 'vederlag', v);
          s.rad('BH', { svar: [kopi(s, () => {})] });
          const u = s.u();
          expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
        }
        const s = sakMedKrav();
        brev(s, 'vederlag', uten);
        const ut = (s.journal.at(-1)!.data.svar as Data[])[0].utregning as Utregning;
        expect(ut.poster[0].lag).toEqual([{ lag: 1 }]);
        expect(ut.godkjent_beloep).toBe(0);
        const prekludert = svikt();
        brev(prekludert, 'vederlag', toLagUten);
        const lagret = (prekludert.journal.at(-1)!.data.svar as Data[])[0].utregning as Utregning;
        expect(lagret.poster[0].lag).toEqual([{ lag: 1, beloep: 0 }, { lag: 2 }]);
        prekludert.rad('BH', { svar: [kopi(prekludert, () => {})] });
        expect(prekludert.u().forstaatt, 'med preklusjon og 0 kr i det første laget').toBe(true);
      });

      it.each<[string, Data, (u: Utregning) => void, string]>([
        [
          'totalen er ikke summen av det første laget',
          toLag,
          (u) => (u.godkjent_beloep = 90000),
          'det første laget summerer ikke',
        ],
        [
          'raden gjelder en annen post enn beløpet',
          delvis,
          (u) => (u.poster[0].gjelder = 'en-annen-post'),
          'gjelder ikke samme post',
        ],
        [
          'det siste laget har et beløp, men tilbudet er ikke akseptert',
          uten,
          (u) => (u.poster[0].lag[0].beloep = 90000),
          'det siste laget',
        ],
        [
          'et lag før det siste har et beløp, men tilbudet er ikke akseptert',
          toLagUten,
          (u) => {
            u.poster[0].lag[0].beloep = 90000;
            u.godkjent_beloep = 90000;
          },
          'har ikke 0 kr i laget for § 34.1.2',
        ],
        [
          'laget for § 34.1.2 mangler 0 kr, men tilbudet er ikke akseptert',
          toLagUten,
          (u) => delete u.poster[0].lag[0].beloep,
          'har ikke 0 kr i laget for § 34.1.2',
        ],
        [
          'et lag mangler beløpet når tilbudet er akseptert',
          delvis,
          (u) => {
            u.godkjent_beloep = 0;
            u.subsidiaert_resultat = 'delvis_godkjent';
            u.subsidiaert_godkjent_beloep = 100000;
            u.poster[0].lag = [{ lag: 1 }, { lag: 2, beloep: 100000 }];
          },
          'aksepterer tilbudet for posten (KA-U72)',
        ],
        [
          'utregningen har to lag, men beslutningsgrunnlaget ett (#1774)',
          delvis,
          (u) => {
            u.subsidiaert_resultat = 'delvis_godkjent';
            u.subsidiaert_godkjent_beloep = 100000;
            u.poster[0].lag = [
              { lag: 1, beloep: 100000 },
              { lag: 2, beloep: 100000 },
            ];
          },
          'radene har 2 lag, men beslutningsgrunnlaget har 1',
        ],
        [
          'svaret har ett lag, men et subsidiært beløp',
          delvis,
          (u) => {
            u.subsidiaert_resultat = 'delvis_godkjent';
            u.subsidiaert_godkjent_beloep = 100000;
          },
          'det subsidiære beløpet står ikke nøyaktig',
        ],
      ])('%s: saken er ikke forstått', (_n, v, endre, grunn) => {
        const s = v === toLag || v === toLagUten ? svikt() : sakMedKrav();
        brev(s, 'vederlag', v);
        const raden = { svar: [kopi(s, (svar) => endre(svar.utregning as Utregning))] };
        expect(() => s.rad('BH', raden), 'raden fryses, og lesingen avgjør').not.toThrow();
        const u = s.u();
        expect(u.forstaatt).toBe(false);
        expect(u.begrensninger.map((b) => b.grunn).join(' ')).toContain(grunn);
      });
    });

    // KA-U72: uten aksept av tilbudet tar svaret ikke stilling til beløpet for kravposten, og
    // brevet sier ikke noe om det tilbudte beløpet.
    describe('uten aksept av tilbudet tar svaret ikke stilling til beløpet (KA-U72)', () => {
      type Utregning = { poster: { gjelder?: string; lag: Data[] }[] } & Data;
      const uten = medP1IkkeAkseptert({}, 'regningsarbeid');

      it('svaret lagres med standpunktet til beløpet uten beløp og ett lag uten beløp, er forstått og avslår ikke kravet', () => {
        const s = sakMedKrav();
        const rad = brev(s, 'vederlag', uten);
        const lagret = (rad.data.svar as Data[])[0];
        const beloepet = (lagret.standpunkter as Data[]).find((p) => p.art === 'beloep')!;
        expect('beloep' in beloepet).toBe(false);
        const ut = lagret.utregning as Utregning;
        expect(ut.poster[0].lag).toEqual([{ lag: 1 }]);
        // OV-U73: en post uten fast beløp regnes ikke med, og summen 0 er ikke et avslag.
        expect([ut.resultat, ut.godkjent_beloep]).toEqual(['delvis_godkjent', 0]);
        const u = s.u();
        expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
        expect(laast(rad)[1]).toContain('og mener vederlaget skal justeres som regningsarbeid');
        expect(laast(rad).slice(0, 2).join('\n\n')).not.toMatch(/godkjenner|Subsidiært/);
        expect(laast(rad)).toHaveLength(3);
      });

      it('med preklusjon etter § 34.1.2 står kravposten med 0 kr i det første laget og uten beløp i det andre, og det subsidiære er ikke et avslag (OV-U27, OV-U73, KA-U72)', () => {
        const s = sak();
        s.send('TE', {
          ...PAABEROPELSE,
          innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
        });
        s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
        const rad = brev(
          s,
          'vederlag',
          medP1IkkeAkseptert({ hovedkrav_varslet_i_tide: false }, 'regningsarbeid')
        );
        const ut = (rad.data.svar as Data[])[0].utregning as Utregning;
        expect(ut.poster[0].lag).toEqual([{ lag: 1, beloep: 0 }, { lag: 2 }]);
        expect([ut.resultat, ut.subsidiaert_resultat]).toEqual(['avslaatt', 'delvis_godkjent']);
        expect([ut.godkjent_beloep, ut.subsidiaert_godkjent_beloep]).toEqual([0, 0]);
        expect(s.u().forstaatt).toBe(true);
        expect(laast(rad)[2]).toBe(
          `2. Vederlagsjustering for P1 Ny fundamentering (punkt\u00a034.1.2)\n\nSubsidiært, hvis ${MOT.varselet('34.1.2')} ikke fører frem\n\nByggherren aksepterer ikke totalentreprenørens tilbud (punkt\u00a034.2.2 første ledd), og mener vederlaget skal justeres som regningsarbeid (punkt\u00a034.4).`
        );
        expect(laast(rad).join('\n\n')).not.toContain('Videre subsidiært');
      });

      it('med to kravposter står beløpet for den kravposten der tilbudet er akseptert, og brevet sier ikke noe om beløpet for den andre', () => {
        const s = sak();
        s.send('TE', PAABEROPELSE);
        s.send('TE', {
          type: 'krav',
          spor: 'vederlag',
          innhold: {
            ...tilbud(125000),
            kravposter: [
              { beskrivelse: 'Graving', oppgjoersform: 'tilbud', beloep: 100000 },
              { beskrivelse: 'Rør', oppgjoersform: 'tilbud', beloep: 25000 },
            ],
          },
        });
        const rad = brev(s, 'vederlag', {
          kravposter: [
            { gjelder: 'P1', vurdering: 'godkjent', godkjent_beloep: 100000, aksepterer: true },
            { gjelder: 'P2', aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' },
          ],
        });
        const tekst = laast(rad).join('\n\n');
        // LV-U78: med flere kravposter har hver kravpost sitt punkt, og overskriften nevner kravposten.
        expect(laast(rad)[1]).toBe(
          `1. Vederlagsjustering for P1 Graving (punkt\u00a034.1.1)\n\nByggherren godkjenner oppgjør som fast sum for P1 med beløpet og forbeholdene som fremgår av svaret. Byggherren godkjenner ${kr('100 000')}.`
        );
        expect(tekst).toContain('aksepterer ikke totalentreprenørens tilbud for P2');
        expect(tekst).not.toMatch(/beløpet for P2|av de krevde/);
        const ut = (rad.data.svar as Data[])[0].utregning as Utregning;
        expect(ut.poster.map((p) => p.lag)).toEqual([[{ lag: 1, beloep: 100000 }], [{ lag: 1 }]]);
        expect(s.u().forstaatt).toBe(true);
      });

      it('svaret avvises med en vurdering kjernen ikke kjenner', () => {
        const s = sakMedKrav();
        const brevet = {
          type: 'brev',
          svar: [
            svar(
              'vederlag',
              s.krav('vederlag'),
              P1({ vurdering: 'avslatt', aksepterer: true }),
              { resultat: 'delvis_godkjent', godkjent_beloep: 0 },
              null
            ),
          ],
        };
        expect(s.avvisning('BH', brevet)?.melding).toContain(
          'P1.vurdering: avslatt er ikke en vurdering av beløpet'
        );
      });

      it.each<[string, Data, (svar: Data) => void, string]>([
        [
          'en rad med standpunktet til beløpet uten beløp for en kravpost der tilbudet er akseptert',
          delvis,
          (svar) => {
            delete (svar.standpunkter as Data[]).find((p) => p.art === 'beloep')!.beloep;
            const u = svar.utregning as Utregning;
            u.godkjent_beloep = 0;
            u.poster[0].lag = [{ lag: 1 }];
          },
          'standpunktet til beløpet står uten beløp, men byggherren aksepterer tilbudet for posten (KA-U72)',
        ],
        [
          'en rad med et beløp for en kravpost der tilbudet ikke er akseptert',
          uten,
          (svar) => {
            (svar.standpunkter as Data[]).find((p) => p.art === 'beloep')!.beloep = 0;
            (svar.utregning as Utregning).poster[0].lag = [{ lag: 1, beloep: 0 }];
          },
          'standpunktet til beløpet har et beløp, men byggherren aksepterer ikke tilbudet for posten (KA-U72)',
        ],
      ])('%s, avvises', (_n, v, endre, melding) => {
        const s = sakMedKrav();
        brev(s, 'vederlag', v);
        expect(() => s.rad('BH', { svar: [kopi(s, () => {})] }), 'kontrollsak').not.toThrow();
        expect(() => s.rad('BH', { svar: [kopi(s, endre)] })).toThrow(melding);
      });
    });

    it.each([
      ['varselet etter § 33.4', 'rettidighet'],
      ['spesifiseringen etter § 33.6.1', 'spesifisering'],
    ])(
      'en revisjon som sier at %s kom for sent, etter at byggherren sa i tide, er forstått (MM-U34 punkt\u00a06, HF-U4)',
      (_n, art) => {
        const s = sakMedKrav();
        brev(s, 'frist', dager);
        s.rad('BH', {
          svar: [
            kopi(s, (v) => {
              const p = (v.standpunkter as Data[]).find((x) => x.art === art);
              expect(p?.i_tide, `forutsetning: byggherren sa at ${art} var i tide`).toBe(true);
              p!.i_tide = false;
              const forstaa = art === 'spesifisering' ? 10 : 0;
              if (art === 'spesifisering') {
                const frist = (v.standpunkter as Data[]).find((x) => x.art === 'dager')!.gjelder;
                p!.maatte_forstaa = [{ frist, dager: forstaa }];
              }
              // KA-U78: påberopelsen står i første lag, og de vurderte dagene i det andre.
              const r = ((v.utregning as Data).frister as Data[])[0]!;
              Object.assign(r, {
                resultat: forstaa ? 'delvis_godkjent' : 'avslaatt',
                godkjent_dager: forstaa,
                subsidiaert_resultat: r.resultat,
                subsidiaert_godkjent_dager: r.godkjent_dager,
                lag: [
                  { lag: 1, dager: forstaa },
                  { lag: 2, dager: r.godkjent_dager },
                ],
              });
            }),
          ],
        });
        const u = s.u();
        expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      }
    );

    it('en rad med andre dager i et lag enn standpunktet i laget gir fristen, er ikke forstått (KA-U78, OV-U32)', () => {
      const forSent = (dagerILag1: number) => (v: Data) => {
        (v.standpunkter as Data[]).find((x) => x.art === 'rettidighet')!.i_tide = false;
        const r = ((v.utregning as Data).frister as Data[])[0]!;
        Object.assign(r, {
          resultat: 'avslaatt',
          godkjent_dager: dagerILag1,
          subsidiaert_resultat: r.resultat,
          subsidiaert_godkjent_dager: r.godkjent_dager,
          lag: [
            { lag: 1, dager: dagerILag1 },
            { lag: 2, dager: r.godkjent_dager },
          ],
        });
      };
      const grunner = (dagerILag1: number) => {
        const sak = sakMedKrav();
        brev(sak, 'frist', dager);
        sak.rad('BH', { svar: [kopi(sak, forSent(dagerILag1))] });
        return sak.u().begrensninger.map((b) => b.grunn);
      };
      expect(grunner(0), 'kontrollsak').toEqual([]);
      expect(grunner(3)).toEqual([
        expect.stringContaining('rad 1 har ikke dagene standpunktet i lag 1 gir fristen'),
      ]);
    });

    // Kilde: arbeidsvalget 15.11 i #1905 punkt 1.
    it.each([
      [
        'prinsipalt',
        (r: Data, resultat: string) => {
          r.resultat = resultat;
        },
      ],
      [
        'subsidiært',
        (r: Data, resultat: string) => {
          // § 33.4 er påberopt i første lag, så dagene står i det andre.
          Object.assign(r, {
            resultat: 'avslaatt',
            godkjent_dager: 0,
            subsidiaert_resultat: resultat,
            subsidiaert_godkjent_dager: r.godkjent_dager,
            lag: [
              { lag: 1, dager: 0 },
              { lag: 2, dager: r.godkjent_dager },
            ],
          });
        },
      ],
    ])(
      'en rad som avslår fristen %s, men godkjenner dager, er ikke forstått (#1905)',
      (hvordan, endre) => {
        const grunner = (resultat: string) => {
          const sak = sakMedKrav();
          brev(sak, 'frist', dager);
          const svaret = kopi(sak, (v) => {
            if (hvordan === 'subsidiært')
              (v.standpunkter as Data[]).find((x) => x.art === 'rettidighet')!.i_tide = false;
            const r = ((v.utregning as Data).frister as Data[])[0]!;
            expect(r.godkjent_dager, 'forutsetning: svaret godkjenner dager').toBeGreaterThan(0);
            endre(r, resultat === 'avslaatt' ? resultat : (r.resultat as string));
          });
          sak.rad('BH', { svar: [svaret] });
          return sak.u().begrensninger.map((b) => b.grunn);
        };
        expect(grunner('som utregnet'), 'kontrollsak').toEqual([]);
        expect(grunner('avslaatt')).toEqual([
          expect.stringContaining(`avslår fristen ${hvordan}, men godkjenner dager`),
        ]);
      }
    );
  });
});

/**
 * MM-U24 og MM-U30 med lukkingen i SK-01 og OV-U3 (#1050, #1067): et krav venter ikke på svar, og
 * et svar står ikke som ikke godtatt, når et svar eller en aksept i sporet ville blitt
 * avvist. Frafallet etter arbeidsvalget 20.10 i #1050: TE kan ikke godta et frafall
 * (GR-U9), og en ny påberopelsesversjon etter det venter på svar (GR-U23). I vederlag og
 * frist venter et ubesvart krav på svar, og et svar TE ikke har godtatt, står som det.
 */
describe('det som foreligger i et lukket spor og etter et frafall (#1050, #1067)', () => {
  type Sak = ReturnType<typeof sak>;
  const avslag = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const frafall = { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true };
  const utregnet = (s: Sak, spor: 'forhold' | 'vederlag', v: Data) => {
    const u = s.u();
    const krav = u.spor[spor].gjeldendeKrav!;
    const paaberopelse = u.spor.forhold.gjeldendeKrav;
    v = medKravpostIder(v, krav);
    return svar(
      spor,
      krav.id,
      v,
      regnUtSvar(spor, medFristen(v), { krav, paaberopelse }, KJERNE.regler)
    );
  };
  const godtar = (s: Sak, spor: 'forhold' | 'vederlag') =>
    s.send('TE', {
      type: 'aksept',
      spor,
      svar: s.u().spor[spor].gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
  const etiketter = (s: Sak, spor: 'forhold' | 'vederlag' | 'frist') =>
    visning(s.u(), GJELDENDE_REGLER).spor[spor].etiketter;

  it('SK-01: når TE godtar avslaget av forholdet, venter ubesvarte krav i vederlag og frist ikke på svar', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'forhold', avslag)] });
    for (const spor of KRAVSPOR) expect(venterPaaSvar(s.u(), spor), `kontroll: ${spor}`).toBe(true);
    godtar(s, 'forhold');
    expect(s.u().forholdAvvist, 'forutsetning: avslaget er godtatt').toBe(true);
    for (const spor of KRAVSPOR) {
      expect(venterPaaSvar(s.u(), spor), spor).toBe(false);
      expect(etiketter(s, spor), spor).not.toContain('venter_paa_svar');
    }
  });

  it('GR-U27: etter at TE har godtatt avslaget av forholdet, sier meldingen påberopelsen og forholdet (språkfila, #1953)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'forhold', avslag)] });
    godtar(s, 'forhold');
    expect(s.avvisning('TE', { type: 'trekk', spor: 'frist' })).toEqual({
      regel: 'FORHOLD_AVVIST',
      melding:
        'Totalentreprenøren har godtatt svaret på påberopelsen, som avslår forholdet, og saken er lukket.',
    });
  });

  it('SK-01: når TE godtar avslaget av forholdet i forløp A, står det subsidiære svaret i vederlaget ikke som ikke godtatt', () => {
    const s = sakMedKrav();
    s.send('BH', {
      type: 'brev',
      svar: [utregnet(s, 'forhold', avslag), utregnet(s, 'vederlag', VEDERLAG_DELVIS[0])],
    });
    const st = s.u().spor.vederlag.gjeldendeSvar!.standpunkter.find((p) => p.art === 'beloep')!;
    expect(standpunktetErSubsidiaert(s.u(), 'vederlag', st.id), 'MM-U9, OV-U32').toBe(true);
    expect(svarIkkeGodtatt(s.u(), 'vederlag'), 'kontroll: før aksepten').toBe(true);
    godtar(s, 'forhold');
    expect(svarIkkeGodtatt(s.u(), 'vederlag')).toBe(false);
  });

  it('GR-U9: et frafall står ikke som et svar TE ikke har godtatt, mens ubesvarte krav i vederlag og frist venter på svar (arbeidsvalget 20.10)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'forhold', frafall)] });
    expect(s.u().frafalt, 'forutsetning: pålegget er frafalt').toBe(true);
    expect(svarIkkeGodtatt(s.u(), 'forhold')).toBe(false);
    for (const spor of KRAVSPOR) expect(venterPaaSvar(s.u(), spor), spor).toBe(true);
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'vederlag', VEDERLAG_DELVIS[0])] });
    expect(svarIkkeGodtatt(s.u(), 'vederlag'), 'et svar i vederlaget TE ikke har godtatt').toBe(
      true
    );
  });

  it('GR-U23: en ny påberopelsesversjon etter frafallet venter på svar', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [utregnet(s, 'forhold', frafall)] });
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold },
    });
    expect(s.u().frafalt, 'forutsetning: frafallet står (GR-U23)').toBe(true);
    expect(venterPaaSvar(s.u(), 'forhold')).toBe(true);
    expect(svarIkkeGodtatt(s.u(), 'forhold')).toBe(false);
    expect(etiketter(s, 'forhold')).toContain('venter_paa_svar');
  });
});

/**
 * MM-U34 punkt 9, 11 og 20, EO-U12 og GR-U27: en registrert enighet sperrer ikke en ny
 * kravversjon eller et nytt svar fram til endringsordren, og endringsordren krever ikke
 * registrert enighet. Arbeidsvalg 3 i #1376: etter en ny kravversjon er den registrerte
 * enigheten ikke enighet om det gjeldende kravet.
 */
describe('en registrert enighet sperrer ikke ny kravversjon eller nytt svar (MM-U34)', () => {
  type Sak = ReturnType<typeof sak>;
  type Sporet = 'forhold' | 'vederlag' | 'frist';
  const utregnet = (s: Sak, spor: Sporet, v: Data) => {
    const u = s.u();
    const krav = gjeldendeKrav(u, spor);
    v = medKravpostIder(v, krav);
    return svar(
      spor,
      krav.id,
      v,
      regnUtSvar(
        spor,
        medFristen(v),
        { krav, paaberopelse: u.spor.forhold.gjeldendeKrav },
        KJERNE.regler
      )
    );
  };
  const brev = (s: Sak, spor: Sporet, v: Data) =>
    s.send('BH', { type: 'brev', svar: [utregnet(s, spor, v)] });
  const revisjon = (s: Sak, spor: Sporet, v: Data) => ({
    type: 'revisjon',
    erstatter: s.u().spor[spor].gjeldendeSvar!.id,
    svar: utregnet(s, spor, v),
  });
  const godta = (s: Sak, spor: Sporet) =>
    s.send('TE', {
      type: 'aksept',
      spor,
      svar: s.u().spor[spor].gjeldendeSvar!.id,
      regelversjon: KJERNE.regler.versjon,
    });
  /** 10 av 20 dager, så svaret ikke stemmer med kravet. */
  const tiDager = { ...FRIST_FULLT[0], dager: 10 };
  const nyttFristkrav = {
    type: 'krav',
    spor: 'frist',
    innhold: { frister: [{ navn: 'Sluttfristen', dager: 15 }] },
    utdypning: 'Pelingen tar tre uker lenger.',
  };
  const godkjentForhold = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };

  /** Fristsvaret godtatt av TE, mens vederlaget står åpent, så kravene ikke er avgjort (OV-U3). */
  const medGodtattFristsvar = () => {
    const s = sakMedKrav();
    brev(s, 'frist', tiDager);
    godta(s, 'frist');
    const u = s.u();
    expect(u.spor.frist.enighet, 'forutsetning: enighet ved aksept').not.toBeNull();
    expect(kraveneErAvgjort(u), 'forutsetning: kravene er ikke avgjort').toBe(false);
    return s;
  };
  /** Fristsvaret stemmer med kravet, så partene er enige ved sammenfall (GR-U7). */
  const medSammenfallIFristen = () => {
    const s = sakMedKrav();
    brev(s, 'frist', FRIST_FULLT[0]);
    expect(s.u().spor.frist.enighet, 'forutsetning: enighet ved sammenfall').not.toBeNull();
    return s;
  };

  it('TE kan sende en ny kravversjon i et spor med enighet ved aksept eller sammenfall, og saken er forstått (MM-U34 punkt 9)', () => {
    for (const s of [medGodtattFristsvar(), medSammenfallIFristen()]) {
      expect(s.avvist('TE', nyttFristkrav)).toBeNull();
      s.send('TE', nyttFristkrav);
      expect(s.u().forstaatt).toBe(true);
    }
  });

  it('TE kan sende en ny påberopelsesversjon når godkjenningen av forholdet gir enighet (MM-U34 punkt 9, EO-U12)', () => {
    const s = sakMedKrav();
    brev(s, 'forhold', godkjentForhold);
    expect(s.u().spor.forhold.enighet, 'forutsetning: enighet ved sammenfall').not.toBeNull();
    expect(s.u().endringsordre, 'forutsetning: godkjenningen er en endringsordre').toBe('ja');
    expect(
      s.avvist('TE', {
        ...PAABEROPELSE,
        innhold: { ...PAABEROPELSE.innhold },
      })
    ).toBeNull();
  });

  it('etter en ny påberopelsesversjon kan TE fortsatt ikke trekke forholdet når en godkjenning av det var en endringsordre (EO-U12, KA-U13)', () => {
    const s = sakMedKrav();
    brev(s, 'forhold', godkjentForhold);
    const trekk = { type: 'trekk', spor: 'forhold' };
    expect(s.avvist('TE', trekk), 'kontrollsak: sperret før den nye versjonen').toBe(
      'FORHOLD_ER_ENDRINGSORDRE'
    );
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold },
    });
    expect(
      s.u().spor.forhold.gjeldendeSvar,
      'forutsetning: ingen svar på den nye versjonen'
    ).toBeNull();
    expect(s.u().endringsordre).toBe('ja');
    expect(s.avvist('TE', trekk)).toBe('FORHOLD_ER_ENDRINGSORDRE');
  });

  it('etter en ny kravversjon er enigheten ikke enighet om det gjeldende kravet, sporet venter på svar, og aksepten står i journalen (arbeidsvalg 3 i #1376, MM-U34 punkt 2)', () => {
    const s = sakMedKrav();
    brev(s, 'frist', tiDager);
    const svaret = s.u().spor.frist.gjeldendeSvar!.id;
    const rad = godta(s, 'frist');
    const aksept = (rad.data.utsagn as { id: string; art: string }[]).find(
      (x) => x.art === 'aksept'
    )!.id;
    expect(s.u().spor.frist.enighet?.grunnlag.kilde, 'forutsetning').toBe('aksept');
    s.send('TE', nyttFristkrav);
    const u = s.u();
    expect(u.forstaatt).toBe(true);
    expect(u.spor.frist.enighet).toBeNull();
    expect(u.spor.frist.gjeldendeSvar).toBeNull();
    expect(visning(u, GJELDENDE_REGLER).spor.frist.etiketter).toContain('venter_paa_svar');
    expect(
      u.spor.frist.svar.map((x) => x.id),
      'det godtatte svaret står i sporet'
    ).toContain(svaret);
    expect(u.elementer[aksept], 'aksepten står i journalen').toBeDefined();
  });

  it('byggherren kan revidere et svar TE har godtatt, og saken er forstått (MM-U34 punkt 11)', () => {
    const s = medGodtattFristsvar();
    const heving = revisjon(s, 'frist', { ...tiDager, dager: 15 });
    expect(s.avvist('BH', heving)).toBeNull();
    s.send('BH', heving);
    expect(s.u().forstaatt).toBe(true);
  });

  it('byggherren kan revidere et svar som stemmer med kravet (MM-U34 punkt 11)', () => {
    const s = medSammenfallIFristen();
    expect(s.avvist('BH', revisjon(s, 'frist', FRIST_FULLT[0]))).toBeNull();
  });

  it('byggherren kan revidere en godkjenning av forholdet som er en endringsordre, og saken er forstått (EO-U12, MM-U34 punkt 11)', () => {
    const s = sakMedKrav();
    brev(s, 'forhold', godkjentForhold);
    expect(s.u().endringsordre, 'forutsetning: godkjenningen er en endringsordre').toBe('ja');
    const ny = revisjon(s, 'forhold', godkjentForhold);
    expect(s.avvist('BH', ny)).toBeNull();
    s.send('BH', ny);
    expect(s.u().forstaatt).toBe(true);
  });

  it('byggherren kan revidere et svar TE har godtatt, også med lavere beløp, og saken er forstått (MM-U34 punkt 4 og 11)', () => {
    const s = sakMedKrav();
    const delvis = (beloep: number) => ({
      ...P1({ vurdering: 'delvis', godkjent_beloep: beloep, aksepterer: true }),
    });
    brev(s, 'vederlag', delvis(100000));
    godta(s, 'vederlag');
    expect(s.u().spor.vederlag.enighet, 'forutsetning: enighet ved aksept').not.toBeNull();
    const senking = revisjon(s, 'vederlag', delvis(80000));
    expect(s.avvist('BH', senking)).toBeNull();
    s.send('BH', senking);
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.spor.vederlag.svar, 'det godtatte svaret står i sporet (MM-U12, MM-U50)').toHaveLength(
      2
    );
  });

  const avslag = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };
  const frafall = { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true };
  /** Godkjenningen av forholdet, som er en endringsordre (GR-U14), og brevet med den. */
  const medEndringsordre = () => {
    const s = sakMedKrav();
    const godkjenningen = brev(s, 'forhold', godkjentForhold);
    expect(s.u().endringsordre, 'forutsetning: godkjenningen er en endringsordre').toBe('ja');
    // Punktet om forholdet, etter innledningen og punktet om varselet (LV-U34).
    return { s, godkjenningen, tekst: laast(godkjenningen)[2] };
  };
  // GR-U32; «NS 8407» står i punktet om varselet foran (LV-U39).
  const endringsordreIBrevet = 'Svaret er en endringsordre etter punkt\u00a032.3 første ledd a';

  it.each([
    ['avslag', avslag],
    ['frafall', frafall],
  ])(
    'etter at byggherren har revidert en godkjenning av forholdet som er en endringsordre, til %s, kan TE fortsatt ikke trekke forholdet (EO-U12, KA-U13)',
    (_n, v) => {
      const trekk = { type: 'trekk', spor: 'forhold' };
      const kontroll = sakMedKrav();
      brev(kontroll, 'forhold', v);
      expect(kontroll.avvist('TE', trekk), 'kontrollsak: uten godkjenningen').toBeNull();
      const { s } = medEndringsordre();
      s.send('BH', revisjon(s, 'forhold', v));
      const u = s.u();
      expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
      expect(u.endringsordre).toBe('ja');
      expect(s.avvist('TE', trekk)).toBe('FORHOLD_ER_ENDRINGSORDRE');
    }
  );

  it('godkjenning som er en endringsordre, revisjon til avslag og TEs aksept av avslaget lukker saken, uten at endringsordren leses som bortfalt, og brevet med godkjenningen sier fortsatt at den er en endringsordre (GR-U27, EO-U12, MM-U12 (opphevet av MM-U50))', () => {
    const { s, godkjenningen, tekst } = medEndringsordre();
    expect(tekst).toContain(endringsordreIBrevet);
    s.send('BH', revisjon(s, 'forhold', avslag));
    godta(s, 'forhold');
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.forholdAvvist).toBe(true);
    expect(kanInngaaIEo(u)).toBe(false);
    expect(u.endringsordre).toBe('ja');
    const lagret = s.journal.find((r) => r.event_id === godkjenningen.event_id)!;
    expect(laast(lagret)[2]).toBe(tekst);
  });

  it('godkjenning som er en endringsordre, revisjon til avslag og en ny påberopelsesversjon fra TE: endringsordren leses ikke som bortfalt, og brevet med godkjenningen står uendret (EO-U12, MM-U12 (opphevet av MM-U50))', () => {
    const { s, godkjenningen, tekst } = medEndringsordre();
    s.send('BH', revisjon(s, 'forhold', avslag));
    s.send('TE', {
      ...PAABEROPELSE,
      innhold: { ...PAABEROPELSE.innhold },
    });
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.forholdAvvist).toBe(false);
    expect(u.endringsordre).toBe('ja');
    expect(s.avvist('TE', { type: 'trekk', spor: 'forhold' })).toBe('FORHOLD_ER_ENDRINGSORDRE');
    const lagret = s.journal.find((r) => r.event_id === godkjenningen.event_id)!;
    expect(laast(lagret)[2]).toBe(tekst);
    expect(tekst).toContain(endringsordreIBrevet);
  });

  it('kontrollsak: TE kan fortsatt ikke godta et svar med registrert enighet (GR-U8)', () => {
    const s = medSammenfallIFristen();
    expect(
      s.avvist('TE', {
        type: 'aksept',
        spor: 'frist',
        svar: s.u().spor.frist.gjeldendeSvar!.id,
        regelversjon: KJERNE.regler.versjon,
      })
    ).toBe('ENIGHET_I_SPORET');
  });

  describe('saken kan inngå i en endringsordre når forholdet er sendt (MM-U34 punkt 20, GR-U27, GR-U28)', () => {
    it('også uten registrert enighet i noe spor, men ikke før forholdet er sendt (MM-U34 punkt 20)', () => {
      const s = sak();
      expect(kanInngaaIEo(s.u()), 'kontrollsak: grunnlaget er ikke sendt').toBe(false);
      s.send('TE', PAABEROPELSE);
      expect(kanInngaaIEo(s.u())).toBe(true);
      const u = sakMedKrav().u();
      expect(['forhold', 'vederlag', 'frist'].map((n) => u.spor[n as Sporet].enighet)).toEqual([
        null,
        null,
        null,
      ]);
      expect(kanInngaaIEo(u)).toBe(true);
    });

    it('ikke når TE har godtatt avslaget på forholdet (GR-U27, MM-U34 punkt 20)', () => {
      const s = sakMedKrav();
      brev(s, 'forhold', { resultat: 'avslaatt', grunnlag_varslet_i_tide: true });
      expect(kanInngaaIEo(s.u()), 'kontrollsak: avslaget er ikke godtatt').toBe(true);
      godta(s, 'forhold');
      expect(s.u().forholdAvvist, 'forutsetning').toBe(true);
      expect(kanInngaaIEo(s.u())).toBe(false);
    });

    it('ikke når TE har trukket forholdet (GR-U27, MM-U34 punkt 20)', () => {
      const s = sakMedKrav();
      expect(kanInngaaIEo(s.u()), 'kontrollsak').toBe(true);
      s.send('TE', { type: 'trekk', spor: 'forhold' });
      expect(kanInngaaIEo(s.u())).toBe(false);
    });

    it('også når byggherren har frafalt pålegget etter § 32.3 c (GR-U28)', () => {
      const s = sakMedKrav();
      brev(s, 'forhold', { resultat: 'paalegg_frafalt', grunnlag_varslet_i_tide: true });
      expect(s.u().frafalt, 'forutsetning').toBe(true);
      expect(kanInngaaIEo(s.u())).toBe(true);
    });
  });
});

/**
 * HF-U29 punkt 8: senker byggherren i et nytt svar dager eller beløp byggherren har godkjent,
 * viser visningen det tidligere svaret og, for fristen, punkt 33.7 annet ledd. Svarene 14.11 i
 * HF-U30–HF-U32: samme kravversjon, hver kravpost og frist mot svaret det erstatter, og
 * prinsipalt og subsidiært hver for seg.
 */
describe('senkningen i et nytt svar (HF-U29 punkt 8)', () => {
  const revisjon = (s: ReturnType<typeof sakMedKrav>, nytt: Data) => ({
    type: 'revisjon',
    erstatter: s.u().spor[nytt.spor as 'vederlag' | 'frist'].gjeldendeSvar!.id,
    svar: nytt,
  });
  const vederlag = (s: ReturnType<typeof sakMedKrav>, beloep: number) =>
    svar(
      'vederlag',
      s.krav('vederlag'),
      P1({ vurdering: 'delvis', godkjent_beloep: beloep, aksepterer: true }),
      { resultat: 'delvis_godkjent', godkjent_beloep: beloep }
    );
  const frist = (s: ReturnType<typeof sakMedKrav>, dager: number, iTide = true) =>
    svar(
      'frist',
      s.krav('frist'),
      { ...FRIST_FULLT[0], frist_varsel_ok: iTide, dager },
      iTide
        ? { resultat: 'delvis_godkjent', godkjent_dager: dager }
        : { resultat: 'avslaatt', godkjent_dager: 0 }
    );
  const senkning = (s: ReturnType<typeof sakMedKrav>, spor: 'vederlag' | 'frist') =>
    visning(s.u(), KJERNE.regler).spor[spor].senkning;

  it('et lavere beløp for en kravpost med fast sum viser det tidligere svaret, uten bestemmelse (HF-U31)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [vederlag(s, 100000)] });
    const tidligere = s.u().spor.vederlag.gjeldendeSvar!.id;
    s.send('BH', revisjon(s, vederlag(s, 80000)));
    expect(senkning(s, 'vederlag')).toEqual({
      tidligereSvar: tidligere,
      senket: [{ gjelder: p1I(s), lag: 1, foer: 100000, naa: 80000 }],
      justeringIkkeGodtatt: [],
      bestemmelse: null,
    });
  });

  it('et høyere beløp senker ingenting (kontrollsak)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [vederlag(s, 100000)] });
    s.send('BH', revisjon(s, vederlag(s, 110000)));
    expect(senkning(s, 'vederlag')).toBeNull();
  });

  it('færre dager for fristen viser punkt 33.7 annet ledd', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [frist(s, 15)] });
    s.send('BH', revisjon(s, frist(s, 10)));
    expect(senkning(s, 'frist')).toMatchObject({
      senket: [{ lag: 1, foer: 15, naa: 10 }],
      bestemmelse: '33.7',
    });
  });

  it('dager godkjent prinsipalt som nå bare står subsidiært, er senket prinsipalt, ikke subsidiært (HF-U32)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [frist(s, 15)] });
    s.send('BH', revisjon(s, frist(s, 15, false)));
    expect(senkning(s, 'frist')?.senket).toEqual([
      {
        gjelder: innholdIFristen(s.u().spor.frist.gjeldendeKrav!).frister[0]!.id,
        lag: 1,
        foer: 15,
        naa: 0,
      },
    ]);
  });

  it('i svar med like mange lag sammenliknes hvert lag, også det subsidiære (HF-U32)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [frist(s, 15, false)] });
    s.send('BH', revisjon(s, frist(s, 10, false)));
    expect(senkning(s, 'frist')?.senket).toMatchObject([{ lag: 2, foer: 15, naa: 10 }]);
  });

  it('et tilbud som ikke lenger er akseptert, er senket, og svaret tar ikke stilling til beløpet (HF-U29 punkt 8, KA-U72, OV-U73)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [vederlag(s, 100000)] });
    s.send(
      'BH',
      revisjon(
        s,
        svar(
          'vederlag',
          s.krav('vederlag'),
          P1({ aksepterer: false, oensket_oppgjoersform: 'regningsarbeid' }),
          { resultat: 'delvis_godkjent', godkjent_beloep: 0 }
        )
      )
    );
    expect(senkning(s, 'vederlag')?.senket).toEqual([
      { gjelder: p1I(s), lag: 1, foer: 100000, naa: null },
    ]);
  });

  it('mot svaret det erstatter, ikke det høyeste: 100 000, 60 000 og så 80 000 viser senkningen bare ved det andre (HF-U31)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [vederlag(s, 100000)] });
    s.send('BH', revisjon(s, vederlag(s, 60000)));
    expect(senkning(s, 'vederlag')).not.toBeNull();
    s.send('BH', revisjon(s, vederlag(s, 80000)));
    expect(senkning(s, 'vederlag')).toBeNull();
  });

  it('et svar på en ny kravversjon sammenliknes ikke med svaret på den tidligere (HF-U30)', () => {
    const s = sakMedKrav();
    s.send('BH', { type: 'brev', svar: [vederlag(s, 100000)] });
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(120000) });
    s.send('BH', { type: 'brev', svar: [vederlag(s, 50000)] });
    expect(s.u().spor.vederlag.gjeldendeSvar!.erstatter).toBeNull();
    expect(senkning(s, 'vederlag')).toBeNull();
  });
});
