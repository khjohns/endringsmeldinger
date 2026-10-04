import { describe, it, expect } from 'vitest';
import * as domain from '../vederlagSubmissionDomain';

describe('vederlagSubmissionDomain', () => {
  // ── getDefaults ──
  describe('getDefaults', () => {
    it('returns empty state for new submission', () => {
      const state = domain.getDefaults({ scenario: 'new' });
      expect(state.metode).toBeUndefined();
      expect(state.belopDirekte).toBeUndefined();
      expect(state.kostnadsOverslag).toBeUndefined();
      expect(state.kreverJustertEp).toBe(false);
      expect(state.varsletForOppstart).toBe(true);
      expect(state.harRiggKrav).toBe(false);
      expect(state.harProduktivitetKrav).toBe(false);
      expect(state.begrunnelse).toBe('');
      expect(state.begrunnelseValidationError).toBeUndefined();
    });

    it('pre-fills from existing data in edit mode', () => {
      const state = domain.getDefaults({
        scenario: 'edit',
        existing: {
          metode: 'ENHETSPRISER',
          belop_direkte: 250000,
          krever_justert_ep: true,
          begrunnelse: 'Basert på kontraktens EP',
        },
      });
      expect(state.metode).toBe('ENHETSPRISER');
      expect(state.belopDirekte).toBe(250000);
      expect(state.kreverJustertEp).toBe(true);
      expect(state.begrunnelse).toBe('Basert på kontraktens EP');
    });

    it('pre-fills regningsarbeid data in edit mode', () => {
      const state = domain.getDefaults({
        scenario: 'edit',
        existing: {
          metode: 'REGNINGSARBEID',
          kostnads_overslag: 500000,
          varslet_for_oppstart: false,
          begrunnelse: 'Regningsarbeid begrunnelse',
        },
      });
      expect(state.metode).toBe('REGNINGSARBEID');
      expect(state.kostnadsOverslag).toBe(500000);
      expect(state.varsletForOppstart).toBe(false);
    });

    it('pre-fills saerskilt_krav rigg_drift from existing', () => {
      const state = domain.getDefaults({
        scenario: 'edit',
        existing: {
          metode: 'ENHETSPRISER',
          belop_direkte: 100000,
          saerskilt_krav: {
            rigg_drift: { belop: 30000, dato_klar_over: '2026-01-15' },
          },
        },
      });
      expect(state.harRiggKrav).toBe(true);
      expect(state.belopRigg).toBe(30000);
      expect(state.datoKlarOverRigg).toBe('2026-01-15');
      expect(state.harProduktivitetKrav).toBe(false);
    });

    it('pre-fills saerskilt_krav produktivitet from existing', () => {
      const state = domain.getDefaults({
        scenario: 'edit',
        existing: {
          metode: 'ENHETSPRISER',
          belop_direkte: 100000,
          saerskilt_krav: {
            produktivitet: { belop: 20000, dato_klar_over: '2026-02-01' },
          },
        },
      });
      expect(state.harProduktivitetKrav).toBe(true);
      expect(state.belopProduktivitet).toBe(20000);
      expect(state.datoKlarOverProduktivitet).toBe('2026-02-01');
    });

    it('returns new defaults when edit scenario has no existing data', () => {
      const state = domain.getDefaults({ scenario: 'edit' });
      expect(state.metode).toBeUndefined();
      expect(state.begrunnelse).toBe('');
    });

    it('defaults varsletForOppstart to true for new', () => {
      const state = domain.getDefaults({ scenario: 'new' });
      expect(state.varsletForOppstart).toBe(true);
    });
  });

  // ── beregnCanSubmit ──
  describe('beregnCanSubmit', () => {
    it('cannot submit without metode', () => {
      const state = domain.getDefaults({ scenario: 'new' });
      expect(domain.beregnCanSubmit(state)).toBe(false);
    });

    it('cannot submit ENHETSPRISER without belopDirekte', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'ENHETSPRISER' as const,
        begrunnelse: 'Minst ti tegn her',
      };
      expect(domain.beregnCanSubmit(state)).toBe(false);
    });

    it('can submit ENHETSPRISER with belopDirekte and begrunnelse', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'ENHETSPRISER' as const,
        belopDirekte: 100000,
        begrunnelse: 'Minst ti tegn her',
      };
      expect(domain.beregnCanSubmit(state)).toBe(true);
    });

    it('cannot submit FASTPRIS_TILBUD without belopDirekte', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'FASTPRIS_TILBUD' as const,
        begrunnelse: 'Minst ti tegn her',
      };
      expect(domain.beregnCanSubmit(state)).toBe(false);
    });

    it('can submit FASTPRIS_TILBUD with belopDirekte and begrunnelse', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'FASTPRIS_TILBUD' as const,
        belopDirekte: 500000,
        begrunnelse: 'Tilbudt fastpris basert på vurdering',
      };
      expect(domain.beregnCanSubmit(state)).toBe(true);
    });

    it('can submit REGNINGSARBEID without kostnadsOverslag (optional per §30.2)', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'REGNINGSARBEID' as const,
        begrunnelse: 'Regningsarbeid begrunnelse her',
      };
      expect(domain.beregnCanSubmit(state)).toBe(true);
    });

    it('cannot submit with begrunnelse < 10 chars', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'REGNINGSARBEID' as const,
        begrunnelse: 'For kort',
      };
      expect(domain.beregnCanSubmit(state)).toBe(false);
    });

    it('can submit with exactly 10 char begrunnelse', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'REGNINGSARBEID' as const,
        begrunnelse: '1234567890',
      };
      expect(domain.beregnCanSubmit(state)).toBe(true);
    });
  });

  // ── buildEventData ──
  describe('buildEventData', () => {
    it('throws when metode is undefined', () => {
      const state = domain.getDefaults({ scenario: 'new' });
      expect(() =>
        domain.buildEventData(state, {
          scenario: 'new',
          grunnlagEventId: 'g-1',
        })
      ).toThrow('metode is required');
    });

    it('builds ENHETSPRISER event data', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'ENHETSPRISER' as const,
        belopDirekte: 250000,
        kreverJustertEp: true,
        begrunnelse: 'EP-basert beregning',
      };
      const data = domain.buildEventData(state, {
        scenario: 'new',
        grunnlagEventId: 'g-1',
      });
      expect(data.grunnlag_event_id).toBe('g-1');
      expect(data.metode).toBe('ENHETSPRISER');
      expect(data.belop_direkte).toBe(250000);
      expect(data.kostnads_overslag).toBeUndefined();
      expect(data.krever_justert_ep).toBe(true);
      expect(data.varslet_for_oppstart).toBeUndefined();
      expect(data.begrunnelse).toBe('EP-basert beregning');
    });

    it('builds REGNINGSARBEID event data', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'REGNINGSARBEID' as const,
        kostnadsOverslag: 400000,
        varsletForOppstart: false,
        begrunnelse: 'Regningsarbeid nødvendig',
      };
      const data = domain.buildEventData(state, {
        scenario: 'new',
        grunnlagEventId: 'g-2',
      });
      expect(data.metode).toBe('REGNINGSARBEID');
      expect(data.belop_direkte).toBeUndefined();
      expect(data.kostnads_overslag).toBe(400000);
      expect(data.krever_justert_ep).toBeUndefined();
      expect(data.varslet_for_oppstart).toBe(false);
    });

    it('builds FASTPRIS_TILBUD event data', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'FASTPRIS_TILBUD' as const,
        belopDirekte: 600000,
        begrunnelse: 'Tilbudt fastpris',
      };
      const data = domain.buildEventData(state, {
        scenario: 'new',
        grunnlagEventId: 'g-3',
      });
      expect(data.metode).toBe('FASTPRIS_TILBUD');
      expect(data.belop_direkte).toBe(600000);
      expect(data.kostnads_overslag).toBeUndefined();
      expect(data.krever_justert_ep).toBeUndefined();
      expect(data.varslet_for_oppstart).toBeUndefined();
    });

    it('overlater datoen for §34.3.3-varselet til serveren (DRF-03)', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'edit' }),
        metode: 'ENHETSPRISER' as const,
        belopDirekte: 100000,
        kreverJustertEp: true,
        begrunnelse: 'Med EP-justering',
      };
      const data = domain.buildEventData(state, {
        scenario: 'edit',
        grunnlagEventId: 'g-1',
        originalEventId: 'v-1',
      });
      expect(data.krever_justert_ep).toBe(true);
      expect('justert_ep_varsel' in data).toBe(false);
    });

    it('builds saerskilt_krav with rigg_drift', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'ENHETSPRISER' as const,
        belopDirekte: 100000,
        harRiggKrav: true,
        belopRigg: 30000,
        datoKlarOverRigg: '2026-01-15',
        begrunnelse: 'Med riggkrav §34.1.3',
      };
      const data = domain.buildEventData(state, {
        scenario: 'new',
        grunnlagEventId: 'g-1',
      });
      expect(data.saerskilt_krav).toEqual({
        rigg_drift: { belop: 30000, dato_klar_over: '2026-01-15' },
      });
    });

    it('builds saerskilt_krav with produktivitet', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'ENHETSPRISER' as const,
        belopDirekte: 100000,
        harProduktivitetKrav: true,
        belopProduktivitet: 20000,
        datoKlarOverProduktivitet: '2026-02-01',
        begrunnelse: 'Med produktivitetskrav',
      };
      const data = domain.buildEventData(state, {
        scenario: 'new',
        grunnlagEventId: 'g-1',
      });
      expect(data.saerskilt_krav).toEqual({
        produktivitet: { belop: 20000, dato_klar_over: '2026-02-01' },
      });
    });

    it('builds saerskilt_krav with both rigg and produktivitet', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'ENHETSPRISER' as const,
        belopDirekte: 100000,
        harRiggKrav: true,
        belopRigg: 30000,
        datoKlarOverRigg: '2026-01-15',
        harProduktivitetKrav: true,
        belopProduktivitet: 20000,
        datoKlarOverProduktivitet: '2026-02-01',
        begrunnelse: 'Med begge særskilte krav',
      };
      const data = domain.buildEventData(state, {
        scenario: 'new',
        grunnlagEventId: 'g-1',
      });
      expect(data.saerskilt_krav?.rigg_drift).toEqual({
        belop: 30000,
        dato_klar_over: '2026-01-15',
      });
      expect(data.saerskilt_krav?.produktivitet).toEqual({
        belop: 20000,
        dato_klar_over: '2026-02-01',
      });
    });

    it('sets saerskilt_krav to null when neither rigg nor produktivitet', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'ENHETSPRISER' as const,
        belopDirekte: 100000,
        begrunnelse: 'Ingen særskilte krav',
      };
      const data = domain.buildEventData(state, {
        scenario: 'new',
        grunnlagEventId: 'g-1',
      });
      expect(data.saerskilt_krav).toBeNull();
    });

    it('includes original_event_id for edit scenario', () => {
      const state = {
        ...domain.getDefaults({
          scenario: 'edit',
          existing: {
            metode: 'ENHETSPRISER',
            belop_direkte: 100000,
            begrunnelse: 'Oppdatert krav for vederlag',
          },
        }),
      };
      const data = domain.buildEventData(state, {
        scenario: 'edit',
        grunnlagEventId: 'g-1',
        originalEventId: 'ved-evt-123',
      });
      expect(data.original_event_id).toBe('ved-evt-123');
    });

    it('omits original_event_id for new submission', () => {
      const state = {
        ...domain.getDefaults({ scenario: 'new' }),
        metode: 'ENHETSPRISER' as const,
        belopDirekte: 100000,
        begrunnelse: 'Nytt vederlagskrav i saken',
      };
      const data = domain.buildEventData(state, {
        scenario: 'new',
        grunnlagEventId: 'g-1',
      });
      expect(data.original_event_id).toBeUndefined();
    });
  });

  // ── getEventType ──
  describe('getEventType', () => {
    it('returns vederlag_krav_sendt for new submission', () => {
      expect(domain.getEventType({ scenario: 'new' })).toBe('vederlag_krav_sendt');
    });

    it('returns vederlag_krav_oppdatert for edit', () => {
      expect(domain.getEventType({ scenario: 'edit' })).toBe('vederlag_krav_oppdatert');
    });
  });
});
