import { describe, expect, it } from 'vitest';
import { KORRESPONDANSETYPER, SENDEMAATER } from '$kjerne/typer';
import { korrespondansemangler, registreringen, tomKorrespondanse } from '../korrespondansen';
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
      sendemaate: KORRESPONDANSEN.mangler.sendemaate,
      beskrivelse: KORRESPONDANSEN.mangler.beskrivelse,
    });
    expect(korrespondansemangler({ ...fylt(), type: 'moetereferat', sendemaate: null })).toEqual(
      {}
    );
  });

  it('dokumentet mangler ikke når det ikke kan legges ved ennå (skjemaet for ny sak, #1488)', () => {
    const v = { ...fylt(), vedlegg: [] };
    expect(korrespondansemangler(v)).toEqual({ dokument: KORRESPONDANSEN.mangler.dokument });
    expect(korrespondansemangler(v, { dokument: false })).toEqual({});
  });
});
