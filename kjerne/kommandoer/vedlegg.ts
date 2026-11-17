/**
 * Innholdet i vedleggene ved et krav og ved et dokument i saken, så samme fil lastet opp på nytt
 * er samme vedlegg (#2100, VS-U73).
 */

import type { Dokument } from '../typer.ts';
import type { Vedleggsoppslag } from './skriving.ts';

/** Innholdet i vedleggene, med ID-en for et vedlegg mellomlageret ikke har. */
export const innholdetIVedleggene = (ider: readonly string[], oppslag: Vedleggsoppslag) =>
  new Set(
    ider.map((id) => oppslag.get(id.toLowerCase())?.innhold_sha256 ?? `id:${id.toLowerCase()}`)
  );

/** Innholdet i vedleggene ved dokumentet. */
export const innholdetIDokumentet = (d: Pick<Dokument, 'dokumentasjon'>) =>
  new Set(d.dokumentasjon.map((v) => v.innhold_sha256));
