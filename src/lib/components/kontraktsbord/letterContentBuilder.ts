import { letterText } from '$lib/approval/letter';
import type { TimelineEvent, SakState, SporType } from '$lib/types/timeline';
import type { BrevInnhold, BrevSeksjon } from './letterTypes';
import { formatDateNorwegian } from '$lib/utils/dateFormatters';

function makeSeksjon(tittel: string, tekst: string): BrevSeksjon {
  return { tittel, originalTekst: tekst, redigertTekst: tekst };
}

function getSporLabel(spor: SporType): string {
  const labels: Record<string, string> = {
    grunnlag: 'grunnlaget',
    vederlag: 'vederlagsjustering',
    frist: 'fristforlengelse',
  };
  return labels[spor] ?? spor;
}

function tittelForSpor(spor: SporType, isTE: boolean): string {
  if (spor === 'grunnlag') return isTE ? 'Grunnlaget for kravet' : 'Svar på grunnlaget';
  return `${isTE ? 'Krav om' : 'Svar på krav om'} ${getSporLabel(spor)}`;
}

function extractBegrunnelse(event: TimelineEvent): string {
  if (!event.data || typeof event.data !== 'object') return event.summary ?? '';
  const d = event.data as unknown as Record<string, unknown>;
  return (
    (d.begrunnelse as string) ??
    (d.beskrivelse as string) ??
    (d.endrings_begrunnelse as string) ??
    event.summary ??
    ''
  );
}

/**
 * Brevet for en hendelse: det lagrede brevet, eller et brev bygget for sporet. En
 * hendelse uten spor og uten lagret brev, som forsering eller endringsordre, får
 * ikke noe brev (#365).
 */
export function buildLetterContent(
  event: TimelineEvent & { spor: SporType },
  sak: SakState
): BrevInnhold;
export function buildLetterContent(event: TimelineEvent, sak: SakState): BrevInnhold | null;
export function buildLetterContent(event: TimelineEvent, sak: SakState): BrevInnhold | null {
  const stored = (event.data as unknown as Record<string, unknown> | undefined)?.brev as
    | BrevInnhold
    | undefined;
  if (stored?.seksjoner && stored.referanser) return JSON.parse(JSON.stringify(stored));
  if (!event.spor) return null;
  const sporType = event.spor;
  const dato = formatDateNorwegian(event.time) || formatDateNorwegian(new Date().toISOString());
  const sporLabel = getSporLabel(sporType);
  const sakstittel = sak.grunnlag.tittel ?? sak.sak_id;

  const isTE = event.actorrole === 'TE';
  const avsenderNavn = isTE
    ? (sak.entreprenor ?? 'Totalentreprenor')
    : (sak.byggherre ?? 'Byggherre');
  const mottakerNavn = isTE
    ? (sak.byggherre ?? 'Byggherre')
    : (sak.entreprenor ?? 'Totalentreprenor');

  const innledningTekst =
    `Vi viser til ${sporLabel} i sak ${sak.sak_id} \u2014 \u00AB${sakstittel}\u00BB.\n\n` +
    `Brevet gjelder ${sporLabel}.`;

  const varsler = event.data && 'varsler' in event.data ? event.data.varsler : undefined;
  const varselTekster = Object.values(varsler ?? {}).filter(
    (text): text is string => typeof text === 'string'
  );
  const begrunnelse = letterText(extractBegrunnelse(event));
  const d = event.data as unknown as Record<string, unknown>;
  const facts =
    event.actorrole === 'TE'
      ? [
          typeof d?.belop_direkte === 'number'
            ? `Krav: ${d.belop_direkte.toLocaleString('nb-NO')} kr`
            : '',
          typeof d?.kostnads_overslag === 'number'
            ? `Kostnadsoverslag: ${d.kostnads_overslag.toLocaleString('nb-NO')} kr`
            : '',
          typeof d?.antall_dager === 'number' ? `Krav: ${d.antall_dager} dager` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '';
  const begrunnelseTekst = [
    facts,
    begrunnelse,
    ...varselTekster.filter((text) => !begrunnelse.includes(text)),
  ].join('\n\n');

  const avslutningTekst = `Med vennlig hilsen\n${avsenderNavn}\n\n${dato}`;

  const tittelForType = event.type.endsWith('frist_foresporsel_sendt')
    ? 'Forespørsel om spesifisert krav om fristforlengelse'
    : event.type.endsWith('frist_innsigelse_sendt')
      ? 'Innsigelse mot sen varsling av fristforlengelse'
      : tittelForSpor(sporType, isTE);

  return {
    tittel: `${tittelForType} \u2014 ${sakstittel}`,
    mottaker: { navn: mottakerNavn, rolle: isTE ? 'BH' : 'TE' },
    avsender: { navn: avsenderNavn, rolle: isTE ? 'TE' : 'BH' },
    referanser: {
      sakId: sak.sak_id,
      sakstittel,
      eventId: event.id,
      sporType,
      dato,
    },
    seksjoner: {
      innledning: makeSeksjon('Innledning', innledningTekst),
      begrunnelse: makeSeksjon('Begrunnelse', begrunnelseTekst),
      avslutning: makeSeksjon('Avslutning', avslutningTekst),
    },
  };
}
