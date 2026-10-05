import type { LetterDocument, ReviewItem } from './types';
import { trackNames } from './types';
import { erGrunnlagetSubsidiaert } from '$lib/domain/grunnlagDomain';
import type { BrevInnhold } from '$lib/components/kontraktsbord/letterTypes';

/** Plain text is shared by the on-screen document and PDF; no executable HTML. */
export function letterText(value: unknown): string {
  const input = typeof value === 'string' ? value : '';
  const text = input
    .replace(/\{\{\w+:[^:}]+:([^}]+)\}\}/g, '$1')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  if (typeof document !== 'undefined') {
    const el = document.createElement('textarea');
    el.innerHTML = text.replace(/</g, '&lt;');
    return el.value.trim();
  }
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}
const money = (value: unknown) =>
  typeof value === 'number' ? `${value.toLocaleString('nb-NO')} kr` : undefined;
const resultater: Record<string, string> = {
  godkjent: 'Godkjent',
  delvis_godkjent: 'Delvis godkjent',
  avslatt: 'Avslått',
  frafalt: 'Innsigelsen er frafalt',
  foresporsel: 'Ber om spesifisert krav',
  hold_tilbake: 'Betaling holdes tilbake (§ 30.2)',
};
const resultatTekst = (value: unknown) =>
  resultater[String(value)] ?? (value == null ? '' : String(value));
/**
 * Hele svaret er subsidiært. Et subsidiært standpunkt i svaret selv, for eksempel ved
 * preklusjon etter § 33.4, står etter det som atter subsidiært.
 */
function subsidiaertVedAvslattGrunnlag(item: ReviewItem): string[] {
  const d = item.data;
  const vederlag = item.track === 'vederlag';
  const standpunkt = (prefiks: string, result: unknown, value: unknown) => {
    const text = `${prefiks} ${resultatTekst(result).toLowerCase()}`.trimEnd();
    if (typeof value !== 'number') return text;
    return `${text}: ${vederlag ? money(value) : `${value} dager`}`;
  };
  const parts = [
    standpunkt(
      'Subsidiært',
      d.beregnings_resultat,
      vederlag ? (d.total_godkjent_belop ?? d.godkjent_belop) : d.godkjent_dager
    ),
  ];
  const subsidiaer = vederlag ? d.subsidiaer_godkjent_belop : d.subsidiaer_godkjent_dager;
  if (subsidiaer != null)
    parts.push(standpunkt('Atter subsidiært', d.subsidiaer_resultat, subsidiaer));
  return parts;
}
export function decisionSummary(item: ReviewItem): string {
  const d = item.data;
  if (item.track !== 'grunnlag' && item.basis && erGrunnlagetSubsidiaert(item.basis)) {
    return ['Prinsipalt avslått (ansvarsgrunnlaget)', ...subsidiaertVedAvslattGrunnlag(item)].join(
      ' · '
    );
  }
  return [
    resultatTekst(d.resultat ?? d.beregnings_resultat),
    item.track === 'vederlag' && money(d.total_godkjent_belop ?? d.godkjent_belop),
    item.track === 'frist' && typeof d.godkjent_dager === 'number' && `${d.godkjent_dager} dager`,
    typeof d.subsidiaer_godkjent_belop === 'number' &&
      `Subsidiært: ${money(d.subsidiaer_godkjent_belop)}`,
    typeof d.subsidiaer_godkjent_dager === 'number' &&
      `Subsidiært: ${d.subsidiaer_godkjent_dager} dager`,
  ]
    .filter(Boolean)
    .join(' · ');
}
export function documentToBrev(letter: LetterDocument, id: string): BrevInnhold {
  const section = (tittel: string, text: string) => ({
    tittel,
    originalTekst: text,
    redigertTekst: text,
  });
  return {
    tittel: letter.title,
    mottaker: { navn: letter.recipient, rolle: 'TE' },
    avsender: { navn: letter.sender, rolle: 'BH' },
    referanser: {
      sakId: letter.caseId,
      sakstittel: letter.caseTitle,
      eventId: id,
      sporType: letter.items[0]?.track ?? 'grunnlag',
      dato: letter.date,
    },
    seksjoner: {
      innledning: section('Innledning', letter.introduction),
      begrunnelse: section(
        'Vurderinger',
        letter.items
          .map(
            (i) =>
              `${trackNames[i.track]}\n${decisionSummary(i)}\n\n${letterText(i.data.begrunnelse ?? i.data.beskrivelse)}` +
              (i.attachments?.length
                ? `\n\nVedlegg\n${i.attachments.map((v) => v.navn).join('\n')}`
                : '')
          )
          .join('\n\n')
      ),
      avslutning: section('Avslutning', letter.closing),
    },
  };
}
