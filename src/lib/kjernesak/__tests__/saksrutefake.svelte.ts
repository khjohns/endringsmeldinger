/** En sakskontekst for testen av saksruta, der testen setter svaret fra TS-serveren. */
export function falskKjernesak() {
  let finnes = $state<boolean | null>(null);
  let feil = $state<string | null>(null);
  return {
    get finnes() {
      return finnes;
    },
    set finnes(v: boolean | null) {
      finnes = v;
    },
    get feil() {
      return feil;
    },
    set feil(v: string | null) {
      feil = v;
    },
    saksbilde: null,
    last: async () => {},
  };
}
