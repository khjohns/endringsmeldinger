/**
 * Hvem lokale utkast tilhører i denne fanen.
 *
 * Lokal lagring har ingen eier vi har bekreftet. Uten en eier kunne en ny
 * bruker i samme nettleser få den forrige brukerens kravtekst — teksten går inn
 * i formelle kontraktsbrev, så det er ikke en kosmetisk feil.
 *
 * Eieren settes av `getSession()` og nullstilles ved utlogging. Rot-layouten
 * venter på `getSession()` før noen side rendres, så eieren er kjent når et
 * skjema monteres.
 *
 * Dette er *ikke* samarbeidsløsningen. Felles arbeid i et team ligger på
 * serveren (`/api/cases/<sak>/utkast/<spor>`), avgrenset til Catenda-team. Det
 * lokale laget er bare en gjenopprettingsbuffer for den som skrev teksten.
 */

let eier: string | null = null;

export function setDraftOwner(id: string | null): void {
  eier = id || null;
}

export function draftOwner(): string | null {
  return eier;
}
