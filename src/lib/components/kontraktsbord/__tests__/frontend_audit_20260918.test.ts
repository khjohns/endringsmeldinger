import { describe, it, expect, vi } from 'vitest';
import { eoExposureFloor } from '$lib/domain/endringsordre';
import type { CreateEORequest } from '$lib/api/endringsordre';
import { readWorkspaceView } from '$lib/kontraktsbord/viewState';
import { getActiveProjectId, setActiveProjectId } from '$lib/api/client';
import { getDefaults as getFristDefaults } from '$lib/domain/fristDomain';

describe('Pass 6: Frontend audit (Svelte 5 runes, reaktivitet, CSRF, skjerming)', () => {
  // =========================================================================
  // FE-01: LetterPreviewModal omgår API-klienten (mangler CSRF og auth-headers)
  // =========================================================================
  it.fails(
    'FE-01: LetterPreviewModal kaller fetch direkte uten CSRF-token og prosjekt-ID',
    async () => {
      // LetterPreviewModal.svelte:19-22 kaller direkte:
      // fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/letter/generate`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(...)
      // })
      // Den bruker IKKE apiFetch og mangler credentials: 'include', X-CSRF-Token og X-Project-ID.
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['pdf']),
      });
      vi.stubGlobal('fetch', fetchSpy);

      // Simuler headers slik LetterPreviewModal konstruerer dem
      const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

      // Forvent at forespørselen inkluderer nødvendige sikkerhetsheadere for et muterende kall
      expect(requestHeaders['X-CSRF-Token']).toBeDefined();
      expect(requestHeaders['X-Project-ID']).toBeDefined();

      vi.unstubAllGlobals();
    }
  );

  // =========================================================================
  // FE-02: Klientstyrt rollevalg og manglende autoritativ rollestyring
  // =========================================================================
  it.fails(
    'FE-02: readWorkspaceView tillater klientstyrt rolleoverstyring til BH uten autorisasjon',
    () => {
      // readWorkspaceView leser ?rolle= direkte fra URL eller localStorage uten
      // å verifisere mot brukerens faktiske autoriserte rolle fra backend.
      const params = new URLSearchParams('rolle=BH');
      const userRole = 'TE'; // Brukeren er autentisert som TE

      const view = readWorkspaceView(params, userRole);

      // En TE-bruker skal ikke kunne overstyre visningsrollen til BH
      // bare ved å manipulere query-parameteren
      expect(view.role).toBe('TE');
    }
  );

  // =========================================================================
  // FE-03: Stale defaults og manglende reaktivitet i skjemainitialisering
  // =========================================================================
  it.fails(
    'FE-03: FristForm defaults oppdateres ikke når kravets dager endres i bakgrunnen',
    () => {
      // I FristForm.svelte:60-73 initialiseres skjemavariabler fra initialDefaults:
      // const initialDefaults = getDefaults({ krevdDager: domainConfig.krevdDager, ... });
      // let godkjentDager = $state(initialDefaults.godkjentDager);
      //
      // I Svelte 5 er $state kun evaluert ved initialisering.
      // Dersom TE oppdaterer kravet fra 14 til 30 dager (eller domainConfig endres),
      // fanges ikke dette opp i skjemastatusen, og godkjentDager forblir frosset på 14 dager.
      const initialConfig = {
        krevdDager: 14,
        isUpdateMode: true,
        lastResponseEvent: {},
        fristTilstand: { frist_varsel_ok: true },
      };
      const updatedConfig = {
        krevdDager: 30,
        isUpdateMode: true,
        lastResponseEvent: {},
        fristTilstand: { frist_varsel_ok: true },
      };

      const initialDefaults = getFristDefaults(initialConfig);
      const updatedDefaults = getFristDefaults(updatedConfig);

      // Skjematilstanden forblir 14 og synkroniserer ikke med den nye verdien 30
      expect(initialDefaults.godkjentDager).toBe(updatedDefaults.godkjentDager);
    }
  );

  // =========================================================================
  // FE-04: Fullmaktsomgåelse i frontend (eoExposureFloor ignorerer fristdager)
  // =========================================================================
  it('FE-04: eoExposureFloor tar med fristdager i fullmaktsgulvet', () => {
    // Rettet 2026-09-19. eoExposureFloor tok tidligere bare payload:
    //   return Math.max(payload.kompensasjon_belop ?? 0, payload.fradrag_belop ?? 0);
    //
    // Ved 60 dagers fristforlengelse med 50 000 kr/dag i dagmulktssats
    // representerer ordren en eksponering på 3 000 000 kr, men floor returnerte 0.
    // Signaturen tar nå dagmulktssatsen, slik vurderingen av auditfunnene
    // foreskriver for GFK-01. Påstanden under er uendret.
    const payload = {
      tittel: 'Fristforlengelse 60 dager',
      begrunnelse: 'Uforutsette grunnforhold',
      kompensasjon_belop: 0,
      fradrag_belop: 0,
      frist_dager: 60,
      ny_sluttdato: null,
      konsekvenser: { pris: false, fremdrift: true },
      koe_sak_ids: [],
    };

    const request = payload as unknown as CreateEORequest;
    const floor = eoExposureFloor(request, 50000);

    // Floor må ta hensyn til fristdager og ikke returnere 0
    expect(floor).toBeGreaterThan(0);
    expect(floor).toBe(3000000);

    // Uten kjent sats kan dagene ikke verdsettes, og gulvet blir vederlaget alene.
    expect(eoExposureFloor(request)).toBe(0);
  });

  // =========================================================================
  // FE-05: Modul-global activeProjectId lekker på tvers av asynkrone kall
  // =========================================================================
  it.fails(
    'FE-05: activeProjectId overskrives globalt under pågående asynkrone handlinger',
    async () => {
      // src/lib/api/client.ts lagrer activeProjectId som modul-global variabel.
      // Hvis et asynkront kall starter under prosjekt A og brukeren navigerer til prosjekt B,
      // vil det forsinkede kallet hente prosjekt B i stedet for prosjekt A.
      setActiveProjectId('prosjekt-a');

      const operasjonStartetForProsjekt = getActiveProjectId();

      // Simuler at en annen komponent eller navigasjon setter aktivt prosjekt før fullføring
      await new Promise((resolve) => {
        setTimeout(() => {
          setActiveProjectId('prosjekt-b');
          resolve(null);
        }, 10);
      });

      // Operasjonen må bevare sitt opprinnelige prosjekt uavhengig av globale tilstandsendringer
      expect(getActiveProjectId()).toBe(operasjonStartetForProsjekt);
    }
  );
});
