/**
 * Forsering Begrunnelse Generator
 *
 * Generates legally precise justification text for BH's response to
 * forseringskrav (acceleration claims) based on NS 8407 §33.8.
 *
 * NS 8407:2011 referanser:
 * - §33.8 (1): Forsering - TE kan anse avslag som pålegg om forsering
 * - §33.8 (1): 30%-begrensning - valgrett bortfaller ved overskridelse
 * - §33.8 (2): Varslingskrav før forsering iverksettes
 * - §34.1.3: Særskilt justering for rigg, drift, produktivitetstap
 */

import type { BelopVurdering } from './shared';
import { formatCurrency } from './shared';

// ============================================================================
// TYPES
// ============================================================================

interface PerSakVurderingMedDetaljer {
  sak_id: string;
  avslag_berettiget: boolean;
  sakTittel?: string;
  avslatteDager?: number;
}

export interface ForseringResponseInput {
  // Kalkulasjonsgrunnlag
  avslatteDager: number;
  dagmulktsats: number;
  maksForseringskostnad: number;
  estimertKostnad: number;

  // Port 1: Per-sak vurdering av forseringsrett (§33.8)
  vurderingPerSak?: PerSakVurderingMedDetaljer[];
  dagerMedForseringsrett?: number;
  teHarForseringsrett: boolean;

  // Port 2: 30%-regel
  trettiprosentOverholdt: boolean;
  trettiprosentBegrunnelse?: string;

  // Port 3: Beløpsvurdering
  hovedkravVurdering: BelopVurdering;
  hovedkravBelop?: number;
  godkjentBelop?: number;

  // Port 3b: Særskilte krav
  harRiggKrav: boolean;
  riggBelop?: number;
  riggVarsletITide?: boolean;
  riggVurdering?: BelopVurdering;
  godkjentRiggDrift?: number;

  harProduktivitetKrav: boolean;
  produktivitetBelop?: number;
  produktivitetVarsletITide?: boolean;
  produktivitetVurdering?: BelopVurdering;
  godkjentProduktivitet?: number;

  // Computed
  totalKrevd: number;
  totalGodkjent: number;
  harPrekludertKrav: boolean;
  subsidiaerGodkjentBelop?: number;
}

// ============================================================================
// SECTION GENERATORS
// ============================================================================

function generateForseringGrunnlagSection(input: ForseringResponseInput): string {
  const { vurderingPerSak, dagerMedForseringsrett, teHarForseringsrett, avslatteDager } = input;
  const lines: string[] = [];

  if (vurderingPerSak && vurderingPerSak.length > 0) {
    const uberettigedeSaker = vurderingPerSak.filter((v) => !v.avslag_berettiget);
    const berettigedeSaker = vurderingPerSak.filter((v) => v.avslag_berettiget);

    if (uberettigedeSaker.length > 0 && berettigedeSaker.length > 0) {
      lines.push(
        'Byggherren har vurdert hver av de avslåtte fristsakene som ligger til grunn for forseringskravet:'
      );

      const uberettigedeText = uberettigedeSaker
        .map((v) => {
          const dager = v.avslatteDager ? ` (${v.avslatteDager} dager)` : '';
          return `${v.sak_id}${v.sakTittel ? ': ' + v.sakTittel : ''}${dager}`;
        })
        .join(', ');
      lines.push(
        `For følgende saker erkjennes det at avslaget var uberettiget: ${uberettigedeText}.`
      );

      const berettigedeText = berettigedeSaker
        .map((v) => {
          const dager = v.avslatteDager ? ` (${v.avslatteDager} dager)` : '';
          return `${v.sak_id}${v.sakTittel ? ': ' + v.sakTittel : ''}${dager}`;
        })
        .join(', ');
      lines.push(
        `For følgende saker fastholdes det at avslaget var berettiget: ${berettigedeText}.`
      );

      const totalUberettigetDager =
        dagerMedForseringsrett ??
        uberettigedeSaker.reduce((sum, v) => sum + (v.avslatteDager ?? 0), 0);
      lines.push(
        `Entreprenøren har dermed rett til forseringsvederlag for ${totalUberettigetDager} av totalt ${avslatteDager} avslåtte dager iht. §33.8.`
      );
    } else if (uberettigedeSaker.length > 0) {
      if (vurderingPerSak.length > 1) {
        lines.push(
          `Byggherren erkjenner at avslagene på fristforlengelse i alle ${vurderingPerSak.length} saker var uberettiget. ` +
            `Entreprenøren har dermed rett til forseringsvederlag for samtlige ${avslatteDager} dager iht. §33.8.`
        );
      } else {
        lines.push(
          'Byggherren erkjenner at avslaget på fristforlengelse var uberettiget. ' +
            'Entreprenøren har dermed rett til forseringsvederlag iht. §33.8.'
        );
      }
    } else {
      if (vurderingPerSak.length > 1) {
        lines.push(
          `Byggherren fastholder at avslagene på fristforlengelse i alle ${vurderingPerSak.length} saker var berettiget. ` +
            'Entreprenøren hadde ikke krav på fristforlengelse og har derfor ikke rett til forseringsvederlag etter §33.8.'
        );
      } else {
        lines.push(
          'Byggherren fastholder at avslaget på fristforlengelse var berettiget. ' +
            'Entreprenøren hadde ikke krav på fristforlengelse og har derfor ikke rett til forseringsvederlag etter §33.8.'
        );
      }
    }

    return lines.join(' ');
  }

  if (teHarForseringsrett) {
    return (
      'Byggherren erkjenner at avslaget på fristforlengelse var uberettiget. ' +
      'Entreprenøren har dermed rett til forseringsvederlag iht. §33.8.'
    );
  }

  return (
    'Byggherren fastholder at avslaget på fristforlengelse var berettiget. ' +
    'Entreprenøren hadde ikke krav på fristforlengelse og har derfor ikke rett til ' +
    'forseringsvederlag etter §33.8.'
  );
}

function generateForsering30ProsentSection(input: ForseringResponseInput): string {
  const {
    avslatteDager,
    dagmulktsats,
    maksForseringskostnad,
    estimertKostnad,
    trettiprosentOverholdt,
    trettiprosentBegrunnelse,
  } = input;
  const lines: string[] = [];

  lines.push(
    `Beregning av 30%-grensen (§33.8 første ledd): ${avslatteDager} avslåtte dager × ` +
      `${formatCurrency(dagmulktsats)} dagmulkt × 1,3 = ${formatCurrency(maksForseringskostnad)}.`
  );

  if (trettiprosentOverholdt) {
    lines.push(
      `Entreprenørens estimerte forseringskostnad på ${formatCurrency(estimertKostnad)} ` +
        `er innenfor grensen. Vilkåret i §33.8 er oppfylt.`
    );
  } else {
    const overskridelse = estimertKostnad - maksForseringskostnad;
    lines.push(
      `Entreprenørens estimerte forseringskostnad på ${formatCurrency(estimertKostnad)} ` +
        `overstiger grensen med ${formatCurrency(overskridelse)}. ` +
        `Entreprenøren hadde dermed ikke valgrett til forsering etter §33.8.`
    );
    if (trettiprosentBegrunnelse) {
      lines.push(trettiprosentBegrunnelse);
    }
  }

  return lines.join(' ');
}

function generateForseringBelopSection(input: ForseringResponseInput): string {
  const { hovedkravVurdering, hovedkravBelop, godkjentBelop } = input;
  const lines: string[] = [];

  switch (hovedkravVurdering) {
    case 'godkjent':
      lines.push(
        `Forseringskostnadene på ${formatCurrency(hovedkravBelop ?? 0)} godkjennes i sin helhet.`
      );
      break;
    case 'delvis': {
      const prosent =
        hovedkravBelop && hovedkravBelop > 0
          ? (((godkjentBelop ?? 0) / hovedkravBelop) * 100).toFixed(0)
          : 0;
      lines.push(
        `Forseringskostnadene godkjennes delvis med ${formatCurrency(godkjentBelop ?? 0)} ` +
          `av krevde ${formatCurrency(hovedkravBelop ?? 0)} (${prosent}%).`
      );
      break;
    }
    case 'avslatt':
      lines.push(
        `Kravet om dekning av forseringskostnader på ${formatCurrency(hovedkravBelop ?? 0)} avvises.`
      );
      break;
  }

  return lines.join(' ');
}

function generateForseringSaerskiltKravSection(
  kravType: 'rigg' | 'produktivitet',
  harKrav: boolean,
  belop: number | undefined,
  varsletITide: boolean | undefined,
  vurdering: BelopVurdering | undefined,
  godkjentBelop: number | undefined
): string {
  if (!harKrav || !belop) {
    return '';
  }

  const kravLabel = kravType === 'rigg' ? 'rigg- og driftskostnader' : 'produktivitetstap';
  const isPrekludert = varsletITide === false;
  const lines: string[] = [];

  if (isPrekludert) {
    lines.push(
      `Kravet om dekning av ${kravType === 'rigg' ? 'økte ' : ''}${kravLabel} på ${formatCurrency(belop)} ` +
        `avvises prinsipalt som prekludert iht. §34.1.3, da varselet ikke ble fremsatt «uten ugrunnet opphold».`
    );

    if (vurdering) {
      switch (vurdering) {
        case 'godkjent':
          lines.push(`Subsidiært aksepteres ${formatCurrency(belop)}.`);
          break;
        case 'delvis':
          lines.push(
            `Subsidiært aksepteres ${formatCurrency(godkjentBelop ?? 0)} av krevde ${formatCurrency(belop)}.`
          );
          break;
        case 'avslatt':
          lines.push('Subsidiært ville kravet uansett blitt avvist.');
          break;
      }
    }
  } else {
    switch (vurdering) {
      case 'godkjent':
        lines.push(`Kravet om ${kravLabel} på ${formatCurrency(belop)} godkjennes.`);
        break;
      case 'delvis':
        lines.push(
          `Kravet om ${kravLabel} godkjennes delvis med ${formatCurrency(godkjentBelop ?? 0)} av krevde ${formatCurrency(belop)}.`
        );
        break;
      case 'avslatt':
        lines.push(`Kravet om ${kravLabel} på ${formatCurrency(belop)} avvises.`);
        break;
    }
  }

  return lines.join(' ');
}

function generateForseringRiggSection(input: ForseringResponseInput): string {
  return generateForseringSaerskiltKravSection(
    'rigg',
    input.harRiggKrav,
    input.riggBelop,
    input.riggVarsletITide,
    input.riggVurdering,
    input.godkjentRiggDrift
  );
}

function generateForseringProduktivitetSection(input: ForseringResponseInput): string {
  return generateForseringSaerskiltKravSection(
    'produktivitet',
    input.harProduktivitetKrav,
    input.produktivitetBelop,
    input.produktivitetVarsletITide,
    input.produktivitetVurdering,
    input.godkjentProduktivitet
  );
}

function generateForseringKonklusjonSection(input: ForseringResponseInput): string {
  const lines: string[] = [];

  lines.push(
    `Samlet godkjent beløp utgjør ${formatCurrency(input.totalGodkjent)} ` +
      `av totalt krevde ${formatCurrency(input.totalKrevd)}.`
  );

  if (input.harPrekludertKrav && input.subsidiaerGodkjentBelop !== undefined) {
    const diff = input.subsidiaerGodkjentBelop - input.totalGodkjent;
    if (diff > 0) {
      lines.push(
        `Dersom de prekluderte særskilte kravene hadde vært varslet i tide, ville samlet godkjent beløp ` +
          `utgjort ${formatCurrency(input.subsidiaerGodkjentBelop)} (subsidiært standpunkt).`
      );
    }
  }

  return lines.join(' ');
}

// ============================================================================
// SUBSIDIARY GENERATORS
// ============================================================================

function generateForseringSaerskiltKravSectionSubsidiaer(
  kravType: 'rigg' | 'produktivitet',
  harKrav: boolean,
  belop: number | undefined,
  varsletITide: boolean | undefined,
  vurdering: BelopVurdering | undefined,
  godkjentBelop: number | undefined
): string {
  if (!harKrav || !belop) {
    return '';
  }

  const kravLabel = kravType === 'rigg' ? 'Rigg/driftskravet' : 'Produktivitetskravet';
  const isPrekludert = varsletITide === false;

  if (isPrekludert) {
    switch (vurdering) {
      case 'godkjent':
        return `${kravLabel} på ${formatCurrency(belop)} er prekludert, men ville ellers blitt godkjent.`;
      case 'delvis':
        return `${kravLabel} er prekludert, men ville ellers blitt delvis godkjent med ${formatCurrency(godkjentBelop ?? 0)}.`;
      case 'avslatt':
        return `${kravLabel} er prekludert og ville uansett blitt avvist.`;
      default:
        return '';
    }
  } else {
    switch (vurdering) {
      case 'godkjent':
        return `${kravLabel} på ${formatCurrency(belop)} ville blitt godkjent.`;
      case 'delvis':
        return `${kravLabel} ville blitt delvis godkjent med ${formatCurrency(godkjentBelop ?? 0)} av krevde ${formatCurrency(belop)}.`;
      case 'avslatt':
        return `${kravLabel} på ${formatCurrency(belop)} ville blitt avvist.`;
      default:
        return '';
    }
  }
}

function generateForseringRiggSectionSubsidiaer(input: ForseringResponseInput): string {
  return generateForseringSaerskiltKravSectionSubsidiaer(
    'rigg',
    input.harRiggKrav,
    input.riggBelop,
    input.riggVarsletITide,
    input.riggVurdering,
    input.godkjentRiggDrift
  );
}

function generateForseringProduktivitetSectionSubsidiaer(input: ForseringResponseInput): string {
  return generateForseringSaerskiltKravSectionSubsidiaer(
    'produktivitet',
    input.harProduktivitetKrav,
    input.produktivitetBelop,
    input.produktivitetVarsletITide,
    input.produktivitetVurdering,
    input.godkjentProduktivitet
  );
}

function generateForseringSubsidiaerSection(input: ForseringResponseInput): string {
  const { hovedkravVurdering, hovedkravBelop, godkjentBelop, totalKrevd, subsidiaerGodkjentBelop } =
    input;
  const lines: string[] = [];

  lines.push('Subsidiært, dersom entreprenøren hadde hatt forseringsrett:');

  switch (hovedkravVurdering) {
    case 'godkjent':
      lines.push(
        `Forseringskostnadene på ${formatCurrency(hovedkravBelop ?? 0)} ville blitt godkjent i sin helhet.`
      );
      break;
    case 'delvis': {
      const prosent =
        hovedkravBelop && hovedkravBelop > 0
          ? (((godkjentBelop ?? 0) / hovedkravBelop) * 100).toFixed(0)
          : 0;
      lines.push(
        `Forseringskostnadene ville blitt godkjent delvis med ${formatCurrency(godkjentBelop ?? 0)} ` +
          `av krevde ${formatCurrency(hovedkravBelop ?? 0)} (${prosent}%).`
      );
      break;
    }
    case 'avslatt':
      lines.push(
        `Forseringskostnadene på ${formatCurrency(hovedkravBelop ?? 0)} ville uansett blitt avvist.`
      );
      break;
  }

  const riggSection = generateForseringRiggSectionSubsidiaer(input);
  if (riggSection) {
    lines.push(riggSection);
  }

  const produktivitetSection = generateForseringProduktivitetSectionSubsidiaer(input);
  if (produktivitetSection) {
    lines.push(produktivitetSection);
  }

  if (subsidiaerGodkjentBelop !== undefined && subsidiaerGodkjentBelop > 0) {
    lines.push(
      `Samlet subsidiært godkjent beløp ville utgjort ${formatCurrency(subsidiaerGodkjentBelop)} ` +
        `av totalt krevde ${formatCurrency(totalKrevd)}.`
    );
  } else if (subsidiaerGodkjentBelop === 0) {
    lines.push('Kravet ville uansett blitt avvist i sin helhet.');
  }

  return lines.join(' ');
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export function generateForseringResponseBegrunnelse(input: ForseringResponseInput): string {
  const sections: string[] = [];

  const grunnlagSection = generateForseringGrunnlagSection(input);
  sections.push(grunnlagSection);

  if (!input.teHarForseringsrett) {
    const subsidiaerSection = generateForseringSubsidiaerSection(input);
    if (subsidiaerSection) {
      sections.push(subsidiaerSection);
    }
    return sections.join('\n\n');
  }

  const trettiprosentSection = generateForsering30ProsentSection(input);
  sections.push(trettiprosentSection);

  if (!input.trettiprosentOverholdt) {
    return sections.join('\n\n');
  }

  sections.push('Hva gjelder beløpet:');

  const belopSection = generateForseringBelopSection(input);
  if (belopSection) {
    sections.push(belopSection);
  }

  const riggSection = generateForseringRiggSection(input);
  if (riggSection) {
    sections.push(riggSection);
  }

  const produktivitetSection = generateForseringProduktivitetSection(input);
  if (produktivitetSection) {
    sections.push(produktivitetSection);
  }

  const konklusjonSection = generateForseringKonklusjonSection(input);
  sections.push(konklusjonSection);

  return sections.join('\n\n');
}
