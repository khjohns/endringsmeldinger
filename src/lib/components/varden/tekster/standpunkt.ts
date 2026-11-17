import { PARTEN, stor } from '#kjerne/frosset/brevdeler.ts';
import { dager, kroner } from '#kjerne/frosset/tekst.ts';
import type { Subsidiaergrunn } from '#kjerne/regler/forhold.ts';
import type { Kravpost, Standpunkt } from '#kjerne/typer.ts';
import {
  forholdstilfellet,
  type Forholdsordene,
  type Forholdstilfelle,
} from '#kjerne/spor/forhold/tekst.ts';
import type { Brevref, Innlegget, Standpunktet } from '../lesing';
import { SKJEMA } from './svaret';
import { brevref, metodenavn, oppgjoersformEtter } from './felles';
import { punkt, haerdet } from './format';

/** En grunn fra svaret på grunnlaget i brevet `brev`, som utsagn fra byggherren. */
export const grunntekst = haerdet((grunn: Subsidiaergrunn, du: boolean, brev: Brevref) =>
  grunn === 'avslaatt'
    ? `${du ? 'Du' : 'Byggherren'} har avslått forholdet i ${brevref(brev)}`
    : `${du ? 'Du' : 'Byggherren'} har gjort gjeldende i ${brevref(brev)} at varselet om forholdet kom for sent (punkt 32.2)`
);

/**
 * Standpunktet i den lukkede kravposten, kort og uten kravposten, som raden navngir (prototype v3,
 * `leselinje`). Bare standpunktene til oppgjørsformen, beløpet, varselet etter § 34.3.3 eller
 * § 34.4 og justeringen gjelder én kravpost; ellers `null`.
 */
function kortStandpunkt(s: Standpunkt, krevd?: number): string | null {
  switch (s.art) {
    case 'oppgjoersform': {
      const form = metodenavn(oppgjoersformEtter(s.hjemmel));
      return (
        (s.aksepterer
          ? `Godkjenner ${form}`
          : s.oensket
            ? `Mener ${metodenavn(s.oensket)}`
            : `Godkjenner ikke ${form}`) + (s.kreverTilbud ? `, ${SKJEMA.kreverTilbudKort}` : '')
      );
    }
    // Byggherrens standpunkt, ikke løsningens konklusjon.
    case 'rettidighet':
      if (s.hjemmel === '34.4')
        return 'Gjør gjeldende at varselet etter punkt 34.4 ikke ble gitt eller kom for sent';
      if (s.hjemmel !== '34.3.3') return null;
      return s.iTide
        ? 'Godkjenner at varselet etter punkt 34.3.3 kom i tide'
        : 'Gjør gjeldende at varselet etter punkt 34.3.3 kom for sent';
    case 'justering':
      return s.godtar ? 'Godkjenner justeringen' : 'Bestrider justeringen';
    case 'beloep':
      // KA-U72: uten aksept av tilbudet står ingen linje for beløpet.
      if (s.godkjent === undefined) return null;
      if (krevd === undefined) return `${kroner(s.godkjent)} godkjent`;
      if (s.godkjent === krevd) return `${kroner(s.godkjent)}, godkjent som krevd`;
      return `${kroner(s.godkjent)} av ${kroner(krevd)} godkjent`;
    default:
      return null;
  }
}

/** Leselinjene for kravposten `post` av linjene i svaret, med etiketten for laget foran. */
function leselinjeneMedVanligeMellomrom(linjer: Standpunktet[], post: Kravpost): string[] {
  return linjer.flatMap((l) => {
    if (!('standpunkt' in l)) return [];
    const s = l.standpunkt;
    if (!('gjelder' in s) || s.gjelder !== post.id) return [];
    const t = kortStandpunkt(
      s,
      s.art === 'beloep' && !s.saerskilt ? (post.beloep ?? 0) : undefined
    );
    if (!t) return [];
    return [l.lag ? `${stor(l.lag)}: ${t[0].toLowerCase()}${t.slice(1)}` : t];
  });
}

/**
 * Standpunktet som utsagn fra byggherren, med «du» når byggherren leser det selv og
 * «byggherren» ellers. `krevd` er det totalentreprenøren krevde for posten. `post` er betegnelsen på kravposten
 * standpunktet gjelder, når kravet har flere (KA-U57). `etterLeddsetning` gir verbet før
 * subjektet, for en setning som begynner med en leddsetning: «…, legger byggherren til grunn …».
 * Det gjelder standpunktene som begynner med parten. Beløpet og dagene begynner med posten
 * («Fristforlengelse: …») og har eget lag, så de står aldri etter en leddsetning (`FRISTEN.utenLag`).
 */
function standpunkttekstMedVanligeMellomrom(
  s: Standpunkt,
  du: boolean,
  krevd?: number,
  post?: string,
  etterLeddsetning = false
): string {
  const forPosten = post ? ` for ${post}` : '';
  const hvemLiten = du ? 'du' : PARTEN.BH;
  const hvem = stor(hvemLiten);
  const sier = (verb: string, resten: string) =>
    etterLeddsetning ? `${verb} ${hvemLiten} ${resten}` : `${hvem} ${verb} ${resten}`;
  switch (s.art) {
    case 'rettidighet':
      // VS-U63.
      if (s.hjemmel === '34.4')
        return sier(
          'gjør',
          `gjeldende at varselet etter punkt 34.4${forPosten} ikke ble gitt eller kom for sent`
        );
      if (s.hjemmel === '33.6.2')
        return s.iTide
          ? sier('godkjenner', `at svaret på forespørselen etter punkt 33.6.2 kom i tide`)
          : sier('gjør', `gjeldende at svaret på forespørselen etter punkt 33.6.2 kom for sent`);
      return s.iTide
        ? sier('godkjenner', `at varselet etter ${punkt(s.hjemmel)}${forPosten} kom i tide`)
        : sier('gjør', `gjeldende at varselet etter ${punkt(s.hjemmel)}${forPosten} kom for sent`) +
            (s.begrenset !== undefined
              ? `, og godkjenner ${kroner(s.begrenset)} etter begrensningen`
              : '');
    case 'oppgjoersform':
      return (
        (s.aksepterer
          ? sier('godkjenner', `oppgjørsformen totalentreprenøren krever${forPosten}`)
          : sier('godkjenner', `ikke oppgjørsformen totalentreprenøren krever${forPosten}`) +
            (s.oensket
              ? `, og mener vederlaget skal justeres etter ${metodenavn(s.oensket)}`
              : '')) + (s.kreverTilbud ? `, og krever et spesifisert tilbud (punkt 34.2.1)` : '')
      );
    case 'justering':
      return s.godtar
        ? sier('godkjenner', `justeringen av enhetsprisene${forPosten} (punkt 34.3.2)`)
        : sier('bestrider', `justeringen av enhetsprisene${forPosten} (punkt 34.3.2)`);
    case 'beloep': {
      const hva = s.saerskilt ? 'Særskilt vederlagsjustering' : `Vederlagsjustering${forPosten}`;
      const av = krevd !== undefined ? ` av ${kroner(krevd)}` : '';
      // `standpunktene` i `lesing.ts` tar ikke med et beløp uten standpunkt (KA-U72).
      return `${hva}: ${hvemLiten} godkjenner ${kroner(s.godkjent!)}${av}`;
    }
    case 'forhold':
      return sier('svarer', `på forholdet: ${s.resultat}`);
    // KA-U81: standpunktet om hindringen nevner begge vilkårene.
    case 'hindring':
      return s.oppfylt
        ? sier('legger', `til grunn at fremdriften er hindret, og at hindringen skyldes forholdet`)
        : sier(
            'legger',
            `ikke til grunn at fremdriften er hindret, eller at en hindring skyldes forholdet`
          );
    case 'spesifisering':
      return s.iTide
        ? sier('godkjenner', `at kravet ble spesifisert i tide (punkt 33.6.1)`)
        : sier('gjør', `gjeldende at kravet ble spesifisert for sent (punkt 33.6.1)`);
    case 'dager': {
      const hva = `Fristforlengelse${forPosten}`;
      if (s.resultat === 'avslaatt') return `${hva}: ${hvemLiten} avslår dagene`;
      if (s.vurdert === krevd)
        return `${hva}: ${hvemLiten} godkjenner ${dager(s.vurdert)}, som krevd`;
      return `${hva}: ${hvemLiten} godkjenner ${dager(s.vurdert)}${krevd !== undefined ? ` av ${dager(krevd)}` : ''}`;
    }
    default:
      return `${hvem} tar stilling til ${(s satisfies never as Standpunkt).art}`;
  }
}

/** Et utsagn uten subjektet, med verbet for seg, så leddet kan stå først («Subsidiært er …»). */
type Utsagnet = readonly [verb: string, resten: string];

/**
 * Byggherrens standpunkt til forholdet i hvert tilfelle, med ordene brevet har (GR-U32, LV-U41,
 * `STANDPUNKTENE_I_FORHOLDET` i kjernen) i kortform.
 */
export const I_FORHOLDET: Record<Forholdstilfelle, Utsagnet> = haerdet({
  frafall: ['frafaller', 'pålegget (punkt 32.3 første ledd c)'],
  endringsordre: ['er', 'enig, og svaret er en endringsordre (punkt 32.3 første ledd a)'],
  enig_i_endring: ['er', 'enig i at pålegget innebærer en endring'],
  har_risikoen: ['har', 'risikoen for forholdet'],
  enig_31_3: ['er', 'enig i at forholdet er en endringsordre (punkt 31.3)'],
  avslag_endringsordre: ['avslår', 'kravet på endringsordre (punkt 32.3 første ledd b)'],
  har_ikke_risikoen: ['har', 'ikke risikoen for forholdet'],
  avslag: ['avslår', 'forholdet'],
});

/**
 * Byggherrens standpunkt i svaret på forholdet: varselet eller forholdet. Tråden og statuslinjen
 * bruker begge denne, så de sier det samme.
 */
export function iSvaretPaaForholdet(
  s: Standpunkt,
  brev: Brevref | null,
  f: Forholdsordene
): Utsagnet | null {
  const i = brev ? ` i ${brevref(brev)}` : '';
  if (s.art === 'rettidighet')
    return s.iTide
      ? ['godkjenner', `at varselet etter ${punkt(s.hjemmel)}${i} kom i tide`]
      : ['gjør', `gjeldende at varselet etter ${punkt(s.hjemmel)}${i} kom for sent`];
  if (s.art === 'forhold') return I_FORHOLDET[forholdstilfellet(s.resultat, f)];
  return null;
}

export const utsagnet = ([verb, resten]: Utsagnet) => `${verb} ${resten}`;

/** Utsagnet i en rad med laget først, som «subsidiært er byggherren enig …», uten punktum. */
export const medLaget = (lag: string | null, u: Utsagnet) =>
  lag ? `${lag} ${u[0]} byggherren ${u[1]}` : `byggherren ${utsagnet(u)}`;

/** Radene i svaret som statuslinjen og roten i «Tilknyttede krav» sier (oppdragsgiver 15.11 i #2038: «B»). */
export function radeneSomSies(rader: Innlegget['standpunkter']): Innlegget['standpunkter'] {
  const begge = rader.some(
    (r) => r.lag || (r.standpunkt.art === 'rettidighet' && !r.standpunkt.iTide)
  );
  return begge ? rader : rader.filter((r) => r.standpunkt.art === 'forhold');
}

/**
 * Hver rad som en setning uten punktum. Den første står uten «prinsipalt», fordi resten sier
 * laget sitt.
 */
export const setningene = (rader: Innlegget['standpunkter']): string[] =>
  radeneSomSies(rader).map((r, i) => {
    const u = iSvaretPaaForholdet(r.standpunkt, null, r.ordene);
    if (!u) return standpunkttekst(r.standpunkt, false);
    return medLaget(i === 0 && r.lag === 'prinsipalt' ? null : r.lag, u);
  });

export const leselinjene = haerdet(leselinjeneMedVanligeMellomrom);
export const standpunkttekst = haerdet(standpunkttekstMedVanligeMellomrom);
