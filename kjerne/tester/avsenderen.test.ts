/**
 * Avsenderen av korrespondanse motparten legger til (OV-U79, OV-U80, #2069): den som legger til
 * brevet, er aktøren, og avsenderen er en opplysning om brevet. Akseptkriteriene står i #2069.
 * Skjemaet parten avbrøt før brevet ble lagt til, står i D-12 i BF-49.
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Journalrad, Part } from '../typer.ts';
import { vurder, type Kontekst } from '../kommandoer/skriving.ts';
import { KJERNE } from '../versjon.ts';
import { lesJournal } from '../format/leser.ts';
import { omtalen } from '../frosset/brevdeler.ts';
import { utled } from '../utledning/utled.ts';
import { GJELDENDE_REGLER } from '../regler/regelsett.ts';
import { minnebane } from './bane.ts';
import { bygg } from './baner.ts';
import { mellomlager } from './klient.ts';
import { SOM_BREV } from './brevet.ts';

type Data = Record<string, unknown>;

const brevet = '00000000-0000-4000-8000-000000002069';
const registrering = (ekstra: Data = {}): Data => ({
  type: 'registrert_brev',
  ...SOM_BREV,
  spor: ['frist'],
  sendt: '2026-10-20',
  beskrivelse: 'Brev om fremdriften',
  dokumentasjon: [brevet],
  ...ekstra,
});
const kontekst = (part: Part): Kontekst => ({
  sakId: 'SAK-2069',
  aktoerId: part.toLowerCase(),
  part,
  teamId: null,
  sakskode: { kode: 'koe' as const, loepenummer: 17 },
  kontraktsforkortelse: 'K201',
  kontraktsfrister: [],
  tidspunkt: () => new Date('2026-10-21T10:00:00Z'),
  nyId: randomUUID,
});
const prov = (journal: Journalrad[], kommando: Data, part: Part) =>
  vurder(kommando, kontekst(part), journal, KJERNE, mellomlager(kommando));
const godtatt = (journal: Journalrad[], kommando: Data, part: Part) => {
  const u = prov(journal, kommando, part);
  if (!u.godtatt)
    throw new Error(`Forutsetning: avvist: ${u.avvisning.regel}: ${u.avvisning.melding}`);
  return u.hendelser[0];
};
/** Regelen i avvisningen, `null` når kommandoen godtas, eller feilen når skrivingen kaster. */
const utfallet = (journal: Journalrad[], kommando: Data, part: Part) => {
  try {
    const u = prov(journal, kommando, part);
    return u.godtatt ? { rad: u.hendelser[0] } : { regel: u.avvisning.regel };
  } catch (e) {
    return { feil: String(e) };
  }
};
const journalen = async () => {
  const bane = minnebane();
  await bygg(bane, ['krav_irreg']);
  return bane.journal();
};
const dokumentet = (rad: Journalrad) => {
  const [lest] = lesJournal([rad], KJERNE.leserformat);
  if (lest.art !== 'dokument') throw new Error(`Forutsetning: raden er ${lest.art}`);
  return lest.dokument;
};
const grunner = (rader: Journalrad[]) =>
  utled(lesJournal(rader, KJERNE.leserformat), GJELDENDE_REGLER).begrensninger.map((b) => b.grunn);

describe('avsenderen av korrespondanse motparten har sendt (OV-U79, OV-U80, #2069)', () => {
  it('totalentreprenøren legger til byggherrens brev: aktøren er totalentreprenøren, avsenderen byggherren, og datoen er oppgitt av totalentreprenøren (AK 1, samlevedtaket punkt 11)', async () => {
    const journal = await journalen();
    const rad = godtatt(journal, registrering({ avsender: 'BH' }), 'TE');
    expect(rad.aktor_rolle).toBe('TE');
    expect(rad.data.avsender).toBe('BH');
    const d = dokumentet(rad);
    expect(d.avsender).toBe('BH');
    expect(d.lagtTilAv).toBe('TE');
    expect(d.opplysninger.map((o) => o.oppgittAv)).toEqual(['TE']);
    expect(grunner([...journal, rad])).toEqual([]);
  });

  it('brevet omtales med den oppgitte avsenderen (AK 2, OV-U79, LV-U45)', async () => {
    const journal = await journalen();
    expect(omtalen(dokumentet(godtatt(journal, registrering({ avsender: 'BH' }), 'TE')))).toBe(
      'byggherrens brev av 20. oktober 2026'
    );
    // Kontrollsak: uten avsender er det parten som legger det til.
    expect(omtalen(dokumentet(godtatt(journal, registrering(), 'TE')))).toBe(
      'totalentreprenørens brev av 20. oktober 2026'
    );
  });

  it('bare parten som la til brevet, kan rette registreringen, ikke avsenderen (AK 3, OV-U17)', async () => {
    const journal = await journalen();
    const rad = godtatt(journal, registrering({ avsender: 'BH' }), 'TE');
    const retting = registrering({ avsender: 'BH', retter: rad.event_id, sendt: '2026-10-19' });
    expect(utfallet([...journal, rad], retting, 'BH')).toEqual({ regel: 'FEIL_PART' });
    expect(utfallet([...journal, rad], retting, 'TE')).toHaveProperty('rad');
  });

  it('en avsender lik egen side skrives ikke, så hver avsender har én form (AK 4)', async () => {
    const journal = await journalen();
    const u = utfallet(journal, registrering({ avsender: 'TE' }), 'TE');
    expect(u).toHaveProperty('rad');
    const rad = (u as { rad: Journalrad }).rad;
    expect('avsender' in rad.data).toBe(false);
    expect(dokumentet(rad).avsender).toBe('TE');
  });

  it.each<[string, (data: Data) => Data, string]>([
    [
      'avsenderen er parten som la til brevet',
      (data) => ({ ...data, avsender: 'TE' }),
      'den oppgitte avsenderen er parten som la til brevet',
    ],
    [
      'avsenderen står i et dokument med et varsel',
      (data) => ({
        ...Object.fromEntries(
          Object.entries(data).filter(([k]) => k !== 'spor' && k !== 'beskrivelse')
        ),
        avsender: 'BH',
        utsagn: [{ id: randomUUID(), art: 'varsel', hjemmel: '33.4' }],
      }),
      'bare et brev registrert som dokumentasjon har en oppgitt avsender (OV-U80)',
    ],
  ])('en rad der %s, gjør saken ikke forstått (AK 4, MM-U2)', async (_n, endre, grunn) => {
    const journal = await journalen();
    const rad = godtatt(journal, registrering({ avsender: 'BH' }), 'TE');
    expect(grunner([...journal, rad]), 'kontrollsak').toEqual([]);
    const endret = { ...rad, data: endre(rad.data as Data) };
    expect(grunner([...journal, endret])).toContainEqual(expect.stringContaining(grunn));
  });
});

describe('skjemaet parten avbrøt før brevet ble lagt til som dokumentasjon (D-12 i BF-49, svaret 27.11 i #807)', () => {
  it.each(['krav', 'svar'])(
    'brevet med «ikke_fylt_ut: %s» står som dokumentasjon med skjemaet, og ingen regel leser det',
    async (skjema) => {
      const journal = await journalen();
      const rad = godtatt(journal, registrering({ ikke_fylt_ut: skjema }), 'TE');
      expect(rad.data.ikke_fylt_ut).toBe(skjema);
      expect(dokumentet(rad).ikkeFyltUt).toBe(skjema);
      const u = utled(lesJournal([...journal, rad], KJERNE.leserformat), GJELDENDE_REGLER);
      expect(u.begrensninger).toEqual([]);
      expect(u.registrerteBrev.at(-1)).toMatchObject({
        dokument: rad.event_id,
        ikkeFyltUt: skjema,
      });
    }
  );

  it('svaret 27.11: «ikke_fylt_ut» avvises i brevet motparten sendte, og kontrollsaken fra avsenderen godtas', async () => {
    const journal = await journalen();
    expect(utfallet(journal, registrering({ avsender: 'BH', ikke_fylt_ut: 'svar' }), 'TE')).toEqual(
      { regel: 'FEIL_PART' }
    );
    expect(
      utfallet(journal, registrering({ avsender: 'TE', ikke_fylt_ut: 'svar' }), 'TE')
    ).toHaveProperty('rad');
  });

  it('svaret 27.11: verdien prøves bare mot krav og svar, ikke mot siden', async () => {
    const journal = await journalen();
    expect(utfallet(journal, registrering({ ikke_fylt_ut: 'svar' }), 'TE')).toHaveProperty('rad');
    expect(utfallet(journal, registrering({ ikke_fylt_ut: 'aksept' }), 'TE')).toEqual({
      regel: 'UGYLDIG_FORM',
    });
  });

  it.each<[string, (data: Data) => Data, string]>([
    [
      'skjemaet står i et brev motparten sendte',
      (data) => ({ ...data, avsender: 'BH' }),
      'skjemaet som ikke er fylt ut, står i et brev motparten sendte',
    ],
    [
      'skjemaet står i et dokument med et varsel',
      (data) => ({
        ...Object.fromEntries(
          Object.entries(data).filter(([k]) => k !== 'spor' && k !== 'beskrivelse')
        ),
        utsagn: [{ id: randomUUID(), art: 'varsel', hjemmel: '33.4' }],
      }),
      'bare et brev registrert som dokumentasjon har et skjema som ikke er fylt ut',
    ],
  ])('en rad der %s, gjør saken ikke forstått (MM-U2)', async (_n, endre, grunn) => {
    const journal = await journalen();
    const rad = godtatt(journal, registrering({ ikke_fylt_ut: 'krav' }), 'TE');
    expect(grunner([...journal, rad]), 'kontrollsak').toEqual([]);
    const endret = { ...rad, data: endre(rad.data as Data) };
    expect(grunner([...journal, endret])).toContainEqual(expect.stringContaining(grunn));
  });
});

describe('dokumentasjonen lagt til på nytt med valget (D-13 i BF-49, OV-U123 punkt 23, MM-U59 punkt 9)', () => {
  const varselet = (ekstra: Data = {}): Data => ({
    type: 'varsel',
    ...SOM_BREV,
    varsler: [{ hjemmel: '34.4' }],
    sendt: '2026-10-20',
    dokumentasjon: [brevet],
    ...ekstra,
  });

  it('totalentreprenøren legger brevet til på nytt som varsel med henvisning til registreringen, og den er rettet', async () => {
    const journal = await journalen();
    const rad = godtatt(journal, registrering(), 'TE');
    const varsel = godtatt([...journal, rad], varselet({ retter: rad.event_id }), 'TE');
    expect(varsel.data.retter).toBe(rad.event_id);
    const u = utled(lesJournal([...journal, rad, varsel], KJERNE.leserformat), GJELDENDE_REGLER);
    expect(u.begrensninger).toEqual([]);
    expect(u.registrerteBrev.find((b) => b.dokument === rad.event_id)?.rettetAv).toBe(
      varsel.event_id
    );
    expect(u.spor.vederlag.kravpostvarsler.map((v) => v.dokument)).toEqual([varsel.event_id]);
  });

  it('bare samme side retter registreringen (OV-U17)', async () => {
    const journal = await journalen();
    const rad = godtatt(journal, registrering({ avsender: 'TE' }), 'BH');
    expect(utfallet([...journal, rad], varselet({ retter: rad.event_id }), 'TE')).toEqual({
      regel: 'FEIL_PART',
    });
  });

  it('en registrering som er rettet, rettes ikke igjen', async () => {
    const journal = await journalen();
    const rad = godtatt(journal, registrering(), 'TE');
    const varsel = godtatt([...journal, rad], varselet({ retter: rad.event_id }), 'TE');
    expect(utfallet([...journal, rad, varsel], varselet({ retter: rad.event_id }), 'TE')).toEqual({
      regel: 'REGISTRERINGEN_ER_RETTET',
    });
  });

  it('et brev fra løsningen retter ikke en registrering', async () => {
    const journal = await journalen();
    const rad = godtatt(journal, registrering(), 'TE');
    expect(
      utfallet(
        [...journal, rad],
        {
          type: 'send_varsel',
          varsler: [{ hjemmel: '34.4', arbeid: 'Graving' }],
          retter: rad.event_id,
        },
        'TE'
      )
    ).toEqual({ regel: 'UGYLDIG_FORM' });
  });

  it('en rad fra løsningen med en henvisning til en registrering, gjør saken ikke forstått (MM-U2)', async () => {
    const journal = await journalen();
    const rad = godtatt(journal, registrering(), 'TE');
    const varsel = godtatt([...journal, rad], varselet({ retter: rad.event_id }), 'TE');
    const data = varsel.data as Data;
    const fraLoesningen = Object.fromEntries(
      Object.entries(data).filter(
        ([k]) => !['opplysninger', 'korrespondansetype', 'sendemaate', 'beskrivelse'].includes(k)
      )
    );
    expect(grunner([...journal, rad, varsel]), 'kontrollsak').toEqual([]);
    expect(grunner([...journal, rad, { ...varsel, data: fraLoesningen }])).toContainEqual(
      expect.stringContaining('en retting er ikke et brev registrert i saken (OV-U17)')
    );
  });
});
