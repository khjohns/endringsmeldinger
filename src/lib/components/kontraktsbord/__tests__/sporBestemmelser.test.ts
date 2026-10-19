import { describe, it, expect } from 'vitest';
import { sporBestemmelser } from '../utils';
import { KRAV_STRUKTUR_NS8407 } from '$lib/constants/categories';

const refs = (underkategori: string | string[] | null | undefined) =>
  sporBestemmelser('ansvar', underkategori).map((b) => b.ref);

// Forventningen er hjemmelen kategorien bygger på (`hjemmel_basis` i KRAV_STRUKTUR_NS8407), #946.
describe('bestemmelsene under ansvar følger sakens underkategori (#946)', () => {
  it('irregulær endring viser § 32.1, ikke § 23.1', () => {
    expect(refs('IRREG')).toEqual(['§ 32.1']);
  });

  it('uforutsette grunnforhold viser § 23.1', () => {
    expect(refs('GRUNN')).toEqual(['§ 23.1']);
  });

  it('endringsordre viser § 31.3', () => {
    expect(refs('EO')).toEqual(['§ 31.3']);
  });

  it('flere underkategorier: den første avgjør, slik getHjemmelObj velger', () => {
    expect(refs(['IRREG', 'GRUNN'])).toEqual(['§ 32.1']);
  });

  it.each([undefined, null, '', 'UKJENT', 'FORCE_MAJEURE'])(
    'underkategori %s uten hjemmel gir ingen bestemmelse, ikke en fast liste',
    (underkategori) => {
      expect(refs(underkategori)).toEqual([]);
    }
  );

  it.each(KRAV_STRUKTUR_NS8407.flatMap((f) => f.hjemler))(
    'underkategorien $kode har tittel og regeltekst for § $hjemmel_basis',
    (hjemmel) => {
      const [b] = sporBestemmelser('ansvar', hjemmel.kode);
      expect(b?.ref).toBe(`§ ${hjemmel.hjemmel_basis}`);
      expect(b?.title).toBeTruthy();
      expect(b?.text).toBeTruthy();
    }
  );

  it('vederlag og frist er uavhengige av underkategorien', () => {
    expect(sporBestemmelser('vederlag', 'IRREG')).toEqual(sporBestemmelser('vederlag', 'GRUNN'));
    expect(sporBestemmelser('frist', 'IRREG')).toEqual(sporBestemmelser('frist', 'GRUNN'));
  });
});
