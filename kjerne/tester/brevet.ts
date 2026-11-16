/**
 * OV-U79: et brev lagt til har typen, sendemåten og beskrivelsen (arbeidsvalget 2 A i #807).
 * Testene som legger til et brev uten å prøve feltene, bruker dette.
 */
export const SOM_BREV = {
  korrespondansetype: 'brev',
  sendemaate: 'post',
  beskrivelse: 'Brevet ble sendt utenfor løsningen.',
} as const;
