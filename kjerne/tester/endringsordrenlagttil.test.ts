/**
 * Byggherrens egen endringsordre lagt til som svar på forholdet, med kommandoen `brev` eller
 * `revisjon` og `sendt` (BF-49 punkt 6, G-10). Forventningene er D-11 i BF-49, OV-U6, OV-U124 og
 * arbeidsvalget om kodene i #807 (7218847960).
 */
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SOM_BREV } from './brevet.ts';
import { dagenEtterSisteRad, PAABEROPELSE, sak, sakMedKrav, svar, type Data } from './brevsak.ts';

const GODKJENT = { resultat: 'godkjent', grunnlag_varslet_i_tide: true };
const AVSLAATT = { resultat: 'avslaatt', grunnlag_varslet_i_tide: true };

type Sak = ReturnType<typeof sak>;

const paaberopt = (innhold: Data = PAABEROPELSE.innhold) => {
  const s = sak();
  s.send('TE', { ...PAABEROPELSE, innhold });
  return s;
};

const lagtTil = (s: Sak, svarene: Data[], ekstra: Data = {}): Data => ({
  type: 'brev',
  svar: svarene,
  sendt: dagenEtterSisteRad(s),
  ...SOM_BREV,
  dokumentasjon: [randomUUID()],
  ...ekstra,
});

const paaForholdet = (s: Sak, vurderinger: Data, gjelder = s.krav('forhold')) =>
  svar('forhold', gjelder, vurderinger, {}, null);

const EO = { endringsordre: true };

describe('byggherrens endringsordre lagt til som svar på forholdet (D-11 i BF-49, OV-U6)', () => {
  it('en godkjenning uten påberopt preklusjon i en underkategori der § 32.2 gjelder, lagres med opplysningen om § 31.3, og utledningen godtar den (OV-U6)', () => {
    const s = paaberopt();
    const rad = s.send('BH', lagtTil(s, [paaForholdet(s, GODKJENT)], EO));
    const opplysninger = rad.data.opplysninger as Data[];
    expect(opplysninger.filter((o) => o.hva === 'endringsordre')).toEqual([
      { id: expect.any(String), hva: 'endringsordre', oppfylt: true },
    ]);
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.utenVirkning).toEqual([]);
    expect(u.spor.forhold.gjeldendeSvar?.dokument).toBe(rad.event_id);
  });

  it('et avslag med endringsordren avvises med UGYLDIG_VURDERING, og samme avslag uten den godtas (OV-U6, #807 7218847960)', () => {
    const s = paaberopt();
    const avvisning = s.avvisning('BH', lagtTil(s, [paaForholdet(s, AVSLAATT)], EO));
    expect(avvisning?.regel).toBe('UGYLDIG_VURDERING');
    expect(avvisning?.melding).toContain('ikke en endringsordre etter punkt 31.3');
    expect(s.avvist('BH', lagtTil(s, [paaForholdet(s, AVSLAATT)])), 'kontrollsak').toBeNull();
  });

  it('en godkjenning i en underkategori der § 32.2 ikke gjelder, avvises med UGYLDIG_VURDERING (OV-U6)', () => {
    const s = paaberopt({
      hovedkategori: 'svikt',
      underkategori: 'grunnforhold',
      klar_over_forholdet: '2026-09-20',
    });
    expect(s.avvist('BH', lagtTil(s, [paaForholdet(s, { resultat: 'godkjent' })], EO))).toBe(
      'UGYLDIG_VURDERING'
    );
    expect(
      s.avvist('BH', lagtTil(s, [paaForholdet(s, { resultat: 'godkjent' })])),
      'kontrollsak'
    ).toBeNull();
  });

  it('endringsordren i et brev sendt fra løsningen, eller i et brev uten svar på forholdet, avvises som form (D-11 i BF-49)', () => {
    const s = paaberopt();
    const fraLoesningen = {
      type: 'brev',
      svar: [{ ...paaForholdet(s, GODKJENT), utdypning: 'Begrunnelse.' }],
      ...EO,
    };
    const utenSendt = s.avvisning('BH', fraLoesningen);
    expect(utenSendt?.regel).toBe('UGYLDIG_FORM');
    expect(utenSendt?.melding).toContain('$.endringsordre: bare et svar lagt til');
    const k = sakMedKrav();
    const iVederlaget = k.avvisning(
      'BH',
      lagtTil(k, [svar('vederlag', k.krav('vederlag'), {}, {}, null)], EO)
    );
    expect(iVederlaget?.regel).toBe('UGYLDIG_FORM');
    expect(iVederlaget?.melding).toContain('brevet har ikke noe svar på forholdet');
  });

  it('endringsordren som svar på et krav som står som dokumentasjon, avvises med FEIL_KRAVREFERANSE og beskjeden etter OV-U124', () => {
    const s = paaberopt();
    const dokumentasjon = s.send('TE', {
      type: 'registrert_brev',
      ...SOM_BREV,
      spor: ['forhold'],
      sendt: dagenEtterSisteRad(s),
      beskrivelse: 'Totalentreprenørens brev om endringen',
      dokumentasjon: [randomUUID()],
    });
    const avvisning = s.avvisning(
      'BH',
      lagtTil(s, [paaForholdet(s, GODKJENT, dokumentasjon.event_id)], EO)
    );
    expect(avvisning?.regel).toBe('FEIL_KRAVREFERANSE');
    expect(avvisning?.melding).toContain(
      'Totalentreprenøren må ha sendt kravet fra løsningen eller lagt det til som krav'
    );
  });

  it('endringsordren godtas som svar på en påberopelse totalentreprenøren har lagt til som krav (OV-U124)', () => {
    const s = sak();
    s.send('TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: PAABEROPELSE.innhold,
      sendt: '2026-10-01',
      ...SOM_BREV,
      dokumentasjon: [randomUUID()],
    });
    s.send('BH', lagtTil(s, [paaForholdet(s, GODKJENT)], EO));
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.utenVirkning).toEqual([]);
  });

  it('endringsordren godtas som nytt svar etter et svar byggherren har lagt til som svar (OV-U124)', () => {
    const s = paaberopt();
    const foerste = s.send('BH', lagtTil(s, [paaForholdet(s, AVSLAATT)]));
    const rad = s.send('BH', {
      type: 'revisjon',
      erstatter: (foerste.data.svar as Data[])[0]!.id,
      svar: paaForholdet(s, GODKJENT),
      sendt: dagenEtterSisteRad(s),
      ...SOM_BREV,
      dokumentasjon: [randomUUID()],
      ...EO,
    });
    expect((rad.data.opplysninger as Data[]).some((o) => o.hva === 'endringsordre')).toBe(true);
    const u = s.u();
    expect(u.forstaatt, JSON.stringify(u.begrensninger)).toBe(true);
    expect(u.spor.forhold.gjeldendeSvar?.dokument).toBe(rad.event_id);
  });
});
