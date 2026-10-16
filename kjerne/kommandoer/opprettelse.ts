/**
 * Opprettelsen av en KOE-sak (kjernedelen av #370). Saken opprettes i et eget
 * steg før grunnlagskravet, fordi den låste teksten i kravet har saksnummeret,
 * som lages når saken opprettes (LV-U2, DL-U6). Kommandoen står utenfor
 * `Kommando`: den har ingen journal å vurderes mot. Serveren skriver `data` som
 * `sak_opprettet` i versjon 1.
 */

import { FORMAT, SAK_OPPRETTET, objekt, TEKST } from '../format/format.ts';
import { erObjekt, feilI, harUlagringsbarTekst } from '../format/skjema.ts';
import { avvis } from './forutsetninger.ts';
import type { Avvisning, Part } from '../typer.ts';

export interface Opprettelse {
  type: 'opprett_sak';
  sakstittel: string;
}

export type Opprettelsesutfall =
  | { godtatt: true; format: number; data: { sakstittel: string; sakstype: 'standard' } }
  | { godtatt: false; feil: 'UGYLDIG_FORM' | 'REGELBRUDD'; avvisning: Avvisning };

const SKJEMA = objekt({ type: { const: 'opprett_sak' }, sakstittel: TEKST }, [
  'type',
  'sakstittel',
]);

const ugyldig = (regel: string, melding: string): Opprettelsesutfall => ({
  godtatt: false,
  feil: 'UGYLDIG_FORM',
  avvisning: { regel, melding },
});

/** Raden kommandoen gir, eller avvisningen. Parten er serverens (AGENTS.md). */
export function opprettelse(kommando: unknown, part: Part): Opprettelsesutfall {
  if (harUlagringsbarTekst(kommando))
    return ugyldig(
      'TEKST_KAN_IKKE_LAGRES',
      'Kommandoen har tegn som ikke kan lagres (NUL eller en enslig surrogat).'
    );
  const feil = erObjekt(kommando) ? feilI(kommando, SKJEMA) : ['Kommandoen må være et objekt.'];
  const k = kommando as Opprettelse;
  if (!feil.length && !k.sakstittel.trim()) feil.push('$.sakstittel: saken må ha en tittel');
  if (feil.length) return ugyldig('UGYLDIG_FORM', feil.join('; '));
  // Byggherrens endring er EO-saken, som ikke er med i første versjon (OV-U1).
  if (part !== 'TE')
    return {
      godtatt: false,
      feil: 'REGELBRUDD',
      avvisning: avvis('FEIL_PART', 'Bare TE kan opprette en KOE-sak.'),
    };
  const data = { sakstittel: k.sakstittel.trim(), sakstype: 'standard' as const };
  // Kjernen må forstå det den selv skriver (MM-U2).
  const ikkeForstaatt = feilI(data, SAK_OPPRETTET);
  if (ikkeForstaatt.length)
    throw new Error(`Kjernen forstår ikke saken den selv oppretter: ${ikkeForstaatt.join('; ')}`);
  return { godtatt: true, format: FORMAT, data };
}
