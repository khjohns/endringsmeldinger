import { letterText } from '$lib/approval/letter';
import type { TimelineEvent, SakState, SporType } from '$lib/types/timeline';
import type { BrevInnhold, BrevSeksjon } from './letterTypes';
import { formatDateNorwegian } from '$lib/utils/dateFormatters';

function makeSeksjon(tittel: string, tekst: string): BrevSeksjon {
  return { tittel, originalTekst: tekst, redigertTekst: tekst };
}

function getSporLabel(spor: SporType): string {
  const labels: Record<string, string> = {
    grunnlag: 'ansvarsgrunnlag',
    vederlag: 'vederlagsjustering',
    frist: 'fristforlengelse',
  };
  return labels[spor] ?? spor;
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

export function buildLetterContent(event: TimelineEvent, sak: SakState): BrevInnhold {
  const stored = (event.data as unknown as Record<string, unknown> | undefined)?.brev as
    | BrevInnhold
    | undefined;
  if (stored?.seksjoner && stored.referanser) return JSON.parse(JSON.stringify(stored));
  const sporType: SporType = event.spor ?? 'grunnlag';
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

  return {
    tittel: `${isTE ? 'Krav om' : 'Svar på krav om'} ${sporLabel} \u2014 ${sakstittel}`,
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
