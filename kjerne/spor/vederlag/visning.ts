/**
 * Visningen i vederlagssporet: byggherrens svar slik visningen viser det, og etiketten for
 * varselet etter § 34.1.2. `utledning/visning.ts` slår opp i sporet gjennom `VISNING` (#1783).
 */

import { hjemmelenGjelder } from '../../frosset/byggeklosser.ts';
import { postlisten, type Paaberopt, type Vederlagspost } from './frysing.ts';
import { vurdertVedRegistreringen, type Utledning } from '../../utledning/utled.ts';
import type { Sporsvisning } from '../../utledning/visning.ts';
import type { Part, Svar } from '../../typer.ts';
import { lagFraForholdet } from '../forhold/frysing.ts';

/**
 * Byggherrens svar på vederlaget slik visningen viser det (svarene i #1047 24.10): postene
 * og påberopelsene med lagene brevet ga dem (`postlisten`), brevet og parten. Et registrert
 * svar er appens vurdering ved registreringen (MM-U17 (opphevet av MM-U50)). `eldreKravversjon` skiller svaret på
 * en eldre kravversjon fra kravet som venter på svar (MM-U24, MM-U9).
 */
export interface Vederlagssvaret {
  svar: string;
  dokument: string;
  hendelse: string;
  part: Part;
  kravversjon: string;
  eldreKravversjon: boolean;
  vurdertVedRegistreringen: boolean;
  poster: Vederlagspost[];
  paaberopt: Paaberopt[];
}

/**
 * Lagene svaret på forholdet opptok foran sporet da brevet med `svar` ble sendt
 * (`Svarberegning.forholdssvaret`, OV-U32). 0 for forholdet selv.
 */
export function forskyvningIBrevet(svar: Svar, u: Utledning): number {
  const id = u.svar[svar.id].forholdssvaret;
  if (id === null) return 0;
  const kilde = u.svar[id].svar;
  return lagFraForholdet(kilde, kilde.beslutningsgrunnlag.virkninger);
}

export function vederlagssvaret(u: Utledning, svar: Svar): Vederlagssvaret {
  if (svar.spor !== 'vederlag') throw new Error(`${svar.id} er ikke et svar på vederlaget`);
  const element = u.elementer[svar.id];
  return {
    svar: svar.id,
    dokument: svar.dokument,
    hendelse: element.hendelse,
    part: element.part,
    kravversjon: svar.gjelder,
    eldreKravversjon: svar.gjelder !== u.spor.vederlag.gjeldendeKrav?.id,
    vurdertVedRegistreringen: vurdertVedRegistreringen(u, svar.id),
    ...postlisten(svar, svar.beslutningsgrunnlag.virkninger, forskyvningIBrevet(svar, u)),
  };
}

export const VISNING_I_VEDERLAGET = {
  // OV-U15: der TE krever endring, kreves det ikke varsel etter § 34.1.2 (§ 34.1.1).
  varseletikett: (u, regler) =>
    u.spor.forhold.gjeldendeKrav &&
    !hjemmelenGjelder('34.1.2', u.spor.forhold.gjeldendeKrav, regler)
      ? 'varsel_kreves_ikke'
      : null,
  paaleggFrafalt: () => false,
  passivitetsetikett: () => null,
} satisfies Sporsvisning;
