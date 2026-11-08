import type { Sakslinje } from '$lib/types/api';

const ingenting = { betegnelse: null, venter_paa_svar: false, svar_ikke_godtatt: false };

/** En linje i sakslisten med krav i alle tre sporene og uten svar, til testene. */
export function lagSakslinje(overstyr: Partial<Sakslinje> = {}): Sakslinje {
  return {
    sak_id: 'SAK-001',
    sakstype: 'standard',
    sakstittel: 'Endring i grunnarbeider',
    opprettet: '2025-11-01T10:00:00Z',
    siste_hendelse: '2025-12-22T14:30:00Z',
    siste_brev: { avsender: 'TE', dato: '2025-12-22' },
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    forstaatt: true,
    saksbetegnelse: null,
    brev_utenfor_appen: false,
    forhold: { ...ingenting, svar: null },
    vederlag: {
      ...ingenting,
      kravet_staar: false,
      har_varsel: false,
      ingen_krav: false,
      krav: null,
      svar: null,
      enighet: null,
    },
    frist: {
      ...ingenting,
      kravet_staar: false,
      har_varsel: false,
      ingen_krav: false,
      krav: null,
      svar: null,
      enighet: null,
    },
    ...overstyr,
  };
}
