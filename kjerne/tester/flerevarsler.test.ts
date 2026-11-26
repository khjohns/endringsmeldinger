/**
 * Flere varsler i ett brev, med arbeidet varselet gjelder (BF-37, punkt 5 i #1823). Kildene er
 * VS-U87 punkt 23, 27 og 28 og beslutningsdelen, og formen er arbeidsvalg 1 og 2 26.11 i #2408.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { lesJournal } from '../format/leser.ts';
import { KJERNE } from '../versjon.ts';
import { I_SAKEN, KLAR_OVER, laast, PAABEROPELSE, sak, tilbud, type Data } from './brevsak.ts';
import { SOM_BREV } from './brevet.ts';

const GRAVING = 'Graving ved kum 4';
const FJERNVARME = 'Omlegging av fjernvarmerøret';

const sendVarsler = (...varsler: Data[]) => ({ type: 'send_varsel', varsler });
const registrer = (...varsler: Data[]) => ({
  type: 'varsel',
  ...SOM_BREV,
  varsler,
  sendt: '2026-09-28',
  dokumentasjon: [randomUUID()],
});

/** Påberopelsen (svikt, så punkt 34.1.2 krever varsel) i brev 1. */
function paaberopt() {
  const s = sak();
  s.send('TE', {
    ...PAABEROPELSE,
    innhold: { hovedkategori: 'svikt', underkategori: 'medvirkning', ...KLAR_OVER },
  });
  return s;
}

const regningsarbeid = (h: Data = {}) => ({
  type: 'krav',
  spor: 'vederlag',
  innhold: {
    kravposter: [{ beskrivelse: 'Graving', oppgjoersform: 'regningsarbeid', ...h }],
  },
});

describe('flere varsler i ett brev fra løsningen (BF-37, VS-U87 punkt 27 og beslutningsdelen)', () => {
  it('F-1: to varsler etter punkt 34.4 for to arbeider er ett brev med to utsagn, hvert med arbeidet, og ett nummerert punkt per varsel (U-6, D-1, D-3)', () => {
    const s = paaberopt();
    const rad = s.send(
      'TE',
      sendVarsler({ hjemmel: '34.4', arbeid: GRAVING }, { hjemmel: '34.4', arbeid: FJERNVARME })
    );
    expect((rad.data.utsagn as Data[]).map((u) => [u.hjemmel, u.arbeid])).toEqual([
      ['34.4', GRAVING],
      ['34.4', FJERNVARME],
    ]);
    const tekst = (arbeid: string) =>
      `Totalentreprenøren varsler etter NS 8407 punkt 34.4 at totalentreprenøren vil kreve oppgjør som regningsarbeid for arbeidet «${arbeid}» som følge av forholdet ${I_SAKEN}.`;
    expect(laast(rad)).toEqual([
      `1. Varsel før regningsarbeidet settes i gang (punkt 34.4)\n\n${tekst(GRAVING)}`,
      `2. Varsel før regningsarbeidet settes i gang (punkt 34.4)\n\n${tekst(FJERNVARME)}`,
    ]);
    expect(s.u().spor.vederlag.kravpostvarsler.map((v) => v.dokument)).toEqual([
      rad.event_id,
      rad.event_id,
    ]);
    expect(s.u().forstaatt).toBe(true);
  });

  it('F-1: en kravpost viser til ett av varslene i brevet, og kravet sendes ikke uten valget når saken har et varsel ingen kravpost viser til (VS-U87 punkt 23)', () => {
    const s = paaberopt();
    const rad = s.send(
      'TE',
      sendVarsler({ hjemmel: '34.4', arbeid: GRAVING }, { hjemmel: '34.4', arbeid: FJERNVARME })
    );
    const [graving] = (rad.data.utsagn as Data[]).map((u) => u.id as string);
    expect(s.avvist('TE', regningsarbeid())).not.toBeNull();
    s.send('TE', regningsarbeid({ varsel: { art: 'gitt', varsel: graving } }));
    const [post] = s.u().spor.vederlag.gjeldendeKrav!.innhold.kravposter as Data[];
    expect(post.varsel).toEqual({ art: 'gitt', varsel: graving });
  });

  it('varsler etter ulike bestemmelser i vederlaget står i samme brev, med varselet om særskilt justering og datoen (VS-U87 punkt 27, VS-U86 punkt 12)', () => {
    const s = paaberopt();
    const rad = s.send(
      'TE',
      sendVarsler(
        { hjemmel: '34.1.2' },
        { hjemmel: '34.1.3', klar_over_utgiftene: '2026-09-28' },
        { hjemmel: '34.3.3', arbeid: GRAVING }
      )
    );
    expect(laast(rad).map((a) => a.split('\n\n')[0])).toEqual([
      '1. Varsel om vederlagsjustering (punkt 34.1.2)',
      '2. Varsel om særskilt vederlagsjustering (punkt 34.1.3)',
      '3. Varsel om justering av enhetsprisene (punkt 34.3.3)',
    ]);
    expect(laast(rad)[1]).toContain(
      'Totalentreprenøren oppgir å ha blitt klar over at utgiftene ville påløpe 28. september 2026.'
    );
    const v = s.u().spor.vederlag;
    expect([v.varsler['34.1.2']?.dokument, v.varsler['34.1.3']?.dokument]).toEqual([
      rad.event_id,
      rad.event_id,
    ]);
  });

  it('ett varsel fra løsningen står uten punkt, med arbeidet (VS-U15, VS-U87 punkt 27)', () => {
    const s = paaberopt();
    expect(laast(s.send('TE', sendVarsler({ hjemmel: '34.4', arbeid: GRAVING })))).toEqual([
      `Totalentreprenøren varsler etter NS 8407 punkt 34.4 at totalentreprenøren vil kreve oppgjør som regningsarbeid for arbeidet «${GRAVING}» som følge av forholdet ${I_SAKEN}.`,
    ]);
  });
});

describe('arbeidet varselet gjelder (VS-U87 punkt 27, arbeidsvalg 1 26.11 i #2408)', () => {
  it.each(['34.3.3', '34.4'])(
    'F-2: et varsel etter punkt %s fra løsningen sendes ikke uten arbeidet, og kontrollsaken med arbeidet godtas',
    (hjemmel) => {
      const s = paaberopt();
      expect(s.avvisning('TE', sendVarsler({ hjemmel }))?.melding).toContain(
        '$.varsler[0].arbeid: mangler'
      );
      expect(s.avvist('TE', sendVarsler({ hjemmel, arbeid: GRAVING }))).toBeNull();
    }
  );

  it('F-5: ved registrering er arbeidet valgfritt, og datoen gjelder alle varslene (D-4)', () => {
    const s = paaberopt();
    const rad = s.send(
      'TE',
      registrer({ hjemmel: '34.4' }, { hjemmel: '34.3.3', arbeid: GRAVING })
    );
    expect((rad.data.utsagn as Data[]).map((u) => u.arbeid ?? null)).toEqual([null, GRAVING]);
    expect(rad.data.opplysninger).toMatchObject([{ hva: 'sendt', dato: '2026-09-28' }]);
  });

  it.each(['34.1.2', '34.1.3'])(
    'varselet etter punkt %s har ingen beskrivelse av arbeidet, sendt eller registrert',
    (hjemmel) => {
      const s = paaberopt();
      for (const k of [sendVarsler, registrer])
        expect(s.avvisning('TE', k({ hjemmel, arbeid: GRAVING }))?.melding).toContain(
          `$.varsler[0].arbeid: varselet etter punkt ${hjemmel} har ingen beskrivelse av arbeidet`
        );
    }
  );

  it('et lagret varsel etter punkt 34.1.2 med arbeidet er ikke forstått (MM-U2)', () => {
    const s = paaberopt();
    const rad = s.send('TE', sendVarsler({ hjemmel: '34.1.2' }));
    const endret = structuredClone(rad);
    (endret.data.utsagn as Data[])[0]!.arbeid = GRAVING;
    const lest = lesJournal([...s.journal.slice(0, -1), endret], KJERNE.leserformat).at(-1)!;
    expect(lest.art).toBe('ukjent');
  });
});

describe('varslene i brevet og sporene (beslutningsdelen i VS-U87, D-1–D-4 i BF-37)', () => {
  it('et brev fra løsningen har ikke varsler i både vederlaget og fristforlengelsen, men et registrert brev har begge (D-1, D-4)', () => {
    const s = paaberopt();
    expect(
      s.avvisning('TE', sendVarsler({ hjemmel: '34.1.2' }, { hjemmel: '33.4' }))?.melding
    ).toContain('varslene i et brev fra løsningen står i ett spor');
    const rad = s.send('TE', registrer({ hjemmel: '34.1.2' }, { hjemmel: '33.4' }));
    const u = s.u();
    expect([
      u.spor.vederlag.varsler['34.1.2']?.dokument,
      u.spor.frist.varsler['33.4']?.dokument,
    ]).toEqual([rad.event_id, rad.event_id]);
  });

  it('to varsler etter samme bestemmelse er bare mulig etter punkt 34.3.3 og 34.4 (D-2)', () => {
    const s = paaberopt();
    expect(
      s.avvisning('TE', sendVarsler({ hjemmel: '34.1.2' }, { hjemmel: '34.1.2' }))?.melding
    ).toContain('$.varsler[1].hjemmel: brevet har alt et varsel etter punkt 34.1.2');
    expect(
      s.avvist(
        'TE',
        sendVarsler(
          { hjemmel: '34.3.3', arbeid: GRAVING },
          { hjemmel: '34.3.3', arbeid: FJERNVARME }
        )
      )
    ).toBeNull();
  });

  it('et varsel som ikke kan sendes alene, kan heller ikke sendes i brevet: etter vederlagskravet avvises varselet etter punkt 34.1.2 også sammen med et annet (D-2, OV-U89 punkt 3)', () => {
    const s = paaberopt();
    s.send('TE', { type: 'krav', spor: 'vederlag', innhold: tilbud(125000) });
    const sammen = sendVarsler({ hjemmel: '34.4', arbeid: GRAVING }, { hjemmel: '34.1.2' });
    expect(s.avvist('TE', sammen)).toBe('VEDERLAGSKRAV_SENDT');
    expect(
      s.avvist('TE', sendVarsler({ hjemmel: '34.4', arbeid: GRAVING })),
      'kontrollsak'
    ).toBeNull();
  });

  it('et brev uten varsler sendes ikke (D-2)', () => {
    expect(paaberopt().avvist('TE', sendVarsler())).toBe('UGYLDIG_FORM');
  });
});
