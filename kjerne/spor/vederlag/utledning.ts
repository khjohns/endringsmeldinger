/**
 * Utledningen i vederlagssporet: versjonsreglene for kravpostene, varselet hver kravpost
 * trenger, og lesereglene i 4.2 som er vederlagets egne (`KONTROLLER_I_VEDERLAGET`, som
 * `utledning/utled.ts` slår opp gjennom `KONTROLLER`, #1783).
 *
 * Versjonsreglene for kravpostene er versjonsregelen for postene i `spor/poster/utledning.ts`
 * (KA-U53, KA-U56, KA-U75, #1778), og betegnelsen er P1, P2 og så videre (KA-U53).
 */

import {
  harProduktivitetspost,
  innholdIVederlaget,
  kunnskapsdatoIKravet,
  justerteEnhetspriser,
  kravposterI,
  OPPGJOERSHJEMMEL,
  varselhjemmel,
} from './format.ts';
import type {
  Bakover,
  Kunnskapsopplysning,
  LestVarsel,
  Sporskontroller,
  Sporutledning,
  Ugyldig,
  Utledning,
  Utsagn,
} from '../../utledning/utled.ts';
import { dagenSendt, dokumenterI, erRegistrert, foerDagen } from '../../format/leser.ts';
import {
  sisteStandpunktTilVarslene,
  utenStandpunkterForanEldreKrav,
  type StandpunktTilVarselet,
  type VarselIEtEldreKrav,
} from '../../frosset/standpunkt.ts';
import {
  posteneStrider,
  trekketStrider,
  utelattUtenTrekk,
  type Versjonsinndata,
} from '../poster/utledning.ts';
import {
  erKravpostvarselhjemmel,
  type Krav,
  type Kravpostvarselet,
  type Dokument,
  type Domenehendelse,
  type Kravpostvarselhjemmel,
  type Standpunkt,
  type Svar,
} from '../../typer.ts';

type Kravversjonsinndata = { kravposter?: Versjonsinndata['poster']; trekker?: readonly unknown[] };

/**
 * Hvorfor kravpostene i den nye kravversjonen strider mot de tidligere versjonene i sporet,
 * eller `null`, etter versjonsregelen for postene (`posteneStrider`). `lagret` sier om
 * innholdet er en lagret versjon eller en kommando, og `andre` er de andre kravversjonene i sporet
 * (`kravversjoneneKravetProevesMot`).
 */
export const kravposteneStrider = (
  ny: Kravversjonsinndata,
  tidligere: readonly Pick<Krav, 'innhold'>[],
  lagret: boolean,
  andre: readonly Pick<Krav, 'innhold'>[]
): string | null =>
  posteneStrider(
    { poster: ny.kravposter, trekker: ny.trekker },
    tidligere.map(kravposterI),
    lagret,
    'kravpost',
    andre.map(kravposterI)
  );

/**
 * Hvorfor den særskilte vederlagsjusteringen i den nye kravversjonen strider mot forrige
 * versjon etter KA-U83, eller `null`.
 */
export function saerskiltStrider(
  ny: Pick<Krav, 'innhold'>,
  tidligere: readonly Krav[]
): string | null {
  const posten = 'den særskilte vederlagsjusteringen';
  const { saerskilt, trekker_saerskilt: trekk } = innholdIVederlaget(ny);
  const forrige = tidligere.at(-1);
  const hadde = forrige !== undefined && harProduktivitetspost(forrige);
  const iForrige = new Map(hadde ? [['produktivitet', { id: 'produktivitet' }]] : []);
  const trekket = trekketStrider(trekk, iForrige, () => posten);
  if (trekket) return trekket;
  if (trekk.length && saerskilt.produktivitet) return `både tar med og trekker ${posten}`;
  if (trekk.length && !kravposterI(ny).length && !Object.keys(saerskilt).length)
    return `har ingen poster igjen når ${posten} er trukket`;
  return utelattUtenTrekk(
    iForrige,
    () => trekk.length > 0 || saerskilt.produktivitet !== undefined,
    () => posten
  );
}

/** Kravposten `id` med varselhjemmelen `hjemmel` i kravet `k`. */
const postenMed = (k: Pick<Krav, 'innhold'>, id: string, hjemmel: Kravpostvarselhjemmel) =>
  kravposterI(k).find((q) => q.id === id && varselhjemmel(q) === hjemmel);

/** Om kravposten `id` i kravet `k` viser til et varsel, etter hvilken som helst bestemmelse. */
const viserTilEtVarsel = (k: Pick<Krav, 'innhold'>, id: string) =>
  kravposterI(k).some((q) => q.id === id && q.varsel !== undefined);

/** Om en tidligere versjon i sporet har kravposten med samme varselhjemmel (VS-U49). */
const hattFoer = (
  p: ReturnType<typeof kravposterI>[number],
  hjemmel: Kravpostvarselhjemmel,
  tidligere: readonly Pick<Krav, 'innhold'>[]
) => tidligere.some((k) => postenMed(k, p.id, hjemmel) !== undefined);

/**
 * OV-U120: kravene utenfor rekken i vederlaget sendt før dagen `dag`, i rekkefølgen de ble sendt.
 * Uten dag, for et krav fra løsningen, alle.
 */
export function eldreKravFoer(u: Utledning, dag: string | null): Krav[] {
  const dokumenter = new Map([...dokumenterI(u.journal)].map((d) => [d.id, d]));
  return sendtFoer(
    u.spor.vederlag.kravUtenforRekken,
    (k) => dagenSendt(k, dokumenter.get(k.dokument)!),
    dag
  );
}

/** Kravene i `krav` sendt før dagen `dag`, i rekkefølgen de ble sendt; uten dag alle. */
const sendtFoer = (
  krav: readonly Krav[],
  sendt: (k: Krav) => string | null,
  dag: string | null
): Krav[] =>
  krav
    .map((k) => ({ k, sendt: sendt(k) }))
    .filter((x) => dag === null || foerDagen(x.sendt, dag))
    .sort((a, b) => (a.sendt ?? '').localeCompare(b.sendt ?? ''))
    .map(({ k }) => k);

/**
 * Varselet for hver kravpost i `krav` som trenger et, etter kravpostens `id`.
 * - VS-U48, VS-U49: kravet er varselet når ingen tidligere versjon har posten med samme
 *   oppgjørsform, justert for enhetspriser.
 * - VS-U50, VS-U54: viser kravposten til et varsel, er varselet gitt der.
 * - D-16 i BF-14 (arbeidsvalget i Følge hos VS-U48) og VS-U55: ellers gjelder et varsel etter
 *   samme bestemmelse sendt eller registrert før det første kravet posten. Kravet viser da til
 *   det første av dem og er ikke varselet selv.
 * - OV-U120: ellers det første kravet i `eldre` med posten og samme varselhjemmel, med
 *   vilkår 3 prøvd mot det og `tidligere`.
 * `tidligere` er versjonene før `krav` i rekken, `eldre` kravene utenfor rekken sendt før `krav`
 * i rekkefølgen de ble sendt (`eldreKravFoer`), og `varsler` varslene etter § 34.3.3 og § 34.4
 * før `krav`, i rekkefølgen i journalen, uten dokumentene kravskjemaet la til for en kravpost i
 * samme handling, som gjelder bare den posten (VS-U51, VS-U53).
 */
export function kravpostvarslene(
  krav: Pick<Krav, 'innhold'>,
  tidligere: readonly Pick<Krav, 'innhold'>[],
  varsler: readonly { id: string; hjemmel: string }[],
  eldre: readonly Pick<Krav, 'id' | 'innhold'>[]
): Record<string, Kravpostvarselet> {
  const ut: Record<string, Kravpostvarselet> = {};
  for (const p of kravposterI(krav)) {
    const hjemmel = varselhjemmel(p);
    if (hjemmel === null || hattFoer(p, hjemmel, tidligere)) continue;
    const gitt =
      p.varsel ?? (tidligere.length ? undefined : varsler.find((v) => v.hjemmel === hjemmel)?.id);
    const iEldre = eldre.find((k) => postenMed(k, p.id, hjemmel));
    if (gitt) ut[p.id] = { art: 'gitt', varsel: gitt };
    else if (!iEldre) ut[p.id] = { art: 'kravet' };
    else if (![...eldre, ...tidligere].some((k) => viserTilEtVarsel(k, p.id)))
      ut[p.id] = { art: 'gitt', varsel: iEldre.id };
  }
  return ut;
}

/**
 * Varslene etter § 34.3.3 og § 34.4 i `varsler` uten dokumentene med et vedlegg som ligger ved
 * kravet i dokumentet `nytt`: kravskjemaet la dem til i samme handling, og de gjelder bare
 * kravposten som viser til dem (VS-U51, VS-U53).
 */
export function varsleneForanKravet(
  varsler: readonly LestVarsel[],
  nytt: Pick<Dokument, 'dokumentasjon'>,
  dokumentet: (id: string) => Pick<Dokument, 'dokumentasjon'> | undefined
): LestVarsel[] {
  const vedlagte = new Set(nytt.dokumentasjon.map((v) => v.vedlegg_id));
  return varsler.filter(
    (v) => !dokumentet(v.dokument)?.dokumentasjon.some((d) => vedlagte.has(d.vedlegg_id))
  );
}

/**
 * OV-U120: kravpostene som har et krav utenfor rekken som varsel, for hver kravversjon i rekken
 * som ellers ville vært varselet for posten (`kravpostvarslene`). Bare brevene i `u.journal` før
 * brevet `kjentFoer` leses, slik kjernen kjente saken da (VS-U81).
 */
export function varslerIEldreKrav(u: Utledning, kjentFoer?: string): VarselIEtEldreKrav[] {
  const alle = [...dokumenterI(u.journal)];
  const slutt = kjentFoer === undefined ? alle.length : alle.findIndex((d) => d.id === kjentFoer);
  if (slutt === -1) throw new Error(`Brevet ${kjentFoer} er ikke i saken.`);
  const dokumenter = alle.slice(0, slutt);
  const plass = new Map(dokumenter.map((d, i) => [d.id, i]));
  const kjent = (x: { dokument: string }) => plass.has(x.dokument);
  const krav = u.spor.vederlag.krav.filter(kjent);
  const kravUtenforRekken = u.spor.vederlag.kravUtenforRekken.filter(kjent);
  if (!kravUtenforRekken.length) return [];
  const sendt = (k: Krav) => dagenSendt(k, dokumenter[plass.get(k.dokument)!]);
  const eldre = new Map(kravUtenforRekken.map((k) => [k.id, k]));
  return krav.flatMap((k, i) => {
    const varsler = varsleneForanKravet(
      u.spor.vederlag.kravpostvarsler.filter(
        (v) => kjent(v) && plass.get(v.dokument)! < plass.get(k.dokument)!
      ),
      dokumenter[plass.get(k.dokument)!],
      (id) => dokumenter[plass.get(id)!]
    );
    const varslene = kravpostvarslene(
      k,
      krav.slice(0, i),
      varsler,
      sendtFoer(kravUtenforRekken, sendt, sendt(k))
    );
    return kravposterI(k).flatMap((p) => {
      const v = varslene[p.id];
      const e = v?.art === 'gitt' ? eldre.get(v.varsel) : undefined;
      // OV-U120 vilkår 3 gjelder også kravversjonene etter `k` og de andre kravene utenfor rekken.
      return e && ![...krav, ...kravUtenforRekken].some((x) => viserTilEtVarsel(x, p.id))
        ? [{ gjelder: p.id, hjemmel: varselhjemmel(p)!, dokument: e.dokument }]
        : [];
    });
  });
}

/**
 * Hvorfor en kravpost i den nye kravversjonen viser til et varsel den ikke kan vise til, eller
 * `null` (VS-U50, VS-U54). Kravposten må trenge varselet etter § 34.3.3 eller § 34.4 og være
 * varsel for seg (VS-U49), og varselet må stå i saken før kravet med samme bestemmelse.
 * `varsler` er varslene etter § 34.3.3 og § 34.4 før kravet, og `eldre` kravene utenfor rekken
 * sendt før det, som også er tidligere versjoner (OV-U118, OV-U120).
 */
export function kravpostvarseletStrider(
  ny: Pick<Krav, 'innhold'>,
  iRekken: readonly Pick<Krav, 'innhold'>[],
  varsler: readonly { id: string; hjemmel: string }[],
  eldre: readonly Pick<Krav, 'innhold'>[]
): string | null {
  const tidligere = [...eldre, ...iRekken];
  for (const [i, p] of kravposterI(ny).entries()) {
    if (p.varsel === undefined) continue;
    const posten = p.betegnelse ? `kravposten ${p.betegnelse}` : `kravpost nr. ${i + 1}`;
    const hjemmel = varselhjemmel(p);
    if (hjemmel === null)
      return `${posten} viser til et varsel, men oppgjørsformen krever ikke varsel etter punkt 34.3.3 eller 34.4`;
    // KA-U75: også en kravpost som er trukket og tas med igjen, sammenlignes med siste versjon den sto i.
    const somFoer = [...tidligere]
      .reverse()
      .map((k) => kravposterI(k).find((q) => q.id === p.id))
      .find((q) => q !== undefined);
    if (hattFoer(p, hjemmel, tidligere) && somFoer?.varsel !== p.varsel)
      return `${posten} viser til et varsel, men hadde oppgjørsformen i en tidligere kravversjon`;
    if (!varsler.some((v) => v.id === p.varsel && v.hjemmel === hjemmel))
      return `${posten} viser til et varsel som ikke er et varsel etter punkt ${hjemmel} sendt eller registrert i saken før kravet`;
  }
  return null;
}

/**
 * VS-U50, VS-U54: en kravpost viser bare til et varsel for posten som står før kravet. `eldre`
 * gir kravene utenfor rekken sendt før kravversjonen og lagt til før den (OV-U120, MM-U50).
 */
function kontrollerKravpostvarslene(
  krav: readonly Krav[],
  varsler: readonly LestVarsel[],
  bakover: Bakover,
  ugyldig: Ugyldig,
  eldre: (k: Krav) => readonly Krav[]
): void {
  krav.forEach((k, i) => {
    const foer = varsler.filter((v) => erKravpostvarselhjemmel(v.hjemmel) && bakover(k.id, v.id));
    const strid = kravpostvarseletStrider(k, krav.slice(0, i), foer, eldre(k));
    if (strid) ugyldig(k.id, strid);
  });
}

/**
 * OV-U23, KA-U57 (c): svaret på vederlaget har ett beløp for hver post i kravet og ingen
 * andre. Oppgjørsformen står rett foran beløpet for samme kravpost (leseren), så den følger med.
 */
function kontrollerPostene(s: Svar, krav: Krav, ugyldig: Ugyldig): void {
  const noekler = (poster: [string, string][]) =>
    poster
      .map((p) => JSON.stringify(p))
      .sort()
      .join();
  const iSvaret = noekler(
    s.standpunkter.flatMap((p): [string, string][] =>
      p.art !== 'beloep'
        ? []
        : [p.gjelder !== undefined ? ['kravpost', p.gjelder] : ['saerskilt', String(p.saerskilt)]]
    )
  );
  const iKravet = noekler([
    ...kravposterI(krav).map((p): [string, string] => ['kravpost', p.id]),
    ...(harProduktivitetspost(krav) ? [['saerskilt', 'produktivitet'] as [string, string]] : []),
  ]);
  if (iSvaret !== iKravet) ugyldig(s.id, 'beløpene i svaret er ikke de samme postene som i kravet');
  const poster = new Map(kravposterI(krav).map((p) => [p.id, p]));
  for (const p of s.standpunkter) {
    const grunn = kravpoststandpunktetStrider(p, poster);
    if (grunn) ugyldig(s.id, grunn);
  }
}

/**
 * Hvorfor et standpunkt som gjelder en kravpost, ikke passer til kravposten i kravet, eller
 * `null`: standpunktet til oppgjørsformen har TEs oppgjørsform som hjemmel, rettidigheten etter
 * § 34.3.3 eller § 34.4 gjelder en kravpost som trenger det varselet (KA-U64), justeringen
 * gjelder en kravpost med justerte enhetspriser (KA-U68), og beløpet har ikke et beløp for en
 * kravpost etter en beregningsregel (OV-U115 punkt 5).
 */
function kravpoststandpunktetStrider(
  p: Standpunkt,
  poster: ReadonlyMap<string, ReturnType<typeof kravposterI>[number]>
): string | null {
  if (p.art === 'oppgjoersform') {
    const post = poster.get(p.gjelder);
    return post && OPPGJOERSHJEMMEL[post.oppgjoersform] === p.hjemmel
      ? null
      : 'standpunktet til oppgjørsformen har ikke TEs oppgjørsform for kravposten som hjemmel';
  }
  if (p.art === 'rettidighet' && erKravpostvarselhjemmel(p.hjemmel)) {
    const post = poster.get(p.gjelder);
    return post && varselhjemmel(post) === p.hjemmel
      ? null
      : `rettidigheten etter § ${p.hjemmel} gjelder ikke en kravpost som trenger det varselet`;
  }
  if (p.art === 'justering') {
    const post = poster.get(p.gjelder);
    return post && justerteEnhetspriser(post)
      ? null
      : 'justeringen gjelder ikke en kravpost med justerte enhetspriser';
  }
  // OV-U115 punkt 5: en kravpost etter en beregningsregel har ikke et beløp i svaret.
  if (p.art === 'beloep' && p.gjelder !== undefined && p.godkjent !== undefined) {
    const post = poster.get(p.gjelder);
    return post && post.oppgjoersform !== 'tilbud'
      ? 'standpunktet til beløpet har et beløp for en kravpost etter en beregningsregel'
      : null;
  }
  return null;
}

/** Kontrollene i vederlaget, som `utledning/utled.ts` slår opp gjennom `KONTROLLER`. */
export const KONTROLLER_I_VEDERLAGET = {
  kravet: (k, tidligere, andre) =>
    kravposteneStrider(innholdIVederlaget(k), tidligere, true, andre) ??
    saerskiltStrider(k, tidligere),
  kravene: kontrollerKravpostvarslene,
  svaret: kontrollerPostene,
  kanFaaPassivitet: false,
  leserDatoen: false,
  svaretKanGodtas: () => true,
  saken: () => {},
} satisfies Sporskontroller;

/**
 * Byggherrens siste standpunkt til varselet for hver kravpost i svarene på vederlaget
 * (`sisteStandpunktTilVarslene`). Et svar lagt til, sendt på dagen `sendt`, leser bare svarene
 * sendt før den dagen (OV-U98, OV-U104), eller til og med den dagen når `medSammeDag` er satt.
 * `kjentFoer` er et brev i saken: da leses bare brevene som var i journalen før det, slik
 * kjernen kjente dem da brevet ble sendt eller lagt til (VS-U81).
 */
export function standpunkteneTilVarslene(
  u: Utledning,
  sendt: string | null,
  medSammeDag = false,
  kjentFoer?: string
): StandpunktTilVarselet[] {
  const { svar, svarUtenforRekken, svarPaaVarsler, krav, kravUtenforRekken } = u.spor.vederlag;
  const medVirkning = new Set([...svar, ...svarUtenforRekken, ...svarPaaVarsler].map((s) => s.id));
  // Journalens rekkefølge, som brevteksten leser, så svar fra samme dag leses likt (OV-U104).
  const dokumenter = [...dokumenterI(u.journal)];
  const slutt =
    kjentFoer === undefined ? dokumenter.length : dokumenter.findIndex((d) => d.id === kjentFoer);
  if (slutt === -1) throw new Error(`Brevet ${kjentFoer} er ikke i saken.`);
  const plass = new Map(dokumenter.map((d, i) => [d.id, i]));
  const eldre = varslerIEldreKrav(u, kjentFoer);
  return sisteStandpunktTilVarslene(
    dokumenter
      .slice(0, slutt)
      .flatMap((d) =>
        d.svar
          .filter((s) => medVirkning.has(s.id))
          .map((s) => ({
            s: utenStandpunkterForanEldreKrav(s, eldre, plass),
            dag: dagenSendt({ id: s.id, dokument: d.id }, d) ?? '',
            lagtTil: erRegistrert(d.opplysninger),
          }))
      )
      .filter(
        ({ dag }) => sendt === null || foerDagen(dag, sendt) || (medSammeDag && dag === sendt)
      ),
    // VS-U77 punkt 34: også en kravpost som er trukket i en senere versjon, for et svar på en
    // eldre versjon (OV-U103). Kravposten har samme id i alle versjonene.
    [
      ...new Map(
        [...kravUtenforRekken, ...krav].flatMap(kravposterI).map((p) => [p.id, p])
      ).values(),
    ]
  );
}

/**
 * VS-U86 punkt 14 (VS-U82): det egne utsagnet om kunnskapsdatoen viser bakover til varselet etter
 * § 34.1.3 eller til et vederlagskrav med posten etter annet ledd. Datoen i vederlagskravet står
 * bare i den første versjonen som krever posten (D-2 i BF-48, VS-U85).
 */
export function kontrollerKunnskapsdatoene(
  utsagn: readonly Utsagn<'kunnskapsdato'>[],
  vederlag: Pick<Sporutledning, 'krav'>,
  varsler: readonly LestVarsel[],
  kravMedUten: Map<string, Krav>,
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  const etter3413 = new Set(varsler.filter((v) => v.hjemmel === '34.1.3').map((v) => v.id));
  for (const x of utsagn) {
    const krav = kravMedUten.get(x.gjelder);
    const kanGjelde =
      etter3413.has(x.gjelder) ||
      (krav !== undefined && krav.spor === 'vederlag' && harProduktivitetspost(krav));
    if (!kanGjelde || !bakover(x.id, x.gjelder))
      ugyldig(
        x.id,
        'opplysningen om kunnskapsdatoen viser ikke til et varsel etter § 34.1.3 før den'
      );
  }
  const [foerste] = vederlag.krav.filter(harProduktivitetspost);
  for (const k of vederlag.krav)
    if (k !== foerste && kunnskapsdatoIKravet(k) !== undefined)
      ugyldig(
        k.id,
        'kunnskapsdatoen etter § 34.1.3 står i en kravversjon som ikke er den første med posten etter annet ledd'
      );
}

/**
 * TEs opplysninger om kunnskapsdatoen etter § 34.1.3 annet ledd (`Kunnskapsopplysning`), i
 * rekkefølgen i journalen: varselet etter § 34.1.3 og vederlagskravet med datoen, og hvert eget
 * utsagn (VS-U86 punkt 12 og 14). Den første og hvert utsagn blir TEs siste opplysning; datoen i
 * et varsel eller krav etter det står som opplysningen i det brevet (VS-U85).
 */
export function opplysningerOmKunnskapsdatoen(
  journal: readonly Domenehendelse[],
  vederlag: Pick<Sporutledning, 'krav' | 'kravUtenforRekken'>,
  varsler: readonly LestVarsel[],
  utsagn: readonly Utsagn<'kunnskapsdato'>[]
): Kunnskapsopplysning[] {
  const krav = new Set([...vederlag.krav, ...vederlag.kravUtenforRekken].map((k) => k.id));
  const varslene = new Set(varsler.map((v) => v.id));
  const egne = new Set(utsagn.map((x) => x.id));
  const ut: Kunnskapsopplysning[] = [];
  const legg = (id: string, dokument: string, dato: string, egen: boolean) =>
    ut.push({ id, dokument, dato, utsagn: egen, blirSiste: egen || ut.length === 0 });
  for (const h of journal) {
    if (h.art !== 'dokument') continue;
    const d = h.dokument;
    for (const k of d.krav) {
      const dato = krav.has(k.id) ? kunnskapsdatoIKravet(k) : undefined;
      if (dato !== undefined) legg(k.id, d.id, dato, false);
    }
    for (const u of d.utsagn) {
      if (u.art === 'varsel' && varslene.has(u.id) && u.klar_over_utgiftene !== undefined)
        legg(u.id, d.id, u.klar_over_utgiftene, false);
      if (u.art === 'kunnskapsdato' && egne.has(u.id))
        legg(u.id, d.id, u.klar_over_utgiftene, true);
    }
  }
  return ut;
}

/** TEs siste opplysning om kunnskapsdatoen etter § 34.1.3 (VS-U85), eller `null`. */
export const sisteKunnskapsdato = (
  u: Pick<Utledning, 'kunnskapsdatoer'>
): Kunnskapsopplysning | null => u.kunnskapsdatoer.filter((o) => o.blirSiste).at(-1) ?? null;
