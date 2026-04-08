import type { TimelineEvent, SakState, SporType } from '$lib/types/timeline';
import type { BrevInnhold, BrevSeksjon } from './letterTypes';
import { getEventTypeLabel } from '$lib/constants/eventTypeLabels';
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
  const sporType: SporType = event.spor ?? 'grunnlag';
  const dato = formatDateNorwegian(event.time) || formatDateNorwegian(new Date().toISOString());
  const eventLabel = getEventTypeLabel(event.type?.replace('no.oslo.koe.', '') ?? '');
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
    `Denne hendelsen gjelder: ${eventLabel} (${dato}).`;

  const begrunnelseTekst = extractBegrunnelse(event);

  const avslutningTekst = `Med vennlig hilsen\n${avsenderNavn}\n\n${dato}`;

  return {
    tittel: `Vedr: ${eventLabel} \u2014 ${sakstittel}`,
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
