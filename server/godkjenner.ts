/**
 * Inngangene for godkjenneren i kjeden til en godkjenningspakke (del 4 av #831). Godkjenneren
 * når pakken gjennom stien og aldri en sak hen oppgir selv. Konteksten har aktøren og
 * prosjektet, uten side og team, så basen slipper aktøren til pakken bare som godkjenner i en
 * åpen pakke (`koe_sikkerhet.godkjenner`, GFK-U9). Etterpå ser hen bare sine egne handlinger.
 *
 * Publiseringen ved siste godkjenning hører til S-1b (#818).
 */

import type { Bruker } from './autorisasjon.ts';
import { transaksjon, Tilbakerulling, UUID, type Kontekst } from './datalag.ts';
import {
  lesEgneHandlinger,
  lesPakke,
  PakkeAvsluttet,
  PakkeNektet,
  registrerHandling,
  RollenMistet,
  type LagretHandling,
  type LagretPakke,
} from './godkjenning.ts';
import { feilsvar, ugyldig } from './inngang.ts';
import type { Avhengigheter, Godkjennerforespoersel, Godkjennerrute, Svar } from './rutetyper.ts';

const kontekst = (bruker: Bruker, prosjektId: string): Kontekst => ({
  aktor: bruker.id,
  prosjekt: prosjektId,
});

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

/** Steget som venter, telt fra 1, eller `null` når alle er godkjent. */
function ventendeSteg(p: LagretPakke): number | null {
  const godkjent = new Set(
    p.handlinger.filter((h) => h.handling === 'godkjent').map((h) => h.steg)
  );
  const i = p.godkjennere.findIndex((_, n) => !godkjent.has(n + 1));
  return i < 0 ? null : i + 1;
}

async function visPakken(
  { bruker, prosjektId, pakkeId }: Godkjennerforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  if (!UUID.test(pakkeId)) return ingenPakke();
  const lest = await transaksjon(avh.datalag, kontekst(bruker, prosjektId), async (foresp) => {
    const pakke = await lesPakke(foresp, pakkeId);
    return { pakke, egne: pakke ? [] : await lesEgneHandlinger(foresp, pakkeId) };
  });
  const p = lest.pakke;
  if (!p) {
    if (!lest.egne.length) return ingenPakke();
    return [
      200,
      { success: true, status: 'lukket', egne_handlinger: lest.egne.map(handlingssvar) },
    ];
  }
  const steg = ventendeSteg(p);
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
        venter_paa_deg: steg !== null && p.godkjennere[steg - 1] === bruker.id,
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
  const ukjent = Object.keys(kropp).filter((k) => !HANDLINGSKROPP.has(k));
  if (ukjent.length) return ugyldig(`Ukjente felt i kroppen: ${ukjent.join(', ')}.`);
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
      if (!(await lesPakke(foresp, pakkeId)))
        return new Tilbakerulling(
          (await lesEgneHandlinger(foresp, pakkeId)).length ? lukket() : ingenPakke()
        );
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

const PAKKE = '([^/]+)';
const UTEN_MEDLEMSKAP =
  'Godkjenneren i kjeden følger lederhierarkiet i HR-kopien (GFK-U8) og er typisk ikke medlem av prosjektet eller teamet. Prosjektet er det i `X-Project-ID`; basen slipper aktøren til pakken bare som godkjenner i en åpen pakke (`koe_sikkerhet.godkjenner`, GFK-U9), og en aktør i et team for totalentreprenøren avvises.';

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
];
