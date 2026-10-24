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

// Kilden er NS 8407 § 34.1.1–34.1.3 og kontraktsgrunnlaget Del II pkt. B.2.16 (OV-U25),
// med ordlyden oppdragsgiver godkjente 24.10 i #1267.
describe('bestemmelsene under vederlag avgrenser varslingsplikten (#1267)', () => {
  const vederlag = (ref: string) => sporBestemmelser('vederlag').find((b) => b.ref === ref);

  it('§ 34.1 viser til § 31 og § 32, ikke kapittel V', () => {
    expect(vederlag('§ 34.1')?.text).toContain('endring etter § 31 eller § 32');
    expect(vederlag('§ 34.1')?.text).not.toContain('kapittel V');
  });

  it('§ 34.1 avgrenser varslingsplikten til § 34.1.2 og holder endringer etter § 34.1.1 utenfor', () => {
    const note = vederlag('§ 34.1')?.note;
    expect(note).toContain('Varslingsplikten etter § 34.1.2');
    expect(note).toContain('ikke endringer etter § 34.1.1');
    expect(note).not.toMatch(/^Kravet om vederlagsjustering må varsles/);
  });

  it('§ 34.1.3 har ikke «varsel» i overskriften', () => {
    expect(vederlag('§ 34.1.3')?.title).toBe('Særskilt justering — rigg, drift og produktivitet');
  });

  it('§ 34.1.3 krever særskilt varsel bare for annet ledd, etter B.2.16, ikke for rigg og drift', () => {
    const b = vederlag('§ 34.1.3');
    expect(b?.text).toContain('Del II pkt. B.2.16');
    expect(b?.text).toContain('bare kravet etter annet ledd');
    expect(b?.note).toContain('Kravet etter første ledd har ingen særskilt varslingsplikt');
    expect(`${b?.text} ${b?.note}`).not.toMatch(/rigg og drift skal varsles/);
  });
});
