import { haerdet } from './format';
/** Skjemaet for byggherrens svar på forholdet (`Forholdssvar.svelte`). */
export const FORHOLDSSVAR = haerdet({
  varselTittel: 'Varselet etter punkt 32.2',
  forholdTittel: 'Forholdet',
  datoOppgitt: (gjelder: string, dato: string, brev: string) =>
    `Totalentreprenøren oppgir at ${gjelder} ${dato} (${brev}).`,
  paaberopelsenSendt: (dato: string) => `Påberopelsen ble sendt ${dato}.`,
  avstand: (dager: number) =>
    `${dager} kalenderdager fra datoen totalentreprenøren oppgir, til påberopelsen.`,
  varselSpoersmaal: 'Gjør du gjeldende at varselet kom for sent?',
  varselNei: 'Nei',
  varselJa: 'Ja, varselet kom for sent',
  forholdSpoersmaal: 'Hva svarer du på påberopelsen?',
  enigEndringsordre: 'Enig, endringsordre',
  enigIEndring: 'Enig i at pålegget innebærer en endring',
  avslaarEndringsordre: 'Avslår kravet på endringsordre',
  frafaller: 'Frafaller pålegget',
  harRisikoen: 'Byggherren har risikoen',
  harIkkeRisikoen: 'Byggherren har ikke risikoen',
  enigEndringsordre313: 'Enig i at forholdet er en endringsordre',
  avslaarForholdet: 'Avslår forholdet',
  ikkeFrafallForSent:
    'Du kan ikke frafalle pålegget og samtidig gjøre gjeldende at varselet kom for sent (punkt 32.3 første ledd\u00a0c).',
  ikkeFrafallIkkeEget:
    'Frafall gjelder bare et pålegg fra byggherren selv, ikke fra offentlig myndighet (punkt 32.3 første ledd\u00a0c).',
  endringsordreMerke: 'Svaret er en endringsordre',
  brevetSier: 'Brevet sier:',
  setningenStaar: 'Setningen står i brevet også når begrunnelsen har vilkår eller forbehold.',
  manglerVarsel: 'Svar på om du gjør gjeldende at varselet kom for sent.',
  manglerForhold: 'Velg hva du svarer på påberopelsen.',
  krevesForSent:
    'Kreves fordi du gjør gjeldende at varselet kom for sent. Skriv den under punktet om varselet eller forholdet.',
  krevesAvslag: 'Kreves fordi du avslår kravet på endringsordre (punkt 32.3 første ledd b).',
  manglerBegrunnelse: 'Skriv en begrunnelse for svaret på forholdet.',
  linjeVarselForSent: 'Du gjør gjeldende at varselet etter punkt 32.2 kom for sent',
  linjeVarselIkkeForSent: 'Du gjør ikke gjeldende at varselet etter punkt 32.2 kom for sent',
  linjeEndringsordre: 'Du er enig, og svaret er en endringsordre (punkt 32.3 første ledd a)',
  linjeEnigIEndring: 'Du er enig i at pålegget innebærer en endring',
  linjeEnig313: 'Du er enig i at forholdet er en endringsordre (punkt 31.3)',
  linjeAvslag: 'Du avslår kravet på endringsordre (punkt 32.3 første ledd b)',
  linjeAvslaarForholdet: 'Du avslår forholdet',
  linjeFrafall: 'Du frafaller pålegget (punkt 32.3 første ledd c)',
  // U-7 og D-5: hva svaret gjør, lest av kjernens utledning av utkastet.
  virkningEndringsordre: 'Svaret er en endringsordre. Den går gjennom fullmakten før den sendes.',
  virkningEnighet:
    'Enigheten om forholdet registreres ut fra valgene. Kravene om vederlag og frist står for seg.',
  virkningFrafall:
    'Pålegget er frafalt, og forholdet er avklart. Kravene om vederlag og frist for det utførte arbeidet behandles i saken.',
  virkningSubsidiaert:
    'Svarene på vederlag og frist gjelder subsidiært. Totalentreprenøren kan godta svaret, og da avsluttes saken.',
  /** U-14 og OV-U101: et svar gitt utenfor løsningen legges til som korrespondanse. */
  utenforLoesningen:
    'Har du alt svart på påberopelsen utenfor løsningen, i et brev, en e-post eller et møtereferat? Legg svaret til i saken som korrespondanse, og velg at det er et svar. Det gjelder fra datoen du oppgir at det ble sendt.',
} as const);
