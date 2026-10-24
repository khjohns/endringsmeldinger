import { describe, expect, it } from 'vitest';
import { Feltavvisning } from '$lib/kjernesak/kontekst.svelte';
import { createSubmission } from '../submission.svelte';

// Kilde: #1264 (oppdragsgiver 24.10) og MM-U32: meldingen står ved feltet, og øverst står at
// brevet ikke kan sendes ennå. Feilmeldingen forsvinner når feltet er rettet (docs/design/system.md).
describe('feilen fra sendingen i skjemaet', () => {
  it('en avvisning som gjelder utdypningen, står ved feltet og forsvinner når feltet endres', async () => {
    const sending = createSubmission();
    const melding = 'Brevet kan ikke sendes ennå. Svaret må ha en begrunnelse.';
    await sending.run(() => {
      throw new Feltavvisning(melding);
    });
    expect(sending.vedFeltet).toBe(melding);
    expect(sending.oeverst).toBe('Brevet kan ikke sendes ennå. Se meldingen ved begrunnelsen.');

    sending.feltetEndret();
    expect(sending.vedFeltet).toBeNull();
    expect(sending.oeverst).toBeNull();
  });

  it('en annen feil står øverst, og en endring i feltet fjerner den ikke', async () => {
    const sending = createSubmission();
    await sending.run(() => {
      throw new Error('Brevet ble ikke sendt. Saken er endret.');
    });
    expect(sending.vedFeltet).toBeNull();
    expect(sending.oeverst).toBe('Brevet ble ikke sendt. Saken er endret.');

    sending.feltetEndret();
    expect(sending.oeverst).toBe('Brevet ble ikke sendt. Saken er endret.');
  });
});
