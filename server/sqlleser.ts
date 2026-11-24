/**
 * Leseren for T-SQL i migrasjonene: hvor en tekst, et navn i `[]` eller `""` og en
 * kommentar begynner og slutter. Runneren deler filene på `GO` med den
 * (`delPaaGo` i `migrering.ts`), og tilleggsregelen i `.github/scripts/tilleggsregel.py`
 * leser setningene med den, så de to leser filene likt (#1093).
 *
 * Modulen har ingen avhengigheter, så Node kan kjøre den uten pakkene:
 *
 *   node server/sqlleser.ts < fil.sql
 *
 * skriver delene fra `deler()` som JSON. En tekst, et navn eller en kommentar som ikke
 * er avsluttet, gir exit 3 og meldingen på stderr, så en feil i Node selv (exit 1) ikke
 * leses som en feil i SQL-en.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Tilstand =
  | { i: 'kode' }
  | { i: 'tekst' | 'navn' | 'sitert'; slutt: string; linje: number }
  | { i: 'kommentar'; dybde: number; linje: number };

export type Art = 'kode' | 'tekst' | 'navn' | 'kommentar';

/** En del av teksten. For et navn er `tekst` navnet uten avgrensning, med `]]` og `""` som ett tegn. */
export interface Del {
  art: Art;
  tekst: string;
}

const ART = { tekst: 'tekst', navn: 'navn', sitert: 'navn', kommentar: 'kommentar' } as const;

/**
 * Tilstanden etter `linje` (nummer `nr`), fra tilstanden før den. `del` får hvert
 * stykke av linja som ikke er kode, med start og slutt; en `--`-kommentar går til
 * slutten av linja.
 */
export function skann(
  linje: string,
  nr: number,
  foer: Tilstand,
  del?: (art: Exclude<Art, 'kode'>, fra: number, til: number) => void
): Tilstand {
  let t = foer;
  let start = 0;
  for (let k = 0; k < linje.length; k++) {
    const to = linje.slice(k, k + 2);
    if (t.i === 'kode') {
      if (to === '--') {
        del?.('kommentar', k, linje.length);
        return t;
      }
      start = k;
      if (to === '/*') {
        t = { i: 'kommentar', dybde: 1, linje: nr };
        k++;
      } else if (linje[k] === "'") t = { i: 'tekst', slutt: "'", linje: nr };
      else if (linje[k] === '[') t = { i: 'navn', slutt: ']', linje: nr };
      else if (linje[k] === '"') t = { i: 'sitert', slutt: '"', linje: nr };
    } else if (t.i === 'kommentar') {
      if (to === '/*' || to === '*/') {
        const dybde = t.dybde + (to === '/*' ? 1 : -1);
        k++;
        if (dybde === 0) {
          del?.('kommentar', start, k + 1);
          t = { i: 'kode' };
        } else t = { ...t, dybde };
      }
    } else if (linje[k] === t.slutt) {
      // `''`, `]]` og `""` er tegnet selv, ikke slutten.
      if (linje[k + 1] === t.slutt) k++;
      else {
        del?.(ART[t.i], start, k + 1);
        t = { i: 'kode' };
      }
    }
  }
  if (t.i !== 'kode') del?.(ART[t.i], start, linje.length);
  return t;
}

const BESKRIVELSE = {
  tekst: 'Teksten',
  navn: 'Navnet i hakeparentes',
  sitert: 'Navnet i anførselstegn',
  kommentar: 'Kommentaren',
};

export class UavsluttetDel extends Error {
  override name = 'UavsluttetDel';
}

/** Meldingen for en tekst, et navn eller en kommentar som ikke er avsluttet. */
export function uavsluttet(t: Exclude<Tilstand, { i: 'kode' }>): string {
  return `${BESKRIVELSE[t.i]} som begynner på linje ${t.linje}, er ikke avsluttet.`;
}

/**
 * `tekst` delt i kode, tekster, navn og kommentarer, i rekkefølge. Et navn får tegnene
 * mellom avgrensningene, med `]]` eller `""` som ett tegn.
 *
 * @throws UavsluttetDel
 */
export function deler(tekst: string): Del[] {
  const ut: Del[] = [];
  const legg = (art: Art, stykke: string, fortsetter = false) => {
    const sist = ut.at(-1);
    if (sist && (fortsetter || (art === 'kode' && sist.art === 'kode'))) sist.tekst += stykke;
    else if (stykke || fortsetter) ut.push({ art, tekst: stykke });
  };
  let t: Tilstand = { i: 'kode' };
  for (const [i, linje] of tekst.split('\n').entries()) {
    // Linjeskiftet hører til delen som går over linja, ellers til koden.
    let skift = i === 0 ? '' : '\n';
    let fortsetter = t.i !== 'kode';
    let lest = 0;
    t = skann(linje, i + 1, t, (art, fra, til) => {
      if (fortsetter) legg(art, skift + linje.slice(0, til), true);
      else {
        legg('kode', skift + linje.slice(lest, fra));
        legg(art, linje.slice(fra, til));
      }
      skift = '';
      fortsetter = false;
      lest = til;
    });
    legg('kode', skift + linje.slice(lest));
  }
  if (t.i !== 'kode') throw new UavsluttetDel(uavsluttet(t));
  return ut.map((d) => (d.art === 'navn' ? { art: 'navn', tekst: navnet(d.tekst) } : d));
}

/** Navnet i `[…]` eller `"…"`, uten avgrensningene og med det doble sluttegnet som ett. */
function navnet(avgrenset: string): string {
  const slutt = avgrenset[0] === '[' ? ']' : '"';
  return avgrenset.slice(1, -1).replaceAll(slutt + slutt, slutt);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(JSON.stringify(deler(readFileSync(0, 'utf8'))));
  } catch (feil) {
    if (!(feil instanceof UavsluttetDel)) throw feil;
    process.stderr.write(`${feil.message}\n`);
    process.exitCode = 3;
  }
}
