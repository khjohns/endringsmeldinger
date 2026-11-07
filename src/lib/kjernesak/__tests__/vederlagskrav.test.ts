/**
 * Det gamle vederlagsskjemaet på TS-stien (#667). Vederlagskravet har kravposter (OV-U95
 * punkt 19), og skjemaet for dem kommer med BF-14 (økt 3 i #1663). Til da avvises kravet fra
 * det gamle skjemaet, og varselet sendes fortsatt (arbeidsvalget i #1674).
 */

import { describe, expect, it } from 'vitest';
import {
  metodeKanSendesTilKjernen,
  vederlagskommandoFraSkjema,
} from '$lib/kjernesak/vederlagskrav';
import { formfeil } from '$kjerne/kommandoer/kommando';

describe('vederlagskravet fra det gamle skjemaet', () => {
  it('ingen metode tilbys', () => expect(metodeKanSendesTilKjernen()).toBe(false));

  it('kravet avvises her og sendes ikke', () => {
    expect(() =>
      vederlagskommandoFraSkjema({ metode: 'FASTPRIS_TILBUD', belop_direkte: 250000 })
    ).toThrow('kan ikke sendes fra dette skjemaet ennå');
  });

  it('varselet etter § 34.1.2 sendes fortsatt, og kjernen godtar formen (OV-U5)', () => {
    const kommando = vederlagskommandoFraSkjema({ varsel_type: 'varsel' });
    expect(kommando).toEqual({ type: 'send_varsel', spor: 'vederlag', hjemmel: '34.1.2' });
    expect(formfeil(kommando)).toEqual([]);
  });
});
