/**
 * Testsakene for `saksrute.ts --testsak <navn>` (#2349): en tilstand saksruta skal vise når
 * ingen brukerforløp når den. Stegene er handlingene i `kjerne/tester/klient.ts`, som i
 * forløpene, og saksruta sender dem som TE og BH gjennom kommandoruta til TS-serveren.
 *
 * En testsak er testoppsett, ikke en brukerhistorie. Den står ikke i
 * `docs/domenetabell/brukerforlop/` og teller ikke i dekningen. Viser den seg å være en
 * brukerhistorie, går den til designsløyfa og blir et forløp der.
 *
 * `testsaker.test.ts` kjører stegene i minnet, så en testsak kjernen avviser, feiler i
 * testene og ikke først i nettleseren.
 */

import type { Forloep } from '../../../kjerne/tester/kjoerer.ts';
import type { Handling } from '../../../kjerne/tester/klient.ts';

/** Siden for én part i nettleseren, med det testsakene bruker av Playwright. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any;

export type Testsak = {
  /** Saken i saksruta og sakslisten. */
  tittel: string;
  /** Issuet eller PR-en testsaken ble laget for, og hva den når. */
  formaal: string;
  steg: Handling[];
  /** Sporet skjermbildene av saksruta åpner, når `--spor` ikke er gitt. */
  spor?: string;
  /**
   * Det som drives i nettleseren etter skjermbildene av saksruta, som et skjema som ikke
   * sendes. Bildene legges i `ut`.
   */
  iNettleseren?: (n: { te: Side; bh: Side; saksrute: string; ut: string }) => Promise<void>;
};

export const TESTSAKER: Record<string, Testsak> = {
  'to-kravposter-i-senere-lag': {
    tittel: 'Spunt og peler i akse D',
    formaal:
      '#2336: leselinjen for en lukket kravpost i svarskjemaet, med to kravposter i et senere lag.',
    spor: 'vederlag',
    steg: [
      // `svikt` gir varslingsplikt etter § 34.1.2, så byggherren kan svare at varselet kom for sent.
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'svikt',
        underkategori: 'grunnforhold',
        navn: 'K-g1',
        utdypning: 'Grunnforholdene i akse D avviker fra den geotekniske rapporten.',
      },
      {
        handling: 'brev',
        navn: 'D2',
        svar: [
          {
            spor: 'forhold',
            navn: 'S-g1',
            resultat: 'avslaatt',
            utdypning: 'Grunnforholdene er som beskrevet i rapporten.',
          },
        ],
      },
      // To kravposter etter justerte enhetspriser: hver har varselet etter § 34.3.3 og justeringen.
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        kravposter: [
          { oppgjoersform: 'enhetspriser', justert: true },
          { oppgjoersform: 'enhetspriser', justert: true },
        ],
      },
    ],
    // BH svarer at varselet etter § 34.1.2 kom for sent, så kravpostene står i laget etter avslaget
    // og § 34.1.2. P1 har § 34.3.3 for sent foran justeringen; P2 har regningsarbeid og § 34.3.3 i tide.
    async iNettleseren({ bh, saksrute, ut }) {
      await bh.goto(saksrute);
      await bh.getByRole('button', { name: 'Svar på kravet' }).click({ timeout: 30_000 });
      await bh.getByRole('radio', { name: 'Varslet for sent' }).check();
      const post = (b: string) =>
        bh.getByRole('listitem').filter({ has: bh.getByRole('heading', { name: new RegExp(`^${b} `) }) });
      const svar = async (b: string, valg: (string | RegExp)[]) => {
        for (const name of valg) await post(b).getByRole('radio', { name }).check();
        await post(b).getByRole('button', { name: 'Ferdig' }).click();
      };
      await svar('P1', [/^Godtar enhetspriser/, 'Kom for sent', 'Bestrider justeringen']);
      await bh.getByRole('button', { name: 'Svar på P2' }).click();
      await svar('P2', [/^Mener regningsarbeid/, 'Kom i tide', 'Bestrider justeringen']);
      const leselinjen = async (b: string) => {
        const linjer = post(b).getByRole('list').getByRole('listitem');
        await linjer.first().waitFor({ timeout: 10_000 });
        return linjer.allInnerTexts();
      };
      const [p1, p2] = [await leselinjen('P1'), await leselinjen('P2')];
      console.log(`BH  leselinjen for P1: ${p1.join(' | ')}`);
      console.log(`BH  leselinjen for P2: ${p2.join(' | ')}`);
      // #2336 punkt 3: det første vilkåret for posten sier ikke «heller ikke».
      for (const [b, linjer] of [['P1', p1], ['P2', p2]] as const)
        if (!/^Hvis innsigelsen om at varselet etter punkt\s34\.1\.2 /.test(linjer[0] ?? ''))
          throw new Error(`Leselinjen for ${b} begynner ikke med vilkåret om § 34.1.2 uten «heller ikke»`);
      // OV-U117: innsigelsen etter § 34.3.3 for P1 er ikke et vilkår i leselinjen for P2.
      if (p2.some((l: string) => /^Hvis .*34\.3\.3/.test(l)))
        throw new Error('Leselinjen for P2 har innsigelsen etter § 34.3.3 for P1 som vilkår');
      await post('P1').scrollIntoViewIfNeeded();
      await bh.screenshot({ path: `${ut}/leselinje-bh.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await post('P1').scrollIntoViewIfNeeded();
      await bh.screenshot({ path: `${ut}/leselinje-bh-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
    },
  },
  'varsel-alene': {
    tittel: 'Mengdeavvik i dekket over kjeller',
    formaal:
      '#2177: byggherrens svar på et varsel etter punkt 34.3.3 og 34.4 som står alene (G-9 i BF-14).',
    spor: 'vederlag',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Byggherren har pålagt tetting av gjennomføringer i dekket over kjeller.',
      },
      { handling: 'varsel', spor: 'vederlag', hjemmel: '34.3.3', navn: 'V-1' },
      { handling: 'varsel', spor: 'vederlag', hjemmel: '34.4', navn: 'V-2' },
    ],
    // BH svarer på varselet etter § 34.3.3: for sent, og subsidiært bestrides justeringen (VS-U4).
    // Så svaret på varselet etter § 34.4, som bare kan si at varselet kom for sent (VS-U77 punkt 31).
    async iNettleseren({ bh, saksrute, ut }) {
      await bh.goto(saksrute);
      const svar = bh.getByRole('button', { name: 'Svar på varselet om justering av enhetsprisene' });
      await svar.click({ timeout: 30_000 });
      await bh.getByRole('heading', { name: /^Svar på varsel om justering av enhetsprisene/ }).waitFor();
      await bh.screenshot({ path: `${ut}/varselsvar-tomt.png`, fullPage: true });
      await bh.getByRole('radio', { name: 'Kom for sent' }).check();
      await bh.getByRole('radio', { name: 'Bestrider justeringen' }).check();
      await bh.getByText('Gjelder hvis').waitFor();
      await bh.screenshot({ path: `${ut}/varselsvar-bh.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await bh.screenshot({ path: `${ut}/varselsvar-bh-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
      await bh.getByRole('button', { name: 'Se brevet før sending' }).first().click();
      await bh.getByRole('button', { name: 'Send til totalentreprenøren' }).waitFor({ timeout: 10_000 });
      await bh.screenshot({ path: `${ut}/varselsvar-brev.png`, fullPage: true });
      await bh.goto(saksrute);
      await bh.getByRole('button', { name: 'Andre handlinger' }).click({ timeout: 30_000 }).catch(() => {});
      await bh.getByRole('button', { name: 'Svar på varselet om regningsarbeid' }).click();
      await bh.getByRole('button', { name: 'Varselet kom for sent' }).click();
      await bh.screenshot({ path: `${ut}/varselsvar-344.png`, fullPage: true });
    },
  },
  'varsel-mellom': {
    tittel: 'Gjennomføringer i dekket over kjeller',
    formaal:
      '#2358: svaret på et varsel etter punkt 34.3.3 lagt til mellom to krav, med svarene fra forrige brev (F-8 i BF-14).',
    spor: 'vederlag',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Byggherren har pålagt omlegging av rør i kjeller.',
      },
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        kravposter: [
          { oppgjoersform: 'tilbud', belop: 210000 },
          { oppgjoersform: 'tilbud', belop: 120000 },
        ],
      },
      {
        handling: 'brev',
        navn: 'D3',
        svar: [
          {
            spor: 'vederlag',
            navn: 'S-v1',
            kravposter: [
              { post: 'P1', vurdering: 'godkjent', godkjent_belop: 210000 },
              { post: 'P2', vurdering: 'delvis', godkjent_belop: 80000 },
            ],
          },
        ],
      },
      { handling: 'varsel', spor: 'vederlag', hjemmel: '34.3.3', navn: 'V-1' },
    ],
    // BH svarer på varselet. Svarene på P1 og P2 i brev 3 står under brevet og kan ikke endres
    // der (VS-U65); lenken åpner et nytt svar på kravet.
    async iNettleseren({ bh, saksrute, ut }) {
      await bh.goto(saksrute);
      const svar = bh.getByRole('button', { name: 'Svar på varselet om justering av enhetsprisene' });
      await svar.click({ timeout: 30_000 });
      await bh.getByRole('heading', { name: /^Svar på varsel om justering av enhetsprisene/ }).waitFor();
      await bh.getByRole('radio', { name: 'Kom i tide' }).check();
      await bh.getByRole('radio', { name: 'Godtar justeringen' }).check();
      await bh.screenshot({ path: `${ut}/varselsvar-mellom.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await bh.screenshot({ path: `${ut}/varselsvar-mellom-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
      // Varden har ikke skjemaet for et nytt svar på kravet ennå (G4 i handlingsregisteret).
      await bh.getByRole('button', { name: 'Nytt svar på kravet' }).click();
      await bh.getByRole('status').filter({ hasText: 'ikke bygget' }).waitFor({ timeout: 10_000 });
      if (await bh.getByRole('button', { name: /^Endre/ }).count())
        throw new Error('Svarene fra forrige brev har «Endre» i svaret på varselet (VS-U65)');
    },
  },
};

/** Testsaken som kjøreren kjører den, uten kontrollpunkter. Et ukjent navn gir en feil med navnene. */
export function testsakSomForloep(navn: string): Forloep {
  const t = TESTSAKER[navn];
  if (!t)
    throw new Error(`Testsaken ${navn} finnes ikke. Testsakene: ${Object.keys(TESTSAKER).join(', ')}`);
  return { id: `testsaken ${navn}`, rader: [], start: null, steg: t.steg, kontroller: [] };
}
