import type { Noekkeltall, Sakslinje } from '$lib/types/api';
import { kravetStaar } from '$lib/components/saksoversikt/overview';

const ingenting = { betegnelse: null, venter_paa_svar: false, svar_ikke_godtatt: false };

/** En linje i sakslisten med krav i alle tre sporene og uten svar, til tester og demo. */
export function lagSakslinje(overstyr: Partial<Sakslinje> = {}): Sakslinje {
  return {
    sak_id: 'SAK-001',
    sakstype: 'standard',
    sakstittel: 'Endring i grunnarbeider',
    opprettet: '2025-11-01T10:00:00Z',
    siste_hendelse: '2025-12-22T14:30:00Z',
    hovedkategori: 'endring',
    forstaatt: true,
    saksbetegnelse: null,
    brev_utenfor_appen: false,
    grunnlag: { ...ingenting, svar: null },
    vederlag: { ...ingenting, kravet_staar: false, krav: null, svar: null, enighet: null },
    frist: { ...ingenting, kravet_staar: false, krav: null, svar: null, enighet: null },
    ...overstyr,
  };
}

/**
 * Nøkkeltallene for demolinjene. Serveren regner dem for den ekte lista
 * (`noekkeltall` i `server/saksliste.ts`); demoen har ingen server.
 */
export function demoNoekkeltall(linjer: readonly Sakslinje[]): Noekkeltall {
  const forstaatt = linjer.filter((l) => l.forstaatt);
  const sum = (tall: (number | null | undefined)[]) =>
    tall.reduce<number>((s, t) => s + (t ?? 0), 0);
  const enighet = forstaatt.map((l) => l.vederlag.enighet);
  const staar = (spor: 'vederlag' | 'frist') => linjer.filter((l) => kravetStaar(l, spor));
  return {
    saker: linjer.length,
    ikke_forstaatt: linjer.length - forstaatt.length,
    vederlag: {
      krav_antall: staar('vederlag').length,
      krav_sum: sum(staar('vederlag').map((l) => l.vederlag.krav?.beloep)),
      venter_paa_svar: forstaatt.filter((l) => l.vederlag.venter_paa_svar).length,
      svar_subsidiaert_sum: sum(
        staar('vederlag').map((l) =>
          l.vederlag.svar?.subsidiaert && !l.vederlag.enighet ? l.vederlag.svar.beloep : null
        )
      ),
      enighet_virksom_sum: sum(enighet.map((e) => (e?.virkning === 'virksom' ? e.beloep : null))),
      enighet_betinget_sum: sum(enighet.map((e) => (e?.virkning === 'betinget' ? e.beloep : null))),
      enighet_uten_beloep: enighet.filter(
        (e) => e && e.virkning !== 'uten_virkning' && e.beloep === null
      ).length,
    },
    frist: {
      krav_antall: staar('frist').length,
      venter_paa_svar: forstaatt.filter((l) => l.frist.venter_paa_svar).length,
    },
  };
}
