/**
 * Inngangene for godkjenneren i kjeden til en godkjenningspakke (del 4 av #831). Godkjenneren
 * når pakken gjennom stien og aldri en sak hen oppgir selv. Konteksten har aktøren og
 * prosjektet, uten side og team, så basen slipper aktøren til pakken bare som godkjenner i en
 * åpen pakke (`koe_sikkerhet.godkjenner`, GFK-U9). Etterpå ser hen bare sine egne handlinger.
 *
 * Publiseringen ved siste godkjenning hører til S-1b (#818).
 */

import { hindringForGodkjenner, lesekontekst, type Bruker } from './autorisasjon.ts';
import { transaksjon, Tilbakerulling, UUID, type Foresp, type Kontekst } from './datalag.ts';
import {
  godkjennerIPakken,
  lesEgneHandlinger,
  lesPakke,
  PakkeAvsluttet,
  pakkensSak,
  PakkeNektet,
  registrerHandling,
  RollenMistet,
  lesVentendePakker,
  ventendeGodkjenner,
  type LagretHandling,
} from './godkjenning.ts';
import { brevSomPdf } from './brev.ts';
import { fast, feilsvar, loggFeil, ugyldig, ukjenteFelt } from './inngang.ts';
import { sakssvar } from './saker.ts';
import { vedleggISaken, vedleggsfil } from './vedlegg.ts';
import type {
  Avhengigheter,
  Godkjennerforespoersel,
  Godkjennerrute,
  Innlogget,
  Sesjonsrute,
  Svar,
} from './rutetyper.ts';

const kontekst = (bruker: Bruker, prosjektId: string): Kontekst =>
  lesekontekst(bruker, prosjektId, null);

/** Samme svar når pakken ikke finnes, er i et annet prosjekt eller ikke venter på aktøren. */
const ingenPakke = () =>
  feilsvar(404, 'PAKKE_FINNES_IKKE', 'Pakken finnes ikke, eller den er ikke åpen for deg.');
const lukket = () => feilsvar(409, 'PAKKE_LUKKET', 'Pakken er ikke lenger åpen for godkjenning.');

const handlingssvar = (h: LagretHandling) => ({
  handling: h.handling,
  steg: h.steg,
  aktor_id: h.aktorId,
  fullmakt: h.fullmakt,
  begrunnelse: h.begrunnelse,
  tidspunkt: h.tidspunkt,
});

/**
 * Pakken mens den er åpen, eller godkjennerens egne handlinger når den er lukket og aktøren
 * står i kjeden (GFK-U9, kravet 20.10 i #831, punkt 2); `null` når aktøren ikke står i kjeden.
 */
async function forGodkjenneren<T>(
  foresp: Foresp,
  pakkeId: string,
  les: (foresp: Foresp, pakkeId: string) => Promise<T | null>
): Promise<{ pakke: T } | { egne: LagretHandling[] } | null> {
  const pakke = await les(foresp, pakkeId);
  if (pakke) return { pakke };
  const egne = await lesEgneHandlinger(foresp, pakkeId);
  return egne.length || (await godkjennerIPakken(foresp, pakkeId)) ? { egne } : null;
}

async function visPakken(
  { bruker, prosjektId, pakkeId }: Godkjennerforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  if (!UUID.test(pakkeId)) return ingenPakke();
  const lest = await transaksjon(avh.datalag, kontekst(bruker, prosjektId), (foresp) =>
    forGodkjenneren(foresp, pakkeId, lesPakke)
  );
  if (!lest) return ingenPakke();
  if ('egne' in lest)
    return [
      200,
      { success: true, status: 'lukket', egne_handlinger: lest.egne.map(handlingssvar) },
    ];
  const p = lest.pakke;
  return [
    200,
    {
      success: true,
      status: 'aapen',
      pakke: {
        pakke_id: p.pakkeId,
        sak_id: p.sakId,
        saksbehandler_id: p.aktorId,
        brev: p.brev,
        fullmaktsgrunnlag: p.fullmaktsgrunnlag,
        opprettet: p.opprettet,
        kjede: p.godkjennere.map((id, n) => ({ steg: n + 1, godkjenner_id: id })),
        handlinger: p.handlinger.map(handlingssvar),
        venter_paa_deg: ventendeGodkjenner(p) === bruker.id,
      },
    },
  ];
}

const HANDLINGSKROPP = new Set(['handling', 'begrunnelse']);
const LENGSTE_BEGRUNNELSE = 4000;

async function registrer(
  { bruker, prosjektId, pakkeId, kropp }: Godkjennerforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const ukjent = ukjenteFelt(kropp, HANDLINGSKROPP);
  if (ukjent) return ukjent;
  const { handling, begrunnelse = null } = kropp;
  if (handling !== 'godkjent' && handling !== 'returnert')
    return ugyldig('Handlingen må være «godkjent» eller «returnert».');
  if (begrunnelse !== null && typeof begrunnelse !== 'string')
    return ugyldig('Begrunnelsen må være tekst.');
  if (typeof begrunnelse === 'string' && begrunnelse.length > LENGSTE_BEGRUNNELSE)
    return ugyldig(`Begrunnelsen kan ha høyst ${LENGSTE_BEGRUNNELSE} tegn.`);
  if (!UUID.test(pakkeId)) return ingenPakke();
  try {
    return await transaksjon(avh.datalag, kontekst(bruker, prosjektId), async (foresp) => {
      const lest = await forGodkjenneren(foresp, pakkeId, pakkensSak);
      if (!lest || 'egne' in lest) return new Tilbakerulling(lest ? lukket() : ingenPakke());
      await registrerHandling(foresp, pakkeId, handling, begrunnelse || null);
      return [200, { success: true, handling }] satisfies Svar;
    });
  } catch (feil) {
    // Meldingene fra basen er ikke med i svaret; `cause` kan ha driftsopplysninger (#831, 20.10).
    if (feil instanceof PakkeNektet)
      return feilsvar(403, 'PAKKE_VENTER_IKKE', 'Pakken venter ikke på din godkjenning.');
    if (feil instanceof PakkeAvsluttet) return lukket();
    if (feil instanceof RollenMistet)
      return feilsvar(
        409,
        'ROLLEN_MISTET',
        'Rollen eller grensen din dekker ikke lenger svaret, så pakken må lages på nytt.'
      );
    throw feil;
  }
}

/**
 * En lesing i saken pakken gjelder, mens pakken er åpen og aktøren står i kjeden (G1 i #831).
 * Konteksten er den samme, så basen slipper aktøren til saken bare som godkjenner.
 */
const iSaken =
  (
    les: (
      avh: Required<Avhengigheter>,
      k: Kontekst,
      sakId: string,
      ressurs: string | null
    ) => Promise<Svar>
  ) =>
  async (
    { bruker, prosjektId, pakkeId, ressurs }: Godkjennerforespoersel,
    avh: Required<Avhengigheter>
  ): Promise<Svar> => {
    if (!UUID.test(pakkeId)) return ingenPakke();
    const k = kontekst(bruker, prosjektId);
    const sakId = await transaksjon(avh.datalag, k, (foresp) => pakkensSak(foresp, pakkeId));
    return sakId ? les(avh, k, sakId, ressurs) : ingenPakke();
  };

const PAKKE = '([^/]+)';
const RESSURS = '([^/]+)';
const UTEN_MEDLEMSKAP =
  'Godkjenneren i kjeden følger lederhierarkiet i HR-kopien (GFK-U8) og er typisk ikke medlem av prosjektet eller teamet. Prosjektet er det i `X-Project-ID`; basen slipper aktøren til pakken bare som godkjenner i en åpen pakke (`koe_sikkerhet.godkjenner`, GFK-U9), og en aktør i et team for totalentreprenøren avvises.';

const lesning = (
  sti: string,
  eksempel: string,
  behandle: Godkjennerrute['behandle']
): Godkjennerrute => ({
  metode: 'GET',
  sti: new RegExp(`^/api/godkjenning/pakker/${PAKKE}/${sti}$`),
  eksempel: (p) => `/api/godkjenning/pakker/${p}/${eksempel}`,
  tilgang: { utenMedlemskap: UTEN_MEDLEMSKAP },
  behandle,
});

export const GODKJENNERRUTER: readonly Godkjennerrute[] = [
  {
    metode: 'GET',
    sti: new RegExp(`^/api/godkjenning/pakker/${PAKKE}$`),
    eksempel: (p) => `/api/godkjenning/pakker/${p}`,
    tilgang: { utenMedlemskap: UTEN_MEDLEMSKAP },
    behandle: visPakken,
  },
  {
    metode: 'POST',
    sti: new RegExp(`^/api/godkjenning/pakker/${PAKKE}/handlinger$`),
    eksempel: (p) => `/api/godkjenning/pakker/${p}/handlinger`,
    tilgang: { utenMedlemskap: UTEN_MEDLEMSKAP },
    behandle: registrer,
  },
  lesning(
    'saken',
    'saken',
    iSaken((avh, k, sakId) => sakssvar(avh, k, sakId, null))
  ),
  lesning(
    `brev/${RESSURS}`,
    'brev/00000000-0000-4000-8000-000000000000',
    iSaken((avh, k, sakId, ressurs) => brevSomPdf(avh.datalag, k, sakId, ressurs))
  ),
  lesning(
    'vedlegg',
    'vedlegg',
    iSaken((avh, k, sakId) => vedleggISaken(avh.datalag, k, sakId))
  ),
  lesning(
    `vedlegg/${RESSURS}`,
    'vedlegg/00000000-0000-4000-8000-000000000000',
    iSaken((avh, k, sakId, ressurs) => vedleggsfil(avh.datalag, k, sakId, ressurs))
  ),
];

async function visVentendePakker(
  { sesjon }: Innlogget,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const alle = await lesVentendePakker(avh.datalag, sesjon.bruker.id);
  // Som i godkjennerinngangen: ingen pakker i et prosjekt der aktøren er i et TE-team.
  let hindret: Set<string>;
  try {
    const prosjekter = [...new Set(alle.map((p) => p.prosjektId))];
    const hindringer = await Promise.all(
      prosjekter.map((id) => hindringForGodkjenner(avh.datalag, avh.catenda, sesjon.bruker.id, id))
    );
    hindret = new Set(prosjekter.filter((_, i) => hindringer[i] !== null));
  } catch (feil) {
    loggFeil('Tilgangen til listen over pakkene kunne ikke avgjøres', feil);
    return feilsvar(503, 'ACCESS_UNAVAILABLE', 'Tilgang kunne ikke bekreftes. Prøv igjen senere.');
  }
  const pakker = alle.filter((p) => !hindret.has(p.prosjektId));
  return [
    200,
    {
      success: true,
      pakker: pakker.map((p) => ({
        pakke_id: p.pakkeId,
        prosjekt_id: p.prosjektId,
        prosjektnavn: p.prosjektnavn,
        sak_id: p.sakId,
        opprettet: p.opprettet,
        steg: p.steg,
        venter_paa_deg: p.venterPaaDeg,
      })),
    },
  ];
}

export const VENTENDE_PAKKER: Sesjonsrute = {
  metode: 'GET',
  ...fast('/api/godkjenning/pakker'),
  tilgang: {
    utenProsjekt:
      'Listen over de åpne pakkene der aktøren står i kjeden, på tvers av prosjektene (G2 i #831): godkjenneren er typisk ikke medlem av prosjektene (GFK-U8). `koe_api.ventende_pakker` filtrerer på aktøren fra sesjonen og på at pakken er åpen, og raden har bare saken, prosjektet og pakken.',
  },
  behandle: visVentendePakker,
};
