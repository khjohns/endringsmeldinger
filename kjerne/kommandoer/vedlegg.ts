/**
 * Innholdet i vedleggene ved et krav og ved et dokument i saken, så samme fil lastet opp på nytt
 * er samme vedlegg (#2100, VS-U73), og samme brev som et krav i saken legges ikke til som varsel
 * etter samme bestemmelse (VS-U74).
 */

import { erRegistrert } from '../format/leser.ts';
import { kravSomVarsler, rettedeBrev, type Utledning } from '../utledning/utled.ts';
import { avvis, type Avvisning, type Dokument, type Domenehendelse } from '../typer.ts';
import type { Kommando } from './kommando.ts';
import type { Vedleggsoppslag } from './skriving.ts';

/** Vedlegget som ID, som skiller ett vedlegg fra et annet: en UUID er den samme med store og små bokstaver. */
export const vedleggsnoekkel = (id: string): string => id.toLowerCase();

/** Innholdet i vedleggene, med ID-en for et vedlegg mellomlageret ikke har. */
export const innholdetIVedleggene = (ider: readonly string[], oppslag: Vedleggsoppslag) =>
  new Set(
    ider.map((id) => {
      const noekkel = vedleggsnoekkel(id);
      return oppslag.get(noekkel)?.innhold_sha256 ?? `id:${noekkel}`;
    })
  );

/** Innholdet i vedleggene ved dokumentet. */
export const innholdetIDokumentet = (d: Pick<Dokument, 'dokumentasjon'>) =>
  new Set(d.dokumentasjon.map((v) => v.innhold_sha256));

/**
 * Dokumentet har de samme vedleggene, på innholdet. Hele dokumentet sammenliknes, fordi ett
 * vedlegg kan ligge ved to brev.
 */
export function sammeDokument(
  d: Pick<Dokument, 'dokumentasjon'>,
  vedlagte: ReadonlySet<string>
): boolean {
  const innholdet = innholdetIDokumentet(d);
  return innholdet.size === vedlagte.size && [...innholdet].every((x) => vedlagte.has(x));
}

/** Bestemmelsene der et krav gjelder som varselet (VS-U74). */
const KRAVET_ER_VARSEL = ['33.4', '34.1.2', '34.1.3'] as const;
const kravetErVarsel = (h: string): h is (typeof KRAVET_ER_VARSEL)[number] =>
  (KRAVET_ER_VARSEL as readonly string[]).includes(h);

/**
 * VS-U74: brevet med varselet etter punkt 33.4, 34.1.2 eller 34.1.3 står alt i saken som et krav
 * totalentreprenøren har lagt til i sporet som gjelder som varselet etter bestemmelsen (`kravSomVarsler`). Varslene etter
 * `ogsaaEtter` er i samme dokument (VS-U52). Et varsel lagt til før kravet står (VS-U73).
 */
export function kravetErVarselet(
  k: Extract<Kommando, { type: 'varsel' }>,
  ogsaaEtter: readonly string[],
  { lest, u }: { lest: readonly Domenehendelse[]; u: Utledning },
  oppslag: Vedleggsoppslag
): Avvisning | null {
  const hjemlene = [k.hjemmel, ...ogsaaEtter].filter(kravetErVarsel);
  if (!hjemlene.length) return null;
  const vedlagte = innholdetIVedleggene(k.dokumentasjon, oppslag);
  if (!vedlagte.size) return null;
  // Brevet er sendt utenfor løsningen og lagt til, og en registrering som er rettet, står ikke.
  const rettet = rettedeBrev(u.registrerteBrev);
  const brevene = new Map(
    lest.flatMap((h) =>
      h.art === 'dokument' &&
      h.dokument.avsender === 'TE' &&
      erRegistrert(h.dokument.opplysninger) &&
      !rettet.has(h.id)
        ? [[h.id, h.dokument] as const]
        : []
    )
  );
  for (const hjemmel of hjemlene) {
    const kravet = kravSomVarsler(hjemmel, u.spor[k.spor], () => true).find((kr) => {
      const d = brevene.get(kr.dokument);
      return d !== undefined && sammeDokument(d, vedlagte);
    });
    if (kravet)
      return avvis(
        'KRAVET_ER_VARSELET',
        `Brevet står alt i saken som krav, og kravet gjelder som varselet etter punkt ${hjemmel}. Det samme brevet kan ikke legges til som varsel etter punkt ${hjemmel}. Har totalentreprenøren sendt et eget varsel før kravet, kan det brevet legges til.`
      );
  }
  return null;
}
