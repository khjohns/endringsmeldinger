/**
 * Utledningen i fristsporet: forespørselen etter § 33.6.2 i utledningen og i svaret, og
 * kontrollene i fristen (`KONTROLLER_I_FRISTEN`, som `utledning/utled.ts` slår opp gjennom
 * `KONTROLLER`, #1783).
 */

import { kravetErDokumentasjon } from '../../frosset/byggeklosser.ts';
import { dokumenterI } from '../../format/leser.ts';
import type {
  Bakover,
  Element,
  Henvisning,
  Sporskontroller,
  Ugyldig,
  Utledning,
  Utsagn,
} from '../../utledning/utled.ts';
import type { Dokument, Krav } from '../../typer.ts';
import {
  foresporselsrelasjon,
  type ForesporselOgSvar,
  type Foresporselsrelasjon,
} from './frysing.ts';

/**
 * Kontrollene i fristen, som `utledning/utled.ts` slår opp gjennom `KONTROLLER`: lesereglene
 * for forespørselen etter § 33.6.2 (`saken`). Kravene og svarene i fristen har ingen egne (#1745).
 */
export const KONTROLLER_I_FRISTEN = {
  kravet: () => null,
  kravene: () => {},
  svaret: () => {},
  kanFaaPassivitet: false,
  leserDatoen: false,
  svaretKanGodtas: () => true,
  saken: (s, bakover, ugyldig) => {
    // VS-U33: kravene om dager fremmet i appen, også de uten virkning.
    const fristkravIAppen: Krav[] = [];
    for (const d of s.dokumenter)
      for (const k of d.krav) if (erFristkravIAppen(d, k)) fristkravIAppen.push(k);
    kontrollerForesporslene(s.foresporsler, fristkravIAppen, s.henvisninger, bakover, ugyldig);
    kontrollerSvaretPaaForesporselen(
      s.kravMedUten,
      fristkravIAppen,
      s.elementer,
      s.besvart,
      bakover,
      ugyldig
    );
  },
} satisfies Sporskontroller;

/** VS-U19, VS-U33: forespørselen sendes før TE har krevd dager i appen. */
function kontrollerForesporslene(
  foresporsler: readonly Utsagn<'foresporsel'>[],
  fristkravIAppen: readonly Krav[],
  henvisninger: readonly Henvisning[],
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const f of foresporsler)
    if (fristkravIAppen.some((k) => bakover(f.id, k.id)))
      ugyldig(f.id, 'forespørselen etter § 33.6.2 står etter et fristkrav (VS-U19)');
    else if (henvisninger.some((x) => x.art === 'foresporselssvar' && bakover(f.id, x.id)))
      ugyldig(f.id, 'forespørselen etter § 33.6.2 står etter TEs begrunnelse (VS-U30)');
    else if (f !== foresporsler[0])
      ugyldig(f.id, 'saken har alt en forespørsel etter § 33.6.2 fra appen (VS-U31)');
}

/**
 * HF-U1, LV-U18 punkt 3: fristkravet viser til forespørselen etter § 33.6.2 det svarer på, og
 * et krav om dager i appen mens forespørselen er ubesvart, er svaret og viser til den
 * (avgrensningen i #1567). Et krav i et registrert brev svarer ikke (OV-U4).
 */
function kontrollerSvaretPaaForesporselen(
  kravMedUten: ReadonlyMap<string, Krav>,
  fristkravIAppen: readonly Krav[],
  elementer: Record<string, Element>,
  besvart: readonly ForesporselOgSvar[],
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const k of kravMedUten.values()) {
    if (k.gjelder === undefined) continue;
    if (elementer[k.gjelder]?.art !== 'foresporsel' || !bakover(k.id, k.gjelder))
      ugyldig(k.id, 'fristkravet viser ikke til en forespørsel etter § 33.6.2 før kravet');
    else if (!fristkravIAppen.includes(k))
      ugyldig(k.id, 'et registrert krav svarer ikke på forespørselen etter § 33.6.2 (OV-U4)');
    else if (!besvart.some((f) => f.foresporsel === k.gjelder && f.svar === k.id))
      ugyldig(k.id, 'fristkravet viser til en forespørsel etter § 33.6.2 som alt er besvart');
  }
  for (const k of fristkravIAppen)
    if (
      k.gjelder === undefined &&
      besvart.some(
        (f) => bakover(k.id, f.foresporsel) && (f.svar === null || !bakover(k.id, f.svar))
      )
    )
      ugyldig(k.id, 'fristkravet viser ikke til forespørselen etter § 33.6.2 det svarer på');
}

/**
 * Hvordan gjeldende fristkrav står til en forespørsel etter § 33.6.2, slik svaret leser det.
 * Etter TEs begrunnelse etter annet ledd b har svaret et standpunkt etter § 33.6.2 bare når
 * byggherren har gjort gjeldende i en egen innsigelse at begrunnelsen kom for sent: svaret
 * gjentar påberopelsen eller gir den opp (VS-U29, VS-U9, VS-U11).
 */
export function foresporselForFristsvar(u: Utledning): Foresporselsrelasjon | null {
  const f = foresporselsrelasjon(u.spor.frist.foresporsler);
  if (f?.art !== 'begrunnelse') return f;
  for (const d of dokumenterI(u.journal))
    if (
      d.avsender === 'BH' &&
      d.utsagn.some(
        (x) => x.art === 'innsigelse' && x.gjelder === f.gjelder && x.grunn === undefined
      )
    )
      return f;
  return null;
}

/**
 * VS-U33, OV-U4: kravet i dokumentet er et krav om dager fremmet i appen, ikke dokumentasjon i
 * et registrert brev. Kommandoene og utledningen leser det likt.
 */
export const erFristkravIAppen = (d: Pick<Dokument, 'opplysninger'>, k: Pick<Krav, 'spor'>) =>
  k.spor === 'frist' && !kravetErDokumentasjon(d);

/**
 * VS-U19, VS-U33: TE har fremmet et krav om dager i appen, også uten virkning, som
 * kontrollen av forespørselen i utledningen. Et registrert brev stopper den aldri.
 */
export function fristkravErFremmet(u: Utledning): boolean {
  for (const d of dokumenterI(u.journal))
    if (d.krav.some((k) => erFristkravIAppen(d, k))) return true;
  return false;
}
