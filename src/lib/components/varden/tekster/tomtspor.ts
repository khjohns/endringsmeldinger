import type { Brevref } from '../lesing';
import { brevref } from './felles';
import { dato, haerdet, punkt } from './format';

type Kravspor = 'vederlag' | 'frist';

/** Kravet i ubestemt form, slik kortet og påminnelsen omtaler det (BF-51). */
const KRAVET: Record<Kravspor, string> = haerdet({
  vederlag: 'vederlagsjustering',
  frist: 'fristforlengelse',
});

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
  varselet: (hjemmel: string, b: Brevref | null, sendt: string | null, oppgitt: boolean) =>
    `Varsel etter ${punkt(hjemmel)}${b ? ` i ${brevref(b)}` : ''}${
      sendt ? `, sendt ${dato(sendt)}${oppgitt ? ' (datoen er oppgitt)' : ''}` : ''
    }.`,
  ingenVarsel: (spor: Kravspor) =>
    `Saken har ikke et varsel om ${KRAVET[spor]}. Er varselet sendt på annen måte, kan du legge det til med datoen det ble sendt.`,
});
