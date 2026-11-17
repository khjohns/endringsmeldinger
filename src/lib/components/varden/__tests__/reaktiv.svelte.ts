/** Verdien som Svelte-tilstand, så en test kan gi en komponent et `$bindable` objekt den endrer. */
export function reaktiv<T extends object>(verdi: T): T {
  const tilstand = $state(verdi);
  return tilstand;
}
