/**
 * #313, arbeidsvalgene 26.10 (VG-A-02, VG-C-02, kommentaren i #1303): hva skjemaet sier om
 * virkningen av BHs svar på vederlagskravet, med «Begrunnelsen» (oppdragsgiver 26.10), uten
 * «Byggherren er bundet …» og «… og svaret kan ikke revideres» (MM-U34 punkt 26). Tilfellet
 * med særskilte vilkår venter på OV-U49. Dagens svarskjema og Varden (#1331) viser de samme
 * tekstene.
 */
export const VIRKNING = {
  alltid: 'Virkningen av svaret regnes ut fra valgene over. Begrunnelsen tolkes ikke.',
  // Bare når kjernen forhåndsviser sammenfall, ikke bare hele beløpet (GR-U7).
  sammenfall:
    'Svaret gir sammenfall med TEs krav om vederlag etter valgene over. Enighet registreres uten at TE må godta svaret.',
  // Grunnlaget er ikke besvart og ikke avklart ved frafall (GR-U23, GR-U26, OV-U45).
  forbehold:
    'Grunnlaget i TEs krav er ikke besvart her og er heller ikke avklart ved byggherrens frafall. Standpunktene i svaret gjelder under forutsetning av at grunnlaget for kravet foreligger. En enighet om beløpet er derfor betinget av grunnlaget. Godtar TE et avslag på grunnlaget, får enigheten om beløpet ingen virkning.',
} as const;
