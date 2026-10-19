/**
 * Én kommando blir ett dokument i journalen, eller en avvisning: formen,
 * utledningen av journalen, forutsetningene, nyttelastkontrollen og til sist
 * raden med det serveren fryser. Et brev med flere svar er én rad (4.1 i
 * designnotatet). Serveren gir hvert krav, svar, utsagn og hver opplysning en ny
 * ID, og relasjonene står som `gjelder` og `erstatter` (4.2).
 */

import { avvisning } from './avvisning.ts';
import { formfeil, type Kommando, type Svarutkast } from './kommando.ts';
import { frys } from '../frosset/frysing.ts';
import { standpunkter } from './standpunkter.ts';
import { BrevetAvvises, KanIkkeUttrykkes, lagBrevtekst } from '../frosset/brevtekst.ts';
import { avvis } from './forutsetninger.ts';
import {
  brevtekstI,
  erRegistrert,
  lesJournal,
  registrertDato,
  standpunkterISvaret,
  Uforstaatt,
} from '../format/leser.ts';
import { tekstSomIkkeKanLagres } from '../format/skjema.ts';
import { grunnlagskravFor, utled, type Utledning } from '../utledning/utled.ts';
import type { Kjerne } from '../versjon.ts';
import type {
  Avsnitt,
  Avvisning,
  Beslutningsgrunnlag,
  Journalrad,
  Krav,
  Part,
  Vedlegg,
} from '../typer.ts';

/** Det serveren stempler kommandoen med. Klienten bestemmer ingen av dem. */
export interface Kontekst {
  sakId: string;
  aktoerId: string;
  part: Part;
  teamId: string | null;
  tidspunkt: () => Date;
  nyId: () => string;
}

/**
 * Vedleggene kommandoen kan binde, etter ID med små bokstaver (LV-U14). Serveren leser
 * dem i skrivetransaksjonen: de i saken og prosjektet, og et ubundet vedlegg bare for
 * teamet som lastet det opp (arbeidsvalg 3 i #790).
 */
export type Vedleggsoppslag = ReadonlyMap<string, Vedlegg>;

export type Utfall =
  | { godtatt: true; hendelser: Journalrad[] }
  | { godtatt: false; feil: 'UGYLDIG_FORM' | 'REGELBRUDD'; avvisning: Avvisning };

const ugyldigForm = (avvisning: Avvisning): Utfall => ({
  godtatt: false,
  feil: 'UGYLDIG_FORM',
  avvisning,
});

/** Kjernen forstår ikke raden den selv skriver. Raden lagres ikke (MM-U2). */
export class Skrivefeil extends Error {}

type Data = Record<string, unknown>;

export function utledJournal(journal: Journalrad[], kjerne: Kjerne): Utledning {
  return utled(lesJournal(journal, kjerne.leserformat), kjerne.regler);
}

/**
 * Beslutningsgrunnlaget i formatet. Virkningene viser til standpunktet, og arten
 * leses derfra. Standpunktene uten virkning står for seg, fordi det er appens
 * vurdering og ikke noe byggherren har sagt (HF-U2).
 */
function lagret({ virkninger, ...resten }: Beslutningsgrunnlag): Data {
  const uten = virkninger.filter((v) => v.virkning === 'uten_virkning');
  return {
    ...resten,
    virkninger: virkninger
      .filter((v) => v.virkning !== 'uten_virkning')
      .map(({ standpunkt, virkning }) => ({ standpunkt, virkning })),
    ...(uten.length ? { uten_virkning: uten.map((v) => v.standpunkt) } : {}),
  };
}

/** Partens utdypning per element i brevet, til brevteksten (B-13 om begrunnelsestekst). */
type Utdypninger = Map<string, string>;

/**
 * Standpunktene og serverens utregning nyttelastkontrollen leste i hvert svarutkast, i
 * formen brevet lagrer dem (#804, #814). Brevet lagrer det kontrollen leste.
 */
type Bygde = Map<Svarutkast, { standpunkter: Data[]; utregning: Data }>;

function svar(
  s: Svarutkast,
  u: Utledning,
  kjerne: Kjerne,
  nyId: () => string,
  utdypninger: Utdypninger,
  bygde: Bygde,
  erstatter?: string
): Data {
  const bygd = bygde.get(s);
  if (!bygd)
    throw new Skrivefeil(`Nyttelastkontrollen har ikke kontrollert svaret på ${s.spor} (#814).`);
  const id = nyId();
  if (s.utdypning !== undefined) utdypninger.set(id, s.utdypning);
  const e: Data = {
    id,
    spor: s.spor,
    gjelder: s.gjelder,
    ...(erstatter ? { erstatter } : {}),
    // #342: grunnlagsversjonen svaret regnes mot, som `regnUtSvar` i nyttelastkontrollen.
    ...(s.spor === 'grunnlag' ? {} : { grunnlagskrav: u.spor.grunnlag.gjeldendeKrav!.id }),
    standpunkter: bygd.standpunkter,
  };
  // B-13: serverens utregning lagres, ikke klientens. Grunnlagssvaret har ingen.
  if (s.spor !== 'grunnlag') e.utregning = bygd.utregning;
  e.beslutningsgrunnlag = lagret(
    frys(e, grunnlagskravFor({ spor: s.spor, gjelder: s.gjelder }, u), kjerne.regler)
  );
  return e;
}

/** Innholdet i dokumentet kommandoen gir. */
function dokument(
  k: Kommando,
  u: Utledning,
  kjerne: Kjerne,
  nyId: () => string,
  utdypninger: Utdypninger,
  bygde: Bygde,
  bundne: Vedlegg[]
): Data {
  switch (k.type) {
    case 'krav': {
      const forrige = u.spor[k.spor].gjeldendeKrav;
      const id = nyId();
      if (k.utdypning !== undefined) utdypninger.set(id, k.utdypning);
      const data: Data = {
        krav: [{ id, spor: k.spor, ...(forrige ? { erstatter: forrige.id } : {}), ...k.innhold }],
      };
      // MM-U1: et varsel i kravet registreres første gang det kommer.
      // HF-U1: datoen gjelder varselet, ikke kravet, som er sendt i appen.
      if (k.varsel && !u.spor.frist.varsel) {
        const varsel = nyId();
        data.utsagn = [{ id: varsel, art: 'varsel', hjemmel: '33.4' }];
        data.opplysninger = [{ id: nyId(), hva: 'sendt', dato: k.varsel.sendt, gjelder: varsel }];
      }
      return data;
    }
    case 'brev':
      return { svar: k.svar.map((s) => svar(s, u, kjerne, nyId, utdypninger, bygde)) };
    case 'revisjon':
      return { svar: [svar(k.svar, u, kjerne, nyId, utdypninger, bygde, k.erstatter)] };
    case 'aksept':
      // KA-U10: aksepten viser til svaret og lagrer regelversjonen TE fikk se.
      return {
        utsagn: [{ id: nyId(), art: 'aksept', gjelder: k.svar, regelversjon: k.regelversjon }],
      };
    case 'trekk':
      return { utsagn: [{ id: nyId(), art: 'trekk', gjelder: u.spor[k.spor].gjeldendeKrav!.id }] };
    case 'varsel':
      return {
        utsagn: [{ id: nyId(), art: 'varsel', hjemmel: k.hjemmel }],
        opplysninger: [{ id: nyId(), hva: 'sendt', dato: k.sendt }],
        dokumentasjon: bundne,
      };
    case 'send_varsel':
      // VS-U15, VS-U8: brevet er varselet, og datoen er serverens.
      return { utsagn: [{ id: nyId(), art: 'varsel', hjemmel: k.hjemmel }] };
    case 'ingen_krav':
      return { utsagn: [{ id: nyId(), art: 'ingen_krav', spor: k.spor }] };
    case 'innsigelse':
    case 'protest':
    case 'passivitet':
      return { utsagn: [{ id: nyId(), art: k.type, gjelder: k.gjelder }] };
    case 'begrunnelse': {
      const id = nyId();
      const utsagn = [{ id, art: 'begrunnelse', gjelder: k.gjelder }];
      // KA-U35: et registrert brev, som varselet over.
      if (k.sendt !== undefined)
        return {
          utsagn,
          opplysninger: [{ id: nyId(), hva: 'sendt', dato: k.sendt }],
          ...(k.dokumentasjon ? { dokumentasjon: bundne } : {}),
        };
      if (k.utdypning !== undefined) utdypninger.set(id, k.utdypning);
      return { utsagn };
    }
    case 'bestridelse':
    case 'merking':
    case 'avklaring':
      // OV-U7: forutsetningene avviser kommandoen før dokumentet lages.
      throw new Error(`kommandoen ${k.type} skrives ikke i første versjon (OV-U7)`);
  }
}

/**
 * Kommandoen vurdert og skrevet som en rad, uten å lagre den. Den låste teksten
 * kommandoen bærer, må være den serveren lager (LV-U2, A1 i paragrafmatrisen).
 */
export function vurder(
  kommando: unknown,
  kontekst: Kontekst,
  journal: Journalrad[],
  kjerne: Kjerne,
  vedlegg: Vedleggsoppslag
): Utfall {
  return skriv(kommando, kontekst, journal, kjerne, vedlegg, true);
}

/**
 * Det klienten viser avsenderen før brevet sendes: raden kommandoen ville gitt,
 * med brevteksten, uten kontrollen av teksten kommandoen bærer og uten kravet til
 * begrunnelse og beskrivelse, som ikke endrer den låste teksten. Klienten sender
 * den låste teksten herfra med kommandoen (A1). Et brev med vedlegg er registrert og
 * har ingen tekst fra appen, så forhåndsvisningen trenger vedleggene bare for å
 * godta det.
 */
export function forhaandsvis(
  kommando: unknown,
  kontekst: Kontekst,
  journal: Journalrad[],
  kjerne: Kjerne,
  vedlegg: Vedleggsoppslag = new Map()
): Utfall {
  return skriv(kommando, kontekst, journal, kjerne, vedlegg, false);
}

/** Den låste teksten i en rad, slik kommandoen bærer den (A1). `null` for et registrert brev. */
export const laastTekst = (rad: Journalrad): string[] | null =>
  brevtekstI(rad)?.map((a) => a.laast) ?? null;

function skriv(
  kommando: unknown,
  kontekst: Kontekst,
  journal: Journalrad[],
  kjerne: Kjerne,
  vedlegg: Vedleggsoppslag,
  sendes: boolean
): Utfall {
  // #373: det basen ikke kan lagre, avvises før noe annet, med sin egen kode.
  const ulagringsbar = tekstSomIkkeKanLagres(kommando);
  if (ulagringsbar) return ugyldigForm(ulagringsbar);
  const feil = formfeil(kommando);
  if (feil.length) return ugyldigForm({ regel: 'UGYLDIG_FORM', melding: feil.join('; ') });
  const k = kommando as Kommando;
  const lest = lesJournal(journal, kjerne.leserformat);
  const u = utled(lest, kjerne.regler);
  const tidspunkt = kontekst.tidspunkt();
  const bygde: Bygde = new Map();
  // Nyttelastkontrollen leser standpunktene slik brevet lagrer dem (#776).
  const svarstandpunkter = (s: Svarutkast, utregning: Data) => {
    const lagret = standpunkter(s, u.spor[s.spor].gjeldendeKrav!, u, kontekst.nyId);
    bygde.set(s, { standpunkter: lagret, utregning });
    try {
      return standpunkterISvaret(s.spor, { standpunkter: lagret, utregning });
    } catch (feil) {
      if (feil instanceof Uforstaatt)
        throw new Skrivefeil(`Kjernen forstår ikke dokumentet den selv skriver: ${feil.message}`);
      throw feil;
    }
  };
  const brevetsDato = registrertDato({ registrert: tidspunkt.toISOString() });
  const brudd = avvisning(
    k,
    kontekst.part,
    u,
    kjerne.regler,
    svarstandpunkter,
    brevetsDato,
    sendes
  );
  if (brudd) return { godtatt: false, feil: 'REGELBRUDD', avvisning: brudd };
  // LV-U14: brevet lagrer ID-en, filnavnet og summen fra mellomlageret.
  const bundne: Vedlegg[] = [];
  for (const id of (k as { dokumentasjon?: string[] }).dokumentasjon ?? []) {
    const funnet = vedlegg.get(id.toLowerCase());
    if (!funnet)
      return {
        godtatt: false,
        feil: 'REGELBRUDD',
        avvisning: avvis('VEDLEGG_FINNES_IKKE', `Vedlegget ${id} finnes ikke i saken.`),
      };
    bundne.push(funnet);
  }

  const eventId = kontekst.nyId();
  const utdypninger: Utdypninger = new Map();
  let data: Data;
  try {
    data = dokument(k, u, kjerne, kontekst.nyId, utdypninger, bygde, bundne);
  } catch (feil) {
    // Frysingen leser standpunktene kjernen nettopp skrev; kan den ikke det, er raden feil.
    if (feil instanceof Uforstaatt)
      throw new Skrivefeil(`Kjernen forstår ikke dokumentet den selv skriver: ${feil.message}`);
    throw feil;
  }
  const rad: Journalrad = {
    event_id: eventId,
    sak_id: kontekst.sakId,
    event_type: 'dokument_registrert',
    versjon: (journal.at(-1)?.versjon ?? 0) + 1,
    tidsstempel: tidspunkt.toISOString(),
    aktor_id: kontekst.aktoerId,
    aktor_rolle: kontekst.part,
    aktor_team_id: kontekst.teamId,
    refererer_til_event_id: null,
    format: kjerne.format,
    data,
  };
  let brevtekst: Avsnitt[] | null;
  try {
    brevtekst = brevtekstFor(rad, lest, u, kjerne, utdypninger);
  } catch (feil) {
    if (feil instanceof BrevetAvvises)
      return {
        godtatt: false,
        feil: 'REGELBRUDD',
        avvisning: { regel: feil.regel, melding: feil.message },
      };
    throw feil;
  }
  if (brevtekst) data.brevtekst = brevtekst;
  if (sendes) {
    const avvik = tekstavvik(k.brevtekst, brevtekst);
    if (avvik) return { godtatt: false, feil: 'REGELBRUDD', avvisning: avvik };
  }
  // Kjernen må forstå det den selv skriver (MM-U2, 7.1.2 i designnotatet). Hver rad leses
  // for seg, så bare den nye leses; hele journalen utledes på nytt med den.
  const etter = utled([...lest, ...lesJournal([rad], kjerne.leserformat)], kjerne.regler);
  if (!etter.forstaatt)
    throw new Skrivefeil(
      `Kjernen forstår ikke dokumentet den selv skriver: ${etter.begrensninger.map((b) => b.grunn).join('; ')}`
    );
  return { godtatt: true, hendelser: [rad] };
}

/**
 * A1 i paragrafmatrisen (LV-U2, B-13 om regelversjon): teksten avsenderen
 * godkjente, er den som fryses. Kommandoen bærer de låste avsnittene klienten
 * viste, og de må være like dem serveren lager, i samme rekkefølge. Mangler
 * teksten, avvises kommandoen; kontrollen er ikke fail-open.
 */
function tekstavvik(vist: string[] | undefined, laget: Avsnitt[] | null): Avvisning | null {
  if (laget === null)
    return vist === undefined
      ? null
      : avvis('ANNEN_BREVTEKST', 'Et registrert brev har ingen tekst fra appen (MM-U17).');
  if (vist === undefined)
    return avvis(
      'BREVTEKST_MANGLER',
      'Kommandoen må ha den låste teksten avsenderen har sett og godkjent (LV-U2).'
    );
  const laast = laget.map((a) => a.laast);
  return laast.length === vist.length && laast.every((t, i) => t === vist[i])
    ? null
    : avvis(
        'ANNEN_BREVTEKST',
        'Teksten avsenderen har sett, er ikke den serveren lager. Last inn saken på nytt, og last inn appen på nytt om den er oppdatert.'
      );
}

/**
 * LV-U2, LV-U3: teksten i brevet appen sender, laget av alle partens utsagn i det.
 * Et registrert brev, som et varsel sendt utenfor appen, får ingen (MM-U17).
 * Grunnlagssvaret og om sporene er subsidiære, leses av utledningen før brevet og
 * kommer som argumenter, så `frosset/` ikke når utledningen (A6).
 */
function brevtekstFor(
  rad: Journalrad,
  lest: ReturnType<typeof lesJournal>,
  u: Utledning,
  kjerne: Kjerne,
  utdypninger: Utdypninger
): Avsnitt[] | null {
  const [ny] = lesJournal([rad], kjerne.leserformat);
  if (ny.art !== 'dokument')
    throw new Skrivefeil(
      `Kjernen forstår ikke dokumentet den selv skriver: ${ny.art === 'ukjent' ? ny.grunn : ny.art}`
    );
  if (erRegistrert(ny.dokument.opplysninger)) return null;
  const sak = lest.find((h) => h.art === 'sak');
  if (sak?.art !== 'sak') throw new Skrivefeil('Saken har ingen tittel å sette i brevteksten.');
  try {
    return lagBrevtekst(
      ny.dokument,
      lest,
      {
        saksnummer: rad.sak_id,
        tittel: sak.tittel,
        grunnlagssvar: u.spor.grunnlag.gjeldendeSvar?.id ?? null,
        subsidiaer: { vederlag: u.spor.vederlag.subsidiaer, frist: u.spor.frist.subsidiaer },
      },
      kjerne.regler,
      utdypninger
    );
  } catch (feil) {
    if (feil instanceof KanIkkeUttrykkes)
      throw new Skrivefeil(`Kjernen kan ikke lage brevteksten: ${feil.message}`);
    throw feil;
  }
}

/**
 * Fryser brevet i hvert svar i en rad som er registrert uten kommandoen, for
 * eksempel registrert korrespondanse (merknaden til MM-U9, GR-U12). Kategorien
 * brevet regnes med, leses fra radene før, også når saken ikke er forstått.
 * Kaster `Uforstaatt` når et svar ikke kan leses.
 */
export function frysBrev(rad: Journalrad, foer: Journalrad[], kjerne: Kjerne): void {
  const grunnlagskrav: Krav[] = [];
  for (const h of lesJournal(foer, kjerne.leserformat))
    if (h.art === 'dokument')
      grunnlagskrav.push(...h.dokument.krav.filter((k) => k.spor === 'grunnlag'));
  for (const s of (rad.data.svar ?? []) as Data[]) {
    // Kategorien i grunnlagskravet: § 32.2 i grunnlaget (GR-U12), § 34.1.2 i vederlaget (HF-U1, #342).
    const krav = grunnlagskrav.find(
      (k) => k.id === (s.spor === 'grunnlag' ? s.gjelder : s.grunnlagskrav)
    );
    s.beslutningsgrunnlag = lagret(frys(s, krav, kjerne.regler));
  }
}
