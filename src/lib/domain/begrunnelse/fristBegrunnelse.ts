/**
 * Frist Begrunnelse Generator
 *
 * Generates legally precise justification text for BH's response to
 * fristforlengelseskrav (deadline extension claims) based on NS 8407.
 *
 * NS 8407:2011 referanser:
 * - §33.1: TE's rett på fristforlengelse
 * - §33.3: Force majeure
 * - §33.4: Varslingskrav og preklusjon
 * - §33.5: Beregning av fristforlengelse
 * - §33.6.1: Sen spesifisering (reduksjon)
 * - §33.6.2: BH's forespørsel
 * - §33.7: Svarplikt
 * - §33.8: Forsering
 */

import type { FristVarselType } from '../../types/timeline';
import type { BegrunnelseGeneratorOptions } from './shared';
import { formatDager, formatProsent } from './shared';

// ============================================================================
// TYPES
// ============================================================================

export interface FristResponseInput {
  // Claim context
  varselType?: FristVarselType;
  krevdDager: number;

  // Preklusjon (Port 1)
  fristVarselOk?: boolean; // §33.4: Varsel om fristforlengelse rettidig?
  spesifisertKravOk?: boolean;
  foresporselSvarOk?: boolean; // §33.6.2/§5: Svar på forespørsel i tide?
  sendForesporsel?: boolean;

  // Vilkår (Port 2)
  vilkarOppfylt: boolean;

  // Beregning (Port 3)
  godkjentDager: number;

  // Computed
  erPrekludert: boolean; // §33.4: Varsel for sent
  erForesporselSvarForSent?: boolean; // §33.6.2 tredje ledd + §5
  erRedusert_33_6_1?: boolean; // §33.6.1: Sen spesifisering
  harTidligereVarselITide?: boolean;
  erGrunnlagSubsidiaer?: boolean;
  erGrunnlagPrekludert?: boolean; // §32.2
  prinsipaltResultat: string;
  subsidiaertResultat?: string;
  visSubsidiaertResultat: boolean;
}

// ============================================================================
// EXPORTED HELPERS
// ============================================================================

export function getVarselTypeLabel(varselType?: FristVarselType): string {
  if (!varselType) return 'varsel';
  const labels: Record<FristVarselType, string> = {
    varsel: 'varsel om fristforlengelse (§33.4)',
    spesifisert: 'spesifisert krav (§33.6)',
    begrunnelse_utsatt: 'begrunnelse for utsettelse (§33.6.2 b)',
  };
  return labels[varselType] || varselType;
}

export function getPreklusjonParagraf(varselType?: FristVarselType): string {
  switch (varselType) {
    case 'varsel':
      return '§33.4';
    default:
      return '§33.6';
  }
}

// ============================================================================
// SECTION GENERATORS
// ============================================================================

function generateFristPreklusjonSection(input: FristResponseInput): string {
  if (input.sendForesporsel) {
    return (
      'Byggherren etterspør spesifisert krav iht. §33.6.2. ' +
      'Entreprenøren må «uten ugrunnet opphold» angi og begrunne antall dager fristforlengelse. ' +
      'Dersom dette ikke gjøres, tapes kravet.'
    );
  }

  if (input.erForesporselSvarForSent) {
    return (
      'Kravet avvises som prekludert iht. §33.6.2 tredje ledd, jf. §5. ' +
      'Entreprenøren svarte ikke «uten ugrunnet opphold» på byggherrens forespørsel. ' +
      'Byggherren påberoper seg at fristen er oversittet, jf. §5.'
    );
  }

  if (input.erPrekludert) {
    const prinsipaltTekst =
      'Kravet avvises prinsipalt som prekludert iht. §33.4, ' +
      'da varsel ikke ble fremsatt «uten ugrunnet opphold» ' +
      'etter at entreprenøren ble eller burde blitt klar over forholdet.';

    if (input.erRedusert_33_6_1) {
      return (
        prinsipaltTekst +
        ' Subsidiært bemerkes at selv om §33.4-fristen ikke anses oversittet, ' +
        'ble det spesifiserte kravet uansett fremsatt for sent iht. §33.6.1. ' +
        'Entreprenøren ville da kun hatt krav på det byggherren måtte forstå at han hadde krav på.'
      );
    }

    return prinsipaltTekst;
  }

  if (input.erRedusert_33_6_1) {
    return (
      'Kravet om fristforlengelse ble ikke fremsatt «uten ugrunnet opphold» etter at grunnlaget ' +
      'for å beregne kravet forelå (§33.6.1). Entreprenøren har dermed bare krav på slik ' +
      'fristforlengelse som byggherren måtte forstå at han hadde krav på.'
    );
  }

  if (input.foresporselSvarOk === true && input.varselType === 'spesifisert') {
    return (
      'Kravet er svar på byggherrens forespørsel og kom i tide. ' +
      'I henhold til §33.6.2 fjerde ledd kan byggherren ikke påberope at fristen i §33.6.1 er oversittet.'
    );
  }
  if (input.varselType === 'spesifisert' && input.harTidligereVarselITide) {
    return 'Varslingskravene i §33.4 og §33.6.1 anses oppfylt.';
  }
  return 'Varslingskravene i §33.4 anses oppfylt.';
}

function generateFristVilkarSection(input: FristResponseInput): string {
  const { vilkarOppfylt, erPrekludert } = input;

  const prefix = erPrekludert ? 'Subsidiært, hva gjelder vilkårene (§33.1): ' : '';

  if (vilkarOppfylt) {
    return prefix + 'Det erkjennes at forholdet har hindret fremdriften, jf. §33.1.';
  }

  return prefix + 'Det bestrides at forholdet har hindret fremdriften, jf. §33.1.';
}

function generateFristBeregningSection(
  input: FristResponseInput,
  options: BegrunnelseGeneratorOptions = {}
): string {
  const {
    krevdDager,
    godkjentDager,
    erPrekludert,
    vilkarOppfylt,
    varselType,
    sendForesporsel,
    erGrunnlagSubsidiaer,
  } = input;
  const { useTokens = false } = options;

  if (sendForesporsel || (varselType === 'varsel' && krevdDager === 0)) {
    return '';
  }

  const erSubsidiaer = erPrekludert || !vilkarOppfylt || erGrunnlagSubsidiaer;
  const prefix = erSubsidiaer
    ? 'Subsidiært, hva gjelder antall dager: '
    : 'Hva gjelder antall dager: ';

  const fmtKrevd = formatDager(krevdDager, useTokens);
  const fmtGodkjent = formatDager(godkjentDager, useTokens);

  if (godkjentDager === 0) {
    return prefix + `Kravet om ${fmtKrevd} fristforlengelse kan ikke imøtekommes.`;
  }

  if (godkjentDager >= krevdDager) {
    return prefix + `Kravet om ${fmtKrevd}s fristforlengelse godkjennes i sin helhet.`;
  }

  const prosentValue = krevdDager > 0 ? Math.round((godkjentDager / krevdDager) * 100) : 0;
  const fmtProsent = formatProsent(prosentValue, useTokens);
  return (
    prefix + `Kravet godkjennes delvis med ${fmtGodkjent} av krevde ${fmtKrevd} (${fmtProsent}).`
  );
}

function generateFristKonklusjonSection(
  input: FristResponseInput,
  options: BegrunnelseGeneratorOptions = {}
): string {
  const {
    krevdDager,
    godkjentDager,
    prinsipaltResultat,
    visSubsidiaertResultat,
    varselType,
    sendForesporsel,
  } = input;
  const { useTokens = false } = options;
  const lines: string[] = [];

  if (sendForesporsel) {
    return '';
  }

  if (varselType === 'varsel' && krevdDager === 0) {
    lines.push('Antall dager kan først vurderes når entreprenøren spesifiserer kravet.');
    return lines.join(' ');
  }

  const fmtKrevd = formatDager(krevdDager, useTokens);
  const fmtGodkjent = formatDager(godkjentDager, useTokens);

  if (prinsipaltResultat === 'avslatt') {
    lines.push(`Kravet om ${fmtKrevd} fristforlengelse avvises i sin helhet.`);
  } else if (prinsipaltResultat === 'godkjent') {
    lines.push(`Samlet godkjennes ${fmtGodkjent} fristforlengelse.`);
  } else {
    lines.push(`Samlet godkjennes ${fmtGodkjent} av ${fmtKrevd} krevd.`);
  }

  if (visSubsidiaertResultat && prinsipaltResultat === 'avslatt') {
    if (godkjentDager > 0) {
      lines.push(
        `Dersom byggherren ikke får medhold i sin prinsipale avvisning, ` +
          `kan entreprenøren maksimalt ha krav på ${fmtGodkjent} (subsidiært standpunkt).`
      );
    } else {
      lines.push(
        'Selv om byggherren ikke skulle få medhold i sin prinsipale avvisning, ' +
          'ville kravet uansett blitt avslått subsidiært.'
      );
    }
  }

  return lines.join(' ');
}

function generateForseringWarningSection(
  input: FristResponseInput,
  _options: BegrunnelseGeneratorOptions = {}
): string {
  const { krevdDager, godkjentDager, prinsipaltResultat } = input;
  const avslatteDager = krevdDager - godkjentDager;

  if (avslatteDager <= 0) {
    return '';
  }

  if (prinsipaltResultat === 'godkjent') {
    return '';
  }

  return (
    `Byggherren gjør oppmerksom på at dersom avslaget skulle vise seg å være uberettiget, ` +
    `kan entreprenøren velge å anse avslaget som et pålegg om forsering (§33.8). ` +
    `Denne valgretten gjelder dog ikke dersom forseringskostnadene overstiger dagmulkten med tillegg av 30%.`
  );
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export function generateFristResponseBegrunnelse(
  input: FristResponseInput,
  options: BegrunnelseGeneratorOptions = {}
): string {
  const sections: string[] = [];

  if (input.sendForesporsel) {
    return generateFristPreklusjonSection(input);
  }

  if (input.varselType === 'begrunnelse_utsatt') {
    return (
      'Byggherren bekrefter mottak av begrunnelse for hvorfor grunnlaget for å beregne ' +
      'fristforlengelseskravet ikke foreligger (§33.6.2 annet ledd bokstav b).\n\n' +
      'I henhold til §33.6.2 femte ledd gjelder bestemmelsen i §33.6.1 videre. ' +
      'Entreprenøren må fremsette spesifisert krav med antall dager «uten ugrunnet opphold» ' +
      'når grunnlaget for å beregne kravet foreligger.'
    );
  }

  if (input.erGrunnlagPrekludert) {
    sections.push(
      'Grunnlagsvarselet ble ikke fremsatt «uten ugrunnet opphold» (§32.2). ' +
        'Vurderingen av fristkravet nedenfor gjelder derfor subsidiært, ' +
        'for det tilfellet at byggherren ikke får medhold i preklusjonsinnsigelsen.'
    );
  } else if (input.erGrunnlagSubsidiaer) {
    sections.push(
      'Kontraktsforholdet er avvist. Vurderingen av fristkravet nedenfor gjelder derfor ' +
        'subsidiært, for det tilfellet at byggherren ikke får medhold i avvisningen av grunnlaget.'
    );
  }

  const preklusjonSection = generateFristPreklusjonSection(input);
  sections.push(preklusjonSection);

  const vilkarSection = generateFristVilkarSection(input);
  sections.push(vilkarSection);

  const beregningSection = generateFristBeregningSection(input, options);
  if (beregningSection) sections.push(beregningSection);

  const konklusjonSection = generateFristKonklusjonSection(input, options);
  if (konklusjonSection) sections.push(konklusjonSection);

  const forseringSection = generateForseringWarningSection(input, options);
  if (forseringSection) {
    sections.push(forseringSection);
  }

  return sections.join('\n\n');
}
