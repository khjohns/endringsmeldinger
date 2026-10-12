const ORDTEGN = /[\p{L}\p{N}_-]/u;

/**
 * Om testnavnet inneholder målet til en feilinnføring. Målet treffer bare der det ikke
 * fortsetter i et ord eller en ID, så `F-MM-D` ikke treffer `F-MM-D-godtatt` (#436).
 */
export function treffer(navn: string, mal: string): boolean {
  const ordFoer = ORDTEGN.test(mal[0] ?? '');
  const ordEtter = ORDTEGN.test(mal.at(-1) ?? '');
  for (let i = navn.indexOf(mal); i !== -1; i = navn.indexOf(mal, i + 1))
    if (
      !(ordFoer && ORDTEGN.test(navn[i - 1] ?? '')) &&
      !(ordEtter && ORDTEGN.test(navn[i + mal.length] ?? ''))
    )
      return true;
  return false;
}
