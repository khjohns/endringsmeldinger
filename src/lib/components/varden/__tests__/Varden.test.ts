/**
 * Varden i demoruta (#1331), med brukerforløpet BF-01 og kjernen i minnet. BH fyller ut svaret
 * i Varden, kontrollerer brevet og sender det, og TE tar stilling og godtar det. Kontrollene
 * ved kontrollpunktene er forløpets, med kilde (`kontrollerEtter`).
 * Handlingene i sporet er de kjernen tilbyr.
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import { MERKING, linje, medGrunnlag, skrevet } from '#lib/kjernesak/__tests__/provejournal.ts';
import { kjoerBrukerforloep, kontrollpunkt, somForloep } from '#kjerne/tester/brukerforloep.ts';
import { kontrollerEtter } from '#kjerne/tester/kjoerer.ts';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import Vederlagssvar from '#lib/components/varden/Vederlagssvar.svelte';
import { tomPost, tomtSvar } from '#lib/components/varden/kommandoer.ts';
import {
  registrerOppsett,
  BF,
  START,
  paastand,
  BEGRUNNELSE,
  versjonVed,
  nyeRader,
  aapne,
  demopanel,
  bhSvarerIVarden,
  avsnittene,
  sendBrevet,
} from './vardenOppsett.ts';

registrerOppsett();

describe('Varden med brukerforløpet BF-01', () => {
  it('vederlagssvaret viser begge kravpostene i panelet og i brevet (#2234, KA-U53)', async () => {
    const journal = skrevet(medGrunnlag, 'TE', {
      type: 'krav',
      spor: 'vederlag',
      innhold: {
        kravposter: [
          { beskrivelse: 'Peling', oppgjoersform: 'tilbud', beloep: 10000 },
          { beskrivelse: 'Utgraving', oppgjoersform: 'tilbud', beloep: 20000 },
        ],
      },
      utdypning: 'Postene gjelder to ulike arbeider.',
    });
    const kjernesak = lagKjernesak({
      sakId: journal[0]!.sak_id,
      prosjektId: 'demo',
      part: 'BH',
      hent: async () => ({
        versjon: journal.at(-1)!.versjon,
        part: 'BH',
        visning: null as never,
        journal: journal.map(linje),
        leveringsoppdrag: [],
        catenda_lenke: null,
        sakskode: null,
        kontraktsforkortelse: null,
        kan_foreslaa_sakskode: false,
        merking: MERKING,
      }),
    });
    await kjernesak.last();
    const godkjent = { ...tomPost(), form: 'godtar' as const, beloep: 'hele' as const };
    const kontroller = vi.fn();
    render(Vederlagssvar, {
      kjernesak,
      u: kjernesak.utledning!,
      valg: { ...tomtSvar(), poster: { P1: godkjent, P2: { ...godkjent } } },
      onbrevkontroll: kontroller,
      onforkast: () => {},
    });
    const panel = within(screen.getByRole('region', { name: 'Punktene i brevet' }));
    // #2359 punkt 3: navnet på posten er det samme før og etter brevet. P2 står i samme punkt i
    // brevet som P1, så bare P1 har nummeret.
    expect(panel.getByText(/^\d+\. Vederlagsjustering \(punkt.34\.1\.\d\) · P1$/)).toBeVisible();
    expect(panel.getByText(/^Vederlagsjustering \(punkt.34\.1\.\d\) · P2$/)).toBeVisible();
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    expect(kontroller).toHaveBeenCalledOnce();
    const avsnitt = kontroller.mock.calls[0]![0].avsnitt as { punkt: string }[];
    expect(avsnitt.filter((a) => /^P[12]$/.test(a.punkt)).map((a) => a.punkt)).toEqual([
      'P1',
      'P2',
    ]);
  });

  it('bekrefter sendingen i sporet brukeren har åpnet mens brevet ble sendt (#2210)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const sending = Promise.withResolvers<void>();
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send: async (...args) => {
        await sending.promise;
        return demosak.send(...args);
      },
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak });
    await bhSvarerIVarden();
    await sendBrevet('Send til totalentreprenøren');
    expect(kjernesak.sender).toBe(true);

    await fireEvent.click(screen.getByRole('button', { name: /^Fristforlengelse/ }));
    sending.resolve();

    expect(await screen.findByText('Brevet er sendt til totalentreprenøren.')).toBeVisible();
    expect(screen.getByRole('button', { name: /^Fristforlengelse/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.queryByRole('button', { name: 'Tilbake til saken' })).toBeNull();
  });

  it('BH sender svaret og TE godtar det i Varden, og kontrollene ved kontrollpunktene holder', async () => {
    const forloep = somForloep(BF);
    const punkt = kontrollpunkt(BF, 'bh-har-mottatt-vederlagskravet');
    const { k, bane } = await kjoerBrukerforloep(BF, { til: punkt.id, paastand });
    const demosak = aapne(punkt.id);
    expect(await screen.findByRole('heading', { name: BF.tittel, level: 1 })).toBeInTheDocument();
    bane.journal = async () => demosak().journal();

    // Steg 4: BH vurderer varslingen og beløpet, kontrollerer brevet og sender svaret.
    const vist = await bhSvarerIVarden();
    const brevkontrollen = within(screen.getByRole('region', { name: 'Sending' }));
    expect(brevkontrollen.getByText('Kontroller og send')).toHaveAttribute('aria-current', 'step');
    // KA-U49, designdelen, og svar 2A 18.11 i #2194.
    expect(
      brevkontrollen.getByText('Enigheten registreres ut fra valgene du har gjort.')
    ).toBeVisible();
    expect(
      within(brevkontrollen.getByRole('list', { name: 'Punktene i brevet' }))
        .getAllByRole('listitem')
        .map((rad) => rad.textContent?.trim())
    ).toEqual(vist.filter((avsnitt) => /^\d+\. /.test(avsnitt)));
    // LV-U34: lagslinjen står for seg over påberopelsen, og begrunnelsen under punktet.
    expect(vist).toContain('Prinsipalt');
    expect(vist.join(' ')).toMatch(/Byggherren gjør gjeldende at varselet om vederlagsjustering/);
    expect(vist).toContain(BEGRUNNELSE);
    // MM-U34 punkt 26: skjemaet sier ikke at BH er bundet av svaret eller at det ikke kan revideres.
    // OV-U81 og #1443: hvordan løsningen virker, står på siden «Om Varden», ikke ved feltene.
    expect(document.body.textContent).not.toMatch(/tolkes ikke|vurderes ikke/);
    expect(document.body.textContent).not.toMatch(/er bundet av svaret|kan ikke revideres/);
    expect(document.body.textContent).not.toMatch(/\bKA-U\d/);
    await sendBrevet('Send til totalentreprenøren');
    await vi.waitFor(() => expect(nyeRader(demosak(), versjonVed(punkt.id))).toHaveLength(1));
    const [svaret] = nyeRader(demosak(), versjonVed(punkt.id));
    expect(svaret.aktor_rolle).toBe('BH');
    // LV-U2: teksten BH kontrollerte, er teksten som er frosset i brevet.
    const frosset = svaret.data.brevtekst as { laast: string; utdypning?: string }[];
    // Et punkt viser overskriften og hvert avsnitt for seg (LV-U70).
    expect(
      frosset.flatMap((a) => [...a.laast.split('\n\n'), ...(a.utdypning ? [a.utdypning] : [])])
    ).toEqual(vist);
    k.registrer(BF.steg![3], [svaret]);
    await kontrollerEtter(forloep, 4, k, paastand);

    // Steg 5: TE åpner saken og ser akkurat det svaret BH skrev, i sin helhet.
    await fireEvent.click(demopanel().getByRole('radio', { name: 'TE' }));
    const mottatt = await screen.findByRole('article', {
      name: 'Svar på krav om vederlagsjustering i sak KOE-17',
    });
    expect(avsnittene(mottatt)).toEqual(vist);
    // Aksepten står ved byggherrens svar, med linja om hva den gjør, og resten står synlig under
    // «Andre handlinger», uten panel (U-16 i BF-44, oppdragsgiver 06.11, #1631).
    const kortet = within(screen.getByRole('main'));
    expect(kortet.queryByText(/Du godtar hele svaret i brev 4\./)).toBeNull();
    expect(kortet.getByRole('region', { name: 'Andre handlinger' })).toBeTruthy();
    await fireEvent.click(kortet.getByRole('button', { name: /^Godta svaret/ }));
    // Aksepten går rett til brevkontrollen fra saken, så lenken går dit (review av #2200).
    expect(screen.getByRole('link', { name: 'Tilbake til saken' })).toBeTruthy();
    // KA-U1, GR-U7: aksepten omfatter påberopelsen, og kjernen gir beløpet 0 kr etter den. Det
    // står i brevkontrollen før sendingen.
    const kontrollen = screen.getByRole('region', { name: 'Sending' });
    expect(kontrollen.textContent).toMatch(
      /Aksepten omfatter også at byggherren gjør gjeldende at varselet etter punkt\u00a034\.1\.2 kom for sent/
    );
    expect(kontrollen.textContent).toMatch(/enige om for vederlagsjusteringen 0\skr/);
    await sendBrevet('Send til byggherren');
    await vi.waitFor(() => expect(nyeRader(demosak(), svaret.versjon)).toHaveLength(1));
    const [aksepten] = nyeRader(demosak(), svaret.versjon);
    expect(aksepten.aktor_rolle).toBe('TE');
    k.registrer(BF.steg![4], [aksepten]);
    await kontrollerEtter(forloep, 5, k, paastand);
    // Etter aksepten tilbyr kjernen ikke å godta på nytt: enigheten er registrert (GR-U8).
    expect(screen.queryByRole('button', { name: /^Godta svaret/ })).toBeNull();
  });

  it('«Se brevet før sending» er alltid aktiv, og klikket uten svar viser det som mangler ved feltet og øverst, ikke brevet (MM-U32, BF-01 S-3 B)', async () => {
    // MM-U32: «En handling parten kan gjøre nå, er alltid aktiv. Mangler noe i skjemaet,
    // kontrollerer appen det når parten sender, og sier ved feltet og øverst i skjemaet hva som
    // mangler.» BF-01 S-3: reserven B, fordi kjernen ikke lager tekst for et ufullstendig svar.
    aapne('bh-har-mottatt-vederlagskravet');
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const varselpunkt = screen
      .getByRole('group', { name: 'Kom varselet om kravet i tide?' })
      .closest('section');
    const metodepunktet = screen.getByRole('group', { name: /^Oppgjørsformen/ }).closest('section');
    expect(varselpunkt).toHaveClass('aktiv');
    expect(metodepunktet).not.toHaveClass('aktiv');
    const seBrevet = screen.getByRole('button', { name: 'Se brevet før sending' });
    expect(seBrevet).not.toHaveAttribute('aria-disabled');
    const punktpanelet = within(screen.getByRole('region', { name: 'Punktene i brevet' }));
    expect(punktpanelet.getAllByText('Ikke besvart').length).toBeGreaterThan(0);
    expect(punktpanelet.getByRole('listitem', { current: 'step' })).toHaveTextContent(/Varselet/);
    expect(screen.queryByRole('group', { name: 'Dette mangler før brevet kan lages:' })).toBeNull();

    await fireEvent.click(seBrevet);
    expect(
      screen.queryByRole('article', { name: 'Svar på krav om vederlagsjustering i sak KOE-17' })
    ).toBeNull();
    const oeverst = await screen.findByRole('group', {
      name: 'Dette mangler før brevet kan lages:',
    });
    expect(document.activeElement).toBe(oeverst);
    expect(
      within(oeverst)
        .getAllByRole('listitem')
        .map((l) => l.textContent)
    ).toEqual([
      'Velg om varselet kom i tide.',
      'Velg om du godkjenner fast sum (punkt\u00a034.2.1).',
      'Velg hvor mye av beløpet du godkjenner.',
    ]);
    const ved = (spoersmaal: string) =>
      screen.getByRole('group', { name: spoersmaal }).getAttribute('aria-describedby');
    const tekstVed = (spoersmaal: string) =>
      document.getElementById(ved(spoersmaal) ?? '')?.textContent ?? null;
    expect(tekstVed('Kom varselet om kravet i tide?')).toBe('Velg om varselet kom i tide.');
    expect(tekstVed('Hvor mye av beløpet godkjenner du?')).toBe(
      'Velg hvor mye av beløpet du godkjenner.'
    );

    // Beskjeden ved feltet forsvinner når feltet er besvart.
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    expect(varselpunkt).not.toHaveClass('aktiv');
    expect(metodepunktet).toHaveClass('aktiv');
    expect(punktpanelet.getByRole('listitem', { current: 'step' })).toHaveTextContent(
      /Beregningsmetode/
    );
    expect(ved('Kom varselet om kravet i tide?')).toBeNull();
    expect(
      within(
        screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' })
      ).getAllByRole('listitem')
    ).toHaveLength(2);

    await fireEvent.click(
      screen.getByRole('radio', { name: 'Godkjenner fast sum (punkt\u00a034.2.1)' })
    );
    await fireEvent.click(screen.getByRole('radio', { name: 'Deler av beløpet' }));
    const beloep = await screen.findByRole('textbox', { name: 'Beløpet du godkjenner' });
    await fireEvent.input(beloep, { target: { value: '150 000' } });
    expect(beloep).toHaveAttribute('aria-invalid', 'true');
    expect(beloep.getAttribute('aria-describedby')).toMatch(/-delbeloep-P1-feil$/);
    expect(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' }).textContent
    ).toMatch(/Beløpet du godkjenner må være mer enn 0 kr og mindre enn 100\s000\skr\./);
    // Et punktum er ikke desimaltegn i et beløp: «60.000» blir ikke 60 kr.
    await fireEvent.input(beloep, { target: { value: '60.000' } });
    expect(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' }).textContent
    ).toContain('Skriv beløpet med sifre og komma før øre, for eksempel 100 000,40.');
    expect(document.body.textContent).not.toMatch(/_vurdering|_beloe?p|mangler;|\bKA-U\d/);

    await fireEvent.input(beloep, { target: { value: '60 000' } });
    // KA-U46 punkt 1: begrunnelsen er valgfri i hvert punkt i svaret på vederlaget, også når BH
    // gjør gjeldende sen varsling og ikke godtar hele beløpet.
    expect(screen.queryByRole('group', { name: 'Dette mangler før brevet kan lages:' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    expect(
      await screen.findByRole('article', {
        name: 'Svar på krav om vederlagsjustering i sak KOE-17',
      })
    ).toBeInTheDocument();
  });

  it('etter «Varslet for sent» står beløpsspørsmålet under «Gjelder hvis» med innsigelsen det bygger på (oppdragsgiver 30.10, #1391)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const beloep = () => screen.getByRole('group', { name: 'Hvor mye av beløpet godkjenner du?' });
    expect(beloep().getAttribute('aria-describedby')).toBeNull();
    expect(screen.queryByText('Gjelder hvis')).toBeNull();

    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    const forutsetninger = document.getElementById(beloep().getAttribute('aria-describedby')!)!;
    expect(forutsetninger.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Gjelder hvis innsigelsen om at varselet etter punkt 34.1.2 kom for sent ikke fører frem'
    );
    const lenke = within(forutsetninger).getByRole('link', {
      name: 'innsigelsen om at varselet etter punkt\u00a034.1.2 kom for sent',
    });
    expect(document.querySelector(lenke.getAttribute('href')!)).toBe(
      screen.getByRole('group', { name: 'Kom varselet om kravet i tide?' })
    );

    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet i tide' }));
    expect(screen.queryByText('Gjelder hvis')).toBeNull();
  });

  it('«Send til totalentreprenøren» er aktiv uten avkrysning, og klikket sender ikke, men sier fra ved avkrysningen (MM-U32)', async () => {
    const demosak = aapne('bh-har-mottatt-vederlagskravet');
    await bhSvarerIVarden();
    const send = screen.getByRole('button', { name: 'Send til totalentreprenøren' });
    expect(send).not.toHaveAttribute('aria-disabled');
    const avkrysning = screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' });
    // Beskjeden må være koblet til før fokus flyttes, ellers leser skjermleseren den ikke.
    let vedFokus: string | null = null;
    avkrysning.addEventListener('focus', () => {
      vedFokus = avkrysning.getAttribute('aria-describedby');
    });
    await fireEvent.click(send);
    expect(document.activeElement).toBe(avkrysning);
    expect(vedFokus).not.toBeNull();
    expect(avkrysning).toHaveAttribute('aria-invalid', 'true');
    expect(
      document.getElementById(avkrysning.getAttribute('aria-describedby')!)?.textContent
    ).toMatch(/Kryss av for at du har kontrollert brevet, så kan du sende\./);
    expect(nyeRader(demosak(), versjonVed('bh-har-mottatt-vederlagskravet'))).toHaveLength(0);
  });

  it('#1466 og #1467: skjemaet og brevkontrollen bruker ordene i sprak.md og OV-U75, og forklaringene av løsningen står ikke ved feltene (#2187)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    // Teksten i brevet kommer fra kjernen og hører til #1433.
    const synlig = () => {
      const kopi = document.body.cloneNode(true) as HTMLElement;
      kopi
        .querySelectorAll('[role="note"], [data-testid="laast-tekst"]')
        .forEach((e) => e.remove());
      return kopi.textContent!.replace(/\s+/g, ' ');
    };
    const FORKLARINGER = [
      'Løsningen viser datoene',
      'Virkningen av svaret regnes ut fra valgene over',
      'Teksten lages fra valgene og kan ikke endres her',
      'Skjermvisning som tåler tekstforstørrelse',
      'Et sendt brev kan ikke endres',
    ];
    const kontroller = () => {
      const tekst = synlig();
      expect(tekst).not.toMatch(/§/);
      expect(tekst).not.toMatch(/hovedkrav/i);
      // Totalentreprenøren godtar svaret; byggherren godkjenner (sprak.md, «Godkjenner og godtar»),
      // men godtar en beregningsregel og justeringen av enhetsprisene (svar 2 A 24.11, #2184).
      expect(
        tekst.replace(
          /TE godtar|Godtar totalentreprenøren|godtar (ikke )?(oppgjørsformen|justeringen|enhetspriser|regningsarbeid)/gi,
          ''
        )
      ).not.toMatch(/\bgodtar\b/i);
      expect(tekst).not.toMatch(/(?<!total)entreprenøren/i);
      for (const f of FORKLARINGER) expect(tekst).not.toContain(f);
    };

    await bhSvarerIVarden();
    kontroller();

    await fireEvent.click(screen.getByRole('link', { name: 'Tilbake til utkastet' }));
    kontroller();
    expect(screen.queryByText('Om varselet kom i tide, avgjør partene.')).toBeNull();
  });
});
