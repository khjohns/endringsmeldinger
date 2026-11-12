/**
 * Tekstene i brevet og visningen som ikke er brevteksten selv: beløp og dager med ordene i
 * brevet, og linjen for byggherrens standpunkt i beslutningsgrunnlaget (MM-U9).
 */

import { beloep } from '../regler/beloep.ts';
import type { Forholdsresultat } from '../regler/typer.ts';
import { begrensningen, etikett, laget, standpunktet, type Svarinnhold } from './standpunkt.ts';
import { kategori } from '../format/kravinnhold.ts';
import { kravposterI } from '../spor/vederlag/format.ts';
import {
  erKravpostvarselhjemmel,
  type Hjemmel,
  type Krav,
  type Standpunkt,
  type Standpunktsvirkning,
  type Virkning,
  utenGren,
} from '../typer.ts';

/** Kroner med mellomrom mellom tusener og øre bare når de finnes: «150 000 kr». */
export function kroner(n: number): string {
  // Avrundet til hele øre som reglene runder (`beloep`), ikke som flyttallet.
  const i = beloep(n)!;
  const abs = i < 0n ? -i : i;
  const gruppert = String(abs / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  const oere = String(abs % 100n).padStart(2, '0');
  return `${i < 0n ? '−' : ''}${gruppert}${oere === '00' ? '' : `,${oere}`}\u00a0kr`;
}

/** «1 dag», «12 dager». Brevteksten og meldingen om en senket revisjon bruker samme ord (#628). */
export const dager = (n: number) => `${n} ${n === 1 ? 'dag' : 'dager'}`;

/** Svaret på forholdet med ordene i brevet (#628). */
export const SVARET_PAA_PAABEROPELSEN: Record<Forholdsresultat, string> = {
  godkjent: 'godkjent',
  avslaatt: 'avslått',
  paalegg_frafalt: 'pålegget frafalt (§ 32.3 c)',
};
/**
 * Linjen i brevet for svaret: byggherrens standpunkt, med den prinsipale grunnen først
 * (vedtaket 05.10 om avslag sammen med § 32.2). Leddene ordnes og etiketteres som i
 * brevteksten (HF-U2, VS-U3), med lagene i sporet flyttet ned med `forskyvning`, lagene
 * svaret på forholdet opptar foran sporet (OV-U32, OV-U33, svaret i #1199). `kravet` er
 * kravet svaret gjelder; med flere kravposter navngir linjen kravposten (KA-U57 (c) og (d)).
 */
export function beslutningslinje(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  paaberopelse: Krav | null | undefined,
  forskyvning: number,
  kravet?: Krav | null
): string {
  const spesifisert = standpunktet(svar, 'spesifisering');
  // Fristsvaret kan prekludere etter både § 33.4 og § 33.6.2 tredje ledd (VS-U17). Begge er
  // prinsipale, så de er ett ledd med den prinsipale grunnen (vedtaket 05.10).
  // Et upåvirket standpunkt eller et uten virkning er ingen grunn (OV-U32, HF-U2).
  // Begrensningen etter § 34.1.3 er ingen preklusjon, men et eget ledd (VS-U5).
  const begrenset = begrensningen(svar, v);
  // KA-U64, VS-U56: varselet etter § 34.3.3 eller § 34.4 for en kravpost står ved posten, ikke
  // som grunn. Etter § 34.4 har det ingen virkning og står ikke i linjen.
  const forKravposten = new Set(
    svar.standpunkter.flatMap((s) =>
      s.art === 'rettidighet' && erKravpostvarselhjemmel(s.hjemmel) ? [s.id] : []
    )
  );
  const prekluderende = v
    .filter(
      (p) =>
        p.art === 'rettidighet' &&
        laget(p.virkning) &&
        p.standpunkt !== begrenset?.id &&
        !forKravposten.has(p.standpunkt)
    )
    .map((p) => p.standpunkt);
  const sene = svar.standpunkter
    .filter((s): s is Extract<Standpunkt, { art: 'rettidighet' }> => prekluderende.includes(s.id))
    .map((s) => SENT_I_LINJEN[s.hjemmel]);
  const grunntekst: Record<string, string> = {
    // HF-U11, MM-U23: byggherrens påberopelse slik brevet sier den, ikke appens slutning.
    rettidighet: `${sene.join(' og ')} kom for sent`,
    // Som brevteksten: § 33.1 krever at fremdriften hindres «som følge av» forholdet.
    hindring: `avslått: fremdriften er ikke hindret som følge av forholdet (§ ${
      kategori(paaberopelse).hovedkategori === 'force_majeure' ? '33.3' : '33.1'
    })`,
    spesifisering: spesifisert?.dager
      ? `godkjent med ${spesifisert.dager} dager (§ 33.6.1)`
      : 'avslått (§ 33.6.1)',
  };
  const grunner = v.filter(
    (p) =>
      p.art in grunntekst &&
      laget(p.virkning) &&
      (p.art !== 'rettidighet' || p.standpunkt === prekluderende[0])
  );
  const virkning = (id: string) => v.find((p) => p.standpunkt === id)!.virkning;
  const sine: { tekst: string; virkning: Virkning }[] = [];
  if (svar.spor === 'forhold') {
    const g = standpunktet(svar, 'forhold')!;
    sine.push({ tekst: SVARET_PAA_PAABEROPELSEN[g.resultat], virkning: virkning(g.id) });
  } else if (svar.spor === 'vederlag') {
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
  } else if (svar.spor === 'frist') {
    const d = standpunktet(svar, 'dager')!;
    sine.push({
      tekst: d.resultat === 'avslaatt' ? 'avslått' : `godkjent med ${d.vurdert} dager`,
      virkning: virkning(d.id),
    });
  } else utenGren(svar.spor);
  // OV-U32, OV-U33: etiketten følger det fryste laget, én gang for hvert lag og bare når svaret
  // har mer enn ett lag. Et upåvirket standpunkt står uten etikett. Som i brevteksten.
  const plass = ({ virkning }: { virkning: Virkning }) => {
    const lag = laget(virkning);
    return lag === null ? null : lag + forskyvning;
  };
  const ledd = iLagene(
    [...grunner.map((p) => ({ tekst: grunntekst[p.art], virkning: p.virkning })), ...sine],
    plass,
    forskyvning + 1
  );
  const ordnet = ledd.some((l) => (plass(l) ?? 0) > 1);
  const merket = new Set<number>();
  const etikettert = (l: (typeof ledd)[number]) => {
    const lag = plass(l);
    if (!ordnet || lag === null || merket.has(lag)) return l.tekst;
    merket.add(lag);
    return `${etikett(lag)} ${l.tekst}`;
  };
  return `Byggherrens standpunkt: ${ledd.map(etikettert).join(', ')}.`;
}

/** Det byggherren gjør gjeldende kom for sent, i kortform av `VARSELET` i brevteksten (LV-U4 punkt 5). */
const SENT_I_LINJEN: Record<Hjemmel, string> = {
  '32.2': 'varselet etter § 32.2',
  '33.4': 'varselet etter § 33.4',
  '33.6.2': 'svaret på forespørselen etter § 33.6.2',
  '34.1.2': 'varselet etter § 34.1.2',
  '34.1.3': 'varselet etter § 34.1.3',
  '34.3.3': 'varselet etter § 34.3.3',
  '34.4': 'varselet etter § 34.4',
};

/** Posten etter § 34.1.3 annet ledd i linjen. */
const SAERSKILT_I_LINJEN = 'særskilt justering (§ 34.1.3 annet ledd)';

/**
 * Leddene ordnet etter laget, så standpunktene i samme lag står under én etikett (OV-U32). Et
 * ledd uten lag står med sporets første lag, `foerste`, og aldri under en senere etikett
 * (OV-U33; spørsmål 8 i spørsmålsfila for #1663, 09.11). Ellers beholdes rekkefølgen.
 */
export function iLagene<T>(ledd: T[], plass: (l: T) => number | null, foerste: number): T[] {
  return ledd
    .map((l) => ({ l, k: plass(l) ?? foerste }))
    .sort((a, b) => a.k - b.k)
    .map(({ l }) => l);
}
