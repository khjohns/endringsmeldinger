import { describe, expect, it } from 'vitest';
import { KORRESPONDANSETYPER, SENDEMAATER } from '$kjerne/typer';
import { formfeil } from '$kjerne/kommandoer/kommando';
import {
  korrespondansemangler,
  lagtTil,
  registreringen,
  tomKorrespondanse,
} from '../korrespondansen';
import { KORRESPONDANSEN } from '../tekster';

const fylt = () => ({
  ...tomKorrespondanse(),
  type: 'brev' as const,
  sendemaate: 'post' as const,
  dato: '2026-10-05',
  vedlegg: [
    { vedlegg_id: 'v-1', filnavn: 'varsel.pdf', innhold_sha256: '0'.repeat(64), stoerrelse: 10 },
  ],
  beskrivelse: '  Varsel om forsinket tegning. ',
});

describe('varselet sendt utenfor løsningen, i den felles komponenten (OV-U79)', () => {
  it('tilbyr alle typene og sendemåtene kjernen kjenner (A1 i #2056)', () => {
    expect(KORRESPONDANSEN.typer.map((t) => t.verdi)).toEqual([...KORRESPONDANSETYPER]);
    expect(KORRESPONDANSEN.sendemaater.map((t) => t.verdi)).toEqual([...SENDEMAATER]);
  });

  it('et brev sendes med typen, sendemåten, datoen, dokumentet og beskrivelsen uten mellomrom rundt', () => {
    expect(registreringen(fylt())).toEqual({
      sendt: '2026-10-05',
      korrespondansetype: 'brev',
      sendemaate: 'post',
      beskrivelse: 'Varsel om forsinket tegning.',
      dokumentasjon: ['v-1'],
    });
  });

  it('sendemåten følger ikke med når typen er endret fra brev til e-post, for bare et brev har den', () => {
    const v = { ...fylt(), type: 'e_post' as const };
    expect(registreringen(v)).not.toHaveProperty('sendemaate');
    expect(korrespondansemangler(v)).toEqual({});
  });

  it('sendemåten mangler bare for et brev, og beskrivelsen med bare mellomrom mangler', () => {
    expect(korrespondansemangler({ ...fylt(), sendemaate: null, beskrivelse: ' ' })).toEqual({
      sendemaate: KORRESPONDANSEN.mangler('varsel').sendemaate,
      beskrivelse: KORRESPONDANSEN.mangler('varsel').beskrivelse,
    });
    expect(korrespondansemangler({ ...fylt(), type: 'moetereferat', sendemaate: null })).toEqual(
      {}
    );
  });

  it('dokumentet mangler ikke når det ikke kan legges ved ennå (skjemaet for ny sak, #1488)', () => {
    const v = { ...fylt(), vedlegg: [] };
    expect(korrespondansemangler(v)).toEqual({
      dokument: KORRESPONDANSEN.mangler('varsel').dokument,
    });
    expect(korrespondansemangler(v, { dokument: false })).toEqual({});
  });
});

describe('kravet, svaret og aksepten lagt til med korrespondansen (OV-U80, OV-U98)', () => {
  const registrert = {
    sendt: '2026-10-05',
    korrespondansetype: 'brev',
    sendemaate: 'post',
    beskrivelse: 'Varsel om forsinket tegning.',
    dokumentasjon: ['v-1'],
  };

  it('kravet mister utdypningen, forbeholdet og varselet, som løsningen skriver i brevet (KA-U24), og kjernen godtar formen', () => {
    const krav = {
      type: 'krav' as const,
      spor: 'frist',
      innhold: { frister: [{ frist_id: 1, dager: 25 }] },
      utdypning: 'Begrunnelsen.',
      utdypninger: { a: 'b' },
      forbehold: 'Forbeholdet.',
      varsel: { sendt: '2026-10-01' },
    };
    const ut = lagtTil(krav, fylt());
    expect(ut).toEqual({ type: 'krav', spor: 'frist', innhold: krav.innhold, ...registrert });
    expect(formfeil(ut)).toEqual([]);
    // Kontrollsak: med utdypningen avviser kjernen kravet.
    expect(formfeil({ ...ut, utdypning: 'x' })).not.toEqual([]);
  });

  it('svaret i et brev og i en revisjon mister begrunnelsen og forbeholdet, og resten står', () => {
    const svar = {
      spor: 'frist',
      gjelder: 'k-1',
      utdypning: 'f',
      utdypninger: { p: 'b' },
      resultat: {},
    };
    expect(lagtTil({ type: 'brev', svar: [svar] }, fylt()).svar).toEqual([
      { spor: 'frist', gjelder: 'k-1', resultat: {} },
    ]);
    expect(lagtTil({ type: 'revisjon', erstatter: 's-1', svar }, fylt()).svar).toEqual({
      spor: 'frist',
      gjelder: 'k-1',
      resultat: {},
    });
  });

  it('aksepten får datoen og dokumentet og ellers det samme', () => {
    expect(
      lagtTil({ type: 'aksept', spor: 'frist', svar: 's-1', regelversjon: 3 }, fylt())
    ).toEqual({ type: 'aksept', spor: 'frist', svar: 's-1', regelversjon: 3, ...registrert });
  });
});
