import { Scale, Banknote, Clock } from 'lucide-svelte';
import type { Track, HistoryEvent, TrackKey } from './types.js';
import { groupByDate, sporBestemmelser } from './utils.js';
import { getPartsNavn } from '$lib/utils/partsNavn.js';

const TE_NAVN = 'Byggnor';
const BH_NAVN = 'Kystveien Eiendom';

export const TE = getPartsNavn('TE', TE_NAVN, BH_NAVN);
export const BH = getPartsNavn('BH', TE_NAVN, BH_NAVN);

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 32 };

export const DD: Record<TrackKey, Track> = {
  ansvar: {
    label: 'Ansvarsgrunnlag',
    num: 'I',
    icon: Scale,
    type: 'binary',
    status: 'disputed',
    te: { position: 'Svikt', ref: '§ 23.1' },
    bh: { position: 'Avvist', ref: '§ 23.1 (2)' },
    best: sporBestemmelser('ansvar'),
    teT: 'Under utgraving i akse 1–3 støtte vi på massivt fjell som ikke fremkommer av de geotekniske rapportene (vedlegg 3 i kontrakten). Dybden på fjellet krever sprengning fremfor pigging. Dette utgjør en vesentlig endring av forutsetningene for tilbudet og representerer en svikt ved byggherrens leveranse av grunnlagsdata.',
    bhT: 'Kravet avvises i sin helhet. I geoteknisk rapport punkt 4.2 er det tatt uttrykkelig forbehold om at fjellkoter kan variere med inntil 2 meter i dette området. At fjellet ligger høyere enn antatt faller dermed innenfor entreprenørens risiko iht. NS 8407 § 23.1, 2. ledd.',
    bhL: 'Standpunkt',
    att: [{ n: 'Geoteknisk rapport rev. B', p: 42 }, { n: 'Foto byggegrop 11.04' }],
    note: {
      d: '14.04',
      t: 'Sjekk pkt. 4.2 — gjelder kun vertikale avvik, ikke horisontal utbredelse.',
    },
    draft: {
      text: 'Vi fastholder at forbeholdet i pkt. 4.2 er tilstrekkelig klart. Bør gjennomgå den geologiske kartleggingen på nytt.',
    },
    draftState: 'draft',
  },
  vederlag: {
    label: 'Økonomi',
    num: 'II',
    icon: Banknote,
    type: 'numeric',
    status: 'subsidiary',
    te: { value: 450000, unit: ',-' },
    bh: { prinsipal: 0, subsidiaer: 300000, unit: ',-' },
    best: sporBestemmelser('vederlag'),
    teT: 'Sprengningsarbeidene krevde innleie av spesialisert borerigg samt ekstra mannskap i 14 arbeidsdager. Total kostnad beregnet som regningsarbeid iht. NS 8407 § 30: maskin og mannskap kr 300.000,-, leie eksternt utstyr kr 150.000,-. Totalt kr 450.000,- eksklusiv mva.',
    bhT: 'Dersom det mot formodning skulle konstateres rett til endring, aksepteres kun påløpte kostnader for den faktiske sprengningen. Kostnader knyttet til leie av eksternt utstyr (150.000,-) avvises subsidiært da entreprenøren uansett skulle hatt borerigg på plassen.',
    bhL: 'Subsidiær utmåling',
    att: [{ n: 'Kostnadsoppstilling', p: 3 }],
    note: null,
    draft: { text: 'Vurderer 280k — borerigg-argumentet har noe for seg.', value: 280000 },
    draftState: 'draft',
  },
  frist: {
    label: 'Frist',
    num: 'III',
    icon: Clock,
    type: 'numeric',
    status: 'subsidiary',
    te: { value: 14, unit: ' dgr' },
    bh: { prinsipal: 0, subsidiaer: 7, unit: ' dgr' },
    best: sporBestemmelser('frist'),
    teT: 'Sprengningsarbeidene medførte full stans i grunnarbeidet i akse 1–3 i 14 arbeidsdager. Arbeidet ligger på kritisk linje for råbyggsfasen, og forsinkelsen forplanter seg direkte til sluttfristen.',
    bhT: 'Tidsbruken for selve sprengningen vurderes å utgjøre maksimalt 7 arbeidsdager. Resterende dager avvises da arbeidet ikke i sin helhet ligger på kritisk linje iht. fremdriftsplan rev. 4.',
    bhL: 'Subsidiær utmåling',
    att: [{ n: 'Fremdriftsplan rev. 4', p: 8 }],
    note: null,
    draft: null,
    draftState: 'empty',
  },
};

export const EVT: HistoryEvent[] = [
  { d: '14.04', t: '09:15', a: 'BH', n: BH, s: 'Ansvar bestridt', x: 'Prinsipalt avslag.' },
  {
    d: '14.04',
    t: '09:15',
    a: 'BH',
    n: BH,
    s: 'Subsidiær utmåling',
    x: '300.000,- / 7 dager.',
  },
  { d: '13.04', t: '15:42', a: 'TE', n: TE, s: 'Vederlag revidert', x: '350k → 450k.' },
  { d: '12.04', t: '11:20', a: 'TE', n: TE, s: 'Frist spesifisert', x: '14 arbeidsdager.' },
  {
    d: '12.04',
    t: '11:15',
    a: 'TE',
    n: TE,
    s: 'Vederlagskrav sendt',
    x: 'Regningsarbeid § 30.',
  },
  {
    d: '12.04',
    t: '11:05',
    a: 'TE',
    n: TE,
    s: 'Ansvarsgrunnlag sendt',
    x: 'Svikt / § 23.1.',
  },
  { d: '12.04', t: '11:00', a: 'TE', n: TE, s: 'Opprettet', x: 'KOE-104.' },
];

export const EVT_GROUPED = groupByDate(EVT);
