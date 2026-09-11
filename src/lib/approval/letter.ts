import type { LetterDocument, ReviewItem } from './types';
import { trackNames } from './types';
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
export function decisionSummary(item: ReviewItem): string {
  const d = item.data;
  const groundRejected =
    item.track !== 'grunnlag' &&
    (item.basis?.resultat === 'avslatt' ||
      (item.basis?.hovedkategori === 'ENDRING' && item.basis.varsletITide === false));
  const result = groundRejected
    ? 'Prinsipalt avslått'
    : ((
        {
          godkjent: 'Godkjent',
          delvis_godkjent: 'Delvis godkjent',
          avslatt: 'Avslått',
          frafalt: 'Innsigelsen er frafalt',
          foresporsel: 'Ber om spesifisert krav',
        } as Record<string, string>
      )[String(d.resultat ?? d.beregnings_resultat)] ??
      String(d.resultat ?? d.beregnings_resultat ?? ''));
  return [
    result,
    item.track === 'vederlag' &&
      money(groundRejected ? 0 : (d.total_godkjent_belop ?? d.godkjent_belop)),
    item.track === 'frist' &&
      typeof d.godkjent_dager === 'number' &&
      `${groundRejected ? 0 : d.godkjent_dager} dager`,
    groundRejected &&
      item.track === 'vederlag' &&
      d.subsidiaer_godkjent_belop === undefined &&
      `Subsidiært: ${money(d.total_godkjent_belop ?? d.godkjent_belop)}`,
    groundRejected &&
      item.track === 'frist' &&
      d.subsidiaer_godkjent_dager === undefined &&
      `Subsidiært: ${d.godkjent_dager} dager`,
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
              `${trackNames[i.track]}\n${decisionSummary(i)}\n\n${letterText(i.data.begrunnelse ?? i.data.beskrivelse)}`
          )
          .join('\n\n')
      ),
      avslutning: section('Avslutning', letter.closing),
    },
  };
}
