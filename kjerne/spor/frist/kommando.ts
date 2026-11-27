/**
 * Kommandoene i fristen (#1783): formen på kravet, nyttelastkontrollen, forutsetningene,
 * standpunktene i svaret og skrivingen av kravet. Regelsettet for sporet står i
 * `regler/frist.ts`.
 */

import {
  dagenSendt,
  dokumenterI,
  erRegistrert,
  foerDagen,
  standpunkterISvaret,
} from '../../format/leser.ts';
import { omtalen } from '../../frosset/brevdeler.ts';
import { feilI, objekt } from '../../format/skjema.ts';
import type { Subsidiaergrunn } from '../../regler/forhold.ts';
import type { Regelsett } from '../../regler/regelsett.ts';
import {
  kravversjoneneKravetProevesMot,
  rettedeBrev,
  varseletFoerBrevet,
  varseletForNyttSvar,
  type Utledning,
} from '../../utledning/utled.ts';
import {
  avvis,
  type Avvisning,
  type Domenehendelse,
  type Journalrad,
  type Krav,
  type Standpunkt,
} from '../../typer.ts';
import type { Kommando, Kravform, Svarutkast } from '../../kommandoer/kommando.ts';
import type { Sporsnyttelast } from '../../kommandoer/nyttelast.ts';
import type { Sporsforutsetninger } from '../../kommandoer/forutsetninger.ts';
import type { Sporsstandpunkter, Svaretsvarsel } from '../../kommandoer/standpunkter.ts';
import type {
  Kontekst,
  Skrivesteg,
  Sporsskriving,
  Utfall,
  Sakssperre,
} from '../../kommandoer/skriving.ts';
import {
  begrunnelsenKanAvvisesSomSvar,
  foresporselForFristsvar,
  fristeneISporet,
  fristeneStrider,
  fristkravErFremmet,
  fristnoekkel,
} from './utledning.ts';
import {
  fristinnhold,
  innholdIFristen,
  innsigelsenIFristen,
  type InnsigelseIFristen,
} from './format.ts';
import {
  dagerMaatteForstaa,
  fristkravet,
  fristvurderinger,
  paaberopelsenSomStaar,
  standpunkterIFristen,
  vurderingenAvFristen,
} from './frysing.ts';
import {
  kontroller as kontrollerFristen,
  kontrollerSvaretPaaFristvarselet,
  paakrevdeSpoersmaal,
  type Fristspoersmaal,
} from '../../regler/frist.ts';
import { mangler } from '../../regler/typer.ts';
import type { Svarvurdering } from '../../frosset/byggeklosser.ts';
import {
  innholdetIDokumentet,
  innholdetIVedleggene,
  sammeDokument,
} from '../../kommandoer/vedlegg.ts';
import { maatteForstaaUbesvart } from '../../regler/svarkontroll.ts';
import type { Utkastlag } from '../poster/kommando.ts';
import {
  avvisteFelt,
  avvisteVurderinger,
  forutsetningene,
  lageneIUtkastet,
  utenom,
} from '../../kommandoer/utkastlag.ts';

/** Formen på kravet i fristen (`KRAVFORM`). */
export const KRAVFORM_I_FRISTEN = {
  feil: (innhold) => {
    const { properties, required, anyOf } = fristinnhold(false);
    return feilI(innhold, objekt(properties, required, anyOf), '$.innhold');
  },
  vedleggIInnholdet: () => [],
  varselVedKravet: true,
} satisfies Kravform;

/** Begrunnelsen for dagene i et fristkrav (`kravetsUtdypning`). */
const utdypningIFristen = (): Avvisning | null =>
  avvis('BEGRUNNELSE_MANGLER', 'Kravet om fristforlengelse må begrunne antallet dager.');

/**
 * KA-U76, KA-U79: fristene i kravet mot de tidligere kravversjonene, og for et krav lagt til mot
 * kravversjonene sendt før det (OV-U118).
 */
function fristsperre(
  k: Extract<Kommando, { type: 'krav' }>,
  u: Utledning,
  sendt: string | null
): Avvisning | null {
  const { tidligere, andre } = kravversjoneneKravetProevesMot(u, 'frist', sendt);
  const strid = fristeneStrider(
    k.innhold as Parameters<typeof fristeneStrider>[0],
    tidligere,
    false,
    andre
  );
  return strid ? avvis('FRISTENE', `Kravversjonen ${strid}.`) : null;
}

/** Nyttelastkontrollen i fristen (`NYTTELAST`). */
export const NYTTELAST_I_FRISTEN = {
  begrunnelse: () => null,
  svarsperre: () => null,
  kravsperre: fristsperre,
  utdypning: utdypningIFristen,
  // VS-U34: varselet i kravet skrives som et eget brev, og datoen kontrolleres der (`oppgittDatoI`).
  // Står varselet alt i saken, kreves samme dato som det har.
  oppgittDatoIKravet: () => null,
} satisfies Sporsnyttelast;

/** Et utsagn i fristen som ikke er et krav, når sporet er lukket (GR-U27, GR-U5). */
function fristenErLukket(u: Utledning, avslaget: Avvisning | null): Avvisning | null {
  if (avslaget) return avslaget;
  if (u.spor.frist.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
  return null;
}

/** Forutsetningene i fristen (`FORUTSETNINGER`). */
export const FORUTSETNINGER_I_FRISTEN = {
  svaret: () => null,
  kravet: 'kravet om fristforlengelse',
  trekket: () => null,
  aksepten: () => null,
  foresporsel: {
    sende: (u, paaberopelseSendt) => {
      if (!paaberopelseSendt)
        return avvis(
          'PAABEROPELSE_IKKE_SENDT',
          'Påberopelsen må være sendt før du kan sende forespørselen.'
        );
      if (u.spor.frist.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
      // VS-U19, VS-U88 punkt 3: fra appen så lenge TE ikke har krevd dager.
      if (fristkravErFremmet(u))
        return avvis(
          'FRISTKRAV_SENDT',
          'Totalentreprenøren har krevd dager her, så forespørselen etter punkt 33.6.2 kan ikke sendes.'
        );
      // VS-U30: ingen ny forespørsel fra appen etter TEs begrunnelse etter annet ledd b.
      if (u.spor.frist.foresporsler.some((f) => f.svar !== null && !f.medKrav))
        return avvis(
          'FORESPORSEL_BEGRUNNET',
          'Totalentreprenøren har svart på en forespørsel med en begrunnelse etter punkt 33.6.2 annet ledd b, så en ny forespørsel kan ikke sendes herfra.'
        );
      // VS-U31: høyst én forespørsel fra appen i saken. En registrert forespørsel gjør saken
      // uforstått (format/leser.ts); et brev registrert som dokumentasjon teller ikke (OV-U4).
      if (u.spor.frist.foresporsler.length)
        return avvis(
          'FORESPORSEL_SENDT',
          'Forespørselen etter punkt 33.6.2 er alt sendt herfra. En ny forespørsel sendes på annen måte.'
        );
      return null;
    },
    svare: (u, f, avslaget) => {
      // KA-U1: én begrunnelse, og ikke etter at et krav har svart.
      if (f.svar !== null)
        return avvis('FORESPORSEL_BESVART', 'Forespørselen er allerede besvart.');
      // OV-U109: kravet totalentreprenøren sendte før forespørselen, er ikke svar på den.
      if (f.kravFoer !== null)
        return avvis(
          'KRAV_FOER_FORESPORSELEN',
          'Totalentreprenøren hadde sendt et krav om dager før forespørselen.'
        );
      return fristenErLukket(u, avslaget);
    },
  },
} satisfies Sporsforutsetninger;

/** Standpunktene i fristen (`STANDPUNKTER`). */
export const STANDPUNKTER_I_FRISTEN: Sporsstandpunkter = (v, krav, u, nyId) =>
  standpunkterIFristen(
    v,
    krav,
    () => varseletForNyttSvar(u, '33.4'),
    foresporselForFristsvar(u),
    nyId
  );

/**
 * VS-U96 punkt 32: det registrerte varselet etter § 33.4 et svar med `gjelder` gjelder, eller
 * `null`. Et svar på et krav som selv er varselet, gjelder kravet (VS-U96 punkt 38).
 */
export function fristvarseletSvaretGjelder(
  u: Utledning,
  gjelder: string
): Svaretsvarsel<'33.4'> | null {
  const v = u.spor.frist.varsler['33.4'];
  return v?.id === gjelder ? { id: v.id, hjemmel: '33.4' } : null;
}

/**
 * VS-U96 punkt 38: varselet etter § 33.4 et svar bare på varselet i kravversjonen `gjelder` gjelder,
 * når kravet selv er varselet (punkt 7), ellers `null`. Varselet er det første kravet som varsler,
 * som i svaret på kravet (`varseletForNyttSvar`).
 */
export function fristvarseletIKravet(u: Utledning, gjelder: string): Svaretsvarsel<'33.4'> | null {
  const sporet = u.spor.frist;
  if (!sporet.krav.some((k) => k.id === gjelder)) return null;
  const v = varseletFoerBrevet(u, '33.4');
  return v !== undefined && v !== sporet.varsler['33.4']?.id ? { id: v, hjemmel: '33.4' } : null;
}

/**
 * VS-U96 punkt 34, samlevedtaket for varslene, versjon 4, punkt 7, 9 og 10: byggherrens innsigelse
 * mot varselet etter § 33.4 som står mot et nytt svar på kravet om fristforlengelse, med brevet den
 * først ble gjort gjeldende i, eller `null`. Innsigelsen kan stå i svaret på varselet, i svaret bare
 * på varselet i kravet eller i et svar på kravet, og står til byggherren gir den opp eller sier at
 * varselet kom i tide. Varselet er det et nytt svar gjelder (`varseletForNyttSvar`). Et svar lagt
 * til, sendt på dagen `sendt`, leser svarene sendt til og med den dagen (OV-U104). Brevteksten
 * leser innsigelsen på samme måte (`paaberopelsenSomStaar`).
 */
export function innsigelsenMotFristvarselet(
  u: Utledning,
  sendt: string | null
): { gjelder: string; dokument: string } | null {
  const gjelder = varseletFoerBrevet(u, '33.4');
  if (gjelder === undefined) return null;
  const { svar, svarUtenforRekken, svarPaaVarsler } = u.spor.frist;
  const medVirkning = new Set([...svar, ...svarUtenforRekken, ...svarPaaVarsler].map((s) => s.id));
  const svarene = [...dokumenterI(u.journal)].flatMap((d) =>
    d.svar
      .filter((s) => medVirkning.has(s.id))
      .map((s) => ({ dag: dagenSendt({ id: s.id, dokument: d.id }, d) ?? '', s }))
      .filter(({ dag }) => sendt === null || !foerDagen(sendt, dag))
  );
  const dokument = paaberopelsenSomStaar(svarene, '33.4', gjelder);
  return dokument === undefined ? null : { gjelder, dokument };
}

/**
 * VS-U96 punkt 32 og 33: det som hindrer byggherrens svar på varselet `gjelder` etter § 33.4, eller
 * et nytt svar som erstatter det forrige (`hva`). Et svar lagt til, sendt på dagen `sendt`, prøves
 * mot byggherrens svar på kravene sendt til og med den dagen (OV-U98).
 */
export function hindrerSvaretPaaFristvarselet(
  u: Utledning,
  gjelder: string,
  hva: 'Svaret' | 'Revisjonen',
  sendt: string | null
): Avvisning | null {
  const sporet = u.spor.frist;
  if (sporet.trukket) return avvis('KRAV_TRUKKET', 'Kravet er trukket.');
  // VS-U96 punkt 33 og 38: svarene bare på varselet i kravet er én kjede (`svarkjeden`).
  const bare = sporet.krav.some((k) => k.id === gjelder);
  const forrige = sporet.svarPaaVarsler.some((x) =>
    bare ? x.bareVarselet : x.gjelder === gjelder
  );
  if (hva === 'Svaret' && forrige)
    return avvis('ALLEREDE_SVART', 'Du har allerede svart på varselet. Send et nytt svar.');
  if (hva === 'Revisjonen' && !forrige)
    return avvis('INGEN_SVAR', 'Det finnes ikke noe svar på varselet å erstatte.');
  // VS-U96 punkt 33: ethvert svar med virkning på et krav i fristen.
  const medVirkning = new Set([...sporet.svar, ...sporet.svarUtenforRekken].map((x) => x.id));
  if (!medVirkning.size) return null;
  const besvart = [...dokumenterI(u.journal)].some((d) =>
    d.svar.some(
      (x) =>
        medVirkning.has(x.id) &&
        (sendt === null || !foerDagen(sendt, dagenSendt({ id: x.id, dokument: d.id }, d) ?? ''))
    )
  );
  return besvart
    ? avvis(
        'KRAVET_ER_BESVART',
        `${hva} kan ikke gjelde varselet, fordi byggherren har svart på kravet om fristforlengelse. Byggherren tar stilling til varselet i svaret på kravet.`
      )
    : null;
}

/** VS-U96 punkt 32: vurderingen i svaret på varselet etter § 33.4 (`kontrollerSvaretPaaFristvarselet`). */
export function vurderingeneISvaretPaaFristvarselet(s: Svarutkast): Avvisning | null {
  return avvisteVurderinger(
    avvisteFelt(() => kontrollerSvaretPaaFristvarselet(s.vurderinger as Record<string, unknown>))
  );
}

/** VS-U96 punkt 32: standpunktet i svaret på varselet etter § 33.4 som står alene. */
export function standpunkterPaaFristvarselet(
  v: Svarvurdering,
  varselet: Svaretsvarsel<'33.4'>,
  nyId: () => string
): Record<string, unknown>[] {
  const iTide = (v as Record<string, unknown>).varslet_i_tide;
  return typeof iTide === 'boolean'
    ? [{ id: nyId(), art: 'rettidighet', gjelder: varselet.id, hjemmel: '33.4', i_tide: iTide }]
    : [];
}

/**
 * Det i et foregående lag som rammer standpunktet (OV-U32): en grunn fra forholdet, en innsigelse
 * etter § 33.4, § 33.6.2 eller § 33.6.1, eller at fremdriften ikke ble hindret (KA-U78, KA-U81).
 */
export type Forutsetning = { grunn: Subsidiaergrunn } | InnsigelseIFristen;

/** Feltet i vurderingene hvert spørsmål i svarutkastet på fristen gjelder. */
type FeltIFristen = Fristspoersmaal | 'dager' | 'dager_maatte_forstaa';

/**
 * Lagene i et svarutkast på fristen, med spørsmålene om hele kravet og dagene for hver frist
 * (`gjelder`). Fristen har ingen egne felt i standpunktet. Spørsmålene som stilles, er
 * spørsmålene om hele kravet (`paakrevdeSpoersmaal`), og for hver frist dagene og, når
 * spesifiseringen kom for sent, dagene byggherren måtte forstå. Spesifiseringen stilles ikke når
 * kravet svarer på forespørselen (§ 33.6.2 fjerde ledd).
 */
export type LagIFristen = Utkastlag<Forutsetning, FeltIFristen>;

/** Spørsmålet i svaret hvert standpunkt om hele kravet svarer på. */
const SPOERSMAALET: Readonly<Partial<Record<string, Fristspoersmaal>>> = {
  '33.4': 'frist_varsel_ok',
  '33.6.2': 'foresporsel_svar_ok',
  hindring: 'vilkar_oppfylt',
  spesifisering: 'spesifisert_krav_ok',
};

export const fristspoersmaalForPunkt = (punkt: string): Fristspoersmaal | undefined =>
  Object.hasOwn(SPOERSMAALET, punkt) ? SPOERSMAALET[punkt] : undefined;

export const fristpunktForSpoersmaal = (spoersmaal: string | undefined): string | undefined =>
  Object.entries(SPOERSMAALET).find(([, felt]) => felt === spoersmaal)?.[0];

/** Spørsmålet standpunktet svarer på, eller `null` for dagene. */
function spoersmaaletFor(s: Standpunkt): Fristspoersmaal | null {
  if (s.art === 'dager') return null;
  // VS-U95: standpunktet om at begrunnelsen ikke er et svar, svarer på spørsmålet etter § 33.6.2.
  const noekkel = s.art === 'rettidighet' || s.art === 'ikke_svar' ? s.hjemmel : s.art;
  const felt = fristspoersmaalForPunkt(noekkel);
  if (!felt) throw new Error(`standpunktet ${noekkel} svarer ikke på noe spørsmål i fristen`);
  return felt;
}

/**
 * Vurderingene i utkastet med hvert ubesvart spørsmål regelsettet stiller (`paakrevdeSpoersmaal`),
 * besvart uten innsigelse (S1-A), og spørsmålene som var ubesvart (#1925, KA-U78). Står
 * byggherrens innsigelse mot varselet etter § 33.4 før svaret, er spørsmålet om varselet besvart
 * med innsigelsen (`innsigelsenMotFristvarselet`). `sendt` er dagen et svar lagt til ble sendt.
 */
function utfylt(v: Svarutkast['vurderinger'], u: Utledning, sendt: string | null) {
  const paakrevde = paakrevdeSpoersmaal(fristkravet(0, foresporselForFristsvar(u))).map(
    ([felt]) => felt
  );
  const manglende = paakrevde.filter((felt) => mangler(v[felt]));
  // VS-U95: standpunktet om at begrunnelsen ikke er et svar, besvarer spørsmålet etter § 33.6.2.
  // Står begge, gjelder svaret på spørsmålet i lagene, og kontrollen avviser standpunktet
  // (`ugyldigIFristen`).
  const ikkeSvar = v.begrunnelse_ikke_svar === true && begrunnelsenKanAvvisesSomSvar(u);
  const ubesvart = new Set(
    ikkeSvar ? manglende.filter((felt) => felt !== 'foresporsel_svar_ok') : manglende
  );
  const utfylt: Record<string, unknown> = { ...v };
  if (!ikkeSvar || !mangler(v.foresporsel_svar_ok)) delete utfylt.begrunnelse_ikke_svar;
  for (const felt of ubesvart) utfylt[felt] = true;
  // VS-U96 punkt 34: svaret gjentar innsigelsen mot varselet som utgangspunkt.
  if (ubesvart.has('frist_varsel_ok') && innsigelsenMotFristvarselet(u, sendt))
    utfylt.frist_varsel_ok = false;
  if (utfylt.spesifisert_krav_ok === false && Array.isArray(v.frister))
    utfylt.frister = v.frister.map((r: unknown) =>
      r !== null &&
      typeof r === 'object' &&
      mangler((r as Record<string, unknown>).dager_maatte_forstaa)
        ? { ...r, dager_maatte_forstaa: 0 }
        : r
    );
  return { v: utfylt, ubesvart, paakrevde };
}

/**
 * Lagene i et svarutkast på fristen, også før alle spørsmålene er besvart (M-8 i BF-20). Et
 * ubesvart spørsmål om varselet, forespørselen, hindringen eller spesifiseringen regnes som at
 * innsigelsen ikke er gjort gjeldende, så laget kan endre seg når det besvares (S1-A), og
 * standpunktet står med `besvart: false` (#1925). Unntaket er varselet etter § 33.4 når
 * byggherrens innsigelse står før svaret: da gjentar svaret den (VS-U96 punkt 34). Lagene fra forholdet leses som i vederlaget
 * (`lageneIUtkastet`). Dagene påvirker ikke lagene, så utregningen har én rad per frist uten
 * dagene som er vurdert (#1796). Kaster `UgyldigVurdering` når vurderingene av
 * fristene ikke er én per frist i kravet.
 */
export function lagIFristen(
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett,
  sendt: string | null
): LagIFristen {
  const { v, ubesvart, paakrevde } = utfylt(utkast.vurderinger, u, sendt);
  const krav = u.spor.frist.gjeldendeKrav!;
  let n = 0;
  const lagret = STANDPUNKTER_I_FRISTEN(v, krav, u, () => `utkast-${n++}`);
  const utregning = {
    frister: innholdIFristen(krav).frister.map((f) => ({
      gjelder: f.id,
      resultat: 'avslaatt',
      godkjent_dager: 0,
    })),
  };
  const svar = {
    spor: 'frist' as const,
    standpunkter: standpunkterISvaret('frist', { standpunkter: lagret, utregning }),
    utregning,
  };
  const { grunner, virkning, lag, etikett } = lageneIUtkastet(svar, u, regler, sendt);
  const fristene = fristvurderinger(utkast.vurderinger, krav);
  const utenDager = new Set(
    fristene.filter((f) => typeof f.dager !== 'number').map((f) => f.gjelder)
  );
  const forutsetninger = forutsetningene<Forutsetning>(
    svar.standpunkter,
    lag,
    grunner.map((grunn) => ({ grunn })),
    innsigelsenIFristen
  );
  const stilt: LagIFristen['stilt'] = [];
  const ubesvarte: LagIFristen['ubesvart'] = [];
  const still = (spoersmaal: LagIFristen['stilt'][number], besvart: boolean) => {
    stilt.push(spoersmaal);
    if (!besvart) ubesvarte.push(spoersmaal);
  };
  for (const spoersmaal of paakrevde) still({ spoersmaal }, !ubesvart.has(spoersmaal));
  // Når spesifiseringen kom for sent, og bare når den er et spørsmål for kravet (§ 33.6.2
  // fjerde ledd).
  const spesifiseringenForSent =
    paakrevde.includes('spesifisert_krav_ok') && utkast.vurderinger.spesifisert_krav_ok === false;
  for (const f of fristene) {
    // Dagene kontrolleres som manglende etter punkt 33.5 (`kontroller` i regelsettet).
    still({ spoersmaal: 'dager', gjelder: f.gjelder }, !mangler(f.dager));
    if (spesifiseringenForSent)
      still(
        { spoersmaal: 'dager_maatte_forstaa', gjelder: f.gjelder },
        !maatteForstaaUbesvart({ ...f, spesifisert_krav_ok: false })
      );
  }
  return {
    stilt,
    ubesvart: ubesvarte,
    ugyldig: utenom(ugyldigIFristen(utkast.vurderinger, fristene, krav, u), ubesvarte),
    standpunkter: svar.standpunkter.map((s, i) => ({
      art: s.art,
      ...(s.art === 'rettidighet' ? { hjemmel: s.hjemmel } : {}),
      ...(s.art === 'dager' ? { gjelder: s.gjelder } : {}),
      besvart: s.art === 'dager' ? !utenDager.has(s.gjelder) : !ubesvart.has(spoersmaaletFor(s)!),
      virkning: virkning[i]!,
      etikett: etikett[i]!,
      forutsetninger: forutsetninger[i]!,
    })),
  };
}

/**
 * Svarene i utkastet kontrollene av fristen avviser når svaret sendes (#2156), for hver frist
 * med de krevde dagene: spørsmålene om hele kravet og dagene (`kontroller` i regelsettet, punkt
 * 33.5 og 33.6.2 fjerde ledd), og dagene byggherren måtte forstå (`kontrollerSpesifiseringen`,
 * VS-U4) når dagene og spesifiseringen er godtatt. Også de ubesvarte, som kalleren tar ut.
 */
function ugyldigIFristen(
  v: Svarutkast['vurderinger'],
  fristene: ReturnType<typeof fristvurderinger>,
  krav: Krav,
  u: Utledning
): LagIFristen['ugyldig'] {
  const krevd = innholdIFristen(krav).frister;
  const foresporsel = foresporselForFristsvar(u);
  const hele = new Set<string | undefined>(Object.values(SPOERSMAALET));
  return fristene.flatMap((f, i): LagIFristen['ugyldig'] => {
    const feil = avvisteFelt(() =>
      kontrollerFristen(
        vurderingenAvFristen(v, f),
        fristkravet(krevd[i]!.dager, foresporsel, krav.erstatter === null)
      )
    );
    // Kontrollen leser dagene og spesifiseringen og kjører når de er godtatt, også når et
    // annet spørsmål er ubesvart. Sendingen kjører den først når hele fristen er godtatt.
    const maatteForstaa =
      feil.godkjent_dager || feil.spesifisert_krav_ok
        ? {}
        : avvisteFelt(() => dagerMaatteForstaa(v, f));
    return [
      ...Object.keys(feil).flatMap((felt): LagIFristen['ugyldig'] =>
        felt === 'godkjent_dager'
          ? [{ spoersmaal: 'dager' as const, gjelder: f.gjelder }]
          : hele.has(felt)
            ? [{ spoersmaal: felt as Fristspoersmaal }]
            : // VS-U95: samme spørsmål etter § 33.6.2, én gang.
              felt === 'begrunnelse_ikke_svar' && !Object.hasOwn(feil, 'foresporsel_svar_ok')
              ? [{ spoersmaal: 'foresporsel_svar_ok' as const }]
              : []
      ),
      ...Object.keys(maatteForstaa).map(() => ({
        spoersmaal: 'dager_maatte_forstaa' as const,
        gjelder: f.gjelder,
      })),
    ];
  });
}

/**
 * Fristene i kravet slik de lagres (KA-U79): en registrert frist får nummeret og navnet fra
 * fristtabellen for prosjektet (GFK-U23, MM-U50), og en frist uten `id` får `id` til fristen i
 * kontrakten som har stått med samme `fristnoekkel` i sporet, ellers en ny (KA-U76).
 * Nyttelastkontrollen har kontrollert fristene mot sporet før dette.
 */
function fristeneSomLagres(
  innhold: Record<string, unknown>,
  u: Utledning,
  kontekst: Pick<Kontekst, 'nyId' | 'kontraktsfrister'>
): Record<string, unknown> {
  const { eier } = fristeneISporet(u.spor.frist.krav, u.spor.frist.kravUtenforRekken);
  const frister = (innhold.frister as Record<string, unknown>[]).map((p) => {
    const id = (p.id as string | undefined) ?? eier.get(fristnoekkel(p)) ?? kontekst.nyId();
    const f = kontekst.kontraktsfrister.find((x) => x.fristId === p.frist_id);
    // `fristIkkeRegistrert` har avvist en frist som ikke står i fristtabellen. Uten den står
    // fristen uten navn, og kjernen forstår ikke kravet den skriver (MM-U2).
    if (p.frist_id === undefined || !f) return { ...p, id };
    return {
      id,
      frist_id: f.fristId,
      ...(f.nummer === null ? {} : { nummer: f.nummer }),
      navn: f.navn,
      dager: p.dager,
    };
  });
  return { ...innhold, frister };
}

/**
 * KA-U79, GFK-U23: en registrert frist i kravet står i fristtabellen for prosjektet saken
 * hører til. Prosjektgrensen holdes av fristtabellen i konteksten.
 */
function fristIkkeRegistrert(
  k: Extract<Kommando, { type: 'krav' }>,
  kontekst: Pick<Kontekst, 'kontraktsfrister'>
): Avvisning | null {
  for (const p of (k.innhold.frister ?? []) as Record<string, unknown>[])
    if (
      p.frist_id !== undefined &&
      !kontekst.kontraktsfrister.some((f) => f.fristId === p.frist_id)
    )
      return avvis(
        'FRIST_IKKE_REGISTRERT',
        `Fristen ${String(p.frist_id)} er ikke registrert for prosjektet. Angi nummeret og navnet kontrakten gir den i stedet.`
      );
  return null;
}

/**
 * Fristkravet med varselet etter § 33.4 TE legger til i kravskjemaet, som to rader: varselet som
 * registrert korrespondanse med kategorien varsel, og så kravet, som legger dokumentet ved
 * (VS-U34, VS-U53, C1 i #2056). Er varselet alt registrert, er kravet én rad, og datoen
 * kontrolleres mot det registrerte (`NYTTELAST`). Brevet prøves mot saken i `saksperre`.
 */
function medVarselet(k: Extract<Kommando, { type: 'krav' }>, skriving: Skrivesteg): Utfall | null {
  if (!k.varsel || skriving.sakenFoer().u.spor.frist.varsler['33.4']) return null;
  const { varsel, ...kravet } = k;
  return skriving.proevd((kx, jx) => {
    const varselet = varseletIKravet(varsel, skriving, kx, jx);
    if (!varselet.godtatt) return varselet;
    return {
      godtatt: true,
      hendelser: varselet.hendelser,
      neste: (ky, jy) => skriving.skriv(kravet, ky, jy, varsel.dokumentasjon ?? []),
    };
  });
}

/**
 * #2082: korrespondansen registreres én gang (OV-U80). Er totalentreprenørens brev med varselet
 * alt i saken, med det samme innholdet i vedleggene, velger totalentreprenøren varselet etter
 * § 33.4 for det (OV-U84), eller viser kravet til varselet som står i saken (VS-U73). Hele
 * dokumentet sammenliknes (`sammeDokument`). Vedleggene sammenliknes på
 * innholdet, så samme fil lastet opp på nytt er samme brev (#2100). Saken er den før handlingen,
 * så varselet kravskjemaet skrev i samme handling (`medVarselet`, `vedKravet`), ikke er med.
 */
function varseldokumentetISaken(
  k: Extract<Kommando, { type: 'krav' }>,
  { foer, vedKravet, oppslag }: Sakssperre
): Avvisning | null {
  const varselet = foer.u.spor.frist.varsler['33.4'];
  const vedlagte = innholdetIVedleggene(
    [...vedKravet, ...(k.varsel?.dokumentasjon ?? [])],
    oppslag
  );
  // VS-U73. Et krav lagt til har datoen det ble sendt (`erRegistrering`).
  const vedKravetsBrev = varselet && k.sendt === undefined && !!k.dokumentasjon?.length;
  if (!vedlagte.size && !vedKravetsBrev) return null;
  const rettet = rettedeBrev(foer.u.registrerteBrev);
  const brevene = foer.lest.filter(
    (h): h is Brevet =>
      h.art === 'dokument' &&
      h.dokument.lagtTilAv === 'TE' &&
      erRegistrert(h.dokument.opplysninger) &&
      !rettet.has(h.id)
  );
  const brevet = vedlagte.size
    ? brevene.find((h) => sammeDokument(h.dokument, vedlagte))
    : undefined;
  if (brevet)
    return varselet
      ? fjernBrevet(brevet)
      : avvis(
          'VARSEL_REGISTRERT',
          `Brevet med varselet står alt i saken${som(brevet)}. Velg varselet etter punkt 33.4 for det brevet i stedet for å legge det ved kravet på nytt.`
        );
  const varselbrevet = vedKravetsBrev ? brevene.find((h) => h.id === varselet.dokument) : undefined;
  const vedleggene = innholdetIVedleggene(k.dokumentasjon ?? [], oppslag);
  // VS-U75.
  return varselbrevet &&
    [...innholdetIDokumentet(varselbrevet.dokument)].some((x) => vedleggene.has(x))
    ? fjernBrevet(varselbrevet)
    : null;
}

type Brevet = Extract<Domenehendelse, { art: 'dokument' }>;

/** Brevet slik avvisningen omtaler det, med et mellomrom foran, eller tomt. */
function som(h: Brevet): string {
  const omtale = omtalen(h.dokument);
  return omtale ? ` som ${omtale}` : '';
}

const fjernBrevet = (h: Brevet) =>
  avvis(
    'VARSEL_REGISTRERT',
    `Brevet med varselet står alt i saken${som(h)}, og kravet viser til varselet etter punkt 33.4 som står i saken. Fjern brevet og vedleggene ved varselet fra kravet. Begrunnelsen kan vise til dem.`
  );

/** Raden med varselet fra kravskjemaet som registrert varsel etter § 33.4 (`medVarselet`). */
function varseletIKravet(
  varsel: NonNullable<Extract<Kommando, { type: 'krav' }>['varsel']>,
  skriving: Skrivesteg,
  kontekst: Kontekst,
  journal: Journalrad[]
): Utfall {
  // OV-U5: brevet med varselet ligger ved.
  if (!varsel.dokumentasjon?.length)
    return {
      godtatt: false,
      feil: 'REGELBRUDD',
      avvisning: avvis(
        'VEDLEGG_MANGLER',
        'Kravet oppgir datoen varselet etter punkt 33.4 ble sendt, men brevet med varselet ligger ikke ved.'
      ),
    };
  const kommando = { type: 'varsel', varsler: [{ hjemmel: '33.4' }], ...varsel };
  const form = skriving.formen(kommando);
  // Formfeilene får stien i fristkravet, som formfeilene i varselet ellers har.
  if (form && !form.godtatt)
    return {
      ...form,
      avvisning: {
        ...form.avvisning,
        melding: form.avvisning.melding
          .split('; ')
          .map((feil) => feil.replace(/^\$\./, '$.varsel.'))
          .join('; '),
      },
    };
  const utfall = skriving.skriv(kommando as Kommando, kontekst, journal);
  return utfall.godtatt
    ? utfall
    : {
        ...utfall,
        avvisning: {
          ...utfall.avvisning,
          melding: `Varselet etter punkt 33.4: ${utfall.avvisning.melding}`,
        },
      };
}

/** Skrivingen i fristen (`SKRIVING`). */
export const SKRIVING_I_FRISTEN = {
  kravinnhold: fristeneSomLagres,
  kontekstsperre: fristIkkeRegistrert,
  saksperre: varseldokumentetISaken,
  handlingen: medVarselet,
} satisfies Sporsskriving;
