import { describe, expect, it } from 'vitest';
import type * as Server from '../../../server/saksliste.ts';
import type * as Api from './api.ts';

/** `true` bare når typene er identiske, også i valgfrie felt. */
type Likt<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const fristdager: Likt<Api.Fristdager, Server.Fristdager> = true;

describe('Fristdager er samme type i appen og serveren (#1956)', () => {
  it('svelte-check feiler når de to definisjonene glir fra hverandre', () => {
    expect(fristdager).toBe(true);
  });
});
