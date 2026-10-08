import { z } from 'zod';
import { kvalifiserForesporsel, rettidighetEtterPunkt5 } from './grunnmodell.ts';
import type { Vurdering } from './grunnmodell.ts';

const vurderinger = z.object({ TE: z.boolean().nullable(), BH: z.boolean().nullable() }).strict();
const part = z.enum(['TE', 'BH']);
const felles = { id: z.string().min(1), sak: z.string().min(1) };
const innsigelsesfelt = {
  til: z.string(),
  rettidig: vurderinger,
  grunn: z.enum(['sen_spesifisering', 'sen_melding', 'omfang']),
  senere_dokumentert: z.boolean().optional(),
};
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
  z.object({ ...felles, type: z.literal('innsigelse'), part, ...innsigelsesfelt }).strict(),
  z
    .object({
      ...felles,
      type: z.literal('brev'),
      part,
      innsigelser: z.array(z.object({ id: z.string().min(1), ...innsigelsesfelt }).strict()).min(1),
    })
    .strict(),
  z
    .object({ ...felles, type: z.literal('avklart_ingen_tidsinnsigelse'), til: z.string() })
    .strict(),
  z
    .object({
      ...felles,
      type: z.literal('motstrid_avgjort'),
      til: z.string(),
      gjelder: z.string(),
    })
    .strict(),
  z
    .object({
      ...felles,
      type: z.literal('utsendt'),
      part,
      gjelder: z.string(),
      gjengitt: z.union([z.string(), z.boolean(), z.null()]),
    })
    .strict(),
]);
export type Handling = z.infer<typeof handlingsskjema>;
type Innsigelse = Extract<Handling, { type: 'innsigelse' }> & { brev?: string };
type Post = Exclude<Handling, { type: 'innsigelse' }> | Innsigelse;
type Melding = Extract<
  Post,
  { type: 'foresporsel' | 'begrunnelse' | 'spesifisering' | 'innsigelse' }
>;
export type Historikk = readonly Handling[];

function avvis(kode: string): never {
  throw new Error(kode);
}

function motpart(p: 'TE' | 'BH'): 'TE' | 'BH' {
  return p === 'TE' ? 'BH' : 'TE';
}

function poster(historikk: Historikk): Post[] {
  return historikk.flatMap((h): Post[] =>
    h.type === 'brev'
      ? [
          h,
          ...h.innsigelser.map(
            (i): Innsigelse => ({ ...i, type: 'innsigelse', sak: h.sak, part: h.part, brev: h.id })
          ),
        ]
      : [h]
  );
}

function omfatter(kjente: Post[], id: string): string[] {
  const post = kjente.find((g) => g.id === id);
  if (post?.type === 'brev') return [id, ...post.innsigelser.map((i) => i.id)];
  if (post?.type === 'innsigelse' && post.brev) return [id, post.brev];
  return [id];
}

function kontrollerInnsigelse(historikk: Historikk, h: Innsigelse): void {
  const kjente = poster(historikk);
  const maal = kjente.find((g) => g.id === h.til);
  if (!maal) avvis('ukjent_referanse');
  if (!['begrunnelse', 'spesifisering', 'innsigelse', 'brev'].includes(maal.type))
    avvis('feil_referansetype');
  const mottaker = maal.type === 'innsigelse' || maal.type === 'brev' ? motpart(maal.part) : 'BH';
  if (h.part !== mottaker) avvis('feil_part');
  if (h.grunn !== 'sen_melding' && maal.type !== 'spesifisering') avvis('feil_referansetype');
  if (maal.type === 'spesifisering' && h.grunn === 'sen_melding') avvis('feil_referansetype');
  const tidsinnsigelse = h.grunn !== 'omfang';
  const dekket = omfatter(kjente, h.til);
  const konflikt = kjente.filter((g) =>
    g.type === 'innsigelse'
      ? g.grunn === 'omfang'
        ? !tidsinnsigelse && g.til === h.til
        : tidsinnsigelse && omfatter(kjente, g.til).some((id) => dekket.includes(id))
      : g.type === 'avklart_ingen_tidsinnsigelse' &&
        tidsinnsigelse &&
        omfatter(kjente, g.til).some((id) => dekket.includes(id))
  );
  const senereDokumentasjonMotPremiss =
    h.senere_dokumentert === true &&
    konflikt.every((g) => g.type === 'avklart_ingen_tidsinnsigelse' && g.til === h.til);
  if (konflikt.length && !senereDokumentasjonMotPremiss) avvis('utenfor_provens_omfang');
}

export function leggTil(historikk: Historikk, ukjent: unknown): Historikk {
  const parsing = handlingsskjema.safeParse(ukjent);
  if (!parsing.success) avvis('ugyldig_handling');
  const h = parsing.data;
  const kjente = poster(historikk);
  const nyeIder = h.type === 'brev' ? [h.id, ...h.innsigelser.map((i) => i.id)] : [h.id];
  if (
    new Set(nyeIder).size !== nyeIder.length ||
    kjente.some((gammel) => nyeIder.includes(gammel.id))
  )
    avvis('duplikat_id');
  if (historikk.length && historikk[0].sak !== h.sak) avvis('annen_sak');
  if (h.type === 'foresporsel') {
    if (historikk.length) avvis('utenfor_provens_omfang');
  } else if (h.type === 'brev') {
    let underveis: Historikk = historikk;
    for (const i of h.innsigelser) {
      const innsigelse = { ...i, type: 'innsigelse' as const, sak: h.sak, part: h.part };
      kontrollerInnsigelse(underveis, innsigelse);
      underveis = [...underveis, innsigelse];
    }
  } else if (h.type === 'innsigelse') {
    kontrollerInnsigelse(historikk, h);
  } else if (h.type === 'motstrid_avgjort') {
    const motstrid = utled(historikk).motstrid[h.til];
    if (!motstrid) avvis('ingen_motstrid');
    if (!motstrid.includes(h.gjelder)) avvis('feil_referansetype');
  } else if (h.type === 'utsendt') {
    const maal = kjente.find((g) => g.id === h.gjelder);
    if (!maal) avvis('ukjent_referanse');
    if (maal.type !== 'innsigelse' && maal.type !== 'spesifisering') avvis('feil_referansetype');
    if (gjeldendeVerdi(utled(historikk), maal) !== h.gjengitt) avvis('gjengivelse_avviker');
  } else {
    const maal = h.til !== null ? kjente.find((g) => g.id === h.til) : null;
    if (h.til !== null && !maal) avvis('ukjent_referanse');
    if (h.type === 'begrunnelse') {
      if (maal?.type !== 'foresporsel') avvis('feil_referansetype');
      if (historikk.some((g) => g.type === 'begrunnelse' || g.type === 'spesifisering'))
        avvis('utenfor_provens_omfang');
    } else if (h.type === 'spesifisering') {
      if (h.til !== null && maal?.type !== 'foresporsel') avvis('feil_referansetype');
      if (historikk.some((g) => g.type === 'spesifisering')) avvis('utenfor_provens_omfang');
    } else if (h.type === 'avklart_ingen_tidsinnsigelse') {
      if (
        !maal ||
        ['foresporsel', 'avklart_ingen_tidsinnsigelse', 'motstrid_avgjort', 'utsendt'].includes(
          maal.type
        )
      )
        avvis('feil_referansetype');
      const dekket = omfatter(kjente, h.til);
      if (
        kjente.some(
          (g) =>
            ((g.type === 'innsigelse' && g.grunn !== 'omfang') ||
              g.type === 'avklart_ingen_tidsinnsigelse') &&
            omfatter(kjente, g.til).some((id) => dekket.includes(id))
        )
      )
        avvis('motstridende_premiss');
    }
  }
  return [...historikk, h];
}

function gjeldendeVerdi(resultat: ReturnType<typeof utled>, maal: Post): string | boolean | null {
  return maal.type === 'spesifisering'
    ? resultat.begrensning_33_6_1
    : (resultat.innsigelser[maal.id] ?? null);
}

function enighet(v: { TE: Vurdering; BH: Vurdering }): Vurdering {
  return v.TE === v.BH ? v.TE : null;
}

export function utled(historikk: Historikk) {
  const alle = poster(historikk);
  const meldinger = alle.filter(
    (h): h is Melding =>
      h.type === 'foresporsel' ||
      h.type === 'begrunnelse' ||
      h.type === 'spesifisering' ||
      h.type === 'innsigelse'
  );
  const foresporsel = meldinger.find((h) => h.type === 'foresporsel');
  const begrunnelse = meldinger.find((h) => h.type === 'begrunnelse');
  const krav = meldinger.find((h) => h.type === 'spesifisering');
  const kvalifikasjon = foresporsel
    ? kvalifiserForesporsel(Object.values(foresporsel.vilkar))
    : 'ingen';

  const konflikter: Record<string, string[]> = {};
  for (const premiss of alle) {
    if (premiss.type !== 'avklart_ingen_tidsinnsigelse') continue;
    const dokumentert = meldinger.filter(
      (g) => g.type === 'innsigelse' && g.senere_dokumentert && g.til === premiss.til
    );
    if (dokumentert.length) konflikter[premiss.til] = [premiss.id, ...dokumentert.map((g) => g.id)];
  }
  const tilsidesatt = new Set<string>();
  const avgjort: Record<string, string> = {};
  for (const a of alle) {
    if (a.type !== 'motstrid_avgjort') continue;
    avgjort[a.til] = a.gjelder;
    for (const id of konflikter[a.til] ?? []) if (id !== a.gjelder) tilsidesatt.add(id);
  }
  const motstrid = Object.fromEntries(
    Object.entries(konflikter).filter(([til]) => !(til in avgjort))
  );
  const iMotstrid = new Set(Object.values(motstrid).flat());

  function virksomTidsinnsigelse(h: Exclude<Melding, { type: 'foresporsel' }>): Vurdering {
    const mal = [h.id, ...(h.type === 'innsigelse' && h.brev ? [h.brev] : [])];
    const tidsinnsigelse = meldinger.find(
      (g): g is Innsigelse =>
        g.type === 'innsigelse' &&
        g.grunn !== 'omfang' &&
        mal.includes(g.til) &&
        !tilsidesatt.has(g.id)
    );
    const premiss = alle.some(
      (g) =>
        g.type === 'avklart_ingen_tidsinnsigelse' && mal.includes(g.til) && !tilsidesatt.has(g.id)
    );
    if (tidsinnsigelse && premiss) return null;
    return tidsinnsigelse ? rettidighet(tidsinnsigelse) : premiss ? false : null;
  }

  function rettidighet(h: Exclude<Melding, { type: 'foresporsel' }>): Vurdering {
    const vurdert = enighet(h.rettidig);
    if (h.type === 'innsigelse' && h.grunn !== 'omfang') return vurdert;
    if (vurdert === true) return true;
    return rettidighetEtterPunkt5(vurdert, virksomTidsinnsigelse(h));
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
  const virkerMot: Record<string, Record<string, string>> = {};
  for (const h of meldinger) {
    if (h.type !== 'innsigelse') continue;
    const maal = alle.find((g) => g.id === h.til);
    const motTidsinnsigelse = maal?.type === 'innsigelse' && maal.grunn !== 'omfang';
    innsigelsesgrunnlag[h.id] = motTidsinnsigelse
      ? 'ingen_ny_frist_etter_punkt_5'
      : h.grunn === 'omfang'
        ? '33.7'
        : 'punkt_5';
    if (maal?.type === 'brev')
      virkerMot[h.id] = Object.fromEntries(
        maal.innsigelser.map((i) => [
          i.id,
          i.grunn === 'omfang' ? 'punkt_5' : 'ingen_ny_frist_etter_punkt_5',
        ])
      );
    const rettidig = rettidighet(h);
    innsigelser[h.id] = tilsidesatt.has(h.id)
      ? 'tilsidesatt'
      : iMotstrid.has(h.id)
        ? 'uavklart'
        : motTidsinnsigelse
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
  const resultat = {
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
    dokumenter: Object.fromEntries(
      historikk.flatMap((h) => (h.type === 'brev' ? [[h.id, h.innsigelser.map((i) => i.id)]] : []))
    ),
    virker_mot: virkerMot,
    motstrid,
    avgjort,
    innholdsvurderinger: begrunnelse ? { [begrunnelse.id]: begrunnelse.innhold_tilstrekkelig } : {},
    vurderinger: Object.fromEntries(
      meldinger
        .filter((h) => 'rettidig' in h)
        .map((h) => [h.id, 'rettidig' in h ? h.rettidig : null])
    ),
    utsendelser: {} as Record<
      string,
      { gjengitt: string | boolean | null; gjeldende: string | boolean | null; utdatert: boolean }
    >,
  };
  for (const u of alle) {
    if (u.type !== 'utsendt') continue;
    const maal = alle.find((g) => g.id === u.gjelder);
    const gjeldende = maal ? gjeldendeVerdi(resultat, maal) : null;
    resultat.utsendelser[u.id] = {
      gjengitt: u.gjengitt,
      gjeldende,
      utdatert: gjeldende !== u.gjengitt,
    };
  }
  return resultat;
}
