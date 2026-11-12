/**
 * Teksten i vederlagssporet: kravet og standpunktene i svaret i brevteksten, ordene brevet
 * bruker om sporet, og leddene i linjen for byggherrens standpunkt. `frosset/brevtekst.ts` slår
 * opp her gjennom `BREVTEKST` og `I_SPORENE`, og `frosset/linje.ts` gjennom `LINJE` (#1783).
 */

import { beloep, tilTall, type Oere } from '../../regler/beloep.ts';
import { erBeloepetGodkjentFullt } from '../../regler/vederlag.ts';
import {
  eksMva,
  KanIkkeUttrykkes,
  kravpostenI,
  opplistet,
  PRODUKTIVITET,
  punktum,
  tidligere,
  verdi,
  type Kravsporsbrevtekst,
  type Standpunktstekster,
  type Tekst,
} from '../../frosset/brevdeler.ts';
import { laget, type Svarinnhold } from '../../frosset/byggeklosser.ts';
import type { Linjeledd, Sporslinje } from '../../frosset/linje.ts';
import { kroner, SENT_I_LINJEN } from '../../frosset/tekst.ts';
import { begrensningen } from './frysing.ts';
import {
  harProduktivitetspost,
  innholdIVederlaget,
  krevdIKravposten,
  krevdProduktivitet,
  krevdRigg,
  kravposterI,
} from './format.ts';
import { utenGren } from '../../typer.ts';
import type {
  Krav,
  Kravpost,
  Kravpostvarselet,
  Standpunkt,
  Standpunktsvirkning,
} from '../../typer.ts';

// ---------- Brevteksten (LV-U4) ----------

/** Metoden byggherren mener vederlaget skal justeres etter, når tilbudet ikke er akseptert. */
const METODEN = {
  enhetspriser: 'etter enhetspriser (NS 8407 § 34.3)',
  regningsarbeid: 'som regningsarbeid (NS 8407 § 34.4)',
} as const satisfies Record<
  NonNullable<Extract<Standpunkt, { art: 'oppgjoersform' }>['oensket']>,
  string
>;

/**
 * Varselet gitt før kravet: «… ble gitt i» brevet det står i (VS-U55). Ligger dokumentet ved
 * kravet, er det lagt til i kravskjemaet, og totalentreprenøren opplyser det (VS-U51, VS-U53).
 * Ordlyden er design (U-14 i BF-14), og partene skrives fullt ut (`docs/sprak.md`, #1532).
 */
function gitt(
  varselet: Extract<Kravpostvarselet, { art: 'gitt' }>,
  hva: string,
  { j, nytt }: Pick<Tekst, 'j' | 'nytt'>
): string {
  const brevet = j.brevet(j.dokumentetTil(varselet.varsel));
  const vedlagte = new Set(nytt.dokumentasjon.map((v) => v.vedlegg_id));
  const dokumentet = j.dokumentMed(varselet.varsel)?.dokumentasjon ?? [];
  return dokumentet.length && dokumentet.every((v) => vedlagte.has(v.vedlegg_id))
    ? `Totalentreprenøren opplyser at ${hva.charAt(0).toLowerCase()}${hva.slice(1)} ble gitt i ${brevet}, som er vedlagt.`
    : `${hva} ble gitt i ${brevet}.`;
}

/** Setningen for én kravpost. Ordlyden er design (U-6 i BF-14); budskapet står i KA-U61 og KA-U66. */
function kravposttekst(
  p: Kravpost,
  varselet: Kravpostvarselet | undefined,
  t: Pick<Tekst, 'j' | 'nytt'>
): string {
  const hode = `${p.betegnelse} ${punktum(p.beskrivelse).slice(0, -1)}${p.pns ? ` (PNS ${p.pns})` : ''}:`;
  if (p.oppgjoersform === 'tilbud') return `${hode} TE krever ${eksMva(p.beloep!)}`;
  const deler = [hode];
  if (p.oppgjoersform === 'enhetspriser') {
    deler.push(
      p.justert
        ? `TE krever at ${p.betegnelse} gjøres opp etter kontraktens enhetspriser, justert etter NS 8407 punkt 34.3.2.`
        : `TE krever at ${p.betegnelse} gjøres opp etter kontraktens enhetspriser etter NS 8407 punkt 34.3.1.`
    );
    if (varselet)
      deler.push(
        varselet.art === 'kravet'
          ? 'Kravet er varsel om justering av enhetsprisene etter NS 8407 punkt 34.3.3.'
          : gitt(varselet, 'Varselet om justering av enhetsprisene etter NS 8407 punkt 34.3.3', t)
      );
    if (p.anslag !== undefined)
      deler.push(`Anslaget er ${eksMva(p.anslag)} Anslaget er en opplysning og ikke et tilbud.`);
  } else if (p.oppgjoersform === 'regningsarbeid') {
    deler.push(
      `TE krever at ${p.betegnelse} gjøres opp som regningsarbeid etter NS 8407 punkt 34.4 og punkt 30.`
    );
    if (varselet)
      deler.push(
        varselet.art === 'kravet'
          ? 'Kravet er varsel før regningsarbeidet settes i gang (NS 8407 punkt 34.4).'
          : gitt(varselet, 'Varselet før regningsarbeidet settes i gang (NS 8407 punkt 34.4)', t)
      );
    if (p.kostnadsoverslag !== undefined)
      deler.push(
        `Kostnadsoverslaget er ${eksMva(p.kostnadsoverslag)} Overslaget er en opplysning og ikke et tilbud.`
      );
  } else utenGren(p.oppgjoersform);
  return deler.join(' ');
}

/**
 * Vederlagskravet: én setning per kravpost, trekket (KA-U56), postene utenfor kravpostene
 * (OV-U95 punkt 3, OV-U89 punkt 17) og hvilke poster som er tilbud etter § 34.2.1 (KA-U61,
 * KA-U65). Rigg og drift kalles ikke tilbud.
 */
function vederlagstekst(k: Krav, t: Tekst): string {
  const { j, saken } = t;
  const foer = tidligere(k, j);
  const poster = kravposterI(k);
  const deler = poster.map((p) => punktum(kravposttekst(p, saken.kravpostvarsler[p.id], t)));
  const forrige = foer.at(-1);
  for (const id of innholdIVederlaget(k).trekker) {
    const p = forrige && kravposterI(forrige).find((q) => q.id === id);
    if (!p)
      throw new KanIkkeUttrykkes(
        `trekket gjelder kravposten ${id}, som ikke står i forrige kravversjon`
      );
    deler.push(
      `TE trekker kravet i ${p.betegnelse} ${punktum(p.beskrivelse).slice(0, -1)}, fremsatt i ${j.brevet(forrige.dokument)}.`
    );
  }
  // OV-U95 punkt 3: «i tillegg» når vederlagsjusteringen har minst én kravpost.
  const post = krevdProduktivitet(k);
  if (post !== null)
    deler.push(
      `TE krever ${poster.length ? 'i tillegg ' : ''}særskilt justering av vederlaget etter NS 8407 § 34.1.3 annet ledd for ${PRODUKTIVITET} med ${eksMva(tilTall(post))}`
    );
  const rigg = krevdRigg(k);
  if (rigg !== null)
    deler.push(`TE krever ${eksMva(tilTall(rigg))} for rigg og drift i forlenget byggetid.`);
  if (!poster.length && post === null && rigg === null)
    throw new KanIkkeUttrykkes('vederlagskravet har ingen poster');
  const tilbud = poster.filter((p) => p.oppgjoersform === 'tilbud').map((p) => p.betegnelse);
  if (post !== null) tilbud.push('den særskilte vederlagsjusteringen');
  if (tilbud.length)
    deler.push(`Kravet for ${opplistet(tilbud)} er et tilbud etter NS 8407 punkt 34.2.1.`);
  const regel = poster.filter((p) => p.oppgjoersform !== 'tilbud').map((p) => p.betegnelse);
  if (regel.length)
    deler.push(
      `${opplistet(regel)} gjøres opp etter en beregningsregel, og kravet for ${regel.length > 1 ? 'dem' : 'den'} er ikke et tilbud.`
    );
  return deler.join(' ');
}

/** KA-U22: beløpene som identifiserer vederlagskravet i trekket: de krevde faste beløpene. */
function kravetsBeloep(krav: Krav): string {
  const deler = kravposterI(krav).flatMap((p) => {
    const krevd = krevdIKravposten(krav, p);
    return krevd === null ? [] : [`${eksMva(tilTall(krevd))} i ${p.betegnelse}`];
  });
  const post = krevdProduktivitet(krav);
  if (post !== null) deler.push(`${eksMva(tilTall(post))} etter NS 8407 § 34.1.3 annet ledd`);
  const rigg = krevdRigg(krav);
  if (rigg !== null) deler.push(`${eksMva(tilTall(rigg))} for rigg og drift`);
  return deler.length ? deler.join(' og ') : 'uten krevd beløp';
}

/** Brevteksten i vederlagssporet. */
export const BREVTEKSTEN_I_VEDERLAGET = {
  navn: 'vederlaget',
  svaretGjelder: 'kravet om justering av vederlaget',
  krav: (k, t) => [vederlagstekst(k, t)],
  // VS-U29: også påberopelsen etter § 34.1.3 mot det særskilte varselet (VS-U24, OV-U22).
  ogsaaInnsigelserEtter: ['34.1.3'],
  kravetOm: 'justering av vederlaget',
  enigI: 'beløpet',
  trukket: kravetsBeloep,
  ingenKrav: (sak) =>
    `TE krever ikke justering av vederlaget som følge av forholdet i ${sak}, og gir avkall på slikt krav, også for følger som ikke er kjent i dag. Avkallet omfatter ikke vederlag for forsering etter NS 8407 § 33.8.`,
} satisfies Kravsporsbrevtekst;

/** Standpunktene i artene bare vederlagssporet har (LV-U4 punkt 5, LV-U5). */
export const STANDPUNKTENE_I_VEDERLAGET = {
  oppgjoersform: (p, krav) => {
    // Arbeidsvalget i #479: oppgjørsformen er byggherrens standpunkt, ikke appens avgjørelse. LV-U31 og
    // LV-U32: godkjenningen betegner ikke tilbudet som akseptert, heller ikke ved fullt beløp.
    // KA-U57 (d): med flere kravposter sier standpunktet hvilken kravpost det gjelder.
    const post = kravposterI(krav).length > 1 ? kravpostenI(krav, p.gjelder).betegnelse : null;
    if (p.hjemmel !== '34.2.2') return beregningsregeltekst(p, post);
    return p.aksepterer
      ? `byggherren godkjenner oppgjør som fast sum${post ? ` for ${post}` : ''} med beløpet og forbeholdene som fremgår av svaret.`
      : `byggherren aksepterer ikke TEs tilbud${post ? ` for ${post}` : ''} (NS 8407 § 34.2.2 første ledd), og mener vederlaget${post ? ' for kravposten' : ''} skal justeres ${METODEN[p.oensket!]}.`;
  },
  justering: (p, krav) => {
    // KA-U68, OV-U95 punkt 5: standpunktet godkjenner ingen priser, mengder eller beløp.
    const post = kravpostenI(krav, p.gjelder).betegnelse;
    return p.godtar
      ? `byggherren godtar at enhetsprisene for ${post} justeres (NS 8407 punkt 34.3.2). Det godkjenner ikke priser, mengder eller beløp.`
      : `byggherren bestrider at enhetsprisene for ${post} skal justeres (NS 8407 punkt 34.3.2), og mener ${post} skal gjøres opp etter kontraktens enhetspriser.`;
  },
  beloep: (p, krav) => {
    // Standpunktet har et beløp, fordi `harTekst` har tatt bort standpunktene uten (KA-U72).
    // Resultatet regnes i hele øre (B-13, OV-U59). OV-U28: med posten etter § 34.1.3 annet
    // ledd sier brevet beløpet for hver post for seg.
    const krevd = p.saerskilt ? krevdProduktivitet(krav)! : krevdeKravpost(krav, p.gjelder!)[1];
    const godkjent = beloep(p.godkjent)!;
    const resultat = erBeloepetGodkjentFullt(krevd, godkjent)
      ? 'godkjent'
      : godkjent === 0n
        ? 'avslaatt'
        : 'delvis_godkjent';
    const post = p.saerskilt
      ? SAERSKILT
      : kravposterI(krav).length > 1
        ? krevdeKravpost(krav, p.gjelder!)[0].betegnelse
        : harProduktivitetspost(krav)
          ? 'justeringen ellers'
          : null;
    return verdi(resultat, eksMva(p.godkjent!), eksMva(tilTall(krevd)), post);
  },
} satisfies Standpunktstekster<'oppgjoersform' | 'justering' | 'beloep'>;

/** Kravposten med fast sum standpunktet til beløpet gjelder, og det krevde beløpet (KA-U57 (c)). */
function krevdeKravpost(krav: Krav, gjelder: string): [Kravpost, Oere] {
  const post = kravpostenI(krav, gjelder);
  const krevd = krevdIKravposten(krav, post);
  if (krevd === null)
    throw new KanIkkeUttrykkes(`kravposten ${post.betegnelse} har ikke et krevd beløp`);
  return [post, krevd];
}

/** TEs beregningsregel i standpunktet, etter hjemmelen. */
const REGELEN = {
  '34.3': 'etter enhetspriser (NS 8407 § 34.3)',
  '34.4': 'som regningsarbeid (NS 8407 § 34.4)',
} as const;

/**
 * Standpunktet til beregningsregelen for en kravpost (KA-U54, OV-U95 punkt 5) og kravet om
 * spesifisert tilbud (KA-U69, KA-U71). Ordlyden er design (prototype v3, `#svar`).
 */
function beregningsregeltekst(
  p: Extract<Standpunkt, { art: 'oppgjoersform' }>,
  post: string | null
): string {
  const forPosten = post ? ` for ${post}` : '';
  const regelen = REGELEN[p.hjemmel as '34.3' | '34.4'];
  if (p.aksepterer)
    return `byggherren godtar at vederlaget${forPosten} justeres ${regelen}. Det godkjenner ikke mengder, priser, kostnader eller noe beløp.`;
  const mener = p.oensket ? `, og mener det skal justeres ${METODEN[p.oensket]}` : '';
  const tilbud = p.kreverTilbud
    ? ` Byggherren krever at TE gir et spesifisert tilbud${post ? ` for ${post}` : ' for kravposten'} (NS 8407 § 34.2.1 første ledd).`
    : '';
  return `byggherren godtar ikke at vederlaget${forPosten} justeres ${regelen}${mener}.${tilbud}`;
}

/** OV-U28: posten etter § 34.1.3 annet ledd i setningen om beløpet. */
const SAERSKILT = 'særskilt justering etter NS 8407 § 34.1.3 annet ledd';

// ---------- Linjen for byggherrens standpunkt (MM-U9) ----------

/** Leddene for svaret på vederlaget i linjen. */
function leddIVederlaget(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  kravet: Krav | null | undefined,
  forKravposten: ReadonlySet<string>
): Linjeledd[] {
  const sine: Linjeledd[] = [];
  const virkning = (id: string) => v.find((p) => p.standpunkt === id)!.virkning;
  const begrenset = begrensningen(svar, v);
  // OV-U26: hver post for seg når kravet har posten etter § 34.1.3 annet ledd, med
  // begrensningen som eget ledd foran posten.
  const poster = svar.standpunkter.filter(
    (s): s is Extract<Standpunkt, { art: 'beloep' }> => s.art === 'beloep'
  );
  const delt = poster.some((b) => b.saerskilt);
  const kravposter = kravet ? kravposterI(kravet) : [];
  const betegnelse = (gjelder: string | undefined) =>
    kravposter.length > 1 ? kravposter.find((k) => k.id === gjelder)?.betegnelse : undefined;
  poster.forEach((b) => {
    const post = betegnelse(b.gjelder);
    const hva = b.saerskilt
      ? delt
        ? ` for ${SAERSKILT_I_LINJEN}`
        : ''
      : post
        ? ` for ${post}`
        : delt
          ? ' for justeringen ellers'
          : '';
    if (b.saerskilt && begrenset)
      sine.push({
        tekst: `begrenset etter § 34.1.3 til ${kroner(begrenset.begrenset!)}`,
        virkning: virkning(begrenset.id),
      });
    // KA-U57 (d), KA-U60, KA-U54: standpunktet til oppgjørsformen gjelder kravposten og står i
    // sitt lag, med TEs oppgjørsform som hjemmel. KA-U68: justeringen som er bestridt, likeså.
    const forPosten = post ? ` for ${post}` : '';
    const form = svar.standpunkter.find(
      (s) => s.art === 'oppgjoersform' && !s.aksepterer && s.gjelder === b.gjelder
    );
    if (form?.art === 'oppgjoersform' && !b.saerskilt)
      sine.push({
        tekst:
          form.hjemmel === '34.2.2'
            ? `tilbudet${forPosten} ikke akseptert (§ 34.2.2)`
            : `beregningsregelen${forPosten} ikke godtatt (§ ${form.hjemmel})`,
        virkning: virkning(form.id),
      });
    const varselet = svar.standpunkter.find(
      (s) =>
        s.art === 'rettidighet' &&
        forKravposten.has(s.id) &&
        s.gjelder === b.gjelder &&
        laget(virkning(s.id))
    );
    if (varselet?.art === 'rettidighet')
      sine.push({
        tekst: `${SENT_I_LINJEN[varselet.hjemmel]}${forPosten} kom for sent`,
        virkning: virkning(varselet.id),
      });
    const justering = svar.standpunkter.find(
      (s) => s.art === 'justering' && !s.godtar && s.gjelder === b.gjelder
    );
    if (justering)
      sine.push({
        tekst: `justeringen av enhetsprisene${forPosten} bestridt (§ 34.3.2)`,
        virkning: virkning(justering.id),
      });
    // En kravpost uten beløp (KA-U72) har ikke et ledd for beløpet.
    if (b.godkjent === undefined) return;
    const tekst =
      beloep(b.godkjent) === 0n ? `avslått${hva}` : `godkjent med ${kroner(b.godkjent)}${hva}`;
    sine.push({ tekst, virkning: virkning(b.id) });
  });
  return sine;
}

/** Posten etter § 34.1.3 annet ledd i linjen. */
const SAERSKILT_I_LINJEN = 'særskilt justering (§ 34.1.3 annet ledd)';

/** Linjen i vederlagssporet. */
export const LINJEN_I_VEDERLAGET = {
  // Begrensningen etter § 34.1.3 er ingen preklusjon, men et eget ledd (VS-U5).
  egetLedd: (svar, v) => begrensningen(svar, v)?.id,
  ledd: leddIVederlaget,
} satisfies Sporslinje;
