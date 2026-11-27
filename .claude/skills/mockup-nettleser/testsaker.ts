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

import { createRequire } from 'node:module';
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
  'korrespondanse-paa-nytt': {
    tittel: 'Omlegging av overvann i akse B',
    formaal:
      'BF-49 PR 1 (#807, #2455): dokumentasjon fra et skjema som ikke er fylt ut, lagt til på nytt som varsel om vederlagsjustering og fristforlengelse i samme brev, og korrespondanse fra motparten.',
    spor: 'vederlag',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Byggherren har pålagt omlegging av overvannet i akse B.',
      },
      {
        handling: 'registrert_brev',
        part: 'TE',
        sporene: ['vederlag'],
        sendt: '2026-09-20',
        korrespondansetype: 'brev',
        beskrivelse: 'Varsel om vederlag og frist for omleggingen',
        ikke_fylt_ut: 'krav',
        navn: 'R1',
      },
    ],
    async iNettleseren({ te, bh, saksrute, ut }) {
      const vederlag = `${saksrute}?spor=vederlag`;
      await te.goto(vederlag);
      const paaNytt = te.getByRole('button', { name: /^Legg til på nytt/ });
      await paaNytt.waitFor({ timeout: 30_000 });
      await te.screenshot({ path: `${ut}/paa-nytt-traad-te.png`, fullPage: true });
      await paaNytt.click();
      await te.getByRole('heading', { name: 'Legg til korrespondansen på nytt' }).waitFor();
      await te.getByRole('radio', { name: 'Et varsel' }).check();
      await te.getByRole('checkbox', { name: /^Varsel om fristforlengelse/ }).check();
      await te.getByRole('checkbox', { name: /^Varsel om vederlagsjustering/ }).check();
      await te.screenshot({ path: `${ut}/paa-nytt-skjema-te.png`, fullPage: true });
      await te.setViewportSize({ width: 390, height: 844 });
      await te.screenshot({ path: `${ut}/paa-nytt-skjema-te-390.png`, fullPage: true });
      await te.setViewportSize({ width: 1440, height: 900 });
      await te.getByRole('button', { name: 'Legg til', exact: true }).click();
      await te.getByText('Varselet er lagt til.').waitFor({ timeout: 30_000 });
      await te.screenshot({ path: `${ut}/paa-nytt-lagt-til-te.png`, fullPage: true });

      await bh.goto(vederlag);
      await bh.getByRole('button', { name: 'Legg til korrespondanse' }).click({ timeout: 30_000 });
      await bh.getByRole('radio', { name: 'E-post' }).check();
      await bh.getByRole('radio', { name: 'Totalentreprenøren' }).check();
      await bh.getByText('Du legger til noe motparten har sendt.', { exact: false }).waitFor();
      await bh.screenshot({ path: `${ut}/motparten-bh.png`, fullPage: true });
    },
  },
  'svar-lagt-til-innsigelsen': {
    tittel: 'Peling i akse C–F',
    formaal:
      'BF-49 PR 2 (#807, #2347): byggherrens svar lagt til der innsigelsen mot varselet for kravposten står (U-7), og spørsmålet når svarskjemaet lukkes (U-9).',
    spor: 'vederlag',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        sendt: '2026-08-20',
        dato: '2026-08-15',
      },
      {
        handling: 'varsel',
        spor: 'vederlag',
        hjemmel: '34.3.3',
        sendt: '2026-08-25',
        korrespondansetype: 'e_post',
        beskrivelse: 'Varsel om justering av enhetsprisene',
        navn: 'V-v',
      },
      // Byggherren gjorde gjeldende at varselet kom for sent, i en e-post lagt til.
      {
        handling: 'brev',
        navn: 'D3',
        sendt: '2026-09-01',
        korrespondansetype: 'e_post',
        beskrivelse: 'Svar på varselet om justering av enhetsprisene',
        svar: [
          {
            spor: 'vederlag',
            navn: 'S-v1',
            gjelder: 'V-v#varsel',
            varslet_i_tide: false,
            godtar_justering: true,
          },
        ],
      },
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        sendt: '2026-09-05',
        kravposter: [
          { oppgjoersform: 'enhetspriser', justert: true, varsel: 'kravet' },
          { oppgjoersform: 'enhetspriser', justert: true, varsel: 'V-v' },
        ],
      },
    ],
    // BH legger til e-posten 10.09 som svar på kravet. P2 viser til varselet med innsigelsen, og
    // svaret sier ikke noe om det. Så lukker BH et nytt svarskjema og legger e-posten til som
    // dokumentasjon uten svaret.
    async iNettleseren({ bh, saksrute, ut }) {
      const korrespondanse = async (dato: string, fil: string) => {
        await bh.getByRole('button', { name: 'Legg til korrespondanse' }).click({ timeout: 30_000 });
        await bh.getByRole('radio', { name: 'E-post' }).check();
        await bh.getByRole('radio', { name: 'Byggherren' }).check();
        await bh.getByLabel('Datoen det ble sendt').fill(dato);
        await bh.locator('input[type=file]').setInputFiles({
          name: fil,
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n%%EOF\n'),
        });
        await bh.getByText(fil).waitFor({ timeout: 30_000 });
        await bh.getByRole('textbox', { name: /Kort beskrivelse/ }).fill('Svar på kravet om justerte enhetspriser');
        await bh.getByRole('radio', { name: 'Et svar' }).check();
        await bh.getByRole('button', { name: 'Gå videre' }).click();
      };
      await bh.goto(saksrute);
      await korrespondanse('2026-09-10', 'svaret.pdf');
      await bh.getByRole('button', { name: /^Godta oppgjørsformen/ }).click({ timeout: 30_000 });
      await bh.getByRole('radio', { name: 'Godtar justeringen' }).first().check();
      await bh.getByRole('button', { name: /P2$/ }).click();
      await bh.getByRole('radio', { name: 'Godtar justeringen' }).first().check();
      await bh.getByRole('button', { name: 'Legg til svaret' }).first().click();
      await bh.getByText('Velg hva svaret sier om varselet.').first().waitFor();
      await bh.screenshot({ path: `${ut}/svar-mangler-bh.png`, fullPage: true });
      await bh.getByRole('radio', { name: 'Svaret sier ikke noe om varselet' }).check();
      await bh.screenshot({ path: `${ut}/svar-skjema-bh.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await bh.screenshot({ path: `${ut}/svar-skjema-bh-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
      await bh.getByRole('button', { name: 'Legg til svaret' }).first().click();
      await bh.getByText('Svaret er lagt til.').waitFor({ timeout: 30_000 });
      await bh.screenshot({ path: `${ut}/svar-lagt-til-bh.png`, fullPage: true });

      await korrespondanse('2026-09-12', 'avbrutt.pdf');
      await bh.getByRole('button', { name: 'Forkast utkast' }).first().click();
      await bh.getByRole('heading', { name: 'Legge til korrespondansen uten svaret?' }).waitFor();
      await bh.screenshot({ path: `${ut}/avbrudd-bh.png` });
      await bh.getByRole('button', { name: 'Legg til som dokumentasjon' }).click();
      await bh.getByText('Korrespondansen er lagt til som dokumentasjon.', { exact: false }).waitFor({ timeout: 30_000 });
      await bh.screenshot({ path: `${ut}/avbrudd-lagt-til-bh.png`, fullPage: true });
    },
  },
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
      {
        handling: 'varsel',
        spor: 'vederlag',
        hjemmel: '34.3.3',
        arbeid: 'Tetting av gjennomføringer',
        navn: 'V-1',
      },
      {
        handling: 'varsel',
        spor: 'vederlag',
        hjemmel: '34.4',
        arbeid: 'Tetting av gjennomføringer',
        navn: 'V-2',
      },
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
      {
        handling: 'varsel',
        spor: 'vederlag',
        hjemmel: '34.3.3',
        arbeid: 'Tetting av gjennomføringer',
        navn: 'V-1',
      },
    ],
    // BH svarer på varselet. Svarene på P1 og P2 i brev 3 står i høyre kolonne og kan ikke endres
    // der (VS-U65); lenken åpner et nytt svar på kravet (#2365).
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
      const svarene = bh.getByRole('region', { name: /^Svarene på kravet i brev/ });
      if (await svarene.getByRole('button', { name: /^(Endre|Svar på)/ }).count())
        throw new Error('Svarene fra forrige brev har «Endre» i svaret på varselet (VS-U65)');
      // #2365: lenken åpner det nye svaret på kravet, fylt ut med svaret i brev 3.
      await bh.getByRole('button', { name: 'Nytt svar på kravet' }).click();
      await bh.getByText(/^Det forrige svaret er brev 3, og det står som det ble sendt\./).waitFor({ timeout: 10_000 });
      await bh.screenshot({ path: `${ut}/nytt-vederlagssvar.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await bh.screenshot({ path: `${ut}/nytt-vederlagssvar-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
    },
  },
  'eldre-krav': {
    tittel: 'Riving og montering i akse B',
    formaal:
      '#2011: kravskjemaet for et vederlagskrav lagt til, sendt før det siste kravet i sporet (OV-U118, OV-U119).',
    spor: 'vederlag',
    steg: [
      // Påberopelsen og det første kravet er lagt til med datoer før kravet fra løsningen.
      {
        handling: 'krav',
        spor: 'forhold',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        sendt: '2026-09-01',
        dato: '2026-08-25',
      },
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        sendt: '2026-09-05',
        kravposter: [
          { oppgjoersform: 'tilbud', belop: 60000 },
          { oppgjoersform: 'tilbud', belop: 10000 },
        ],
      },
      // P1 står, P2 trekkes og P3 er ny.
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v2',
        kravposter: [
          { post: 'P1', oppgjoersform: 'tilbud', belop: 60000 },
          { oppgjoersform: 'tilbud', belop: 40000 },
        ],
        trekker: ['P2'],
      },
    ],
    // TE legger til et krav sendt 10.09, mellom K-v1 og K-v2. Skjemaet har P1 og P2 fra K-v1, og en
    // ny kravpost kan oppgis som P3 (OV-U119). P2 trekkes, og kravet legges til gjennom serveren.
    async iNettleseren({ te, saksrute, ut }) {
      await te.goto(saksrute);
      await te.getByRole('button', { name: 'Legg til korrespondanse' }).click({ timeout: 30_000 });
      await te.getByRole('radio', { name: 'E-post' }).check();
      await te.getByLabel('Datoen det ble sendt').fill('2026-09-10');
      await te.locator('input[type=file]').setInputFiles({
        name: 'kravet.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n%%EOF\n'),
      });
      await te.getByText('kravet.pdf').waitFor({ timeout: 30_000 });
      await te.getByRole('textbox', { name: /Kort beskrivelse/ }).fill('Kravet om riving.');
      await te.getByRole('radio', { name: 'Et krav' }).check();
      await te.getByRole('button', { name: 'Gå videre' }).click();
      await te.getByText(/^Kravpostene er hentet fra /).waitFor({ timeout: 10_000 });
      const postene = te.getByRole('region', { name: /^Vederlagsjustering/ });
      const linjer = await postene.getByRole('heading', { level: 4 }).allInnerTexts();
      console.log(`TE  kravpostene i skjemaet: ${linjer.join(' | ')}`);
      if (linjer.some((l: string) => l.includes('P3')))
        throw new Error('Skjemaet for kravet sendt før K-v2 har P3 fra K-v2 (OV-U118)');
      await te.screenshot({ path: `${ut}/eldre-krav-skjema.png`, fullPage: true });
      await te.getByRole('button', { name: 'Endre P2' }).click();
      await te.getByRole('button', { name: 'Trekk P2' }).click();
      await te.getByRole('button', { name: 'Legg til kravpost' }).click();
      const samme = te.getByRole('group', { name: /^Er dette en kravpost i et annet krav i saken\?/ });
      await samme.getByRole('radio', { name: /^Ja, P3 · / }).check();
      await te.getByRole('radio', { name: /^Fast sum/ }).check();
      await te.getByRole('textbox', { name: /^Beløpet du krever/ }).fill('30000');
      // WCAG 2.1 A og AA med axe på skjemaet med valget, som `uu.mjs` gjør i demoruta.
      await te.addScriptTag({ path: createRequire(import.meta.url).resolve('axe-core/axe.min.js') });
      const brudd = await te.evaluate(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = await (window as any).axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        });
        return r.violations.map((v: { id: string; nodes: unknown[] }) => `${v.id} (${v.nodes.length})`);
      });
      console.log(`TE  axe på skjemaet: ${brudd.length ? brudd.join(', ') : 'ingen brudd'}`);
      await samme.scrollIntoViewIfNeeded();
      await te.screenshot({ path: `${ut}/eldre-krav-samme-kravpost.png`, fullPage: true });
      await te.setViewportSize({ width: 390, height: 844 });
      await samme.scrollIntoViewIfNeeded();
      await te.screenshot({ path: `${ut}/eldre-krav-samme-kravpost-390.png`, fullPage: true });
      await te.setViewportSize({ width: 1440, height: 900 });
      await te.getByRole('button', { name: 'Ferdig' }).click();
      await te.getByRole('button', { name: 'Legg til kravet' }).first().click();
      await te.getByText('Kravet er lagt til.').waitFor({ timeout: 30_000 });
      await te.screenshot({ path: `${ut}/eldre-krav-lagt-til.png`, fullPage: true });
    },
  },
  'eldre-krav-varsel': {
    tittel: 'Regningsarbeid i heissjakt',
    formaal:
      '#2394: et eldre vederlagskrav lagt til etter byggherrens innsigelse mot varselet for P1, som blir varselet for posten (OV-U120).',
    spor: 'vederlag',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Byggherren har pålagt ny utsparing i heissjakten.',
      },
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        kravposter: [{ oppgjoersform: 'regningsarbeid' }],
      },
      {
        handling: 'brev',
        navn: 'D3',
        svar: [{ spor: 'vederlag', navn: 'S-v1', kravposter: [{ post: 'P1', varslet_i_tide: false }] }],
      },
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v0',
        sendt: '2026-01-02',
        kravposter: [{ post: 'P1', oppgjoersform: 'regningsarbeid' }],
      },
    ],
  },
  'foerste-krav-varslet-frist': {
    tittel: 'Tegningene for fundamentene',
    formaal:
      '#2410: påminnelsen ved det første kravet (U-3 i BF-51), uten varsel i vederlaget og med varselet etter punkt 33.4 i fristen.',
    spor: 'vederlag',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'svikt',
        underkategori: 'medvirkning',
        navn: 'K-g1',
        utdypning: 'Byggherren leverte tegningene for fundamentene tre uker etter avtalt tid.',
      },
      { handling: 'varsel', spor: 'frist', navn: 'V-f1' },
    ],
    async iNettleseren({ te, saksrute, ut }) {
      await te.goto(saksrute);
      await te.getByRole('button', { name: 'Send krav om vederlagsjustering' }).click({ timeout: 30_000 });
      await te.getByText('Dette er det første kravet om vederlagsjustering i saken.').waitFor();
      await te.screenshot({ path: `${ut}/foerste-krav-vederlag.png` });
      await te.setViewportSize({ width: 390, height: 844 });
      await te.screenshot({ path: `${ut}/foerste-krav-vederlag-390.png` });
      await te.setViewportSize({ width: 1440, height: 900 });
      await te.goto(saksrute.replace('spor=vederlag', 'spor=frist'));
      await te.getByRole('button', { name: 'Send krav om fristforlengelse' }).click({ timeout: 30_000 });
      const varselet = te.getByText(/^Varsel etter punkt.33\.4 i brev 2, sendt /);
      await varselet.waitFor();
      console.log(`TE  påminnelsen i fristen: ${await varselet.innerText()}`);
      await te.screenshot({ path: `${ut}/foerste-krav-frist.png` });
    },
  },
  'varselvalg-kravpost': {
    tittel: 'Grøftene ved kum 4',
    formaal:
      '#2452: kravposten velger hvilket av varslene uten kravpost den gjelder (U-7 i BF-37), og kravet sendes gjennom serveren.',
    spor: 'vederlag',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'svikt',
        underkategori: 'prosjektering',
        navn: 'K-g1',
        utdypning: 'Tegningene for grøftene viser en trasé som krysser eksisterende kum og fjernvarmerør.',
      },
      {
        handling: 'varsel',
        spor: 'vederlag',
        varsler: [
          { hjemmel: '34.4', arbeid: 'Ekstra graving i grøften ved kum 4' },
          { hjemmel: '34.4', arbeid: 'Omlegging av fjernvarmerør langs fasade nord' },
        ],
      },
    ],
    async iNettleseren({ te, saksrute, ut }) {
      await te.goto(saksrute);
      await te.getByRole('button', { name: 'Send krav om vederlagsjustering' }).click({ timeout: 30_000 });
      await te.getByLabel('Beskrivelse av posten', { exact: true }).fill('Ekstra graving ved kum 4');
      await te.getByRole('radio', { name: /^Regningsarbeid/ }).check();
      await te.getByRole('button', { name: 'Ferdig' }).click();
      const valget = te.getByRole('group', { name: 'Hvilket varsel før regningsarbeidet gjelder P1?' });
      await valget.scrollIntoViewIfNeeded();
      await te.screenshot({ path: `${ut}/varselvalg-uten-valg.png` });
      await valget.getByRole('radio', { name: /: Ekstra graving i grøften ved kum 4$/ }).check();
      await te.getByText(/^Brevet sier at varselet for P1 ble gitt i brev 2\./).waitFor();
      await te.screenshot({ path: `${ut}/varselvalg-valgt.png` });
      await te.setViewportSize({ width: 390, height: 844 });
      await valget.scrollIntoViewIfNeeded();
      await te.screenshot({ path: `${ut}/varselvalg-valgt-390.png` });
      await te.setViewportSize({ width: 1440, height: 900 });
      await te.addScriptTag({ path: createRequire(import.meta.url).resolve('axe-core/axe.min.js') });
      const brudd = await te.evaluate(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = await (window as any).axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        });
        return r.violations.map((v: { id: string; nodes: unknown[] }) => `${v.id} (${v.nodes.length})`);
      });
      console.log(`TE  axe på skjemaet: ${brudd.length ? brudd.join(', ') : 'ingen brudd'}`);
      await te.getByRole('button', { name: 'Se brevet før sending' }).first().click();
      await te.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
      await te.screenshot({ path: `${ut}/varselvalg-brevet.png`, fullPage: true });
      const [svar] = await Promise.all([
        te.waitForResponse(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => r.url().endsWith('/kommandoer') && r.request().method() === 'POST'
        ),
        te.getByRole('button', { name: 'Send til byggherren', exact: true }).click(),
      ]);
      const kommando = JSON.parse(svar.request().postData() ?? '{}');
      console.log(
        `TE  POST kommandoer (kravet): ${svar.status()}, varselet for P1 ${JSON.stringify(kommando.kommando?.innhold?.kravposter?.[0]?.varsel ?? kommando.innhold?.kravposter?.[0]?.varsel)}`
      );
      if (svar.status() !== 201) throw new Error(`Kravet ble ikke sendt: ${await svar.text()}`);
      await te.waitForLoadState('networkidle');
      await te.screenshot({ path: `${ut}/varselvalg-sendt.png` });
    },
  },
  'varselsvar-34-1': {
    tittel: 'Fjell i grøften langs fasade øst',
    formaal:
      '#2447: byggherrens svar på varselet etter punkt 34.1.2 og 34.1.3 som står alene (VS-U87 punkt 32, G-7 i BF-37), sendt gjennom serveren.',
    spor: 'vederlag',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'svikt',
        underkategori: 'grunnforhold',
        navn: 'K-g1',
        utdypning: 'Grøften langs fasade øst gikk i fjell der grunnundersøkelsen viste løsmasser.',
      },
      { handling: 'varsel', spor: 'vederlag', varsler: [{ hjemmel: '34.1.2' }, { hjemmel: '34.1.3' }] },
    ],
    async iNettleseren({ bh, saksrute, ut }) {
      await bh.goto(saksrute);
      await bh.getByRole('button', { name: 'Svar på varselet om vederlagsjustering' }).click({ timeout: 30_000 });
      await bh.getByRole('heading', { name: /^Svar på varsel om vederlagsjustering/ }).waitFor();
      await bh.screenshot({ path: `${ut}/varselsvar-3412-tomt.png`, fullPage: true });
      await bh.getByRole('radio', { name: 'Kom for sent' }).check();
      await bh.screenshot({ path: `${ut}/varselsvar-3412.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await bh.screenshot({ path: `${ut}/varselsvar-3412-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
      await bh.getByRole('button', { name: 'Se brevet før sending' }).first().click();
      await bh.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
      await bh.screenshot({ path: `${ut}/varselsvar-3412-brev.png`, fullPage: true });
      const [svar] = await Promise.all([
        bh.waitForResponse(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => r.url().endsWith('/kommandoer') && r.request().method() === 'POST'
        ),
        bh.getByRole('button', { name: 'Send til totalentreprenøren', exact: true }).click(),
      ]);
      console.log(`BH  POST kommandoer (svaret på varselet etter punkt 34.1.2): ${svar.status()}`);
      if (svar.status() !== 201) throw new Error(`Svaret ble ikke sendt: ${await svar.text()}`);
      await bh.waitForLoadState('networkidle');
      await bh.screenshot({ path: `${ut}/varselsvar-3412-sendt.png`, fullPage: true });
      await bh.goto(saksrute);
      await bh.getByRole('button', { name: 'Svar på varselet om særskilt vederlagsjustering' }).click({ timeout: 30_000 });
      await bh.getByRole('radio', { name: 'Kom i tide' }).check();
      await bh.screenshot({ path: `${ut}/varselsvar-3413.png`, fullPage: true });
    },
  },
  'varselsvar-34-1-2-endring': {
    tittel: 'Omlegging av overvann ved port 2',
    formaal:
      '#2447, #2470: gjelder saken en endring, tilbys ikke svaret på varselet etter punkt 34.1.2 (OV-U89 punkt 13).',
    spor: 'vederlag',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Byggherren har pålagt omlegging av overvannsledningen ved port 2.',
      },
      { handling: 'varsel', spor: 'vederlag', varsler: [{ hjemmel: '34.1.2' }] },
    ],
    async iNettleseren({ bh, saksrute, ut }) {
      await bh.goto(saksrute);
      await bh.getByRole('button', { name: 'Legg til korrespondanse' }).waitFor({ timeout: 30_000 });
      const knapper = await bh.getByRole('button', { name: /^Svar på varselet/ }).count();
      if (knapper !== 0) throw new Error(`Svaret på varselet tilbys (${knapper} knapper), OV-U89 punkt 13.`);
      await bh.screenshot({ path: `${ut}/varselsvar-3412-endring.png`, fullPage: true });
    },
  },
  innlegg: {
    tittel: 'Endrede tegninger for tunnelportalen',
    formaal:
      '#1377: innlegget i Varden fra begge parter (BF-03), fra svaret i BF-01 til et innlegg etter enigheten (G-5). BF-03 gjøres kjørbart i en egen PR.',
    spor: 'vederlag',
    // Stegene i BF-01 fram til kontrollpunktet te-har-mottatt-svaret, som utgangspunktet i BF-03.
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'svikt',
        underkategori: 'medvirkning',
        navn: 'K-g1',
        utdypning: 'Byggherren leverte tegningene for tunnelportalen tre uker etter avtalt tid.',
      },
      {
        handling: 'brev',
        navn: 'D2',
        svar: [{ spor: 'forhold', navn: 'S-g1', resultat: 'godkjent' }],
      },
      { handling: 'krav', spor: 'vederlag', belop: 100000, navn: 'K-v1' },
      {
        handling: 'brev',
        navn: 'D4',
        svar: [
          {
            spor: 'vederlag',
            navn: 'S-v1',
            vurdering: 'delvis',
            godkjent_belop: 60000,
            varslet_i_tide: false,
            utdypning: 'Varselet etter punkt 34.1.2 kom for sent. Subsidiært godtas 60 000 kr.',
          },
        ],
      },
    ],
    // Steg 1–7 i BF-03 i skjemaene, og et innlegg etter aksepten (G-5, MM-U47 punkt 12).
    async iNettleseren({ te, bh, saksrute, ut }) {
      const bilde = async (side: Side, navn: string) =>
        side.screenshot({ path: `${ut}/${navn}.png`, fullPage: true });
      const send = async (side: Side, knapp: string) => {
        await side.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
        await side.getByRole('button', { name: knapp }).click();
        await side
          .getByRole('checkbox', { name: 'Jeg har kontrollert brevet' })
          .waitFor({ state: 'detached', timeout: 30_000 });
      };
      const innlegg = async (side: Side, tittel: string, tekst: string) => {
        await side.getByRole('button', { name: 'Send innlegg' }).click({ timeout: 30_000 });
        await side.getByLabel('Tittel').fill(tittel);
        await side.getByLabel('Tekst').fill(tekst);
      };
      const tilBrevet = async (side: Side, tittel: string) => {
        await side.getByRole('button', { name: 'Se brevet før sending' }).first().click();
        await side
          .getByRole('article', { name: new RegExp(`^${tittel} i sak `) })
          .waitFor({ timeout: 30_000 });
      };

      // Steg 1–4: totalentreprenøren.
      await te.goto(saksrute);
      await te.getByRole('button', { name: /^Godta svaret/ }).waitFor({ timeout: 30_000 });
      await bilde(te, 'innlegg-te-traad');
      await te.getByRole('button', { name: 'Send innlegg' }).click();
      await te.getByRole('button', { name: 'Se brevet før sending' }).first().click();
      await te.getByText('Skriv tittelen.').first().waitFor();
      await bilde(te, 'innlegg-te-mangler');
      const t1 = 'Varselet om vederlagsjustering kom i tide';
      await te.getByLabel('Tittel').fill(t1);
      await te.getByLabel('Tekst').fill('Varselet ble sendt samme dag som tegningene kom.');
      await te.locator('input[type="file"]').setInputFiles({
        name: 'Epost med varselet 12.09.2026.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n%%EOF\n'),
      });
      await te.getByText('Epost med varselet 12.09.2026.pdf').first().waitFor({ timeout: 30_000 });
      await bilde(te, 'innlegg-te-skjema');
      await tilBrevet(te, t1);
      await bilde(te, 'innlegg-te-brevet');
      // U-5: tilbake til utkastet uten å miste teksten.
      await te.getByRole('link', { name: /Tilbake til utkastet/ }).click();
      if ((await te.getByLabel('Tittel').inputValue()) !== t1)
        throw new Error('Tittelen sto ikke i utkastet etter brevkontrollen (U-5)');
      await tilBrevet(te, t1);
      await send(te, 'Send til byggherren');
      await bilde(te, 'innlegg-te-sendt');
      await te.getByRole('button', { name: /Tilbake til saken/ }).click();
      await te.getByText('Viser til brev 4').first().waitFor({ timeout: 30_000 });
      // D-9: linja under betegnelsen, i hodet på siden og i sporlista.
      if (!(await te.getByText(/^Totalentreprenøren har sendt et innlegg /).count()))
        throw new Error('Linja under betegnelsen sier ikke at totalentreprenøren har sendt et innlegg (D-9)');
      await bilde(te, 'innlegg-te-traad-etter');

      // Steg 6–7: byggherren svarer med et innlegg som viser til totalentreprenørens.
      await bh.goto(saksrute);
      await bh.getByText('Viser til brev 4').first().waitFor({ timeout: 30_000 });
      await bilde(bh, 'innlegg-bh-traad');
      const t2 = 'Begrunnelse for svaret på vederlagskravet';
      await innlegg(bh, t2, 'Varselet kom tre uker etter at tegningene ble levert.');
      await bilde(bh, 'innlegg-bh-skjema');
      await tilBrevet(bh, t2);
      await bilde(bh, 'innlegg-bh-brevet');
      await send(bh, 'Send til totalentreprenøren');
      await bilde(bh, 'innlegg-bh-sendt');

      // Steg 5: aksepten viser innlegget som viser til svaret (D-8). Så et innlegg etter
      // enigheten, som godtas (G-5).
      await te.goto(saksrute);
      await te.getByRole('button', { name: /^Godta svaret/ }).click({ timeout: 30_000 });
      await te.getByRole('list', { name: 'Innlegg som viser til brev 4' }).waitFor();
      await bilde(te, 'innlegg-te-godta');
      await send(te, 'Send til byggherren');
      await te.getByRole('button', { name: /Tilbake til saken/ }).click();
      const t3 = 'Merknad etter aksepten';
      await innlegg(te, t3, 'Totalentreprenøren står ved at varselet kom i tide.');
      await tilBrevet(te, t3);
      await send(te, 'Send til byggherren');
      await te.getByRole('button', { name: /Tilbake til saken/ }).click();
      await bilde(te, 'innlegg-te-etter-enigheten');
      await te.setViewportSize({ width: 390, height: 844 });
      await bilde(te, 'innlegg-te-etter-enigheten-390');
      await te.setViewportSize({ width: 1440, height: 900 });
    },
  },
  'varselsvar-33-4': {
    tittel: 'Endret trappeløsning i trapperom B',
    formaal:
      '#2456: byggherrens svar på varselet om fristforlengelse etter punkt 33.4 som står alene (VS-U96 punkt 32), sendt gjennom serveren, og et nytt svar som erstatter det.',
    spor: 'frist',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Byggherren har pålagt endret trappeløsning i trapperom B.',
      },
      { handling: 'varsel', spor: 'frist', navn: 'V-f1' },
    ],
    async iNettleseren({ bh, saksrute, ut }) {
      await bh.goto(saksrute);
      await bh.getByRole('button', { name: 'Svar på varselet om fristforlengelse' }).click({ timeout: 30_000 });
      await bh.getByRole('heading', { name: /^Svar på varsel om fristforlengelse/ }).waitFor();
      await bh.screenshot({ path: `${ut}/varselsvar-334-tomt.png`, fullPage: true });
      await bh.getByRole('radio', { name: 'Kom for sent' }).check();
      await bh.screenshot({ path: `${ut}/varselsvar-334.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await bh.screenshot({ path: `${ut}/varselsvar-334-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
      await bh.getByRole('button', { name: 'Se brevet før sending' }).first().click();
      await bh.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
      await bh.screenshot({ path: `${ut}/varselsvar-334-brev.png`, fullPage: true });
      const [svar] = await Promise.all([
        bh.waitForResponse(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => r.url().endsWith('/kommandoer') && r.request().method() === 'POST'
        ),
        bh.getByRole('button', { name: 'Send til totalentreprenøren', exact: true }).click(),
      ]);
      console.log(`BH  POST kommandoer (svaret på varselet etter punkt 33.4): ${svar.status()}`);
      if (svar.status() !== 201) throw new Error(`Svaret ble ikke sendt: ${await svar.text()}`);
      await bh.getByRole('button', { name: /Tilbake til saken/ }).waitFor({ timeout: 30_000 });
      await bh.screenshot({ path: `${ut}/varselsvar-334-kvittering.png`, fullPage: true });
      // Fristen etter sendingen, med svaret i tråden og handlingen for et nytt svar.
      await bh.goto(saksrute);
      const nytt = bh.getByRole('button', { name: 'Nytt svar på varselet om fristforlengelse' });
      await nytt.waitFor({ timeout: 30_000 });
      await bh.screenshot({ path: `${ut}/varselsvar-334-sendt.png`, fullPage: true });
      // VS-U96 punkt 33 og 34: et nytt svar gjentar innsigelsen til byggherren gir den opp.
      await nytt.click();
      await bh.getByText('Svaret gjentar innsigelsen.').waitFor();
      await bh.screenshot({ path: `${ut}/varselsvar-334-nytt.png`, fullPage: true });
    },
  },
  'bare-varselet-i-kravet': {
    tittel: 'Pumping og graving ved kum 4',
    formaal:
      '#2456 (K2): byggherrens svar bare på varslene i vederlagskravet, per kravpost, når kravet selv er varselet etter punkt 34.3.3 og 34.4 (VS-U96 punkt 38 og 39), sendt gjennom serveren.',
    spor: 'vederlag',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Byggherren har pålagt omlegging av ledningene ved kum 4.',
      },
      {
        handling: 'krav',
        spor: 'vederlag',
        navn: 'K-v1',
        kravposter: [
          { oppgjoersform: 'regningsarbeid', varsel: 'kravet' },
          { oppgjoersform: 'enhetspriser', justert: true, varsel: 'kravet' },
          { oppgjoersform: 'tilbud', belop: 40000 },
        ],
      },
    ],
    async iNettleseren({ bh, saksrute, ut }) {
      await bh.goto(saksrute);
      await bh.getByRole('button', { name: 'Svar på varslene i kravet' }).waitFor({ timeout: 30_000 });
      await bh.screenshot({ path: `${ut}/bare-varslene-handlingen.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await bh.screenshot({ path: `${ut}/bare-varslene-handlingen-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
      await bh.getByRole('button', { name: 'Svar på varslene i kravet' }).click();
      await bh.getByRole('heading', { name: /^Svar på varslene i krav om vederlagsjustering/ }).waitFor();
      await bh.screenshot({ path: `${ut}/bare-varslene-tomt.png`, fullPage: true });
      // Dialogen «Forkaste utkastet?» (#2493).
      await bh.getByRole('button', { name: 'Forkast utkast' }).click();
      const dialogen = bh.getByRole('dialog');
      await dialogen.waitFor();
      await dialogen.screenshot({ path: `${ut}/forkastdialog.png` });
      await bh.setViewportSize({ width: 390, height: 844 });
      await dialogen.screenshot({ path: `${ut}/forkastdialog-390.png` });
      await bh.setViewportSize({ width: 1440, height: 900 });
      await dialogen.getByRole('button', { name: 'Behold utkastet' }).click();
      await bh.getByRole('button', { name: 'Se brevet før sending' }).first().click();
      await bh.screenshot({ path: `${ut}/bare-varslene-mangler.png`, fullPage: true });
      await bh.getByRole('button', { name: 'Varselet kom for sent' }).click();
      const p2 = bh.getByRole('region', { name: /P2 / });
      await p2.getByRole('radio', { name: 'Kom for sent' }).check();
      await p2.getByRole('radio', { name: 'Godtar justeringen' }).check();
      await bh.getByText('Gjelder hvis').first().waitFor();
      await bh.screenshot({ path: `${ut}/bare-varslene.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await bh.screenshot({ path: `${ut}/bare-varslene-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
      await bh.getByRole('button', { name: 'Se brevet før sending' }).first().click();
      await bh.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
      await bh.screenshot({ path: `${ut}/bare-varslene-brev.png`, fullPage: true });
      const [svar] = await Promise.all([
        bh.waitForResponse(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => r.url().endsWith('/kommandoer') && r.request().method() === 'POST'
        ),
        bh.getByRole('button', { name: 'Send til totalentreprenøren', exact: true }).click(),
      ]);
      console.log(`BH  POST kommandoer (svaret bare på varslene i vederlagskravet): ${svar.status()}`);
      if (svar.status() !== 201) throw new Error(`Svaret ble ikke sendt: ${await svar.text()}`);
      await bh.getByRole('button', { name: /Tilbake til saken/ }).waitFor({ timeout: 30_000 });
      // VS-U96 punkt 39: svarplikten for kravet står, og et nytt svar på varslene tilbys.
      await bh.goto(saksrute);
      await bh.getByRole('button', { name: 'Svar på kravet' }).waitFor({ timeout: 30_000 });
      await bh.screenshot({ path: `${ut}/bare-varslene-sendt.png`, fullPage: true });
    },
  },
  'bare-varselet-i-fristkravet': {
    tittel: 'Peling i akse C',
    formaal:
      '#2456 (K2): byggherrens svar bare på varselet når fristkravet selv er varselet etter punkt 33.4 (VS-U96 punkt 38 og 39), sendt gjennom serveren, tidslinja etterpå (#2481) og innsigelsen i svaret på kravet (VS-U96 punkt 34).',
    spor: 'frist',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Byggherren har pålagt flere peler i akse C.',
      },
      { handling: 'krav', spor: 'frist', navn: 'K-f1', dager: 20 },
    ],
    async iNettleseren({ bh, saksrute, ut }) {
      await bh.goto(saksrute);
      const svaret = bh.getByRole('button', { name: 'Svar på varselet om fristforlengelse' });
      await svaret.waitFor({ timeout: 30_000 });
      await bh.screenshot({ path: `${ut}/bare-fristvarselet-handlingen.png`, fullPage: true });
      await svaret.click();
      await bh.getByRole('heading', { name: /^Svar på varsel om fristforlengelse/ }).waitFor();
      await bh.getByRole('radio', { name: 'Kom for sent' }).check();
      await bh.screenshot({ path: `${ut}/bare-fristvarselet.png`, fullPage: true });
      await bh.getByRole('button', { name: 'Se brevet før sending' }).first().click();
      await bh.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
      await bh.screenshot({ path: `${ut}/bare-fristvarselet-brev.png`, fullPage: true });
      const [svar] = await Promise.all([
        bh.waitForResponse(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => r.url().endsWith('/kommandoer') && r.request().method() === 'POST'
        ),
        bh.getByRole('button', { name: 'Send til totalentreprenøren', exact: true }).click(),
      ]);
      console.log(`BH  POST kommandoer (svaret bare på varselet i fristkravet): ${svar.status()}`);
      if (svar.status() !== 201) throw new Error(`Svaret ble ikke sendt: ${await svar.text()}`);
      await bh.getByRole('button', { name: /Tilbake til saken/ }).waitFor({ timeout: 30_000 });
      await bh.goto(saksrute);
      await bh.getByRole('button', { name: 'Nytt svar på varselet om fristforlengelse' }).waitFor({ timeout: 30_000 });
      await bh.screenshot({ path: `${ut}/bare-fristvarselet-sendt.png`, fullPage: true });
      // VS-U96 punkt 34: svaret på kravet viser innsigelsen og gjentar den.
      await bh.getByRole('button', { name: 'Svar på kravet' }).click();
      await bh.getByText('Svaret gjentar innsigelsen.').waitFor({ timeout: 30_000 });
      await bh.screenshot({ path: `${ut}/fristsvar-innsigelsen.png`, fullPage: true });
      await bh.getByRole('button', { name: 'Gi opp innsigelsen' }).click();
      await bh.getByText('Du gir opp innsigelsen.').waitFor();
      await bh.screenshot({ path: `${ut}/fristsvar-oppgitt.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await bh.screenshot({ path: `${ut}/fristsvar-oppgitt-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
    },
  },
  'varsler-i-ett-brev': {
    tittel: 'Graving og fjernvarme ved kum 4',
    formaal:
      '#2451: byggherrens svar på flere varsler i samme brev, i ett svarskjema og ett brev med ett svar per varsel (M-5 og U-8 i BF-37, svaret 27.11 i #2451), sendt gjennom serveren.',
    spor: 'vederlag',
    steg: [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        navn: 'K-g1',
        utdypning: 'Byggherren har pålagt omlegging av ledningene ved kum 4.',
      },
      {
        handling: 'varsel',
        spor: 'vederlag',
        varsler: [
          { hjemmel: '34.4', arbeid: 'Ekstra graving i grøften ved kum 4' },
          { hjemmel: '34.4', arbeid: 'Omlegging av fjernvarmerør langs fasade nord' },
          { hjemmel: '34.3.3', arbeid: 'Økte mengder sprengstein i byggegropen' },
        ],
      },
    ],
    async iNettleseren({ bh, saksrute, ut }) {
      await bh.goto(saksrute);
      const handlingen = bh.getByRole('button', { name: 'Svar på varslene', exact: true });
      await handlingen.waitFor({ timeout: 30_000 });
      await bh.screenshot({ path: `${ut}/varselbrev-handlingen.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await bh.screenshot({ path: `${ut}/varselbrev-handlingen-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
      await handlingen.click();
      await bh.getByRole('heading', { name: /^Svar på varslene i brev/ }).first().waitFor();
      await bh.screenshot({ path: `${ut}/varselbrev-tomt.png`, fullPage: true });
      await bh.getByRole('button', { name: 'Se brevet før sending' }).first().click();
      await bh.screenshot({ path: `${ut}/varselbrev-mangler.png`, fullPage: true });
      const rad = (nr: number) =>
        bh
          .locator('section')
          .filter({ has: bh.getByRole('heading', { name: new RegExp(`^${nr}\\. Varselet`) }) })
          .last();
      await rad(2).getByRole('button', { name: 'Varselet kom for sent' }).click();
      await rad(3).getByRole('radio', { name: 'Kom for sent' }).check();
      await rad(3).getByRole('radio', { name: 'Bestrider justeringen' }).check();
      await rad(2).getByRole('textbox', { name: /^Begrunnelse/ }).fill('Graving var i gang før varselet kom.');
      await bh.getByText('Gjelder hvis').first().waitFor();
      await bh.screenshot({ path: `${ut}/varselbrev-svar.png`, fullPage: true });
      await bh.setViewportSize({ width: 390, height: 844 });
      await bh.screenshot({ path: `${ut}/varselbrev-svar-390.png`, fullPage: true });
      await bh.setViewportSize({ width: 1440, height: 900 });
      await bh.getByRole('button', { name: 'Se brevet før sending' }).first().click();
      await bh.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
      await bh.screenshot({ path: `${ut}/varselbrev-brev.png`, fullPage: true });
      const [svar] = await Promise.all([
        bh.waitForResponse(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => r.url().endsWith('/kommandoer') && r.request().method() === 'POST'
        ),
        bh.getByRole('button', { name: 'Send til totalentreprenøren', exact: true }).click(),
      ]);
      console.log(`BH  POST kommandoer (svaret på varslene i brevet): ${svar.status()}`);
      if (svar.status() !== 201) throw new Error(`Svaret ble ikke sendt: ${await svar.text()}`);
      await bh.getByRole('button', { name: /Tilbake til saken/ }).waitFor({ timeout: 30_000 });
      // VS-U96 punkt 33: etterpå står svaret på det tredje varselet og nye svar for hvert varsel.
      await bh.goto(saksrute);
      await bh.getByRole('button', { name: /^Svar på varselet om regningsarbeid/ }).waitFor({ timeout: 30_000 });
      await bh.screenshot({ path: `${ut}/varselbrev-sendt.png`, fullPage: true });
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
