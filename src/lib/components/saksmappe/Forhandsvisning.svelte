<script lang="ts">
  import type { TimelineEvent, EventType } from '$lib/types/timeline';
  import { extractEventType } from '$lib/types/timeline';
  import { getEventBestemmelse } from '$lib/constants/eventBestemmelser';
  import { getKontraktsforhold, getHjemmelObj } from '$lib/constants/categories';
  import { getKontraktsregel } from '$lib/constants/kontraktsregler';
  import { getParagrafTittel } from '$lib/constants/paragrafTitler';
  import { getPartsNavn } from '$lib/utils/partsNavn';
  import { getEventIcon } from '$lib/utils/eventIcons';

  interface BestemmelseItem {
    paragraf: string;
    tekst: string;
    konsekvens?: string;
  }

  interface Props {
    event: TimelineEvent | null;
    prosjektId: string;
    sakId: string;
    onClose?: () => void;
    teNavn?: string;
    bhNavn?: string;
  }

  let { event, prosjektId, sakId, onClose, teNavn, bhNavn }: Props = $props();

  // --- Data extraction ---

  function getDescription(ev: TimelineEvent): string | null {
    const d = ev.data as Record<string, unknown> | undefined;
    if (!d) return ev.summary ?? null;

    // Prefer tekst (internt notat), then endrings_begrunnelse, then beskrivelse, then begrunnelse
    if (typeof d.tekst === 'string') return d.tekst;
    if (typeof d.endrings_begrunnelse === 'string') return d.endrings_begrunnelse;
    if (typeof d.beskrivelse === 'string') return d.beskrivelse;
    if (typeof d.begrunnelse === 'string') return d.begrunnelse;
    return ev.summary ?? null;
  }

  function getVedleggIds(ev: TimelineEvent): string[] {
    const d = ev.data as Record<string, unknown> | undefined;
    if (!d) return [];
    if (Array.isArray(d.vedlegg_ids)) return d.vedlegg_ids as string[];
    return [];
  }

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  function getSectionLabel(et: EventType | null): string {
    if (!et) return 'Detaljer';
    if (et.startsWith('respons_')) return 'Vurdering';
    if (et.includes('oppdatert') || et.includes('spesifisert')) return 'Endring';
    if (et.includes('opprettet') || et.includes('sendt')) return 'Beskrivelse';
    return 'Detaljer';
  }

  // --- Helpers ---

  function paragrafLabel(ref: string): string {
    const tittel = getParagrafTittel(ref);
    return tittel ? `§${ref} ${tittel}` : `§${ref}`;
  }

  // --- Kontraktsforhold-tekster (parafrasert, ikke ordrett fra NS 8407) ---

  function forholdParagraf(kode: string): string {
    switch (kode) {
      case 'ENDRING':
        return 'Punkt 31–32 Endringer';
      case 'SVIKT':
        return 'Punkt 22–24 Byggherrens ytelser';
      case 'ANDRE':
        return 'Byggherrens risikoområde';
      case 'FORCE_MAJEURE':
        return '§33.3 Force majeure';
      default:
        return kode;
    }
  }

  function forholdTekst(kode: string): string {
    switch (kode) {
      case 'ENDRING':
        return 'Endring av det opprinnelig avtalte — enten ved formell endringsordre (§31.3) eller gjennom pålegg uten endringsordre (§32.1). Totalentreprenøren har utførelsesplikt, men kan kreve justering av vederlag og frister.';
      case 'SVIKT':
        return 'Byggherren bærer risikoen for sine ytelser etter punkt 22 (medvirkning), 23 (grunnforhold) og 24 (prosjektering). Forsinkelse eller svikt i disse gir totalentreprenøren rett til justering.';
      case 'ANDRE':
        return 'Andre forhold byggherren har risikoen for, som ikke faller inn under endringer eller svikt i byggherrens ytelser. Gir tilsvarende rett til fristforlengelse og vederlagsjustering.';
      case 'FORCE_MAJEURE':
        return 'Ekstraordinære omstendigheter utenfor partenes kontroll — værforhold, offentlige påbud, streik mv. Gir kun rett til fristforlengelse, ikke vederlagsjustering.';
      default:
        return '';
    }
  }

  function fristTekst(kode: string): string {
    switch (kode) {
      case 'ENDRING':
        return 'Totalentreprenøren har krav på fristforlengelse når fremdriften hindres som følge av endringer. Må varsles uten ugrunnet opphold (§33.4). Kravet tapes hvis det ikke varsles i tide.';
      case 'SVIKT':
        return 'Totalentreprenøren har krav på fristforlengelse når fremdriften hindres av forsinkelse eller svikt ved byggherrens ytelser. Må varsles uten ugrunnet opphold (§33.4). Kravet tapes hvis det ikke varsles i tide.';
      case 'ANDRE':
        return 'Totalentreprenøren har krav på fristforlengelse når fremdriften hindres av forhold byggherren har risikoen for. Må varsles uten ugrunnet opphold (§33.4). Kravet tapes hvis det ikke varsles i tide.';
      case 'FORCE_MAJEURE':
        return 'Begge parter har krav på fristforlengelse ved force majeure. Må varsles uten ugrunnet opphold (§33.4). Gir ikke rett til vederlagsjustering.';
      default:
        return '';
    }
  }

  function vederlagTekst(kode: string, metode: string): string {
    const metodeKort = metode.replace(/\s*\(.*?\)/g, '');
    switch (kode) {
      case 'ENDRING':
        return `Totalentreprenøren har krav på vederlagsjustering ved endringer. Må varsles uten ugrunnet opphold. Standard beregningsmetode: ${metodeKort.toLowerCase()}.`;
      case 'SVIKT':
        return `Totalentreprenøren har krav på vederlagsjustering ved svikt i byggherrens ytelser. Må varsles uten ugrunnet opphold — kravet tapes hvis det ikke varsles i tide. Standard beregningsmetode: ${metodeKort.toLowerCase()}.`;
      case 'ANDRE':
        return `Totalentreprenøren har krav på vederlagsjustering for andre forhold byggherren har risikoen for. Må varsles uten ugrunnet opphold. Standard beregningsmetode: ${metodeKort.toLowerCase()}.`;
      default:
        return '';
    }
  }

  // --- Vederlag-event bestemmelser ---

  function vederlagMetodeBestemmelser(metode: string | undefined): BestemmelseItem[] {
    switch (metode) {
      case 'REGNINGSARBEID':
        return [
          {
            paragraf: paragrafLabel('34.4'),
            tekst:
              'Arbeidet avregnes etter medgåtte kostnader med påslag. Totalentreprenøren skal føre løpende oversikt over timer og materialer, og sende spesifiserte oppgaver til byggherren.',
            konsekvens: 'Byggherren skal gis mulighet til å kontrollere omfanget fortløpende.',
          },
        ];
      case 'ENHETSPRISER':
        return [
          {
            paragraf: paragrafLabel('34.3'),
            tekst:
              'Vederlaget beregnes ut fra avtalte enhetspriser. Dersom forutsetningene for enhetsprisene endres vesentlig, kan begge parter kreve justering.',
          },
        ];
      case 'FASTPRIS_TILBUD':
        return [
          {
            paragraf: paragrafLabel('34.2'),
            tekst:
              'Vederlaget er fastsatt som et avtalt beløp basert på totalentreprenørens tilbud. Partene kan kreve vederlaget justert dersom forutsetningene endres vesentlig.',
          },
        ];
      default:
        return [];
    }
  }

  // --- Frist-event bestemmelser ---

  const BESTEMMELSE_33_6_1: BestemmelseItem = {
    paragraf: paragrafLabel('33.6.1'),
    tekst:
      'Totalentreprenøren skal fremsette sitt krav med angivelse av antall dager fristforlengelse, uten ugrunnet opphold etter at grunnlaget for beregningen foreligger.',
    konsekvens:
      'Kravet begrenses til det den andre parten måtte forstå at forholdet ville medføre.',
  };

  function fristEventBestemmelser(et: EventType, d: Record<string, unknown>): BestemmelseItem[] {
    if (et === 'frist_krav_sendt') {
      const items: BestemmelseItem[] = [
        {
          paragraf: paragrafLabel('33.4'),
          tekst:
            'Totalentreprenøren skal varsle uten ugrunnet opphold dersom det oppstår forhold som gir grunnlag for fristforlengelse. Varselet skal angi hvilke frister som berøres.',
          konsekvens: 'Kravet på fristforlengelse tapes hvis det ikke varsles i tide.',
        },
      ];
      if (d.varsel_type === 'spesifisert' || d.antall_dager) {
        items.push(BESTEMMELSE_33_6_1);
      }
      return items;
    } else if (et === 'frist_krav_oppdatert') {
      return [
        {
          paragraf: paragrafLabel('33.6'),
          tekst:
            'Totalentreprenøren kan revidere sitt fremsatte krav med oppdatert dokumentasjon og begrunnelse. Kravet skal angis og begrunnes med angivelse av antall dager.',
        },
      ];
    } else if (et === 'frist_krav_spesifisert') {
      return [BESTEMMELSE_33_6_1];
    }
    return [];
  }

  // --- Respons-event bestemmelser ---

  function responsEventBestemmelser(et: EventType, d: Record<string, unknown>): BestemmelseItem[] {
    if (et === 'respons_frist') {
      const items: BestemmelseItem[] = [
        {
          paragraf: paragrafLabel('33.7'),
          tekst:
            'Byggherren skal ta stilling til kravet uten ugrunnet opphold etter mottak av begrunnet krav med angivelse av antall dager.',
          konsekvens: 'Innsigelser mot kravet tapes hvis det ikke svares i tide.',
        },
      ];
      if (d.beregnings_resultat === 'avslatt') {
        items.push({
          paragraf: paragrafLabel('33.8'),
          tekst:
            'Dersom byggherren avslår et berettiget fristkrav, kan totalentreprenøren velge å anse avslaget som et pålegg om forsering. TE skal i så fall varsle om antatt forseringskostnad før arbeidet igangsettes.',
        });
      }
      return items;
    } else if (et === 'respons_vederlag') {
      return [
        {
          paragraf: paragrafLabel('34.2'),
          tekst:
            'Byggherren skal ta stilling til kravet om vederlagsjustering innen rimelig tid. Standpunktet skal være begrunnet.',
          konsekvens: 'Innsigelser mot kravet tapes hvis det ikke svares i tide.',
        },
      ];
    }
    return [];
  }

  // --- Derived ---

  const eventType = $derived(event ? extractEventType(event.type) : null);
  const icon = $derived(getEventIcon(eventType));
  const handling = $derived.by(() => {
    const summary = event?.summary ?? '';
    if (summary.startsWith('TE '))
      return getPartsNavn('TE', teNavn, bhNavn) + ' ' + summary.slice(3);
    if (summary.startsWith('BH '))
      return getPartsNavn('BH', teNavn, bhNavn) + ' ' + summary.slice(3);
    return summary;
  });
  const meta = $derived(
    event
      ? `${formatDate(event.time)} \u00B7 ${event.actorrole ? getPartsNavn(event.actorrole as 'TE' | 'BH', teNavn, bhNavn) : ''}`
      : ''
  );
  const description = $derived(event ? getDescription(event) : null);
  const vedleggIds = $derived(event ? getVedleggIds(event) : []);
  const bestemmelser = $derived.by<BestemmelseItem[]>(() => {
    const items: BestemmelseItem[] = [];
    const d = event?.data as Record<string, unknown> | undefined;

    // For grunnlag-events: derive from hovedkategori/underkategori
    if (d?.hovedkategori) {
      const forhold = getKontraktsforhold(d.hovedkategori as string);

      // 1) Kontraktshjemmel (underkategori) — den konkrete bestemmelsen som utløser kravet
      if (d.underkategori) {
        const hjemmel = getHjemmelObj(d.underkategori as string);
        if (hjemmel) {
          const regel = getKontraktsregel(hjemmel.hjemmel_basis);
          items.push({
            paragraf: paragrafLabel(hjemmel.hjemmel_basis),
            tekst: regel?.regel ?? hjemmel.beskrivelse,
            konsekvens: regel?.konsekvens,
          });
        }
      }

      if (forhold) {
        // 2) Kontraktsforhold (hovedkategori) — hvorfor dette er byggherrens risiko
        items.push({
          paragraf: forholdParagraf(forhold.kode),
          tekst: forholdTekst(forhold.kode),
        });

        // 3) Fristkrav — retten til fristforlengelse
        items.push({
          paragraf: paragrafLabel(forhold.hjemmel_frist),
          tekst: fristTekst(forhold.kode),
        });

        // 4) Vederlagskrav — retten til vederlagsjustering (ikke for force majeure)
        if (forhold.hjemmel_vederlag) {
          items.push({
            paragraf: paragrafLabel(forhold.hjemmel_vederlag),
            tekst: vederlagTekst(forhold.kode, forhold.standard_vederlagsmetode),
          });
        }
      }
    }

    // For vederlag-events: derive from metode + saerskilt_krav
    if ((eventType === 'vederlag_krav_sendt' || eventType === 'vederlag_krav_oppdatert') && d) {
      // 1) Retten til vederlagsjustering
      items.push({
        paragraf: paragrafLabel('34.1'),
        tekst:
          'Totalentreprenøren har krav på vederlagsjustering dersom det foreligger en endring eller annet forhold byggherren bærer risikoen for. Kravet skal varsles uten ugrunnet opphold.',
        konsekvens: 'Kravet tapes hvis det ikke varsles i tide.',
      });

      // 2) Beregningsmetode
      items.push(...vederlagMetodeBestemmelser(d.metode as string | undefined));

      // 3) Særskilt krav (rigg, drift, produktivitet)
      if (d.saerskilt_krav) {
        items.push({
          paragraf: paragrafLabel('34.1.3'),
          tekst:
            'Totalentreprenøren skal varsle særskilt dersom det vil bli krevd dekning for rigg, drift eller nedsatt produktivitet. Varselet skal gis uten ugrunnet opphold etter at det ble klart at slike utgifter ville påløpe.',
          konsekvens: 'Retten til å kreve disse postene tapes hvis det ikke varsles særskilt.',
        });
      }
      // For frist-events: derive from event type + varsel_type
    } else if (
      (eventType === 'frist_krav_sendt' ||
        eventType === 'frist_krav_oppdatert' ||
        eventType === 'frist_krav_spesifisert') &&
      d
    ) {
      items.push(...fristEventBestemmelser(eventType, d));
      // For respons-events: derive from event type + resultat
    } else if ((eventType === 'respons_frist' || eventType === 'respons_vederlag') && d) {
      items.push(...responsEventBestemmelser(eventType, d));
    }

    // Fallback: static eventType lookup with titles
    if (items.length === 0) {
      const fallback = getEventBestemmelse(eventType);
      if (fallback) {
        const pNum = fallback.paragraf.replace(/^NS 8407 §/, '');
        const tittel = getParagrafTittel(pNum);
        items.push({
          paragraf: tittel ? `${fallback.paragraf} ${tittel}` : fallback.paragraf,
          tekst: fallback.tekst,
        });
      }
    }

    return items;
  });
  const sectionLabel = $derived(getSectionLabel(eventType));
  const spordetaljHref = $derived(event?.spor ? `/${prosjektId}/${sakId}/${event.spor}` : null);
</script>

<aside class="forhandsvisning">
  {#if !event}
    <div class="fv-tom">Hover over en hendelse<br />for å se detaljer</div>
  {:else}
    <div class="fv-innhold">
      <button class="fv-close" onclick={() => onClose?.()} aria-label="Lukk">&times;</button>
      <div class="fv-header">
        <div class="fv-tittel-rad">
          <span class="fv-ikon {icon.cssClass}" aria-hidden="true">{icon.symbol}</span>
          <span class="fv-handling">{handling}</span>
        </div>
        <div class="fv-meta-rad">
          <span class="fv-meta">{meta}</span>
        </div>
      </div>

      {#if description}
        <div class="fv-separator"></div>
        <div class="fv-seksjon-label">{sectionLabel}</div>
        <div class="fv-tekst">{@html description}</div>
      {/if}

      {#if vedleggIds.length > 0}
        <div class="fv-separator"></div>
        <div class="fv-seksjon-label">Vedlegg</div>
        {#each vedleggIds as vedlegg (vedlegg)}
          <div class="fv-vedlegg">
            <span class="fv-vedlegg-ikon" aria-hidden="true">📎</span>
            {vedlegg}
          </div>
        {/each}
      {/if}

      {#if bestemmelser.length > 0}
        <div class="fv-separator"></div>
        <div class="fv-seksjon-label">
          {bestemmelser.length === 1 ? 'Bestemmelse' : 'Bestemmelser'}
        </div>
        {#each bestemmelser as b, i (i)}
          <div class="fv-bestemmelse" class:fv-bestemmelse-gap={i > 0}>
            <div class="fv-paragraf">{b.paragraf}</div>
            <div class="fv-bestemmelse-tekst">{b.tekst}</div>
            {#if b.konsekvens}
              <div class="fv-konsekvens">{b.konsekvens}</div>
            {/if}
          </div>
        {/each}
      {/if}

      {#if spordetaljHref}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a class="fv-spordetalj-lenke" href={spordetaljHref}> Åpne i spordetalj → </a>
      {/if}
    </div>
  {/if}
</aside>

<style>
  .forhandsvisning {
    border-left: 1px solid var(--color-wire-strong);
    padding: 24px;
    position: relative;
    height: 100%;
    overflow-y: auto;
    animation: panelIn 200ms ease-out;
  }

  @keyframes panelIn {
    from {
      opacity: 0;
      transform: translateX(12px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .fv-tom {
    font-size: 11px;
    color: var(--color-ink-muted);
    padding-top: 32px;
    text-align: center;
    line-height: 1.5;
  }

  .fv-close {
    position: absolute;
    top: 24px;
    right: 24px;
    background: none;
    border: none;
    color: var(--color-ink-ghost);
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    line-height: 1;
  }

  .fv-close:hover {
    color: var(--color-ink);
  }

  .fv-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 16px;
    padding-right: 24px;
  }

  .fv-tittel-rad {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .fv-meta-rad {
    padding-left: 24px;
  }

  .fv-ikon {
    font-size: 14px;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
    color: var(--color-ink-muted);
  }

  .fv-ikon.revisjon {
    color: var(--color-vekt-dim);
  }

  .fv-ikon.sendt {
    color: var(--color-ink-muted);
  }

  .fv-ikon.varslet {
    color: var(--color-ink-muted);
  }

  .fv-ikon.respons {
    color: var(--color-score-high);
  }

  .fv-ikon.godkjent {
    color: var(--color-score-high);
  }

  .fv-ikon.avslatt {
    color: var(--color-score-low);
  }

  .fv-handling {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
  }

  .fv-meta {
    font-family: var(--font-data);
    font-size: 11px;
    color: var(--color-ink-muted);
    font-variant-numeric: tabular-nums;
  }

  .fv-separator {
    height: 1px;
    background: var(--color-wire);
    margin: 16px 0;
  }

  .fv-seksjon-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin-bottom: 8px;
  }

  .fv-tekst {
    font-size: 12px;
    color: var(--color-ink-secondary);
    line-height: 1.5;
  }

  .fv-vedlegg {
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    font-size: 11px;
    color: var(--color-ink-secondary);
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: background 100ms ease-out;
  }

  .fv-vedlegg:hover {
    background: var(--color-felt-hover);
  }

  .fv-vedlegg + .fv-vedlegg {
    margin-top: 4px;
  }

  .fv-vedlegg-ikon {
    color: var(--color-ink-muted);
    font-size: 12px;
  }

  .fv-bestemmelse {
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-left: 2px solid var(--color-ink-ghost);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
  }

  .fv-paragraf {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-ink-muted);
    margin-bottom: 4px;
  }

  .fv-bestemmelse-gap {
    margin-top: 8px;
  }

  .fv-bestemmelse-tekst {
    font-size: 11px;
    color: var(--color-ink-secondary);
    line-height: 1.4;
  }

  .fv-konsekvens {
    font-size: 11px;
    color: var(--color-ink-muted);
    line-height: 1.4;
    margin-top: 4px;
    font-style: italic;
  }

  .fv-spordetalj-lenke {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
    cursor: pointer;
    text-decoration: none;
    padding-top: 12px;
    margin-top: 16px;
    border-top: 1px solid var(--color-wire);
    transition: color 100ms ease-out;
  }

  .fv-spordetalj-lenke:hover {
    color: var(--color-vekt);
  }

  @media (max-width: 1023px) {
    .forhandsvisning {
      padding: 16px;
      border-left: none;
    }

    .fv-close {
      top: 16px;
      right: 16px;
    }
  }
</style>
