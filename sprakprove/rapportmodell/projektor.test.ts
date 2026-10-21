import { describe, expect, it } from 'vitest';
import { lagForloep, lagKontrollsak, PROSJEKT, VEDLEGG } from './forloep.ts';
import { kalenderdager, maalVed, portefolje, projiser, sporVed } from './projektor.ts';
import { utledJournal } from '../../kjerne/kommandoer/skriving.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { noekkeltall, sakslinje } from '../../server/saksliste.ts';

const { sak, r1 } = lagForloep();
const kontroll = lagKontrollsak();
const p = projiser(sak.journal, PROSJEKT);
const ved = (versjon: number) => sporVed(sak.journal.slice(0, versjon));

describe('avgrenset rapportprøve for #554', () => {
  it('alle kommandoer godtas og hver faktisk versjon får tre spor (bestillingen)', () => {
    expect(sak.steg.every((s) => s.godtatt)).toBe(true);
    expect(sak.steg.map((s) => s.saksversjon)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(p.sporhistorikk).toHaveLength(30);
    expect(kontroll.steg.every((s) => s.godtatt)).toBe(true);
  });

  it('bevarer 150 000 i kravet og gjør aksepten av 120 000 virksom først ved H (GR-U7, HF-U9, MM-U28)', () => {
    const v8 = ved(8).find((r) => r.spor === 'vederlag')!;
    const v10 = ved(10).find((r) => r.spor === 'vederlag')!;
    expect(v8.enighet_virkning).toBe('betinget');
    expect(v10.enighet_virkning).toBe('virksom');
    expect(v10.te_krav).toEqual({ metode: 'tilbud', beloep: 150000 });
    expect(v10.enighet?.utfall).toEqual({ beloep: 120000 });
    expect(
      p.krav
        .filter((r) => r.spor === 'vederlag')
        .map((r) => (r.innhold as { beloep: number }).beloep)
    ).toEqual([100000, 150000]);
  });

  it('sen opplysning endrer ikke svaret eller akseptens innhold; prinsipalt avslag gir 0 dager (OV-U5, KA-U10, HF-U9, VS-U3)', () => {
    const foer = ved(6).find((r) => r.spor === 'frist')!;
    const etter = ved(10).find((r) => r.spor === 'frist')!;
    expect(etter.svar_id).toBe(foer.svar_id);
    expect(etter.bh_standpunkt).toEqual(foer.bh_standpunkt);
    expect(etter.frosne_virkninger).toEqual(foer.frosne_virkninger);
    expect(etter.annet_varsel).toHaveLength(1);
    expect(etter.bh_tall).toBe(10);
    expect(etter.tall_subsidiaert).toBe(true);
    expect(ved(9).find((r) => r.spor === 'frist')!.enighet_virkning).toBe('betinget');
    expect(etter.enighet?.utfall).toEqual({ dager: 0 });
    expect(etter.enighet_virkning).toBe('virksom');
    const u = utledJournal(sak.journal, KJERNE);
    expect(
      u.spor.frist.gjeldendeSvar!.standpunkter.find((r) => r.art === 'rettidighet')?.gjelder
    ).toBe(u.spor.frist.krav[0].id);
  });

  it('kontroll med uttrykkelig annet varslingstandpunkt gir 10 dager ved H (GR-U7, HF-U9)', () => {
    const alternativ = lagForloep(true, 3).sak;
    const u = utledJournal(alternativ.journal, KJERNE);
    expect(u.spor.frist.enighet?.grunnlag.utfall).toEqual({ dager: 10 });
    expect(sporVed(alternativ.journal).find((r) => r.spor === 'frist')!.enighet_virkning).toBe(
      'virksom'
    );
  });

  it('teller revidert krav én gang med uendret kontrollsak, fordelt på eksisterende ansvarsgrunnlag (bestillingen, MM-U28)', () => {
    const n = portefolje([sak.journal.slice(0, 5), kontroll.journal]);
    expect(n.krav_sum).toBe(350000);
    expect(n.krav_antall).toBe(2);
    expect(n.grupper.map((r) => [r.underkategori, r.krav_sum])).toEqual([
      ['grunnforhold', 150000],
      ['prosjektering', 200000],
    ]);
    expect(n.fristdager_sum).toBe(null);
  });

  it('skiller svartid per kravversjon fra første ubesvarte krav og fra tid uavklart (uttrykkelige prøvekonvensjoner)', () => {
    const m = maalVed(p.maalt_forloep, 10).filter((r) => r.spor === 'vederlag');
    expect(
      m.filter((r) => r.maal === 'svartid_kravversjon').map((r) => [r.tilstand, r.dager])
    ).toEqual([
      ['erstattet_ubesvart', null],
      ['besvart', 3],
    ]);
    expect(m.find((r) => r.maal === 'ventetid_kravkjede')!.dager).toBe(5);
    expect(m.find((r) => r.maal === 'tid_uavklart')!.dager).toBe(11);
    expect(ved(6).find((r) => r.spor === 'vederlag')!.svar_ikke_godtatt).toBe(true);
    expect(ved(6).find((r) => r.spor === 'vederlag')!.venter_paa_svar).toBe(false);
    expect(kalenderdager('2026-09-21T23:59:00Z', '2026-09-22T00:01:00Z')).toBe(1);
  });

  it('F blir kjent ved versjon 7; historisk utvalg gir 7 dager ved E og 3 dager etter F uten lekkasje (bestillingen, B-10)', () => {
    const filter = (v: number) =>
      maalVed(p.maalt_forloep, v).find((r) => r.maal === 'kjennskap_til_relevant_fristvarsel')!;
    const foer = filter(6),
      etter = filter(7);
    expect(foer.forloep_id).toBe(etter.forloep_id);
    expect(foer.dager).toBe(7);
    expect(foer.kjent_til_versjon).toBe(7);
    expect(etter.dager).toBe(3);
    expect(etter.slutt?.kjent_fra_versjon).toBe(7);
    expect(etter.slutt?.verdi).toBe('2026-09-18');
    expect(foer.slutt?.verdi).toBe('2026-09-22T09:00:00.000Z');
    expect(p.vedleggsbinding[0].innhold_sha256).toBe(VEDLEGG.innhold_sha256);
    expect(JSON.stringify(projiser(r1, PROSJEKT))).not.toContain('2026-09-18');
    const enkelt = { ...etter, startversjon: 4, sluttversjon: 7 };
    expect(enkelt.startversjon <= 6).toBe(true);
    expect(enkelt.dager).toBe(3); // Den enkle formen har tapt det tidligere grunnlaget på 7 dager.
  });

  it('frys ved E er uendret etter F–I og gjenskapes fra nøyaktig samme prefiks (bestillingen)', () => {
    let frosset = '';
    const f = lagForloep(false, 4, (journal) => {
      frosset = JSON.stringify(projiser(journal, PROSJEKT));
    });
    expect(frosset).toBe(JSON.stringify(projiser(f.sak.journal.slice(0, 6), PROSJEKT)));
    expect(frosset).not.toBe(JSON.stringify(projiser(f.sak.journal, PROSJEKT)));
  });

  it('alle kilder finnes i kjernen og var kjent i radens saksversjon; tidskilder har ingen skjult fallback (bestillingen)', () => {
    const u = utledJournal(sak.journal, KJERNE);
    const versjon = (id: string) =>
      sak.journal.find((r) => r.event_id === (u.elementer[id]?.hendelse ?? id))!.versjon;
    for (const rad of p.sporhistorikk)
      for (const id of rad.kilde_ider) {
        expect(u.elementer[id], id).toBeDefined();
        expect(versjon(id)).toBeLessThanOrEqual(rad.saksversjon);
      }
    for (const rad of p.maalt_forloep) {
      for (const id of rad.kilde_ider)
        expect(versjon(id)).toBeLessThanOrEqual(rad.kjent_fra_versjon);
      for (const kilde of [rad.start, rad.slutt, rad.observert_ved].filter((x) => x !== null)) {
        expect(kilde.kjent_fra_versjon).toBeLessThanOrEqual(rad.kjent_fra_versjon);
        expect(kilde.felt).toBeTruthy();
        expect(kilde.betydning).toBeTruthy();
      }
    }
  });

  it('sluttall avstemmes mot eksisterende saksliste uten å hevde uavhengig juridisk bevis (karakterisering av dagens atferd)', () => {
    const linjer = [sak, kontroll].map((s) =>
      sakslinje(
        {
          sakId: s.sakId,
          sakstype: 'standard',
          opprettet: s.journal[0].tidsstempel,
          journal: s.journal,
        },
        KJERNE
      )
    );
    const n = noekkeltall(linjer);
    expect(n.vederlag.krav_sum).toBe(portefolje([sak.journal, kontroll.journal]).krav_sum);
    const r = ved(10);
    for (const spor of ['vederlag', 'frist'] as const) {
      expect(r.find((r) => r.spor === spor)!.enighet_virkning).toBe(
        linjer[0][spor].enighet?.virkning
      );
    }
    expect(linjer[0].vederlag.enighet?.beloep).toBe(120000);
    expect(linjer[0].frist.enighet?.dager).toBe(0);
    expect(n.vederlag.enighet_virksom_sum).toBe(120000);
    expect(n.vederlag.krav_sum).toBe(350000);
  });
});
