import { z } from 'zod';
import { kvalifiserForesporsel, rettidighetEtterPunkt5 } from './grunnmodell.ts';
import type { Vurdering } from './grunnmodell.ts';

const vurderinger = z.object({ TE: z.boolean().nullable(), BH: z.boolean().nullable() }).strict();
const felles = { id: z.string().min(1), sak: z.string().min(1) };
export const handlingsskjema = z.discriminatedUnion('type', [
  z
    .object({
      ...felles,
      type: z.literal('foresporsel'),
      vilkar: z
        .object({
          ingen_spesifisering_ved_foresporsel: z.boolean().nullable(),
          brevkrav_oppfylt: z.boolean().nullable(),
          kravstap_opplyst: z.boolean().nullable(),
          alternativ_begrunnelse_etterspurt: z.boolean().nullable(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...felles,
      type: z.literal('begrunnelse'),
      til: z.string(),
      rettidig: vurderinger,
      innhold_tilstrekkelig: vurderinger,
    })
    .strict(),
  z
    .object({
      ...felles,
      type: z.literal('spesifisering'),
      til: z.string().nullable(),
      dager: z.number().int().positive(),
      rettidig: vurderinger,
    })
    .strict(),
  z
    .object({
      ...felles,
      type: z.literal('innsigelse'),
      til: z.string(),
      rettidig: vurderinger,
      part: z.enum(['TE', 'BH']),
      grunn: z.enum(['sen_spesifisering', 'sen_melding', 'omfang']),
    })
    .strict(),
  z
    .object({ ...felles, type: z.literal('avklart_ingen_tidsinnsigelse'), til: z.string() })
    .strict(),
]);
export type Handling = z.infer<typeof handlingsskjema>;
type Melding = Exclude<Handling, { type: 'avklart_ingen_tidsinnsigelse' }>;
export type Historikk = readonly Handling[];

function avvis(kode: string): never {
  throw new Error(kode);
}

export function leggTil(historikk: Historikk, ukjent: unknown): Historikk {
  const parsing = handlingsskjema.safeParse(ukjent);
  if (!parsing.success) avvis('ugyldig_handling');
  const h = parsing.data;
  if (historikk.some((gammel) => gammel.id === h.id)) avvis('duplikat_id');
  if (historikk.length && historikk[0].sak !== h.sak) avvis('annen_sak');
  if (h.type === 'foresporsel') {
    if (historikk.length) avvis('utenfor_provens_omfang');
  } else {
    const maal = 'til' in h && h.til !== null ? historikk.find((g) => g.id === h.til) : null;
    if (h.til !== null && !maal) avvis('ukjent_referanse');
    if (h.type === 'begrunnelse') {
      if (maal?.type !== 'foresporsel') avvis('feil_referansetype');
      if (historikk.some((g) => g.type === 'begrunnelse' || g.type === 'spesifisering'))
        avvis('utenfor_provens_omfang');
    } else if (h.type === 'spesifisering') {
      if (h.til !== null && maal?.type !== 'foresporsel') avvis('feil_referansetype');
      if (historikk.some((g) => g.type === 'spesifisering')) avvis('utenfor_provens_omfang');
    } else if (h.type === 'innsigelse') {
      if (maal?.type === 'avklart_ingen_tidsinnsigelse' || maal?.type === 'foresporsel')
        avvis('feil_referansetype');
      const mottaker = maal?.type === 'innsigelse' ? (maal.part === 'TE' ? 'BH' : 'TE') : 'BH';
      if (h.part !== mottaker) avvis('feil_part');
      if (h.grunn !== 'sen_melding' && maal?.type !== 'spesifisering') avvis('feil_referansetype');
      if (maal?.type === 'spesifisering' && h.grunn === 'sen_melding') avvis('feil_referansetype');
      if (
        historikk.some(
          (g) =>
            'til' in g &&
            g.til === h.til &&
            ((g.type === 'innsigelse' && (g.grunn === 'omfang') === (h.grunn === 'omfang')) ||
              (g.type === 'avklart_ingen_tidsinnsigelse' && h.grunn !== 'omfang'))
        )
      )
        avvis('utenfor_provens_omfang');
    } else if (h.type === 'avklart_ingen_tidsinnsigelse') {
      if (maal?.type === 'foresporsel' || maal?.type === 'avklart_ingen_tidsinnsigelse')
        avvis('feil_referansetype');
      if (
        historikk.some(
          (g) =>
            'til' in g &&
            g.til === h.til &&
            ((g.type === 'innsigelse' && g.grunn !== 'omfang') ||
              g.type === 'avklart_ingen_tidsinnsigelse')
        )
      )
        avvis('motstridende_premiss');
    }
  }
  return [...historikk, h];
}

function enighet(v: { TE: Vurdering; BH: Vurdering }): Vurdering {
  return v.TE === v.BH ? v.TE : null;
}

export function utled(historikk: Historikk) {
  const meldinger = historikk.filter(
    (h): h is Melding => h.type !== 'avklart_ingen_tidsinnsigelse'
  );
  const foresporsel = meldinger.find((h) => h.type === 'foresporsel');
  const begrunnelse = meldinger.find((h) => h.type === 'begrunnelse');
  const krav = meldinger.find((h) => h.type === 'spesifisering');
  const kvalifikasjon = foresporsel
    ? kvalifiserForesporsel(Object.values(foresporsel.vilkar))
    : 'ingen';

  function rettidighet(h: Exclude<Melding, { type: 'foresporsel' }>): Vurdering {
    const vurdert = enighet(h.rettidig);
    if (h.type === 'innsigelse' && h.grunn !== 'omfang') return vurdert;
    if (vurdert === true) return true;
    const tidsinnsigelse = meldinger.find(
      (g): g is Extract<Handling, { type: 'innsigelse' }> =>
        g.type === 'innsigelse' && g.grunn !== 'omfang' && g.til === h.id
    );
    const virksom = tidsinnsigelse
      ? rettidighet(tidsinnsigelse)
      : historikk.some((g) => g.type === 'avklart_ingen_tidsinnsigelse' && g.til === h.id)
        ? false
        : null;
    return rettidighetEtterPunkt5(vurdert, virksom);
  }

  const begrunnelseOk = begrunnelse ? enighet(begrunnelse.innhold_tilstrekkelig) : null;
  const begrunnelseRettidig = begrunnelse ? rettidighet(begrunnelse) : null;
  let vei: 'avventer' | '33.6.1' | '33.6.2_a' | 'uavklart' = 'avventer';
  if (begrunnelse)
    vei =
      kvalifikasjon === 'gyldig' && begrunnelseOk === true && begrunnelseRettidig === true
        ? '33.6.1'
        : 'uavklart';
  else if (krav)
    vei =
      krav.til === null
        ? '33.6.1'
        : kvalifikasjon === 'gyldig' && rettidighet(krav) === true
          ? '33.6.2_a'
          : 'uavklart';

  const avskaaret = vei === '33.6.2_a' ? true : vei === 'uavklart' ? null : false;
  const innsigelser: Record<string, string> = {};
  const innsigelsesgrunnlag: Record<string, string> = {};
  for (const h of meldinger) {
    if (h.type !== 'innsigelse') continue;
    const maal = meldinger.find((g) => g.id === h.til);
    const motTidsinnsigelse = maal?.type === 'innsigelse' && maal.grunn !== 'omfang';
    innsigelsesgrunnlag[h.id] = motTidsinnsigelse
      ? 'ingen_ny_frist_etter_punkt_5'
      : h.grunn === 'omfang'
        ? '33.7'
        : 'punkt_5';
    const rettidig = rettidighet(h);
    innsigelser[h.id] = motTidsinnsigelse
      ? 'ingen_ny_frist_etter_punkt_5'
      : h.grunn === 'sen_spesifisering' && avskaaret === true
        ? 'avskaaret_33_6_1'
        : rettidig === null
          ? 'uavklart'
          : rettidig
            ? 'ikke_tapt_paa_tidsgrunnlag'
            : 'tapt_paa_tidsgrunnlag';
  }
  const kravRettidig = krav ? rettidighet(krav) : null;
  return {
    journal: historikk.map((h) => h.id),
    foresporsel: kvalifikasjon,
    svar_b: begrunnelse?.id ?? null,
    gjeldende_krav: krav?.id ?? null,
    vei,
    svarplikt_33_7: Boolean(krav),
    avskjaering_33_6_1: avskaaret,
    begrensning_33_6_1:
      !krav || avskaaret === true
        ? false
        : vei === 'uavklart' || kravRettidig === null
          ? null
          : !kravRettidig,
    innsigelser,
    innsigelsesgrunnlag,
    innholdsvurderinger: begrunnelse ? { [begrunnelse.id]: begrunnelse.innhold_tilstrekkelig } : {},
    vurderinger: Object.fromEntries(
      meldinger
        .filter((h) => 'rettidig' in h)
        .map((h) => [h.id, 'rettidig' in h ? h.rettidig : null])
    ),
  };
}
