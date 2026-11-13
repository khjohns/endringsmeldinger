/**
 * Utledningen i forholdssporet: virkningen av svaret på forholdet, endringsordren etter § 31.3,
 * TEs opplysninger om datoen og lesereglene i 4.2 som er forholdets egne
 * (`KONTROLLER_I_FORHOLDET`, som `utledning/utled.ts` slår opp gjennom `KONTROLLER`, #1783).
 */

import { erRegistrert } from '../../format/leser.ts';
import { prinsipalt, standpunktet } from '../../frosset/byggeklosser.ts';
import type {
  Bakover,
  Datoopplysning,
  Element,
  Sporskontroller,
  Sporutledning,
  Svarberegning,
  Ugyldig,
  Utledning,
  Utsagn,
} from '../../utledning/utled.ts';
import type {
  Dokument,
  Domenehendelse,
  Krav,
  LestOpplysning,
  OppgittDatofelt,
  Spor,
  Svar,
} from '../../typer.ts';
import { innholdIForholdet, oppgittDato } from './format.ts';
import { blirEndringsordre, forholdetErAvklart } from './frysing.ts';

/** Kontrollene i forholdet, som `utledning/utled.ts` slår opp gjennom `KONTROLLER`. */
export const KONTROLLER_I_FORHOLDET = {
  kravet: () => null,
  kravene: () => {},
  svaret: () => {},
  kanFaaPassivitet: true,
  leserDatoen: true,
  // Et frafall av pålegget kan TE ikke godta (GR-U9), så det står ikke som et svar som ikke
  // er godtatt. Unntaket gjelder bare forholdet (arbeidsvalget 20.10 i #1050).
  svaretKanGodtas: (u) => !u.frafalt,
  saken: () => {},
} satisfies Sporskontroller;

/**
 * OV-U6: byggherrens registrerte endringsordre er svaret på forholdet når den er en
 * godkjenning uten påberopt preklusjon i en underkategori der § 32.2 gjelder, og
 * byggherren oppgir i brevet at det er en endringsordre etter § 31.3.
 */
export const erRegistrertEndringsordre = (s: Svar, d: Dokument): boolean =>
  s.spor === 'forhold' &&
  blirEndringsordre(s.beslutningsgrunnlag) &&
  d.opplysninger.some((o) => o.hva === 'endringsordre' && o.brev === s.dokument && o.oppfylt);

/**
 * OV-U13: opplysningen om § 31.3 står bare i brevet med byggherrens endringsordre som svar
 * på forholdet (OV-U6). En senere avklaring og to opplysninger i samme brev avvises av
 * leseren.
 */
export function kontrollerEndringsordrene(
  opplysninger: readonly LestOpplysning[],
  dokumenter: Map<string, Dokument>,
  ugyldig: Ugyldig
): void {
  for (const o of opplysninger) {
    if (o.hva !== 'endringsordre') continue;
    const brev = dokumenter.get(o.brev)!;
    if (!brev.svar.some((s) => erRegistrertEndringsordre(s, brev)))
      ugyldig(
        o.id,
        'opplysningen om § 31.3 står ikke ved byggherrens endringsordre som svar på grunnlaget (OV-U6, OV-U13)'
      );
  }
}

/**
 * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U41 (opphevet av MM-U52)): en korrigering viser bakover
 * til grunnlagskravet eller en tidligere korrigering, som har opplysningen den endrer.
 */
export function kontrollerKorrigeringene(
  korrigeringer: readonly Utsagn<'korrigering'>[],
  kravMedUten: Map<string, Krav>,
  elementer: Record<string, Element>,
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const x of korrigeringer) {
    const maal = elementer[x.gjelder];
    const kanGjelde = kravMedUten.get(x.gjelder)?.spor === 'forhold' || maal?.art === 'korrigering';
    if (!maal || !kanGjelde || !bakover(x.id, x.gjelder))
      ugyldig(x.id, 'korrigeringen viser ikke til et grunnlagskrav eller en korrigering før den');
  }
}

/**
 * TEs opplysninger om datoen etter VS-U26 (`Datoopplysning`), i rekkefølgen i journalen: hver
 * versjon av grunnlagskravet som oppgir en annen dato enn TEs siste opplysning om samme dato, og
 * hver korrigering (punkt 10 i samlevedtaket for retting av sendt brev, MM-U41 (opphevet av MM-U52)).
 */
export function opplysningerOmDatoen(
  journal: readonly Domenehendelse[],
  forholdskrav: readonly Krav[],
  korrigeringer: readonly Utsagn<'korrigering'>[]
): Datoopplysning[] {
  const krav = new Set(forholdskrav.map((k) => k.id));
  const korr = new Set(korrigeringer.map((k) => k.id));
  const ut: Datoopplysning[] = [];
  const sisteOm = (felt: OppgittDatofelt) => ut.filter((o) => o.felt === felt).at(-1);
  for (const h of journal) {
    if (h.art !== 'dokument') continue;
    for (const k of h.dokument.krav) {
      if (!krav.has(k.id)) continue;
      const innhold = innholdIForholdet(k);
      const felt = oppgittDato(innhold.hovedkategori, innhold.underkategori);
      const dato = felt === null ? null : innhold.datoer[felt];
      if (felt === null || typeof dato !== 'string' || sisteOm(felt)?.dato === dato) continue;
      ut.push({ id: k.id, dokument: h.dokument.id, felt, dato, korrigering: false });
    }
    for (const u of h.dokument.utsagn)
      if (u.art === 'korrigering' && korr.has(u.id))
        ut.push({
          id: u.id,
          dokument: h.dokument.id,
          felt: u.felt,
          dato: u.dato,
          korrigering: true,
        });
  }
  return ut;
}

/**
 * TEs siste opplysning om datoen i feltet (punkt 10 i samlevedtaket for retting av sendt brev,
 * MM-U41 (opphevet av MM-U52)), eller `null` når TE ikke har oppgitt den.
 */
export function sisteDatoopplysning(u: Utledning, felt: OppgittDatofelt): Datoopplysning | null {
  return u.datoopplysninger.filter((o) => o.felt === felt).at(-1) ?? null;
}

/**
 * GR-U3, GR-U9: svaret frafaller pålegget etter § 32.3 c, og frafallet er svarets
 * prinsipale standpunkt. Kommandoene avviser et frafall sammen med en påberopelse
 * etter § 32.2 som har virkning (#235), så et svar fra appen som frafaller, har alltid
 * frafallet prinsipalt (#562).
 */
const frafaller = (s: Svar): boolean =>
  prinsipalt(s.beslutningsgrunnlag.virkninger)?.art === 'forhold' &&
  standpunktet(s, 'forhold')?.resultat === 'paalegg_frafalt';

/**
 * OV-U4, OV-U6: et registrert svar er dokumentasjon, og et registrert svar med virkning er
 * byggherrens endringsordre, ikke et frafall fra appen (GR-U23).
 */
const sendtFraAppen = (u: Pick<Utledning, 'elementer'>, s: Svar): boolean =>
  !u.elementer[s.dokument]?.registrertBrev;

/** Virkningen av svaret på forholdet: om forholdet er avklart, avvist eller frafalt, og om svaret er en endringsordre. */
export function forholdssvaretsVirkning(
  spor: Record<Spor, Sporutledning>,
  elementer: Record<string, Element>,
  svar: Record<string, Svarberegning>,
  dokumenter: Map<string, Dokument>
): Pick<Utledning, 'forholdAvklart' | 'forholdAvvist' | 'endringsordre' | 'frafalt'> {
  const gSvar = spor.forhold.gjeldendeSvar;
  const eg = spor.forhold.enighet;
  const gBrev = gSvar ? svar[gSvar.id] : null;
  // GR-U23: venter en ny påberopelsesversjon på svar etter et frafall, er forholdet avklart
  // ved frafallet til byggherren svarer. Det siste svaret sendt fra appen leses, så et
  // frafall byggherren senere har revidert til avslag, avklarer ikke (MM-U34 punkt 7). Et
  // svar byggherren har registrert, også en endringsordre etter OV-U6, tar ikke bort
  // frafallet (GR-U20, OV-U4, OV-U6, #1388).
  const sisteFraAppen = spor.forhold.svar.filter((s) => sendtFraAppen({ elementer }, s)).at(-1);
  const venterEtterFrafall =
    !spor.forhold.trukket &&
    gSvar === null &&
    spor.forhold.gjeldendeKrav !== null &&
    sisteFraAppen !== undefined &&
    frafaller(sisteFraAppen);
  return {
    // Utledet av standpunktene i brevet om forholdet, som også er innholdet i en
    // enighet om det (KA-U10, MM-U11, MM-U50).
    forholdAvklart:
      venterEtterFrafall ||
      (!spor.forhold.trukket && gBrev !== null && forholdetErAvklart(gBrev.svar, gBrev.virkninger)),
    // SK-01, #213, MM-U13: TE har godtatt svaret på påberopelsen, og det avklarer ikke forholdet
    // etter GR-U7. Et godtatt avslag og en godtatt preklusjon har samme virkning.
    forholdAvvist:
      eg?.grunnlag.kilde === 'aksept' &&
      gBrev !== null &&
      !forholdetErAvklart(gBrev.svar, gBrev.virkninger),
    // GR-U12: om § 32.2 gjaldt, er frosset i brevet. Dagens regelsett vurderer det
    // ikke på nytt (MM-U9), og det avhenger ikke av om brevet sier noe om varslingen.
    // § 31.3: et brev sendt i appen oppfyller den, fordi appen lager brevet (#310). En
    // registrert endringsordre gir ingen egen virkning (OV-U6).
    // EO-U12: en ny påberopelsesversjon eller et nytt svar tar ikke bort endringsordren.
    endringsordre: spor.forhold.svar.some(
      (svaret) =>
        blirEndringsordre(svaret.beslutningsgrunnlag) &&
        !erRegistrert(dokumenter.get(svaret.dokument)!.opplysninger)
    )
      ? 'ja'
      : 'nei',
    // GR-U3, GR-U9: frafallet er byggherrens standpunkt, uavhengig av hva TE har sagt.
    frafalt: venterEtterFrafall || (gSvar !== null && frafaller(gSvar)),
  };
}

/**
 * KA-U13 og KA-U14, med § 31.3 (GR-U13): TE kan ikke trekke forholdet når byggherren
 * har godkjent det i et svar sendt fra appen, og godkjenningen er en endringsordre, også
 * etter en ny kravversjon eller et nytt svar (EO-U12). Et
 * trekk ville gitt journalen den videre virkningen at endringsordren leses som bortfalt
 * (KA-U6). En endringsordre byggherren har registrert, sperrer ikke (OV-U6).
 */
export const trekkAvPaaberopelsenErSperret = (u: Utledning): boolean => u.endringsordre === 'ja';

/**
 * MM-U34 punkt 20: byggherren kan la en endringsordre omfatte hele KOE-saken når
 * forholdet er sendt, også uten registrert enighet. Unntatt er en sak som er lukket
 * etter GR-U27, fordi TE har godtatt et svar som avslår forholdet eller påberoper
 * preklusjon, eller har trukket forholdet.
 * Et frafall etter § 32.3 c hindrer ikke (GR-U28). At saken alt er omfattet av en
 * endringsordre (EO-U3 (opphevet av EO-U34, EO-U38 og EO-U39)), leses der EO-saken bygges (#1378).
 */
export function kanInngaaIEo(u: Utledning): boolean {
  return u.spor.forhold.gjeldendeKrav !== null && !u.forholdAvvist && !u.spor.forhold.trukket;
}
