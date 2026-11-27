/**
 * Kategoriene korrespondansen kan legges til som, tilbudt som handlinger (G-1 i BF-49). Tilbudet
 * og avvisningen leser de samme forutsetningene og datokontrollene (D-3, INV-MM-1). Kildene er
 * D-1, D-3 og D-6 i BF-49, OV-U80, OV-U98 og VS-U38–VS-U40.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { tilbudteLagtTil } from '../kommandoer/handlinger.ts';
import { KJERNE } from '../versjon.ts';
import { dagenEtterSisteRad, PAABEROPELSE, sak, svar } from './brevsak.ts';
import { SOM_BREV } from './brevet.ts';
import type { Part } from '../typer.ts';

/** Påberopelsen (en irregulær endring, så punkt 32.2 gjelder, GR-U11) i brev 1. */
function paaberopt() {
  const s = sak();
  s.send('TE', PAABEROPELSE);
  return { s, dagen: s.journal.at(-1)!.tidsstempel.slice(0, 10) };
}

const noeklene = (s: ReturnType<typeof sak>, part: Part, sendt: string, avsender: Part = part) =>
  tilbudteLagtTil(s.u(), part, sendt, avsender, KJERNE.regler).map((h) => h.noekkel);

const varselet = (sendt: string) => ({
  type: 'varsel',
  ...SOM_BREV,
  varsler: [{ hjemmel: '32.2' }],
  sendt,
  dokumentasjon: [randomUUID()],
});

describe('kategoriene som handlinger for korrespondansen lagt til (G-1 i BF-49)', () => {
  it('avsenderen får én handling per kategori og varsel, også varselet etter punkt 32.2 og krav i forholdet (D-3, D-6)', () => {
    const { s, dagen } = paaberopt();
    const te = noeklene(s, 'TE', dagen);
    expect(te).toEqual(
      expect.arrayContaining([
        'krav:forhold',
        'krav:vederlag',
        'krav:frist',
        'varsle:32.2',
        'varsle:vederlag',
        'varsle:frist',
        'varsle:34.4',
        'registrere_brev',
      ])
    );
    // Det løsningen sender, og det som legges til som dokumentasjon, er ikke en kategori.
    expect(te.filter((n) => /^(sende_|trekke|svare_paa|korrigere|oppgi)/.test(n))).toEqual([]);
    expect(noeklene(s, 'BH', dagen)).toEqual(expect.arrayContaining(['svare:forhold']));
  });

  it('aksepten tilbys bare når et svar i sporet var byggherrens gjeldende svar på dagen (D-9, OV-U98)', () => {
    const { s, dagen } = paaberopt();
    expect(noeklene(s, 'TE', dagen)).not.toContain('godta:forhold');
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.u().spor.forhold.gjeldendeKrav!.id, {
          resultat: 'avslaatt',
          grunnlag_varslet_i_tide: true,
        }),
      ],
    });
    expect(noeklene(s, 'TE', dagenEtterSisteRad(s))).toContain('godta:forhold');
    expect(noeklene(s, 'TE', dagen), 'før svaret ble sendt').not.toContain('godta:forhold');
  });

  it('korrespondanse motparten sendte, legges bare til som dokumentasjon (D-1)', () => {
    const { s, dagen } = paaberopt();
    expect(noeklene(s, 'TE', dagen, 'BH')).toEqual(['registrere_brev']);
    expect(noeklene(s, 'BH', dagen, 'TE')).toEqual(['registrere_brev']);
  });

  it('varselet etter punkt 32.2 sendt etter påberopelsen tilbys ikke, og avvisningen sier det samme (VS-U38, INV-MM-1)', () => {
    const { s, dagen } = paaberopt();
    const etter = new Date(`${dagen}T12:00:00Z`);
    etter.setUTCDate(etter.getUTCDate() + 1);
    const dagenEtter = etter.toISOString().slice(0, 10);
    expect(noeklene(s, 'TE', dagenEtter)).not.toContain('varsle:32.2');
    expect(s.avvisning('TE', varselet(dagenEtter))?.melding).toContain(
      'etter påberopelsen av forholdet'
    );
    expect(noeklene(s, 'TE', dagen), 'kontrollsak: samme dag').toContain('varsle:32.2');
    expect(s.avvist('TE', varselet(dagen)), 'kontrollsak: samme dag').toBeNull();
  });

  it('i en sak kjernen ikke forstår, tilbys bare dokumentasjon (D-3, MM-U2)', () => {
    const { s, dagen } = paaberopt();
    s.journal.push({ ...s.journal.at(-1)!, event_id: randomUUID(), event_type: 'ukjent_type' });
    expect(s.u().forstaatt, 'forutsetning').toBe(false);
    expect(noeklene(s, 'TE', dagen)).toEqual(['registrere_brev']);
  });
});
