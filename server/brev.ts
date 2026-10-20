/**
 * Nedlastingen av et sendt brev som PDF (#1054). Bare et sendt brev kan lastes ned,
 * ikke et utkast (oppdragsgiver 20.10, #1054). Et brev er sendt når det står i
 * journalen. Utkastene ligger utenfor journalen (`server/godkjenning.ts`).
 *
 * PDF-en lages av det frosne leveringsoppdraget med `brevdokument`, samme funksjon som
 * lager filen til Catenda, så nedlastingen og Catenda-kopien har samme innhold
 * (LV-U2). Et registrert brev er sendt utenfor appen og har ingen PDF herfra (LV-U11).
 */

import type { Avhengigheter, Forespoersel, Saksrute, Svar } from './app.ts';
import { feilsvar } from './inngang.ts';
import { lesSaken, SakFinnesIkke } from './lager.ts';
import { brevdokument, filnavn, UgjengivbartBrev } from './levering.ts';
import { asciiReserve, attrTegn } from './vedlegg.ts';

const brevFinnesIkke = () => feilsvar(404, 'BREV_FINNES_IKKE', 'Brevet finnes ikke i saken.');

async function lastNedBrev(
  { bruker, prosjekt, sakId, ressurs }: Forespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  let oppdrag;
  try {
    ({ oppdrag } = await lesSaken(
      avh.datalag,
      { aktor: bruker.id, prosjekt: prosjekt.prosjektId },
      sakId
    ));
  } catch (feil) {
    if (feil instanceof SakFinnesIkke)
      return feilsvar(404, 'SAK_FINNES_IKKE', 'Saken finnes ikke.');
    throw feil;
  }
  const o = oppdrag.find((o) => o.event_id === ressurs);
  if (!o) return brevFinnesIkke();
  if (filnavn(o.innhold) === null)
    return feilsvar(
      409,
      'BREV_SENDT_UTENFOR_APPEN',
      'Brevet er registrert som sendt utenfor appen, så appen har ingen PDF av det.'
    );
  let dokument;
  try {
    dokument = await brevdokument(o.innhold, o.dokumentnoekkel);
  } catch (feil) {
    if (feil instanceof UgjengivbartBrev)
      return feilsvar(409, 'BREV_KAN_IKKE_GJENGIS', `PDF-en kan ikke lages: ${feil.message}`);
    throw feil;
  }
  return [
    200,
    Buffer.from(dokument.innhold),
    {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${asciiReserve(dokument.navn)}"; filename*=UTF-8''${attrTegn(dokument.navn)}`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
    },
  ];
}

export const BREVRUTER: readonly Saksrute[] = [
  {
    metode: 'GET',
    sti: new RegExp('^/api/kjerne/saker/([^/]+)/brev/([^/]+)$'),
    eksempel: (s) => `/api/kjerne/saker/${s}/brev/00000000-0000-4000-8000-000000000000`,
    tilgang: {
      prosjektrolle: 'viewer',
      kontraktsrolle: {
        ikke: 'Lesing: brevet er en del av saken, og den som kan lese saken med `GET /api/kjerne/saker/<sak>`, kan laste ned brevet som PDF.',
      },
    },
    behandle: lastNedBrev,
  },
];
