/**
 * Leseren for registrene i `docs/datamodell/` som testene i kjernen prøver mot koden. Den kan
 * den delen av TOML registrene bruker: `[[seksjon]]`, `nøkkel = "tekst"`, `nøkkel = """…"""`,
 * `nøkkel = [ … ]` på én linje og heltall. Står registeret i en annen form, feiler leseren.
 */

export type Oppfoering = Record<string, string | number | string[]>;
export type Register = { format?: number } & Record<string, Oppfoering[]>;

/** Den delen av TOML registeret bruker. Kaster på en linje den ikke kjenner. */
export function lesRegister(tekst: string): Register {
  const ut: Register = {};
  let gjeldende: Record<string, unknown> = ut;
  const linjer = tekst.split('\n');
  for (let i = 0; i < linjer.length; i++) {
    const linje = linjer[i].trim();
    if (!linje || linje.startsWith('#')) continue;
    const seksjon = /^\[\[([a-z_]+)\]\]$/.exec(linje);
    if (seksjon) {
      const liste = ((ut[seksjon[1]] as Oppfoering[] | undefined) ??= []);
      liste.push((gjeldende = {}) as Oppfoering);
      continue;
    }
    const par = /^([a-z_]+) = (.*)$/.exec(linje);
    if (!par) throw new Error(`Linje ${i + 1} er ikke i formen registeret bruker: ${linje}`);
    const [, noekkel, verdi] = par;
    if (verdi.startsWith('"""')) {
      const deler = [verdi.slice(3)];
      while (!deler.at(-1)!.endsWith('"""')) {
        if (++i >= linjer.length) throw new Error(`${noekkel}: """ er ikke lukket`);
        deler.push(linjer[i]);
      }
      gjeldende[noekkel] = deler.join('\n').slice(0, -3).trim();
    } else if (/^-?\d+$/.test(verdi)) {
      gjeldende[noekkel] = Number(verdi);
    } else {
      gjeldende[noekkel] = JSON.parse(verdi) as unknown;
    }
  }
  return ut;
}
