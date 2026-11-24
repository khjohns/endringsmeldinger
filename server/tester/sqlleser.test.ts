import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { deler, UavsluttetDel } from '../sqlleser.ts';

const LESEREN = fileURLToPath(new URL('../sqlleser.ts', import.meta.url));

// Kilde: punkt 1 i #1093. Leseren deler tekst, navn og kommentarer som runneren, med `''`,
// `]]` og `""` som tegnet selv, og et navn i `[]` eller `""` som ett navn.
describe('leseren for T-SQL (#1093)', () => {
  it(']] og "" i et navn er tegnet selv, og navnet er ett navn', () => {
    expect(deler(`CREATE TABLE koe.ny ([a]]'] int, "b""c" int); DROP TABLE x;`)).toEqual([
      { art: 'kode', tekst: 'CREATE TABLE koe.ny (' },
      { art: 'navn', tekst: "a]'" },
      { art: 'kode', tekst: ' int, ' },
      { art: 'navn', tekst: 'b"c' },
      { art: 'kode', tekst: ' int); DROP TABLE x;' },
    ]);
  });

  it('en tekst og en kommentar over flere linjer er én del, og -- går til slutten av linja', () => {
    expect(deler("SELECT 'a''b\nc' /* x /* y */\nz */ -- [\n[d x]")).toEqual([
      { art: 'kode', tekst: 'SELECT ' },
      { art: 'tekst', tekst: "'a''b\nc'" },
      { art: 'kode', tekst: ' ' },
      { art: 'kommentar', tekst: '/* x /* y */\nz */' },
      { art: 'kode', tekst: ' ' },
      { art: 'kommentar', tekst: '-- [' },
      { art: 'kode', tekst: '\n' },
      { art: 'navn', tekst: 'd x' },
    ]);
  });

  it('delene satt sammen igjen er teksten, når ingen navn har ]] eller ""', () => {
    const tekst = "GO\nCREATE TABLE [koe].[ny] (a int); -- x\n/* y */ SELECT N'z'\nGO\n";
    expect(
      deler(tekst)
        .map((d) => (d.art === 'navn' ? `[${d.tekst}]` : d.tekst))
        .join('')
    ).toBe(tekst);
  });

  it('en tekst som ikke er avsluttet, avvises med linja den begynner på', () => {
    expect(() => deler("SELECT 1\nSELECT 'a")).toThrow(
      new UavsluttetDel('Teksten som begynner på linje 2, er ikke avsluttet.')
    );
  });

  it('kjørt med node gir delene som JSON, og exit 1 for en del som ikke er avsluttet', () => {
    expect(
      JSON.parse(execFileSync(process.execPath, [LESEREN], { input: '[a]]b]' }).toString())
    ).toEqual([{ art: 'navn', tekst: 'a]b' }]);
    expect(() =>
      execFileSync(process.execPath, [LESEREN], { input: '/* x', stdio: 'pipe' })
    ).toThrow(/Kommentaren som begynner på linje 1, er ikke avsluttet/);
  });
});
