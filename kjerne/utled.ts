/**
 * `utled(journal, regler)`: predikatene kjernen regner av journalen (2.6 i
 * modellforslaget). Kommandoene, handlingene og visningen leser denne
 * utledningen. Den har ingen status; statusen er en etikett i visningen.
 *
 * Det er én beregning per svar, som alle leser:
 * - brevet slik det ble sendt: virkningene i beslutningsgrunnlaget (MM-U9);
 * - en eventuell enighet: en aksept av svaret, eller sammenfall i brevet. Innholdet
 *   er brevets (KA-U10, MM-U3);
 * - predikatene av relasjonene: hva svaret `gjelder`, hva det `erstatter`, om
 *   en rettidighetsvurdering gjelder det registrerte varselet (MM-U8), og om
 *   vilkåret for enigheten er oppfylt (GR-U7).
 *
 * Regelsettet brukes ikke til å vurdere et sendt brev på nytt. Relasjonene
 * bestemmer, ikke rekkefølgen: hver referanse leses etter lesereglene i 4.2 i
 * designnotatet, og gjeldende svar er svaret på gjeldende krav som ikke er
 * erstattet. Løses en relasjon ikke entydig, eller er en hendelse
 * ukjent, er saken ikke forstått, og ingenting utledes (MM-U2, 2.7 regel 1).
 */

import { erRegistrert, sammeSlag } from './leser.ts';
import type { Regelsett } from './regler/regelsett.ts';
import type { Subsidiaergrunn } from './regler/grunnlag.ts';
import { enighetsgrunnlag, grunnlagetErAvklart, prinsipalt, standpunktet } from './standpunkt.ts';
import {
  KRAVSPOR,
  SPOR,
  type Domenehendelse,
  type Enighetsgrunnlag,
  type Krav,
  type Kravspor,
  type Opplysning,
  type Part,
  type Spor,
  type Standpunktsvirkning,
  type Svar,
  type Utsagn,
} from './typer.ts';

export interface Svarberegning {
  svar: Svar;
  /** Virkningen standpunktene hadde slik brevet uttrykte dem (MM-U9). */
  virkninger: Standpunktsvirkning[];
  /**
   * Standpunktene om rettidighet som gjelder et annet varsel enn det som er
   * registrert nå. Preklusjonen i dem er uavklart til byggherren har tatt
   * stilling til det registrerte varselet (MM-U1, MM-U8).
   */
  uavklart: string[];
}

export interface Enighet {
  grunnlag: Enighetsgrunnlag;
  /** Hendelsen som holder enighetsgrunnlaget: aksepten, eller svaret ved sammenfall. */
  holder: string;
}

export interface Sporutledning {
  krav: Krav[];
  gjeldendeKrav: Krav | null;
  svar: Svar[];
  gjeldendeSvar: Svar | null;
  /** Enigheten om gjeldende svar (2.5). Om den har virkning, avgjør `enighetHarVirkning`. */
  enighet: Enighet | null;
  /** TE har trukket kravet, eller grunnlaget som bærer det (GR-U5, SD-02). */
  trukket: boolean;
  /** TE har sagt at det ikke kreves noe i sporet (KA-U12). */
  ingenKrav: boolean;
  /** Det registrerte varselet etter § 33.4; bare fristen. */
  varsel: Extract<Utsagn, { art: 'varsel' }> | null;
  /** Hvorfor hele svaret i sporet er subsidiært til grunnlaget; tomt for grunnlaget. */
  subsidiaer: Subsidiaergrunn[];
}

export interface Bestridelse {
  part: Part;
  hva: Opplysning['hva'];
  /** Hendelsen bestridelsen står i. */
  hendelse: string;
}

export interface Utledning {
  versjon: number;
  regelversjon: number;
  forstaatt: boolean;
  begrensninger: { hendelse: string; grunn: string }[];
  journal: Domenehendelse[];
  svar: Record<string, Svarberegning>;
  opplysninger: { opplysning: Opplysning; bestridelser: Bestridelse[] }[];
  spor: Record<Spor, Sporutledning>;
  /**
   * GR-U7: byggherren har godkjent grunnlaget uten virksom preklusjon etter
   * § 32.2, eller frafalt pålegget, etter brevet eller enigheten om det.
   */
  grunnlagAvklart: boolean;
  /** SK-01, #213, MM-U13: TE har godtatt et grunnlagssvar som ikke avklarer grunnlaget etter GR-U7. */
  grunnlagAvvist: boolean;
  /** GR-U3, GR-U9: byggherren har frafalt pålegget (§ 32.3 c). Er ikke en enighet. */
  frafalt: boolean;
  /**
   * Om byggherrens godkjenning av grunnlaget er en endringsordre etter § 32.3
   * første ledd a med § 31.3 (GR-U10, GR-U12, GR-U13). `ja`: godkjent
   * uten påberopt preklusjon i en kategori § 32.2 gjaldt for, i et brev sendt i
   * appen eller i registrert korrespondanse der den som registrerte, har oppgitt at
   * § 31.3 er oppfylt. `nei`: ikke slik godkjent, eller oppgitt at § 31.3 ikke er
   * oppfylt. `ikke_avklart`: registrert korrespondanse uten opplysningen. En
   * manglende opplysning er ikke et nei.
   */
  endringsordre: 'ja' | 'nei' | 'ikke_avklart';
}

const tomtSpor = (): Sporutledning => ({
  krav: [],
  gjeldendeKrav: null,
  svar: [],
  gjeldendeSvar: null,
  enighet: null,
  trukket: false,
  ingenKrav: false,
  varsel: null,
  subsidiaer: [],
});

const tommeSpor = (): Record<Spor, Sporutledning> => ({
  grunnlag: tomtSpor(),
  vederlag: tomtSpor(),
  frist: tomtSpor(),
});

function tom(
  journal: Domenehendelse[],
  regler: Regelsett,
  begrensninger: Utledning['begrensninger']
): Utledning {
  return {
    versjon: journal.at(-1)?.versjon ?? 0,
    regelversjon: regler.versjon,
    forstaatt: false,
    begrensninger,
    journal,
    svar: {},
    opplysninger: [],
    spor: tommeSpor(),
    grunnlagAvklart: false,
    grunnlagAvvist: false,
    frafalt: false,
    endringsordre: 'nei',
  };
}

/** Svarene på kravet som ikke er erstattet. Flere enn ett er en tvetydig relasjon. */
function ikkeErstattet(svar: Svar[], kravId: string): Svar[] {
  const paaKravet = svar.filter((s) => s.gjelder === kravId);
  const erstattet = new Set(paaKravet.map((s) => s.erstatter).filter((e) => e !== null));
  return paaKravet.filter((s) => !erstattet.has(s.id));
}

/**
 * Hvorfor svarene på vederlag og frist er subsidiære til grunnlagssvaret, etter
 * standpunktene i brevet om grunnlaget (vedtaket 05.10, MM-U9).
 */
function grunnerFraGrunnlaget({ svar, virkninger }: Svarberegning): Subsidiaergrunn[] {
  const ut: Subsidiaergrunn[] = [];
  if (prinsipalt(virkninger)?.art === 'rettidighet') ut.push('prekludert');
  if (standpunktet(svar, 'grunnlag')?.resultat === 'avslatt') ut.push('avslatt');
  return ut;
}

export function utled(journal: Domenehendelse[], regler: Regelsett): Utledning {
  const begrensninger: Utledning['begrensninger'] = [];
  const spor = tommeSpor();
  /** Hendelsen og saksversjonen hvert element står i. */
  const plass = new Map<string, { hendelse: string; versjon: number }>();
  const aksepter: Extract<Utsagn, { art: 'aksept' }>[] = [];
  const trekk: Extract<Utsagn, { art: 'trekk' }>[] = [];
  const bestridelser: Extract<Utsagn, { art: 'bestridelse' }>[] = [];
  const ingenKrav: Extract<Utsagn, { art: 'ingen_krav' }>[] = [];
  const varsler: Extract<Utsagn, { art: 'varsel' }>[] = [];
  const opplysninger: Opplysning[] = [];
  const dobbelt = new Set<string>();
  const plasser = (id: string, h: { id: string; versjon: number }) => {
    if (plass.has(id)) dobbelt.add(id);
    plass.set(id, { hendelse: h.id, versjon: h.versjon });
  };
  // GR-U1: et svar på vederlag eller frist som var subsidiært da grunnlagssvaret
  // falt, forblir det til sporet eller grunnlaget besvares igjen. Her står
  // grunnlagssvaret som falt.
  const tilNyttSvar: Partial<Record<Kravspor, Svar>> = {};

  for (const h of journal) {
    if (h.art === 'ukjent') {
      begrensninger.push({ hendelse: h.id, grunn: h.grunn });
      continue;
    }
    plasser(h.id, h);
    if (h.art === 'sak') continue;
    const d = h.dokument;
    for (const k of d.krav) {
      const forrige = spor.grunnlag.krav.at(-1);
      if (k.spor === 'grunnlag' && forrige) {
        const gjeldende = ikkeErstattet(spor.grunnlag.svar, forrige.id);
        if (gjeldende.length === 1)
          for (const n of KRAVSPOR) if (spor[n].svar.length) tilNyttSvar[n] = gjeldende[0];
      }
      spor[k.spor].krav.push(k);
      plasser(k.id, h);
    }
    for (const s of d.svar) {
      spor[s.spor].svar.push(s);
      plasser(s.id, h);
      for (const p of s.standpunkter) plasser(p.id, h);
      if (s.spor === 'grunnlag') for (const k of KRAVSPOR) delete tilNyttSvar[k];
      else delete tilNyttSvar[s.spor];
    }
    for (const u of d.utsagn) {
      plasser(u.id, h);
      if (u.art === 'aksept') aksepter.push(u);
      else if (u.art === 'trekk') trekk.push(u);
      else if (u.art === 'bestridelse') bestridelser.push(u);
      else if (u.art === 'ingen_krav') ingenKrav.push(u);
      else varsler.push(u);
    }
    for (const o of d.opplysninger) plasser(o.id, h);
    opplysninger.push(...d.opplysninger);
  }

  // Lesereglene i 4.2: hver referanse finnes i saken, har riktig art og spor, og
  // peker på en rad med lavere saksversjon. Ingen referanse løses etter plassen i
  // journalen.
  const alleSvar = new Map(SPOR.flatMap((n) => spor[n].svar).map((s) => [s.id, s]));
  const alleKrav = new Map(SPOR.flatMap((n) => spor[n].krav).map((k) => [k.id, k]));
  const alleOpplysninger = new Map(opplysninger.map((o) => [o.id, o]));
  const ugyldig = (id: string, grunn: string) =>
    begrensninger.push({ hendelse: plass.get(id)?.hendelse ?? id, grunn });
  const bakover = (fra: string, til: string) =>
    (plass.get(til)?.versjon ?? Infinity) < (plass.get(fra)?.versjon ?? -Infinity);
  for (const id of dobbelt) ugyldig(id, 'to elementer i saken har samme ID');
  const dokumenter = new Map(
    journal.flatMap((h) => (h.art === 'dokument' ? [[h.id, h.dokument] as const] : []))
  );
  /** Avsenderen av dokumentet elementet står i. */
  const avsenderAv = (id: string): Part | undefined =>
    dokumenter.get(plass.get(id)?.hendelse ?? '')?.avsender;

  for (const n of SPOR) {
    // Kravversjonene i sporet er én kjede: den første erstatter ingenting, og hver
    // neste erstatter den forrige (KA-U2).
    spor[n].krav.forEach((k, i) => {
      const forrige = spor[n].krav[i - 1]?.id ?? null;
      if (k.erstatter !== forrige)
        ugyldig(k.id, 'kravversjonene i sporet er ikke én kjede der hver erstatter den forrige');
    });
  }
  for (const s of alleSvar.values()) {
    if (alleKrav.get(s.gjelder)?.spor !== s.spor || !bakover(s.id, s.gjelder))
      ugyldig(s.id, 'svaret viser til et krav som ikke står før det i sporet');
    if (s.erstatter !== null) {
      const forrige = alleSvar.get(s.erstatter);
      if (!forrige || forrige.gjelder !== s.gjelder || !bakover(s.id, s.erstatter))
        ugyldig(s.id, 'revisjonen erstatter et svar som ikke står før den på samme krav');
    }
    for (const p of s.standpunkter) {
      if (p.art !== 'rettidighet') continue;
      // MM-U1: rettidigheten etter § 33.4 gjelder et registrert varsel eller varselet
      // utledet av kravet; etter § 32.2 gjelder den kravet.
      const varsel = p.hjemmel === '33.4' && varsler.some((v) => v.id === p.gjelder);
      if (p.gjelder !== s.gjelder && !(varsel && bakover(s.id, p.gjelder)))
        ugyldig(s.id, 'rettidigheten viser ikke til kravet eller et varsel før svaret');
    }
  }
  // Svarene på én kravversjon er én kjede: ett første svar, og hver revisjon
  // erstatter det forrige. To første svar eller en forgrening gjør det tvetydig
  // hvilket svar som gjelder.
  for (const n of SPOR) {
    for (const k of spor[n].krav) {
      const paaKravet = spor[n].svar.filter((s) => s.gjelder === k.id);
      if (!paaKravet.length) continue;
      const foerste = paaKravet.filter((s) => s.erstatter === null);
      const kjede = new Set<string>();
      let neste: Svar[] = foerste.length === 1 ? foerste : [];
      while (neste.length === 1 && !kjede.has(neste[0].id)) {
        kjede.add(neste[0].id);
        const forrige = neste[0].id;
        neste = paaKravet.filter((s) => s.erstatter === forrige);
      }
      if (neste.length > 0 || kjede.size !== paaKravet.length)
        ugyldig(
          paaKravet.at(-1)!.id,
          'svarene på kravversjonen er ikke én kjede der hver revisjon erstatter det forrige'
        );
    }
  }
  for (const a of aksepter) {
    if (!alleSvar.has(a.gjelder) || !bakover(a.id, a.gjelder))
      ugyldig(a.id, 'aksepten viser til et svar som ikke står før den');
    // GR-U8: et svar som godkjenner hele kravet, kan ikke godtas. KA-U7: en enighet
    // inngås én gang, så to aksepter av samme svar er tvetydige.
    else if (alleSvar.get(a.gjelder)!.beslutningsgrunnlag.sammenfall)
      ugyldig(a.id, 'aksepten gjelder et svar partene alt er enige om ved sammenfall');
    else if (aksepter.filter((x) => x.gjelder === a.gjelder).length > 1)
      ugyldig(a.id, 'svaret er godtatt to ganger');
  }
  for (const t of trekk) {
    // Trekket gjelder sporets gjeldende kravversjon da det ble registrert.
    const k = alleKrav.get(t.gjelder);
    const gjeldende = k && spor[k.spor].krav.filter((x) => bakover(t.id, x.id)).at(-1);
    if (!k || gjeldende?.id !== k.id)
      ugyldig(t.id, 'trekket viser ikke til gjeldende kravversjon i sporet');
  }
  // MM-U12, GR-U13: en avklaring gjelder et registrert brev med et svar på grunnlaget før
  // den, og det står høyst én opplysning om § 31.3 per brev. Rettelse følger B-16.
  for (const o of opplysninger) {
    if (o.hva !== 'endringsordre') continue;
    const brev = dokumenter.get(o.brev);
    if (
      opplysninger.filter((x) => x.hva === 'endringsordre' && x.brev === o.brev).length > 1 ||
      (o.brev !== o.dokument &&
        (!brev ||
          !bakover(o.id, o.brev) ||
          !erRegistrert(brev.opplysninger) ||
          !brev.svar.some((s) => s.spor === 'grunnlag')))
    )
      ugyldig(
        o.id,
        'opplysningen om § 31.3 gjelder ikke ett registrert svar på grunnlaget før den, eller står to ganger'
      );
  }
  for (const b of bestridelser) {
    const o = alleOpplysninger.get(b.gjelder);
    if (
      !o ||
      !bakover(b.id, b.gjelder) ||
      avsenderAv(b.id) === undefined ||
      o.oppgittAv === avsenderAv(b.id) ||
      !sammeSlag(o.hva, b.hva)
    )
      ugyldig(
        b.id,
        'bestridelsen viser ikke til en opplysning av samme slag fra motparten før den'
      );
  }
  // KA-U12: «ingen krav» står i et spor uten kravversjon, og bare én gang.
  // KA-U15: grunnlaget må være sendt, som for et krav.
  for (const i of ingenKrav)
    if (
      spor[i.spor].krav.length ||
      ingenKrav.filter((x) => x.spor === i.spor).length > 1 ||
      !spor.grunnlag.krav.some((k) => bakover(i.id, k.id))
    )
      ugyldig(
        i.id,
        '«ingen krav» står i et spor med en kravversjon eller et annet «ingen krav», eller før grunnlaget er sendt'
      );
  if (varsler.length > 1) ugyldig(varsler[1].id, 'saken har to varsler etter § 33.4 (SK-12)');

  if (begrensninger.length) return tom(journal, regler, begrensninger);

  spor.frist.varsel = varsler[0] ?? null;
  for (const n of SPOR) {
    const sp = spor[n];
    sp.gjeldendeKrav = sp.krav.at(-1) ?? null;
    sp.gjeldendeSvar = sp.gjeldendeKrav
      ? (ikkeErstattet(sp.svar, sp.gjeldendeKrav.id)[0] ?? null)
      : null;
    sp.trukket = trekk.some((t) => alleKrav.get(t.gjelder)?.spor === n);
    sp.ingenKrav = ingenKrav.some((i) => i.spor === n);
  }
  for (const n of KRAVSPOR) spor[n].trukket ||= spor.grunnlag.trukket;

  // MM-U1, MM-U8: en vurdering etter § 33.4 gjelder varselet som var registrert da
  // brevet ble sendt. Er et annet varsel registrert nå, er en påberopt preklusjon
  // uavklart. Sa byggherren at varselet kom i tide, er det ingenting å avklare.
  const varselNaa = (s: Svar) => spor.frist.varsel?.id ?? s.gjelder;
  const svar: Record<string, Svarberegning> = {};
  for (const s of alleSvar.values())
    svar[s.id] = {
      svar: s,
      virkninger: s.beslutningsgrunnlag.virkninger,
      uavklart: s.standpunkter
        .filter(
          (p) =>
            p.art === 'rettidighet' &&
            p.hjemmel === '33.4' &&
            !p.iTide &&
            p.gjelder !== varselNaa(s)
        )
        .map((p) => p.id),
    };

  // Enigheten i hvert spor: en aksept av gjeldende svar, eller sammenfall i svaret.
  for (const n of SPOR) {
    const g = spor[n].gjeldendeSvar;
    if (!g) continue;
    const aksept = aksepter.find((a) => a.gjelder === g.id);
    if (aksept)
      spor[n].enighet = {
        grunnlag: enighetsgrunnlag(g, 'aksept'),
        holder: plass.get(aksept.id)!.hendelse,
      };
    else if (g.beslutningsgrunnlag.sammenfall)
      spor[n].enighet = { grunnlag: enighetsgrunnlag(g, 'sammenfall'), holder: g.id };
  }

  const gSvar = spor.grunnlag.gjeldendeSvar;
  const eg = spor.grunnlag.enighet;
  const sammenfallMedVarslingsplikt =
    eg?.grunnlag.kilde === 'sammenfall' && gSvar?.beslutningsgrunnlag.varslingsplikt === true;
  // § 31.3: et brev sendt i appen oppfyller den, fordi appen lager brevet (#310). Registrert
  // korrespondanse har en opplysning om at den er sendt eller mottatt, og da avgjør
  // opplysningen fra den som registrerte. Mangler den, er det ikke avklart; kjernen
  // gjetter ikke. En bestridelse av opplysningen har ingen virkning på utfallet (MM-U7).
  const endringsordre = ((): Utledning['endringsordre'] => {
    if (!sammenfallMedVarslingsplikt) return 'nei';
    if (!erRegistrert(dokumenter.get(gSvar!.dokument)!.opplysninger)) return 'ja';
    const om313 = opplysninger.find(
      (o): o is Extract<Opplysning, { hva: 'endringsordre' }> =>
        o.hva === 'endringsordre' && o.brev === gSvar!.dokument
    );
    if (om313 === undefined) return 'ikke_avklart';
    return om313.oppfylt ? 'ja' : 'nei';
  })();
  const gBrev = gSvar ? svar[gSvar.id] : null;
  for (const n of KRAVSPOR) {
    const falt = tilNyttSvar[n];
    const kilde = falt ? svar[falt.id] : gBrev;
    spor[n].subsidiaer = kilde ? grunnerFraGrunnlaget(kilde) : [];
  }

  return {
    ...tom(journal, regler, begrensninger),
    forstaatt: true,
    svar,
    opplysninger: opplysninger.map((o) => ({
      opplysning: o,
      bestridelser: bestridelser
        .filter((b) => b.gjelder === o.id)
        .map((b) => ({
          part: avsenderAv(b.id)!,
          hva: b.hva,
          hendelse: plass.get(b.id)!.hendelse,
        })),
    })),
    spor,
    // Utledet av standpunktene i brevet om grunnlaget, som også er innholdet i en
    // enighet om det (KA-U10, MM-U11).
    grunnlagAvklart:
      !spor.grunnlag.trukket && gBrev !== null && grunnlagetErAvklart(gBrev.svar, gBrev.virkninger),
    // SK-01, #213, MM-U13: TE har godtatt grunnlagssvaret, og det avklarer ikke grunnlaget
    // etter GR-U7. Et godtatt avslag og en godtatt preklusjon har samme virkning.
    grunnlagAvvist:
      eg?.grunnlag.kilde === 'aksept' &&
      gBrev !== null &&
      !grunnlagetErAvklart(gBrev.svar, gBrev.virkninger),
    // GR-U12: om § 32.2 gjaldt, er frosset i brevet. Dagens regelsett vurderer det
    // ikke på nytt (MM-U9), og det avhenger ikke av om brevet sier noe om varslingen.
    endringsordre,
    // GR-U3, GR-U9: frafallet er byggherrens standpunkt, uavhengig av hva TE har sagt.
    frafalt:
      gBrev !== null &&
      prinsipalt(gBrev.virkninger)?.art === 'grunnlag' &&
      standpunktet(gBrev.svar, 'grunnlag')?.resultat === 'frafalt',
  };
}

/**
 * KA-U13 og KA-U14, med § 31.3 (GR-U13): TE kan ikke trekke grunnlaget før det er
 * avklart at godkjenningen ikke er en endringsordre. Et trekk ville gitt journalen
 * den videre virkningen at endringsordren leses som bortfalt (KA-U6).
 */
export const trekkAvGrunnlagetErSperret = (u: Utledning): boolean => u.endringsordre !== 'nei';

/**
 * Om enigheten i sporet har virkning (GR-U7, MM-U3): `betinget` til vilkåret
 * er oppfylt, `virksom` når det er det, og `uten_virkning` når grunnlaget er
 * avvist ved enighet eller kravet er trukket (KA-U6). `null` uten enighet.
 */
export function enighetensVirkning(
  u: Utledning,
  spor: Spor
): 'betinget' | 'virksom' | 'uten_virkning' | null {
  const e = u.spor[spor].enighet;
  if (!e) return null;
  if (spor !== 'grunnlag' && (u.grunnlagAvvist || u.spor[spor].trukket)) return 'uten_virkning';
  return e.grunnlag.vilkaar === null || u.grunnlagAvklart ? 'virksom' : 'betinget';
}

/**
 * KA-U11: kravene er avgjort når grunnlaget er avklart, og hvert vederlags- og
 * fristkrav er trukket, har «ingen krav» (KA-U12) eller har en virksom enighet.
 * Et spor TE ikke har sendt, er ikke avgjort (EO-U2, GR-U3). Da avvises alt
 * unntatt bestridelse. Predikatet leses av utsagnene og relasjonene, ikke av en
 * status: `enighetensVirkning` er selv et predikat av enigheten, grunnlaget og
 * trekkene.
 */
export function kraveneErAvgjort(u: Utledning): boolean {
  return (
    u.grunnlagAvklart &&
    KRAVSPOR.every(
      (n) => u.spor[n].trukket || u.spor[n].ingenKrav || enighetensVirkning(u, n) === 'virksom'
    )
  );
}

/**
 * EO-U5, EO-U2: saken kan inngå i en endringsordre når kravene er avgjort,
 * grunnlaget er godkjent og ikke frafalt (GR-U3), og minst ett av vederlag og
 * frist har enighet, også et godtatt avslag. Et trukket spor og et spor med
 * «ingen krav» teller som avgjort, men gir ikke alene grunnlag for endringsordre.
 */
export function kanInngaaIEo(u: Utledning): boolean {
  return (
    kraveneErAvgjort(u) &&
    !u.frafalt &&
    KRAVSPOR.some((n) => !u.spor[n].trukket && u.spor[n].enighet !== null)
  );
}

/** Grunnlagskravet et svar vurderes mot: kravet et grunnlagssvar gjelder, ellers gjeldende grunnlagskrav. */
export function grunnlagskravFor(
  svar: Pick<Svar, 'spor' | 'gjelder'>,
  u: Utledning
): Krav | null | undefined {
  return svar.spor === 'grunnlag'
    ? u.spor.grunnlag.krav.find((k) => k.id === svar.gjelder)
    : u.spor.grunnlag.gjeldendeKrav;
}

/** Sporet har et krav byggherren ikke har svart på, og kravet er ikke trukket. */
export const venterPaaSvar = (s: Sporutledning): boolean =>
  s.gjeldendeKrav !== null && s.gjeldendeSvar === null && !s.trukket;
