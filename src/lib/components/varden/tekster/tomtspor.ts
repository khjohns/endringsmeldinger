import type { VarselISporet } from '#kjerne/utledning/visning.ts';
import type { Brevref } from '../lesing';
import { KRAVET, brevref } from './felles';
import { dato, haerdet, punkt } from './format';

type Kravspor = 'vederlag' | 'frist';

/** Et spor uten varsel eller krav fra totalentreprenøren (OV-U125, U-1–U-3 i BF-51). */
export const TOMT_SPOR = haerdet({
  /** U-2: linja under betegnelsen på siden for sporet. */
  linje: (spor: Kravspor) =>
    `Totalentreprenøren har ikke sendt eller lagt til et varsel eller krav om ${KRAVET[spor]} i saken.`,
  /** U-1: det første kravet som hovedvalg. */
  sendKrav: (spor: Kravspor) => `Send krav om ${KRAVET[spor]}`,
  /** U-3: påminnelsen øverst i skjemaet for det første kravet (OV-U3, S-3). */
  foersteKrav: (spor: Kravspor) => `Dette er det første kravet om ${KRAVET[spor]} i saken.`,
  varslene: (spor: Kravspor) => `Varsler om ${KRAVET[spor]} i saken`,
  /** Et varsel i sporet med brevet og dagen det ble sendt, herfra eller oppgitt (OV-U5). */
  varselet: (v: VarselISporet, b: Brevref | null) =>
    `Varsel etter ${punkt(v.hjemmel)}${b ? ` i ${brevref(b)}` : ''}${
      v.sendt ? `, sendt ${dato(v.sendt)}${v.oppgitt ? ' (datoen er oppgitt)' : ''}` : ''
    }.`,
  ingenVarsel: (spor: Kravspor) =>
    `Saken har ikke et varsel om ${KRAVET[spor]}. Er varselet sendt på annen måte, kan du legge det til med datoen det ble sendt.`,
});
