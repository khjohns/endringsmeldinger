/**
 * Kommandoene i fristen (#1783): formen på kravet, nyttelastkontrollen, forutsetningene,
 * standpunktene i svaret og skrivingen av kravet. Regelsettet for sporet står i
 * `regler/frist.ts`.
 */

import { HJEMMEL } from '../../format/format.ts';
import { erRegistrert, standpunkterISvaret } from '../../format/leser.ts';
import { omtalen } from '../../frosset/brevdeler.ts';
import { feilI, objekt } from '../../format/skjema.ts';
import type { Subsidiaergrunn } from '../../regler/forhold.ts';
import type { Regelsett } from '../../regler/regelsett.ts';
import { varseletForNyttSvar, type Utledning } from '../../utledning/utled.ts';
import {
  avvis,
  type Avvisning,
  type Domenehendelse,
  type Journalrad,
  type Standpunkt,
} from '../../typer.ts';
import type { Kommando, Kravform, Svarutkast } from '../../kommandoer/kommando.ts';
import type { Sporsnyttelast } from '../../kommandoer/nyttelast.ts';
import type { Sporsforutsetninger } from '../../kommandoer/forutsetninger.ts';
import type { Sporsstandpunkter } from '../../kommandoer/standpunkter.ts';
import type {
  Kontekst,
  Skrivesteg,
  Sporsskriving,
  Utfall,
  Sakssperre,
  Vedleggsoppslag,
} from '../../kommandoer/skriving.ts';
import {
  foresporselForFristsvar,
  fristeneISporet,
  fristeneStrider,
  fristkravErFremmet,
  fristnoekkel,
} from './utledning.ts';
import { fristinnhold, innholdIFristen } from './format.ts';
import { fristkravet, fristvurderinger } from './frysing.ts';
import { paakrevdeSpoersmaal, type Fristspoersmaal } from '../../regler/frist.ts';
import { mangler } from '../../regler/typer.ts';
import { maatteForstaaUbesvart } from '../../regler/svarkontroll.ts';
import type { Utkastlag } from '../poster/kommando.ts';
import { lageneIUtkastet } from '../../kommandoer/utkastlag.ts';

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

/** KA-U76, KA-U79: fristene i kravet mot de tidligere kravversjonene. */
function fristsperre(k: Extract<Kommando, { type: 'krav' }>, u: Utledning): Avvisning | null {
  const strid = fristeneStrider(
    k.innhold as Parameters<typeof fristeneStrider>[0],
    u.spor.frist.krav,
    false
  );
  return strid ? avvis('FRISTENE', `Kravversjonen ${strid}.`) : null;
}

/** Nyttelastkontrollen i fristen (`NYTTELAST`). */
export const NYTTELAST_I_FRISTEN = {
  begrunnelse: () => null,
  kravsperre: fristsperre,
  innsigelse: () => null,
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
  innsigelsenErIkkeBygget: () => null,
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
      // VS-U19, VS-U47 spørsmål 2: fra appen så lenge TE ikke har krevd dager.
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
export const STANDPUNKTER_I_FRISTEN: Sporsstandpunkter = (v, krav, u, nyId) => {
  const ut: Record<string, unknown>[] = [];
  // VS-U20, OV-U5, HF-U1: varselet før svaret.
  if (typeof v.frist_varsel_ok === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: varseletForNyttSvar(u, '33.4'),
      hjemmel: HJEMMEL.frist,
      i_tide: v.frist_varsel_ok,
    });
  // VS-U17, VS-U29: svaret på forespørselen etter § 33.6.2, som kravet eller begrunnelsen.
  const f = foresporselForFristsvar(u);
  if (typeof v.foresporsel_svar_ok === 'boolean' && f)
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: f.gjelder,
      hjemmel: '33.6.2',
      i_tide: v.foresporsel_svar_ok,
    });
  if (typeof v.vilkar_oppfylt === 'boolean')
    ut.push({ id: nyId(), art: 'hindring', oppfylt: v.vilkar_oppfylt });
  const frister = fristvurderinger(v, krav);
  if (typeof v.spesifisert_krav_ok === 'boolean')
    ut.push({
      id: nyId(),
      art: 'spesifisering',
      gjelder: krav.id,
      hjemmel: '33.6.1',
      i_tide: v.spesifisert_krav_ok,
      // D-5: dagene byggherren måtte forstå, for hver frist i kravet.
      ...(v.spesifisert_krav_ok
        ? {}
        : {
            maatte_forstaa: frister.map((f) => ({
              frist: f.gjelder,
              dager: f.dager_maatte_forstaa,
            })),
          }),
    });
  // KA-U74: dagene for hver frist i kravet.
  for (const f of frister) ut.push({ id: nyId(), art: 'dager', gjelder: f.gjelder });
  return ut;
};

/**
 * Det i et foregående lag som rammer standpunktet (OV-U32): en grunn fra forholdet, en innsigelse
 * etter § 33.4, § 33.6.2 eller § 33.6.1, eller at fremdriften ikke ble hindret (KA-U78, KA-U81).
 */
export type Forutsetning =
  | { grunn: Subsidiaergrunn }
  | { innsigelse: '33.4' | '33.6.2' | '33.6.1' | 'hindring' };

/**
 * Lagene i et svarutkast på fristen, med spørsmålene om hele kravet og dagene for hver frist
 * (`gjelder`). Fristen har ingen egne felt i standpunktet.
 */
export type LagIFristen = Utkastlag<
  Forutsetning,
  Fristspoersmaal | 'dager' | 'dager_maatte_forstaa'
>;

/** Spørsmålet i svaret hvert standpunkt om hele kravet svarer på. */
const SPOERSMAALET: Readonly<Record<string, Fristspoersmaal>> = {
  'rettidighet 33.4': 'frist_varsel_ok',
  'rettidighet 33.6.2': 'foresporsel_svar_ok',
  hindring: 'vilkar_oppfylt',
  spesifisering: 'spesifisert_krav_ok',
};

/** Spørsmålet standpunktet svarer på, eller `null` for dagene. */
function spoersmaaletFor(s: Standpunkt): Fristspoersmaal | null {
  if (s.art === 'dager') return null;
  const noekkel = s.art === 'rettidighet' ? `${s.art} ${s.hjemmel}` : s.art;
  const felt = SPOERSMAALET[noekkel];
  if (!felt) throw new Error(`standpunktet ${noekkel} svarer ikke på noe spørsmål i fristen`);
  return felt;
}

/**
 * Vurderingene i utkastet med hvert ubesvart spørsmål regelsettet stiller (`paakrevdeSpoersmaal`),
 * besvart uten innsigelse (S1-A), og spørsmålene som var ubesvart (#1925, KA-U78).
 */
function utfylt(v: Svarutkast['vurderinger'], u: Utledning) {
  const paakrevde = paakrevdeSpoersmaal(fristkravet(0, foresporselForFristsvar(u))).map(
    ([felt]) => felt
  );
  const ubesvart = new Set(paakrevde.filter((felt) => mangler(v[felt])));
  const utfylt: Record<string, unknown> = { ...v };
  for (const felt of ubesvart) utfylt[felt] = true;
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
 * standpunktet står med `besvart: false` (#1925). Lagene fra forholdet leses av gjeldende svar
 * på forholdet, som i vederlaget. Dagene påvirker ikke lagene, så utregningen har én rad per
 * frist uten dagene som er vurdert (#1796). Kaster `UgyldigVurdering` når vurderingene av
 * fristene ikke er én per frist i kravet.
 */
export function lagIFristen(utkast: Svarutkast, u: Utledning, regler: Regelsett): LagIFristen {
  const { v, ubesvart, paakrevde } = utfylt(utkast.vurderinger, u);
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
  const { grunner, virkning, lag, etikett } = lageneIUtkastet(svar, utkast, u, regler);
  const fristene = fristvurderinger(utkast.vurderinger, krav);
  const utenDager = new Set(
    fristene.filter((f) => typeof f.dager !== 'number').map((f) => f.gjelder)
  );
  // Hvert standpunkt i et tidligere lag i sporet åpnet laget etter seg (OV-U32).
  const aapnetLaget = (f: Standpunkt): Forutsetning[] => {
    if (f.art === 'rettidighet')
      return f.hjemmel === '33.4' || f.hjemmel === '33.6.2' ? [{ innsigelse: f.hjemmel }] : [];
    if (f.art === 'spesifisering') return [{ innsigelse: '33.6.1' }];
    if (f.art === 'hindring') return [{ innsigelse: 'hindring' }];
    return [];
  };
  return {
    ubesvart: [
      ...[...ubesvart].map((spoersmaal) => ({ spoersmaal })),
      // Dagene kontrolleres som manglende etter punkt 33.5 (`kontroller` i regelsettet).
      ...fristene.flatMap((f) => [
        ...(mangler(f.dager) ? [{ spoersmaal: 'dager' as const, gjelder: f.gjelder }] : []),
        // Bare når spesifiseringen er et spørsmål for kravet (§ 33.6.2 fjerde ledd).
        ...(paakrevde.includes('spesifisert_krav_ok') &&
        maatteForstaaUbesvart({
          ...f,
          spesifisert_krav_ok: utkast.vurderinger.spesifisert_krav_ok,
        })
          ? [{ spoersmaal: 'dager_maatte_forstaa' as const, gjelder: f.gjelder }]
          : []),
      ]),
    ],
    standpunkter: svar.standpunkter.map((s, i) => {
      const l = lag[i]!;
      return {
        art: s.art,
        ...(s.art === 'rettidighet' ? { hjemmel: s.hjemmel } : {}),
        ...(s.art === 'dager' ? { gjelder: s.gjelder } : {}),
        besvart: s.art === 'dager' ? !utenDager.has(s.gjelder) : !ubesvart.has(spoersmaaletFor(s)!),
        virkning: virkning[i]!,
        etikett: etikett[i]!,
        forutsetninger:
          l === null
            ? []
            : [
                ...grunner.map((grunn) => ({ grunn })),
                ...svar.standpunkter.slice(0, i).flatMap((f, j) => {
                  const lj = lag[j]!;
                  return lj !== null && lj < l ? aapnetLaget(f) : [];
                }),
              ],
      };
    }),
  };
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
  const { eier } = fristeneISporet(u.spor.frist.krav);
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
 * dokumentet sammenliknes, fordi ett vedlegg kan ligge ved to brev. Vedleggene sammenliknes på
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
  // VS-U73: et krav sendt fra løsningen har ikke brevet med varselet etter § 33.4 i saken som
  // vedlegg. Et krav lagt til, med datoen det ble sendt (`erRegistrering`), har brevet som ble
  // sendt (OV-U80).
  const vedKravetsBrev = varselet && k.sendt === undefined && !!k.dokumentasjon?.length;
  if (!vedlagte.size && !vedKravetsBrev) return null;
  const rettet = new Set(
    foer.lest.flatMap((h) => (h.art === 'dokument' ? [h.dokument.retter] : []))
  );
  const brevene = foer.lest.filter(
    (h): h is Brevet =>
      h.art === 'dokument' &&
      h.dokument.avsender === 'TE' &&
      erRegistrert(h.dokument.opplysninger) &&
      !rettet.has(h.id)
  );
  const brevet = vedlagte.size
    ? brevene.find((h) => likeMengder(innholdetIBrevet(h), vedlagte))
    : undefined;
  if (brevet)
    return varselet
      ? fjernBrevet(brevet)
      : avvis(
          'VARSEL_REGISTRERT',
          `Brevet med varselet står alt i saken${som(brevet)}. Velg varselet etter punkt 33.4 for det brevet i stedet for å legge det ved kravet på nytt.`
        );
  const varselbrevet = vedKravetsBrev ? brevene.find((h) => h.id === varselet.dokument) : undefined;
  return varselbrevet?.dokument.dokumentasjon.length &&
    erDelAv(innholdetIBrevet(varselbrevet), innholdetIVedleggene(k.dokumentasjon ?? [], oppslag))
    ? fjernBrevet(varselbrevet)
    : null;
}

type Brevet = Extract<Domenehendelse, { art: 'dokument' }>;

/** Innholdet i vedleggene, med ID-en for et vedlegg mellomlageret ikke har (#2100). */
const innholdetIVedleggene = (ider: readonly string[], oppslag: Vedleggsoppslag) =>
  new Set(
    ider.map((id) => oppslag.get(id.toLowerCase())?.innhold_sha256 ?? `id:${id.toLowerCase()}`)
  );

const innholdetIBrevet = (h: Brevet) =>
  new Set(h.dokument.dokumentasjon.map((v) => v.innhold_sha256));

function erDelAv(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

const likeMengder = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && erDelAv(a, b);

/** Brevet slik avvisningen omtaler det, med et mellomrom foran, eller tomt. */
function som(h: Brevet): string {
  const omtale = omtalen(h.dokument);
  return omtale ? ` som ${omtale}` : '';
}

const fjernBrevet = (h: Brevet) =>
  avvis(
    'VARSEL_REGISTRERT',
    `Brevet med varselet står alt i saken${som(h)}, og kravet viser til varselet etter punkt 33.4 som står i saken. Fjern brevet fra kravet.`
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
  const kommando = { type: 'varsel', spor: 'frist', hjemmel: '33.4', ...varsel };
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
