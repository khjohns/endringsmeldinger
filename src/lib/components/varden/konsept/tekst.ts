/**
 * KONSEPT (#1331, brukeroppgaven «TE er uenig i svaret»). Veiene videre for TE som er uenig,
 * per standpunkt i svaret. Hver vei har status: om kjernen tilbyr handlingen, om den er
 * vedtatt uten å være bygget, eller om den ikke er avklart. Teksten er prototypetekst og
 * ikke vedtatt; den viser til vedtakene den bygger på.
 */

import { kroner } from '$kjerne/frosset/standpunkt';

export type Status = 'kjernen' | 'vedtatt' | 'uavklart';

export type Vei = {
  tittel: string;
  tekst: string;
  status: Status;
  /** Hva som mangler før veien kan brukes, med vedtaket eller issuet. */
  mangler: string;
};

export const STATUSNAVN: Record<Status, string> = {
  kjernen: 'Kjernen tilbyr',
  vedtatt: 'Vedtatt, ikke bygget',
  uavklart: 'Ikke avklart',
};

export const UENIG = {
  tittel: 'Er du uenig?',
  merke: 'Konsept',
  intro: 'Det du gjør, gjelder standpunktet det står under. Ingenting her sendes.',
  prinsipalt: (hjemmel: string) => `Prinsipalt: BH mener varselet etter § ${hjemmel} kom for sent`,
  beloep: (subsidiaert: boolean, b: number) =>
    `${subsidiaert ? 'Subsidiært' : 'Beløpet'}: BH godtar ${kroner(b)}`,
  svaret: (n: number) => `Svaret i brev ${n}`,
};

export const protest: Vei = {
  tittel: 'Protest: varselet kom i tide',
  tekst:
    'Protesten registreres ved siden av påberopelsen. Løsningen avgjør ikke hvem som har rett.',
  status: 'vedtatt',
  mangler:
    'VS-U1 og VS-U9, utsatt etter OV-U7. Til den bygges, sendes brevet utenfor appen og registreres.',
};

export const varsel = (n: number): Vei => ({
  tittel: 'Registrer varselet du sendte utenfor appen',
  tekst:
    'Har du varslet tidligere enn det BH viser til, registrerer du varselet med datoen det ble sendt. BH kan bestride datoen (VS-U8).',
  status: 'kjernen',
  mangler: `Hva registreringen gjør med svaret i brev ${n}, vises ikke her.`,
});

export const nyVersjon = (n: number, b: number, hjemmel: string | null): Vei => ({
  tittel: 'Send ny versjon av kravet',
  tekst: `Den nye versjonen avslår tilbudet i brev ${n} om ${kroner(b)}. Etterpå kan du ikke godta svaret her.${
    hjemmel ? ` BHs påberopelse av § ${hjemmel} står.` : ''
  }`,
  status: 'kjernen',
  mangler: 'Teksten om virkningen er vedtatt (OV-U54), men skjemaet viser den ikke ennå (#276).',
});

export const innsigelse: Vei = {
  tittel: 'Innsigelse: svaret kom for sent (§ 5 tredje ledd)',
  tekst:
    'Mener du at BH svarte for sent, sier du fra uten ugrunnet opphold. Løsningen registrerer innsigelsen og avgjør ikke om den kom i tide.',
  status: 'kjernen',
  mangler: 'Bygges ikke i denne prøven (VS-U1, VS-U14).',
};

export const vente: Vei = {
  tittel: 'Vent med å svare',
  tekst: 'BH er bundet av svaret til du godtar det eller sender en ny versjon av kravet (HF-U5).',
  status: 'uavklart',
  mangler:
    'En akseptfrist i svaret er vedtatt (HF-U5, HF-U18), men løsningen kjenner ingen akseptfrist ennå. Om visningen skal si noe om å vente, er ikke avklart.',
};
