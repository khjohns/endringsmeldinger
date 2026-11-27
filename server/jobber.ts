/**
 * Jobbkjøreren (L-1a, #741): løkka som gjør jobbene i `koe.jobb` etter commit.
 * Drivmekanismen er arbeidsvalget 18.10 for B-07 i #741: `koe_api.hent_jobb` henter
 * med `READPAST, UPDLOCK` og gir jobben en lease, og løkka i serverprosessen poller.
 * `vekk()` etter en opprettelse korter ventetiden, men det er pollingen som sikrer
 * at jobben blir gjort. Løkka krever en instans som alltid kjører (B-07, B-12).
 *
 * Jobbene er topicen for en ny sak og leveringen av et brev med vedleggene (L-1b, #371;
 * V-3, #790). `koe_api.hent_jobb` henter leveringen først når saken har topicen
 * (LV-U9). Etter jobbene behandler løkka hendelsene i innboksen fra webhooken
 * (`server/hendelser.ts`, #819). Med en kilde for HR-dataene synkroniserer løkka også
 * HR-kopien, høyst én gang per `HR_INTERVALL_MS` (`server/hrdata.ts`, #831).
 * Bare en gyldig lease kvitterer (invariant 7). Et usikkert eller varig avvist
 * utfall parkeres og logges, og driften starter jobben på nytt med `koe_api.start_jobb_paa_nytt`
 * (svaret «Driften» 18.10, #371). Prosedyrene for løkka kjører som
 * `koe_jobbkjoerer` i basen, fordi løkka ikke har noen aktør i konteksten
 * (`database/migrasjoner/20261018100000_jobber.sql`).
 */

import { loggFeil, loggInfo, medLoggkontekst, type Loggmottaker } from './logg.ts';
import {
  CatendaAvvisning,
  CatendaOppsettfeil,
  CatendaUtilgjengelig,
  medEndringsflagg,
  sammenlignbarDokumentId,
  UsikkertCatendautfall,
  VarigCatendaavvik,
  type Dokumentleverandoer,
  type Dokumentmaal,
  type Innboksoppslag,
  type Referanse,
  type Topicoppretter,
} from './catenda.ts';
import { uuidMedBindestreker } from './autorisasjon.ts';
import {
  CommitIkkeSendt,
  feilnummer,
  FristUtloept,
  sql,
  TransaksjonAvbrutt,
  utenKontekst,
  UsikkertUtfall,
  type Pool,
} from './datalag.ts';
import {
  appensKommentar,
  behandle,
  kommentartekst,
  kvitterKommentar,
  nesteInnkommende,
  nesteKommentar,
  registrerBehandling,
  registrerForsoek,
  TopicenFinnesIkke,
  type Behandling,
} from './hendelser.ts';
import { HR_INTERVALL_MS, synkroniserHr, type HrKilde } from './hrdata.ts';
import { LaasFeilet, LaasIkkeGitt } from './kommandoer.ts';
import { ryddUtloepte } from './sesjon.ts';
import { MedlemskapetLaast } from './medlemskap.ts';
import { brevdokument, dokumentnavn, pdfsum, UgjengivbartBrev, vedleggsnavn } from './levering.ts';

const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Leveringen fornyer leasen hver tredjedel av leasetiden så lenge den pågår, fordi et oppslag
 * i biblioteket blar side for side og ikke har noen øvre tid (#877 p16). Leasen holder da
 * om én fornyelse på rad feiler, ikke to. Topicen er ett kall med tidsavbrudd (15 s) og
 * kvitteringen.
 */
export const LEASETID_S = 120;
const FORNYELSE_MS = (LEASETID_S * 1000) / 3;
/**
 * Så mye av leasen som må være igjen før en endring i Catenda: ett kall (15 s) og litt
 * til. Feiler fornyelsen forbigående så lenge at mindre er igjen, regnet fra da den siste
 * vellykkede fornyelsen ble sendt, kan en annen kjører ha hentet jobben (#926).
 */
const RESTTID_FOER_ENDRING_MS = 20_000;
/**
 * Pausen før det andre forsøket på å registrere feilen. En flytting i Azure SQL varer
 * gjerne i sekunder, og leasen holder lenge nok (#877 p15, #926).
 */
export const PAUSE_FOER_NY_REGISTRERING_MS = 5_000;
export const POLLEINTERVALL_MS = 10_000;
/** Hvor ofte løkka sletter utløpte sesjoner og innloggingsforsøk (#1059). */
export const RYDDEINTERVALL_MS = 15 * 60_000;

interface Jobbrad {
  korrelasjons_id: string | null;
  aktor_id: string | null;
  jobb_id: string;
  jobbtype: string;
  lease: string;
  sak_id: string;
  prosjekt_id: string;
  catenda_board_id: string | null;
  tittel: string | null;
  dokumentnoekkel: string | null;
  oppdrag: string | null;
  topic_board_id: string | null;
  topic_id: string | null;
  dokument_id: string | null;
}

export interface Jobbavhengigheter {
  datalag: Pool;
  catenda: Topicoppretter;
  dokumenter: Dokumentleverandoer;
  /** Oppslagene for behandlingen av innboksen (W-1b.1, #819). Uten dem behandles den ikke. */
  innboks?: Innboksoppslag;
  /** Kilden for HR-kopien (S-1c del 2, #831). Uten den synkroniseres den ikke. */
  hr?: HrKilde;
  /** Adressen til saken i appen, for beskrivelsen i topicen (#741 punkt 15). */
  saksadresse: (prosjektId: string, sakId: string) => string;
  /** Tiden ventetiden i innboksen regnes fra; basens klokke når den mangler. */
  klokke?: () => Date;
  logg?: Loggmottaker;
}

/** Jobben kan ikke gjøres av denne kjøreren. Forsøket kan ha bedt Catenda om endringer før. */
class UgjennomfoerbarJobb extends Error {}

/** En kvittering som ble avvist etter at endringen i Catenda er gjort. */
class AvvistKvittering extends Error {}

/** Fornyelsen fant at leasen ikke gjelder lenger (54001), så forsøket skriver ikke mer (#926). */
class TaptLease extends Error {}

/**
 * Fornyelsen har feilet forbigående så lenge at leasen kan være ute før neste endring i
 * Catenda (#926). Leasen kan fortsatt gjelde, så forsøket registreres som feilet.
 */
class UfornyetLease extends Error {}

const LEASEN_GJELDER_IKKE = 54001;
/** Boardet med utfallet er verken prosjektets topicboard eller boardet i sakens topickobling (`registrer_behandling`, #972 punkt 8). */
const ANNET_BOARD = 54003;

type Utfall = 'feilet' | 'usikkert' | 'avvist';

/**
 * Feilnumrene fra SQL Server som går over: vranglås, tidsavbrudd for en lås, og
 * Azure SQL som er opptatt eller flytter basen.
 */
const FORBIGAAENDE_SQL = new Set([
  1205, 1222, 4060, 10928, 10929, 40197, 40501, 40613, 49918, 49919, 49920,
]);

/**
 * Kodene i mssql og tedious for en feil uten nummer som gjelder forbindelsen. En annen
 * feil uten nummer, som en parameter tedious avviser (EPARAM), går ikke over (#877 p14).
 */
const FORBIGAAENDE_KODER = new Set([
  'ETIMEOUT',
  'ESOCKET',
  'ECONNRESET',
  'ECONNCLOSED',
  'ECLOSE',
  'ENOCONN',
  'ENOTOPEN',
]);

/**
 * Catenda svarer ikke, uten et varig avvik eller en avvisning, basen har en forbigående
 * feil, eller transaksjonen er ikke committet av en grunn som kan gå over.
 */
function forbigaaende(feil: unknown): boolean {
  const varig = feil instanceof CatendaAvvisning || feil instanceof VarigCatendaavvik;
  return (
    (feil instanceof CatendaUtilgjengelig && !varig) ||
    feil instanceof UfornyetLease ||
    forbigaaendeISql(feil) ||
    ikkeCommittet(feil)
  );
}

/**
 * Datalaget vet at transaksjonen ikke er committet, så et nytt forsøk med samme
 * kommando-ID er trygt (#1009). Har serveren rullet tilbake etter en feil fra basen som
 * ikke går over, gir et nytt forsøk samme feil, og det prøves ikke.
 */
function ikkeCommittet(feil: unknown): boolean {
  if (feil instanceof FristUtloept || feil instanceof CommitIkkeSendt) return true;
  if (!(feil instanceof TransaksjonAvbrutt)) return false;
  return !(feil.cause instanceof sql.MSSQLError) || forbigaaendeISql(feil.cause);
}

function forbigaaendeISql(feil: unknown): boolean {
  if (!(feil instanceof sql.MSSQLError)) return false;
  // En RequestError fra mssql har koden fra tedious ('ETIMEOUT') i `number` når basen ikke ga et.
  const nummer = feilnummer(feil);
  if (typeof nummer === 'number') return FORBIGAAENDE_SQL.has(nummer);
  return feil instanceof sql.ConnectionError || FORBIGAAENDE_KODER.has(feil.code);
}

/**
 * Meldingene fra catenda.ts, levering.ts og kjøreren har ingen svarkropp eller token. De
 * kan ha en ID fra Catenda, som GUID-en til en referanse med bare trygge tegn i
 * `VarigCatendaavvik` (#895); andre feil lagres ikke. Bare Catenda, basen og fornyelsen av leasen (`UfornyetLease`) kan svikte
 * forbigående (#795 punkt 1). Et tapt svar fra Catenda parkeres som usikkert, utenom i et
 * forsøk som `avstemmes`: der finner neste forsøk det som ble laget, og jobben prøves igjen
 * (#876 punkt 4). En annen feil går ikke over av seg selv og parkeres (#783 punkt 2): som
 * avvist når forsøket ikke har bedt Catenda om noen endring, ellers som usikker, fordi den
 * kan komme etter en endring i Catenda (#813 punkt 5). Det samme gjelder et varig avvik
 * eller en avvisning fra Catenda og en jobb som ikke kan gjøres (#876, #921): avvist bare
 * når Catenda ikke er endret (oppdragsgiver 19.10 og 20.10).
 */
function utfallAv(
  feil: unknown,
  endringBedt: boolean,
  avstemmes: boolean
): { utfall: Utfall; melding: string } {
  const kjent =
    feil instanceof CatendaUtilgjengelig ||
    feil instanceof UfornyetLease ||
    feil instanceof UgjennomfoerbarJobb ||
    feil instanceof UgjengivbartBrev;
  const melding = kjent ? feil.message : 'Uventet feil i jobben';
  if (feil instanceof UsikkertCatendautfall)
    return { utfall: avstemmes ? 'feilet' : 'usikkert', melding };
  if (forbigaaende(feil)) return { utfall: 'feilet', melding };
  return { utfall: endringBedt ? 'usikkert' : 'avvist', melding };
}

/**
 * Henter og gjør én jobb. Sann når en jobb ble hentet, også når den feilet.
 * En feil i basen kastes; løkka logger den og prøver igjen ved neste runde.
 */
export async function kjoerEnJobb(avh: Jobbavhengigheter): Promise<boolean> {
  // Før kallet, så leasen regnes fra et tidspunkt basen ikke har gitt den før.
  const hentet = performance.now();
  const svar = await utenKontekst(avh.datalag)
    .input('leasetid_sekunder', sql.Int, LEASETID_S)
    .execute<Jobbrad>('koe_api.hent_jobb');
  const jobb = svar.recordset[0];
  if (!jobb) return false;
  return medLoggkontekst(
    () => utfoerJobb(avh, jobb, hentet),
    {
      korrelasjons_id: jobb.korrelasjons_id,
      aktor_id: jobb.aktor_id,
      prosjekt_id: jobb.prosjekt_id,
      jobb_id: jobb.jobb_id,
    },
    avh.logg
  );
}

async function utfoerJobb(avh: Jobbavhengigheter, jobb: Jobbrad, hentet: number): Promise<boolean> {
  const lease = () => utenKontekst(avh.datalag).input('lease', sql.UniqueIdentifier, jobb.lease);
  // Neste forsøk av en levering avstemmes mot Catenda (`lever`); en topic gjør ikke det.
  const avstemmes = jobb.jobbtype === 'levering';
  /** Kalleren sier om steget avstemmes, og da prøves en forbigående feil igjen som `feilet`. */
  const kvittering =
    (stegetAvstemmes: boolean): Kvitter =>
    async (prosedyre, parametre) => {
      try {
        const foresp = lease();
        for (const [navn, [type, verdi]] of Object.entries(parametre))
          foresp.input(navn, type, verdi);
        await foresp.execute(prosedyre);
      } catch (feil) {
        if (stegetAvstemmes && forbigaaendeISql(feil)) throw feil;
        // Endringen finnes i Catenda uten kvittering; neste henting parkerer jobben som usikker.
        loggFeil('Jobben fikk svar fra Catenda, men kvitteringen ble avvist', feil, 'error', {
          catenda_svar: Object.fromEntries(
            Object.entries(parametre).map(([navn, [, verdi]]) => [navn, verdi])
          ),
        });
        throw new AvvistKvittering('Kvitteringen ble avvist', { cause: feil });
      }
    };
  const flagg = { endringBedt: false };

  try {
    if (jobb.jobbtype === 'catenda_topic') {
      const topic = await medEndringsflagg(flagg, () =>
        avh.catenda.opprettTopic(jobb.catenda_board_id!, {
          tittel: jobb.tittel!,
          beskrivelse: `Saken i endringsappen: ${avh.saksadresse(jobb.prosjekt_id, jobb.sak_id)}`,
        })
      );
      // Samme form som topicene fra webhooken, så den unike begrensningen gjelder begge (#819).
      const topicId = uuidMedBindestreker(topic.guid) ?? topic.guid;
      await kvittering(false)('koe_api.kvitter_topic', {
        topic_id: [sql.NVarChar(100), topicId],
        topic_nummer: [sql.Int, topic.nummer],
      });
      loggInfo('Jobben laget topicen for saken', undefined);
    } else if (jobb.jobbtype === 'levering') {
      let leasenTapt = false;
      let fornyet = hentet;
      const brevPdf = async (pdf: Uint8Array | null) => {
        const lagret = await lease()
          .input('pdf', sql.VarBinary(sql.MAX), pdf && Buffer.from(pdf))
          .input('pdf_sha256', sql.NVarChar(64), pdf && pdfsum(pdf))
          .execute<{ pdf: Buffer }>('koe_api.lagre_brevdokument');
        const rad = lagret.recordset[0];
        return rad ? new Uint8Array(rad.pdf) : null;
      };
      const lager: Leveringslager = {
        lagret: () => brevPdf(null),
        lagre: async (pdf) => (await brevPdf(pdf))!,
        vedlegg: async () =>
          (await lease().execute<Vedleggsrad>('koe_api.vedlegg_i_levering')).recordset,
        async vedleggsinnhold(vedleggId) {
          const svar = await lease()
            .input('vedlegg_id', sql.UniqueIdentifier, vedleggId)
            .execute<{ innhold: Buffer }>('koe_api.vedleggsinnhold');
          const rad = svar.recordset[0];
          return rad ? new Uint8Array(rad.innhold) : null;
        },
        kvitter: kvittering(true),
        foerEndring() {
          if (leasenTapt) throw new TaptLease('Leasen gjelder ikke lenger');
          if (performance.now() - fornyet > LEASETID_S * 1000 - RESTTID_FOER_ENDRING_MS)
            throw new UfornyetLease('Leasen er ikke fornyet, og kan være ute før endringen');
        },
      };
      const fornyelse = setInterval(() => {
        const sendt = performance.now();
        lease()
          .input('leasetid_sekunder', sql.Int, LEASETID_S)
          .execute('koe_api.forny_lease')
          .then(() => {
            fornyet = Math.max(fornyet, sendt);
          })
          .catch((feil) => {
            if (feilnummer(feil) === LEASEN_GJELDER_IKKE) leasenTapt = true;
            loggFeil('Jobben fikk ikke fornyet leasen', feil, 'warn');
          });
      }, FORNYELSE_MS);
      try {
        await medEndringsflagg(flagg, () => lever(avh.dokumenter, jobb, lager));
      } finally {
        clearInterval(fornyelse);
      }
      loggInfo('Jobben leverte brevet og vedleggene til topicen', undefined);
    } else {
      throw new UgjennomfoerbarJobb(`Jobbtypen ${jobb.jobbtype} er ukjent for kjøreren`);
    }
  } catch (feil) {
    if (feil instanceof AvvistKvittering) throw feil.cause;
    if (feil instanceof TaptLease || feilnummer(feil) === LEASEN_GJELDER_IKKE) {
      // Uten lease kan ikke forsøket registreres; `hent_jobb` avgjør jobben når leasen er ute.
      loggFeil('Jobben mistet leasen og stoppet før neste endring i Catenda', feil, 'error');
      return true;
    }
    const { utfall, melding } = utfallAv(feil, flagg.endringBedt, avstemmes);
    if (feil instanceof CatendaOppsettfeil)
      loggFeil('Jobben venter på at driften retter oppsettet mot Catenda', feil, 'error');
    // Om en jobb som feilet, prøves igjen, avgjør registreringen; loggen etter den sier det.
    else if (utfall === 'feilet') loggFeil('Jobben feilet', feil, 'warn');
    else loggFeil('Jobben er parkert', feil, 'error', { utfall });
    const registrer = () =>
      lease()
        .input('utfall', sql.NVarChar(20), utfall)
        .input('melding', sql.NVarChar(400), melding)
        .execute<{ tilstand: string }>('koe_api.registrer_jobbfeil');
    let registrert;
    try {
      registrert = await registrer();
    } catch (feilIBasen) {
      if (feilnummer(feilIBasen) === LEASEN_GJELDER_IKKE) {
        loggFeil('Jobben mistet leasen før feilen ble registrert', feilIBasen, 'error');
        return true;
      }
      // Går leasen ut uten registrering, parkerer `hent_jobb` jobben som usikker (#877 p15).
      if (!forbigaaendeISql(feilIBasen)) throw feilIBasen;
      loggFeil('Jobben fikk ikke registrert feilen og prøver igjen', feilIBasen, 'warn');
      await pause(PAUSE_FOER_NY_REGISTRERING_MS);
      try {
        registrert = await registrer();
      } catch (igjen) {
        if (feilnummer(igjen) !== LEASEN_GJELDER_IKKE) throw igjen;
        loggFeil('Jobben mistet leasen før feilen ble registrert', igjen, 'error');
        return true;
      }
    }
    // Basen parkerer en levering etter et fast antall forsøk (svar A 11.11 i #1791).
    if (utfall === 'feilet' && registrert.recordset[0]?.tilstand === 'parkert')
      loggFeil('Jobben har brukt opp forsøkene og er parkert', feil, 'error');
    else if (utfall === 'feilet') loggInfo('Jobben prøves igjen', undefined);
  }
  return true;
}

/**
 * Så mange forsøk der Catenda ikke fant topicen, minst om lag tre timer, før det gir et utfall.
 * Forsøk som feilet av en annen grunn, teller ikke.
 */
export const FORSOEK_UTEN_TOPIC = 10;

/**
 * Behandler den eldste hendelsen i innboksen som ikke venter, og lagrer utfallet. Sann når
 * en hendelse ble prøvd. Kan utfallet ikke avgjøres nå, fordi Catenda eller basen ikke
 * svarer, utfallet av skrivingen er usikkert, låsen på kommandoen eller medlemskapet ikke
 * ble tatt, eller Catenda ikke finner topicen, lagres forsøket. Hendelsen venter da før
 * neste forsøk, og løkka går videre til neste hendelse, så én hendelse ikke stenger
 * innboksen (#963). En topic Catenda ikke har funnet i `FORSOEK_UTEN_TOPIC` forsøk, gir
 * `ugyldig_hendelse`. En annen feil gir utfallet `feilet`, som blir stående.
 */
export async function behandleEnHendelse(avh: Jobbavhengigheter): Promise<boolean> {
  if (!avh.innboks) return false;
  const rad = await nesteInnkommende(avh.datalag, avh.klokke?.());
  if (!rad) return false;
  return medLoggkontekst(
    () => utfoerHendelse(avh, rad),
    { korrelasjons_id: rad.korrelasjons_id, innkommende_hendelse_id: rad.id },
    avh.logg
  );
}

async function utfoerHendelse(
  avh: Jobbavhengigheter,
  rad: NonNullable<Awaited<ReturnType<typeof nesteInnkommende>>>
): Promise<boolean> {
  let behandling: Behandling;
  try {
    behandling = await behandle({ datalag: avh.datalag, catenda: avh.innboks! }, rad);
  } catch (feil) {
    // Etter et usikkert utfall kan saken være lagret; et nytt forsøk med samme kommando-ID
    // finner den i kvitteringen.
    if (feil instanceof TopicenFinnesIkke && rad.forsoek_uten_topic + 1 >= FORSOEK_UTEN_TOPIC) {
      behandling = feil.behandling;
    } else if (
      feil instanceof TopicenFinnesIkke ||
      forbigaaende(feil) ||
      feil instanceof UsikkertUtfall ||
      feil instanceof LaasIkkeGitt ||
      feil instanceof LaasFeilet ||
      feil instanceof MedlemskapetLaast
    ) {
      loggFeil('Hendelsen i innboksen prøves igjen senere', feil, 'warn');
      await registrerForsoek(
        avh.datalag,
        rad.id,
        'behandling',
        feilmelding(feil),
        feil instanceof TopicenFinnesIkke
      );
      return true;
    } else {
      loggFeil('Hendelsen i innboksen kunne ikke behandles', feil, 'error');
      behandling = { utfall: 'feilet', melding: 'Uventet feil i behandlingen' };
    }
  }
  try {
    await registrerBehandling(avh.datalag, rad, behandling);
  } catch (feil) {
    // Koblingen er endret etter oppslaget. Et nytt forsøk slår opp prosjektet på nytt.
    if (feilnummer(feil) !== ANNET_BOARD) throw feil;
    loggFeil('Hendelsen i innboksen prøves igjen senere', feil, 'warn');
    await registrerForsoek(avh.datalag, rad.id, 'behandling', feilmelding(feil), false);
    return true;
  }
  loggInfo('Hendelsen i innboksen er behandlet', { utfall: behandling.utfall });
  return true;
}

/** Klassen og meldingen, uten stakken; meldingene fra Catenda og basen har ikke saksdata. */
const feilmelding = (feil: unknown) =>
  feil instanceof Error ? `${feil.constructor.name}: ${feil.message}` : 'Ukjent feil';

/**
 * Skriver kommentaren for det eldste utfallet som skal ha en, og kvitterer den (W-1b.2,
 * #819). Sann når et utfall ble prøvd. Kommentarene på topicen leses først, og har
 * integrasjonen skrevet teksten der alt, kvitteres den kommentaren (#972). Da gir et nytt forsøk etter et tapt svar, eller to
 * hendelser for samme topic og utfall, én kommentar. Feiler et steg, lagres forsøket, og
 * utfallet venter før neste forsøk, som i `behandleEnHendelse`.
 */
export async function skrivEnKommentar(avh: Jobbavhengigheter): Promise<boolean> {
  if (!avh.innboks) return false;
  const rad = await nesteKommentar(avh.datalag, avh.klokke?.());
  if (!rad) return false;
  return medLoggkontekst(
    () => utfoerKommentar(avh, rad),
    {
      korrelasjons_id: rad.korrelasjons_id,
      prosjekt_id: rad.prosjekt_id ?? undefined,
      innkommende_hendelse_id: rad.id,
    },
    avh.logg
  );
}

async function utfoerKommentar(
  avh: Jobbavhengigheter,
  rad: NonNullable<Awaited<ReturnType<typeof nesteKommentar>>>
): Promise<boolean> {
  const innboks = avh.innboks!;
  const tekst = kommentartekst(rad, avh.saksadresse);
  try {
    if (!tekst) throw new Error(`Utfallet ${rad.utfall} har ingen kommentar`);
    const { catenda_board_id: board, catenda_topic_id: topic } = rad;
    const epost = await innboks.integrasjonensEpost();
    const funnet = (await innboks.kommentarer(board, topic)).find((k) =>
      appensKommentar(k, tekst, epost)
    );
    const id = funnet?.id ?? (await innboks.opprettKommentar(board, topic, tekst));
    await kvitterKommentar(avh.datalag, rad.id, id);
    loggInfo('Kommentaren for hendelsen i innboksen er skrevet', undefined);
  } catch (feil) {
    loggFeil('Kommentaren for hendelsen i innboksen prøves igjen senere', feil, 'warn');
    await registrerForsoek(avh.datalag, rad.id, 'kommentar', feilmelding(feil), false);
  }
  return true;
}

type Kvitter = (
  prosedyre: string,
  parametre: Record<
    string,
    [type: sql.ISqlType | (() => sql.ISqlType), verdi: string | number | null]
  >
) => Promise<void>;

interface Vedleggsrad {
  vedlegg_id: string;
  filnavn: string;
  finnes: boolean;
  dokument_id: string | null;
  referanse_id: string | null;
}

/** Det leveringen leser og skriver i basen, med leasen til forsøket. */
interface Leveringslager {
  lagret: () => Promise<Uint8Array | null>;
  lagre: (pdf: Uint8Array) => Promise<Uint8Array>;
  vedlegg: () => Promise<Vedleggsrad[]>;
  /** `null` når innholdet er slettet etter kvitteringen (LV-U12). */
  vedleggsinnhold: (vedleggId: string) => Promise<Uint8Array | null>;
  kvitter: Kvitter;
  /** Kaster når leasen ikke gjelder lenger, før hver endring i Catenda. */
  foerEndring: () => void;
}

/**
 * Leverer brevet (B-03, #371) og vedleggene det binder (V-3, #790): hvert dokument i
 * biblioteket, så referansen på topicen, hver operasjon kvittert for seg. Vedleggene
 * leveres først. Et vedlegg som alt står på topicen, leveres ikke igjen. Et registrert
 * brev har ikke noe dokument, bare vedlegg (LV-U11). Til slutt kvitterer
 * `koe_api.kvitter_levering` leveringen som fullført.
 *
 * PDF-en av brevet lagres før opplastingen, og det er den lagrede som lastes opp. Har
 * et tidligere forsøk lagret den, lages ingen ny (#371 del 2, #795 punkt 4). Hvert steg
 * avstemmes først, mot navnet i biblioteket og mot referansene på topicen, så et forsøk
 * etter en omstart eller et tapt svar ikke lager et dokument eller en referanse til.
 */
async function lever(catenda: Dokumentleverandoer, jobb: Jobbrad, lager: Leveringslager) {
  const oppdrag = JSON.parse(jobb.oppdrag!) as Record<string, unknown>;
  const maal = oppdrag.maal as Dokumentmaal;
  const board = jobb.topic_board_id!;
  const topic = jobb.topic_id!;
  let referanser: Referanse[] | null = null;
  const referanse = async (dokumentId: string) => {
    referanser ??= await catenda.dokumentreferanser(board, topic);
    const id = sammenlignbarDokumentId(dokumentId);
    const funnet = referanser.find((r) => r.dokumentId === id);
    if (funnet) return funnet.id;
    lager.foerEndring();
    return catenda.opprettDokumentreferanse(board, topic, dokumentId);
  };
  const dokument = async (navn: string, innhold: () => Promise<Uint8Array>) => {
    // Innholdet leses med leasen, så basen gir 54001 når leasen er tapt etter kontrollen.
    const lastOpp = async () => {
      lager.foerEndring();
      return catenda.lastOppDokument(maal, { navn, innhold: await innhold() });
    };
    const id =
      (await catenda.finnDokument(maal, navn)) ??
      (await lastOpp()) ??
      (await catenda.finnDokument(maal, navn));
    if (!id) throw new CatendaUtilgjengelig('Dokumentet finnes, men ble ikke funnet');
    return id;
  };

  for (const vedlegg of await lager.vedlegg()) {
    if (!vedlegg.finnes)
      throw new UgjennomfoerbarJobb('Et vedlegg i brevet er ikke bundet i saken');
    if (vedlegg.referanse_id) continue;
    const kvitterVedlegg = (operasjon: string, catenda_id: string) =>
      lager.kvitter('koe_api.kvitter_vedlegg', {
        vedlegg_id: [sql.UniqueIdentifier, vedlegg.vedlegg_id],
        operasjon: [sql.NVarChar(20), operasjon],
        catenda_id: [sql.NVarChar(100), catenda_id],
      });
    let dokumentId = vedlegg.dokument_id;
    if (!dokumentId) {
      dokumentId = await dokument(vedleggsnavn(vedlegg.filnavn, vedlegg.vedlegg_id), async () => {
        const innhold = await lager.vedleggsinnhold(vedlegg.vedlegg_id);
        if (!innhold) throw new UgjennomfoerbarJobb('Innholdet i vedlegget finnes ikke');
        return innhold;
      });
      await kvitterVedlegg('dokument', dokumentId);
    }
    await kvitterVedlegg('dokumentreferanse', await referanse(dokumentId));
  }

  if (oppdrag.dokument === null) {
    await lager.kvitter('koe_api.kvitter_levering', { referanse_id: [sql.NVarChar(100), null] });
    return;
  }
  let dokumentId = jobb.dokument_id;
  if (!dokumentId) {
    dokumentId = await dokument(
      dokumentnavn(oppdrag, jobb.dokumentnoekkel!),
      async () =>
        (await lager.lagret()) ??
        (await lager.lagre((await brevdokument(oppdrag, jobb.dokumentnoekkel!)).innhold))
    );
    await lager.kvitter('koe_api.kvitter_dokument', {
      dokument_id: [sql.NVarChar(100), dokumentId],
    });
  }
  await lager.kvitter('koe_api.kvitter_levering', {
    referanse_id: [sql.NVarChar(100), await referanse(dokumentId)],
  });
}

export interface Jobbkjoerer {
  /** Kjører neste runde straks, for eksempel etter en opprettelse. */
  vekk(): void;
  /** Stopper etter runden som pågår. */
  stopp(): Promise<void>;
}

/** Starter løkka: alle klare jobber, deretter en pause på `intervallMs` eller til `vekk()`. */
export function startJobbkjoerer(
  avh: Jobbavhengigheter,
  intervallMs = POLLEINTERVALL_MS
): Jobbkjoerer {
  let stoppet = false;
  let vekker: (() => void) | null = null;
  let vekket = false;
  let nesteHr = 0;
  let nesteRydding = 0;
  const vent = () =>
    new Promise<void>((ok) => {
      if (vekket || stoppet) return ok();
      const tidtaker = setTimeout(ok, intervallMs);
      vekker = () => {
        clearTimeout(tidtaker);
        ok();
      };
    }).finally(() => {
      vekker = null;
      vekket = false;
    });
  // Linjene fra løkka selv får kjørerens egen korrelasjons-ID.
  const loekke = medLoggkontekst(
    async () => {
      while (!stoppet) {
        try {
          while (!stoppet && (await kjoerEnJobb(avh)));
          while (!stoppet && (await behandleEnHendelse(avh)));
          while (!stoppet && (await skrivEnKommentar(avh)));
        } catch (feil) {
          loggFeil('Jobbkjøreren feilet', feil, 'error');
        }
        if (!stoppet && Date.now() >= nesteRydding) {
          nesteRydding = Date.now() + RYDDEINTERVALL_MS;
          await medLoggkontekst(async () => {
            try {
              const { sesjoner, forsoek } = await ryddUtloepte(avh.datalag);
              loggInfo('Utløpte sesjoner og innloggingsforsøk er slettet', {
                antall: sesjoner + forsoek,
              });
            } catch (feil) {
              loggFeil('Utløpte sesjoner og innloggingsforsøk ble ikke slettet', feil, 'error');
            }
          });
        }
        if (!stoppet && avh.hr && Date.now() >= nesteHr) {
          nesteHr = Date.now() + HR_INTERVALL_MS;
          const hr = avh.hr;
          await medLoggkontekst(async () => {
            try {
              const antall = await synkroniserHr(avh.datalag, hr);
              loggInfo('HR-kopien er synkronisert fra Graph', { antall });
            } catch (feil) {
              loggFeil('HR-kopien ble ikke synkronisert', feil, 'error');
            }
          });
        }
        await vent();
      }
    },
    {},
    avh.logg
  );
  return {
    vekk() {
      vekket = true;
      vekker?.();
    },
    async stopp() {
      stoppet = true;
      vekker?.();
      await loekke;
    },
  };
}
