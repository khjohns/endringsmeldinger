/** Svaret mangler eller har en vurdering reglene ikke kan regne ut av. `feil` navngir feltene. */
export class UgyldigVurdering extends Error {
  readonly feil: Record<string, string>;

  constructor(feil: Record<string, string>) {
    super(
      Object.entries(feil)
        .map(([felt, grunn]) => `${felt}: ${grunn}`)
        .join('; ')
    );
    this.feil = { ...feil };
  }
}
