/**
 * Kontrollene av skjemadataene som er felles for TE-skjemaene på TS-stien (#909).
 * Et brev fra appen har ingen form for vedlegg i kjernen ennå (#828), så vedlegg
 * avvises her og sendes ikke. Et registrert brev har vedleggene i kommandoen.
 */

import type { VARSELSPOR, Varselhjemmel, Vedlegg } from '$kjerne/typer';
import type { Vedleggsoppslag } from '$kjerne/kommandoer/skriving';

export function utenVedlegg(data: { vedlegg_ids?: string[] }): void {
  if (data.vedlegg_ids?.length)
    throw new Error('Brevet kan ikke ha vedlegg ennå. Fjern vedleggene før du sender.');
}

/**
 * Oppslaget kjernen leser vedleggene i et registrert brev fra (LV-U14), med bare feltene
 * brevet lagrer. Serveren svarer med flere, som størrelsen, og dem forstår ikke formatet.
 */
export const vedleggsoppslag = (vedlegg: readonly Vedlegg[]): Vedleggsoppslag =>
  new Map(
    vedlegg.map(({ vedlegg_id, filnavn, innhold_sha256 }) => [
      vedlegg_id.toLowerCase(),
      { vedlegg_id, filnavn, innhold_sha256 },
    ])
  );

/** Varselet TE sendte utenfor appen: datoen det ble sendt, og brevet som vedlegg. */
export interface RegistrertVarsel {
  sendt: string;
  vedlegg: Vedlegg[];
}

const ISO_DATO = /^\d{4}-\d{2}-\d{2}$/;

/** Dagens dato i norsk tid, som brevets dato kjernen kontrollerer mot (VS-U8). */
export const dagensDato = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });

/**
 * Det som hindrer at varselet kan oppgis, eller `null`: datoen må finnes og ikke være
 * etter dagens dato, og brevet må ligge ved (OV-U5). Kjernen avviser det samme
 * (`DATO_ETTER_BREVET`, `VEDLEGG_MANGLER`).
 */
export function varselhindring({ sendt, vedlegg }: RegistrertVarsel, idag: string): string | null {
  if (!ISO_DATO.test(sendt)) return 'Oppgi datoen varselet ble sendt.';
  if (sendt > idag) return 'Datoen varselet ble sendt, er etter dagens dato.';
  if (!vedlegg.length) return 'Legg ved brevet med varselet.';
  return null;
}

/** Datoen og vedleggene i kommandoen, eller det som hindrer at varselet kan oppgis, som feil. */
export function oppgittVarsel(varsel: RegistrertVarsel, idag: string) {
  const hindring = varselhindring(varsel, idag);
  if (hindring) throw new Error(hindring);
  return { sendt: varsel.sendt, dokumentasjon: varsel.vedlegg.map((v) => v.vedlegg_id) };
}

/** Registreringen av et varsel sendt utenfor appen, uten tekst fra appen (MM-U17). */
export function registrering<H extends Varselhjemmel>(
  spor: (typeof VARSELSPOR)[H],
  hjemmel: H,
  varsel: RegistrertVarsel,
  utdypning: string,
  idag: string
) {
  if (utdypning)
    throw new Error('Et registrert varsel har ingen tekst fra appen. Fjern teksten i skjemaet.');
  return { type: 'varsel' as const, spor, hjemmel, ...oppgittVarsel(varsel, idag) };
}
