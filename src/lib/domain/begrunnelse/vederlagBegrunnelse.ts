/**
 * Vederlag Begrunnelse Generator
 *
 * Generates legally precise justification text for BH's response to
 * vederlagskrav (payment claims) based on NS 8407.
 *
 * NS 8407:2011 referanser:
 * - §30.2: Kostnadsoverslag ved regningsarbeid
 * - §34.1.2: Varslingskrav og preklusjon
 * - §34.1.3: Særskilt justering for rigg, drift, produktivitetstap
 * - §34.2.1: Avtalt vederlagsjustering (fastpris)
 * - §34.3: Enhetspriser
 * - §34.4: Regningsarbeid som fallback
 */

import type { VederlagsMetode } from '../../types/timeline';
import type { BelopVurdering, BegrunnelseGeneratorOptions } from './shared';
import { formatCurrency, formatProsent, getVurderingVerb } from './shared';

// ============================================================================
// TYPES
// ============================================================================

export interface VederlagResponseInput {
  // Claim context
  metode?: VederlagsMetode;
  hovedkravBelop?: number;
  riggBelop?: number;
  produktivitetBelop?: number;
  harRiggKrav: boolean;
  harProduktivitetKrav: boolean;

  // §32.2: Grunnlagspreklusjon - hele vederlagskravet er subsidiært
  erGrunnlagPrekludert?: boolean;
  // Grunnlag avslått - hele vederlagskravet er subsidiært
  erGrunnlagAvslatt?: boolean;

  // Preklusjon (Port 1/2)
  hovedkravVarsletITide?: boolean; // §34.1.2 - kun SVIKT/ANDRE
  riggVarsletITide?: boolean; // §34.1.3
  produktivitetVarsletITide?: boolean; // §34.1.3

  // Metode (Port 2/3)
  akseptererMetode: boolean;
  oensketMetode?: VederlagsMetode;
  epJusteringVarsletITide?: boolean; // §34.3.3 - TE varslet i tide?
  epJusteringAkseptert?: boolean; // §34.3.3 - BH aksepterer?
  kreverJustertEp?: boolean;
  holdTilbake?: boolean;

  // Beløp (Port 3/4)
  hovedkravVurdering: BelopVurdering;
  hovedkravGodkjentBelop?: number;
  riggVurdering?: BelopVurdering;
  riggGodkjentBelop?: number;
  produktivitetVurdering?: BelopVurdering;
  produktivitetGodkjentBelop?: number;

  // Computed totals
  totalKrevd: number;
  totalGodkjent: number;
  totalGodkjentSubsidiaer?: number;
  harPrekludertKrav: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function getEffektivMetode(input: VederlagResponseInput): VederlagsMetode | undefined {
  if (!input.akseptererMetode && input.oensketMetode) {
    return input.oensketMetode;
  }
  return input.metode;
}

function getMetodeTerminologi(input: VederlagResponseInput): {
  kravLabel: string;
  kravLabelLower: string;
  akseptVerb: string;
  belopLabel: string;
  introLabel: string;
} {
  const effektiv = getEffektivMetode(input);

  switch (effektiv) {
    case 'REGNINGSARBEID':
      return {
        kravLabel: 'Kostnadsoverslaget',
        kravLabelLower: 'kostnadsoverslaget',
        akseptVerb: 'aksepteres',
        belopLabel: 'akseptert kostnadsoverslag',
        introLabel: 'Hva gjelder kostnadsoverslaget:',
      };
    case 'ENHETSPRISER':
      return {
        kravLabel: 'Beregningen basert på anslåtte mengder',
        kravLabelLower: 'beregningen',
        akseptVerb: 'aksepteres',
        belopLabel: 'akseptert beløp basert på anslåtte mengder',
        introLabel: 'Hva gjelder beregningen:',
      };
    default: // FASTPRIS_TILBUD
      return {
        kravLabel: 'Hovedkravet',
        kravLabelLower: 'hovedkravet',
        akseptVerb: 'godkjennes',
        belopLabel: 'godkjent beløp',
        introLabel: 'Hva gjelder beløpet:',
      };
  }
}

function getMetodeLabel(metode?: VederlagsMetode): string {
  if (!metode) return 'ukjent beregningsmetode';
  const labels: Record<VederlagsMetode, string> = {
    ENHETSPRISER: 'enhetspriser (§34.3)',
    REGNINGSARBEID: 'regningsarbeid (§34.4)',
    FASTPRIS_TILBUD: 'fastpris/tilbud (§34.2.1)',
  };
  return labels[metode] || metode;
}

// ============================================================================
// SECTION GENERATORS
// ============================================================================

function generateMetodeSection(input: VederlagResponseInput): string {
  const lines: string[] = [];

  if (input.akseptererMetode) {
    lines.push(
      `Byggherren godtar den foreslåtte beregningsmetoden ${getMetodeLabel(input.metode)}.`
    );
  } else {
    lines.push(
      `Byggherren godtar ikke den foreslåtte beregningsmetoden ${getMetodeLabel(input.metode)}, ` +
        `og krever i stedet beregning etter ${getMetodeLabel(input.oensketMetode)}.`
    );
  }

  // EP-justering response (§34.3.3)
  if (input.kreverJustertEp) {
    if (!input.akseptererMetode && input.metode === 'ENHETSPRISER') {
      lines.push(
        'Byggherren tar likevel stilling til entreprenørens krav om justerte enhetspriser:'
      );
    }

    if (input.epJusteringVarsletITide === false) {
      lines.push(
        'Kravet om justerte enhetspriser ble ikke varslet «uten ugrunnet opphold» (§34.3.3 første ledd). ' +
          'Entreprenøren har dermed bare krav på slik justering som byggherren måtte forstå at forholdet ville føre til.'
      );
    }
    if (input.epJusteringAkseptert !== undefined) {
      if (input.epJusteringAkseptert) {
        lines.push('Kravet om justerte enhetspriser (§34.3.2) aksepteres.');
      } else {
        lines.push(
          'Kravet om justerte enhetspriser (§34.3.2) avvises. ' +
            'Vilkårene for justering anses ikke oppfylt.'
        );
      }
    }
  }

  // Hold tilbake (§30.2)
  if (input.holdTilbake) {
    lines.push(
      'Byggherren holder tilbake betaling inntil kostnadsoverslag mottas (§30.2). ' +
        'Utbetaling vil skje når tilfredsstillende overslag er levert.'
    );
  }

  return lines.join(' ');
}

function generateHovedkravSection(
  input: VederlagResponseInput,
  options: BegrunnelseGeneratorOptions = {}
): string {
  const { hovedkravVurdering, hovedkravBelop, hovedkravGodkjentBelop, hovedkravVarsletITide } =
    input;
  const { useTokens = false } = options;

  if (!hovedkravBelop) {
    return '';
  }

  const lines: string[] = [];
  const isPrekludert = hovedkravVarsletITide === false;
  const terminologi = getMetodeTerminologi(input);
  if (isPrekludert) {
    lines.push(
      `${terminologi.kravLabel} på ${formatCurrency(hovedkravBelop, useTokens)} avvises prinsipalt som prekludert iht. §34.1.2, ` +
        `da varselet ikke ble fremsatt «uten ugrunnet opphold» etter at entreprenøren ble eller burde blitt klar over forholdet.`
    );

    const subsidiaerText = generateSubsidiaerKravText(
      terminologi.kravLabelLower,
      hovedkravBelop,
      hovedkravVurdering,
      hovedkravGodkjentBelop,
      useTokens
    );
    lines.push(subsidiaerText);

    return lines.join(' ');
  }

  switch (hovedkravVurdering) {
    case 'godkjent':
      return `${terminologi.kravLabel} på ${formatCurrency(hovedkravBelop, useTokens)} ${terminologi.akseptVerb}.`;

    case 'delvis': {
      const godkjent = hovedkravGodkjentBelop ?? 0;
      const prosentValue = hovedkravBelop > 0 ? Math.round((godkjent / hovedkravBelop) * 100) : 0;
      return (
        `${terminologi.kravLabel} ${terminologi.akseptVerb} delvis med ${formatCurrency(godkjent, useTokens)} ` +
        `av krevde ${formatCurrency(hovedkravBelop, useTokens)} (${formatProsent(prosentValue, useTokens)}).`
      );
    }

    case 'avslatt':
      return `${terminologi.kravLabel} på ${formatCurrency(hovedkravBelop, useTokens)} avvises.`;
  }
}

function generateRiggSection(
  input: VederlagResponseInput,
  options: BegrunnelseGeneratorOptions = {}
): string {
  const { useTokens = false } = options;

  if (!input.harRiggKrav || !input.riggBelop) {
    return '';
  }

  const lines: string[] = [];
  const isPrekludert = input.riggVarsletITide === false;

  if (isPrekludert) {
    lines.push(
      `Kravet om dekning av økte rigg- og driftskostnader på ${formatCurrency(input.riggBelop, useTokens)} ` +
        `avvises prinsipalt som prekludert iht. §34.1.3, da varselet ikke ble fremsatt «uten ugrunnet opphold» ` +
        `etter at entreprenøren ble eller burde blitt klar over at utgiftene ville påløpe.`
    );

    if (input.riggVurdering) {
      const subsidiaerText = generateSubsidiaerKravText(
        'rigg- og driftskostnader',
        input.riggBelop,
        input.riggVurdering,
        input.riggGodkjentBelop,
        useTokens
      );
      lines.push(subsidiaerText);
    }
  } else {
    lines.push(
      generateKravVurderingText(
        'rigg- og driftskostnader',
        input.riggBelop,
        input.riggVurdering ?? 'avslatt',
        input.riggGodkjentBelop,
        useTokens
      )
    );
  }

  return lines.join(' ');
}

function generateProduktivitetSection(
  input: VederlagResponseInput,
  options: BegrunnelseGeneratorOptions = {}
): string {
  const { useTokens = false } = options;

  if (!input.harProduktivitetKrav || !input.produktivitetBelop) {
    return '';
  }

  const lines: string[] = [];
  const isPrekludert = input.produktivitetVarsletITide === false;

  if (isPrekludert) {
    lines.push(
      `Kravet om dekning av produktivitetstap på ${formatCurrency(input.produktivitetBelop, useTokens)} ` +
        `avvises prinsipalt som prekludert iht. §34.1.3, da varselet ikke ble fremsatt «uten ugrunnet opphold» ` +
        `etter at entreprenøren burde ha innsett at forstyrrelsene medførte merkostnader.`
    );

    if (input.produktivitetVurdering) {
      const subsidiaerText = generateSubsidiaerKravText(
        'produktivitetstap',
        input.produktivitetBelop,
        input.produktivitetVurdering,
        input.produktivitetGodkjentBelop,
        useTokens
      );
      lines.push(subsidiaerText);
    }
  } else {
    lines.push(
      generateKravVurderingText(
        'produktivitetstap',
        input.produktivitetBelop,
        input.produktivitetVurdering ?? 'avslatt',
        input.produktivitetGodkjentBelop,
        useTokens
      )
    );
  }

  return lines.join(' ');
}

function generateKravVurderingText(
  kravType: string,
  krevdBelop: number,
  vurdering: BelopVurdering,
  godkjentBelop?: number,
  useTokens = false
): string {
  switch (vurdering) {
    case 'godkjent':
      return `Kravet om dekning av ${kravType} på ${formatCurrency(krevdBelop, useTokens)} ${getVurderingVerb('godkjent')}.`;

    case 'delvis': {
      const belop = godkjentBelop ?? 0;
      return (
        `Kravet om dekning av ${kravType} ${getVurderingVerb('delvis')} med ` +
        `${formatCurrency(belop, useTokens)} av krevde ${formatCurrency(krevdBelop, useTokens)}.`
      );
    }

    case 'avslatt':
      return `Kravet om dekning av ${kravType} på ${formatCurrency(krevdBelop, useTokens)} ${getVurderingVerb('avslatt')}.`;
  }
}

function generateSubsidiaerKravText(
  kravType: string,
  krevdBelop: number,
  vurdering: BelopVurdering,
  godkjentBelop?: number,
  useTokens = false
): string {
  const prefix = `Subsidiært, dersom ${kravType} ikke anses prekludert,`;

  switch (vurdering) {
    case 'godkjent':
      return `${prefix} aksepteres ${formatCurrency(krevdBelop, useTokens)}.`;

    case 'delvis':
      return `${prefix} aksepteres ${formatCurrency(godkjentBelop ?? 0, useTokens)} av krevde ${formatCurrency(krevdBelop, useTokens)}.`;

    case 'avslatt':
      return `${prefix} ville ${kravType} uansett blitt avvist.`;
  }
}

function generateKonklusjonSection(
  input: VederlagResponseInput,
  options: BegrunnelseGeneratorOptions = {}
): string {
  const { useTokens = false } = options;
  const lines: string[] = [];
  const terminologi = getMetodeTerminologi(input);

  lines.push(
    `Samlet ${terminologi.belopLabel} utgjør etter dette ${formatCurrency(input.totalGodkjent, useTokens)} ` +
      `av totalt krevde ${formatCurrency(input.totalKrevd, useTokens)}.`
  );

  if (input.harPrekludertKrav && input.totalGodkjentSubsidiaer !== undefined) {
    const diff = input.totalGodkjentSubsidiaer - input.totalGodkjent;
    if (diff > 0) {
      const hovedkravPrekludert = input.hovedkravVarsletITide === false;
      const kravType = hovedkravPrekludert ? 'kravene' : 'særskilte kravene';
      lines.push(
        `Dersom de prekluderte ${kravType} hadde vært varslet i tide, ville samlet ${terminologi.belopLabel} ` +
          `utgjort ${formatCurrency(input.totalGodkjentSubsidiaer, useTokens)} (subsidiært standpunkt).`
      );
    }
  }

  return lines.join(' ');
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export function generateVederlagResponseBegrunnelse(
  input: VederlagResponseInput,
  options: BegrunnelseGeneratorOptions = {}
): string {
  const sections: string[] = [];

  if (input.erGrunnlagPrekludert) {
    sections.push(
      'Grunnlagsvarselet ble ikke fremsatt «uten ugrunnet opphold» (§32.2). ' +
        'Vurderingen av vederlagskravet nedenfor gjelder derfor subsidiært, ' +
        'for det tilfellet at byggherren ikke får medhold i preklusjonsinnsigelsen.'
    );
  } else if (input.erGrunnlagAvslatt) {
    sections.push(
      'Kontraktsforholdet er avvist. Vurderingen av vederlagskravet nedenfor gjelder derfor ' +
        'subsidiært, for det tilfellet at byggherren ikke får medhold i avvisningen av grunnlaget.'
    );
  }

  const metodeSection = generateMetodeSection(input);
  if (metodeSection) {
    sections.push(metodeSection);
  }

  if (!input.holdTilbake) {
    const terminologi = getMetodeTerminologi(input);
    sections.push(terminologi.introLabel);

    const hovedkravSection = generateHovedkravSection(input, options);
    if (hovedkravSection) {
      sections.push(hovedkravSection);
    }

    const riggSection = generateRiggSection(input, options);
    if (riggSection) {
      sections.push(riggSection);
    }

    const produktivitetSection = generateProduktivitetSection(input, options);
    if (produktivitetSection) {
      sections.push(produktivitetSection);
    }

    const konklusjonSection = generateKonklusjonSection(input, options);
    if (konklusjonSection) {
      sections.push(konklusjonSection);
    }
  }

  return sections.join('\n\n');
}
