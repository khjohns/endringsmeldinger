/**
 * TEKSTER (#1331). Spørsmålene, forklaringene og virkningstekstene Varden viser, samlet i
 * denne mappa med én fil per side eller skjema (#2117), så de kan kontrolleres med linse A i
 * `design-review` før brukertesten. Formateringen står i `format.ts`. Tekstene er
 * ikke vedtatt brevtekst eller produktdesign. Teksten i brevene kommer fra kjernen, og
 * teksten om svarets virkning er arbeidsvalget 26.10 (`#lib/kjernesak/svarvirkning.ts`).
 *
 * En tekst formulerer et strukturert resultat fra kjernen (et standpunkt, et beløp, et
 * brevnummer). Den finner ikke på virkningen.
 */

export * from './format';
export * from './typer';
// Hjelperne filene i mappa deler med hverandre, eksporteres ikke herfra.
export {
  BETEGNELSE,
  brevhode,
  brevref,
  brevrefFra,
  brevrefStor,
  brevtittel,
  metodenavn,
  omtalenAvKorrespondansen,
  OPPGITT,
  SPORNAVN,
} from './felles';
export { grunntekst, leselinjene, standpunkttekst } from './standpunkt';
export * from './svaret';
export * from './handlingene';
export * from './tidslinjen';
export * from './forholdet';
export * from './forholdssvar';
export * from './traaden';
export * from './korrigering';
export * from './nyversjon';
export * from './saken';
export * from './korrespondansen';
export * from './nysak';
export * from './saksliste';
export * from './kravskjema';
export { FRISTKRAV } from './fristkrav';
export * from './vederlaget';
export * from './fristen';
