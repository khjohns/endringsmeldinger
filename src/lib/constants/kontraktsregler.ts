/**
 * Kontraktsregler — velformulerte regeltekster for inline-visning
 *
 * Hver hjemmel har to avsnitt:
 * - regel: Trigger, handling og frist i naturlig prosa
 * - konsekvens: Konsekvens ved brudd (inkludert §5-mekanismen)
 *
 * VIKTIG - OPPHAVSRETT (NS 8407):
 * Standard Norge har opphavsrett til NS 8407. Ved nye hjemler:
 * 1. PARAFRASÉR - ikke kopier ordrett fra kontrakten
 * 2. Bruk fulle navn, ikke forkortelser (totalentreprenør, ikke TE)
 * 3. Bevar juridiske nøkkelbegreper (uten ugrunnet opphold, pålegg)
 * 4. Omskriv setningsstruktur og ordvalg
 */

export interface Kontraktsregel {
  /** Første avsnitt: Trigger, handling og frist i naturlig prosa */
  regel: string;
  /** Andre avsnitt: Konsekvens ved brudd (inkludert §5) */
  konsekvens: string;
}

/**
 * Lookup av kontraktsregler per §-referanse.
 * Nøkkel er hjemmel_basis fra Kontraktshjemmel (uten §-tegn).
 */
export const KONTRAKTSREGLER: Record<string, Kontraktsregel> = {
  // ========== ENDRINGER ==========

  '31.3': {
    regel:
      'Byggherren kan pålegge totalentreprenøren endringer ved å utstede skriftlig endringsordre (§31.3). Endringen kan gjelde arbeidsomfang, kvalitet, art, utførelse eller fremdrift.',
    konsekvens:
      'En endringsordre etter §31.3 etablerer at endringen er avtalt. Totalentreprenøren har utførelsesplikt og kan kreve vederlagsjustering (§34) og fristforlengelse (§33.1 a).',
  },

  '32.1': {
    regel:
      'Mottar totalentreprenøren pålegg uten endringsordre fra person med fullmakt eller via arbeidstegninger (§32.1), skal han iverksette pålegget og varsle etter §32.2 uten ugrunnet opphold dersom han mener det utgjør en endring.',
    konsekvens:
      'Varsles det ikke i tide, tapes retten til å påberope at pålegget innebærer en endring. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  '14.6': {
    regel:
      'Mottar totalentreprenøren pålegg som begrenser valgretten for materiale, utførelse eller løsning (§14.6), må han varsle etter §32.2 uten ugrunnet opphold dersom han mener dette utgjør en endring.',
    konsekvens:
      'Varsles det ikke i tide, tapes retten til å påberope begrensningen som endring. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  '24.2.2': {
    regel:
      'Mottar totalentreprenøren svar fra byggherren på varsel etter §24.2.2 som innebærer en endring uten at endringsordre utstedes, må han varsle etter §32.2 uten ugrunnet opphold.',
    konsekvens:
      'Varsles det ikke i tide, tapes retten til å påberope at svaret innebærer en endring. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  '14.4': {
    regel:
      'Krever lovendring eller enkeltvedtak etter tilbudet endring av kontraktsgjenstanden (§14.4), må totalentreprenøren varsle etter §32.2 uten ugrunnet opphold dersom han mener dette utgjør en endring.',
    konsekvens:
      'Varsles det ikke i tide, tapes retten til å påberope forholdet som endring. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  '15.2': {
    regel:
      'Krever lovendring eller enkeltvedtak etter tilbudet endring av avtalte prosesskrav (§15.2), må totalentreprenøren varsle etter §32.2 uten ugrunnet opphold dersom han mener dette utgjør en endring.',
    konsekvens:
      'Varsles det ikke i tide, tapes retten til å påberope forholdet som endring. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  '26.3': {
    regel:
      'Endres offentlige gebyrer eller avgifter etter tilbudet (§26.3), må totalentreprenøren varsle etter §32.2 uten ugrunnet opphold dersom han mener dette utgjør en endring.',
    konsekvens:
      'Varsles det ikke i tide, tapes retten til å påberope forholdet som endring. Vederlagsjustering er uten påslag for indirekte kostnader, risiko og fortjeneste. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  '21.4': {
    regel:
      'Medfører byggherrens koordinering omlegging utover det påregnelige etter kontrakten (§21.4), må totalentreprenøren varsle etter §32.2 uten ugrunnet opphold dersom han mener dette utgjør en endring.',
    konsekvens:
      'Varsles det ikke i tide, tapes retten til å påberope forholdet som endring. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  // ========== SVIKT ==========

  '22': {
    regel:
      'Svikter byggherren i sin medvirkningsplikt etter §22.1-22.4, må totalentreprenøren varsle etter §25.1.2 uten ugrunnet opphold.',
    konsekvens:
      'Byggherren kan kreve erstatning for tap som kunne vært unngått ved rettidig varsel, men kravet tapes ikke. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  '23.1': {
    regel:
      'Blir eller burde totalentreprenøren bli oppmerksom på at grunnforholdene avviker fra det han hadde grunn til å regne med (§23.1), må han varsle byggherren etter §25.1.2 uten ugrunnet opphold.',
    konsekvens:
      'Byggherren kan kreve erstatning for tap som kunne vært unngått ved rettidig varsel, men kravet tapes ikke. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  '23.3': {
    regel:
      'Oppdager totalentreprenøren kulturminner (§23.3), må han straks innstille arbeidet, iverksette sikring og varsle byggherren etter §25.1.2 uten ugrunnet opphold.',
    konsekvens:
      'Byggherren kan kreve erstatning for tap som kunne vært unngått. Totalentreprenøren har ikke risikoen for kulturminner med mindre han hadde kunnskap ved tilbudet.',
  },

  '24.1': {
    regel:
      'Oppdager totalentreprenøren svikt i løsninger eller prosjektering som byggherren har foreskrevet eller pålagt (§24.1), må han varsle etter §25.1.2 uten ugrunnet opphold.',
    konsekvens:
      'Byggherren kan kreve erstatning for tap som kunne vært unngått, men kravet tapes ikke. Byggherren bærer risikoen for egen prosjektering. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  // ========== ANDRE ==========

  '10.2': {
    regel:
      'Mottar byggherren underretning om valg av kontraktsmedhjelper (§10.2), må han melde fra om eventuell nektelse med saklig begrunnelse uten ugrunnet opphold, senest 14 dager etter mottak.',
    konsekvens:
      'Nektes kontraktsmedhjelperen uten saklig grunn, kan totalentreprenøren kreve fristforlengelse og vederlagsjustering.',
  },

  '19.1': {
    regel:
      'Forårsaker byggherren eller hans kontraktsmedhjelpere skade på kontraktsgjenstanden (§19.1), må totalentreprenøren varsle uten ugrunnet opphold (§5).',
    konsekvens:
      'Byggherren bærer risikoen for slik skade. Dette gjelder også ekstraordinære omstendigheter som krig, opprør og naturkatastrofer.',
  },

  '38.1 annet ledd': {
    regel:
      'Tar byggherren kontraktsgjenstanden i bruk før overtakelse uten avtale (§38.1), må totalentreprenøren varsle uten ugrunnet opphold (§5).',
    konsekvens:
      'Risikoen for delene som tas i bruk går automatisk over til byggherren, og eventuell dagmulkt reduseres forholdsmessig.',
  },

  '29.2': {
    regel:
      'Ved vesentlig betalingsmislighold fra byggherren, eller dersom slikt mislighold klart vil inntre (§29.2), må totalentreprenøren varsle skriftlig minst 24 timer før stansing iverksettes.',
    konsekvens: 'Stansingsrett forutsetter vesentlig mislighold.',
  },

  '33.1 c)': {
    regel:
      'Andre forhold byggherren har risikoen for som ikke faller inn under endringer eller svikt, kan gi totalentreprenøren rett til fristforlengelse og vederlagsjustering.',
    konsekvens:
      'Totalentreprenøren må varsle uten ugrunnet opphold. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  // ========== VEDERLAGSJUSTERING ==========

  '34.1': {
    regel:
      'Totalentreprenøren har krav på vederlagsjustering dersom det foreligger en endring etter kapittel V, eller dersom det foreligger andre forhold som byggherren bærer risikoen for etter kontrakten.',
    konsekvens:
      'Kravet om vederlagsjustering må varsles uten ugrunnet opphold. Byggherren må påberope sen varsling skriftlig uten ugrunnet opphold (§5).',
  },

  '34.1.2': {
    regel:
      'Når vederlagskravet bygger på svikt ved byggherrens ytelser eller andre forhold byggherren har risikoen for, skal totalentreprenøren varsle uten ugrunnet opphold etter at han ble eller burde blitt klar over forholdet.',
    konsekvens:
      'Retten til vederlagsjustering kan gå tapt dersom kravet varsles for sent. Byggherren må påberope preklusjon skriftlig uten ugrunnet opphold (§5).',
  },

  '34.1.3': {
    regel:
      'Krav om særskilt dekning av økte utgifter til rigg og drift skal varsles uten ugrunnet opphold når totalentreprenøren blir klar over at utgiftene vil påløpe. Det samme gjelder krav som følge av nedsatt produktivitet eller forstyrrelser i arbeidet.',
    konsekvens:
      'Ved for sen varsling kan retten til de særskilte kostnadspostene gå tapt. Rigg og drift samt produktivitetstap vurderes hver for seg.',
  },

  '34.2': {
    regel:
      'Vederlagsjusteringen skal fastsettes på grunnlag av kontraktens enhetspriser så langt disse passer. Der enhetspriser ikke passer, fastsettes vederlaget som regningsarbeid, eller ut fra annen avtalt metode.',
    konsekvens:
      'Totalentreprenøren skal varsle uten ugrunnet opphold dersom han vil kreve vederlagsjustering, med opplysninger om hva kravet bygger på og om mulig kravets størrelse.',
  },

  '34.4': {
    regel:
      'Regningsarbeid avregnes etter nødvendige kostnader med et avtalt eller sedvanlig påslag for indirekte kostnader, risiko og fortjeneste. Totalentreprenøren skal føre løpende oversikt over timer og materialer.',
    konsekvens:
      'Byggherren skal gis mulighet til å kontrollere omfanget fortløpende. Manglende dokumentasjon kan medføre at deler av kravet avvises.',
  },

  // ========== FRISTFORLENGELSE ==========

  '33.1': {
    regel:
      'Totalentreprenøren har krav på fristforlengelse dersom fremdriften hindres som følge av: a) endringer, b) svikt ved byggherrens ytelser, eller c) andre forhold som byggherren bærer risikoen for etter kontrakten.',
    konsekvens:
      'Kravet om fristforlengelse må varsles uten ugrunnet opphold (§33.4). Når beregningsgrunnlaget foreligger, skal antall dager angis og begrunnes uten ugrunnet opphold (§33.6.1). Byggherren må svare uten ugrunnet opphold (§33.7).',
  },

  '33.4': {
    regel:
      'En part som vil kreve fristforlengelse etter §§33.1–33.3, skal skriftlig varsle motparten uten ugrunnet opphold, selv om kravet ennå ikke kan spesifiseres.',
    konsekvens:
      'Ved sent varsel tapes fristkravet. Motparten må imidlertid gjøre forsinkelsen gjeldende skriftlig uten ugrunnet opphold; ellers anses varselet som rettidig (§5).',
  },

  '33.5': {
    regel:
      'Fristforlengelsen skal svare til den virkning det aktuelle forholdet har hatt eller vil ha på fremdriften. Ved utmålingen skal det tas hensyn til alle relevante forhold, herunder om forsinkelsen ligger på kritisk linje.',
    konsekvens:
      'Totalentreprenøren har bevisbyrden for at forholdet faktisk har forsinket fremdriften, og for omfanget av forsinkelsen.',
  },

  '33.6.1': {
    regel:
      'Når parten har grunnlag for å beregne omfanget, skal han uten ugrunnet opphold angi og begrunne antallet dager fristforlengelse som kreves.',
    konsekvens:
      'Ved for sen spesifisering er kravet begrenset til den fristforlengelsen motparten måtte forstå at parten hadde krav på. Motparten må svare uten ugrunnet opphold (§33.7).',
  },

  // ========== FORCE MAJEURE ==========

  '33.3': {
    regel:
      'Partene har krav på fristforlengelse ved force majeure: ekstraordinære omstendigheter utenfor partens kontroll som han ikke burde ha forutsett ved avtaleinngåelsen og ikke med rimelighet kunne ha overvunnet eller avverget følgene av.',
    konsekvens:
      'Force majeure gir bare rett til fristforlengelse, ikke vederlagsjustering. Kravet må varsles uten ugrunnet opphold etter §33.4.',
  },
};

/**
 * Hent kontraktsregel for en hjemmel_basis.
 * Returnerer null hvis hjemmelen ikke har en regeltekst.
 */
export function getKontraktsregel(hjemmelBasis: string): Kontraktsregel | null {
  return KONTRAKTSREGLER[hjemmelBasis] ?? null;
}
