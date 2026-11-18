import type { Kjernesakkontekst } from '../kontekst.svelte';

/** En sakskontekst for testen av saksruta, der testen setter svaret fra TS-serveren. */
export function falskKjernesak() {
  let lasteutfall = $state<Kjernesakkontekst['lasteutfall']>(null);
  return {
    get lasteutfall() {
      return lasteutfall;
    },
    set lasteutfall(v: Kjernesakkontekst['lasteutfall']) {
      lasteutfall = v;
    },
    saksbilde: null,
    last: async () => {},
  };
}
