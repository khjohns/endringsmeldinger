import { PARTEN, stor } from '#kjerne/frosset/brevdeler.ts';
import type { Part, Spor } from '#kjerne/typer.ts';
import type { Brevet, Brevref } from '../lesing';
import { brevref, brevrefStor } from './felles';
import { dato, haerdet } from './format';
import { TRAADEN } from './traaden';

/** Det svaret gir i sporet, som innlegget ikke endrer (U-3 i BF-03). */
const ETTER_SVARET: Record<Spor, string> = {
  forhold: 'utfallet av det',
  vederlag: 'beløpet etter svaret',
  frist: 'fristforlengelsen etter svaret',
};

/**
 * Innlegget i fritekst fra begge parter (BF-03, skissen `innlegget.html` versjon 6, MM-U47).
 * Teksten i brevet kommer fra kjernen.
 */
export const INNLEGGET = haerdet({
  /** Lenken i hodet til tråden, som «Legg til korrespondanse» (unntaket 26.11 i #1377). */
  send: 'Send innlegg',
  /** Overskriften før parten har skrevet tittelen. */
  tittel: 'Innlegg',
  /** Merket i raden i tråden. */
  merke: 'Innlegg',
  viserTil: 'Brevet innlegget viser til',
  viserTilHjelp: 'Motpartens siste brev er valgt. Du kan velge et annet brev i saken.',
  brevvalg: (b: Brevet) =>
    `${brevrefStor(b)} · ${TRAADEN.hva(b)} · ${stor(PARTEN[b.avsender])} · ${dato(b.sendt ?? b.registrert)}`,
  tittelfelt: 'Tittel',
  tekstfelt: 'Tekst',
  vedlegg: 'Vedlegg',
  vedleggHjelp: 'Filene sendes med innlegget.',
  skrivTittelen: 'Skriv tittelen.',
  enLinje: 'Skriv tittelen på én linje.',
  skrivTeksten: 'Skriv teksten.',
  mangler: 'Dette mangler før du kan se brevet',
  seBrevet: 'Se brevet før sending',
  sendTil: (mottaker: Part) => `Send til ${PARTEN[mottaker]}`,
  kanIkkeLages: 'Innlegget kan ikke lages ennå.',
  forkastTekst: 'Tittelen, teksten og vedleggene i utkastet slettes. Det kan ikke gjøres om.',
  tilbakeTil: 'utkastet',
  /** Linja under hodet på innlegget i tråden. */
  viserTilBrev: (b: Brevref) => `Viser til ${brevref(b)}`,
  /** «Når du sender»: innlegget er et eget brev og endrer ikke svaret (U-3, D-2, D-4). */
  sendesTil: (mottaker: Part, svaret: Brevref | null, spor: Spor) =>
    `Innlegget sendes til ${PARTEN[mottaker]} og står i saken. ` +
    (svaret
      ? `Det endrer ikke svaret i ${brevref(svaret)} eller ${ETTER_SVARET[spor]}.`
      : 'Det endrer ingen krav eller svar i saken.'),
  /** TE kan fortsatt godta svaret eller sende et nytt krav (D-4, U-6). */
  fortsattTE: 'Du kan fortsatt godta svaret eller sende en ny versjon av kravet.',
  /** Byggherrens innlegg endrer ikke standpunktene (D-10, U-10). */
  standpunkteneBH:
    'Et innlegg endrer ikke standpunktene i svaret, heller ikke når det sier at et varsel kom for sent. Vil du endre standpunktene, sender du et nytt svar.',
  kvittering: (mottaker: Part, svaret: Brevref | null, etter: string | null) =>
    [
      `Innlegget er sendt til ${PARTEN[mottaker]}.`,
      ...(svaret ? [`Svaret i ${brevref(svaret)} står uendret.`] : []),
      ...(etter ? [etter] : []),
    ].join(' '),
  kvitteringTE: 'Du kan fortsatt godta det eller sende en ny versjon av kravet.',
  kvitteringBH: 'Vil du endre standpunktene, sender du et nytt svar.',
  /** Innleggene i brevkontrollen for aksepten (D-8, U-7). */
  iAksepten: (svaret: Brevref) => `Innlegg som viser til ${brevref(svaret)}`,
  innleggsrad: (b: Brevet) =>
    `${brevrefStor(b)} · ${stor(PARTEN[b.avsender])} · ${dato(b.registrert)} · ${TRAADEN.hva(b)}`,
  inngaarIkke: 'Innleggene inngår ikke i aksepten.',
});
