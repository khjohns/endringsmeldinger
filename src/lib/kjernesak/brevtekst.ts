import { forhaandsvis, laastTekst } from '$kjerne/kommandoer/skriving';
import type { Kjerne } from '$kjerne/versjon';
import type { Journalrad, Part } from '$kjerne/typer';

/**
 * Den låste teksten kjernen lager for kommandoen mot journalen slik den er lastet
 * (B-15). Avsenderen ser den, og kommandoen bærer den; serveren avviser en annen
 * (LV-U2). `null` når kjernen ikke kan lage den; da avviser serveren kommandoen
 * med sin begrunnelse. Aktøren, tidspunktet og ID-ene settes av serveren, og
 * stemplingen her endrer ikke den låste teksten.
 */
export function laastBrevtekst(
  kommando: Record<string, unknown>,
  sakId: string,
  part: Part,
  journal: Journalrad[],
  kjerne: Kjerne
): string[] | null {
  let vurdert;
  try {
    vurdert = forhaandsvis(
      kommando,
      {
        sakId,
        aktoerId: '',
        part,
        teamId: null,
        tidspunkt: () => new Date(),
        nyId: () => crypto.randomUUID(),
      },
      journal,
      kjerne
    );
  } catch {
    return null;
  }
  return vurdert.godtatt ? laastTekst(vurdert.hendelser[0]) : null;
}
