/**
 * Komponentkatalogen (#2117): hver komponent i `varden/` som to filer eller flere importerer, har en
 * hodekommentar, og `.interface-design/komponenter.md` er generert av dem.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  felleskomponenter,
  foersteSetning,
  KATALOG,
  katalog,
  kildene,
  ROT,
  utenHodekommentar,
} from './komponentkatalog.ts';

const VARDEN = join(ROT, 'src', 'lib', 'components', 'varden');
const MED =
  '<!--\n  Knappen i Varden: pilleform. Med `href` er den en lenke.\n-->\n<script></script>\n';
const UTEN = '<script lang="ts"></script>\n<button></button>\n';

describe('komponentkatalogen', () => {
  const komponenter = felleskomponenter(kildene());

  it('hver komponent i Varden som to filer eller flere importerer, har en hodekommentar', () => {
    expect(komponenter.length).toBeGreaterThan(20);
    expect(utenHodekommentar(komponenter)).toEqual([]);
  });

  it('katalogen er generert av hodekommentarene (node src/lib/komponentkatalog.ts)', () => {
    expect(readFileSync(KATALOG, 'utf8')).toBe(katalog(komponenter));
  });

  it('en ny felles komponent uten hodekommentar gir rød test, og én importør er ikke nok', () => {
    const kilder = new Map([
      [join(VARDEN, 'Knapp.svelte'), MED],
      [join(VARDEN, 'Ny.svelte'), UTEN],
      [join(VARDEN, 'Alene.svelte'), UTEN],
      [join(VARDEN, 'A.svelte'), "<script>import Knapp from './Knapp.svelte';</script>"],
      [
        join(ROT, 'src', 'routes', 'side.svelte'),
        "<script>\n  import Knapp from '#lib/components/varden/Knapp.svelte';\n  import Ny, { x } from '#lib/components/varden/Ny.svelte';\n  import Alene from '#lib/components/varden/Alene.svelte';\n</script>",
      ],
      [join(VARDEN, 'B.svelte'), "<script>import Ny from './Ny.svelte';</script>"],
      // Testene og komponentdemoen telles ikke.
      [join(VARDEN, '__tests__', 'Alene.test.ts'), "import Alene from '../Alene.svelte';"],
      [
        join(ROT, 'src', 'routes', 'demo', 'komponenter', '+page.svelte'),
        "<script>import Alene from '#lib/components/varden/Alene.svelte';</script>",
      ],
    ]);
    const k = felleskomponenter(kilder);
    expect(k.map((x) => [x.navn, x.importoerer])).toEqual([
      ['Knapp', 2],
      ['Ny', 2],
    ]);
    expect(utenHodekommentar(k)).toEqual(['Ny']);
  });

  it('kolonnen er første setning i hodekommentaren, også med en forkortelse i teksten', () => {
    expect(foersteSetning('Knappen i Varden: pilleform.\n  Med `href` er den en lenke.')).toBe(
      'Knappen i Varden: pilleform.'
    );
    expect(foersteSetning('Fristen etter pkt. 33.4 i skjemaet. Resten.')).toBe(
      'Fristen etter pkt. 33.4 i skjemaet.'
    );
  });
});
