import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { load as redigerGrunnlag } from './rediger-grunnlag/+page';
import { load as sendFrist } from './send-frist/+page';
import { load as sendVederlag } from './send-vederlag/+page';
import { load as svarFrist } from './svar-frist/+page';
import { load as svarGrunnlag } from './svar-grunnlag/+page';
import { load as svarVederlag } from './svar-vederlag/+page';
import { load as spor } from './[spor]/+page';

type Last = (hendelse: never) => unknown;

function maal(last: Last, params: Record<string, string>, sok = ''): string {
  try {
    last({ params, url: new URL(`http://localhost/P001/KOE-1/x${sok}`) } as never);
  } catch (e) {
    if (isRedirect(e)) return e.location;
    throw e;
  }
  throw new Error('Ingen omdirigering');
}

const p = { prosjektId: 'P001', sakId: 'KOE-1' };

describe('omdirigeringene til skjemaene (S3 i #1414)', () => {
  it.each([
    ['send-vederlag', sendVederlag, 'spor=vederlag&mode=form&rolle=TE'],
    ['send-frist', sendFrist, 'spor=frist&mode=form&rolle=TE'],
    ['rediger-grunnlag', redigerGrunnlag, 'spor=ansvar&mode=form&rolle=TE'],
    ['svar-grunnlag', svarGrunnlag, 'spor=ansvar&mode=form&rolle=BH'],
    ['svar-frist', svarFrist, 'spor=frist&mode=form&rolle=BH'],
    ['svar-vederlag', svarVederlag, 'spor=vederlag&mode=form&rolle=BH'],
  ])('%s fører til skjemaet på /kjerne, der skjemaene står', (_navn, last, sok) => {
    expect(maal(last as Last, p)).toBe(`/P001/KOE-1/kjerne?${sok}`);
  });

  it('beholder parametrene i adressen, som scenario', () => {
    expect(maal(sendFrist as Last, p, '?scenario=s1')).toBe(
      '/P001/KOE-1/kjerne?scenario=s1&spor=frist&mode=form&rolle=TE'
    );
  });

  it('sporadressen leses fortsatt i Varden på saksadressen (S4 og S5 i #1414)', () => {
    expect(maal(spor as Last, { ...p, spor: 'grunnlag' })).toBe(
      '/P001/KOE-1?spor=ansvar&mode=read'
    );
  });
});
