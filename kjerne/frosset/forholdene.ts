/**
 * Forholdene totalentreprenøren kan påberope, med kjernens kode, navnet og hjemmelen i
 * NS 8407, i gruppene og rekkefølgen fra skissen versjon 3 (BF-05). Gruppen har
 * kontraktens henvisning (OV-U77), og navnet er forholdet selv (OV-U78). Brevteksten og
 * brevtittelen bruker navnet, og Varden leser lista herfra (svaret på Q3 i #1488).
 * Force majeure har ingen kode i kjernen ennå (#367).
 */

import type { Underkategori } from '../regler/typer.ts';

export interface Forholdet {
  kode: Underkategori;
  navn: string;
  hjemmel: string;
}

export const FORHOLDSGRUPPER: { navn: string; forhold: Forholdet[] }[] = [
  {
    navn: 'Endringer, jf. punkt 31 og 32',
    forhold: [
      { kode: 'irregulaer_endring', navn: 'Irregulær endring', hjemmel: '32.1' },
      { kode: 'valg_av_loesning', navn: 'Begrensning av valgrett', hjemmel: '14.6' },
      { kode: 'samordning', navn: 'Samordning', hjemmel: '21.4' },
      { kode: 'svar_paa_varsel', navn: 'Endring ved svar på varsel', hjemmel: '24.2.2' },
      { kode: 'endringsordre', navn: 'Endringsordre', hjemmel: '31.3' },
      {
        kode: 'lovendring_gjenstand',
        navn: 'Endringer i lover og vedtak for kontraktsgjenstanden',
        hjemmel: '14.4',
      },
      {
        kode: 'lovendring_prosess',
        navn: 'Endringer i lover og vedtak for prosessen',
        hjemmel: '15.2',
      },
      {
        kode: 'gebyrer_og_avgifter',
        navn: 'Endrede offentlige gebyrer og avgifter',
        hjemmel: '26.3',
      },
    ],
  },
  {
    navn: 'Forsinkelse eller svikt ved byggherrens ytelser etter punkt 22, 23 og 24',
    forhold: [
      {
        kode: 'medvirkning',
        navn: 'Manglende medvirkning eller leveranser fra byggherren',
        hjemmel: '22',
      },
      { kode: 'grunnforhold', navn: 'Uforutsette forhold ved grunnen', hjemmel: '23.1' },
      { kode: 'prosjektering', navn: 'Svikt i byggherrens prosjektering', hjemmel: '24.1' },
      { kode: 'kulturminner', navn: 'Funn av kulturminner', hjemmel: '23.3' },
    ],
  },
  {
    navn: 'Andre forhold byggherren har risikoen for',
    forhold: [
      {
        kode: 'skade_fra_byggherren',
        navn: 'Skade forårsaket av byggherren eller byggherrens kontraktsmedhjelpere',
        hjemmel: '19.1',
      },
      {
        kode: 'nektet_kontraktsmedhjelper',
        navn: 'Nektet valg av kontraktsmedhjelper',
        hjemmel: '10.2',
      },
      { kode: 'brukstakelse', navn: 'Urettmessig brukstakelse', hjemmel: '38.1 annet ledd' },
      {
        kode: 'stans_ved_betalingsmislighold',
        navn: 'Stans ved betalingsmislighold',
        hjemmel: '29.2',
      },
      {
        kode: 'annet_forhold',
        navn: 'Annet forhold byggherren har risikoen for',
        hjemmel: '33.1 c',
      },
    ],
  },
];

const FORHOLDENE = new Map<string, Forholdet>(
  FORHOLDSGRUPPER.flatMap((g) => g.forhold.map((f) => [f.kode, f]))
);

/** Forholdet med kjernens kode, eller `null` for en ukjent kode. */
export const forholdet = (kode: unknown): Forholdet | null =>
  (typeof kode === 'string' && FORHOLDENE.get(kode)) || null;

/** Tittelen på totalentreprenørens brev om forholdet (GR-U31). */
export const paaberopelsenAv = (navn: string) => `Påberopelse av ${navn.toLowerCase()}`;
