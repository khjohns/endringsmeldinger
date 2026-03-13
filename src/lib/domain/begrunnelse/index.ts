export type { BelopVurdering, BegrunnelseGeneratorOptions } from './shared';
export { combineBegrunnelse } from './shared';

export type { VederlagResponseInput } from './vederlagBegrunnelse';
export { generateVederlagResponseBegrunnelse } from './vederlagBegrunnelse';

export type { FristResponseInput } from './fristBegrunnelse';
export {
  getVarselTypeLabel,
  getPreklusjonParagraf,
  generateFristResponseBegrunnelse,
} from './fristBegrunnelse';

export type { ForseringResponseInput } from './forseringBegrunnelse';
export { generateForseringResponseBegrunnelse } from './forseringBegrunnelse';
