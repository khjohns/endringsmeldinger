/**
 * Kjerneinngangene for saken: lesingen, kommandoene, opprettelsen og sakskoden (#1702).
 * Tilgangen hver inngang krever, står i rutene her, og ruteren i `app.ts` kontrollerer
 * den før behandleren kalles.
 */

import { opprettelse } from '../kjerne/kommandoer/opprettelse.ts';
import {
  utledJournal,
  vurder,
  vurderTrinnvis,
  type Utfall,
} from '../kjerne/kommandoer/skriving.ts';
import type { Avvisning, Journalrad, Sakskode as Kjernesakskode } from '../kjerne/typer.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import { visning } from '../kjerne/utledning/visning.ts';
import {
  lesekontekst,
  type Bruker,
  type Kontraktstilgang,
  type Prosjekttilgang,
} from './autorisasjon.ts';
import { UsikkertUtfall, UUID, type Kontekst, type Pool } from './datalag.ts';
import { fast, lagret, loggFeil, ugyldig, feilsvar } from './inngang.ts';
import { lesSaken, lesSakensMaal, type Leveringsmaal } from './lager.ts';
import type { Sakslenke } from './catenda.ts';
import {
  IngenTopicBoard,
  KommandoIdBrukt,
  kommandosum,
  KvittertBrevMangler,
  LaasIkkeGitt,
  lesNesteSakskode,
  LoepenummerTatt,
  opprettSak,
  opprettSakMedPaaberopelse,
  SakFinnesIkke,
  SakIdBrukt,
  SkrivingAvvist,
  skrivHendelse,
  UgyldigKommando,
  Versjonskonflikt,
  type Sakskode,
  type Skriveutfall,
} from './kommandoer.ts';
import { filnavn, KontraktsforkortelseMangler, lagOppdrag } from './levering.ts';
import { feilINySak, vedleggIder } from './nysak.ts';
import {
  finnesIkke,
  medSide,
  type Avhengigheter,
  type Forespoersel,
  type Opprettelsesforespoersel,
  type Opprettelsesrute,
  type Saksrute,
  type Svar,
} from './rutetyper.ts';

/** Kjernens avvisning av kommandoen, i samme form fra hver inngang (#743). */
const regelavvisning = ({ feil, avvisning }: { feil: string; avvisning: Avvisning }): Svar => [
  400,
  { success: false, error: feil, rule: avvisning.regel, message: avvisning.melding },
];

/**
 * Kommandoen kan være lagret. Klienten sender på nytt med samme kommando-ID og får
 * kvitteringen hvis den er det (#418). En annen feil enn `UsikkertUtfall` og
 * `LaasIkkeGitt` logges.
 */
function usikkert(feil: unknown): Svar {
  if (!(feil instanceof UsikkertUtfall || feil instanceof LaasIkkeGitt))
    loggFeil('Kommandoen feilet etter at skrivingen kan ha begynt', feil);
  return utfallUsikkert();
}

const utfallUsikkert = () =>
  feilsvar(
    503,
    'UTFALL_USIKKERT',
    'Det er usikkert om kommandoen ble lagret. Send den på nytt med samme kommando-ID.'
  );

/**
 * Svaret på en feil fra skrivelaget, felles for inngangene (#743). Skrivingen går i
 * én `transaksjon()`, som ruller tilbake når arbeidet kaster eller COMMIT ikke
 * sendes. Bare `UsikkertUtfall` (COMMIT uten svar) og `LaasIkkeGitt` (et annet
 * forsøk med samme ID kan committe) lar utfallet være uvisst. Hver annen feil er
 * kjent, med ingenting lagret, og gir 500 med en feilkode, ikke «Prøv igjen»
 * (oppdragsgiver 19.10, svar 3 i #764; #877 #893-1 og #893-2).
 */
function skriveavvisning(feil: unknown): Svar {
  if (feil instanceof SkrivingAvvist) return feilsvar(403, 'FORBIDDEN', 'Du har ikke tilgang.');
  if (feil instanceof KontraktsforkortelseMangler)
    return feilsvar(
      409,
      'KONTRAKTSFORKORTELSE_MANGLER',
      'Prosjektet mangler kontraktsforkortelsen, så brevet kan ikke merkes. Brevet er ikke sendt.'
    );
  if (feil instanceof LoepenummerTatt)
    return feilsvar(
      409,
      'LOEPENUMMER_TATT',
      'En annen sak har fått nummeret i brevet. Brevet er ikke sendt. Se over brevet med det nye nummeret, og godkjenn det på nytt.'
    );
  if (feil instanceof UgyldigKommando) return ugyldig('Basen avviste kommandoen.');
  if (feil instanceof KommandoIdBrukt)
    return feilsvar(422, 'KOMMANDO_ID_BRUKT', 'Kommando-ID-en er brukt for en annen kommando.');
  if (feil instanceof UsikkertUtfall || feil instanceof LaasIkkeGitt) return utfallUsikkert();
  if (feil instanceof KvittertBrevMangler) {
    loggFeil('Brevet i kvitteringen ble ikke lest tilbake', feil);
    return feilsvar(
      500,
      'KVITTERT_BREV_MANGLER',
      'Kommandoen er kvittert som lagret, men brevet kunne ikke leses tilbake.'
    );
  }
  loggFeil('Kommandoen ble ikke lagret', feil);
  return feilsvar(500, 'INTERNAL_ERROR', 'Kommandoen ble ikke lagret på grunn av en feil.');
}

/** Kommando-ID-en fra kroppen når den er en UUID med små bokstaver, som basen krever (51422). */
const kommandoId = (kropp: Record<string, unknown>): string | null =>
  typeof kropp.kommando_id === 'string' && UUID.test(kropp.kommando_id) ? kropp.kommando_id : null;
const erHeltall = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** Visningen av journalen, med versjonen den er regnet fra. */
function sakenSomVises(journal: Journalrad[], kjerne: Kjerne) {
  const u = utledJournal(journal, kjerne);
  return { versjon: u.versjon, visning: visning(u, kjerne.regler) };
}

async function visSaken(
  { bruker, prosjekt, side, sakId }: Forespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const kontekst = lesekontekst(bruker, prosjekt.prosjektId, side);
  let saken;
  try {
    saken = await lesSaken(avh.datalag, kontekst, sakId, { navn: true });
  } catch (feil) {
    if (feil instanceof SakFinnesIkke) return finnesIkke();
    throw feil;
  }
  const { journal, oppdrag, navn, navnefeil } = saken;
  // Et navneoppslag som feiler, gir identiteten (CLAUDE.md). Loggen har feilen, ingen navn.
  if ('navnefeil' in saken) loggFeil(`Navneoppslaget i saken ${sakId} feilet`, navnefeil, 'warn');
  return [
    200,
    {
      success: true,
      part: side?.rolle ?? null,
      ...sakenSomVises(journal, avh.kjerne),
      journal: journal.map((r) => ({
        event_id: r.event_id,
        versjon: r.versjon,
        event_type: r.event_type,
        tidsstempel: r.tidsstempel,
        aktor_rolle: r.aktor_rolle,
        // Navnet vises for alle som kan lese saken (oppdragsgiver 18.10, #820).
        aktor_navn: navn.get(r.aktor_id) ?? r.aktor_id,
        format: r.format,
        data: r.data,
      })),
      leveringsoppdrag: oppdrag.map((o) => ({
        id: o.id,
        event_id: o.event_id,
        dokumentnoekkel: o.dokumentnoekkel,
        filnavn: filnavn(o.innhold),
        innhold_sha256: o.innhold_sha256,
        opprettet: o.opprettet,
        levert: o.levert,
      })),
      catenda_lenke: avh.sakslenke
        ? await catendaLenke(avh.datalag, kontekst, sakId, avh.sakslenke)
        : null,
    },
  ];
}

/**
 * Lenken til saken i Catenda. Den er en visningsdetalj: et oppslag som feiler, gir
 * ingen lenke og velter ikke lesingen, som navnet (CLAUDE.md).
 */
async function catendaLenke(
  datalag: Pool,
  kontekst: Kontekst,
  sakId: string,
  sakslenke: Sakslenke
): Promise<string | null> {
  try {
    const maal = await lesSakensMaal(datalag, kontekst, sakId);
    return maal && sakslenke(maal);
  } catch (feil) {
    loggFeil(`Oppslaget av lenken til Catenda i saken ${sakId} feilet`, feil, 'warn');
    return null;
  }
}

/**
 * Aktøren, siden og teamet er konteksten basen stempler; tidspunktet er basens klokke.
 * Teamet står bare når det er entydig (DL-U4, `krevKontraktsrolle`).
 */
const skrivekontekst = (bruker: Bruker, prosjekt: Prosjekttilgang, side: Kontraktstilgang) => ({
  aktor: bruker.id,
  prosjekt: prosjekt.prosjektId,
  side: side.rolle,
  ...(side.teamId ? { team: side.teamId } : {}),
});

/** Sakens kode til kjernen, som setter den i tittelen (LV-U27, LV-U44). */
const tilKjernen = ({ kode, loepenummer }: Sakskode): Kjernesakskode => ({ kode, loepenummer });

const KOMMANDOKROPP = new Set(['expected_version', 'kommando', 'kommando_id']);

async function sendKommando(f: Forespoersel, avh: Required<Avhengigheter>): Promise<Svar> {
  const { bruker, prosjekt, side, sakId, kropp } = f;
  const ukjente = Object.keys(kropp).filter((k) => !KOMMANDOKROPP.has(k));
  if (ukjente.length) return ugyldig(`Ukjente felt: ${ukjente.join(', ')}.`);
  const forventet = kropp.expected_version;
  if (!erHeltall(forventet)) return ugyldig('expected_version må være et heltall ≥ 0.');
  if (kropp.kommando === undefined) return ugyldig('kommando er påkrevd.');
  const id = kommandoId(kropp);
  if (id === null) return ugyldig('kommando_id mangler eller er ikke en UUID med små bokstaver.');
  const kommando = {
    id,
    sha256: kommandosum({
      rute: 'kommando',
      sak_id: sakId,
      expected_version: forventet,
      kommando: kropp.kommando,
    }),
  };
  // Kjernen får aktøren, siden og teamet fra samme kontekst som basen (#739 punkt 4).
  const kontekst = skrivekontekst(bruker, prosjekt, medSide(side));
  let utfall;
  try {
    utfall = await skrivHendelse(
      avh.datalag,
      kontekst,
      sakId,
      forventet,
      kommando,
      ({ journal, tidspunkt, maal, vedlegg, sakskode, kontraktsforkortelse, kontraktsfrister }) => {
        const kjernekontekst = (t: Date, kode: Sakskode) => ({
          sakId,
          aktoerId: kontekst.aktor,
          part: kontekst.side,
          teamId: kontekst.team ?? null,
          tidspunkt: () => t,
          nyId: avh.nyId,
          sakskode: tilKjernen(kode),
          kontraktsforkortelse,
          kontraktsfrister,
        });
        // VS-U53: et dokument fra kravskjemaet skrives som et registrert varsel før kravet, og
        // kravet er neste rad, med basens klokke for sin skriving.
        type Avvist = Extract<Utfall, { godtatt: false }>;
        const skrives = (vurdert: Utfall, foer: Journalrad[]): Skriveutfall<Avvist> => {
          if (!vurdert.godtatt) return { skriv: false, avvisning: vurdert };
          const [rad] = vurdert.hendelser;
          const etter = sakenSomVises([...foer, rad], avh.kjerne);
          const { neste } = vurdert;
          return {
            skriv: true,
            rad,
            oppdrag: lagOppdrag(rad, maal, etter.visning.status, avh.kjerne, avh.nyId),
            ...(neste
              ? {
                  neste: ({ tidspunkt: t, journal: j, sakskode: kode }) =>
                    skrives(neste(kjernekontekst(t, kode), j), j),
                }
              : {}),
          };
        };
        return skrives(
          vurderTrinnvis(
            kropp.kommando,
            kjernekontekst(tidspunkt, sakskode),
            journal,
            avh.kjerne,
            vedlegg
          ),
          journal
        );
      }
    );
  } catch (feil) {
    if (feil instanceof Versjonskonflikt)
      return [
        409,
        {
          success: false,
          error: 'VERSJONSKONFLIKT',
          expected_version: feil.forventet,
          current_version: feil.faktisk,
          message: 'Saken er endret. Last den inn på nytt.',
        },
      ];
    if (feil instanceof SakFinnesIkke) return finnesIkke();
    return skriveavvisning(feil);
  }
  if (!utfall.skriv) return regelavvisning(utfall.avvisning);
  // Visningen leses av det basen lagret, så svaret også prøver gjenlesingen. Den
  // regnes til og med brevet, så et gjentak får samme svar som det første, også om
  // saken har fått nye hendelser siden (#418, avgjørelse 2 i #764).
  try {
    const { journal, oppdrag } = await lesSaken(
      avh.datalag,
      lesekontekst(bruker, prosjekt.prosjektId, side),
      sakId
    );
    const tilBrevet = journal.filter((r) => r.versjon <= utfall.rad.versjon);
    return lagret(
      [
        201,
        {
          success: true,
          event_id: utfall.rad.event_id,
          leveringsoppdrag: oppdrag.find((o) => o.event_id === utfall.rad.event_id)?.id ?? null,
          ...sakenSomVises(tilBrevet, avh.kjerne),
        },
      ],
      utfallUsikkert
    );
  } catch (feil) {
    // Brevet er lagret; et nytt forsøk får kvitteringen og svaret.
    return usikkert(feil);
  }
}

/**
 * Oppretter saken og den første påberopelsen i én handling (KT-U11, #1487). Saks-ID-en er
 * klientens, fordi brevteksten har saksnummeret (LV-U4). Feltet heter `ny_sak_id`, ikke
 * `sak_id`, som tilgangskontrollen leser som en sak kroppen viser til og krever i prosjektet. Tittelen er én verdi, skrevet som
 * `sakstittel` i `sak_opprettet`, og brevteksten bruker den som navnet på forholdet (LV-U43). Kjernen prøver
 * påberopelsen mot `sak_opprettet` i minnet, med basens klokke, før noe skrives.
 *
 * Vedleggene i `paaberopelse.dokumentasjon` er lastet opp før saken fantes (#1037). Har TE
 * alt sendt varselet etter punkt 32.2, står det i `varsel` med datoen og dokumentet, som
 * også ligger ved påberopelsen (VS-U38, D-8). Kjernen prøver varselet mot påberopelsen før
 * noe skrives, så datoen ikke kan være senere enn påberopelsen (`oppgittDatoEtterBrevet`),
 * og det skrives som versjon 3 i samme transaksjon.
 */
async function opprettMedPaaberopelse(
  { bruker, prosjekt, side, kropp }: Opprettelsesforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const feil = feilINySak(kropp);
  if (feil) return ugyldig(feil);
  // `feilINySak` har prøvd formen på feltene.
  const {
    kommando_id: id,
    ny_sak_id: sakId,
    tittel,
    paaberopelse,
    brevtekst,
    varsel,
  } = kropp as {
    kommando_id: string;
    ny_sak_id: string;
    tittel: string;
    paaberopelse: Record<string, unknown> & { innhold: Record<string, unknown> };
    brevtekst?: unknown;
    varsel?: Record<string, unknown>;
  };
  const vedleggider = vedleggIder(paaberopelse);
  const krav = {
    ...paaberopelse,
    // LV-U43: tittelen er sakstittelen og navnet på forholdet; kravet har ingen egen.
    innhold: paaberopelse.innhold,
    ...(brevtekst === undefined ? {} : { brevtekst }),
  };
  const kommando = {
    id,
    sha256: kommandosum({
      rute: 'ny_sak',
      ny_sak_id: sakId,
      tittel,
      paaberopelse,
      brevtekst,
      varsel,
    }),
  };
  const kontekst = skrivekontekst(bruker, prosjekt, side);
  let utfall;
  try {
    utfall = await opprettSakMedPaaberopelse(
      avh.datalag,
      kontekst,
      sakId,
      kommando,
      vedleggider,
      ({ tidspunkt, vedlegg, sakskode, kontraktsforkortelse, kontraktsfrister }) => {
        const nySak = opprettelse({ type: 'opprett_sak', sakstittel: tittel }, side.rolle);
        if (!nySak.godtatt) return { skriv: false, avvisning: nySak };
        const opprettet: Journalrad = {
          event_id: avh.nyId(),
          sak_id: sakId,
          event_type: 'sak_opprettet',
          versjon: 1,
          tidsstempel: tidspunkt.toISOString(),
          aktor_id: kontekst.aktor.toLowerCase(),
          aktor_rolle: kontekst.side,
          aktor_team_id: kontekst.team ?? null,
          refererer_til_event_id: null,
          format: nySak.format,
          data: nySak.data,
        };
        // Uten kode (BH) avviser `opprettSakMedPaaberopelse` kommandoen etter `lag`.
        const kjernekontekst = (t: Date) => ({
          sakId,
          aktoerId: kontekst.aktor,
          part: kontekst.side,
          teamId: kontekst.team ?? null,
          tidspunkt: () => t,
          nyId: avh.nyId,
          sakskode: tilKjernen(sakskode),
          kontraktsforkortelse,
          kontraktsfrister,
        });
        const vurdert = vurder(krav, kjernekontekst(tidspunkt), [opprettet], avh.kjerne, vedlegg);
        if (!vurdert.godtatt) return { skriv: false, avvisning: vurdert };
        const [rad] = vurdert.hendelser;
        const status = sakenSomVises([opprettet, rad], avh.kjerne).visning.status;
        const varselet =
          varsel === undefined
            ? null
            : { type: 'varsel', spor: 'forhold', hjemmel: '32.2', ...varsel };
        const lagVarsel = (t: Date) => {
          const v = vurder(varselet, kjernekontekst(t), [opprettet, rad], avh.kjerne, vedlegg);
          if (!v.godtatt) return { skriv: false as const, avvisning: v };
          const [varselrad] = v.hendelser;
          const etter = sakenSomVises([opprettet, rad, varselrad], avh.kjerne).visning.status;
          return {
            skriv: true as const,
            rad: varselrad,
            oppdrag: (maal: Leveringsmaal) =>
              lagOppdrag(varselrad, maal, etter, avh.kjerne, avh.nyId),
          };
        };
        // Varselet prøves med påberopelsens klokke før noe skrives, så datoen ikke kan være
        // senere enn påberopelsen (VS-U38); det skrives med basens klokke for sin skriving.
        if (varselet) {
          const proeve = lagVarsel(tidspunkt);
          if (!proeve.skriv) return proeve;
        }
        return {
          skriv: true,
          opprettet,
          rad,
          oppdrag: (maal) => lagOppdrag(rad, maal, status, avh.kjerne, avh.nyId),
          varsel: varselet ? ({ tidspunkt: t }) => lagVarsel(t) : null,
        };
      }
    );
  } catch (feil) {
    if (feil instanceof IngenTopicBoard)
      return feilsvar(
        409,
        'INGEN_TOPIC_BOARD',
        'Prosjektet har ikke noe topic-board i Catenda for nye saker. Saken er ikke opprettet.'
      );
    if (feil instanceof SakIdBrukt)
      return feilsvar(409, 'SAK_ID_BRUKT', 'Saks-ID-en er brukt. Saken er ikke opprettet.');
    return skriveavvisning(feil);
  }
  if (utfall.skriv === false) return regelavvisning(utfall.avvisning);
  try {
    avh.vekkJobbkjoereren();
  } catch (feil) {
    // Saken og påberopelsen er lagret; et nytt forsøk får kvitteringen og vekker igjen.
    return usikkert(feil);
  }
  // `versjon` er sakens, så klienten kan sende den som `expected_version` (#1507). Varselet
  // er skrevet etter påberopelsen i samme transaksjon, og kommandosummen omfatter det, så
  // også et gjentak fra kvitteringen har det. `event_id` er påberopelsens, som kvitteringen.
  const { rad } = utfall;
  const versjon = rad.versjon + (varsel === undefined ? 0 : 1);
  return lagret(
    [201, { success: true, sak_id: rad.sak_id, event_id: rad.event_id, versjon }],
    utfallUsikkert
  );
}

/**
 * Oppretter saken med `sak_opprettet` som versjon 1. Kjernen avgjør om kommandoen
 * godtas, med parten fra kontraktsteamet; basen lager saks-ID-en. En kropp med `ny_sak_id`
 * oppretter saken med den første påberopelsen (#1487). Formen uten påberopelse brukes av
 * skjemaet og `saksrute.ts` til de går over (#1499).
 */
async function opprettNySak(
  forespoersel: Opprettelsesforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  if ('ny_sak_id' in forespoersel.kropp) return opprettMedPaaberopelse(forespoersel, avh);
  const { bruker, prosjekt, side, kropp } = forespoersel;
  const ukjente = Object.keys(kropp).filter((k) => k !== 'kommando' && k !== 'kommando_id');
  if (ukjente.length) return ugyldig(`Ukjente felt: ${ukjente.join(', ')}.`);
  if (kropp.kommando === undefined) return ugyldig('kommando er påkrevd.');
  const id = kommandoId(kropp);
  if (id === null) return ugyldig('kommando_id mangler eller er ikke en UUID med små bokstaver.');
  let utfall;
  try {
    const kommando = { id, sha256: kommandosum({ rute: 'opprettelse', kommando: kropp.kommando }) };
    // Kjernen vurderer etter at kvitteringen er lest, så et gjentak får saken (#792 punkt 2).
    utfall = await opprettSak(avh.datalag, skrivekontekst(bruker, prosjekt, side), kommando, () => {
      const vurdert = opprettelse(kropp.kommando, side.rolle);
      if (!vurdert.godtatt) return { skriv: false as const, avvisning: vurdert };
      return { format: vurdert.format, data: vurdert.data };
    });
  } catch (feil) {
    if (feil instanceof IngenTopicBoard)
      return feilsvar(
        409,
        'INGEN_TOPIC_BOARD',
        'Prosjektet har ikke noe topic-board i Catenda for nye saker. Saken er ikke opprettet.'
      );
    return skriveavvisning(feil);
  }
  if ('avvisning' in utfall) return regelavvisning(utfall.avvisning);
  try {
    avh.vekkJobbkjoereren();
  } catch (feil) {
    // Saken er lagret; et nytt forsøk får kvitteringen og vekker igjen.
    return usikkert(feil);
  }
  return lagret(
    [201, { success: true, sak_id: utfall.sak_id, versjon: utfall.versjon }],
    utfallUsikkert
  );
}

/**
 * Koden og løpenummeret brevkontrollen viser (LV-U46), i formen kjernen tar, og
 * kontraktsforkortelsen henvisningene i brevteksten bruker (LV-U53).
 */
const sakskodesvar = ({
  kode,
  loepenummer,
  tildelt,
  kontraktsforkortelse,
}: Sakskode & { kontraktsforkortelse: string | null }): Svar => [
  200,
  { success: true, kode, loepenummer, tildelt, kontraktsforkortelse },
];

async function visSakskode(f: Forespoersel, avh: Required<Avhengigheter>): Promise<Svar> {
  const kontekst = skrivekontekst(f.bruker, f.prosjekt, medSide(f.side));
  try {
    return sakskodesvar(await lesNesteSakskode(avh.datalag, kontekst, f.sakId));
  } catch (feil) {
    return skriveavvisning(feil);
  }
}

/** For en ny sak: en ID uten kode, så svaret er det neste nummeret for koden. */
async function visSakskodeForNySak(
  f: Opprettelsesforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const kontekst = skrivekontekst(f.bruker, f.prosjekt, f.side);
  try {
    return sakskodesvar(await lesNesteSakskode(avh.datalag, kontekst, avh.nyId()));
  } catch (feil) {
    return skriveavvisning(feil);
  }
}

const SAK = '([^/]+)';

export const KJERNERUTER: readonly Saksrute[] = [
  {
    metode: 'GET',
    sti: new RegExp(`^/api/kjerne/saker/${SAK}$`),
    eksempel: (s) => `/api/kjerne/saker/${s}`,
    tilgang: {
      prosjektrolle: 'viewer',
      kontraktsrolle: 'lesing',
    },
    behandle: visSaken,
  },
  {
    metode: 'POST',
    sti: new RegExp(`^/api/kjerne/saker/${SAK}/kommandoer$`),
    eksempel: (s) => `/api/kjerne/saker/${s}/kommandoer`,
    tilgang: { prosjektrolle: 'member', kontraktsrolle: 'kreves' },
    behandle: sendKommando,
  },
  {
    metode: 'GET',
    sti: new RegExp(`^/api/kjerne/saker/${SAK}/sakskode$`),
    eksempel: (s) => `/api/kjerne/saker/${s}/sakskode`,
    // Nummeret avhenger av siden, så det krever kontraktsrollen, som skrivingen.
    tilgang: { prosjektrolle: 'member', kontraktsrolle: 'kreves' },
    behandle: visSakskode,
  },
];

export const OPPRETTELSE: Opprettelsesrute = {
  metode: 'POST',
  ...fast('/api/kjerne/saker'),
  tilgang: {
    prosjektrolle: 'member',
    kontraktsrolle: 'kreves',
    nySak:
      'Opprettelsen: saken finnes ikke før kommandoen er lagret, så stien har ingen sak. Prosjektet er det i `X-Project-ID`, og bare TE oppretter (OV-U1, #696).',
  },
  behandle: opprettNySak,
};

export const SAKSKODE_FOR_NY_SAK: Opprettelsesrute = {
  metode: 'GET',
  ...fast('/api/kjerne/sakskode'),
  tilgang: {
    prosjektrolle: 'member',
    kontraktsrolle: 'kreves',
    nySak:
      'Brevkontrollen for en ny sak viser nummeret saken vil få (LV-U46), før saken finnes, så stien har ingen sak. Prosjektet er det i `X-Project-ID`.',
  },
  bareTE: 'Du er på byggherrens side. En ny sak opprettes av totalentreprenøren.',
  behandle: visSakskodeForNySak,
};
